const mb = (n: number) => n * 1024 * 1024;

/** Server-side max upload bytes (default 20 MB). */
export function maxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_MB;
  const n = raw ? Number.parseInt(raw, 10) : 20;
  if (!Number.isFinite(n) || n < 1 || n > 100) return mb(20);
  return mb(n);
}

export function chunkCharTarget(): number {
  const raw = process.env.CHUNK_CHAR_TARGET;
  const n = raw ? Number.parseInt(raw, 10) : 3200;
  if (!Number.isFinite(n) || n < 500) return 3200;
  return Math.min(n, 50_000);
}

export function chunkOverlapChars(): number {
  const raw = process.env.CHUNK_OVERLAP_CHARS;
  const n = raw ? Number.parseInt(raw, 10) : 400;
  if (!Number.isFinite(n) || n < 0) return 400;
  return Math.min(n, chunkCharTarget() - 100);
}
