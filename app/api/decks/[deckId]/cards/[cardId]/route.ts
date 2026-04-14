import { requireSessionUser } from "@/lib/api/route-auth";
import { CARD_TYPES, type CardType, type RawCard } from "@/lib/generation/types";
import { validateCard } from "@/lib/generation/validator";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CARD_TYPE_SET = new Set<string>(CARD_TYPES);

type Ctx = { params: Promise<{ deckId: string; cardId: string }> };

type CardRow = {
  id: string;
  deck_id: string;
  user_id: string;
  card_type: string;
  front: string;
  back: string;
  difficulty: number;
  importance: number | null;
};

function clampDifficulty(n: number): number {
  return Math.min(3, Math.max(1, Math.round(n)));
}

function parseImportance(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const r = Math.round(v);
  if (r < 1 || r > 3) return undefined;
  return r;
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { deckId, cardId } = await ctx.params;
  const did = typeof deckId === "string" ? deckId.trim() : "";
  const cid = typeof cardId === "string" ? cardId.trim() : "";
  if (!did || !cid) {
    return NextResponse.json({ error: "Invalid deck or card id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { supabase, user } = auth;

  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("id, tone_preset")
    .eq("id", did)
    .eq("user_id", user.id)
    .maybeSingle();

  if (deckErr || !deck) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("id, deck_id, user_id, card_type, front, back, difficulty, importance")
    .eq("id", cid)
    .eq("deck_id", did)
    .eq("user_id", user.id)
    .maybeSingle();

  if (cardErr || !card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const row = card as CardRow;
  let nextType = row.card_type;
  if (body.card_type !== undefined) {
    if (typeof body.card_type !== "string" || !CARD_TYPE_SET.has(body.card_type)) {
      return NextResponse.json({ error: "Invalid card_type." }, { status: 400 });
    }
    nextType = body.card_type;
  }

  const nextFront =
    typeof body.front === "string" ? body.front : row.front;
  const nextBack = typeof body.back === "string" ? body.back : row.back;

  let nextDifficulty = row.difficulty;
  if (body.difficulty !== undefined) {
    if (typeof body.difficulty !== "number" || !Number.isFinite(body.difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 });
    }
    nextDifficulty = clampDifficulty(body.difficulty);
  }

  let nextImportance = row.importance;
  if ("importance" in body) {
    const imp = parseImportance(body.importance);
    if (imp === undefined && body.importance !== undefined && body.importance !== null) {
      return NextResponse.json({ error: "Invalid importance (use 1–3 or null)." }, { status: 400 });
    }
    if (imp !== undefined) nextImportance = imp;
    else if (body.importance === null) nextImportance = null;
  }

  const raw: RawCard = {
    card_type: nextType,
    front: nextFront,
    back: nextBack,
    difficulty: nextDifficulty,
    importance: nextImportance,
  };

  const tone = typeof deck.tone_preset === "string" ? deck.tone_preset : "exam-crisp";
  const patchTextUnchanged =
    nextFront.trim() === row.front.trim() &&
    nextBack.trim() === row.back.trim() &&
    nextType === row.card_type;
  const validation = validateCard(raw, tone, { patchTextUnchanged });
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed.", errors: validation.errors },
      { status: 422 },
    );
  }

  const { data: updated, error: upErr } = await supabase
    .from("cards")
    .update({
      card_type: nextType as CardType,
      front: nextFront.trim(),
      back: nextBack.trim(),
      difficulty: nextDifficulty,
      importance: nextImportance,
    })
    .eq("id", cid)
    .eq("deck_id", did)
    .eq("user_id", user.id)
    .select("id, card_type, front, back, difficulty, importance, updated_at")
    .maybeSingle();

  if (upErr || !updated) {
    return NextResponse.json({ error: "Could not update card." }, { status: 500 });
  }

  return NextResponse.json({ card: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { deckId, cardId } = await ctx.params;
  const did = typeof deckId === "string" ? deckId.trim() : "";
  const cid = typeof cardId === "string" ? cardId.trim() : "";
  if (!did || !cid) {
    return NextResponse.json({ error: "Invalid deck or card id." }, { status: 400 });
  }

  const { supabase, user } = auth;

  const { data: existing, error: findErr } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cid)
    .eq("deck_id", did)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findErr || !existing) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const { error: delErr } = await supabase
    .from("cards")
    .delete()
    .eq("id", cid)
    .eq("deck_id", did)
    .eq("user_id", user.id);

  if (delErr) {
    return NextResponse.json({ error: "Could not delete card." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
