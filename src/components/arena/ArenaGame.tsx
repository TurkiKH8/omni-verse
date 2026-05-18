"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MOCK_QUESTIONS } from "@/lib/mockQuestions";
import { useLanguage } from "@/components/LanguageProvider";
import ConnectToTv from "@/components/arena/ConnectToTv";

type Step = "categories" | "gameMode" | "session" | "board" | "question" | "answer" | "results";
type GameMode = "solo" | "team";

interface Team      { id: number; name: string; score: number; }
interface BoardCell {
  category: string;            // English category name (canonical)
  category_ar?: string | null; // Arabic category name (for display)
  category_image_url?: string | null; // Cover shown above column header
  points: number;
  question_id?: string | null; // DB id of the chosen question (for seen-tracking); null for mock fills
  question: string;            // English question text (back-compat)
  answer: string;              // English answer text   (back-compat)
  question_ar?: string | null;
  answer_ar?: string | null;
  answered: boolean;
  image_url?: string | null;   // Per-question image
  video_url?: string | null;   // Per-question video (MP4 / WebM / MOV)
  audio_url?: string | null;   // Per-question audio / music
}
interface CategoryOption {
  id?: string | null;
  name: string;
  name_ar?: string | null;
  image_url?: string | null;
  sort_label_en?: string | null;
  sort_label_ar?: string | null;
  // Powers the "?" preview shown on the category-picker tiles.
  description_en?: string | null;
  description_ar?: string | null;
  sample_question_en?: string | null;
  sample_answer_en?: string | null;
  sample_question_ar?: string | null;
  sample_answer_ar?: string | null;
  sample_image_url?: string | null;
}

// Every category always has 6 questions on the fixed 200→1200 ladder,
// no matter how many categories are picked. The ONLY exception: when
// exactly 5 categories are chosen, each has 5 questions.
const QUESTIONS_PER_CATEGORY: Record<number, number> = {
  1: 6, 2: 6, 3: 6, 4: 6, 5: 5, 6: 6,
};

// Subtle border-color tint based on a cell's relative difficulty (0 = easiest).
// Background stays consistent so the grid still reads as one cohesive board.
function difficultyBorderColor(rowIdx: number, totalRows: number, answered: boolean): string {
  if (answered) return "#2e205044";
  const t = totalRows > 1 ? rowIdx / (totalRows - 1) : 0.5;
  if (t < 0.20) return "#4ade8055"; // very easy — green
  if (t < 0.45) return "#fbbf2466"; // easy   — yellow
  if (t < 0.65) return "#d4860a77"; // medium — amber (current)
  if (t < 0.85) return "#fb923c88"; // hard   — orange
  return "#ef444499";               // brutal — red
}

function getPointValues(questionsPerCat: number): number[] {
  // 5-category games: 5 questions each, fixed 400→1200 (drop the 200).
  if (questionsPerCat === 5) return [400, 600, 800, 1000, 1200];
  // Everything else: the fixed six-tier ladder, always 200→1200.
  return [200, 400, 600, 800, 1000, 1200];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type DBQuestion = {
  id: string;
  category_id: string;
  points: number;
  question_en: string;
  answer_en: string;
  question_ar?: string | null;
  answer_ar?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  is_hidden?: boolean | null;
};

type DBCategoryRow = {
  id: string;
  name_en: string;
  name_ar?: string | null;
  image_url?: string | null;
  is_hidden?: boolean | null;
};

// Build one category's column of K cells (K = questionsPerCat) from its
// question pool. Guarantees no question repeats on the column as long as the
// pool has ≥ K questions; prefers questions the player hasn't seen (seenIds);
// keeps an easy→hard gradient (cell i draws from the i-th slice of the
// difficulty-sorted pool, or — for 6-cell boards — from the exact point tier).
function pickColumnQuestions(
  catQs: DBQuestion[],
  questionsPerCat: number,
  pointValues: number[],
  standard6: boolean,
  seenIds: Set<string>,
): (DBQuestion | undefined)[] {
  const sorted = [...catQs].sort((a, b) => a.points - b.points);
  const used = new Set<string>();
  const choose = (pool: DBQuestion[]): DBQuestion | undefined => {
    // Preference: unseen & unused-on-this-column → unused → unused-anywhere → anything (full repeat).
    let cand = pool.filter((q) => !used.has(q.id) && !seenIds.has(q.id));
    if (cand.length === 0) cand = pool.filter((q) => !used.has(q.id));
    if (cand.length === 0) cand = sorted.filter((q) => !used.has(q.id));
    if (cand.length === 0) cand = sorted;
    if (cand.length === 0) return undefined;
    const picked = cand[Math.floor(Math.random() * cand.length)];
    used.add(picked.id);
    return picked;
  };
  return pointValues.map((pv, idx) => {
    let pool: DBQuestion[];
    if (standard6) {
      pool = sorted.filter((q) => q.points === pv);
      if (pool.length === 0) pool = sorted;
    } else {
      // Proportional slice so cell i sits at difficulty rank ≈ i/K. Always ≥1 wide.
      const lo = Math.floor((idx * sorted.length) / questionsPerCat);
      const hi = Math.max(lo + 1, Math.floor(((idx + 1) * sorted.length) / questionsPerCat));
      pool = sorted.slice(lo, hi);
      if (pool.length === 0) pool = sorted;
    }
    return choose(pool);
  });
}

async function fetchBoardFromSupabase(
  categories: string[],
  questionsPerCat: number,
  seenIds: Set<string>,
): Promise<BoardCell[][] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    // SELECT * always works regardless of which optional columns exist
    // (image_url, is_hidden, name_ar may or may not be present yet). We
    // then filter is_hidden client-side so a missing column == no rows
    // hidden, gracefully degrading.
    const catRes = await supabase
      .from("categories").select("*").in("name_en", categories);
    const catsRaw = (catRes.data ?? []) as DBCategoryRow[];
    const cats = catsRaw.filter((c) => !c.is_hidden);
    if (cats.length === 0) return null;

    const qRes = await supabase
      .from("questions").select("*")
      .in("category_id", cats.map((c) => c.id))
      .order("points", { ascending: true });
    const qsRaw = (qRes.data ?? []) as DBQuestion[];
    const qs = qsRaw.filter((q) => !q.is_hidden);
    if (qs.length === 0) return null;

    const pointValues = getPointValues(questionsPerCat);
    // Every board now uses real stored tiers (200…1200 / 400…1200), so
    // each cell pulls a question whose points exactly match that tier.
    const standard6  = true;

    return categories.map((catName) => {
      const catRow = cats.find((c) => c.name_en === catName);
      const catQs  = qs.filter((x) => x.category_id === catRow?.id);
      const picks  = pickColumnQuestions(catQs, questionsPerCat, pointValues, standard6, seenIds);

      return pointValues.map((pv, idx) => {
        const picked = picks[idx];
        return {
          category:           catName,
          category_ar:        catRow?.name_ar ?? null,
          category_image_url: catRow?.image_url ?? null,
          points:             pv,
          question_id:        picked?.id ?? null,
          question:           picked?.question_en ?? `${catName} – ${pv} pts`,
          answer:             picked?.answer_en   ?? "—",
          question_ar:        picked?.question_ar ?? null,
          answer_ar:          picked?.answer_ar   ?? null,
          answered:           false,
          image_url:          picked?.image_url   ?? null,
          video_url:          picked?.video_url   ?? null,
          audio_url:          picked?.audio_url   ?? null,
        };
      });
    });
  } catch { return null; }
}

function buildBoardFromMock(categories: string[], questionsPerCat: number): BoardCell[][] {
  const pointValues = getPointValues(questionsPerCat);
  return categories.map((cat) => {
    const qs = shuffle(MOCK_QUESTIONS[cat] ?? []);
    return pointValues.map((pv, idx) => ({
      category: cat, points: pv,
      question_id: null,
      question: qs[idx]?.question ?? `[Mock] ${cat} – question ${idx + 1}`,
      answer:   qs[idx]?.answer   ?? "—",
      answered: false,
    }));
  });
}

// ─── Session persistence (active games + history) ─────────────────────────────
//
// We INSERT a row at game start with status='active' so the user can refresh
// or close the tab and return via /history. Each action then UPDATEs the row
// with the latest board/teams/score. On game end we flip status='completed'.
// 24-hour expiry is handled server-side (DEFAULT expires_at = now() + 24h)
// and enforced client-side in HistoryView before display.

async function createActiveSession(
  name: string,
  mode: GameMode,
  categories: string[],
  teams: Team[],
  soloScore: number,
  questionsPerCat: number,
  board: BoardCell[][],
  userId: string | null,
): Promise<string | null> {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const { data, error } = await supabase.from("sessions").insert({
      name,
      game_mode: mode,
      category_names: categories,
      total_questions: categories.length * questionsPerCat,
      user_id: userId,
      status: "active",
      board_state: board,
      teams_state: teams,
      solo_score: soloScore,
      current_step: "board",
      questions_per_cat: questionsPerCat,
      last_active_at: new Date().toISOString(),
    }).select("id").single();
    if (error) return null;
    return data?.id ?? null;
  } catch { return null; }
}

async function updateSession(
  sessionId: string,
  patch: {
    board?: BoardCell[][];
    teams?: Team[];
    soloScore?: number;
    currentStep?: Step;
    status?: "active" | "completed" | "expired";
  },
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const updates: Record<string, unknown> = {
      last_active_at: new Date().toISOString(),
    };
    if (patch.board       !== undefined) updates.board_state   = patch.board;
    if (patch.teams       !== undefined) updates.teams_state   = patch.teams;
    if (patch.soloScore   !== undefined) updates.solo_score    = patch.soloScore;
    if (patch.currentStep !== undefined) updates.current_step  = patch.currentStep;
    if (patch.status      !== undefined) {
      updates.status = patch.status;
      if (patch.status === "completed") updates.completed_at = new Date().toISOString();
    }
    await supabase.from("sessions").update(updates).eq("id", sessionId);
  } catch { /* silently skip */ }
}

// ─── No Coins Banner ──────────────────────────────────────────────────────────

function NoCoinsBanner({ coins, onDismiss }: { coins: number; onDismiss: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl pointer-events-auto"
        style={{ backgroundColor: "#1e1530", border: "1px solid #d4860a", maxWidth: 480 }}>
        <span className="text-2xl">🪙</span>
        <p className="text-sm flex-1" style={{ color: "#e8d5a0" }}>
          {coins === 0
            ? <>{t.arena.noCoinsTitle} <strong style={{ color: "#d4860a" }}>0</strong> {t.arena.noCoinsZero}{" "}<Link href="/buy" className="font-bold underline" style={{ color: "#d4860a" }}>{t.arena.noCoinsHere}</Link>.</>
            : <>{t.arena.notEnoughA} <strong style={{ color: "#d4860a" }}>{coins}</strong> {t.arena.notEnoughB}{coins === 1 ? "" : "s"} {t.arena.notEnoughC}</>
          }
        </p>
        <button onClick={onDismiss} className="text-lg leading-none" style={{ color: "#e8d5a0", opacity: 0.5 }}>✕</button>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Categories", "Mode", "Session", "Arena"];
const STEP_MAP: Record<Step, number> = { categories: 0, gameMode: 1, session: 2, board: 3, question: 3, answer: 3, results: 3 };

function StepIndicator({ step }: { step: Step }) {
  const current = STEP_MAP[step];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: i <= current ? "#d4860a" : "#1e1530", color: i <= current ? "#120d1f" : "#e8d5a0", border: i <= current ? "none" : "1px solid #2e2050", opacity: i > current ? 0.45 : 1 }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className="text-xs hidden md:block" style={{ color: "#e8d5a0", opacity: i === current ? 1 : 0.4 }}>{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && <div className="w-10 h-px mb-4" style={{ backgroundColor: i < current ? "#d4860a" : "#2e2050" }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Category Preview Modal ───────────────────────────────────────────────────
// Opened from the "?" badge on a category tile. Shows the category description
// plus a sample question styled like a game card, with a reveal-answer step —
// a quick taste of what playing this category feels like.

function CategoryPreviewModal({ cat, onClose }: { cat: CategoryOption; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const [revealed, setRevealed] = useState(false);
  const isAr = lang === "ar";
  const name        = isAr && cat.name_ar ? cat.name_ar : cat.name;
  const description = (isAr ? cat.description_ar : cat.description_en) || (cat.description_en || cat.description_ar || "");
  const question    = (isAr ? cat.sample_question_ar : cat.sample_question_en) || (cat.sample_question_en || cat.sample_question_ar || "");
  const answer      = (isAr ? cat.sample_answer_ar : cat.sample_answer_en) || (cat.sample_answer_en || cat.sample_answer_ar || "");
  const sampleImage = cat.sample_image_url || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" style={{ backgroundColor: "#000000aa" }}
         onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 md:p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
           style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}
           onClick={(e) => e.stopPropagation()}>
        {/* Header: cover thumbnail + name */}
        <div className="flex items-center gap-3">
          {cat.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cat.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" style={{ backgroundColor: "#0d091a" }} />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold truncate" style={{ color: "#e8d5a0" }}>{name}</h3>
          </div>
          <button onClick={onClose} className="text-lg leading-none shrink-0" style={{ color: "#e8d5a0", opacity: 0.5 }} aria-label={t.arena.previewClose}>✕</button>
        </div>

        {/* Description */}
        {description && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#a78bfa" }}>{t.arena.previewAbout}</p>
            <p className="text-base leading-relaxed" style={{ color: "#e8d5a0", opacity: 0.85, direction: isAr ? "rtl" : "ltr" }}>{description}</p>
          </div>
        )}

        {/* Sample question card — styled like a game-board card */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#120d1f", border: "1px solid #7c3aed44" }}>
          <span className="self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
            {t.arena.previewSampleQ}
          </span>
          {sampleImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sampleImage} alt="" className="w-full max-h-64 rounded-xl object-contain" style={{ backgroundColor: "#0d091a" }} />
          )}
          <p className="text-lg md:text-xl font-bold leading-snug" style={{ color: "#e8d5a0", direction: isAr ? "rtl" : "ltr" }}>{question}</p>
          {revealed ? (
            <div className="pt-3" style={{ borderTop: "1px solid #2e2050" }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#d4860a" }}>{t.arena.previewAnswer}</p>
              <p className="text-lg md:text-xl font-extrabold" style={{ color: "#e8d5a0", direction: isAr ? "rtl" : "ltr" }}>{answer}</p>
            </div>
          ) : (
            <button onClick={() => setRevealed(true)}
              className="self-start px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>
              {t.arena.previewReveal}
            </button>
          )}
        </div>

        <button onClick={onClose} className="w-full py-2.5 rounded-full text-sm font-medium"
          style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>
          {t.arena.previewClose}
        </button>
      </div>
    </div>
  );
}

// ─── Low-Questions Warning Modal ──────────────────────────────────────────────
// Opened from the red "!" badge on a category tile when this player has fewer
// unseen questions in it than a game would pull. Offers: take it anyway, or
// pick another category instead.

function LowQuestionsModal({ cat, onAnyway, onClose }:
  { cat: CategoryOption; onAnyway: () => void; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const name = lang === "ar" && cat.name_ar ? cat.name_ar : cat.name;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" style={{ backgroundColor: "#000000aa" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 md:p-7 flex flex-col gap-5"
           style={{ backgroundColor: "#1e1530", border: "1px solid #dc262666" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold truncate" style={{ color: "#f87171" }}>{t.arena.lowQTitle}</h3>
            <p className="text-xs truncate" style={{ color: "#e8d5a0", opacity: 0.55 }}>{name}</p>
          </div>
          <button onClick={onClose} className="text-lg leading-none shrink-0" style={{ color: "#e8d5a0", opacity: 0.5 }} aria-label={t.arena.lowQNewCat}>✕</button>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#e8d5a0" }}>{t.arena.lowQBody}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button onClick={onAnyway} className="px-5 py-2.5 rounded-full text-sm font-medium"
            style={{ border: "1px solid #2e2050", color: "#e8d5a0", cursor: "pointer" }}>
            {t.arena.lowQAnyway}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: "#d4860a", color: "#120d1f", cursor: "pointer" }}>
            {t.arena.lowQNewCat}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Select ──────────────────────────────────────────────────────────

function CategorySelect({ selected, coins, categories, unseenByCategory, favoriteIds, onToggleFavorite, favError, onToggle, onShowNoBanner, onNext }:
  { selected: string[]; coins: number; categories: CategoryOption[]; unseenByCategory: Record<string, number>; favoriteIds: Set<string>; onToggleFavorite: (catId: string) => void; favError: boolean; onToggle: (c: string) => void; onShowNoBanner: () => void; onNext: () => void }) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const questionsPerCat = QUESTIONS_PER_CATEGORY[selected.length] ?? 6;
  const [previewCat, setPreviewCat] = useState<CategoryOption | null>(null);
  const [lowQCat,   setLowQCat]   = useState<CategoryOption | null>(null);
  const [acked,     setAcked]     = useState<Set<string>>(new Set()); // tiles the player said "anyway" for
  // Active filter chip: "all", "fav", or a sorting-group English label.
  const [filter,    setFilter]    = useState<string>("all");
  // Transient "you have no favorites yet" bubble near the click point.
  const [noFav,     setNoFav]     = useState<{ x: number; y: number } | null>(null);
  const noFavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Distinct sorting groups (deduped by English label, Arabic carried along).
  const sortGroups: { en: string; ar: string }[] = [];
  for (const c of categories) {
    const en = (c.sort_label_en ?? "").trim();
    if (!en || sortGroups.some((g) => g.en === en)) continue;
    sortGroups.push({ en, ar: (c.sort_label_ar ?? "").trim() || en });
  }

  const visibleCategories = categories.filter((c) => {
    if (filter === "all") return true;
    if (filter === "fav") return !!c.id && favoriteIds.has(c.id);
    return (c.sort_label_en ?? "").trim() === filter;
  });

  const handleFavChip = (e: { clientX: number; clientY: number }) => {
    if (favoriteIds.size === 0) {
      if (noFavTimer.current) clearTimeout(noFavTimer.current);
      setNoFav({ x: e.clientX, y: e.clientY });
      noFavTimer.current = setTimeout(() => setNoFav(null), 2600);
      return;
    }
    setFilter("fav");
  };

  useEffect(() => () => { if (noFavTimer.current) clearTimeout(noFavTimer.current); }, []);

  const handleClick = (catName: string) => {
    if (selected.includes(catName)) { onToggle(catName); return; }
    if (coins <= selected.length) { onShowNoBanner(); return; }
    onToggle(catName);
  };

  // How many fresh questions a game would pull from a category if it were the
  // (selected.length + 1)-th one picked. With nothing selected we don't know
  // the game size yet, so no warning shows.
  const gameSizeIfAdded = QUESTIONS_PER_CATEGORY[Math.min(6, selected.length + 1)] ?? 6;
  const isLowOnQuestions = (cat: CategoryOption, isSelected: boolean, disabled: boolean): boolean => {
    if (selected.length === 0) return false;       // need ≥1 picked to know the game size
    if (isSelected || disabled) return false;       // only warn on pickable, unpicked tiles
    if (acked.has(cat.name)) return false;          // player already chose "I want it anyway"
    const unseen = unseenByCategory[cat.name];
    if (unseen === undefined) return false;         // unknown → don't warn
    return unseen < gameSizeIfAdded;
  };

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step="categories" />
      <div className="text-center">
        <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.arena.pickCategories}</h2>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>
          {t.arena.pickHint} · {selected.length}/6 {t.arena.selected} · <span style={{ color: "#d4860a" }}>🪙 {coins} {t.arena.coins}</span>
          {selected.length > 0 && <span style={{ color: "#d4860a" }}> · {questionsPerCat} {t.arena.questionsEach}</span>}
        </p>
      </div>

      {/* Sorting / filter chips. "All" + "Favorites" are always present;
          each distinct admin sorting group adds one more chip. */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2" style={{ direction: isAr ? "rtl" : "ltr" }}>
          {(() => {
            const chip = (key: string, label: string, onClick: (e: { clientX: number; clientY: number }) => void) => {
              const active = filter === key;
              return (
                <button key={key} type="button" onClick={onClick}
                  className="px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all"
                  style={{
                    backgroundColor: active ? "#d4860a" : "#1e1530",
                    color: active ? "#120d1f" : "#e8d5a0",
                    border: `1px solid ${active ? "#d4860a" : "#2e2050"}`,
                  }}>
                  {label}
                </button>
              );
            };
            return (
              <>
                {chip("all", t.arena.filterAll, () => setFilter("all"))}
                {chip("fav", t.arena.filterFavorites, handleFavChip)}
                {sortGroups.map((g) => chip(g.en, isAr ? g.ar : g.en, () => setFilter(g.en)))}
              </>
            );
          })()}
        </div>
      )}

      {categories.length === 0 && (
        <div className="rounded-2xl px-6 py-12 text-center" style={{ backgroundColor: "#1e1530", border: "1px dashed #2e2050" }}>
          <p className="text-2xl mb-2">🗂️</p>
          <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>No categories available yet — check back soon.</p>
        </div>
      )}
      {categories.length > 0 && visibleCategories.length === 0 && (
        <div className="rounded-2xl px-6 py-10 text-center" style={{ backgroundColor: "#1e1530", border: "1px dashed #2e2050" }}>
          <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>{filter === "fav" ? t.arena.noFavorites : "—"}</p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7 lg:gap-10">
        {visibleCategories.map((cat) => {
          const isSelected = selected.includes(cat.name);
          const disabled   = !isSelected && selected.length >= 6;
          const hasImage   = !!cat.image_url;
          const hasPreview = !!(cat.sample_question_en || cat.sample_question_ar);
          const lowQ       = isLowOnQuestions(cat, isSelected, disabled);
          const isFav      = !!cat.id && favoriteIds.has(cat.id);
          const qLeft      = unseenByCategory[cat.name];
          // Always identify by English name internally; show Arabic label if available + lang=ar
          const displayName = lang === "ar" && cat.name_ar ? cat.name_ar : cat.name;
          return (
            <button key={cat.name} onClick={() => !disabled && handleClick(cat.name)}
              className="relative rounded-2xl text-sm md:text-base font-semibold text-left transition-all overflow-hidden flex flex-col"
              style={{ backgroundColor: isSelected ? "#d4860a22" : "#1e1530", border: `2px solid ${isSelected ? "#d4860a" : "#2e2050"}`, color: isSelected ? "#d4860a" : disabled ? "#e8d5a033" : "#e8d5a0", cursor: disabled ? "not-allowed" : "pointer" }}>
              {/* "?" preview badge — top-left, absolute, never affects tile sizing.
                  A <span role=button> (not a nested <button>) keeps the markup valid;
                  stopPropagation prevents it from toggling category selection. */}
              {hasPreview && (
                <span
                  role="button" tabIndex={0}
                  title={t.arena.previewAria} aria-label={t.arena.previewAria}
                  onClick={(e) => { e.stopPropagation(); setPreviewCat(cat); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setPreviewCat(cat); } }}
                  className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold"
                  style={{ backgroundColor: "#7c3aed", color: "#ffffff", border: "1.5px solid #c4b5fd", cursor: "pointer", boxShadow: "0 0 10px rgba(124, 58, 237, 0.7)" }}
                >
                  ?
                </span>
              )}
              {/* Red "!" low-questions badge — top-right, absolute, pulses softly. */}
              {lowQ && (
                <span
                  role="button" tabIndex={0}
                  title={t.arena.lowQAria} aria-label={t.arena.lowQAria}
                  onClick={(e) => { e.stopPropagation(); setLowQCat(cat); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setLowQCat(cat); } }}
                  className="attention-pulse-red absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold"
                  style={{ backgroundColor: "#dc2626", color: "#ffffff", border: "1.5px solid #fca5a5", cursor: "pointer" }}
                >
                  !
                </span>
              )}
              {/* Questions-left circle — top-centre, always visible. Shows
                  this player's remaining unseen count (= total when unused). */}
              {qLeft !== undefined && (
                <span
                  title={t.arena.questionsLeftAria} aria-label={`${qLeft} ${t.arena.questionsLeftAria}`}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-10 min-w-7 h-7 px-2 rounded-full flex items-center justify-center text-xs font-extrabold"
                  style={{ backgroundColor: "#120d1fcc", color: "#e8d5a0", border: "1.5px solid #d4860a", backdropFilter: "blur(2px)" }}
                >
                  {qLeft}
                </span>
              )}
              {hasImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.image_url!} alt={displayName}
                  className="w-full aspect-square object-cover"
                  style={{ opacity: disabled ? 0.3 : 1, backgroundColor: "#0d091a" }} />
              )}
              {/* Favorite heart — bottom-right. stopPropagation so it never
                  toggles category selection. Needs a category id. */}
              {cat.id && (
                <span
                  role="button" tabIndex={0}
                  title={isFav ? t.arena.favRemove : t.arena.favAdd}
                  aria-label={isFav ? t.arena.favRemove : t.arena.favAdd}
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(cat.id!); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggleFavorite(cat.id!); } }}
                  className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-base"
                  style={{ backgroundColor: "#120d1fcc", border: `1.5px solid ${isFav ? "#f87171" : "#2e2050"}`, cursor: "pointer", backdropFilter: "blur(2px)" }}
                >
                  {isFav ? "❤️" : "🤍"}
                </span>
              )}
              <span className="px-3 py-3 md:px-4 md:py-3 block text-center truncate">
                {isSelected && <span className="mr-1.5">✓</span>}{displayName}
              </span>
            </button>
          );
        })}
      </div>

      {previewCat && <CategoryPreviewModal cat={previewCat} onClose={() => setPreviewCat(null)} />}
      {lowQCat && (
        <LowQuestionsModal
          cat={lowQCat}
          onClose={() => setLowQCat(null)}
          onAnyway={() => {
            const name = lowQCat.name;
            setAcked((prev) => new Set(prev).add(name));
            handleClick(name);
            setLowQCat(null);
          }}
        />
      )}
      <div className="flex justify-end">
        <button onClick={onNext} disabled={selected.length === 0}
          className="px-8 py-3 rounded-full font-bold text-sm"
          style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: selected.length === 0 ? 0.4 : 1, cursor: selected.length === 0 ? "not-allowed" : "pointer" }}>
          {t.arena.next}
        </button>
      </div>

      {/* Transient bubble shown next to the click when the player taps the
          Favorites chip but hasn't favorited anything yet. */}
      {noFav && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg text-xs font-bold pointer-events-none"
          style={{
            left: Math.min(noFav.x + 12, (typeof window !== "undefined" ? window.innerWidth : 9999) - 220),
            top: noFav.y + 12,
            backgroundColor: "#1e1530",
            color: "#e8d5a0",
            border: "1px solid #d4860a",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}>
          {t.arena.noFavorites}
        </div>
      )}

      {/* Bottom toast shown when a favorite couldn't be saved. */}
      {favError && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 px-5 py-3 rounded-xl text-sm font-bold text-center"
          style={{ backgroundColor: "#1e1530", color: "#fca5a5", border: "1px solid #dc2626", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
          {t.arena.favSaveFailed}
        </div>
      )}
    </div>
  );
}

// ─── Game Mode Select ─────────────────────────────────────────────────────────

function GameModeSelect({ gameMode, teamCount, teamNames, onModeChange, onTeamCountChange, onTeamNameChange, onBack, onNext }:
  { gameMode: GameMode; teamCount: number; teamNames: string[]; onModeChange: (m: GameMode) => void; onTeamCountChange: (n: number) => void; onTeamNameChange: (i: number, v: string) => void; onBack: () => void; onNext: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step="gameMode" />
      <div className="text-center">
        <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.arena.gameMode}</h2>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.arena.gameModeHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {(["solo", "team"] as GameMode[]).map((mode) => (
          <button key={mode} onClick={() => onModeChange(mode)}
            className="py-8 rounded-2xl flex flex-col items-center gap-3 transition-all"
            style={{ backgroundColor: gameMode === mode ? "#d4860a22" : "#1e1530", border: `2px solid ${gameMode === mode ? "#d4860a" : "#2e2050"}` }}>
            <span className="text-4xl">{mode === "solo" ? "👤" : "👥"}</span>
            <span className="font-bold" style={{ color: gameMode === mode ? "#d4860a" : "#e8d5a0" }}>{mode === "solo" ? t.arena.solo : t.arena.team}</span>
            <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.55 }}>{mode === "solo" ? t.arena.soloDesc : t.arena.teamDesc}</span>
          </button>
        ))}
      </div>
      {gameMode === "team" && (
        <div className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.arena.teamCount} <span style={{ color: "#d4860a" }}>{teamCount}</span></label>
            <div className="flex gap-2">
              {[2,3,4,5,6].map((n) => (
                <button key={n} onClick={() => onTeamCountChange(n)}
                  className="w-10 h-10 rounded-full text-sm font-bold"
                  style={{ backgroundColor: teamCount === n ? "#d4860a" : "#1e1530", color: teamCount === n ? "#120d1f" : "#e8d5a0", border: teamCount === n ? "none" : "1px solid #2e2050" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: teamCount }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.arena.teamLabel} {i + 1}</label>
                <input type="text" value={teamNames[i] ?? `${t.arena.teamLabel} ${i + 1}`} onChange={(e) => onTeamNameChange(i, e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-between mt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>{t.arena.back}</button>
        <button onClick={onNext} className="px-8 py-3 rounded-full font-bold text-sm hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>{t.arena.next}</button>
      </div>
    </div>
  );
}

// ─── Session Setup ────────────────────────────────────────────────────────────

function SessionSetup({ sessionName, onChange, onBack, onStart, loading, error }:
  { sessionName: string; onChange: (v: string) => void; onBack: () => void; onStart: () => void; loading: boolean; error?: string | null }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step="session" />
      <div className="text-center">
        <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.arena.sessionTitle}</h2>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.arena.sessionHint}</p>
      </div>
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-center" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
          {error}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>{t.arena.sessionName}</label>
        <input type="text" placeholder={t.arena.sessionPlaceholder} value={sessionName} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sessionName.trim() && onStart()}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0", fontSize: "16px" }} autoFocus />
      </div>
      <div className="flex justify-between mt-4">
        <button onClick={onBack} className="px-6 py-3 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>{t.arena.back}</button>
        <button onClick={onStart} disabled={!sessionName.trim() || loading}
          className="px-8 py-3 rounded-full font-bold text-sm transition-opacity"
          style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: !sessionName.trim() || loading ? 0.4 : 1, cursor: !sessionName.trim() ? "not-allowed" : "pointer" }}>
          {loading ? t.arena.loadingQuestions : t.arena.startGame}
        </button>
      </div>
    </div>
  );
}

// ─── Game Board ───────────────────────────────────────────────────────────────

// Pick a sensible cols × rows layout for a single-category board so 24
// (or 12 / 8 / 6) cells fill the screen without leaving giant gaps.
function singleCatLayout(count: number): { cols: number; rows: number } {
  if (count === 24) return { cols: 6, rows: 4 };
  if (count === 12) return { cols: 4, rows: 3 };
  if (count === 8)  return { cols: 4, rows: 2 };
  if (count === 6)  return { cols: 3, rows: 2 };
  if (count === 5)  return { cols: 5, rows: 1 };
  if (count <= 4)   return { cols: count, rows: 1 };
  const cols = Math.ceil(Math.sqrt(count));
  return { cols, rows: Math.ceil(count / cols) };
}

function GameBoard({ board, teams, gameMode, sessionName, onSelectCell, onEndGame, onTvLinked }:
  { board: BoardCell[][]; teams: Team[]; gameMode: GameMode; sessionName: string; onSelectCell: (c: BoardCell) => void; onEndGame: () => void; onTvLinked: (id: string) => void }) {
  const { t, lang } = useLanguage();
  const answered = board.flat().filter((c) => c.answered).length;
  const total    = board.flat().length;
  const rows     = board[0]?.length ?? 0;
  // Pick the right category label per active language
  const labelFor = (cell: BoardCell) => (lang === "ar" && cell.category_ar ? cell.category_ar : cell.category);
  const isSingleCat = board.length === 1;
  const layout = isSingleCat ? singleCatLayout(board[0].length) : { cols: board.length, rows };

  return (
    <div className="flex-1 flex flex-col gap-3 md:gap-4 min-h-0">
      {/* Compact header: session info + end-game button */}
      <div className="flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-extrabold truncate" style={{ color: "#e8d5a0" }}>{sessionName}</h2>
          <p className="text-xs mt-0.5" style={{ color: "#e8d5a0", opacity: 0.5 }}>{answered}/{total} {t.arena.answered}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <ConnectToTv onLinked={onTvLinked} />
          <button onClick={onEndGame} className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold"
            style={{ backgroundColor: "#7c3aed22", border: "1px solid #7c3aed", color: "#a78bfa" }}>
            {t.arena.endGame}
          </button>
        </div>
      </div>

      {/* Team scores (compact) */}
      {gameMode === "team" && teams.length > 0 && (
        <div className="flex gap-2 flex-wrap shrink-0">
          {[...teams].sort((a, b) => b.score - a.score).map((team) => (
            <div key={team.id} className="flex items-center gap-2 px-3 py-1 rounded-full"
              style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
              <span className="text-xs font-medium" style={{ color: "#e8d5a0" }}>{team.name}</span>
              <span className="text-xs font-bold" style={{ color: "#d4860a" }}>{team.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Board: fills the remaining viewport height so every category-count
          (2 / 3 / 4 / 5 / 6) lays out without scrolling. Cells use flex-1
          to share whatever space is left after the cover image. Cover image
          is capped at a viewport-relative height so it never dominates when
          fewer categories are picked (which yields wider columns). */}
      {isSingleCat ? (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="shrink-0 mx-auto flex flex-col rounded-xl overflow-hidden"
               style={{ backgroundColor: "#7c3aed22", border: "1px solid #7c3aed44", width: 220 }}>
            {board[0][0].category_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={board[0][0].category_image_url} alt=""
                   className="w-full aspect-[4/5] object-cover"
                   style={{ backgroundColor: "#0d091a", maxHeight: "26vh" }} />
            )}
            <span className="px-3 py-2 text-center text-sm md:text-base font-bold uppercase tracking-wide truncate"
                  style={{ color: "#a78bfa" }}>
              {labelFor(board[0][0])}
            </span>
          </div>
          <div className="flex-1 min-h-0 grid gap-2 md:gap-3"
               style={{
                 gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                 gridTemplateRows:    `repeat(${layout.rows}, minmax(0, 1fr))`,
               }}>
            {board[0].map((cell, idx) => (
              <button key={`${cell.category}-${cell.points}`}
                onClick={() => !cell.answered && onSelectCell(cell)}
                className="rounded-xl text-center font-extrabold text-base md:text-xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: cell.answered ? "#1e153088" : "#1e1530",
                  border: `2px solid ${difficultyBorderColor(idx, rows, cell.answered)}`,
                  color: cell.answered ? "#2e205066" : "#d4860a",
                  cursor: cell.answered ? "default" : "pointer",
                }}>
                {cell.answered ? "—" : cell.points.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid gap-2 md:gap-3"
             style={{ gridTemplateColumns: `repeat(${board.length}, minmax(0, 1fr))` }}>
          {/* Each column is its own flex column so the cover stays a fixed
              portion at the top and the point cells share the remaining
              vertical space equally — same look for 6, 5, 4, 3, 2 cats. */}
          {board.map((col) => (
            <div key={col[0].category} className="flex flex-col gap-2 min-h-0">
              <div className="shrink-0 rounded-xl flex flex-col overflow-hidden"
                   style={{ backgroundColor: "#7c3aed22", border: "1px solid #7c3aed44" }}>
                {col[0].category_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={col[0].category_image_url} alt=""
                       className="w-full aspect-[4/5] object-cover"
                       style={{ backgroundColor: "#0d091a", maxHeight: "26vh" }} />
                )}
                <span className="px-2 py-2 text-center text-xs md:text-sm font-bold uppercase tracking-wide truncate"
                      style={{ color: "#a78bfa" }}>
                  {labelFor(col[0])}
                </span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col gap-2">
                {col.map((cell, rowIdx) => (
                  <button key={`${cell.category}-${cell.points}`}
                    onClick={() => !cell.answered && onSelectCell(cell)}
                    className="flex-1 min-h-0 rounded-xl text-center font-extrabold text-sm md:text-base lg:text-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: cell.answered ? "#1e153088" : "#1e1530",
                      border: `2px solid ${difficultyBorderColor(rowIdx, rows, cell.answered)}`,
                      color: cell.answered ? "#2e205066" : "#d4860a",
                      cursor: cell.answered ? "default" : "pointer",
                    }}>
                    {cell.answered ? "—" : cell.points.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

const REPORT_REASONS = [
  { id: "wrong_answer",    label: "Wrong question answer" },
  { id: "inaccurate",     label: "Inaccurate answer" },
  { id: "inappropriate",  label: "Inappropriate question or answer" },
  { id: "other",          label: "Other" },
];

function ReportModal({ cell, onClose }: { cell: BoardCell; onClose: () => void }) {
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [reason,    setReason]    = useState("");
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [err,        setErr]        = useState("");

  const submit = async () => {
    if (!email || !reason) { setErr("Please fill in your email and select a reason."); return; }
    setSubmitting(true);
    setErr("");
    try {
      const res = await fetch("/api/report-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cell.question,
          category: cell.category,
          points: cell.points,
          reason,
          otherText,
          email,
          phone,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || data.error) { setErr(data.error ?? "Something went wrong."); }
      else { setSubmitted(true); }
    } catch (e) { setErr(String(e)); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "#00000088" }}>
      <div className="w-full max-w-md rounded-2xl p-7 flex flex-col gap-5" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
        {submitted ? (
          <>
            <div className="text-center">
              <p className="text-3xl mb-3">✅</p>
              <h3 className="font-bold text-lg" style={{ color: "#4ade80" }}>Report Submitted</h3>
              <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>Thank you for helping us improve. We'll review this question shortly.</p>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-full font-bold text-sm" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>Close</button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-base" style={{ color: "#f87171" }}>⚠️ Report This Question</h3>
                <p className="text-xs mt-1 truncate" style={{ color: "#e8d5a0", opacity: 0.5 }}>{cell.category} · {cell.points} pts</p>
              </div>
              <button onClick={onClose} className="text-lg leading-none shrink-0" style={{ color: "#e8d5a0", opacity: 0.4 }}>✕</button>
            </div>

            {err && <p className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: "#dc262622", color: "#f87171", border: "1px solid #dc262644" }}>{err}</p>}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: "#e8d5a0" }}>Email <span style={{ color: "#f87171" }}>*</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: "#e8d5a0" }}>Mobile Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium" style={{ color: "#e8d5a0" }}>Issue <span style={{ color: "#f87171" }}>*</span></label>
              {REPORT_REASONS.map((r) => (
                <label key={r.id} className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setReason(r.id)}
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ border: `2px solid ${reason === r.id ? "#d4860a" : "#2e2050"}`, backgroundColor: reason === r.id ? "#d4860a" : "transparent", cursor: "pointer" }}
                  >
                    {reason === r.id && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#120d1f" }} />}
                  </div>
                  <span className="text-sm" style={{ color: reason === r.id ? "#e8d5a0" : "#e8d5a0", opacity: reason === r.id ? 1 : 0.65 }}>{r.label}</span>
                </label>
              ))}
              {reason === "other" && (
                <textarea
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Please describe the issue…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }}
                />
              )}
            </div>

            <button onClick={submit} disabled={submitting}
              className="w-full py-3 rounded-full font-bold text-sm"
              style={{ backgroundColor: "#f87171", color: "#120d1f", opacity: submitting ? 0.5 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Question View ────────────────────────────────────────────────────────────

function QuestionView({ cell, tickUrl, onReveal, onReport }: { cell: BoardCell; tickUrl: string; onReveal: () => void; onReport: () => void }) {
  const { t, lang } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(60);
  const [expired,  setExpired]  = useState(false);
  const tickRef = useRef<HTMLAudioElement | null>(null);
  const questionText = lang === "ar" && cell.question_ar ? cell.question_ar : cell.question;
  const categoryText = lang === "ar" && cell.category_ar ? cell.category_ar : cell.category;

  // Start tick audio when question is shown
  useEffect(() => {
    if (!tickUrl) return;
    const audio = new Audio(tickUrl);
    audio.loop   = true;
    audio.volume = 0.5;
    tickRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      tickRef.current = null;
    };
  }, [tickUrl]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setExpired(true);
      tickRef.current?.pause();
      return;
    }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const handleReveal = () => {
    tickRef.current?.pause();
    onReveal();
  };

  const timerColor = timeLeft > 20 ? "#d4860a" : timeLeft > 10 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>{categoryText}</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>{cell.points.toLocaleString()}</span>
        <button onClick={onReport} title={t.arena.report}
          className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
          style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
          {t.arena.report}
        </button>
      </div>
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#2e2050" }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${(timeLeft / 60) * 100}%`, backgroundColor: timerColor }} />
        </div>
        <span className="text-3xl font-extrabold tabular-nums" style={{ color: expired ? "#ef4444" : timerColor }}>{expired ? t.arena.timesUp : `${timeLeft}s`}</span>
      </div>
      <div className="w-full rounded-2xl p-6 md:p-8 flex flex-col gap-4" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
        {cell.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cell.image_url} alt=""
            className="w-full max-h-72 object-contain rounded-xl"
            style={{ backgroundColor: "#120d1f" }} />
        )}
        {cell.video_url && (
          <video src={cell.video_url} controls
            className="w-full max-h-80 rounded-xl"
            style={{ backgroundColor: "#000" }} />
        )}
        {cell.audio_url && (
          <audio src={cell.audio_url} controls
            className="w-full" />
        )}
        <p className="text-xl md:text-2xl font-bold leading-snug" style={{ color: "#e8d5a0" }}>{questionText}</p>
      </div>
      <button onClick={handleReveal} className="px-10 py-3 rounded-full font-bold text-sm hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>{t.arena.revealAnswer}</button>
    </div>
  );
}

// ─── Answer Reveal ────────────────────────────────────────────────────────────

function AnswerReveal({ cell, teams, gameMode, onAward, onNoOne, onReport }:
  { cell: BoardCell; teams: Team[]; gameMode: GameMode; onAward: (id: number | null) => void; onNoOne: () => void; onReport: () => void }) {
  const { t, lang } = useLanguage();
  const questionText = lang === "ar" && cell.question_ar ? cell.question_ar : cell.question;
  const answerText   = lang === "ar" && cell.answer_ar   ? cell.answer_ar   : cell.answer;
  const categoryText = lang === "ar" && cell.category_ar ? cell.category_ar : cell.category;
  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>{categoryText}</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>{cell.points.toLocaleString()}</span>
        <button onClick={onReport} title={t.arena.report}
          className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
          style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
          {t.arena.report}
        </button>
      </div>
      <div className="w-full rounded-2xl p-6" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
        <p className="text-sm mb-4" style={{ color: "#e8d5a0", opacity: 0.55 }}>{t.arena.questionWas}</p>
        {cell.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cell.image_url} alt=""
            className="w-full max-h-56 object-contain rounded-xl mb-4"
            style={{ backgroundColor: "#120d1f" }} />
        )}
        {cell.video_url && (
          <video src={cell.video_url} controls
            className="w-full max-h-56 rounded-xl mb-4"
            style={{ backgroundColor: "#000" }} />
        )}
        {cell.audio_url && (
          <audio src={cell.audio_url} controls className="w-full mb-4" />
        )}
        <p className="text-base italic mb-6" style={{ color: "#e8d5a0", opacity: 0.8 }}>{questionText}</p>
        <div className="h-px mb-6" style={{ backgroundColor: "#2e2050" }} />
        <p className="text-sm mb-2 font-bold" style={{ color: "#d4860a" }}>{t.arena.correctAnswer}</p>
        <p className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>{answerText}</p>
      </div>
      {gameMode === "team" ? (
        <div className="w-full flex flex-col gap-3">
          <p className="text-sm font-medium" style={{ color: "#e8d5a0", opacity: 0.7 }}>{t.arena.whoCorrect}</p>
          <div className="grid grid-cols-2 gap-2">
            {teams.map((team) => (
              <button key={team.id} onClick={() => onAward(team.id)} className="py-3 px-4 rounded-xl font-bold text-sm hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>{team.name}</button>
            ))}
          </div>
          <button onClick={onNoOne} className="w-full py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.7 }}>{t.arena.nobody}</button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button onClick={() => onAward(null)} className="px-8 py-3 rounded-full font-bold text-sm" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>{t.arena.iGotIt} (+{cell.points})</button>
          <button onClick={onNoOne} className="px-8 py-3 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.7 }}>{t.arena.missedIt}</button>
        </div>
      )}
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function ResultsScreen({ teams, gameMode, soloScore, sessionName, onPlayAgain }:
  { teams: Team[]; gameMode: GameMode; soloScore: number; sessionName: string; onPlayAgain: () => void }) {
  const { t } = useLanguage();
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div className="text-5xl">🏆</div>
      <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>{t.arena.gameOver}</h2>
      <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.arena.session} {sessionName}</p>
      {gameMode === "solo" ? (
        <div className="rounded-2xl p-8 w-full" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          <p className="text-sm mb-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>{t.arena.finalScore}</p>
          <p className="text-5xl font-extrabold" style={{ color: "#d4860a" }}>{soloScore.toLocaleString()}</p>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-3">
          {sorted.map((team, i) => (
            <div key={team.id} className="flex items-center justify-between px-6 py-4 rounded-2xl"
              style={{ backgroundColor: i === 0 ? "#d4860a22" : "#1e1530", border: `1px solid ${i === 0 ? "#d4860a" : "#2e2050"}` }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                <span className="font-bold" style={{ color: "#e8d5a0" }}>{team.name}</span>
              </div>
              <span className="text-xl font-extrabold" style={{ color: i === 0 ? "#d4860a" : "#e8d5a0" }}>{team.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3 mt-2">
        <button onClick={onPlayAgain} className="px-8 py-3 rounded-full font-bold text-sm hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>{t.arena.playAgain}</button>
        <Link href="/" className="px-8 py-3 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>{t.arena.home}</Link>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ArenaGame() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [ready,       setReady]       = useState(false);
  const [coins,       setCoins]       = useState(0);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [showBanner,  setShowBanner]  = useState(false);
  const [gameError,   setGameError]   = useState<string | null>(null);
  // Starts empty — categories come from Supabase. No hardcoded fallback list:
  // an empty DB shows an empty picker, which is the truthful state.
  const [liveCategories, setLiveCategories] = useState<CategoryOption[]>([]);
  // categoryName -> how many questions in it this player hasn't seen yet.
  // Drives the red "!" warning badge on the picker.
  const [unseenByCategory, setUnseenByCategory] = useState<Record<string, number>>({});
  // Category ids this player has favorited (hearted).
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  // True briefly when a favorite couldn't be saved (e.g. table missing).
  const [favErr, setFavErr] = useState(false);

  const [step,     setStep]     = useState<Step>("categories");
  const [selectedCategories, setSelected] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("team");
  const [teamCount, setTeamCount] = useState(2);
  const [teamNames, setTeamNames] = useState<string[]>(["Team 1","Team 2","Team 3","Team 4","Team 5","Team 6"]);
  const [teams,    setTeams]    = useState<Team[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [board,    setBoard]    = useState<BoardCell[][]>([]);
  const [currentCell, setCurrentCell] = useState<BoardCell | null>(null);
  const [soloScore, setSoloScore] = useState(0);
  const [loadingGame, setLoadingGame] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [reportCell, setReportCell] = useState<BoardCell | null>(null);

  // DB id for the active game row — created on startGame, hydrated on resume.
  // Used to UPDATE the row as the game progresses so refresh/close = recoverable.
  const [sessionId, setSessionId] = useState<string | null>(null);

  // When the phone has linked a TV (via the "Connect to TV" popup),
  // this holds that pairing-session id. While set, every game change
  // is mirrored to the TV through the secure /api/tv/sync route.
  const [tvSessionId, setTvSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!tvSessionId) return;
    const mirror = ["board", "question", "answer", "results"].includes(step);
    if (!mirror) return;
    const payload = {
      v: 1,
      step,
      lang,
      sessionName,
      gameMode,
      teams,
      soloScore,
      board,
      currentCell,
    };
    fetch("/api/tv/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: tvSessionId, state: payload }),
    }).catch(() => {});
  }, [tvSessionId, step, lang, sessionName, gameMode, teams, soloScore, board, currentCell]);

  // Arena music
  const [arenaMusicUrl, setArenaMusicUrl] = useState("");
  const [tickUrl,       setTickUrl]       = useState("");
  const arenaAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load arena settings
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.from("site_settings").select("key, value")
      .in("key", ["arena_music_url", "arena_tick_url"])
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
        setArenaMusicUrl(map.arena_music_url ?? "");
        setTickUrl(map.arena_tick_url ?? "");
      });
  }, []);

  // Arena background music: play during board/question/answer
  useEffect(() => {
    if (!arenaMusicUrl) return;
    const inGame = ["board", "question", "answer"].includes(step);
    if (inGame) {
      if (!arenaAudioRef.current) {
        const audio = new Audio(arenaMusicUrl);
        audio.loop   = true;
        audio.volume = 0.4;
        arenaAudioRef.current = audio;
      }
      arenaAudioRef.current.play().catch(() => {});
    } else {
      arenaAudioRef.current?.pause();
    }
  }, [step, arenaMusicUrl]);

  // Cleanup arena audio on unmount
  useEffect(() => {
    return () => {
      arenaAudioRef.current?.pause();
      arenaAudioRef.current = null;
    };
  }, []);

  // Auth + purchase check — bulletproof against hangs/errors
  useEffect(() => {
    if (!isSupabaseConfigured) { setReady(true); setCoins(999); return; }

    let cancelled = false;
    const finishWithDefaults = (uid: string | null) => {
      if (cancelled) return;
      if (uid) setUserId(uid);
      setReady(true);
    };

    const recoverSessionFromStorage = (): { id: string; email?: string } | null => {
      try {
        const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https?:\/\/([^.]+)\./)?.[1];
        if (!projectRef || typeof window === "undefined") return null;
        const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { access_token?: string };
        const parts = parsed.access_token?.split(".");
        if (parts && parts.length === 3) {
          const payload = JSON.parse(atob(parts[1])) as { sub?: string; email?: string; exp?: number };
          if (payload.sub && (!payload.exp || payload.exp * 1000 > Date.now())) {
            return { id: payload.sub, email: payload.email };
          }
        }
      } catch { /* ignore */ }
      return null;
    };

    (async () => {
      // 1) Get the session, racing against a 4s timeout
      let userIdLocal: string | null = null;
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("getSession timeout")), 4000)),
        ]) as { data: { session: { user: { id: string } } | null } };

        if (sessionResult.data.session?.user) {
          userIdLocal = sessionResult.data.session.user.id;
        }
      } catch {
        // Fall back to localStorage
        const recovered = recoverSessionFromStorage();
        if (recovered) userIdLocal = recovered.id;
      }

      // No session anywhere → bounce to login
      if (!userIdLocal) {
        router.replace("/login?next=/arena");
        return;
      }

      // 2) Fetch profile + categories in parallel, each with its own timeout
      const profilePromise = (async () => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5000);
          const { data } = await supabase
            .from("profiles")
            .select("category_coins")
            .eq("id", userIdLocal!)
            .abortSignal(ctrl.signal)
            .maybeSingle();
          clearTimeout(t);
          return data?.category_coins ?? 0;
        } catch { return 0; }
      })();

      const categoriesPromise = (async (): Promise<CategoryOption[] | null> => {
        // Use select("*") so a single query works on any schema state
        // (pre- or post-migration), then drop hidden rows client-side.
        // is_hidden may be undefined on un-migrated DBs — undefined is
        // falsy, so unmigrated rows correctly stay visible.
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5000);
          const res = await supabase
            .from("categories")
            .select("*")
            .eq("active", true)
            .order("name_en")
            .abortSignal(ctrl.signal);
          clearTimeout(t);
          if (res.error || !res.data) return null;
          const rows = (res.data as Array<Record<string, unknown>>).filter(
            (c) => !(c.is_hidden as boolean | null | undefined),
          );
          return rows.map((c) => ({
            id:                 (c.id as string | null) ?? null,
            name:               c.name_en as string,
            name_ar:            (c.name_ar as string | null) ?? null,
            image_url:          (c.image_url as string | null) ?? null,
            sort_label_en:      (c.sort_label_en as string | null) ?? null,
            sort_label_ar:      (c.sort_label_ar as string | null) ?? null,
            description_en:      (c.description_en as string | null) ?? null,
            description_ar:      (c.description_ar as string | null) ?? null,
            sample_question_en:  (c.sample_question_en as string | null) ?? null,
            sample_answer_en:    (c.sample_answer_en as string | null) ?? null,
            sample_question_ar:  (c.sample_question_ar as string | null) ?? null,
            sample_answer_ar:    (c.sample_answer_ar as string | null) ?? null,
            sample_image_url:    (c.sample_image_url as string | null) ?? null,
          }));
        } catch { return null; }
      })();

      // Per-category "unseen by this player" counts for the red "!" badge.
      // (Fetches all visible question ids + this user's seen ids — fine for
      // the current bank size; could move to an RPC if the bank gets huge.)
      const unseenPromise = (async (): Promise<Record<string, number>> => {
        try {
          const [qRes, seenRes, catRes] = await Promise.all([
            supabase.from("questions").select("id, category_id, is_hidden"),
            supabase.from("user_seen_questions").select("question_id").eq("user_id", userIdLocal!),
            supabase.from("categories").select("id, name_en"),
          ]);
          const idToCat: Record<string, string> = {};
          const totalByCat: Record<string, number> = {};
          for (const q of (qRes.data ?? []) as Array<{ id: string; category_id: string; is_hidden?: boolean | null }>) {
            if (q.is_hidden) continue;
            idToCat[q.id] = q.category_id;
            totalByCat[q.category_id] = (totalByCat[q.category_id] ?? 0) + 1;
          }
          const seenByCat: Record<string, number> = {};
          for (const r of (seenRes.data ?? []) as Array<{ question_id: string }>) {
            const cid = idToCat[r.question_id];
            if (cid) seenByCat[cid] = (seenByCat[cid] ?? 0) + 1;
          }
          const catIdToName: Record<string, string> = {};
          for (const c of (catRes.data ?? []) as Array<{ id: string; name_en: string }>) catIdToName[c.id] = c.name_en;
          const out: Record<string, number> = {};
          for (const [cid, total] of Object.entries(totalByCat)) {
            const name = catIdToName[cid];
            if (name) out[name] = Math.max(0, total - (seenByCat[cid] ?? 0));
          }
          return out;
        } catch { return {}; }
      })();

      // This player's favorited category ids. Empty set if the table
      // doesn't exist yet (migration not run) — degrades gracefully.
      const favoritesPromise = (async (): Promise<Set<string>> => {
        try {
          const { data, error } = await supabase
            .from("user_favorite_categories")
            .select("category_id")
            .eq("user_id", userIdLocal!);
          if (error || !data) return new Set();
          return new Set((data as Array<{ category_id: string }>).map((r) => r.category_id));
        } catch { return new Set(); }
      })();

      const [coinsValue, categoryList, unseen, favorites] = await Promise.all([profilePromise, categoriesPromise, unseenPromise, favoritesPromise]);

      if (cancelled) return;
      setCoins(coinsValue);
      if (categoryList) setLiveCategories(categoryList);
      setUnseenByCategory(unseen);
      setFavoriteIds(favorites);
      finishWithDefaults(userIdLocal);
    })();

    return () => { cancelled = true; };
  }, [router]);

  // Resume an existing active game when the URL has ?resume=<sessionId>.
  // Triggered after auth completes (ready + userId). On success we skip the
  // category/mode/session steps entirely and land directly on the board.
  // We do NOT rededuct coins — they were already spent when the session was
  // first created. Expired sessions (>24h) are silently flipped + ignored.
  useEffect(() => {
    if (!ready || !userId || !isSupabaseConfigured) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get("resume");
    if (!resumeId) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("id, name, game_mode, category_names, board_state, teams_state, solo_score, status, expires_at, questions_per_cat")
          .eq("id", resumeId)
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        if (data.status !== "active") return;
        if (new Date(data.expires_at as string) < new Date()) {
          await supabase.from("sessions").update({ status: "expired" }).eq("id", resumeId);
          return;
        }
        const restoredBoard = (data.board_state ?? []) as BoardCell[][];
        const restoredTeams = (data.teams_state ?? []) as Team[];
        setSessionId(data.id as string);
        setSessionName((data.name as string) ?? "");
        setGameMode((data.game_mode as GameMode) ?? "team");
        setSelected((data.category_names as string[]) ?? []);
        setBoard(restoredBoard);
        setTeams(restoredTeams);
        setTeamCount(Math.max(2, restoredTeams.length || 2));
        setTeamNames(restoredTeams.map((t) => t.name).concat(["Team 5", "Team 6"]).slice(0, 6));
        setSoloScore((data.solo_score as number) ?? 0);
        setSessionSaved(false);
        setStep("board");
      } catch { /* swallow */ }
    })();
    return () => { cancelled = true; };
  }, [ready, userId]);

  const toggleCategory = useCallback((cat: string) => {
    setSelected((p) => p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]);
  }, []);

  // Heart a category on/off. Optimistic: flip the UI first, then write to
  // the DB; on DB failure revert so the heart never lies.
  const toggleFavorite = useCallback((catId: string) => {
    if (!catId) return;
    const wasFav = favoriteIds.has(catId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFav) next.delete(catId); else next.add(catId);
      return next;
    });
    if (!isSupabaseConfigured || !userId) return;
    (async () => {
      try {
        const { error } = wasFav
          ? await supabase.from("user_favorite_categories").delete().eq("user_id", userId).eq("category_id", catId)
          : await supabase.from("user_favorite_categories").insert({ user_id: userId, category_id: catId });
        if (error) throw error;
      } catch {
        // Revert on failure (e.g. table missing / offline) and tell the user
        // instead of silently flickering the heart back off.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFav) next.add(catId); else next.delete(catId);
          return next;
        });
        setFavErr(true);
        setTimeout(() => setFavErr(false), 3500);
      }
    })();
  }, [favoriteIds, userId]);

  const handleTeamCountChange = (n: number) => {
    setTeamCount(n);
    setTeamNames((p) => { const u = [...p]; while (u.length < n) u.push(`Team ${u.length + 1}`); return u; });
  };

  const startGame = async () => {
    setGameError(null);
    setLoadingGame(true);

    if (isSupabaseConfigured && userId) {
      const res = await fetch("/api/arena/use-coin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: selectedCategories.length }),
      });
      const result = await res.json() as { success?: boolean; error?: string; remaining?: number };
      if (!res.ok || result.error) {
        setGameError(result.error ?? "Not enough coins to start. Go back and adjust your selection.");
        setLoadingGame(false);
        return;
      }
      setCoins(result.remaining ?? 0);
    }

    const questionsPerCat = QUESTIONS_PER_CATEGORY[selectedCategories.length] ?? 6;

    // What has this player already seen? The board-builder uses it to prefer
    // fresh questions; failing to fetch just means no preference (harmless).
    let seenIds = new Set<string>();
    if (isSupabaseConfigured && userId) {
      try {
        const { data } = await supabase.from("user_seen_questions").select("question_id").eq("user_id", userId);
        if (data) seenIds = new Set((data as Array<{ question_id: string }>).map((r) => r.question_id));
      } catch { /* ignore */ }
    }

    const dbBoard   = await fetchBoardFromSupabase(selectedCategories, questionsPerCat, seenIds);
    const builtBoard = dbBoard ?? buildBoardFromMock(selectedCategories, questionsPerCat);
    const initialTeams: Team[] = Array.from({ length: teamCount }, (_, i) => ({ id: i, name: teamNames[i] || `Team ${i + 1}`, score: 0 }));

    setBoard(builtBoard);
    setTeams(initialTeams);
    setSoloScore(0);
    setSessionSaved(false);

    // Record every real question on this board as "seen" by the player.
    // Fire-and-forget — don't block game start; duplicates are ignored.
    if (isSupabaseConfigured && userId) {
      const rows = builtBoard.flat()
        .map((c) => c.question_id)
        .filter((id): id is string => !!id)
        .map((question_id) => ({ user_id: userId, question_id }));
      if (rows.length > 0) {
        supabase.from("user_seen_questions").upsert(rows, { onConflict: "user_id,question_id", ignoreDuplicates: true }).then(() => {});
      }
    }

    // Persist the new active game so refresh/close → can be resumed via /history.
    const newId = await createActiveSession(
      sessionName, gameMode, selectedCategories, initialTeams,
      0, questionsPerCat, builtBoard, userId,
    );
    setSessionId(newId);

    setLoadingGame(false);
    setStep("board");
  };

  const handleEndGame = useCallback(async (finalTeams: Team[], finalSoloScore: number, finalBoard?: BoardCell[][]) => {
    if (!sessionSaved) {
      setSessionSaved(true);
      if (sessionId) {
        await updateSession(sessionId, {
          board:       finalBoard ?? board,
          teams:       finalTeams,
          soloScore:   finalSoloScore,
          currentStep: "results",
          status:      "completed",
        });
      }
    }
    arenaAudioRef.current?.pause();
    setStep("results");
  }, [sessionSaved, sessionId, board]);

  const handleSelectCell = (cell: BoardCell) => { setCurrentCell(cell); setStep("question"); };
  const handleReveal = () => setStep("answer");

  const handleAward = (teamId: number | null) => {
    if (!currentCell) return;
    let newTeams = teams;
    let newSolo  = soloScore;
    if (gameMode === "solo") { newSolo = soloScore + currentCell.points; setSoloScore(newSolo); }
    else if (teamId !== null) { newTeams = teams.map((t) => t.id === teamId ? { ...t, score: t.score + currentCell.points } : t); setTeams(newTeams); }
    const newBoard = board.map((col) => col.map((c) => c.category === currentCell.category && c.points === currentCell.points ? { ...c, answered: true } : c));
    setBoard(newBoard);
    setCurrentCell(null);
    const done = newBoard.flat().every((c) => c.answered);
    if (done) {
      handleEndGame(newTeams, newSolo, newBoard);
    } else {
      setStep("board");
      // Persist after-state so a refresh resumes here, not on a stale snapshot.
      if (sessionId) updateSession(sessionId, { board: newBoard, teams: newTeams, soloScore: newSolo, currentStep: "board" });
    }
  };

  const handleNoOne = () => {
    if (!currentCell) return;
    const newBoard = board.map((col) => col.map((c) => c.category === currentCell.category && c.points === currentCell.points ? { ...c, answered: true } : c));
    setBoard(newBoard);
    setCurrentCell(null);
    const done = newBoard.flat().every((c) => c.answered);
    if (done) {
      handleEndGame(teams, soloScore, newBoard);
    } else {
      setStep("board");
      if (sessionId) updateSession(sessionId, { board: newBoard, currentStep: "board" });
    }
  };

  const handlePlayAgain = () => {
    setStep("categories"); setSelected([]); setSessionName("");
    setBoard([]); setCurrentCell(null); setSoloScore(0); setSessionSaved(false);
    setSessionId(null);
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "#d4860a", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // Board step: full viewport (no max width, full height) so the grid +
  // question buttons fill the screen without scrollbars.
  // Categories step: wide container so the category tiles use the whole page.
  // Mode / session / results: narrow + centered for readability.
  const isBoardStep      = step === "board";
  const isCategoriesStep = step === "categories";
  const containerClass = isBoardStep
    ? "w-full max-w-none flex-1 flex flex-col min-h-0 mx-auto"
    : isCategoriesStep
      ? "w-full max-w-none mx-auto"
      : "w-full max-w-3xl mx-auto";
  return (
    <div className={containerClass}>
      {showBanner && <NoCoinsBanner coins={coins} onDismiss={() => setShowBanner(false)} />}
      {reportCell && <ReportModal cell={reportCell} onClose={() => setReportCell(null)} />}

      {step === "categories" && (
        <CategorySelect selected={selectedCategories} coins={coins} categories={liveCategories}
          unseenByCategory={unseenByCategory} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} favError={favErr}
          onToggle={toggleCategory} onShowNoBanner={() => setShowBanner(true)} onNext={() => setStep("gameMode")} />
      )}
      {step === "gameMode" && (
        <GameModeSelect gameMode={gameMode} teamCount={teamCount} teamNames={teamNames}
          onModeChange={setGameMode} onTeamCountChange={handleTeamCountChange}
          onTeamNameChange={(i, v) => setTeamNames((p) => { const u=[...p]; u[i]=v; return u; })}
          onBack={() => setStep("categories")} onNext={() => setStep("session")} />
      )}
      {step === "session" && (
        <SessionSetup sessionName={sessionName} onChange={setSessionName}
          onBack={() => setStep("gameMode")} onStart={startGame} loading={loadingGame} error={gameError} />
      )}
      {step === "board" && board.length > 0 && (
        <GameBoard board={board} teams={teams} gameMode={gameMode} sessionName={sessionName}
          onSelectCell={handleSelectCell} onEndGame={() => handleEndGame(teams, soloScore)} onTvLinked={setTvSessionId} />
      )}
      {step === "question" && currentCell && (
        <QuestionView cell={currentCell} tickUrl={tickUrl} onReveal={handleReveal} onReport={() => setReportCell(currentCell)} />
      )}
      {step === "answer" && currentCell && (
        <AnswerReveal cell={currentCell} teams={teams} gameMode={gameMode}
          onAward={handleAward} onNoOne={handleNoOne} onReport={() => setReportCell(currentCell)} />
      )}
      {step === "results" && (
        <ResultsScreen teams={teams} gameMode={gameMode} soloScore={soloScore} sessionName={sessionName} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
}
