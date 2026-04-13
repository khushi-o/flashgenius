"use client";

import { DeckCardFlip } from "@/components/decks/DeckCardFlip";
import { CARD_TYPES } from "@/lib/generation/types";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type Props = {
  deckId: string;
  cardId: string;
  index: number;
  cardType: string;
  difficulty: number;
  front: string;
  back: string;
};

export function DeckCardRow({ deckId, cardId, index, cardType, difficulty, front, back }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draftFront, setDraftFront] = useState(front);
  const [draftBack, setDraftBack] = useState(back);
  const [draftDiff, setDraftDiff] = useState(difficulty);
  const [draftType, setDraftType] = useState(cardType);

  const resetDraft = useCallback(() => {
    setDraftFront(front);
    setDraftBack(back);
    setDraftDiff(difficulty);
    setDraftType(cardType);
    setErr(null);
  }, [front, back, difficulty, cardType]);

  const onSave = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/decks/${encodeURIComponent(deckId)}/cards/${encodeURIComponent(cardId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: draftFront,
          back: draftBack,
          difficulty: draftDiff,
          card_type: draftType,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: string[];
        detail?: string;
      };
      if (!res.ok) {
        const msg =
          Array.isArray(data.errors) && data.errors.length
            ? data.errors.join(" ")
            : typeof data.error === "string"
              ? data.error
              : "Could not save.";
        setErr(msg);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }, [deckId, cardId, draftFront, draftBack, draftDiff, draftType, router]);

  const onDelete = useCallback(async () => {
    if (!window.confirm("Delete this card permanently?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/decks/${encodeURIComponent(deckId)}/cards/${encodeURIComponent(cardId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(typeof data.error === "string" ? data.error : "Could not delete.");
        return;
      }
      router.refresh();
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }, [deckId, cardId, router]);

  return (
    <div className="space-y-3">
      <DeckCardFlip
        index={index}
        cardType={cardType}
        difficulty={difficulty}
        front={front}
        back={back}
        actions={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                if (editing) {
                  setEditing(false);
                  resetDraft();
                } else {
                  resetDraft();
                  setEditing(true);
                }
              }}
              className="tap-scale inline-flex min-h-9 items-center justify-center rounded-md border border-zinc-600/80 bg-zinc-800/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-200 hover:bg-zinc-700/70 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
            >
              {editing ? "Close" : "Edit"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                void onDelete();
              }}
              className="tap-scale inline-flex min-h-9 items-center justify-center rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-red-200 hover:bg-red-900/50 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
            >
              Delete
            </button>
          </>
        }
      />

      {editing ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-400">
              Type
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              >
                {CARD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-400">
              Difficulty (1–3)
              <select
                value={String(draftDiff)}
                onChange={(e) => setDraftDiff(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </label>
          </div>
          <label className="mt-3 block text-xs font-medium text-zinc-400">
            Front
            <textarea
              value={draftFront}
              onChange={(e) => setDraftFront(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-zinc-400">
            Back
            <textarea
              value={draftBack}
              onChange={(e) => setDraftBack(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          {err ? (
            <p className="mt-2 text-sm text-red-300" role="alert">
              {err}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSave()}
              className="tap-scale inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-r from-p-sage to-p-sage-muted px-5 py-2.5 text-sm font-semibold text-p-navy hover:brightness-105 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                resetDraft();
              }}
              className="tap-scale inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800/60 [-webkit-tap-highlight-color:transparent]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
