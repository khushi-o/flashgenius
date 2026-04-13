const WINDOW_MS = 60 * 60 * 1000;
const MAX = 10;

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

export function checkGenerateRateLimit(userId: string): boolean {
  const now = Date.now();
  const map = buckets();
  const b = map.get(userId);
  if (!b || now > b.resetAt) {
    map.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX) return false;
  b.count += 1;
  return true;
}
