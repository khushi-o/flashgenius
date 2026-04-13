/**
 * SM-2–style scheduling (SuperMemo 2 interval + ease factor).
 * Quality is 0–5 (classic SM-2); grades map in `gradeToSm2Quality`.
 */

export type Grade = "again" | "hard" | "good" | "easy";

export type CardScheduleState = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

export function gradeToSm2Quality(grade: Grade): number {
  switch (grade) {
    case "again":
      return 0;
    case "hard":
      return 2;
    case "good":
      return 4;
    case "easy":
      return 5;
    default:
      return 3;
  }
}

const MIN_EASE = 1.3;

/**
 * One SM-2 update step. `quality` must be 0–5.
 * @see https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */
export function applySm2Update(
  prev: CardScheduleState,
  quality: number,
): CardScheduleState {
  let ef = Number(prev.ease_factor) || 2.5;
  let interval = Number(prev.interval_days) || 0;
  let reps = Number(prev.repetitions) || 0;

  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.max(1, Math.round(interval * ef));
    }
    reps += 1;
  }

  ef += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  if (ef < MIN_EASE) ef = MIN_EASE;
  ef = Math.round(ef * 1000) / 1000;

  return {
    ease_factor: ef,
    interval_days: interval,
    repetitions: reps,
  };
}

export function parseGrade(raw: string | undefined): Grade | null {
  if (!raw) return null;
  const g = raw.trim().toLowerCase();
  if (g === "again" || g === "hard" || g === "good" || g === "easy") return g;
  return null;
}
