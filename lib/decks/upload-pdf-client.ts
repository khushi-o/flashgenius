/**
 * Browser-only: create a deck row, upload bytes directly to Supabase Storage, then ask the
 * server to extract from that object. File bytes never go through the Next.js route, so hosting
 * request body limits (e.g. Vercel ~4.5 MB) cannot block large PDFs/.docx files.
 */

import { createClient } from "@/lib/supabase/client";
import { DOCX_MIME } from "@/lib/decks/upload-source-types";

async function parseResponseBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (res.status === 413) {
      return {
        error:
          "The host rejected this HTTP request’s body (413). If you still see this after a refresh, the app may be sending the file through the API instead of Storage — use the latest deploy.",
      };
    }
    const tail =
      res.status >= 500
        ? " This usually means the server crashed or returned an HTML error page — check Vercel → Logs for this request."
        : "";
    return { error: `Server returned ${res.status} (non-JSON response).${tail}` };
  }
}

export type DeckUploadClientOptions = {
  /** Must match server `MAX_UPLOAD_MB` (passed from a Server Component). */
  maxUploadMb: number;
};

export async function createAndUploadDeckSource(
  file: File,
  title: string,
  options: DeckUploadClientOptions,
): Promise<{ deckId: string }> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Deck title is required.");

  const maxBytes = Math.max(1, options.maxUploadMb) * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max is ${options.maxUploadMb} MB — raise MAX_UPLOAD_MB in .env.local and restart.`,
    );
  }

  const createRes = await fetch("/api/decks", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: trimmed.slice(0, 200) }),
  });
  const createJson = await parseResponseBody(createRes);
  if (!createRes.ok) {
    throw new Error(
      typeof createJson.error === "string" ? createJson.error : "Could not create deck.",
    );
  }
  const deck = createJson.deck as { id?: string } | undefined;
  const deckId = deck?.id;
  if (!deckId) throw new Error("Invalid response from server.");

  const prepRes = await fetch(`/api/decks/${deckId}/prepare-upload`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name }),
  });
  const prepJson = await parseResponseBody(prepRes);
  if (!prepRes.ok) {
    throw new Error(
      typeof prepJson.error === "string" ? prepJson.error : "Could not prepare storage upload.",
    );
  }

  const objectPath = prepJson.object_path;
  if (typeof objectPath !== "string" || !objectPath.trim()) {
    throw new Error("Invalid response from server (missing object_path).");
  }

  const hintCt =
    typeof prepJson.content_type === "string" && prepJson.content_type
      ? prepJson.content_type
      : file.type ||
        (file.name.toLowerCase().endsWith(".docx") ? DOCX_MIME : "application/pdf");

  const supabase = createClient();
  const { error: stErr } = await supabase.storage.from("pdfs").upload(objectPath.trim(), file, {
    contentType: file.type || hintCt,
    upsert: false,
  });

  if (stErr) {
    throw new Error(
      stErr.message ||
        "Direct storage upload failed. Check you are signed in and the pdfs bucket policies allow client uploads.",
    );
  }

  const finRes = await fetch(`/api/decks/${deckId}/upload`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      finalize: true,
      object_path: objectPath.trim(),
      original_filename: file.name,
    }),
  });
  const finJson = await parseResponseBody(finRes);
  if (!finRes.ok) {
    const msg = typeof finJson.error === "string" ? finJson.error : "Upload or extraction failed.";
    const detail = typeof finJson.detail === "string" ? ` (${finJson.detail})` : "";
    throw new Error(`${msg}${detail}`);
  }

  return { deckId };
}

/** @deprecated Use `createAndUploadDeckSource` — name kept for imports. */
export const createAndUploadPdf = createAndUploadDeckSource;
