/** Avoid open redirects: only same-origin paths allowed. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/decks";
  }
  return raw;
}
