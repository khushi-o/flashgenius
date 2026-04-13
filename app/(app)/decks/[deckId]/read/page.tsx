import { AppLogoMark } from "@/components/app-logo";
import { DeckBookReader } from "@/components/decks/DeckBookReader";
import { deckChunksToReaderPages, type DeckChunkPick } from "@/lib/library/chunks-to-reader-pages";
import { createClient } from "@/lib/supabase/server";
import { isMissingDeckPagesRelationError } from "@/lib/supabase/deck-pages-errors";
import type { DeckPageRow } from "@/components/decks/DeckBookReader";
import { BackToLibraryLink } from "@/components/ui/back-to-library-link";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ deckId: string }> };

const MAX_PAGES_LOAD = 300;

export default async function DeckReadPage({ params }: Props) {
  const { deckId } = await params;
  const id = typeof deckId === "string" ? deckId.trim() : "";
  if (!id) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/decks/${id}/read`)}`);
  }

  const { data: deck, error: dErr } = await supabase
    .from("decks")
    .select("id, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (dErr || !deck) {
    notFound();
  }

  const { data: pages, error: pErr } = await supabase
    .from("deck_pages")
    .select("page_number, content, summary")
    .eq("deck_id", id)
    .order("page_number", { ascending: true })
    .limit(MAX_PAGES_LOAD);

  if (pErr && !isMissingDeckPagesRelationError(pErr)) {
    return (
      <div className="flex flex-col p-6">
        <BackToLibraryLink className="-ml-1 self-start" />
        <p className="mt-4 text-sm text-red-300">Could not load pages: {pErr.message}</p>
      </div>
    );
  }

  const missingDeckPagesTable = Boolean(pErr && isMissingDeckPagesRelationError(pErr));
  const pageRows = (pages ?? []) as DeckPageRow[];
  const hasDeckPages = pageRows.length > 0;

  let readerPages: DeckPageRow[] = pageRows;
  let mode: "pages" | "sections" = "pages";
  let summarizeAvailable = true;
  let chunkFallbackBanner = false;

  if (!hasDeckPages) {
    const { data: chunks, error: cErr } = await supabase
      .from("deck_chunks")
      .select("chunk_index, content, page_start, page_end")
      .eq("deck_id", id)
      .order("chunk_index", { ascending: true })
      .limit(500);

    if (cErr) {
      return (
        <div className="flex flex-col p-6">
          <BackToLibraryLink className="-ml-1 self-start" />
          <p className="mt-4 text-sm text-red-300">Could not load book text: {cErr.message}</p>
        </div>
      );
    }

    const list = (chunks ?? []) as DeckChunkPick[];
    if (list.length > 0) {
      readerPages = deckChunksToReaderPages(list) as DeckPageRow[];
      mode = "sections";
      summarizeAvailable = false;
      chunkFallbackBanner = missingDeckPagesTable;
    } else if (missingDeckPagesTable) {
      return (
        <div className="flex flex-1 flex-col items-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-xl rounded-2xl border border-p-sand/20 bg-gradient-to-b from-p-navy-mid/90 to-p-navy-deep/95 p-8 shadow-xl shadow-black/40 ring-1 ring-inset ring-p-sage/10">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
              <AppLogoMark size="md" className="shrink-0" />
              <div className="mt-5 min-w-0 sm:mt-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-p-sage-bright/90">
                  Book view
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-p-cream sm:text-2xl">
                  Nothing to read yet
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-p-sand-dim">
                  This deck has no saved text chunks yet (upload may have failed or the PDF had no
                  extractable text). The <code className="rounded bg-black/40 px-1.5 py-0.5 text-p-cream">deck_pages</code> table is also missing from Supabase — run{" "}
                  <code className="rounded bg-black/40 px-1.5 py-0.5 text-p-sage-bright">
                    supabase/migrations/003_deck_pages.sql
                  </code>{" "}
                  when you set up the project, then upload a text-based PDF again.
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3 sm:justify-start">
              <BackToLibraryLink variant="primary" />
              <Link
                href={`/decks/${id}`}
                className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-p-sand/25 bg-p-navy-mid/70 px-4 py-2.5 text-sm font-semibold text-p-cream transition-colors duration-150 hover:border-p-sage/35 hover:bg-p-navy/80 [-webkit-tap-highlight-color:transparent]"
              >
                Deck overview
              </Link>
              <Link
                href="/decks/new"
                className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl border border-p-sand/25 bg-p-navy-mid/70 px-4 py-2.5 text-sm font-semibold text-p-cream transition-colors duration-150 hover:border-p-sage/35 hover:bg-p-navy/80 [-webkit-tap-highlight-color:transparent]"
              >
                New upload
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <DeckBookReader
      deckId={deck.id}
      deckTitle={deck.title}
      pages={readerPages}
      mode={mode}
      summarizeAvailable={summarizeAvailable}
      chunkFallbackBanner={chunkFallbackBanner}
    />
  );
}
