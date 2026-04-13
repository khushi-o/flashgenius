/** Safe single path segment for storage (no slashes, no traversal). */
export function sanitizeFilenameSegment(name: string, maxLen = 120): string {
  const base = name.split(/[/\\]/).pop() ?? "document.pdf";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  const trimmed = cleaned.slice(0, maxLen);
  return trimmed || "document.pdf";
}
