/**
 * PostgREST / Postgres signals that `deck_pages` is not deployed (migration missing).
 * Must not treat RLS / permission errors as “missing table”.
 */
export function isMissingDeckPagesRelationError(err: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!err) return false;
  const m = (err.message ?? "").toLowerCase();
  if (/permission denied|row-level security|rls|42501/.test(m)) return false;
  if (err.code === "PGRST205") return true;
  if (/42p01/.test(m)) return true;
  return /deck_pages|schema cache|relation .* does not exist/.test(m);
}
