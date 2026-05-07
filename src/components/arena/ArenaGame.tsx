"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ALL_CATEGORIES, MOCK_QUESTIONS } from "@/lib/mockQuestions";

type Step = "categories" | "gameMode" | "session" | "board" | "question" | "answer" | "results";
type GameMode = "solo" | "team";

interface Team      { id: number; name: string; score: number; }
interface BoardCell { category: string; points: number; question: string; answer: string; answered: boolean; }

// ─── Question count per number of selected categories ─────────────────────────
const QUESTIONS_PER_CATEGORY: Record<number, number> = {
  1: 36, 2: 18, 3: 12, 4: 9, 5: 8, 6: 6,
};

function getPointValues(questionsPerCat: number): number[] {
  if (questionsPerCat === 6) return [200, 400, 600, 800, 1000, 1200];
  return Array.from({ length: questionsPerCat }, (_, i) => (i + 1) * 100);
}

// ─── Board builders ───────────────────────────────────────────────────────────

async function fetchBoardFromSupabase(categories: string[], questionsPerCat: number): Promise<BoardCell[][] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: cats } = await supabase
      .from("categories").select("id, name_en").in("name_en", categories);
    if (!cats || cats.length === 0) return null;

    const { data: qs } = await supabase
      .from("questions")
      .select("category_id, points, question_en, answer_en")
      .in("category_id", cats.map((c) => c.id))
      .order("points", { ascending: true });
    if (!qs || qs.length === 0) return null;

    const pointValues = getPointValues(questionsPerCat);
    return categories.map((catName) => {
      const catRow = cats.find((c) => c.name_en === catName);
      const catQs  = qs.filter((x) => x.category_id === catRow?.id).slice(0, questionsPerCat);
      return pointValues.map((pv, idx) => ({
        category: catName, points: pv,
        question: catQs[idx]?.question_en ?? `${catName} – ${pv} pts`,
        answer:   catQs[idx]?.answer_en   ?? "—",
        answered: false,
      }));
    });
  } catch { return null; }
}

function buildBoardFromMock(categories: string[], questionsPerCat: number): BoardCell[][] {
  const pointValues = getPointValues(questionsPerCat);
  return categories.map((cat) => {
    const qs = MOCK_QUESTIONS[cat] ?? [];
    return pointValues.map((pv, idx) => ({
      category: cat, points: pv,
      question: qs[idx]?.question ?? `[Mock] ${cat} – question ${idx + 1}`,
      answer:   qs[idx]?.answer   ?? "—",
      answered: false,
    }));
  });
}

async function saveSession(name: string, mode: GameMode, categories: string[], teams: Team[], soloScore: number, questionsPerCat: number) {
  if (!isSupabaseConfigured) return;
  try {
    const { data: session } = await supabase.from("sessions").insert({
      name, game_mode: mode, category_names: categories,
      total_questions: categories.length * questionsPerCat,
      completed_at: new Date().toISOString(),
    }).select().single();
    if (session && mode === "team") {
      const sorted = [...teams].sort((a, b) => b.score - a.score);
      await supabase.from("teams").insert(
        sorted.map((t, i) => ({ session_id: session.id, name: t.name, score: t.score, rank: i + 1 }))
      );
    }
  } catch { /* silently skip if DB not ready */ }
}

// ─── No Coins Banner ──────────────────────────────────────────────────────────

function NoCoinsBanner({ coins, onDismiss }: { coins: number; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl pointer-events-auto"
        style={{ backgroundColor: "#1e1530", border: "1px solid #d4860a", maxWidth: 480 }}>
        <span className="text-2xl">🪙</span>
        <p className="text-sm flex-1" style={{ color: "#e8d5a0" }}>
          {coins === 0
            ? <>You have <strong style={{ color: "#d4860a" }}>0 coins</strong>. Buy some from{" "}<Link href="/buy" className="font-bold underline" style={{ color: "#d4860a" }}>here</Link>.</>
            : <>Not enough coins to select more. You have <strong style={{ color: "#d4860a" }}>{coins}</strong> coin{coins === 1 ? "" : "s"} — each category costs 1.</>
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

// ─── Category Select ──────────────────────────────────────────────────────────

function CategorySelect({ selected, coins, categories, onToggle, onShowNoBanner, onNext }:
  { selected: string[]; coins: number; categories: string[]; onToggle: (c: string) => void; onShowNoBanner: () => void; onNext: () => void }) {
  const questionsPerCat = QUESTIONS_PER_CATEGORY[selected.length] ?? 6;

  const handleClick = (cat: string) => {
    if (selected.includes(cat)) { onToggle(cat); return; }
    if (coins <= selected.length) { onShowNoBanner(); return; }
    onToggle(cat);
  };

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step="categories" />
      <div className="text-center">
        <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>Pick Your Categories</h2>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>
          Choose 1–6 categories · {selected.length}/6 selected · <span style={{ color: "#d4860a" }}>🪙 {coins} coins</span>
          {selected.length > 0 && <span style={{ color: "#d4860a" }}> · {questionsPerCat} questions each</span>}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((cat) => {
          const isSelected = selected.includes(cat);
          const disabled   = !isSelected && selected.length >= 6;
          return (
            <button key={cat} onClick={() => !disabled && handleClick(cat)}
              className="px-4 py-4 rounded-2xl text-sm font-semibold text-left transition-all"
              style={{ backgroundColor: isSelected ? "#d4860a22" : "#1e1530", border: `2px solid ${isSelected ? "#d4860a" : "#2e2050"}`, color: isSelected ? "#d4860a" : disabled ? "#e8d5a033" : "#e8d5a0", cursor: disabled ? "not-allowed" : "pointer" }}>
              {isSelected && <span className="mr-2">✓</span>}{cat}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button onClick={onNext} disabled={selected.length === 0}
          className="px-8 py-3 rounded-full font-bold text-sm"
          style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: selected.length === 0 ? 0.4 : 1, cursor: selected.length === 0 ? "not-allowed" : "pointer" }}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Game Mode Select ─────────────────────────────────────────────────────────

function GameModeSelect({ gameMode, teamCount, teamNames, onModeChange, onTeamCountChange, onTeamNameChange, onBack, onNext }:
  { gameMode: GameMode; teamCount: number; teamNames: string[]; onModeChange: (m: GameMode) => void; onTeamCountChange: (n: number) => void; onTeamNameChange: (i: number, v: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step="gameMode" />
      <div className="text-center">
        <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>Game Mode</h2>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>How will you play?</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {(["solo", "team"] as GameMode[]).map((mode) => (
          <button key={mode} onClick={() => onModeChange(mode)}
            className="py-8 rounded-2xl flex flex-col items-center gap-3 transition-all"
            style={{ backgroundColor: gameMode === mode ? "#d4860a22" : "#1e1530", border: `2px solid ${gameMode === mode ? "#d4860a" : "#2e2050"}` }}>
            <span className="text-4xl">{mode === "solo" ? "👤" : "👥"}</span>
            <span className="font-bold capitalize" style={{ color: gameMode === mode ? "#d4860a" : "#e8d5a0" }}>{mode === "solo" ? "Solo" : "Team"}</span>
            <span className="text-xs" style={{ color: "#e8d5a0", opacity: 0.55 }}>{mode === "solo" ? "Play by yourself" : "Up to 6 teams"}</span>
          </button>
        ))}
      </div>
      {gameMode === "team" && (
        <div className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Number of Teams: <span style={{ color: "#d4860a" }}>{teamCount}</span></label>
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
                <label className="text-xs font-medium" style={{ color: "#e8d5a0", opacity: 0.6 }}>Team {i + 1}</label>
                <input type="text" value={teamNames[i] ?? `Team ${i + 1}`} onChange={(e) => onTeamNameChange(i, e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0" }} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-between mt-2">
        <button onClick={onBack} className="px-6 py-3 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>← Back</button>
        <button onClick={onNext} className="px-8 py-3 rounded-full font-bold text-sm hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>Next →</button>
      </div>
    </div>
  );
}

// ─── Session Setup ────────────────────────────────────────────────────────────

function SessionSetup({ sessionName, onChange, onBack, onStart, loading, error }:
  { sessionName: string; onChange: (v: string) => void; onBack: () => void; onStart: () => void; loading: boolean; error?: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step="session" />
      <div className="text-center">
        <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>Name Your Session</h2>
        <p className="text-sm mt-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>Give this game session a name</p>
      </div>
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-center" style={{ backgroundColor: "#dc262622", border: "1px solid #dc262644", color: "#f87171" }}>
          {error}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: "#e8d5a0" }}>Session Name</label>
        <input type="text" placeholder="e.g. Friday Night Trivia" value={sessionName} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sessionName.trim() && onStart()}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ backgroundColor: "#120d1f", border: "1px solid #2e2050", color: "#e8d5a0", fontSize: "16px" }} autoFocus />
      </div>
      <div className="flex justify-between mt-4">
        <button onClick={onBack} className="px-6 py-3 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>← Back</button>
        <button onClick={onStart} disabled={!sessionName.trim() || loading}
          className="px-8 py-3 rounded-full font-bold text-sm transition-opacity"
          style={{ backgroundColor: "#d4860a", color: "#120d1f", opacity: !sessionName.trim() || loading ? 0.4 : 1, cursor: !sessionName.trim() ? "not-allowed" : "pointer" }}>
          {loading ? "Loading questions…" : "Start Game 🚀"}
        </button>
      </div>
    </div>
  );
}

// ─── Game Board ───────────────────────────────────────────────────────────────

function GameBoard({ board, teams, gameMode, sessionName, onSelectCell, onEndGame }:
  { board: BoardCell[][]; teams: Team[]; gameMode: GameMode; sessionName: string; onSelectCell: (c: BoardCell) => void; onEndGame: () => void }) {
  const answered = board.flat().filter((c) => c.answered).length;
  const total    = board.flat().length;
  const rows     = board[0]?.length ?? 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: "#e8d5a0" }}>{sessionName}</h2>
          <p className="text-xs mt-0.5" style={{ color: "#e8d5a0", opacity: 0.5 }}>{answered}/{total} answered</p>
        </div>
        <button onClick={onEndGame} className="px-4 py-2 rounded-full text-xs font-bold"
          style={{ backgroundColor: "#7c3aed22", border: "1px solid #7c3aed", color: "#a78bfa" }}>
          End Game
        </button>
      </div>
      {gameMode === "team" && teams.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[...teams].sort((a, b) => b.score - a.score).map((team) => (
            <div key={team.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
              <span className="text-xs font-medium" style={{ color: "#e8d5a0" }}>{team.name}</span>
              <span className="text-xs font-bold" style={{ color: "#d4860a" }}>{team.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-auto max-h-[70vh]">
        <div className="min-w-max">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${board.length}, minmax(85px, 1fr))` }}>
            {board.map((col) => (
              <div key={col[0].category} className="px-3 py-3 rounded-xl text-center text-xs font-bold uppercase tracking-wide"
                style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>
                {col[0].category}
              </div>
            ))}
          </div>
          {Array.from({ length: rows }, (_, rowIdx) => (
            <div key={rowIdx} className="grid gap-1.5 mt-1.5"
              style={{ gridTemplateColumns: `repeat(${board.length}, minmax(85px, 1fr))` }}>
              {board.map((col) => {
                const cell = col[rowIdx];
                return (
                  <button key={`${cell.category}-${cell.points}`}
                    onClick={() => !cell.answered && onSelectCell(cell)}
                    className="py-3 md:py-5 rounded-xl text-center font-extrabold text-sm md:text-base transition-all"
                    style={{ backgroundColor: cell.answered ? "#1e153088" : "#1e1530", border: `1px solid ${cell.answered ? "#2e205044" : "#2e2050"}`, color: cell.answered ? "#2e205066" : "#d4860a", cursor: cell.answered ? "default" : "pointer" }}>
                    {cell.answered ? "—" : cell.points.toLocaleString()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Question View ────────────────────────────────────────────────────────────

function QuestionView({ cell, onReveal }: { cell: BoardCell; onReveal: () => void }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [expired,  setExpired]  = useState(false);
  useEffect(() => {
    if (timeLeft <= 0) { setExpired(true); return; }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);
  const timerColor = timeLeft > 20 ? "#d4860a" : timeLeft > 10 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>{cell.category}</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>{cell.points.toLocaleString()} pts</span>
      </div>
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#2e2050" }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${(timeLeft / 60) * 100}%`, backgroundColor: timerColor }} />
        </div>
        <span className="text-3xl font-extrabold tabular-nums" style={{ color: expired ? "#ef4444" : timerColor }}>{expired ? "⏰ Time!" : `${timeLeft}s`}</span>
      </div>
      <div className="w-full rounded-2xl p-8" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
        <p className="text-xl md:text-2xl font-bold leading-snug" style={{ color: "#e8d5a0" }}>{cell.question}</p>
      </div>
      <button onClick={onReveal} className="px-10 py-3 rounded-full font-bold text-sm hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>Reveal Answer</button>
    </div>
  );
}

// ─── Answer Reveal ────────────────────────────────────────────────────────────

function AnswerReveal({ cell, teams, gameMode, onAward, onNoOne }:
  { cell: BoardCell; teams: Team[]; gameMode: GameMode; onAward: (id: number | null) => void; onNoOne: () => void }) {
  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44" }}>{cell.category}</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#d4860a22", color: "#d4860a", border: "1px solid #d4860a44" }}>{cell.points.toLocaleString()} pts</span>
      </div>
      <div className="w-full rounded-2xl p-6" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
        <p className="text-sm mb-4" style={{ color: "#e8d5a0", opacity: 0.55 }}>The question was:</p>
        <p className="text-base italic mb-6" style={{ color: "#e8d5a0", opacity: 0.8 }}>{cell.question}</p>
        <div className="h-px mb-6" style={{ backgroundColor: "#2e2050" }} />
        <p className="text-sm mb-2 font-bold" style={{ color: "#d4860a" }}>✓ Correct Answer</p>
        <p className="text-2xl font-extrabold" style={{ color: "#e8d5a0" }}>{cell.answer}</p>
      </div>
      {gameMode === "team" ? (
        <div className="w-full flex flex-col gap-3">
          <p className="text-sm font-medium" style={{ color: "#e8d5a0", opacity: 0.7 }}>Who answered correctly?</p>
          <div className="grid grid-cols-2 gap-2">
            {teams.map((team) => (
              <button key={team.id} onClick={() => onAward(team.id)} className="py-3 px-4 rounded-xl font-bold text-sm hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>{team.name}</button>
            ))}
          </div>
          <button onClick={onNoOne} className="w-full py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.7 }}>Nobody got it</button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button onClick={() => onAward(null)} className="px-8 py-3 rounded-full font-bold text-sm" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>✓ I got it! (+{cell.points})</button>
          <button onClick={onNoOne} className="px-8 py-3 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0", opacity: 0.7 }}>Missed it</button>
        </div>
      )}
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function ResultsScreen({ teams, gameMode, soloScore, sessionName, onPlayAgain }:
  { teams: Team[]; gameMode: GameMode; soloScore: number; sessionName: string; onPlayAgain: () => void }) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div className="text-5xl">🏆</div>
      <h2 className="text-3xl font-extrabold" style={{ color: "#e8d5a0" }}>Game Over!</h2>
      <p className="text-sm" style={{ color: "#e8d5a0", opacity: 0.6 }}>Session: {sessionName}</p>
      {gameMode === "solo" ? (
        <div className="rounded-2xl p-8 w-full" style={{ backgroundColor: "#1e1530", border: "1px solid #2e2050" }}>
          <p className="text-sm mb-2" style={{ color: "#e8d5a0", opacity: 0.6 }}>Your Final Score</p>
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
        <button onClick={onPlayAgain} className="px-8 py-3 rounded-full font-bold text-sm hover:opacity-90" style={{ backgroundColor: "#d4860a", color: "#120d1f" }}>Play Again</button>
        <Link href="/" className="px-8 py-3 rounded-full text-sm font-medium" style={{ border: "1px solid #2e2050", color: "#e8d5a0" }}>Home</Link>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ArenaGame() {
  const router = useRouter();

  const [ready,       setReady]       = useState(false);
  const [coins,       setCoins]       = useState(0);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [showBanner,  setShowBanner]  = useState(false);
  const [gameError,   setGameError]   = useState<string | null>(null);
  const [liveCategories, setLiveCategories] = useState<string[]>(ALL_CATEGORIES);

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

  // ── Auth + purchase check ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) { setReady(true); setCoins(999); return; }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login?next=/arena");
        return;
      }
      setUserId(session.user.id);

      const [profileResult, catsResult] = await Promise.all([
        supabase.from("profiles").select("category_coins").eq("id", session.user.id).maybeSingle(),
        supabase.from("categories").select("name_en").eq("active", true).order("name_en"),
      ]);
      setCoins(profileResult.data?.category_coins ?? 0);
      if (catsResult.data && catsResult.data.length > 0) {
        setLiveCategories(catsResult.data.map((c) => c.name_en));
      }
      setReady(true);
    });
  }, [router]);

  const toggleCategory = useCallback((cat: string) => {
    setSelected((p) => p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]);
  }, []);

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
    const dbBoard  = await fetchBoardFromSupabase(selectedCategories, questionsPerCat);
    const builtBoard = dbBoard ?? buildBoardFromMock(selectedCategories, questionsPerCat);
    setBoard(builtBoard);
    setTeams(Array.from({ length: teamCount }, (_, i) => ({ id: i, name: teamNames[i] || `Team ${i + 1}`, score: 0 })));
    setSoloScore(0);
    setSessionSaved(false);
    setLoadingGame(false);
    setStep("board");
  };

  const handleEndGame = useCallback(async (finalTeams: Team[], finalSoloScore: number) => {
    if (!sessionSaved) {
      setSessionSaved(true);
      const questionsPerCat = QUESTIONS_PER_CATEGORY[selectedCategories.length] ?? 6;
      await saveSession(sessionName, gameMode, selectedCategories, finalTeams, finalSoloScore, questionsPerCat);
    }
    setStep("results");
  }, [sessionSaved, sessionName, gameMode, selectedCategories]);

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
    if (newBoard.flat().every((c) => c.answered)) { handleEndGame(newTeams, newSolo); } else { setStep("board"); }
  };

  const handleNoOne = () => {
    if (!currentCell) return;
    const newBoard = board.map((col) => col.map((c) => c.category === currentCell.category && c.points === currentCell.points ? { ...c, answered: true } : c));
    setBoard(newBoard);
    setCurrentCell(null);
    if (newBoard.flat().every((c) => c.answered)) { handleEndGame(teams, soloScore); } else { setStep("board"); }
  };

  const handlePlayAgain = () => {
    setStep("categories"); setSelected([]); setSessionName("");
    setBoard([]); setCurrentCell(null); setSoloScore(0); setSessionSaved(false);
  };

  // Show spinner while auth check runs
  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "#d4860a", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {showBanner && <NoCoinsBanner coins={coins} onDismiss={() => setShowBanner(false)} />}

      {step === "categories" && (
        <CategorySelect
          selected={selectedCategories}
          coins={coins}
          categories={liveCategories}
          onToggle={toggleCategory}
          onShowNoBanner={() => setShowBanner(true)}
          onNext={() => setStep("gameMode")}
        />
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
          onSelectCell={handleSelectCell} onEndGame={() => handleEndGame(teams, soloScore)} />
      )}
      {step === "question" && currentCell && <QuestionView cell={currentCell} onReveal={handleReveal} />}
      {step === "answer"   && currentCell && <AnswerReveal cell={currentCell} teams={teams} gameMode={gameMode} onAward={handleAward} onNoOne={handleNoOne} />}
      {step === "results"  && <ResultsScreen teams={teams} gameMode={gameMode} soloScore={soloScore} sessionName={sessionName} onPlayAgain={handlePlayAgain} />}
    </div>
  );
}
