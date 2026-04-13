const TONE_LABELS: Record<string, string> = {
  "exam-crisp": "exam crisp",
  "deep-understanding": "deep understanding",
  "quick-recall": "quick recall",
};

export function tonePresetLabel(tone: string): string {
  return TONE_LABELS[tone] ?? tone.replace(/-/g, " ");
}

/** Split "Algebra · Mathematics" from create form into display name + category. */
export function splitDeckTitle(title: string): { name: string; category: string | null } {
  const t = title.trim();
  const idx = t.lastIndexOf(" · ");
  if (idx === -1) return { name: t, category: null };
  const name = t.slice(0, idx).trim() || t;
  const category = t.slice(idx + 3).trim() || null;
  return { name, category };
}
