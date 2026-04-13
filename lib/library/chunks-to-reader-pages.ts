export type DeckChunkPick = {
  chunk_index: number;
  content: string;
  page_start: number | null;
  page_end: number | null;
};

export type ReaderPageShape = {
  page_number: number;
  content: string;
  summary: string | null;
};

/** Build pseudo–book pages from `deck_chunks` when `deck_pages` is missing or empty. */
export function deckChunksToReaderPages(chunks: DeckChunkPick[]): ReaderPageShape[] {
  const sorted = [...chunks].sort((a, b) => a.chunk_index - b.chunk_index);
  return sorted.map((c) => ({
    page_number: c.chunk_index + 1,
    content: c.content,
    summary: null,
  }));
}
