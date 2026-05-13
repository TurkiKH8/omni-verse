"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Question } from "@/lib/supabase/types";

// Fallback list used ONLY for the demo-mode mock data below. The real
// admin form fetches the live categories from Supabase (see liveCategories
// state in QuestionsPage), so deleting/renaming categories in /admin/
// categories is reflected here immediately.
const CATEGORIES = ["Science","History","Geography","Sports","Movies & TV","Music","Technology","Literature","Art","Food & Drink","Nature","Politics"];

// Game logic: 24 point tiers from 100 to 2400 in steps of 100.
const POINTS = Array.from({ length: 24 }, (_, i) => (i + 1) * 100);

const FALLBACK: Question[] = [
  { id: "1", category_id: "", points: 200, question_en: "What is the chemical symbol for water?", answer_en: "H₂O", question_ar: "", answer_ar: "", created_at: "", categories: { name_en: "Science", name_ar: "العلوم" } },
  { id: "2", category_id: "", points: 400, question_en: "Which planet is known as the Red Planet?", answer_en: "Mars", question_ar: "", answer_ar: "", created_at: "", categories: { name_en: "Science", name_ar: "العلوم" } },
  { id: "3", category_id: "", points: 200, question_en: "In what year did World War II end?", answer_en: "1945", question_ar: "", answer_ar: "", created_at: "", categories: { name_en: "History", name_ar: "التاريخ" } },
];

type FormState = {
  category: string;
  points: number;
  question_en: string;
  answer_en: string;
  question_ar: string;
  answer_ar: string;
  language: "EN" | "AR";
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
};

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
  "audio/mp4",  "audio/x-m4a", "audio/ogg", "audio/aac",
];

// Generic uploader for the three media buckets. Returns the public URL or
// null if the bucket doesn't exist yet (migration not run) or upload fails.
async function uploadMediaToStorage(
  file: File,
  bucket: "images" | "videos" | "audio",
  folder: "questions" | "categories",
  allowedTypes: string[],
): Promise<string | null> {
  if (!allowedTypes.includes(file.type)) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Back-compat alias kept for the categories form (or any caller importing this).
async function uploadImageToStorage(file: File, folder: "questions" | "categories"): Promise<string | null> {
  return uploadMediaToStorage(file, "images", folder, ALLOWED_IMAGE_TYPES);
}

type RankPerms = {
  canAdd: boolean;
  canRemove: boolean;
  canBulkAdd: boolean;
  canBulkRemove: boolean;
  canHide: boolean;
};

async function logAction(action: string, target: string, type: "create" | "update" | "delete") {
  if (!isSupabaseConfigured) return;
  await supabase.from("audit_log").insert({ action, target, type });
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ category: "", points: 100, question_en: "", answer_en: "", question_ar: "", answer_ar: "", language: "EN", image_url: null, video_url: null, audio_url: null });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoError, setVideoError] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioError, setAudioError] = useState<string>("");
  const [perms, setPerms] = useState<RankPerms>({ canAdd: false, canRemove: false, canBulkAdd: false, canBulkRemove: false, canHide: false });

  // Live category list pulled from the categories table. Source of truth
  // for both the filter dropdown and the form. Falls back to the static
  // CATEGORIES list only in demo mode (when Supabase isn't configured).
  const [liveCategories, setLiveCategories] = useState<string[]>([]);
  useEffect(() => {
    if (!isSupabaseConfigured) { setLiveCategories(CATEGORIES); return; }
    (async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const { data } = await supabase
          .from("categories")
          .select("name_en")
          .order("name_en")
          .abortSignal(ctrl.signal);
        clearTimeout(t);
        const names = (data ?? [])
          .map((c: { name_en: string }) => c.name_en)
          .filter(Boolean);
        setLiveCategories(names);
      } catch { /* leave empty — user can refresh once categories exist */ }
    })();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPerms({ canAdd: true, canRemove: true, canBulkAdd: true, canBulkRemove: true, canHide: true });
      return;
    }
    (async () => {
      try {
        // Use 4s timeout for getUser so a hung lock can't block the whole page
        const userResult = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 4000)),
        ]) as { data: { user: { id: string } | null } };
        const user = userResult.data.user;
        if (!user) return;

        const profCtrl = new AbortController();
        const profT = setTimeout(() => profCtrl.abort(), 5000);
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, rank")
          .eq("id", user.id)
          .abortSignal(profCtrl.signal)
          .maybeSingle();
        clearTimeout(profT);
        if (!profile) return;

        if (profile.is_admin) {
          setPerms({ canAdd: true, canRemove: true, canBulkAdd: true, canBulkRemove: true, canHide: true });
          return;
        }

        const rankCtrl = new AbortController();
        const rankT = setTimeout(() => rankCtrl.abort(), 5000);
        const { data: rankPerms } = await supabase
          .from("rank_permissions")
          .select("can_add_question, can_remove_question, can_bulk_add_questions, can_bulk_remove_questions, can_hide_questions")
          .eq("rank", profile.rank ?? "Default")
          .abortSignal(rankCtrl.signal)
          .maybeSingle();
        clearTimeout(rankT);
        if (rankPerms) {
          setPerms({
            canAdd:        rankPerms.can_add_question,
            canRemove:     rankPerms.can_remove_question,
            canBulkAdd:    rankPerms.can_bulk_add_questions,
            canBulkRemove: rankPerms.can_bulk_remove_questions,
            canHide:       rankPerms.can_hide_questions,
          });
        }
      } catch { /* keep restrictive defaults */ }
    })();
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("questions")
        .select("*, categories(name_en, name_ar)")
        .order("created_at", { ascending: true });
      if (data && data.length > 0) setQuestions(data as Question[]);
    } catch { /* keep current questions */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const getCategoryId = async (name: string) => {
    const { data } = await supabase.from("categories").select("id").eq("name_en", name).single();
    return data?.id ?? null;
  };

  const filtered = questions.filter((q) => {
    const catName = q.categories?.name_en ?? "";
    const matchSearch = q.question_en.toLowerCase().includes(search.toLowerCase()) || q.answer_en.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || catName === filterCat;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditId(null);
    setForm({ category: liveCategories[0] ?? "", points: 100, question_en: "", answer_en: "", question_ar: "", answer_ar: "", language: "EN", image_url: null, video_url: null, audio_url: null });
    setImageFile(null);  setImageError("");
    setVideoFile(null);  setVideoError("");
    setAudioFile(null);  setAudioError("");
    setShowForm(true);
  };
  const openEdit = (q: Question) => {
    setEditId(q.id);
    setForm({
      category: q.categories?.name_en ?? liveCategories[0] ?? "",
      points: q.points,
      question_en: q.question_en, answer_en: q.answer_en,
      question_ar: q.question_ar, answer_ar: q.answer_ar,
      language: "EN",
      image_url: q.image_url ?? null,
      video_url: q.video_url ?? null,
      audio_url: q.audio_url ?? null,
    });
    setImageFile(null);  setImageError("");
    setVideoFile(null);  setVideoError("");
    setAudioFile(null);  setAudioError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.question_en.trim() || !form.answer_en.trim() || !form.question_ar.trim() || !form.answer_ar.trim()) return;
    setSaving(true);
    setImageError(""); setVideoError(""); setAudioError("");

    // Upload any new media file first. If an upload fails, keep saving the
    // rest of the question — media is optional. The bucket may not exist
    // yet (migration not run) which also returns null and shows an error.
    let finalImageUrl: string | null = form.image_url;
    let finalVideoUrl: string | null = form.video_url;
    let finalAudioUrl: string | null = form.audio_url;

    if (imageFile && isSupabaseConfigured) {
      const url = await uploadMediaToStorage(imageFile, "images", "questions", ALLOWED_IMAGE_TYPES);
      if (url) finalImageUrl = url;
      else setImageError("Image upload failed (bucket missing or wrong format). Question saved without image.");
    }
    if (videoFile && isSupabaseConfigured) {
      const url = await uploadMediaToStorage(videoFile, "videos", "questions", ALLOWED_VIDEO_TYPES);
      if (url) finalVideoUrl = url;
      else setVideoError("Video upload failed. Run add-video-audio.sql in Supabase, or check the file type/size.");
    }
    if (audioFile && isSupabaseConfigured) {
      const url = await uploadMediaToStorage(audioFile, "audio", "questions", ALLOWED_AUDIO_TYPES);
      if (url) finalAudioUrl = url;
      else setAudioError("Audio upload failed. Run add-video-audio.sql in Supabase, or check the file type/size.");
    }

    if (isSupabaseConfigured) {
      const catId = await getCategoryId(form.category);
      if (!catId) { setSaving(false); return; }

      // Try with all media fields; fall back step by step if the column
      // doesn't exist (so the form keeps working on a partially-migrated DB).
      const base = {
        category_id: catId, points: form.points,
        question_en: form.question_en, answer_en: form.answer_en,
        question_ar: form.question_ar, answer_ar: form.answer_ar,
      };
      const fullPayload  = { ...base, image_url: finalImageUrl, video_url: finalVideoUrl, audio_url: finalAudioUrl };
      const imageOnly    = { ...base, image_url: finalImageUrl };
      const basicPayload = base;

      const trySave = async (payload: Record<string, unknown>) => {
        if (editId) return supabase.from("questions").update(payload).eq("id", editId);
        return supabase.from("questions").insert(payload);
      };
      let result = await trySave(fullPayload);
      if (result.error) result = await trySave(imageOnly);
      if (result.error) await trySave(basicPayload);

      await logAction(editId ? "Updated question" : "Created question", `${form.category} / ${form.points}pts`, editId ? "update" : "create");
      await fetchQuestions();
    } else {
      if (editId) {
        setQuestions((p) => p.map((q) => q.id === editId ? { ...q, points: form.points, question_en: form.question_en, answer_en: form.answer_en, image_url: finalImageUrl, video_url: finalVideoUrl, audio_url: finalAudioUrl, categories: { name_en: form.category, name_ar: "" } } : q));
      } else {
        setQuestions((p) => [...p, { id: String(Date.now()), category_id: "", points: form.points, question_en: form.question_en, answer_en: form.answer_en, question_ar: "", answer_ar: "", image_url: finalImageUrl, video_url: finalVideoUrl, audio_url: finalAudioUrl, created_at: "", categories: { name_en: form.category, name_ar: "" } }]);
      }
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (q: Question) => {
    if (isSupabaseConfigured) {
      await supabase.from("questions").delete().eq("id", q.id);
      await logAction("Deleted question", `${q.categories?.name_en} / ${q.points}pts`, "delete");
      await fetchQuestions();
    } else {
      setQuestions((p) => p.filter((x) => x.id !== q.id));
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText.trim().split("\n").filter(Boolean);
    setSaving(true);

    if (isSupabaseConfigured) {
      for (const line of lines) {
        const parts = line.split("|").map((s) => s.trim());
        if (parts.length < 4) continue;
        const catId = await getCategoryId(parts[0]);
        if (!catId) continue;
        await supabase.from("questions").insert({ category_id: catId, points: parseInt(parts[1]) || 200, question_en: parts[2], answer_en: parts[3] });
      }
      await logAction("Bulk uploaded questions", `${lines.length} questions`, "create");
      await fetchQuestions();
    } else {
      const newQs = lines.map((line) => {
        const p = line.split("|").map((s) => s.trim());
        return { id: String(Date.now() + Math.random()), category_id: "", points: parseInt(p[1]) || 200, question_en: p[2] ?? "", answer_en: p[3] ?? "", question_ar: "", answer_ar: "", created_at: "", categories: { name_en: p[0] ?? "", name_ar: "" } };
      });
      setQuestions((prev) => [...prev, ...newQs]);
    }

    setSaving(false);
    setShowBulk(false);
    setBulkText("");
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Questions</h1>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              {loading ? "Loading…" : `${questions.length} total questions`}
              {!isSupabaseConfigured && <span style={{ color: "#f87171" }}> · demo mode</span>}
            </p>
          </div>
          <div className="flex gap-3">
            {perms.canBulkAdd && (
              <button onClick={() => setShowBulk(true)} className="px-4 py-2.5 rounded-full text-sm font-bold" style={{ backgroundColor: "#7c3aed22", border: "1px solid #7c3aed44", color: "#a78bfa" }}>Bulk Upload</button>
            )}
            {perms.canAdd && (
              <button onClick={openAdd} className="px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>+ Add Question</button>
            )}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }} />
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}>
            <option value="All">All Categories</option>
            {liveCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
        <div className="rounded-2xl overflow-hidden min-w-[560px]" style={{ border: "1px solid #2e2050" }}>
          <div className="grid px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ gridTemplateColumns: "120px 70px 1fr 160px 90px", backgroundColor: "#0d091a", color: "#e8d5a0", opacity: 0.5 }}>
            <span>Category</span><span>Points</span><span>Question</span><span>Answer</span><span className="text-center">Actions</span>
          </div>
          {filtered.map((q, i) => (
            <div key={q.id} className="grid px-5 py-4 items-start gap-2" style={{ gridTemplateColumns: "120px 70px 1fr 160px 90px", borderTop: i === 0 ? "none" : "1px solid #2e2050", backgroundColor: i % 2 === 0 ? "#1e1530" : "#1a1228" }}>
              <span className="text-xs px-2 py-1 rounded-full w-fit" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa" }}>{q.categories?.name_en ?? "—"}</span>
              <span className="text-sm font-bold" style={{ color: "#d4860a" }}>{q.points}</span>
              <p className="text-sm leading-snug" style={{ color: "#e8d5a0" }}>{q.question_en}</p>
              <p className="text-xs leading-snug" style={{ color: "#e8d5a0", opacity: 0.65 }}>{q.answer_en}</p>
              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                <button onClick={() => openEdit(q)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa" }}>Edit</button>
                {perms.canHide && (
                  <button
                    onClick={async () => {
                      const hidden = !(q as Question & { is_hidden?: boolean }).is_hidden;
                      if (isSupabaseConfigured) {
                        await supabase.from("questions").update({ is_hidden: hidden }).eq("id", q.id);
                        await logAction("Toggled hidden question", `${q.categories?.name_en} / ${q.points}pts → ${hidden ? "HIDDEN" : "VISIBLE"}`, "update");
                        await fetchQuestions();
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: (q as Question & { is_hidden?: boolean }).is_hidden ? "#0ea5e922" : "#64748b22", color: (q as Question & { is_hidden?: boolean }).is_hidden ? "#38bdf8" : "#94a3b8" }}
                  >
                    {(q as Question & { is_hidden?: boolean }).is_hidden ? "Show" : "Hide"}
                  </button>
                )}
                {perms.canRemove && (
                  <button onClick={() => handleDelete(q)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: "#dc262622", color: "#f87171" }}>Del</button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.4, backgroundColor: "#1e1530" }}>No questions found.</div>
          )}
        </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "#00000088" }}>
          <div className="w-full max-w-lg rounded-2xl p-7 flex flex-col gap-5 overflow-y-auto max-h-screen" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-lg font-extrabold" style={{ color: "#e8d5a0" }}>{editId ? "Edit Question" : "New Question"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}>
                  {liveCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Points</label>
                <select value={form.points} onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}>
                  {POINTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Question (English) <span style={{ color: "#f87171" }}>*</span></label>
              <textarea value={form.question_en} onChange={(e) => setForm({ ...form, question_en: e.target.value })} rows={3} required className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Answer (English) <span style={{ color: "#f87171" }}>*</span></label>
              <input type="text" value={form.answer_en} onChange={(e) => setForm({ ...form, answer_en: e.target.value })} required className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Question (Arabic) <span style={{ color: "#f87171" }}>*</span></label>
              <textarea value={form.question_ar} onChange={(e) => setForm({ ...form, question_ar: e.target.value })} rows={2} required className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0", direction: "rtl" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Answer (Arabic) <span style={{ color: "#f87171" }}>*</span></label>
              <input type="text" value={form.answer_ar} onChange={(e) => setForm({ ...form, answer_ar: e.target.value })} required className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0", direction: "rtl" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Question Image <span style={{ opacity: 0.4 }}>optional · PNG / JPG</span></label>
              {(imageFile || form.image_url) && (
                <div className="relative w-full rounded-xl overflow-hidden" style={{ border: "1px solid #2e2050", backgroundColor: "#120d1f" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url ?? ""} alt="" className="w-full max-h-40 object-contain" />
                  <button type="button" onClick={() => { setImageFile(null); setForm({ ...form, image_url: null }); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center"
                    style={{ backgroundColor: "#dc2626", color: "#fff" }}
                    aria-label="Remove image">×</button>
                </div>
              )}
              <input type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImageError("");
                  if (f && !ALLOWED_IMAGE_TYPES.includes(f.type)) {
                    setImageError("Only PNG, JPEG or JPG files are allowed.");
                    setImageFile(null);
                    return;
                  }
                  setImageFile(f);
                }}
                className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:cursor-pointer"
                style={{ color: "#e8d5a0" }}
              />
              {imageError && (
                <p className="text-xs" style={{ color: "#f87171" }}>{imageError}</p>
              )}
            </div>

            {/* Video upload — optional, MP4 / WebM / MOV */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
                Question Video <span style={{ opacity: 0.4 }}>optional · MP4 / WebM / MOV · up to 100 MB</span>
              </label>
              {(videoFile || form.video_url) && (
                <div className="relative w-full rounded-xl overflow-hidden" style={{ border: "1px solid #2e2050", backgroundColor: "#120d1f" }}>
                  <video
                    src={videoFile ? URL.createObjectURL(videoFile) : form.video_url ?? ""}
                    controls
                    className="w-full max-h-56"
                    style={{ backgroundColor: "#000" }}
                  />
                  <button type="button" onClick={() => { setVideoFile(null); setForm({ ...form, video_url: null }); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center"
                    style={{ backgroundColor: "#dc2626", color: "#fff" }}
                    aria-label="Remove video">×</button>
                </div>
              )}
              <input type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setVideoError("");
                  if (f && !ALLOWED_VIDEO_TYPES.includes(f.type)) {
                    setVideoError("Only MP4, WebM or MOV video files are allowed.");
                    setVideoFile(null);
                    return;
                  }
                  setVideoFile(f);
                }}
                className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:cursor-pointer"
                style={{ color: "#e8d5a0" }}
              />
              {videoError && (
                <p className="text-xs" style={{ color: "#f87171" }}>{videoError}</p>
              )}
            </div>

            {/* Audio upload — optional, MP3 / WAV / M4A / OGG / AAC */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>
                Question Music / Audio <span style={{ opacity: 0.4 }}>optional · MP3 / WAV / M4A / OGG · up to 20 MB</span>
              </label>
              {(audioFile || form.audio_url) && (
                <div className="relative w-full rounded-xl overflow-hidden flex items-center gap-3 px-3 py-3" style={{ border: "1px solid #2e2050", backgroundColor: "#120d1f" }}>
                  <audio
                    src={audioFile ? URL.createObjectURL(audioFile) : form.audio_url ?? ""}
                    controls
                    className="flex-1 min-w-0"
                  />
                  <button type="button" onClick={() => { setAudioFile(null); setForm({ ...form, audio_url: null }); }}
                    className="w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#dc2626", color: "#fff" }}
                    aria-label="Remove audio">×</button>
                </div>
              )}
              <input type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,audio/aac"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setAudioError("");
                  if (f && !ALLOWED_AUDIO_TYPES.includes(f.type)) {
                    setAudioError("Only MP3, WAV, M4A, OGG or AAC audio files are allowed.");
                    setAudioFile(null);
                    return;
                  }
                  setAudioFile(f);
                }}
                className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:cursor-pointer"
                style={{ color: "#e8d5a0" }}
              />
              {audioError && (
                <p className="text-xs" style={{ color: "#f87171" }}>{audioError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>Cancel</button>
              {(() => {
                const allFilled = form.question_en.trim() && form.answer_en.trim() && form.question_ar.trim() && form.answer_ar.trim();
                return (
                  <button onClick={handleSave} disabled={saving || !allFilled} className="flex-1 py-2.5 rounded-full text-sm font-bold hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: (saving || !allFilled) ? 0.4 : 1, cursor: (saving || !allFilled) ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving…" : editId ? "Save Changes" : "Add Question"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: "#00000088" }}>
          <div className="w-full max-w-lg rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-lg font-extrabold" style={{ color: "#e8d5a0" }}>Bulk Upload</h2>
            <p className="text-xs" style={{ color: "#e8d5a0", opacity: 0.55 }}>One question per line: <span style={{ color: "#d4860a" }}>Category | Points | Question | Answer</span></p>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={"Science | 200 | What is the symbol for water? | H₂O\nHistory | 400 | Who was the first US president? | George Washington"} rows={8} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none font-mono" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            <div className="flex gap-3">
              <button onClick={() => { setShowBulk(false); setBulkText(""); }} className="flex-1 py-2.5 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>Cancel</button>
              <button onClick={handleBulkImport} disabled={saving} className="flex-1 py-2.5 rounded-full text-sm font-bold hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: saving ? 0.5 : 1 }}>
                {saving ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
