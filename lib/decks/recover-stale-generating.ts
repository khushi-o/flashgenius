import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * If the serverless function is killed (Vercel timeout) after setting `generating`,
 * the deck never returns to `ready`/`error`. Anything older than this is treated as abandoned.
 * Keep above `maxDuration` on `/api/decks/[id]/generate` (300s) with margin.
 */
export const STALE_GENERATING_MS = 6 * 60 * 1000;

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
    if (!Number.isFinite(t) || now - t <= STALE_GENERATING_MS) continue;

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
  return Date.now() - t > STALE_GENERATING_MS;
}
