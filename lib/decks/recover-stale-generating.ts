import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * After this age in `generating`, we assume the previous invocation died (e.g. Vercel ~60s gateway)
 * and allow reclaim. Default **80s** — well below the old 6m window that made every retry **409**
 * for minutes. Raise `STALE_GENERATING_MS` on Pro if a single run can legitimately exceed this.
 */
export function staleGeneratingThresholdMs(): number {
  const raw = process.env.STALE_GENERATING_MS?.trim();
  if (raw === "" || raw == null) return 80_000;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 45_000) return 80_000;
  return Math.min(n, 60 * 60 * 1000);
}

export type DeckRecoveryRow = {
  id: string;
  status: string;
  updated_at: string | null;
  generation_error?: string | null;
};

/**
 * Resets stuck `generating` decks to `ready` so the user can run Generate again.
 * Mutates the given rows' `status` and `generation_error` for the current response.
 */
export async function recoverStaleGeneratingDecks(
  supabase: SupabaseClient,
  userId: string,
  decks: DeckRecoveryRow[],
): Promise<void> {
  const now = Date.now();
  for (const d of decks) {
    if (d.status !== "generating" || !d.updated_at) continue;
    const t = new Date(d.updated_at).getTime();
    if (!Number.isFinite(t) || now - t <= staleGeneratingThresholdMs()) continue;

    const { error } = await supabase
      .from("decks")
      .update({
        status: "ready",
        generation_error: null,
      })
      .eq("id", d.id)
      .eq("user_id", userId);

    if (error) {
      console.warn("[recoverStaleGeneratingDecks]", d.id, error.message);
      continue;
    }
    d.status = "ready";
    d.generation_error = null;
  }
}

export function isGeneratingStale(updatedAtIso: string | null | undefined): boolean {
  if (!updatedAtIso) return false;
  const t = new Date(updatedAtIso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t > staleGeneratingThresholdMs();
}
