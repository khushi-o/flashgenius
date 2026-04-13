import { requireSessionUser } from "@/lib/api/route-auth";
import { generateGeminiText } from "@/lib/generation/gemini";
import {
  buildPageSummaryPrompt,
  parsePageSummaryOutput,
} from "@/lib/generation/page-summary";
import { isMissingDeckPagesRelationError } from "@/lib/supabase/deck-pages-errors";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ deckId: string; pageNumber: string }> };

/**
 * POST /api/decks/[deckId]/pages/[pageNumber]/summarize
 * Generates (or returns cached) tutor-style bullets + hook + quiz for one page.
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  let refresh = false;
  try {
    const b = (await request.json()) as { refresh?: boolean };
    refresh = Boolean(b?.refresh);
  } catch {
    /* empty body */
  }

  const { deckId, pageNumber: pageRaw } = await ctx.params;
  const id = typeof deckId === "string" ? deckId.trim() : "";
  const pageNum = Number.parseInt(typeof pageRaw === "string" ? pageRaw : "", 10);
  if (!id || !Number.isFinite(pageNum) || pageNum < 1) {
    return NextResponse.json({ error: "Invalid deck or page." }, { status: 400 });
  }

  const { supabase, user } = auth;

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY for page summaries." },
      { status: 503 },
    );
  }

  const { data: row, error: fetchErr } = await supabase
    .from("deck_pages")
    .select("id, content, summary, deck_id")
    .eq("deck_id", id)
    .eq("page_number", pageNum)
    .maybeSingle();

  if (fetchErr) {
    if (isMissingDeckPagesRelationError(fetchErr)) {
      return NextResponse.json(
        {
          error:
            "The deck_pages table is missing in Supabase. Run supabase/migrations/003_deck_pages.sql, then re-upload the PDF.",
          code: "DECK_PAGES_MISSING",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: fetchErr.message ?? "Could not load page row.", code: "DECK_PAGES_FETCH" },
      { status: 500 },
    );
  }

  if (!row) {
    return NextResponse.json(
      {
        error: `No row for page ${pageNum}. Re-upload the PDF so deck_pages is populated for this deck.`,
        code: "PAGE_ROW_MISSING",
      },
      { status: 404 },
    );
  }

  const pageText = row.content?.trim() ?? "";
  if (!pageText) {
    return NextResponse.json(
      {
        error: "This page has no extracted text to summarize. Try another page or re-upload a PDF with a selectable text layer.",
        code: "PAGE_EMPTY",
      },
      { status: 422 },
    );
  }

  if (refresh) {
    await supabase.from("deck_pages").update({ summary: null }).eq("id", row.id);
    row.summary = null;
  }

  if (row.summary) {
    try {
      const cached = JSON.parse(row.summary) as unknown;
      return NextResponse.json({ ok: true, summary: cached, cached: true });
    } catch {
      return NextResponse.json({
        ok: true,
        summary: { takeaways: [], spark: "", quiz: row.summary },
        cached: true,
      });
    }
  }

  let raw: string;
  try {
    raw = await generateGeminiText(buildPageSummaryPrompt(pageText));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Model error.";
    return NextResponse.json({ error: "Could not generate summary.", detail: msg }, { status: 502 });
  }

  const parsed = parsePageSummaryOutput(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Model returned unusable summary. Try again." },
      { status: 422 },
    );
  }

  const json = JSON.stringify(parsed);
  const { error: upErr } = await supabase
    .from("deck_pages")
    .update({ summary: json })
    .eq("id", row.id);

  if (upErr) {
    return NextResponse.json({ error: "Could not save summary." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, summary: parsed, cached: false });
}
