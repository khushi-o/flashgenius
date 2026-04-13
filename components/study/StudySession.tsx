"use client";

import { BackToLibraryLink } from "@/components/ui/back-to-library-link";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Grade } from "@/lib/sm2";

type QueueCard = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  card_type: string;
};

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const t = await res.text();
  if (!t) return {};
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    return { error: `HTTP ${res.status}` };
  }
}

function formatCardType(raw: string) {
  const t = raw.trim();
  if (!t) return "Card";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function StudySession({ initialDeckId }: { initialDeckId: string | null }) {
  const router = useRouter();
  const [deckId] = useState(initialDeckId);
  const [queue, setQueue] = useState<QueueCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyGrade, setBusyGrade] = useState(false);
  const [finishedSession, setFinishedSession] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFinishedSession(false);
    setIndex(0);
    setRevealed(false);
    setMsg(null);
    try {
      const q = deckId ? `?deck_id=${encodeURIComponent(deckId)}` : "";
      const res = await fetch(`/api/study/queue${q}`, { credentials: "same-origin" });
      const data = await parseJson(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load queue.");
        setQueue([]);
        return;
      }
      const cards = data.cards as QueueCard[] | undefined;
      setQueue(Array.isArray(cards) ? cards : []);
    } catch {
      setError("Network error loading queue.");
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const current = queue[index] ?? null;

  const submitGrade = useCallback(
    async (grade: Grade) => {
      if (!current || busyGrade) return;
      setBusyGrade(true);
      setMsg(null);
      try {
        const res = await fetch("/api/study/review", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_id: current.id, grade }),
        });
        const data = await parseJson(res);
        if (!res.ok) {
          setMsg(typeof data.error === "string" ? data.error : "Review failed.");
          setBusyGrade(false);
          return;
        }
        setRevealed(false);
        if (index + 1 >= queue.length) {
          setFinishedSession(true);
          setQueue([]);
        } else {
          setIndex((i) => i + 1);
        }
        router.refresh();
      } catch {
        setMsg("Network error.");
      } finally {
        setBusyGrade(false);
      }
    },
    [busyGrade, current, index, queue.length, router],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (busyGrade || !current || loading) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const k = e.key;
      if (k === " " || k === "Enter") {
        e.preventDefault();
        setRevealed((r) => !r);
        return;
      }
      if (!revealed) return;
      let g: Grade | null = null;
      if (k === "1") g = "again";
      else if (k === "2") g = "hard";
      else if (k === "3") g = "good";
      else if (k === "4") g = "easy";
      else if (k === "j" || k === "J") g = "again";
      else if (k === "k" || k === "K") g = "hard";
      else if (k === "l" || k === "L") g = "good";
      else if (k === ";" || k === ":") g = "easy";
      if (g) {
        e.preventDefault();
        void submitGrade(g);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busyGrade, current, loading, revealed, submitGrade]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center text-sm text-p-sand-dim">
        Loading your queue…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-lg">
          <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
          <button
            type="button"
            className="tap-scale mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-p-sand/25 bg-p-navy-mid/80 px-5 py-2.5 text-sm font-medium text-p-sage-bright hover:bg-p-navy-mid hover:text-p-cream [-webkit-tap-highlight-color:transparent]"
            onClick={() => void loadQueue()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (finishedSession) {
    return (
      <div className="w-full px-4 py-16 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-lg">
          <p className="text-lg font-medium text-p-cream">Session complete.</p>
          <p className="mt-2 text-sm text-p-sand-dim">
            Nice work. Cards you graded are rescheduled with SM-2. Come back when more are due.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadQueue()}
              className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-p-sand/20 px-5 py-2.5 text-sm font-medium text-p-cream hover:bg-p-navy-mid [-webkit-tap-highlight-color:transparent]"
            >
              Refresh queue
            </button>
            <BackToLibraryLink variant="primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!queue.length) {
    return (
      <div className="w-full px-4 py-16 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-lg">
          <p className="text-lg font-medium text-p-cream">Nothing in this queue right now.</p>
          <p className="mt-2 text-sm text-p-sand-dim">
            {deckId
              ? "No new or due cards in this deck. Try the full study queue, or generate more cards."
              : "No due or new cards across your library. Generate cards or check back later."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadQueue()}
              className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-p-sand/20 px-5 py-2.5 text-sm font-medium text-p-cream hover:bg-p-navy-mid [-webkit-tap-highlight-color:transparent]"
            >
              Refresh queue
            </button>
            {!deckId ? null : (
              <Link
                href="/study"
                className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-p-sand/20 px-5 py-2.5 text-sm font-medium text-p-cream hover:bg-p-navy-mid [-webkit-tap-highlight-color:transparent]"
              >
                All decks
              </Link>
            )}
            <BackToLibraryLink variant="primary" />
          </div>
        </div>
      </div>
    );
  }

  const progressPct = queue.length ? Math.round(((index + 1) / queue.length) * 100) : 0;

  return (
    <div className="w-full px-4 pb-12 pt-2 sm:px-8 lg:px-12">
      <div className="mx-auto mb-8 h-0.5 w-full max-w-4xl overflow-hidden rounded-full bg-p-navy">
        <div
          className="h-full rounded-full bg-p-sage transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="flex min-h-[280px] flex-col rounded-2xl border border-p-sand/20 bg-p-navy-mid p-8 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-p-sage/35 bg-p-sage/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-p-sage-bright">
              {formatCardType(current!.card_type)}
            </span>
            <span className="text-sm text-p-sand-dim">
              Card {index + 1} of {queue.length}
            </span>
          </div>

          {!revealed ? (
            <div className="mt-6 flex min-h-0 flex-1 flex-col justify-center">
              <p className="text-xl font-medium leading-relaxed text-p-cream sm:text-2xl">
                {current!.front}
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col">
              <p className="text-xl font-medium leading-relaxed text-p-cream sm:text-2xl">
                {current!.front}
              </p>
              <div className="mt-6 border-t border-p-sand/15 pt-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-p-sand-dim">
                  Answer
                </p>
                <p className="text-lg leading-relaxed text-p-cream/95">{current!.back}</p>
              </div>
            </div>
          )}
        </div>

        {!revealed ? (
          <button
            type="button"
            className="tap-scale mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted py-3.5 text-sm font-semibold text-p-navy shadow-sm shadow-black/25 hover:brightness-105 sm:gap-2.5 [-webkit-tap-highlight-color:transparent]"
            onClick={() => setRevealed(true)}
          >
            <span>Show answer</span>
            <span className="font-normal text-p-navy/75">(Space / Enter)</span>
          </button>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["again", "Again", "J", "border-red-800/50 bg-red-950/60 text-red-300 hover:bg-red-900/60"],
                ["hard", "Hard", "K", "border-amber-700/50 bg-amber-950/60 text-amber-300 hover:bg-amber-900/60"],
                ["good", "Good", "L", "border-p-sand/25 bg-p-navy/70 text-p-cream hover:bg-p-navy-mid"],
                ["easy", "Easy", ";", "border-p-sage/45 bg-p-sage/20 text-p-sage-bright hover:bg-p-sage/30"],
              ] as const
            ).map(([grade, label, keyHint, cls]) => (
              <button
                key={grade}
                type="button"
                disabled={busyGrade}
                onClick={() => void submitGrade(grade)}
                className={`tap-scale flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border py-3 text-sm font-medium transition-colors disabled:opacity-50 [-webkit-tap-highlight-color:transparent] ${cls}`}
              >
                <span>{label}</span>
                <span className="text-[10px] font-normal text-p-sand-dim">{keyHint}</span>
              </button>
            ))}
          </div>
        )}

        {msg ? (
          <p className="mt-4 text-center text-sm text-red-300" role="alert">
            {msg}
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs text-p-sand-dim">
          Space / Enter to reveal · J K L ; to grade
        </p>

        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-xs text-p-sand-dim">
          <BackToLibraryLink />
          {deckId ? (
            <>
              <span className="select-none text-p-sand-dim/80" aria-hidden>
                ·
              </span>
              <Link
                href={`/decks/${deckId}`}
                className="tap-scale inline-flex min-h-11 items-center rounded-lg px-2 text-p-sage-bright transition-colors duration-150 hover:bg-p-sage/10 hover:text-p-cream [-webkit-tap-highlight-color:transparent]"
              >
                Deck
              </Link>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
