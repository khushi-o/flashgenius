/** Max cards returned for one study queue fetch. */
export function maxReviewSessionSize(): number {
  const raw = process.env.MAX_REVIEW_SESSION_SIZE;
  const n = raw ? Number.parseInt(raw, 10) : 50;
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 200);
}

/** Cap never-reviewed cards in a single queue (mix with due reviews). */
export function maxNewCardsInQueue(): number {
  const raw = process.env.DAILY_NEW_CARD_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : 20;
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, 80);
}
