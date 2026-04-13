import { DeckCardFlip } from "@/components/decks/DeckCardFlip";
import { GenerateDeckButton } from "@/components/decks/GenerateDeckButton";
import { maxChunksForGeneration } from "@/lib/constants/generation";
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
    .select("id, title, status, card_count, generation_error, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (dErr || !deck) {
    notFound();
  }

  const { data: cards, error: cErr } = await supabase
    .from("cards")
    .select("id, card_type, front, back, difficulty, created_at")
    .eq("deck_id", id)
    .order("created_at", { ascending: true });

  if (cErr) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          Could not load cards: {cErr.message}
        </p>
      </div>
    );
  }

  const { count: chunkCount } = await supabase
    .from("deck_chunks")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", id);

  const chunksTotal = chunkCount ?? 0;
  const chunkBudget = maxChunksForGeneration();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/decks"
        className="text-sm text-zinc-500 hover:text-zinc-300 hover:underline"
      >
        ← Library
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">{deck.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {deck.status} · {deck.card_count} cards
        {deck.created_at ? ` · created ${formatWhen(deck.created_at)}` : ""}
      </p>

      {deck.status === "error" && deck.generation_error ? (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {deck.generation_error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <GenerateDeckButton deckId={deck.id} status={deck.status} />
        {deck.card_count > 0 ? (
          <Link
            href={`/study?deck_id=${encodeURIComponent(deck.id)}`}
            className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
          >
            Study deck (SRS)
          </Link>
        ) : null}
        {deck.card_count > 0 ? (
          <span className="text-xs text-zinc-500">Preview: tap a card below to flip.</span>
        ) : null}
      </div>

      {chunksTotal > 0 ? (
        <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs leading-relaxed text-zinc-500">
          This deck has <strong className="text-zinc-400">{chunksTotal}</strong> text chunk
          {chunksTotal === 1 ? "" : "s"} from the PDF. Each run sends up to{" "}
          <strong className="text-zinc-400">{chunkBudget}</strong> chunks to the model (
          <code className="text-zinc-500">GENERATION_MAX_CHUNKS</code>). Card count depends on
          how many concepts the model proposes and how many pass the quality checker — not on
          training the model.
        </p>
      ) : null}

      {!cards?.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
          <p className="text-zinc-200">No flashcards in this deck yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            {deck.status === "ready" || deck.status === "error" || deck.status === "generating" ? (
              <>
                Use <strong className="text-zinc-400">Generate cards</strong> above. When it
                finishes, this page updates with your fronts and backs.
              </>
            ) : (
              <>
                This deck is still a <strong className="text-zinc-400">draft</strong> (upload
                did not finish). Create a fresh upload from{" "}
                <Link href="/decks/new" className="text-sky-400 hover:underline">
                  New deck
                </Link>
                .
              </>
            )}
          </p>
          <Link
            href="/decks"
            className="mt-6 inline-block text-sm font-medium text-sky-400 hover:text-sky-300 hover:underline"
          >
            Back to Library
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {cards.map((c, i) => (
            <li key={c.id}>
              <DeckCardFlip
                index={i + 1}
                cardType={c.card_type}
                difficulty={c.difficulty}
                front={c.front}
                back={c.back}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
