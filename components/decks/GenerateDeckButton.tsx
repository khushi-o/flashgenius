"use client";

import { deckRowNeutralActionClassName } from "@/components/library/deck-row-action-classes";
import { isGeneratingStale } from "@/lib/decks/recover-stale-generating";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GENERATABLE = new Set(["ready", "error", "generating"]);

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: `Server returned ${res.status} (non-JSON).` };
  }
}

export function GenerateDeckButton({
  deckId,
  status,
  labelShort,
  existingCardCount = 0,
  deckUpdatedAt,
}: {
  deckId: string;
  status: string;
  /** Compact label for deck cards (e.g. “Generate”). */
  labelShort?: boolean;
  /** From `deck.card_count` / library row — used to confirm regeneration and send `force`. */
  existingCardCount?: number;
  /** `decks.updated_at` — if “generating” is older than the stale window, allow retry. */
  deckUpdatedAt?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!GENERATABLE.has(status)) {
    return null;
  }

  const serverBusy = status === "generating" && !isGeneratingStale(deckUpdatedAt);
  const showWorking = busy || serverBusy;

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const count = Math.max(0, Math.floor(existingCardCount));
      if (count > 0) {
        const ok = window.confirm(
          `This deck already has ${count} cards. Regenerating will replace them and use AI quota. Continue?`,
        );
        if (!ok) {
          setBusy(false);
          return;
        }
      }

      const res = await fetch(`/api/decks/${deckId}/generate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: count > 0 }),
      });
      const data = await parseJson(res);
      setBusy(false);
      if (res.ok && data.skipped === true) {
        setMsg(
          typeof data.message === "string"
            ? data.message
            : "Generation was skipped (deck already has cards).",
        );
        return;
      }
      if (!res.ok) {
        let base =
          typeof data.error === "string" ? data.error : "Generation failed.";
        if (res.status === 504) {
          base =
            "Generation timed out on the server (often Vercel’s limit while the model runs). Try again, use a smaller PDF, or lower GENERATION_MAX_CHUNKS in env.";
        }
        const detail =
          typeof data.detail === "string" && data.detail.trim()
            ? ` ${res.status}: ${data.detail.trim().slice(0, 240)}`
            : res.status >= 500 && res.status !== 504
              ? ` (HTTP ${res.status})`
              : "";
        setMsg(`${base}${detail}`.trim());
        return;
      }
      const inserted = typeof data.inserted === "number" ? data.inserted : 0;
      const skipped =
        typeof data.skipped_invalid === "number" ? data.skipped_invalid : 0;
      setMsg(
        `Added ${inserted} cards` + (skipped ? ` (${skipped} skipped)` : ""),
      );
      requestAnimationFrame(() => {
        router.refresh();
      });
    } catch {
      setBusy(false);
      setMsg("Network error.");
    }
  }

  const btnClass = labelShort
    ? `${deckRowNeutralActionClassName()} shrink-0 disabled:opacity-50`
    : "tap-scale inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-p-sage/45 bg-p-sage/15 px-4 py-2.5 text-xs font-semibold text-p-cream transition-[background-color,border-color,color] duration-150 hover:bg-p-sage/25 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]";

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={showWorking} className={btnClass}>
        {showWorking ? "Generating…" : labelShort ? "Generate" : "Generate cards"}
      </button>
      {msg ? (
        <span className="max-w-[min(100%,280px)] text-right text-[11px] leading-snug text-zinc-400 break-words">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
