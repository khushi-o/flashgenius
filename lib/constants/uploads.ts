const mb = (n: number) => n * 1024 * 1024;

/** When `MAX_UPLOAD_MB` is unset, the server uses this default (see `getServerMaxUploadMb()` for UI). */
export const DEFAULT_MAX_UPLOAD_MB = 10;

/** Max `deck_chunks.content` length persisted per row (generation only needs an excerpt). */
export const DEFAULT_MAX_CHUNK_STORE_CHARS = 8_000;

/** Max `deck_pages.content` length per row (book reader). */
export const DEFAULT_MAX_PAGE_STORE_CHARS = 6_000;

/** Server-side max upload bytes (`MAX_UPLOAD_MB`, 1–50; default 10 MB). */
export function maxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_MB;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_UPLOAD_MB;
  if (!Number.isFinite(n) || n < 1) return mb(DEFAULT_MAX_UPLOAD_MB);
  return mb(Math.min(n, 50));
}

/**
 * Resolved upload limit in MB (`MAX_UPLOAD_MB`). Intended for Server Components to pass into
 * client upload UI so the browser limit matches the API.
 */
export function getServerMaxUploadMb(): number {
  return Math.round(maxUploadBytes() / (1024 * 1024));
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
  const n = raw ? Number.parseInt(raw, 10) : 200;
  if (!Number.isFinite(n) || n < 0) return 200;
  return Math.min(n, chunkCharTarget() - 100);
}

/** Max PDF pages stored in deck_pages per upload (cost / payload cap). */
export function maxPdfPagesStored(): number {
  const raw = process.env.MAX_PDF_PAGES_STORED;
  const n = raw ? Number.parseInt(raw, 10) : 30;
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(n, 60);
}

/** Max chunk rows saved after splitting (upload / extraction cap). */
export function maxChunksPerDeck(): number {
  const raw = process.env.MAX_CHUNKS_PER_DECK;
  const n = raw ? Number.parseInt(raw, 10) : 15;
  if (!Number.isFinite(n) || n < 1) return 15;
  return Math.min(n, 30);
}

export function maxChunkContentStoredChars(): number {
  const raw = process.env.MAX_CHUNK_CONTENT_STORE_CHARS;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_CHUNK_STORE_CHARS;
  if (!Number.isFinite(n) || n < 1_000) return DEFAULT_MAX_CHUNK_STORE_CHARS;
  return Math.min(n, 50_000);
}

export function maxPageContentStoredChars(): number {
  const raw = process.env.MAX_PAGE_CONTENT_STORE_CHARS;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_PAGE_STORE_CHARS;
  if (!Number.isFinite(n) || n < 500) return DEFAULT_MAX_PAGE_STORE_CHARS;
  return Math.min(n, 50_000);
}
