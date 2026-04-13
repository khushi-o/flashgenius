import { requireSessionUser } from "@/lib/api/route-auth";
import { chunkCharTarget, chunkOverlapChars, maxPdfPagesStored, maxUploadBytes } from "@/lib/constants/uploads";
import { isMissingDeckPagesRelationError } from "@/lib/supabase/deck-pages-errors";
import { DOCX_MIME } from "@/lib/decks/upload-source-types";
import { extractDocxText } from "@/lib/docx/extract-docx-text";
import { chunkPlainText } from "@/lib/pdf/chunk-plaintext";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { isPdfBuffer } from "@/lib/pdf/is-pdf";
import { sanitizeFilenameSegment } from "@/lib/pdf/sanitize-filename";
import { stripNulBytes } from "@/lib/pdf/sanitize-pg-text";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

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

type Ctx = { params: Promise<{ deckId: string }> };

function devDetail(message: string) {
  return process.env.NODE_ENV === "development" ? { detail: message } : {};
}

function looksDocxUpload(entry: File): boolean {
  const name = (entry.name || "").toLowerCase();
  const t = (entry.type || "").toLowerCase();
  return name.endsWith(".docx") || t === DOCX_MIME.toLowerCase();
}

function storageFilenameForKind(rawName: string, kind: "pdf" | "docx"): string {
  const def = kind === "pdf" ? "upload.pdf" : "upload.docx";
  const base = sanitizeFilenameSegment(rawName || def);
  const ext = kind === "pdf" ? ".pdf" : ".docx";
  if (base.toLowerCase().endsWith(ext)) return base;
  const trimmed = base.replace(/\.[^.]+$/, "");
  return `${trimmed || "upload"}${ext}`;
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const { deckId } = await ctx.params;
  const id = typeof deckId === "string" ? deckId.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Invalid deck id." }, { status: 400 });
  }

  const { supabase, user } = auth;

  const { data: deckRow, error: deckErr } = await supabase
    .from("decks")
    .select("id, user_id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (deckErr || !deckRow) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a file field." },
      { status: 415 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const entry = formData.get("file");
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: 'Missing file field "file".' }, { status: 400 });
  }

  if (entry.size === 0) {
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }

  const maxBytes = maxUploadBytes();
  if (entry.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).` },
      { status: 413 },
    );
  }

  const buf = Buffer.from(await entry.arrayBuffer());
  const isPdf = isPdfBuffer(buf);
  const isDocx = looksDocxUpload(entry);
  if (!isPdf && !isDocx) {
    return NextResponse.json(
      {
        error:
          "Upload a PDF or a Word document (.docx). Legacy .doc is not supported — save as .docx in Word or Google Docs.",
      },
      { status: 400 },
    );
  }

  const kind: "pdf" | "docx" = isPdf ? "pdf" : "docx";
  const storageContentType = kind === "pdf" ? "application/pdf" : DOCX_MIME;
  const safeName = storageFilenameForKind(entry.name, kind);
  const objectPath = `${user.id}/${deckRow.id}/${Date.now()}-${safeName}`;

  try {
    await supabase
      .from("decks")
      .update({ status: "uploading", generation_error: null })
      .eq("id", deckRow.id)
      .eq("user_id", user.id);

    const { error: upErr } = await supabase.storage.from("pdfs").upload(objectPath, buf, {
      contentType: storageContentType,
      upsert: false,
    });

    if (upErr) {
      await setDeckError(
        supabase,
        deckRow.id,
        user.id,
        "Could not store source file. Try again.",
      );
      return NextResponse.json(
        {
          error: "Storage upload failed. Check the pdfs bucket and policies.",
          ...devDetail(upErr.message),
        },
        { status: 502 },
      );
    }

    await supabase
      .from("decks")
      .update({
        status: "extracting",
        source_storage_path: objectPath,
        source_filename: entry.name || safeName,
      })
      .eq("id", deckRow.id)
      .eq("user_id", user.id);

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
        await setDeckError(
          supabase,
          deckRow.id,
          user.id,
          "Could not read text from this PDF.",
        );
        const msg =
          extractErr instanceof Error ? extractErr.message : "PDF text extraction failed.";
        return NextResponse.json(
          { error: "PDF text extraction failed (file may be image-only).", ...devDetail(msg) },
          { status: 422 },
        );
      }
    } else {
      try {
        text = await extractDocxText(buf);
      } catch (extractErr) {
        await setDeckError(
          supabase,
          deckRow.id,
          user.id,
          "Could not read text from this Word file.",
        );
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
        deckRow.id,
        user.id,
        kind === "pdf" ? "No extractable text in this PDF." : "No extractable text in this document.",
      );
      return NextResponse.json(
        {
          error:
            kind === "pdf"
              ? "No extractable text in this PDF."
              : "No extractable text in this document.",
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

    await supabase.from("deck_chunks").delete().eq("deck_id", deckRow.id);

    let deckPagesWritable = true;
    const delPages = await supabase.from("deck_pages").delete().eq("deck_id", deckRow.id);
    if (delPages.error) {
      if (isMissingDeckPagesRelationError(delPages.error)) {
        deckPagesWritable = false;
      } else {
        await setDeckError(
          supabase,
          deckRow.id,
          user.id,
          "Could not clear old page rows.",
        );
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
            deck_id: deckRow.id,
            chunk_index: r.chunk_index,
            content: stripNulBytes(r.content),
            page_start: r.page_start,
            page_end: r.page_end,
          })),
        );

        if (insErr) {
          await setDeckError(
            supabase,
            deckRow.id,
            user.id,
            "Could not save extracted chunks.",
          );
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
            deck_id: deckRow.id,
            page_number: p.page_number,
            content: p.content,
          })),
        );
        if (pgErr) {
          if (isMissingDeckPagesRelationError(pgErr)) {
            deckPagesWritable = false;
            break;
          }
          await setDeckError(
            supabase,
            deckRow.id,
            user.id,
            "Could not save per-page text.",
          );
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
      .eq("id", deckRow.id)
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      deck_id: deckRow.id,
      storage_path: objectPath,
      chunk_count: rows.length,
      page_count: pageRows.length,
      deck_pages_saved: deckPagesWritable,
      book_view_ready: deckPagesWritable,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[decks/upload]", e);
    await setDeckError(
      supabase,
      deckRow.id,
      user.id,
      "Unexpected error during upload.",
    );
    return NextResponse.json(
      { error: "Upload could not complete.", ...devDetail(message) },
      { status: 500 },
    );
  }
}
