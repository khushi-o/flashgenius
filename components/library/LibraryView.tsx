"use client";

import { DeleteDeckButton } from "@/components/decks/DeleteDeckButton";
import { GenerateDeckButton } from "@/components/decks/GenerateDeckButton";
import {
  ACCEPT_DECK_SOURCE,
  isDeckSourceUploadFile,
} from "@/lib/decks/upload-source-types";
import { createAndUploadDeckSource } from "@/lib/decks/upload-pdf-client";
import type { DeckCardStats } from "@/lib/library/card-buckets";
import { masteryPercent } from "@/lib/library/card-buckets";
import { splitDeckTitle, tonePresetLabel } from "@/lib/library/deck-display";
import { LibraryGreeting } from "@/components/library/LibraryGreeting";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";

export type LibraryDeckRow = {
  id: string;
  title: string;
  status: string;
  card_count: number;
  tone_preset: string;
  generation_error: string | null;
  created_at: string | null;
};

export type LibraryViewProps = {
  displayName: string | null;
  decks: LibraryDeckRow[];
  statsByDeckId: Record<string, DeckCardStats>;
  totals: { deckCount: number; totalCards: number; dueStudy: number };
  /** From server `getServerMaxUploadMb()` — must match `MAX_UPLOAD_MB`. */
  maxUploadMb: number;
};

function stemFromFilename(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function formatCreatedAt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusPill(status: string) {
  if (status === "ready")
    return "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300";
  if (status === "error")
    return "rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-red-300";
  if (status === "generating")
    return "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200";
  return "rounded-full bg-p-navy/60 px-2.5 py-0.5 text-[11px] font-semibold text-p-sand";
}

function outlineBtnClass(extra?: string) {
  return `tap-scale inline-flex min-h-11 min-w-[2.75rem] items-center justify-center rounded-xl border border-p-sand/20 bg-p-navy-mid/50 px-4 py-2.5 text-xs font-semibold text-p-cream transition-[background-color,border-color,color] duration-150 hover:border-p-sage/35 hover:bg-p-navy/70 active:bg-p-navy-mid [-webkit-tap-highlight-color:transparent] ${extra ?? ""}`;
}

export function LibraryView({
  displayName,
  decks,
  statsByDeckId,
  totals,
  maxUploadMb,
}: LibraryViewProps) {
  const router = useRouter();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter((d) => {
      const { name, category } = splitDeckTitle(d.title);
      const hay = `${name} ${category ?? ""} ${d.status} ${tonePresetLabel(d.tone_preset)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [decks, query]);

  const maxBytes = maxUploadMb * 1024 * 1024;

  const onQuickUpload = useCallback(
    async (file: File | null) => {
      setUploadErr(null);
      if (!file) return;
      if (!isDeckSourceUploadFile(file)) {
        setUploadErr("Please choose a PDF or Word .docx file.");
        return;
      }
      if (file.size > maxBytes) {
        setUploadErr(
          `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Max is ${maxUploadMb} MB — raise MAX_UPLOAD_MB in .env.local and restart.`,
        );
        return;
      }
      setUploadBusy(true);
      try {
        const title = stemFromFilename(file.name).slice(0, 200);
        const { deckId } = await createAndUploadDeckSource(file, title, { maxUploadMb });
        router.push(`/decks/${deckId}/read`);
        router.refresh();
      } catch (e) {
        setUploadErr(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setUploadBusy(false);
      }
    },
    [maxBytes, maxUploadMb, router],
  );

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-p-cream">Your library</h1>
          <LibraryGreeting key={displayName ?? "__none"} initialDisplayName={displayName} />
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="relative w-full sm:w-72">
            <label htmlFor={searchId} className="sr-only">
              Search decks
            </label>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-p-sand-dim"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" strokeLinecap="round" />
            </svg>
            <input
              id={searchId}
              type="search"
              placeholder="Search decks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-p-sand/15 bg-p-navy-mid/70 py-2.5 pl-10 pr-3 text-sm text-p-cream placeholder:text-p-sand-dim focus:border-p-sage/50 focus:outline-none focus:ring-1 focus:ring-p-sage/30"
            />
          </div>
          <Link
            href="/decks/new"
            className="tap-scale inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-5 py-3 text-sm font-semibold text-p-navy shadow-lg shadow-black/30 hover:brightness-105 sm:w-auto [-webkit-tap-highlight-color:transparent]"
          >
            <span className="text-lg leading-none">+</span>
            New deck
          </Link>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-p-sand/12 bg-p-navy-mid/40 px-4 py-4">
          <p className="text-2xl font-semibold text-p-sage-bright">{totals.deckCount}</p>
          <p className="text-sm text-p-sand-dim">
            deck{totals.deckCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-2xl border border-p-sand/12 bg-p-navy-mid/40 px-4 py-4">
          <p className="text-2xl font-semibold text-teal-400">{totals.totalCards}</p>
          <p className="text-sm text-p-sand-dim">total cards</p>
        </div>
        <div className="rounded-2xl border border-p-sand/12 bg-p-navy-mid/40 px-4 py-4">
          <p className="text-2xl font-semibold text-amber-300">{totals.dueStudy}</p>
          <p className="text-sm text-p-sand-dim">due today</p>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-p-sand/20 bg-p-navy-mid/25 px-6 py-14 text-center">
          <p className="text-p-sand">{decks.length === 0 ? "No decks yet." : "No decks match your search."}</p>
          <p className="mt-2 text-sm text-p-sand-dim">
            {decks.length === 0
              ? "Upload a PDF below or use New deck for title and subject options."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <ul className="mt-10 flex flex-col gap-5">
          {filtered.map((d) => {
            const stats = statsByDeckId[d.id] ?? { new: 0, learning: 0, mature: 0 };
            const total = stats.new + stats.learning + stats.mature;
            const pct = masteryPercent(stats);
            const { name, category } = splitDeckTitle(d.title);
            const wNew = total ? (stats.new / total) * 100 : 0;
            const wLearn = total ? (stats.learning / total) * 100 : 0;
            const wMat = total ? (stats.mature / total) * 100 : 0;

            return (
              <li
                key={d.id}
                className="rounded-2xl border border-p-sand/12 bg-p-navy-mid/40 p-5 shadow-sm shadow-black/25"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-p-cream">{name}</h2>
                    {category ? <p className="mt-1 text-sm text-p-sand-dim">{category}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-p-sage/25 bg-p-sage/15 px-2.5 py-0.5 text-[11px] font-semibold text-p-sage-bright">
                        {tonePresetLabel(d.tone_preset)}
                      </span>
                      <span className={statusPill(d.status)}>{d.status.replace(/-/g, " ")}</span>
                    </div>
                    <p className="mt-3 text-xs text-p-sand-dim">
                      {d.card_count} card{d.card_count === 1 ? "" : "s"}
                      {d.created_at ? ` · created ${formatCreatedAt(d.created_at)}` : ""}
                      {d.status === "error" && d.generation_error ? ` — ${d.generation_error}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                    <Link href={`/decks/${d.id}/read`} className={outlineBtnClass()}>
                      Book
                    </Link>
                    {d.card_count > 0 ? (
                      <Link href={`/decks/${d.id}`} className={outlineBtnClass()}>
                        All cards
                      </Link>
                    ) : null}
                    <Link
                      href={`/study?deck_id=${encodeURIComponent(d.id)}`}
                      className="tap-scale inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-p-sage to-p-sage-muted px-5 py-2.5 text-xs font-semibold text-p-navy shadow-sm shadow-black/20 transition-[filter,transform] duration-150 hover:brightness-105 [-webkit-tap-highlight-color:transparent]"
                    >
                      Study now
                    </Link>
                    <GenerateDeckButton deckId={d.id} status={d.status} labelShort />
                    <DeleteDeckButton deckId={d.id} deckTitle={d.title} variant="outline" />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-p-navy/80">
                    <span className="h-full bg-p-sage/90" style={{ width: `${wNew}%` }} />
                    <span className="h-full bg-amber-400/90" style={{ width: `${wLearn}%` }} />
                    <span className="h-full bg-emerald-500/90" style={{ width: `${wMat}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-p-sand-dim">
                    <span>
                      <span className="font-medium text-p-sage-bright">{stats.new} new</span>
                      <span className="mx-1.5 text-p-navy">·</span>
                      <span className="font-medium text-amber-200/90">{stats.learning} learning</span>
                      <span className="mx-1.5 text-p-navy">·</span>
                      <span className="font-medium text-emerald-300">{stats.mature} mature</span>
                    </span>
                    <span className="text-p-sand">{pct}% mastery</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-12">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-p-sand/25 bg-p-navy-mid/30 px-6 py-14 transition hover:border-p-sage/40 hover:bg-p-sage/10">
          <input
            type="file"
            accept={ACCEPT_DECK_SOURCE}
            className="sr-only"
            disabled={uploadBusy}
            onChange={(e) => void onQuickUpload(e.target.files?.[0] ?? null)}
          />
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-p-sage to-p-sand text-p-navy shadow-lg shadow-black/30">
            {uploadBusy ? (
              <span className="text-xs font-semibold">…</span>
            ) : (
              <span className="text-2xl font-light leading-none">+</span>
            )}
          </span>
          <p className="mt-4 text-sm font-medium text-p-cream">
            {uploadBusy ? "Uploading and extracting…" : "Upload a PDF or .docx to create a new deck"}
          </p>
          <p className="mt-1 text-center text-xs text-p-sand-dim">
            Uses the file name as the deck title. For subject and custom names, use{" "}
            <Link href="/decks/new" className="text-p-sage-bright hover:text-p-cream hover:underline">
              New deck
            </Link>
            .
          </p>
        </label>
        {uploadErr ? (
          <p className="mt-3 text-center text-sm text-red-300" role="alert">
            {uploadErr}
          </p>
        ) : null}
      </div>
    </div>
  );
}
