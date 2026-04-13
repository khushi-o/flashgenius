"use client";

import {
  ACCEPT_DECK_SOURCE,
  isDeckSourceUploadFile,
} from "@/lib/decks/upload-source-types";
import { createAndUploadDeckSource } from "@/lib/decks/upload-pdf-client";
import { BackToLibraryLink } from "@/components/ui/back-to-library-link";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function stemFromFilename(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function buildDeckTitle(deckName: string, subject: string, file: File) {
  const name = deckName.trim() || stemFromFilename(file.name);
  const sub = subject.trim();
  if (sub) return `${name} · ${sub}`.slice(0, 200);
  return name.slice(0, 200);
}

export type CreateDeckFormProps = {
  /** From server `getServerMaxUploadMb()` — must match `MAX_UPLOAD_MB`. */
  maxUploadMb: number;
};

export function CreateDeckForm({ maxUploadMb }: CreateDeckFormProps) {
  const router = useRouter();
  const idDeck = useId();
  const idSubject = useId();
  const [file, setFile] = useState<File | null>(null);
  const [deckName, setDeckName] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxBytes = maxUploadMb * 1024 * 1024;

  const onFile = useCallback(
    (f: File | null) => {
      setError(null);
      if (f && !isDeckSourceUploadFile(f)) {
        setFile(null);
        setError("Choose a PDF or a Word .docx file (legacy .doc is not supported).");
        return;
      }
      if (f && f.size > maxBytes) {
        setFile(null);
        setError(
          `This file is ${(f.size / (1024 * 1024)).toFixed(1)} MB. Max is ${maxUploadMb} MB — raise MAX_UPLOAD_MB in .env.local and restart.`,
        );
        return;
      }
      setFile(f);
      if (f && !deckName) setDeckName(stemFromFilename(f.name));
    },
    [deckName, maxBytes, maxUploadMb],
  );

  async function uploadAndExtract() {
    setError(null);
    if (!file) {
      setError("Choose a PDF or Word .docx file first.");
      return;
    }
    const title = buildDeckTitle(deckName, subject, file);
    if (!title) {
      setError("Add a deck name or use a file with a valid filename.");
      return;
    }

    setBusy(true);
    try {
      const { deckId } = await createAndUploadDeckSource(file, title, { maxUploadMb });
      router.push(`/decks/${deckId}/read`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fg-create">
      <BackToLibraryLink className="mb-5 -ml-1" />

      <div className="fg-create-heading-row">
        <h1 className="fg-create-title">Create a new deck</h1>
        <div className="fg-create-dots" aria-hidden>
          <span className="fg-create-dot fg-create-dot-active" />
          <span className="fg-create-dot" />
          <span className="fg-create-dot" />
        </div>
      </div>
      <p className="fg-create-lead">
        Drop a PDF or Word (.docx) — notes, a chapter, anything with real text. We store it
        safely, pull out readable chunks, then you run{" "}
        <strong>Generate cards</strong> from the Library when you&apos;re ready (server
        needs <code className="rounded bg-black/30 px-1">GEMINI_API_KEY</code>).
      </p>
      <p className="fg-create-tip">
        <strong>Why duplicates?</strong> Each time you finish this flow we create a{" "}
        <em>new</em> library deck (new row), even if the file name is the same. Use{" "}
        <Link href="/decks" className="text-p-sage-bright hover:text-p-cream hover:underline">
          Library
        </Link>{" "}
        to pick the deck you want, then <strong>View cards</strong> after generation.
      </p>

      <label className="fg-create-drop">
        <input
          type="file"
          accept={ACCEPT_DECK_SOURCE}
          className="fg-create-file-input"
          aria-label="Choose PDF or Word document"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <span className="fg-create-drop-icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M14 2v6h6M12 18v-6m0 0l-2.5 2.5M12 12l2.5 2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
        {file ? (
          <>
            <span className="fg-create-filename">{file.name}</span>
            <span className="fg-create-filesize">{formatFileSize(file.size)}</span>
          </>
        ) : (
          <>
            <span className="fg-create-drop-title">Drop a PDF or .docx here</span>
            <span className="fg-create-drop-sub">or click to browse</span>
          </>
        )}
      </label>

      <div className="fg-create-field">
        <label htmlFor={idDeck} className="fg-create-label">
          Deck name
        </label>
        <input
          id={idDeck}
          type="text"
          className="fg-create-input"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="e.g. Chapter 4 — Quadratics"
          autoComplete="off"
        />
      </div>

      <div className="fg-create-field">
        <label htmlFor={idSubject} className="fg-create-label">
          Subject area
        </label>
        <input
          id={idSubject}
          type="text"
          className="fg-create-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Mathematics"
          autoComplete="off"
        />
      </div>

      {error ? (
        <p className="fg-create-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="fg-create-pipeline-note">
        Max size respects <code className="rounded bg-black/30 px-1">MAX_UPLOAD_MB</code>{" "}
        (currently {maxUploadMb} MB on this server). PDFs need a real <strong>text layer</strong>{" "}
        (scanned pages extract little).
        For Word, use <strong>.docx</strong> — not legacy .doc. Prefer export-as-PDF or Save as
        .docx from the app where you wrote the notes.
      </p>

      <button
        type="button"
        className="fg-create-submit"
        disabled={busy || !file}
        onClick={uploadAndExtract}
      >
        {busy ? "Uploading & extracting…" : "Upload & extract"}
      </button>
    </div>
  );
}
