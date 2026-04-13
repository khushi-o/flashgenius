export function maxCardsPerDeck(): number {
  const raw = process.env.MAX_CARDS_PER_DECK;
  const n = raw ? Number.parseInt(raw, 10) : 80;
  if (!Number.isFinite(n) || n < 1) return 80;
  return Math.min(n, 200);
}

/** Max deck_chunks to send through Pass A (cost control). */
export function maxChunksForGeneration(): number {
  const raw = process.env.GENERATION_MAX_CHUNKS;
  const n = raw ? Number.parseInt(raw, 10) : 22;
  if (!Number.isFinite(n) || n < 1) return 22;
  return Math.min(n, 60);
}

export function dedupeSimilarityThreshold(): number {
  const raw = process.env.DEDUPE_SIMILARITY_THRESHOLD;
  const n = raw ? Number.parseFloat(raw) : 0.82;
  if (!Number.isFinite(n) || n < 0.5 || n > 0.99) return 0.82;
  return n;
}

export function passBConceptBatchSize(): number {
  return 5;
}

export function passAMaxConceptsPerChunk(): number {
  return 10;
}
