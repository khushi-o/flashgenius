import { requireSessionUser } from "@/lib/api/route-auth";
import { checkGenerateRateLimit } from "@/lib/generation-rate-limit";
import { runDeckGeneration } from "@/lib/generation/run-deck-generation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ deckId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { deckId } = await ctx.params;
  const id = typeof deckId === "string" ? deckId.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Invalid deck id." }, { status: 400 });
  }

  if (!checkGenerateRateLimit(auth.user.id)) {
    return NextResponse.json(
      { error: "Too many generation requests. Try again in an hour." },
      { status: 429 },
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
