import { requireSessionUser } from "@/lib/api/route-auth";
import { checkGenerateRateLimit } from "@/lib/generation-rate-limit";
import { checkGenerationQuota } from "@/lib/generation/quota-check";
import { runDeckGeneration } from "@/lib/generation/run-deck-generation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ deckId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { deckId } = await ctx.params;
  const id = typeof deckId === "string" ? deckId.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Invalid deck id." }, { status: 400 });
  }

  const { supabase, user } = auth;

  let force = false;
  try {
    const body = (await request.json()) as { force?: boolean };
    force = Boolean(body?.force);
  } catch {
    /* empty or non-JSON body */
  }

  if (!force) {
    const { count, error: cErr } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("deck_id", id)
      .eq("user_id", user.id);

    if (cErr) {
      return NextResponse.json({ error: "Could not check existing cards." }, { status: 500 });
    }

    const n = count ?? 0;
    if (n > 0) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          message: `This deck already has ${n} cards. Confirm to regenerate, or pass { "force": true } from the API.`,
          card_count: n,
        },
        { status: 200 },
      );
    }
  }

  const quota = await checkGenerationQuota(supabase, user.id);
  if (!quota.disabled && !quota.allowed) {
    return NextResponse.json(
      {
        error: `Daily generation limit reached (${quota.used}/${quota.limit} decks with cards updated today). Try again tomorrow, raise DAILY_GENERATION_LIMIT, or set it to 0 to disable.`,
        code: "QUOTA_EXCEEDED",
      },
      { status: 429 },
    );
  }

  const rate = checkGenerateRateLimit(auth.user.id);
  if (!rate.ok) {
    const mins = Math.max(1, Math.ceil(rate.retryAfterSec / 60));
    return NextResponse.json(
      {
        error: `Too many generation requests for this account. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.`,
        retry_after_sec: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const result = await runDeckGeneration(auth.supabase, {
    deckId: id,
    userId: auth.user.id,
  });

  if (!result.ok) {
    const status = typeof result.httpStatus === "number" ? result.httpStatus : 400;
    const body: { error: string; detail?: string } = { error: result.message };
    if (typeof result.detail === "string" && result.detail.trim()) {
      body.detail = result.detail.trim();
    }
    return NextResponse.json(body, { status });
  }

  return NextResponse.json({
    inserted: result.inserted,
    skipped_invalid: result.skipped_invalid,
  });
}
