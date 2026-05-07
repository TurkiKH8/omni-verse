"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Question } from "@/lib/supabase/types";

const CATEGORIES = ["Science","History","Geography","Sports","Movies & TV","Music","Technology","Literature","Art","Food & Drink","Nature","Politics"];
const POINTS = [200, 400, 600, 800, 1000, 1200];

const FALLBACK: Question[] = [
  { id: "1", category_id: "", points: 200, question_en: "What is the chemical symbol for water?", answer_en: "H₂O", question_ar: "", answer_ar: "", created_at: "", categories: { name_en: "Science", name_ar: "العلوم" } },
  { id: "2", category_id: "", points: 400, question_en: "Which planet is known as the Red Planet?", answer_en: "Mars", question_ar: "", answer_ar: "", created_at: "", categories: { name_en: "Science", name_ar: "العلوم" } },
  { id: "3", category_id: "", points: 200, question_en: "In what year did World War II end?", answer_en: "1945", question_ar: "", answer_ar: "", created_at: "", categories: { name_en: "History", name_ar: "التاريخ" } },
];

type FormState = { category: string; points: number; question_en: string; answer_en: string; question_ar: string; answer_ar: string; language: "EN" | "AR" };

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
  const [form, setForm] = useState<FormState>({ category: "Science", points: 200, question_en: "", answer_en: "", question_ar: "", answer_ar: "", language: "EN" });
  const [perms, setPerms] = useState<RankPerms>({ canAdd: false, canRemove: false, canBulkAdd: false, canBulkRemove: false, canHide: false });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPerms({ canAdd: true, canRemove: true, canBulkAdd: true, canBulkRemove: true, canHide: true });
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, rank")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) return;
      if (profile.is_admin) {
        setPerms({ canAdd: true, canRemove: true, canBulkAdd: true, canBulkRemove: true, canHide: true });
        return;
      }
      const { data: rankPerms } = await supabase
        .from("rank_permissions")
        .select("can_add_question, can_remove_question, can_bulk_add_questions, can_bulk_remove_questions, can_hide_questions")
        .eq("rank", profile.rank ?? "Default")
        .maybeSingle();
      if (rankPerms) {
        setPerms({
          canAdd:        rankPerms.can_add_question,
          canRemove:     rankPerms.can_remove_question,
          canBulkAdd:    rankPerms.can_bulk_add_questions,
          canBulkRemove: rankPerms.can_bulk_remove_questions,
          canHide:       rankPerms.can_hide_questions,
        });
      }
    })();
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data } = await supabase
      .from("questions")
      .select("*, categories(name_en, name_ar)")
      .order("created_at", { ascending: true });
    if (data && data.length > 0) setQuestions(data as Question[]);
    setLoading(false);
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

  const openAdd = () => { setEditId(null); setForm({ category: "Science", points: 200, question_en: "", answer_en: "", question_ar: "", answer_ar: "", language: "EN" }); setShowForm(true); };
  const openEdit = (q: Question) => {
    setEditId(q.id);
    setForm({ category: q.categories?.name_en ?? "Science", points: q.points, question_en: q.question_en, answer_en: q.answer_en, question_ar: q.question_ar, answer_ar: q.answer_ar, language: "EN" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.question_en.trim() || !form.answer_en.trim()) return;
    setSaving(true);

    if (isSupabaseConfigured) {
      const catId = await getCategoryId(form.category);
      if (!catId) { setSaving(false); return; }

      if (editId) {
        await supabase.from("questions").update({ category_id: catId, points: form.points, question_en: form.question_en, answer_en: form.answer_en, question_ar: form.question_ar, answer_ar: form.answer_ar }).eq("id", editId);
        await logAction("Updated question", `${form.category} / ${form.points}pts`, "update");
      } else {
        await supabase.from("questions").insert({ category_id: catId, points: form.points, question_en: form.question_en, answer_en: form.answer_en, question_ar: form.question_ar, answer_ar: form.answer_ar });
        await logAction("Created question", `${form.category} / ${form.points}pts`, "create");
      }
      await fetchQuestions();
    } else {
      if (editId) {
        setQuestions((p) => p.map((q) => q.id === editId ? { ...q, points: form.points, question_en: form.question_en, answer_en: form.answer_en, categories: { name_en: form.category, name_ar: "" } } : q));
      } else {
        setQuestions((p) => [...p, { id: String(Date.now()), category_id: "", points: form.points, question_en: form.question_en, answer_en: form.answer_en, question_ar: "", answer_ar: "", created_at: "", categories: { name_en: form.category, name_ar: "" } }]);
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
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Question (English)</label>
              <textarea value={form.question_en} onChange={(e) => setForm({ ...form, question_en: e.target.value })} rows={3} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Answer (English)</label>
              <input type="text" value={form.answer_en} onChange={(e) => setForm({ ...form, answer_en: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Question (Arabic) <span style={{ opacity: 0.4 }}>optional</span></label>
              <textarea value={form.question_ar} onChange={(e) => setForm({ ...form, question_ar: e.target.value })} rows={2} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0", direction: "rtl" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Answer (Arabic) <span style={{ opacity: 0.4 }}>optional</span></label>
              <input type="text" value={form.answer_ar} onChange={(e) => setForm({ ...form, answer_ar: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0", direction: "rtl" }} />
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-full text-sm font-bold hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: saving ? 0.5 : 1 }}>
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Question"}
              </button>
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
