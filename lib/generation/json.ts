/** Parse model output: JSON, optional markdown fences, extract array/object. */
export function safeParseJSON(raw: string): unknown {
  const t = raw.trim();
  try {
    return JSON.parse(t);
  } catch {
    /* continue */
  }
  const fence = "\u0060".repeat(3);
  const stripped = t
    .replace(new RegExp(`^${fence}json\\n?|^${fence}\\n?|${fence}$`, "gim"), "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    /* continue */
  }
  const match = stripped.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      /* continue */
    }
  }
  return null;
}
