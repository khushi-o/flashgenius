"use client";

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
}: {
  deckId: string;
  status: string;
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
        setMsg(
          typeof data.error === "string" ? data.error : "Generation failed.",
        );
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

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={showWorking}
        className="shrink-0 rounded-lg border border-violet-500/50 bg-violet-950/60 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-900/60 disabled:opacity-50"
      >
        {showWorking ? "Generating…" : "Generate cards"}
      </button>
      {msg ? (
        <span className="max-w-[min(100%,280px)] text-right text-[11px] leading-snug text-zinc-400 break-words">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
