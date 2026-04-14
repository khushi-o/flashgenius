import { LibraryView, type LibraryDeckRow } from "@/components/library/LibraryView";
import { getServerMaxUploadMb } from "@/lib/constants/uploads";
import { recoverStaleGeneratingDecks } from "@/lib/decks/recover-stale-generating";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateDeckStats,
  isDueForStudy,
  type CardScheduleRow,
  type DeckCardStats,
} from "@/lib/library/card-buckets";
import { redirect } from "next/navigation";

export default async function DecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/decks");
  }

  const { data: decks, error } = await supabase
    .from("decks")
    .select(
      "id, title, status, card_count, tone_preset, generation_error, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-1 px-4 py-16 sm:px-8 lg:px-12">
        <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          Could not load decks: {error.message}. If the database is new, run{" "}
          <code className="rounded bg-red-950 px-1 text-red-100">
            supabase/migrations/001_initial_schema.sql
          </code>{" "}
          in the Supabase SQL editor.
        </p>
      </div>
    );
  }

  const list = (decks ?? []) as LibraryDeckRow[];
  await recoverStaleGeneratingDecks(supabase, user.id, list);

  const { data: cardRows, error: cErr } = await supabase
    .from("cards")
    .select("deck_id, next_review_at, interval_days, repetitions")
    .eq("user_id", user.id);

  if (cErr) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-1 px-4 py-16 sm:px-8 lg:px-12">
        <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          Could not load card stats: {cErr.message}
        </p>
      </div>
    );
  }

  const rows = (cardRows ?? []) as CardScheduleRow[];
  const byDeck = aggregateDeckStats(rows);
  const statsByDeckId: Record<string, DeckCardStats> = {};
  for (const [id, s] of byDeck) {
    statsByDeckId[id] = s;
  }

  const now = new Date();
  let dueStudy = 0;
  for (const r of rows) {
    if (isDueForStudy(r, now)) dueStudy += 1;
  }

  const totalCards = rows.length;
  const totals = {
    deckCount: list.length,
    totalCards,
    dueStudy,
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName =
    typeof profile?.display_name === "string" && profile.display_name.trim()
      ? profile.display_name.trim()
      : null;

  const maxUploadMb = getServerMaxUploadMb();

  return (
    <LibraryView
      displayName={displayName}
      decks={list}
      statsByDeckId={statsByDeckId}
      totals={totals}
      maxUploadMb={maxUploadMb}
    />
  );
}
