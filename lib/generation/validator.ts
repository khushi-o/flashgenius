import type { RawCard } from "./types";

const VAGUE_OPENERS = [
  "it is important",
  "note that",
  "this refers to",
  "in this context",
  "something related to",
  "as mentioned",
  "as discussed",
  "basically",
  "this is a",
  "it should be noted",
  "please note",
];

const TONE_MAX_BACK_WORDS: Record<string, number> = {
  "exam-crisp": 25,
  "deep-understanding": 60,
  "quick-recall": 15,
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCard(card: RawCard, tonePreset: string): ValidationResult {
  const errors: string[] = [];
  const front = card.front?.trim() ?? "";
  const back = card.back?.trim() ?? "";

  if (!front || front.length < 10) errors.push("front too short (min 10 chars)");
  if (front.length > 300) errors.push("front too long (max 300 chars)");
  if (!back || back.length < 5) errors.push("back too short (min 5 chars)");

  const backWords = back.split(/\s+/).filter(Boolean).length;
  const maxWords = TONE_MAX_BACK_WORDS[tonePreset] ?? 60;
  if (backWords > maxWords) {
    errors.push(`back too long for tone preset (${backWords} words, max ${maxWords})`);
  }

  if (front.toLowerCase() === back.toLowerCase()) {
    errors.push("front and back are identical");
  }

  const lowerBack = back.toLowerCase();
  for (const opener of VAGUE_OPENERS) {
    if (lowerBack.startsWith(opener)) {
      errors.push(`back starts with vague phrase: "${opener}"`);
      break;
    }
  }

  const ct = card.card_type;
  if (ct !== "cloze" && ct !== "definition") {
    if (!front.includes("?")) errors.push("front should be phrased as a question");
  }

  return { valid: errors.length === 0, errors };
}

function bigrams(s: string): string[] {
  const t = s.toLowerCase().replace(/\s+/g, " ").trim();
  if (t.length < 2) return t ? [t] : [];
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) {
    out.push(t.slice(i, i + 2));
  }
  return out;
}

export function diceSimilarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.length && !B.length) return 1;
  if (!A.length || !B.length) return 0;
  const setB = new Set(B);
  let inter = 0;
  for (const x of A) {
    if (setB.has(x)) inter += 1;
  }
  return (2 * inter) / (A.length + B.length);
}

export function isDuplicateFront(front: string, existingFronts: string[], threshold: number): boolean {
  const low = front.trim().toLowerCase();
  if (!low) return true;
  for (const e of existingFronts) {
    if (diceSimilarity(low, e) >= threshold) return true;
  }
  return false;
}
