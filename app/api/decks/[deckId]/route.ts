import { requireSessionUser } from "@/lib/api/route-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ deckId: string }> };

/**
 * DELETE /api/decks/[deckId] — remove deck (cascades chunks, cards, pages, reviews) and PDF objects in storage.
 */
export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { deckId } = await ctx.params;
  const id = typeof deckId === "string" ? deckId.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Invalid deck id." }, { status: 400 });
  }

  const { supabase, user } = auth;

  const { data: deck, error: findErr } = await supabase
    .from("decks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findErr || !deck) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const prefix = `${user.id}/${id}`;
  const { data: files } = await supabase.storage.from("pdfs").list(prefix);
  const paths = (files ?? []).map((f) => `${prefix}/${f.name}`);
  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from("pdfs").remove(paths);
    if (rmErr) {
      console.warn("[decks/delete] storage remove:", rmErr.message);
    }
  }

  const { error: delErr } = await supabase.from("decks").delete().eq("id", id).eq("user_id", user.id);

  if (delErr) {
    return NextResponse.json({ error: "Could not delete deck." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
