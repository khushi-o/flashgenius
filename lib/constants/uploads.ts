const mb = (n: number) => n * 1024 * 1024;

/** Server-side max upload bytes (default 20 MB; set `MAX_UPLOAD_MB` up to 500). */
export function maxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_MB;
  const n = raw ? Number.parseInt(raw, 10) : 20;
  if (!Number.isFinite(n) || n < 1) return mb(20);
  return mb(Math.min(n, 500));
}

export function chunkCharTarget(): number {
  const raw = process.env.CHUNK_CHAR_TARGET;
  /** Default ~2k so more PDFs split into multiple chunks (was 3200: long PDFs with modest extract often became a single chunk). */
  const n = raw ? Number.parseInt(raw, 10) : 2000;
  if (!Number.isFinite(n) || n < 800) return 2000;
  return Math.min(n, 50_000);
}

export function chunkOverlapChars(): number {
  const raw = process.env.CHUNK_OVERLAP_CHARS;
  const n = raw ? Number.parseInt(raw, 10) : 250;
  if (!Number.isFinite(n) || n < 0) return 250;
  return Math.min(n, chunkCharTarget() - 100);
}

/** Max PDF pages stored in deck_pages per upload (cost / payload cap). */
export function maxPdfPagesStored(): number {
  const raw = process.env.MAX_PDF_PAGES_STORED;
  const n = raw ? Number.parseInt(raw, 10) : 200;
  if (!Number.isFinite(n) || n < 1) return 200;
  return Math.min(n, 500);
}
