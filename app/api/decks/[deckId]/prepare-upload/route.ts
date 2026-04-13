import { requireSessionUser } from "@/lib/api/route-auth";
import { DOCX_MIME } from "@/lib/decks/upload-source-types";
import { sanitizeFilenameSegment } from "@/lib/pdf/sanitize-filename";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function kindFromFilename(name: string): "pdf" | "docx" | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return null;
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

/**
 * Returns a Storage object path for a client-side upload to the `pdfs` bucket, bypassing the
 * Vercel serverless ~4.5 MB request body limit.
 */
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
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (deckErr || !deckRow) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  let filename = "upload.pdf";
  try {
    const body = (await request.json()) as { filename?: string };
    if (typeof body.filename === "string" && body.filename.trim()) {
      filename = body.filename.trim();
    }
  } catch {
    /* empty body OK */
  }

  const kind = kindFromFilename(filename);
  if (!kind) {
    return NextResponse.json(
      { error: "Filename must end with .pdf or .docx." },
      { status: 400 },
    );
  }

  const safeName = storageFilenameForKind(filename, kind);
  const objectPath = `${user.id}/${deckRow.id}/${Date.now()}-${safeName}`;

  return NextResponse.json({
    object_path: objectPath,
    kind,
    content_type: kind === "pdf" ? "application/pdf" : DOCX_MIME,
  });
}
