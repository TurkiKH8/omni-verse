"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Category } from "@/lib/supabase/types";

const FALLBACK: Category[] = [
  { id: "1", name_en: "Science",      name_ar: "العلوم",         active: true,  question_count: 6, created_at: "", updated_at: "" },
  { id: "2", name_en: "History",      name_ar: "التاريخ",        active: true,  question_count: 6, created_at: "", updated_at: "" },
  { id: "3", name_en: "Geography",    name_ar: "الجغرافيا",      active: true,  question_count: 6, created_at: "", updated_at: "" },
  { id: "4", name_en: "Sports",       name_ar: "الرياضة",        active: true,  question_count: 6, created_at: "", updated_at: "" },
  { id: "5", name_en: "Movies & TV",  name_ar: "أفلام وتلفزيون", active: true,  question_count: 6, created_at: "", updated_at: "" },
  { id: "6", name_en: "Music",        name_ar: "الموسيقى",       active: true,  question_count: 6, created_at: "", updated_at: "" },
  { id: "7", name_en: "Technology",   name_ar: "التقنية",        active: true,  question_count: 6, created_at: "", updated_at: "" },
  { id: "8", name_en: "Literature",   name_ar: "الأدب",          active: false, question_count: 6, created_at: "", updated_at: "" },
  { id: "9", name_en: "Art",          name_ar: "الفن",           active: false, question_count: 6, created_at: "", updated_at: "" },
  { id: "10", name_en: "Food & Drink",name_ar: "طعام وشراب",     active: true,  question_count: 6, created_at: "", updated_at: "" },
  { id: "11", name_en: "Nature",      name_ar: "الطبيعة",        active: false, question_count: 6, created_at: "", updated_at: "" },
  { id: "12", name_en: "Politics",    name_ar: "السياسة",        active: false, question_count: 6, created_at: "", updated_at: "" },
];

async function logAction(action: string, target: string, type: "create" | "update" | "delete") {
  if (!isSupabaseConfigured) return;
  await supabase.from("audit_log").insert({ action, target, type });
}

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

// Uploads a PNG/JPG to the public "images" bucket; returns the public URL or null.
async function uploadImageToStorage(file: File): Promise<string | null> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `categories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return null;
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

type RankPerms = {
  canAdd: boolean;
  canRemove: boolean;
  canHide: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formNameAr, setFormNameAr] = useState("");
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string>("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [perms, setPerms] = useState<RankPerms>({ canAdd: false, canRemove: false, canHide: false });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPerms({ canAdd: true, canRemove: true, canHide: true });
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
        setPerms({ canAdd: true, canRemove: true, canHide: true });
        return;
      }
      const { data: rankPerms } = await supabase
        .from("rank_permissions")
        .select("can_add_category, can_remove_category, can_hide_categories")
        .eq("rank", profile.rank ?? "Default")
        .maybeSingle();
      if (rankPerms) {
        setPerms({
          canAdd:    rankPerms.can_add_category,
          canRemove: rankPerms.can_remove_category,
          canHide:   rankPerms.can_hide_categories,
        });
      }
    })();
  }, []);

  const fetchCategories = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });
    if (data && data.length > 0) setCategories(data as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const filtered = categories.filter(
    (c) => c.name_en.toLowerCase().includes(search.toLowerCase()) || c.name_ar.includes(search)
  );

  const openAdd = () => {
    setEditId(null); setFormName(""); setFormNameAr("");
    setFormImageUrl(null); setImageFile(null); setImageError("");
    setShowForm(true);
  };
  const openEdit = (cat: Category) => {
    setEditId(cat.id); setFormName(cat.name_en); setFormNameAr(cat.name_ar);
    setFormImageUrl(cat.image_url ?? null); setImageFile(null); setImageError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formNameAr.trim()) return;
    setSaving(true);
    setImageError("");

    let finalImageUrl: string | null = formImageUrl;
    if (imageFile && isSupabaseConfigured) {
      const url = await uploadImageToStorage(imageFile);
      if (url) finalImageUrl = url;
      else setImageError("Image upload failed (bucket missing or wrong format). Category saved without new image.");
    }

    if (isSupabaseConfigured) {
      const fullPayload: Record<string, unknown> = editId
        ? { name_en: formName, name_ar: formNameAr, image_url: finalImageUrl, updated_at: new Date().toISOString() }
        : { name_en: formName, name_ar: formNameAr, image_url: finalImageUrl, active: true, question_count: 0 };
      const basicPayload: Record<string, unknown> = editId
        ? { name_en: formName, name_ar: formNameAr, updated_at: new Date().toISOString() }
        : { name_en: formName, name_ar: formNameAr, active: true, question_count: 0 };

      const trySave = async (payload: Record<string, unknown>) => {
        if (editId) return supabase.from("categories").update(payload).eq("id", editId);
        return supabase.from("categories").insert(payload);
      };
      const result = await trySave(fullPayload);
      if (result.error) await trySave(basicPayload);

      await logAction(editId ? "Updated category" : "Created category", formName, editId ? "update" : "create");
      await fetchCategories();
    } else {
      if (editId) {
        setCategories((p) => p.map((c) => c.id === editId ? { ...c, name_en: formName, name_ar: formNameAr, image_url: finalImageUrl } : c));
      } else {
        setCategories((p) => [...p, { id: String(Date.now()), name_en: formName, name_ar: formNameAr, image_url: finalImageUrl, active: true, question_count: 0, created_at: "", updated_at: "" }]);
      }
    }

    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (isSupabaseConfigured) {
      await supabase.from("categories").delete().eq("id", id);
      await logAction("Deleted category", name, "delete");
      await fetchCategories();
    } else {
      setCategories((p) => p.filter((c) => c.id !== id));
    }
  };

  const toggleHidden = async (cat: Category) => {
    const next = !(cat as Category & { is_hidden?: boolean }).is_hidden;
    if (isSupabaseConfigured) {
      await supabase.from("categories").update({ is_hidden: next, updated_at: new Date().toISOString() }).eq("id", cat.id);
      await logAction("Toggled hidden", `${cat.name_en} → ${next ? "HIDDEN" : "VISIBLE"}`, "update");
      await fetchCategories();
    } else {
      setCategories((p) => p.map((c) => c.id === cat.id ? { ...c, is_hidden: next } : c));
    }
  };

  const toggleActive = async (cat: Category) => {
    const next = !cat.active;
    if (isSupabaseConfigured) {
      await supabase.from("categories").update({ active: next, updated_at: new Date().toISOString() }).eq("id", cat.id);
      await logAction("Toggled category", `${cat.name_en} → ${next ? "ON" : "OFF"}`, "update");
      await fetchCategories();
    } else {
      setCategories((p) => p.map((c) => c.id === cat.id ? { ...c, active: next } : c));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>Categories</h1>
            <p className="text-sm mt-1" style={{ color: "#e8d5a0", opacity: 0.5 }}>
              {loading ? "Loading…" : `${categories.length} total · ${categories.filter((c) => c.active).length} active`}
              {!isSupabaseConfigured && <span style={{ color: "#f87171" }}> · Supabase not connected (demo mode)</span>}
            </p>
          </div>
          {perms.canAdd && (
            <button onClick={openAdd} className="px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
              + Add Category
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0" }}
        />

        <div className="overflow-x-auto">
        <div className="rounded-2xl overflow-hidden min-w-[560px]" style={{ border: "1px solid #2e2050" }}>
          <div className="grid px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ gridTemplateColumns: "1fr 1fr 80px 80px 100px", backgroundColor: "#0d091a", color: "#e8d5a0", opacity: 0.5 }}>
            <span>Name (EN)</span><span>Name (AR)</span><span className="text-center">Questions</span><span className="text-center">Status</span><span className="text-center">Actions</span>
          </div>
          {filtered.map((cat, i) => (
            <div key={cat.id} className="grid px-5 py-4 items-center" style={{ gridTemplateColumns: "1fr 1fr 80px 80px 100px", borderTop: i === 0 ? "none" : "1px solid #2e2050", backgroundColor: i % 2 === 0 ? "#1e1530" : "#1a1228" }}>
              <span className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{cat.name_en}</span>
              <span className="text-sm" style={{ color: "#e8d5a0", opacity: 0.7, direction: "rtl" }}>{cat.name_ar}</span>
              <span className="text-sm text-center" style={{ color: "#e8d5a0", opacity: 0.7 }}>{cat.question_count}</span>
              <div className="flex justify-center">
                <button onClick={() => toggleActive(cat)} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: cat.active ? "#16a34a22" : "#dc262622", color: cat.active ? "#4ade80" : "#f87171", border: `1px solid ${cat.active ? "#4ade8044" : "#f8717144"}` }}>
                  {cat.active ? "Active" : "Off"}
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={() => openEdit(cat)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa" }}>Edit</button>
                {perms.canHide && (
                  <button onClick={() => toggleHidden(cat)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: (cat as Category & { is_hidden?: boolean }).is_hidden ? "#0ea5e922" : "#64748b22", color: (cat as Category & { is_hidden?: boolean }).is_hidden ? "#38bdf8" : "#94a3b8" }}>
                    {(cat as Category & { is_hidden?: boolean }).is_hidden ? "Show" : "Hide"}
                  </button>
                )}
                {perms.canRemove && (
                  <button onClick={() => handleDelete(cat.id, cat.name_en)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: "#dc262622", color: "#f87171" }}>Del</button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "#e8d5a0", opacity: 0.4, backgroundColor: "#1e1530" }}>No categories found.</div>
          )}
        </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "#00000088" }}>
          <div className="w-full max-w-md rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
            <h2 className="text-lg font-extrabold" style={{ color: "#e8d5a0" }}>{editId ? "Edit Category" : "New Category"}</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Name (English) <span style={{ color: "#f87171" }}>*</span></label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Science" required className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Name (Arabic) <span style={{ color: "#f87171" }}>*</span></label>
              <input type="text" value={formNameAr} onChange={(e) => setFormNameAr(e.target.value)} placeholder="مثال: العلوم" required className="w-full px-4 py-3 rounded-xl text-sm outline-none text-right" style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0", direction: "rtl" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Cover Image <span style={{ opacity: 0.4 }}>optional · PNG / JPG</span></label>
              {(imageFile || formImageUrl) && (
                <div className="relative w-full rounded-xl overflow-hidden" style={{ border: "1px solid #2e2050", backgroundColor: "#120d1f" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageFile ? URL.createObjectURL(imageFile) : formImageUrl ?? ""} alt="" className="w-full max-h-32 object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); setFormImageUrl(null); }}
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
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>Cancel</button>
              {(() => {
                const allFilled = formName.trim() && formNameAr.trim();
                return (
                  <button onClick={handleSave} disabled={saving || !allFilled} className="flex-1 py-2.5 rounded-full text-sm font-bold hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: (saving || !allFilled) ? 0.4 : 1, cursor: (saving || !allFilled) ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving…" : editId ? "Save Changes" : "Add Category"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
