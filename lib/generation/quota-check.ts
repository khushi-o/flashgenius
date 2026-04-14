import type { SupabaseClient } from "@supabase/supabase-js";

function parseLimit(): number {
  const raw = process.env.DAILY_GENERATION_LIMIT?.trim();
  /** Unset = off so production deploys are not capped unless you opt in. */
  if (raw === "" || raw == null) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 500);
}

/**
 * Rough guardrail: counts `ready` decks with cards that were updated since local midnight
 * (upload-only decks with `card_count = 0` do not consume this budget).
 * Set `DAILY_GENERATION_LIMIT` to a positive number to enable (e.g. 3). Omit or `0` = disabled.
 */
export async function checkGenerationQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number; disabled: boolean }> {
  const limit = parseLimit();
  if (limit === 0) {
    return { allowed: true, used: 0, limit: 0, disabled: true };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("decks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ready")
    .gt("card_count", 0)
    .gte("updated_at", startOfDay.toISOString());

  if (error) {
    console.warn("[quota-check] decks count failed:", error.message);
    return { allowed: true, used: 0, limit, disabled: false };
  }

  const used = count ?? 0;
  return {
    allowed: used < limit,
    used,
    limit,
    disabled: false,
  };
}
