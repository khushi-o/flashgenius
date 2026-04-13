import { DeckCardRow } from "@/components/decks/DeckCardRow";
import { DeckDetailTabs } from "@/components/decks/DeckDetailTabs";
import { DeckProgressPanel } from "@/components/decks/DeckProgressPanel";
import { DeleteDeckButton } from "@/components/decks/DeleteDeckButton";
import { GenerateDeckButton } from "@/components/decks/GenerateDeckButton";
import {
  aggregateDeckStats,
  isDueForStudy,
  masteryPercent,
  type CardScheduleRow,
} from "@/lib/library/card-buckets";
import {
  consecutiveStudyDaysFromReviews,
  reviewsInRollingWindow,
} from "@/lib/library/study-streak";
import { BackToLibraryLink } from "@/components/ui/back-to-library-link";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ deckId: string }> };

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DeckDetailPage({ params }: Props) {
  const { deckId } = await params;
  const id = typeof deckId === "string" ? deckId.trim() : "";
  if (!id) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/decks/${id}`)}`);
  }

  const { data: deck, error: dErr } = await supabase
    .from("decks")
    .select(
      "id, title, status, card_count, tone_preset, generation_error, created_at, updated_at, last_studied_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (dErr || !deck) {
    notFound();
  }

  const { data: cards, error: cErr } = await supabase
    .from("cards")
    .select(
      "id, card_type, front, back, difficulty, next_review_at, interval_days, repetitions, created_at",
    )
    .eq("deck_id", id)
    .order("created_at", { ascending: true })
    .limit(300);

  if (cErr) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          Could not load cards: {cErr.message}
        </p>
      </div>
    );
  }

  const list = cards ?? [];
  const scheduleRows: CardScheduleRow[] = list.map((c) => ({
    deck_id: id,
    next_review_at: c.next_review_at,
    interval_days: c.interval_days,
    repetitions: c.repetitions,
  }));
  const byDeck = aggregateDeckStats(scheduleRows);
  const stats = byDeck.get(id) ?? { new: 0, learning: 0, mature: 0 };
  const now = new Date();
  const dueNow = scheduleRows.filter((r) => isDueForStudy(r, now)).length;
  const mastery = masteryPercent(stats);

  const cardIds = list.map((c) => c.id);
  let reviewTimestamps: string[] = [];
  if (cardIds.length) {
    const since90 = new Date();
    since90.setUTCDate(since90.getUTCDate() - 90);
    const { data: revs } = await supabase
      .from("review_events")
      .select("reviewed_at")
      .eq("user_id", user.id)
      .in("card_id", cardIds)
      .gte("reviewed_at", since90.toISOString());
    reviewTimestamps = (revs ?? [])
      .map((r) => r.reviewed_at)
      .filter((t): t is string => typeof t === "string");
  }

  const since7 = new Date();
  since7.setUTCDate(since7.getUTCDate() - 7);
  const reviewsLast7Days = reviewsInRollingWindow(reviewTimestamps, since7);
  const streakDays = consecutiveStudyDaysFromReviews(reviewTimestamps);

  const cardsTab =
    !list.length ? (
      <div className="rounded-2xl border border-dashed border-p-sand/20 bg-p-navy-mid/40 px-6 py-12 text-center">
        <p className="text-p-cream">No flashcards in this deck yet.</p>
        <p className="mt-2 text-sm text-p-sand-dim">
          {deck.status === "ready" || deck.status === "error" || deck.status === "generating" ? (
            <>
              Use <strong className="text-p-sand">Generate cards</strong> above. When it
              finishes, this page updates with your fronts and backs.
            </>
          ) : (
            <>
              This deck is still a <strong className="text-p-sand">draft</strong> (upload did
              not finish). Create a fresh upload from{" "}
              <Link href="/decks/new" className="text-p-sage-bright hover:text-p-cream hover:underline">
                New deck
              </Link>
              .
            </>
          )}
        </p>
      <BackToLibraryLink className="mt-6 justify-center sm:justify-start" />
      </div>
    ) : (
      <ul className="space-y-4">
        {list.map((c, i) => (
          <li key={c.id}>
            <DeckCardRow
              deckId={deck.id}
              cardId={c.id}
              index={i + 1}
              cardType={c.card_type}
              difficulty={c.difficulty}
              front={c.front}
              back={c.back}
            />
          </li>
        ))}
      </ul>
    );

  const progressTab = (
    <DeckProgressPanel
      stats={stats}
      masteryPercent={mastery}
      dueNow={dueNow}
      streakDays={streakDays}
      reviewsLast7Days={reviewsLast7Days}
      lastStudiedAt={deck.last_studied_at}
    />
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <BackToLibraryLink className="-ml-1" />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-p-cream">{deck.title}</h1>
        <DeleteDeckButton deckId={deck.id} deckTitle={deck.title} />
      </div>
      <p className="mt-1 text-sm text-p-sand-dim">
        {deck.status} · {deck.card_count} cards
        {deck.created_at ? ` · created ${formatWhen(deck.created_at)}` : ""}
      </p>

      {deck.status === "error" && deck.generation_error ? (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {deck.generation_error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
        <Link
          href={`/decks/${deck.id}/read`}
          className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-p-sand/25 bg-p-navy-mid/80 px-4 py-2.5 text-xs font-semibold text-p-cream transition-colors duration-150 hover:border-p-sage/35 hover:bg-p-navy/90 [-webkit-tap-highlight-color:transparent]"
        >
          Read as book
        </Link>
        <GenerateDeckButton deckId={deck.id} status={deck.status} />
        {deck.card_count > 0 ? (
          <Link
            href={`/study?deck_id=${encodeURIComponent(deck.id)}`}
            className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-p-sage/40 bg-p-sage/15 px-4 py-2.5 text-xs font-semibold text-p-cream transition-colors duration-150 hover:bg-p-sage/25 [-webkit-tap-highlight-color:transparent]"
          >
            Study deck (SRS)
          </Link>
        ) : null}
        {deck.card_count > 0 ? (
          <span className="text-xs text-p-sand-dim">
            Cards: tap the card area to reveal or hide the answer.
          </span>
        ) : null}
      </div>

      <DeckDetailTabs cards={cardsTab} progress={progressTab} />
    </div>
  );
}
