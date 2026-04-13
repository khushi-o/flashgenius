"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteDeckButton({
  deckId,
  deckTitle,
  compact,
  variant,
}: {
  deckId: string;
  deckTitle: string;
  compact?: boolean;
  /** Outlined control matching library deck row. */
  variant?: "outline";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function runDelete() {
    const ok = window.confirm(
      `Delete “${deckTitle}”? This removes cards, page text, and the stored PDF. This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(j.error ?? "Could not delete deck.");
        return;
      }
      router.push("/decks");
      router.refresh();
    } catch {
      window.alert("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const className =
    variant === "outline"
      ? "tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-red-900/45 bg-transparent px-4 py-2.5 text-xs font-semibold text-red-200/95 transition-[background-color,border-color,color] duration-150 hover:bg-red-950/35 active:bg-red-950/50 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
      : compact
        ? "tap-scale inline-flex min-h-10 items-center justify-center rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-[11px] font-semibold text-red-200 transition-colors duration-150 hover:bg-red-900/50 active:bg-red-900/60 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
        : "tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-2.5 text-sm font-semibold text-red-100 transition-colors duration-150 hover:bg-red-900/50 active:bg-red-900/60 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]";

  return (
    <button type="button" onClick={() => void runDelete()} disabled={busy} className={className}>
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
