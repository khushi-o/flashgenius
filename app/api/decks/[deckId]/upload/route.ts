import { requireSessionUser } from "@/lib/api/route-auth";
import { chunkCharTarget, chunkOverlapChars, maxUploadBytes } from "@/lib/constants/uploads";
import { chunkPlainText } from "@/lib/pdf/chunk-plaintext";
import { extractTextFromPdf } from "@/lib/pdf/extract-text";
import { isPdfBuffer } from "@/lib/pdf/is-pdf";
import { sanitizeFilenameSegment } from "@/lib/pdf/sanitize-filename";
import { stripNulBytes } from "@/lib/pdf/sanitize-pg-text";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

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
  if (!isPdfBuffer(buf)) {
    return NextResponse.json(
      { error: "Not a valid PDF (missing %PDF header)." },
      { status: 400 },
    );
  }

  const safeName = sanitizeFilenameSegment(entry.name || "upload.pdf");
  const objectPath = `${user.id}/${deckRow.id}/${Date.now()}-${safeName}`;

  try {
    await supabase
      .from("decks")
      .update({ status: "uploading", generation_error: null })
      .eq("id", deckRow.id)
      .eq("user_id", user.id);

    const { error: upErr } = await supabase.storage.from("pdfs").upload(objectPath, buf, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (upErr) {
      await setDeckError(
        supabase,
        deckRow.id,
        user.id,
        "Could not store PDF. Try again.",
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
    try {
      text = await extractTextFromPdf(buf);
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

    text = stripNulBytes(text);

    if (!text) {
      await setDeckError(
        supabase,
        deckRow.id,
        user.id,
        "No extractable text in this PDF.",
      );
      return NextResponse.json(
        { error: "No extractable text in this PDF." },
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
