import { requireSessionUser } from "@/lib/api/route-auth";
import { applySm2Update, gradeToSm2Quality, parseGrade } from "@/lib/sm2";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = { card_id?: string; grade?: string };

/**
 * POST /api/study/review
 * Body: { card_id: uuid, grade: "again" | "hard" | "good" | "easy" }
 */
export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
  if (!cardId) {
    return NextResponse.json({ error: "Missing card_id." }, { status: 400 });
  }

  const grade = parseGrade(body.grade);
  if (!grade) {
    return NextResponse.json(
      { error: 'Invalid grade. Use "again", "hard", "good", or "easy".' },
      { status: 400 },
    );
  }

  const { data: card, error: fetchErr } = await supabase
    .from("cards")
    .select("id, user_id, ease_factor, interval_days, repetitions")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const quality = gradeToSm2Quality(grade);
  const next = applySm2Update(
    {
      ease_factor: Number(card.ease_factor) || 2.5,
      interval_days: Number(card.interval_days) || 0,
      repetitions: Number(card.repetitions) || 0,
    },
    quality,
  );

  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setUTCDate(nextReview.getUTCDate() + Math.max(0, next.interval_days));

  const { error: upErr } = await supabase
    .from("cards")
    .update({
      ease_factor: next.ease_factor,
      interval_days: next.interval_days,
      repetitions: next.repetitions,
      next_review_at: nextReview.toISOString(),
      last_reviewed_at: now.toISOString(),
    })
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (upErr) {
    return NextResponse.json(
      { error: "Could not update card schedule." },
      { status: 500 },
    );
  }

  const { error: insErr } = await supabase.from("review_events").insert({
    card_id: cardId,
    user_id: user.id,
    grade,
    sm2_quality: quality,
  });

  if (insErr) {
    return NextResponse.json(
      { error: "Could not log review event." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    schedule: {
      ease_factor: next.ease_factor,
      interval_days: next.interval_days,
      repetitions: next.repetitions,
      next_review_at: nextReview.toISOString(),
    },
  });
}
