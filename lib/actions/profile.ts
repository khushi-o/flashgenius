"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX = 80;

export async function updateDisplayName(
  raw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const trimmed = raw.trim().slice(0, MAX);
  if (!trimmed) {
    return { ok: false, error: "Enter your name." };
  }

  const iso = new Date().toISOString();
  const { data: updated, error: upErr } = await supabase
    .from("profiles")
    .update({ display_name: trimmed, updated_at: iso })
    .eq("user_id", user.id)
    .select("user_id");

  if (!upErr && updated && updated.length > 0) {
    revalidatePath("/decks");
    return { ok: true };
  }

  const { error: insErr } = await supabase.from("profiles").insert({
    user_id: user.id,
    display_name: trimmed,
    updated_at: iso,
  });

  if (insErr) {
    return { ok: false, error: insErr.message };
  }
  revalidatePath("/decks");
  return { ok: true };
}
