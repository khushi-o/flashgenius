"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/nav-icons";
import { BackToLibraryLink } from "@/components/ui/back-to-library-link";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

export type DeckPageRow = {
  page_number: number;
  content: string;
  summary: string | null;
};

type SummaryPayload = {
  takeaways: string[];
  spark: string;
  quiz: string;
};

function parseSummary(raw: string | null): SummaryPayload | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as SummaryPayload;
    if (!o || typeof o !== "object") return null;
    return {
      takeaways: Array.isArray(o.takeaways) ? o.takeaways : [],
      spark: typeof o.spark === "string" ? o.spark : "",
      quiz: typeof o.quiz === "string" ? o.quiz : "",
    };
  } catch {
    return null;
  }
}

export function DeckBookReader({
  deckId,
  deckTitle,
  pages,
  mode = "pages",
  summarizeAvailable = true,
  chunkFallbackBanner = false,
}: {
  deckId: string;
  deckTitle: string;
  pages: DeckPageRow[];
  /** `sections` = text came from `deck_chunks` (extraction slices), not PDF pages. */
  mode?: "pages" | "sections";
  /** Per-page Gemini summaries require rows in `deck_pages`. */
  summarizeAvailable?: boolean;
  /** Shown when reading sections because `deck_pages` table is not deployed yet. */
  chunkFallbackBanner?: boolean;
}) {
  const sorted = useMemo(
    () => [...pages].sort((a, b) => a.page_number - b.page_number),
    [pages],
  );
  const [idx, setIdx] = useState(0);
  const [local, setLocal] = useState<DeckPageRow[]>(sorted);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const page = local[idx] ?? null;
  const total = local.length;
  const parsed = page ? parseSummary(page.summary) : null;
  const unit = mode === "sections" ? "Section" : "Page";

  const go = useCallback(
    (d: number) => {
      setIdx((i) => Math.min(Math.max(0, i + d), Math.max(0, total - 1)));
      setErr(null);
    },
    [total],
  );

  const summarize = useCallback(async (refresh?: boolean) => {
    if (!page) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/decks/${deckId}/pages/${page.page_number}/summarize`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: Boolean(refresh) }),
        },
      );
      const raw = await res.text();
      let data: { summary?: SummaryPayload; error?: string; detail?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setErr(`Could not summarize. (HTTP ${res.status})`);
        return;
      }
      if (!res.ok) {
        const hint =
          typeof data.detail === "string" && data.detail.trim()
            ? ` ${data.detail.trim().slice(0, 280)}`
            : "";
        setErr(`${data.error ?? "Could not summarize."}${hint}`.trim());
        return;
      }
      if (data.summary) {
        const json = JSON.stringify(data.summary);
        setLocal((rows) =>
          rows.map((r) =>
            r.page_number === page.page_number ? { ...r, summary: json } : r,
          ),
        );
      }
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }, [deckId, page]);

  if (!total) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center gap-6 px-6 text-center">
        <BackToLibraryLink className="-ml-1" />
        <p className="max-w-md text-sm leading-relaxed text-p-sand-dim">
          No per-page text for this deck yet. Re-upload the PDF to build the book view (older
          decks only have chunks).
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/decks/new"
            className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-5 py-2.5 text-sm font-semibold text-p-navy shadow-sm shadow-black/25 hover:brightness-105 [-webkit-tap-highlight-color:transparent]"
          >
            New upload
          </Link>
          <Link
            href={`/decks/${deckId}`}
            className="tap-scale inline-flex min-h-11 items-center rounded-xl border border-p-sand/25 px-5 py-2.5 text-sm font-medium text-p-sage-bright transition-colors hover:bg-p-sage/10 [-webkit-tap-highlight-color:transparent]"
          >
            Deck & cards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col bg-gradient-to-b from-p-navy-deep via-[#0a0d14] to-p-navy-deep text-p-cream">
      {chunkFallbackBanner ? (
        <div className="border-b border-amber-900/50 bg-amber-950/25 px-4 py-2.5 text-center text-xs leading-relaxed text-amber-100/90 sm:px-6">
          You&apos;re reading <strong className="text-amber-50">extraction sections</strong> (no{" "}
          <code className="rounded bg-black/30 px-1">deck_pages</code> table yet). Run{" "}
          <code className="rounded bg-black/30 px-1">003_deck_pages.sql</code> in Supabase, then
          re-upload for true page-by-page layout and saved summaries.
        </div>
      ) : null}

      <header className="shrink-0 border-b border-p-sand/10 bg-p-navy-mid/35 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <BackToLibraryLink className="-ml-1 shrink-0 text-xs sm:text-sm" />
            <span className="hidden h-9 w-px shrink-0 bg-p-sand/15 sm:block" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-p-sage-bright/85">
                {mode === "sections" ? "Reader · sections" : "Book view"}
              </p>
              <h1 className="mt-1 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-p-cream sm:line-clamp-1 sm:text-lg">
                {deckTitle}
              </h1>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Link
              href={`/decks/${deckId}`}
              className="tap-scale inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-p-sand/20 bg-p-navy-deep/60 px-4 py-2 text-xs font-semibold text-p-cream transition-colors hover:border-p-sage/35 hover:bg-p-navy-mid sm:flex-none [-webkit-tap-highlight-color:transparent]"
            >
              Cards
            </Link>
            <Link
              href={`/study?deck_id=${encodeURIComponent(deckId)}`}
              className="tap-scale inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-p-sage/40 bg-p-sage/12 px-4 py-2 text-xs font-semibold text-p-cream transition-colors hover:bg-p-sage/22 sm:flex-none [-webkit-tap-highlight-color:transparent]"
            >
              Study SRS
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 p-3 sm:p-4 md:flex-row md:gap-4 lg:p-5">
        <section
          className="flex min-h-[42vh] flex-1 flex-col overflow-hidden rounded-2xl border border-p-sand/12 bg-[#070a0f] shadow-inner shadow-black/30 md:min-h-0"
          aria-label="PDF page text"
        >
          <div className="shrink-0 border-b border-p-sand/10 px-4 py-2.5 sm:px-5 sm:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-p-sand-dim">
              {unit} {page?.page_number ?? 0} · {mode === "sections" ? "extracted text" : "source text"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6">
            <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-7 text-p-cream/95">
              {page?.content ?? ""}
            </pre>
          </div>
        </section>

        <section
          className="flex min-h-[36vh] flex-1 flex-col overflow-hidden rounded-2xl border border-p-sand/12 bg-p-navy-mid/25 shadow-inner shadow-black/20 md:min-h-0"
          aria-label="Takeaways and practice"
        >
          <div className="shrink-0 border-b border-p-sand/10 px-4 py-2.5 sm:px-5 sm:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-p-sand-dim">
              Key takeaways &amp; play
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {!summarizeAvailable ? (
              <div className="space-y-3 px-4 py-5 text-sm leading-relaxed text-p-sand sm:px-5 sm:py-6">
                <p>
                  Per-section AI summaries are stored on{" "}
                  <code className="rounded bg-black/35 px-1.5 py-0.5 text-p-cream">deck_pages</code>.
                  After you run{" "}
                  <code className="rounded bg-black/35 px-1.5 py-0.5 text-p-sage-bright">
                    supabase/migrations/003_deck_pages.sql
                  </code>{" "}
                  and re-upload this PDF, you can summarize each page here.
                </p>
                <p className="text-xs text-p-sand-dim">
                  All extracted text is in the left panel — scroll there or use Prev / Next.
                </p>
              </div>
            ) : parsed ? (
              <div className="space-y-5 px-4 py-5 text-sm sm:px-5 sm:py-6">
                <ul className="list-disc space-y-2 pl-5 text-p-cream/95">
                  {parsed.takeaways.map((t, i) => (
                    <li key={i} className="leading-relaxed">
                      {t}
                    </li>
                  ))}
                </ul>
                {parsed.spark ? (
                  <div className="rounded-xl border border-p-sage/28 bg-p-sage/10 p-4 text-p-cream">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-p-sage-bright/90">
                      Memory hook
                    </p>
                    <p className="mt-2 leading-relaxed">{parsed.spark}</p>
                  </div>
                ) : null}
                {parsed.quiz ? (
                  <div className="rounded-xl border border-p-sand/22 bg-p-navy-deep/50 p-4 text-p-cream">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-p-sand">
                      Check yourself
                    </p>
                    <p className="mt-2 font-medium leading-relaxed">{parsed.quiz}</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void summarize(true)}
                  disabled={busy}
                  className="tap-scale inline-flex min-h-10 items-center rounded-lg px-2 py-2 text-xs font-medium text-p-sage-bright underline decoration-p-sage/35 underline-offset-2 hover:bg-p-sage/10 hover:text-p-cream disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
                >
                  Regenerate this page
                </button>
              </div>
            ) : (
              <div className="flex min-h-[min(280px,45dvh)] flex-col items-center justify-center gap-5 px-5 py-10 sm:min-h-[240px] sm:px-8 sm:py-12 md:min-h-0 md:flex-1">
                <p className="max-w-md text-center text-sm leading-relaxed text-p-sand-dim md:text-left">
                  Summarize this page for bullets, a memorable hook, and one check-yourself question
                  (uses Gemini on the server).
                </p>
                <button
                  type="button"
                  onClick={() => void summarize()}
                  disabled={busy}
                  className="tap-scale inline-flex min-h-12 min-w-[12rem] items-center justify-center rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-6 py-3 text-sm font-semibold text-p-navy shadow-md shadow-black/25 hover:brightness-105 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
                >
                  {busy ? "Working…" : "Summarize this page"}
                </button>
              </div>
            )}
            {err ? (
              <p className="border-t border-red-900/30 bg-red-950/20 px-4 py-3 text-xs text-red-200 sm:px-5">
                {err}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-p-sand/10 bg-p-navy-mid/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={idx <= 0}
          className="tap-scale inline-flex min-h-11 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-p-sand/20 bg-p-navy-deep/50 px-5 py-2.5 text-sm font-medium text-p-cream hover:bg-p-navy-mid disabled:opacity-40 [-webkit-tap-highlight-color:transparent]"
        >
          <ChevronLeftIcon className="size-3.5 opacity-90" />
          Prev
        </button>
        <span className="tabular-nums text-xs text-p-sand-dim sm:text-sm">
          {unit} {idx + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={idx >= total - 1}
          className="tap-scale inline-flex min-h-11 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-p-sand/20 bg-p-navy-deep/50 px-5 py-2.5 text-sm font-medium text-p-cream hover:bg-p-navy-mid disabled:opacity-40 [-webkit-tap-highlight-color:transparent]"
        >
          Next
          <ChevronRightIcon className="size-3.5 opacity-90" />
        </button>
      </footer>
    </div>
  );
}
