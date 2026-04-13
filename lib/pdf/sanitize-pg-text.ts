/** Postgres `text` rejects NUL (U+0000). PDF text extraction can include them. */
export function stripNulBytes(s: string): string {
  return s.includes("\0") ? s.replaceAll("\u0000", "") : s;
}
