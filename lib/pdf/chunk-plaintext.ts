export type DeckChunkRow = {
  chunk_index: number;
  content: string;
  page_start: number | null;
  page_end: number | null;
};

/**
 * Split normalized text into overlapping chunks for downstream generation.
 * Page boundaries are omitted here (Phase 2); optional upgrade uses per-page text.
 */
export function chunkPlainText(
  fullText: string,
  targetChars: number,
  overlap: number,
): DeckChunkRow[] {
  const normalized = fullText
    .replace(/\r\n/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/ +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return [];

  if (normalized.length <= targetChars) {
    return normalized.length > 12
      ? [
          {
            chunk_index: 0,
            content: normalized,
            page_start: null,
            page_end: null,
          },
        ]
      : [];
  }

  const safeOverlap = Math.min(overlap, Math.max(0, targetChars - 200));
  const out: DeckChunkRow[] = [];
  let i = 0;

  while (i < normalized.length) {
    let end = Math.min(normalized.length, i + targetChars);
    if (end < normalized.length) {
      const slice = normalized.slice(i, end);
      const paraBreak = slice.lastIndexOf("\n\n");
      if (paraBreak > targetChars * 0.35) {
        end = i + paraBreak;
      } else {
        const sp = slice.lastIndexOf(" ");
        if (sp > targetChars * 0.45) end = i + sp;
      }
    }

    const piece = normalized.slice(i, end).trim();
    if (piece.length > 40) {
      out.push({
        chunk_index: out.length,
        content: piece,
        page_start: null,
        page_end: null,
      });
    } else if (end < normalized.length) {
      i = Math.max(i + 1, end);
      continue;
    }

    if (end >= normalized.length) break;
    i = Math.max(end - safeOverlap, i + 1);
  }

  return out;
}
