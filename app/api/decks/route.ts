import { requireSessionUser } from "@/lib/api/route-auth";
import {
  aggregateDeckStats,
  isDueForStudy,
  masteryPercent,
  type CardScheduleRow,
  type DeckCardStats,
} from "@/lib/library/card-buckets";
import { NextResponse } from "next/server";

const TONE_PRESETS = new Set(["exam-crisp", "deep-understanding", "quick-recall"]);

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;

function parseIntParam(v: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(v ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const limit = parseIntParam(
    searchParams.get("limit"),
    DEFAULT_PAGE_LIMIT,
    1,
    MAX_PAGE_LIMIT,
  );
  const offset = parseIntParam(searchParams.get("offset"), 0, 0, 1_000_000);

  const { supabase, user } = auth;

  const { count: total, error: countErr } = await supabase
    .from("decks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countErr) {
    return NextResponse.json({ error: "Could not list decks." }, { status: 500 });
  }

  const { data: decks, error: listErr } = await supabase
    .from("decks")
    .select(
      "id, title, status, card_count, tone_preset, generation_error, created_at, updated_at, last_studied_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (listErr) {
    return NextResponse.json({ error: "Could not list decks." }, { status: 500 });
  }

  const list = decks ?? [];
  const deckIds = list.map((d) => d.id);

  const emptyStats = (): DeckCardStats => ({ new: 0, learning: 0, mature: 0 });
  const aggregates: Record<
    string,
    DeckCardStats & { due_now: number; mastery_percent: number }
  > = {};

  for (const d of list) {
    aggregates[d.id] = { ...emptyStats(), due_now: 0, mastery_percent: 0 };
  }

  if (deckIds.length) {
    const { data: cardRows, error: cErr } = await supabase
      .from("cards")
      .select("deck_id, next_review_at, interval_days, repetitions")
      .eq("user_id", user.id)
      .in("deck_id", deckIds);

    if (cErr) {
      return NextResponse.json({ error: "Could not load card aggregates." }, { status: 500 });
    }

    const rows = (cardRows ?? []) as CardScheduleRow[];
    const byDeck = aggregateDeckStats(rows);
    const now = new Date();
    const dueByDeck = new Map<string, number>();
    for (const r of rows) {
      if (isDueForStudy(r, now)) {
        dueByDeck.set(r.deck_id, (dueByDeck.get(r.deck_id) ?? 0) + 1);
      }
    }
    for (const id of deckIds) {
      const s = byDeck.get(id) ?? emptyStats();
      aggregates[id] = {
        ...s,
        due_now: dueByDeck.get(id) ?? 0,
        mastery_percent: masteryPercent(s),
      };
    }
  }

  return NextResponse.json({
    decks: list.map((d) => ({
      ...d,
      aggregates: aggregates[d.id]!,
    })),
    total: total ?? 0,
    limit,
    offset,
  });
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  let body: { title?: string; tone_preset?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 1 || title.length > 200) {
    return NextResponse.json(
      { error: "Title must be between 1 and 200 characters." },
      { status: 400 },
    );
  }

  const tone =
    typeof body.tone_preset === "string" && TONE_PRESETS.has(body.tone_preset)
      ? body.tone_preset
      : "exam-crisp";

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      title,
      tone_preset: tone,
      status: "draft",
    })
    .select("id, title, tone_preset, status, card_count, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create deck." },
      { status: 500 },
    );
  }

  return NextResponse.json({ deck: data }, { status: 201 });
}
