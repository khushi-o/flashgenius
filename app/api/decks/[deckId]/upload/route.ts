import { requireSessionUser } from "@/lib/api/route-auth";
import { maxUploadBytes } from "@/lib/constants/uploads";
import {
  devDetail,
  devDetailFromError,
  finalizeDeckIngestion,
  setDeckError,
} from "@/lib/decks/ingest-deck-source";
import { DOCX_MIME } from "@/lib/decks/upload-source-types";
import { isPdfBuffer } from "@/lib/pdf/is-pdf";
import { sanitizeFilenameSegment } from "@/lib/pdf/sanitize-filename";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
/** Vercel clamps to plan max (e.g. 60s Hobby, 300s Pro). */
export const maxDuration = 300;

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

type Ctx = { params: Promise<{ deckId: string }> };

type FinalizeJson = {
  finalize?: boolean;
  object_path?: string;
  original_filename?: string;
};

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
  const ctLower = contentType.toLowerCase();

  if (ctLower.includes("application/json")) {
    let body: FinalizeJson;
    try {
      body = (await request.json()) as FinalizeJson;
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON body.", ...devDetailFromError(e) },
        { status: 400 },
      );
    }

    if (body.finalize !== true) {
      return NextResponse.json(
        { error: 'Expected { "finalize": true, "object_path": "...", "original_filename": "..." }.' },
        { status: 400 },
      );
    }

    const objectPath = typeof body.object_path === "string" ? body.object_path.trim() : "";
    const originalFilename =
      typeof body.original_filename === "string" && body.original_filename.trim()
        ? body.original_filename.trim()
        : "upload";

    const expectedPrefix = `${user.id}/${deckRow.id}/`;
    if (!objectPath || !objectPath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid or unauthorized storage path." }, { status: 400 });
    }

    const maxBytes = maxUploadBytes();
    const { data: blob, error: dlErr } = await supabase.storage.from("pdfs").download(objectPath);
    if (dlErr || !blob) {
      await setDeckError(supabase, deckRow.id, user.id, "Could not read uploaded file from storage.");
      return NextResponse.json(
        {
          error: "Could not load the file from storage. Try uploading again.",
          ...devDetail(dlErr?.message || "download failed"),
        },
        { status: 502 },
      );
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(await blob.arrayBuffer());
    } catch (e) {
      console.error("[decks/upload] finalize arrayBuffer", e);
      return NextResponse.json(
        { error: "Could not read stored file bytes.", ...devDetailFromError(e) },
        { status: 500 },
      );
    }

    if (buf.length === 0) {
      return NextResponse.json({ error: "Stored file is empty." }, { status: 400 });
    }

    if (buf.length > maxBytes) {
      return NextResponse.json(
        {
          error: `Stored file exceeds the configured limit (max ${Math.round(maxBytes / (1024 * 1024))} MB).`,
        },
        { status: 413 },
      );
    }

    const isPdf = isPdfBuffer(buf);
    const isDocx =
      !isPdf &&
      (originalFilename.toLowerCase().endsWith(".docx") ||
        (blob.type || "").toLowerCase() === DOCX_MIME.toLowerCase());
    if (!isPdf && !isDocx) {
      return NextResponse.json(
        {
          error:
            "File in storage is not a supported PDF or .docx. Remove it from Storage and upload again.",
        },
        { status: 400 },
      );
    }

    const kind: "pdf" | "docx" = isPdf ? "pdf" : "docx";
    const safeName = storageFilenameForKind(originalFilename, kind);

    try {
      await supabase
        .from("decks")
        .update({ status: "uploading", generation_error: null })
        .eq("id", deckRow.id)
        .eq("user_id", user.id);

      return finalizeDeckIngestion({
        supabase,
        deckId: deckRow.id,
        userId: user.id,
        buf,
        kind,
        objectPath,
        sourceFilename: originalFilename || safeName,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[decks/upload] finalize", e);
      try {
        await setDeckError(supabase, deckRow.id, user.id, "Unexpected error during upload.");
      } catch (persistErr) {
        console.error("[decks/upload] setDeckError failed", persistErr);
      }
      const debug =
        process.env.NODE_ENV === "development" || process.env.UPLOAD_ROUTE_DEBUG === "1";
      return NextResponse.json(
        { error: "Upload could not complete.", ...(debug ? { detail: message } : {}) },
        { status: 500 },
      );
    }
  }

  if (!ctLower.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a file field, or JSON finalize payload." },
      { status: 415 },
    );
  }

  const maxBytes = maxUploadBytes();
  const maxMb = Math.round(maxBytes / (1024 * 1024));

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    const cl = request.headers.get("content-length");
    const contentLen = cl ? Number.parseInt(cl, 10) : NaN;

    if (Number.isFinite(contentLen) && contentLen > maxBytes) {
      const approxMb = Math.max(1, Math.round(contentLen / (1024 * 1024)));
      return NextResponse.json(
        {
          error: `Upload exceeds the configured limit (about ${approxMb} MB; max ${maxMb} MB). Set MAX_UPLOAD_MB and restart the server.`,
          ...devDetailFromError(e),
        },
        { status: 413 },
      );
    }

    return NextResponse.json(
      {
        error:
          "The server could not parse this upload (multipart may be invalid, truncated, or blocked by a smaller platform body limit than this app). For files over ~4 MB on Vercel, the app uploads directly to Storage — use the latest client.",
        ...devDetailFromError(e),
      },
      { status: 400 },
    );
  }

  const entry = formData.get("file");
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: 'Missing file field "file".' }, { status: 400 });
  }

  if (entry.size === 0) {
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }

  if (entry.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).` },
      { status: 413 },
    );
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(await entry.arrayBuffer());
  } catch (e) {
    console.error("[decks/upload] arrayBuffer", e);
    return NextResponse.json(
      { error: "Could not read the uploaded file data.", ...devDetailFromError(e) },
      { status: 400 },
    );
  }

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

    return finalizeDeckIngestion({
      supabase,
      deckId: deckRow.id,
      userId: user.id,
      buf,
      kind,
      objectPath,
      sourceFilename: entry.name || safeName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[decks/upload]", e);
    try {
      await setDeckError(supabase, deckRow.id, user.id, "Unexpected error during upload.");
    } catch (persistErr) {
      console.error("[decks/upload] setDeckError failed", persistErr);
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
