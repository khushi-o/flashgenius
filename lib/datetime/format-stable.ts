/**
 * Format timestamps for UI in a way that matches between SSR and browser hydration.
 * `toLocaleString(undefined, …)` uses the runtime default locale/timezone and causes
 * React hydration mismatches in client components.
 */
export function formatStableDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: true,
  }).format(d);
}
