/** UTC calendar day (YYYY-MM-DD) from an ISO timestamp. */
export function utcDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function prevUtcDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Counts consecutive UTC calendar days with at least one review, walking backward
 * from the most recent day that has activity (not necessarily today).
 */
export function consecutiveStudyDaysFromReviews(reviewedAtIsos: string[]): number {
  if (!reviewedAtIsos.length) return 0;
  const days = new Set(reviewedAtIsos.map(utcDateKey));
  const sortedDesc = [...days].sort((a, b) => b.localeCompare(a));
  const newest = sortedDesc[0]!;
  let streak = 0;
  let cursor = newest;
  while (days.has(cursor)) {
    streak += 1;
    cursor = prevUtcDay(cursor);
  }
  return streak;
}

export function reviewsInRollingWindow(reviewedAtIsos: string[], since: Date): number {
  const t = since.getTime();
  return reviewedAtIsos.filter((iso) => new Date(iso).getTime() >= t).length;
}
