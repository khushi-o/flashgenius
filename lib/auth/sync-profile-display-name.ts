import type { SupabaseClient, User } from "@supabase/supabase-js";

const MAX = 80;

/**
 * After OAuth / magic link, copy a friendly name from auth metadata into `profiles.display_name`
 * when the profile row still has no name (does not overwrite an existing display name).
 */
export async function syncProfileDisplayNameFromUser(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  const fromMeta =
    (typeof meta?.display_name === "string" && meta.display_name.trim()) ||
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    "";
  if (!fromMeta) return;

  const { data: row } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (row?.display_name && String(row.display_name).trim()) return;

  await supabase
    .from("profiles")
    .update({
      display_name: fromMeta.slice(0, MAX),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
}
