"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/nav-icons";
import { BackToLibraryLink } from "@/components/ui/back-to-library-link";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    setErr(null);
  }, [idx]);

  const summarize = useCallback(async (refresh?: boolean) => {
    if (!page) return;
    if (!refresh && parseSummary(page.summary)) {
      return;
    }
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
      <div className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center gap-5 px-4 text-center">
        <BackToLibraryLink className="-ml-1" />
        <p className="max-w-md text-p-sand-dim">
          No per-page text for this deck yet. Re-upload the PDF to build the book view (older
          decks only have chunks).
        </p>
        <Link
          href="/decks/new"
          className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-5 py-2.5 text-sm font-semibold text-p-navy shadow-sm shadow-black/25 hover:brightness-105 [-webkit-tap-highlight-color:transparent]"
        >
          New upload
        </Link>
        <Link
          href={`/decks/${deckId}`}
          className="tap-scale inline-flex min-h-11 items-center text-sm font-medium text-p-sage-bright transition-colors duration-150 hover:text-p-cream hover:underline [-webkit-tap-highlight-color:transparent]"
        >
          Deck & cards
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col bg-p-navy-deep text-p-cream">
      {chunkFallbackBanner ? (
        <div className="border-b border-amber-900/50 bg-amber-950/25 px-3 py-2 text-center text-xs leading-relaxed text-amber-100/90 sm:px-4">
          You&apos;re reading <strong className="text-amber-50">extraction sections</strong> (no{" "}
          <code className="rounded bg-black/30 px-1">deck_pages</code> table yet). Run{" "}
          <code className="rounded bg-black/30 px-1">003_deck_pages.sql</code> in Supabase, then
          re-upload for true page-by-page layout and saved summaries.
        </div>
      ) : null}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-p-sand/15 bg-p-navy-deep/80 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <BackToLibraryLink className="-ml-1 py-1 text-[11px] sm:text-xs" />
          <p className="truncate text-xs font-medium text-p-sand-dim">
            {mode === "sections" ? "Reader (sections)" : "Book view"}
          </p>
          <h1 className="truncate text-sm font-semibold text-p-cream sm:text-base">{deckTitle}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/decks/${deckId}`}
            className="tap-scale inline-flex min-h-10 items-center justify-center rounded-xl border border-p-sand/25 bg-p-navy-mid/70 px-3 py-2 text-xs font-semibold text-p-cream transition-colors duration-150 hover:border-p-sage/35 hover:bg-p-navy/80 [-webkit-tap-highlight-color:transparent]"
          >
            Cards
          </Link>
          <Link
            href={`/study?deck_id=${encodeURIComponent(deckId)}`}
            className="tap-scale inline-flex min-h-10 items-center justify-center rounded-xl border border-p-sage/40 bg-p-sage/15 px-3 py-2 text-xs font-semibold text-p-cream transition-colors duration-150 hover:bg-p-sage/25 [-webkit-tap-highlight-color:transparent]"
          >
            Study SRS
          </Link>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-2 md:gap-px md:bg-zinc-800">
        <section
          className="min-h-0 overflow-y-auto bg-zinc-950 p-3 sm:p-4"
          aria-label="PDF page text"
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {unit} {page?.page_number ?? 0} · {mode === "sections" ? "extracted text" : "source text"}
          </p>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-zinc-200">
            {page?.content ?? ""}
          </pre>
        </section>

        <section
          className="flex min-h-0 flex-col overflow-y-auto border-t border-zinc-800 bg-zinc-900/40 p-3 sm:border-t-0 sm:p-4"
          aria-label="Takeaways and practice"
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Key takeaways & play
          </p>
          {!summarizeAvailable ? (
            <div className="space-y-3 text-sm text-zinc-400">
              <p>
                Per-section AI summaries are stored on <code className="text-zinc-300">deck_pages</code>.
                After you run <code className="text-zinc-300">supabase/migrations/003_deck_pages.sql</code>{" "}
                and re-upload this PDF, you can summarize each page here.
              </p>
              <p className="text-xs text-zinc-500">All extracted text is on the left — scroll or use Prev / Next.</p>
            </div>
          ) : parsed ? (
            <div className="space-y-4 text-sm">
              <ul className="list-disc space-y-1 pl-4 text-zinc-200">
                {parsed.takeaways.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
              {parsed.spark ? (
                <div className="rounded-xl border border-p-sage/30 bg-p-sage/10 p-3 text-p-cream">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-p-sage-bright/90">
                    Memory hook
                  </p>
                  <p className="mt-1 leading-relaxed">{parsed.spark}</p>
                </div>
              ) : null}
              {parsed.quiz ? (
                <div className="rounded-xl border border-p-sand/25 bg-p-navy-mid/60 p-3 text-p-cream">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-p-sand">
                    Check yourself
                  </p>
                  <p className="mt-1 font-medium">{parsed.quiz}</p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void summarize(true)}
                disabled={busy}
                className="tap-scale inline-flex min-h-10 items-center rounded-lg px-1 py-2 text-xs font-medium text-p-sage-bright underline decoration-p-sage/35 underline-offset-2 hover:bg-p-sage/10 hover:text-p-cream disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
              >
                Regenerate this page
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-start gap-3">
              <p className="text-sm text-zinc-500">
                Summarize this page for bullets, a memorable hook, and one check-yourself question
                (uses Gemini on the server).
              </p>
              <button
                type="button"
                onClick={() => void summarize()}
                disabled={busy}
                className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-5 py-3 text-sm font-semibold text-p-navy hover:brightness-105 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
              >
                {busy ? "Working…" : "Summarize this page"}
              </button>
            </div>
          )}
          {err ? <p className="mt-2 text-xs text-red-300">{err}</p> : null}
        </section>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-p-sand/10 bg-p-navy/90 px-3 py-3 pb-4 sm:px-4">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={idx <= 0}
          className="tap-scale inline-flex min-h-11 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-p-sand/20 px-5 py-2.5 text-sm font-medium text-p-cream hover:bg-p-navy-mid disabled:opacity-40 [-webkit-tap-highlight-color:transparent]"
        >
          <ChevronLeftIcon className="size-3.5 opacity-90" />
          Prev
        </button>
        <span className="text-xs text-p-sand-dim">
          {unit} {idx + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={idx >= total - 1}
          className="tap-scale inline-flex min-h-11 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-p-sand/20 px-5 py-2.5 text-sm font-medium text-p-cream hover:bg-p-navy-mid disabled:opacity-40 [-webkit-tap-highlight-color:transparent]"
        >
          Next
          <ChevronRightIcon className="size-3.5 opacity-90" />
        </button>
      </footer>
    </div>
  );
}
