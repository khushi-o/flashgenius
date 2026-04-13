import { requireSessionUser } from "@/lib/api/route-auth";
import { maxNewCardsInQueue, maxReviewSessionSize } from "@/lib/constants/study";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/study/queue?deck_id=<uuid optional>
 * Returns cards due for review (next_review_at <= now or null for new), capped for one session.
 */
export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const url = new URL(request.url);
  const deckId = url.searchParams.get("deck_id")?.trim() || "";
  const nowIso = new Date().toISOString();
  const sessionCap = maxReviewSessionSize();
  const newCap = Math.min(maxNewCardsInQueue(), Math.ceil(sessionCap / 2));
  const dueCap = Math.max(1, sessionCap - newCap);

  let newQuery = supabase
    .from("cards")
    .select(
      "id, deck_id, front, back, card_type, ease_factor, interval_days, repetitions, next_review_at",
    )
    .eq("user_id", user.id)
    .is("next_review_at", null)
    .order("created_at", { ascending: true })
    .limit(newCap);

  let dueQuery = supabase
    .from("cards")
    .select(
      "id, deck_id, front, back, card_type, ease_factor, interval_days, repetitions, next_review_at",
    )
    .eq("user_id", user.id)
    .not("next_review_at", "is", null)
    .lte("next_review_at", nowIso)
    .order("next_review_at", { ascending: true })
    .limit(dueCap);

  if (deckId) {
    newQuery = newQuery.eq("deck_id", deckId);
    dueQuery = dueQuery.eq("deck_id", deckId);
  }

  const [{ data: newRows, error: e1 }, { data: dueRows, error: e2 }] = await Promise.all([
    newQuery,
    dueQuery,
  ]);

  if (e1 || e2) {
    return NextResponse.json(
      { error: e1?.message ?? e2?.message ?? "Could not load queue." },
      { status: 500 },
    );
  }

  const seen = new Set<string>();
  const merged: NonNullable<typeof newRows> = [];
  for (const r of [...(dueRows ?? []), ...(newRows ?? [])]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
    if (merged.length >= sessionCap) break;
  }

  return NextResponse.json({
    cards: merged,
    count: merged.length,
  });
}
