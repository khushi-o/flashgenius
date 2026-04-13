/** Minimal card fields for library progress + “due” stats. */
export type CardScheduleRow = {
  deck_id: string;
  next_review_at: string | null;
  interval_days: number;
  repetitions: number;
};

export function cardBucket(c: CardScheduleRow): "new" | "learning" | "mature" {
  if (c.next_review_at === null) return "new";
  if (c.interval_days >= 21) return "mature";
  return "learning";
}

/** Cards that would enter the study queue (new or review due now). */
export function isDueForStudy(c: CardScheduleRow, now: Date = new Date()): boolean {
  if (c.next_review_at === null) return true;
  return new Date(c.next_review_at) <= now;
}

export type DeckCardStats = { new: number; learning: number; mature: number };

export function aggregateDeckStats(rows: CardScheduleRow[]): Map<string, DeckCardStats> {
  const map = new Map<string, DeckCardStats>();
  for (const r of rows) {
    const cur = map.get(r.deck_id) ?? { new: 0, learning: 0, mature: 0 };
    cur[cardBucket(r)] += 1;
    map.set(r.deck_id, cur);
  }
  return map;
}

export function masteryPercent(stats: DeckCardStats): number {
  const total = stats.new + stats.learning + stats.mature;
  if (!total) return 0;
  return Math.round((100 * stats.mature) / total);
}
