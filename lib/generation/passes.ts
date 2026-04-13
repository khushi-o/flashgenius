import { passAMaxConceptsPerChunk } from "@/lib/constants/generation";
import { safeParseJSON } from "./json";
import type { CardType, PassAConcept, RawCard } from "./types";
import { CARD_TYPES } from "./types";
import { TONE_PRESETS, type TonePreset } from "./tone-presets";

const VOCABULARY_POLICY = `VOCABULARY POLICY:
- Use EXACT domain terms from the excerpt when possible (no careless synonyms).
- Backs must be concise (no essay). No banned filler openings like "It is important to note".`;

export function buildPassAPrompt(chunk: string, tone: TonePreset): string {
  const t = TONE_PRESETS[tone];
  const excerpt = chunk.length > 14_000 ? `${chunk.slice(0, 14_000)}\n…` : chunk;
  return `You are a curriculum designer. Read the excerpt and output ONLY a JSON array (no markdown) of concepts worth flashcards.
Aim for thorough coverage of the excerpt: major definitions, procedures, contrasts, and common mistakes — not a bare minimum list.

Each object must have:
- "concept": string (use wording from the text when possible)
- "type": one of "definition","contrast","misconception","procedure","cloze"
- "importance": 1 | 2 | 3 (1 = core must-know)
- "source_hint": string, 4–12 words locating the idea

At most ${passAMaxConceptsPerChunk()} objects. ${t.pass_a_instruction}

${VOCABULARY_POLICY}

Excerpt:
"""
${excerpt}
"""`;
}

export function parsePassAOutput(raw: string): PassAConcept[] {
  const parsed = safeParseJSON(raw);
  if (!Array.isArray(parsed)) return [];
  const out: PassAConcept[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const concept = typeof o.concept === "string" ? o.concept.trim() : "";
    const typeStr = typeof o.type === "string" ? o.type.trim() : "";
    const imp = o.importance;
    const hint = typeof o.source_hint === "string" ? o.source_hint.trim() : "";
    if (concept.length < 2) continue;
    const type = CARD_TYPES.includes(typeStr as CardType) ? (typeStr as CardType) : "definition";
    const importance =
      imp === 1 || imp === 2 || imp === 3 ? (imp as 1 | 2 | 3) : type === "definition" ? 2 : 2;
    out.push({
      concept: concept.slice(0, 400),
      type,
      importance,
      source_hint: hint.slice(0, 120) || "—",
    });
    if (out.length >= passAMaxConceptsPerChunk()) break;
  }
  return out;
}

export function buildPassBBatchPrompt(concepts: PassAConcept[], tone: TonePreset): string {
  const t = TONE_PRESETS[tone];
  const payload = concepts.map((c) => ({
    concept: c.concept,
    card_type: c.type,
    importance: c.importance,
    source_hint: c.source_hint,
  }));

  return `You are FlashGenius. Turn each concept into ONE flashcard. Output ONLY a JSON array (no markdown).

Each object must have:
- "card_type": same as input concept's card_type
- "front": a clear recall target: often a short question, but for definitions a crisp prompt or "Explain: …" is fine; cloze uses ___ for the blank.
- "back": accurate and concise, but not sterile: when helpful, add one short memory hook, contrast, or micro-step (one line) so it feels like a good tutor — not only a bare fact.
- "difficulty": 1 | 2 | 3
- "importance": 1 | 2 | 3 (copy from concept if sensible)
- "source_hint": short string (may echo input)

Vary rhythm across the batch: do not make every front identical ("What is…?"). Mix prompts, cloze, and short "Why / How" stems where the concept fits.

Style: ${t.pass_b_style}
${VOCABULARY_POLICY}

Concepts (JSON):
${JSON.stringify(payload)}`;
}

export function parsePassBOutput(raw: string): RawCard[] {
  const parsed = safeParseJSON(raw);
  if (!Array.isArray(parsed)) return [];
  const out: RawCard[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const front = typeof o.front === "string" ? o.front : "";
    const back = typeof o.back === "string" ? o.back : "";
    const card_type = typeof o.card_type === "string" ? o.card_type : "definition";
    const difficulty = typeof o.difficulty === "number" ? o.difficulty : 2;
    const importance = typeof o.importance === "number" ? o.importance : null;
    const source_hint = typeof o.source_hint === "string" ? o.source_hint : null;
    const source_page = typeof o.source_page === "number" ? o.source_page : null;
    out.push({
      card_type,
      front,
      back,
      difficulty,
      importance,
      source_hint,
      source_page,
    });
  }
  return out;
}
