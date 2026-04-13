import { chunkCharTarget, chunkOverlapChars, maxPdfPagesStored } from "@/lib/constants/uploads";
import { isMissingDeckPagesRelationError } from "@/lib/supabase/deck-pages-errors";
import { chunkPlainText } from "@/lib/pdf/chunk-plaintext";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { pdfExtractUserMessage } from "@/lib/pdf/pdf-extract-user-message";
import { stripNulBytes } from "@/lib/pdf/sanitize-pg-text";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function maxChunks(): number {
  const raw = process.env.MAX_CHUNKS_PER_DECK;
  const n = raw ? Number.parseInt(raw, 10) : 120;
  if (!Number.isFinite(n) || n < 1) return 120;
  return Math.min(n, 500);
}

async function setDeckError(
  supabase: SupabaseClient,
  deckId: string,
  userId: string,
  message: string,
) {
  await supabase
    .from("decks")
    .update({
      status: "error",
      generation_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId)
    .eq("user_id", userId);
}

function devDetail(message: string) {
  return process.env.NODE_ENV === "development" ? { detail: message } : {};
}

function devDetailFromError(err: unknown) {
  if (process.env.NODE_ENV !== "development") return {};
  if (!(err instanceof Error)) return { detail: String(err) };
  let detail = err.message;
  const c = err.cause;
  if (c instanceof Error) detail += ` | cause: ${c.message}`;
  else if (c !== undefined && c !== null) detail += ` | cause: ${String(c)}`;
  return { detail };
}

export type DeckIngestArgs = {
  supabase: SupabaseClient;
  deckId: string;
  userId: string;
  buf: Buffer;
  kind: "pdf" | "docx";
  objectPath: string;
  sourceFilename: string;
};

/**
 * After the PDF or .docx bytes are in Storage at `objectPath`, run extraction, chunking, and DB writes.
 */
export async function finalizeDeckIngestion(args: DeckIngestArgs): Promise<NextResponse> {
  const { supabase, deckId, userId, buf, kind, objectPath, sourceFilename } = args;

  try {
    await supabase
      .from("decks")
      .update({
        status: "extracting",
        source_storage_path: objectPath,
        source_filename: sourceFilename,
      })
      .eq("id", deckId)
      .eq("user_id", userId);

    let text: string;
    let pageRows: { page_number: number; content: string }[] = [];
    const maxChars = 120_000;
    const pageCap = maxPdfPagesStored();

    if (kind === "pdf") {
      try {
        const extracted = await extractPdfText(buf);
        text = extracted.fullText;
        pageRows = extracted.pages
          .filter((p) => p.text.length > 0)
          .slice(0, pageCap)
          .map((p) => ({
            page_number: p.pageNumber,
            content: stripNulBytes(p.text).slice(0, maxChars),
          }));
        if (!pageRows.length && text.length > 0) {
          pageRows = [
            {
              page_number: 1,
              content: stripNulBytes(text).slice(0, maxChars),
            },
          ];
        }
      } catch (extractErr) {
        await setDeckError(supabase, deckId, userId, "Could not read text from this PDF.");
        const msg =
          extractErr instanceof Error ? extractErr.message : "PDF text extraction failed.";
        const { error, code } = pdfExtractUserMessage(extractErr);
        return NextResponse.json({ error, code, ...devDetail(msg) }, { status: 422 });
      }
    } else {
      try {
        const { extractDocxText } = await import("@/lib/docx/extract-docx-text");
        text = await extractDocxText(buf);
      } catch (extractErr) {
        await setDeckError(supabase, deckId, userId, "Could not read text from this Word file.");
        const msg =
          extractErr instanceof Error ? extractErr.message : "Word document text extraction failed.";
        return NextResponse.json(
          {
            error:
              "Could not read this .docx file (it may be corrupt or not a real Word document).",
            ...devDetail(msg),
          },
          { status: 422 },
        );
      }
      text = text.trim();
      if (text.length > 0) {
        pageRows = [{ page_number: 1, content: stripNulBytes(text).slice(0, maxChars) }];
      }
    }

    text = stripNulBytes(text);

    if (!text.trim()) {
      await setDeckError(
        supabase,
        deckId,
        userId,
        kind === "pdf" ? "No extractable text in this PDF." : "No extractable text in this document.",
      );
      return NextResponse.json(
        {
          error:
            kind === "pdf"
              ? "This PDF opened but has no selectable text (often scanned pages or flattened artwork). Use a digital PDF with a text layer, or run OCR first, then upload."
              : "No extractable text in this document.",
          code: kind === "pdf" ? "PDF_EMPTY_TEXT" : "DOC_EMPTY_TEXT",
        },
        { status: 422 },
      );
    }

    const target = chunkCharTarget();
    const overlap = chunkOverlapChars();
    let rows = chunkPlainText(text, target, overlap);
    const cap = maxChunks();
    if (rows.length > cap) {
      rows = rows.slice(0, cap).map((r, i) => ({ ...r, chunk_index: i }));
    }

    await supabase.from("deck_chunks").delete().eq("deck_id", deckId);

    let deckPagesWritable = true;
    const delPages = await supabase.from("deck_pages").delete().eq("deck_id", deckId);
    if (delPages.error) {
      if (isMissingDeckPagesRelationError(delPages.error)) {
        deckPagesWritable = false;
      } else {
        await setDeckError(supabase, deckId, userId, "Could not clear old page rows.");
        return NextResponse.json(
          {
            error: "Failed to prepare page storage.",
            ...devDetail(
              `${delPages.error.message}${delPages.error.code ? ` (${delPages.error.code})` : ""}`,
            ),
          },
          { status: 500 },
        );
      }
    }

    const insertBatchSize = 40;
    if (rows.length) {
      for (let offset = 0; offset < rows.length; offset += insertBatchSize) {
        const slice = rows.slice(offset, offset + insertBatchSize);
        const { error: insErr } = await supabase.from("deck_chunks").insert(
          slice.map((r) => ({
            deck_id: deckId,
            chunk_index: r.chunk_index,
            content: stripNulBytes(r.content),
            page_start: r.page_start,
            page_end: r.page_end,
          })),
        );

        if (insErr) {
          await setDeckError(supabase, deckId, userId, "Could not save extracted chunks.");
          return NextResponse.json(
            {
              error: "Failed to save text chunks.",
              ...devDetail(`${insErr.message}${insErr.code ? ` (${insErr.code})` : ""}`),
            },
            { status: 500 },
          );
        }
      }
    }

    if (pageRows.length && deckPagesWritable) {
      for (let offset = 0; offset < pageRows.length; offset += insertBatchSize) {
        const slice = pageRows.slice(offset, offset + insertBatchSize);
        const { error: pgErr } = await supabase.from("deck_pages").insert(
          slice.map((p) => ({
            deck_id: deckId,
            page_number: p.page_number,
            content: p.content,
          })),
        );
        if (pgErr) {
          if (isMissingDeckPagesRelationError(pgErr)) {
            deckPagesWritable = false;
            break;
          }
          await setDeckError(supabase, deckId, userId, "Could not save per-page text.");
          return NextResponse.json(
            {
              error: "Failed to save page text.",
              ...devDetail(`${pgErr.message}${pgErr.code ? ` (${pgErr.code})` : ""}`),
            },
            { status: 500 },
          );
        }
      }
    }

    await supabase
      .from("decks")
      .update({
        status: "ready",
        generation_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deckId)
      .eq("user_id", userId);

    return NextResponse.json({
      ok: true,
      deck_id: deckId,
      storage_path: objectPath,
      chunk_count: rows.length,
      page_count: pageRows.length,
      deck_pages_saved: deckPagesWritable,
      book_view_ready: deckPagesWritable,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[decks/ingest]", e);
    try {
      await setDeckError(supabase, deckId, userId, "Unexpected error during upload.");
    } catch (persistErr) {
      console.error("[decks/ingest] setDeckError failed", persistErr);
    }
    const debug =
      process.env.NODE_ENV === "development" || process.env.UPLOAD_ROUTE_DEBUG === "1";
    return NextResponse.json(
      {
        error: "Upload could not complete.",
        ...(debug ? { detail: message } : {}),
      },
      { status: 500 },
    );
  }
}

export { devDetailFromError, setDeckError, devDetail };
