type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  __fgGenerateBuckets?: Map<string, Bucket>;
};

function buckets(): Map<string, Bucket> {
  if (!globalStore.__fgGenerateBuckets) {
    globalStore.__fgGenerateBuckets = new Map();
  }
  return globalStore.__fgGenerateBuckets;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function rateLimitDisabled(): boolean {
  const v = process.env.GENERATE_RATE_LIMIT_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function maxPerWindow(): number {
  return parsePositiveInt(process.env.GENERATE_RATE_LIMIT_MAX, 30);
}

function windowMs(): number {
  const mins = parsePositiveInt(process.env.GENERATE_RATE_LIMIT_WINDOW_MINUTES, 60);
  return mins * 60 * 1000;
}

export type GenerateRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Simple in-memory sliding cap per user id (per server instance on serverless).
 * Tune with GENERATE_RATE_LIMIT_* or disable locally with GENERATE_RATE_LIMIT_DISABLED=1.
 */
export function checkGenerateRateLimit(userId: string): GenerateRateLimitResult {
  if (rateLimitDisabled()) {
    return { ok: true };
  }

  const now = Date.now();
  const win = windowMs();
  const max = maxPerWindow();
  const map = buckets();
  const b = map.get(userId);
  if (!b || now > b.resetAt) {
    map.set(userId, { count: 1, resetAt: now + win });
    return { ok: true };
  }
  if (b.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  b.count += 1;
  return { ok: true };
}
