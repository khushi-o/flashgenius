"use client";

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
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading your queue…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
        <button
          type="button"
          className="mt-4 text-sm text-sky-400 hover:underline"
          onClick={() => void loadQueue()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (finishedSession) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-medium text-zinc-100">Session complete.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Nice work. Cards you graded are rescheduled with SM-2. Come back when more are due.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void loadQueue()}
            className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Refresh queue
          </button>
          <Link
            href="/decks"
            className="rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Library
          </Link>
        </div>
      </div>
    );
  }

  if (!queue.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-medium text-zinc-100">Nothing in this queue right now.</p>
        <p className="mt-2 text-sm text-zinc-500">
          {deckId
            ? "No new or due cards in this deck. Try the full study queue, or generate more cards."
            : "No due or new cards across your library. Generate cards or check back later."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void loadQueue()}
            className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Refresh queue
          </button>
          {!deckId ? null : (
            <Link
              href="/study"
              className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              All decks
            </Link>
          )}
          <Link
            href="/decks"
            className="rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3 text-xs text-zinc-500">
        <span>
          Card {index + 1} of {queue.length}
        </span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-400">
          {current?.card_type}
        </span>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl shadow-black/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {revealed ? "Answer" : "Question"}
        </p>
        <p className="mt-2 min-h-[4rem] text-lg leading-snug text-zinc-100">
          {revealed ? current!.back : current!.front}
        </p>
        <button
          type="button"
          className="mt-6 w-full rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-sky-300 hover:bg-zinc-800/80"
          onClick={() => setRevealed((r) => !r)}
        >
          {revealed ? "Hide answer (Space)" : "Show answer (Space / Enter)"}
        </button>
      </div>

      {msg ? (
        <p className="mt-4 text-center text-sm text-red-300" role="alert">
          {msg}
        </p>
      ) : null}

      {revealed ? (
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["again", "Again", "1 / J", "border-red-900/60 bg-red-950/50 text-red-100"],
              ["hard", "Hard", "2 / K", "border-amber-800/60 bg-amber-950/40 text-amber-100"],
              ["good", "Good", "3 / L", "border-emerald-900/60 bg-emerald-950/40 text-emerald-100"],
              ["easy", "Easy", "4 / ;", "border-sky-800/60 bg-sky-950/40 text-sky-100"],
            ] as const
          ).map(([grade, label, keys, cls]) => (
            <button
              key={grade}
              type="button"
              disabled={busyGrade}
              onClick={() => void submitGrade(grade)}
              className={`rounded-xl border px-2 py-3 text-center text-sm font-semibold transition-opacity disabled:opacity-50 ${cls}`}
            >
              <span className="block">{label}</span>
              <span className="mt-1 block text-[10px] font-normal opacity-80">{keys}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-center text-xs text-zinc-600">
          Reveal the answer to grade with keys <kbd className="rounded bg-zinc-800 px-1">1–4</kbd> or{" "}
          <kbd className="rounded bg-zinc-800 px-1">J K L ;</kbd>
        </p>
      )}

      <p className="mt-10 text-center text-xs text-zinc-600">
        <Link href="/decks" className="text-sky-500 hover:underline">
          Library
        </Link>
        {deckId ? (
          <>
            {" · "}
            <Link href={`/decks/${deckId}`} className="text-sky-500 hover:underline">
              Deck
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
