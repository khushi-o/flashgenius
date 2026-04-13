import { requireSessionUser } from "@/lib/api/route-auth";
import { NextResponse } from "next/server";

const TONE_PRESETS = new Set(["exam-crisp", "deep-understanding", "quick-recall"]);

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
