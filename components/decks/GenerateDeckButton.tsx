"use client";

import { deckRowNeutralActionClassName } from "@/components/library/deck-row-action-classes";
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
}: {
  deckId: string;
  status: string;
  /** Compact label for deck cards (e.g. “Generate”). */
  labelShort?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!GENERATABLE.has(status)) {
    return null;
  }

  const serverBusy = status === "generating";
  const showWorking = busy || serverBusy;

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/decks/${deckId}/generate`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await parseJson(res);
      setBusy(false);
      if (!res.ok) {
        const base =
          typeof data.error === "string" ? data.error : "Generation failed.";
        const detail =
          typeof data.detail === "string" && data.detail.trim()
            ? ` ${res.status}: ${data.detail.trim().slice(0, 240)}`
            : res.status >= 500
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
