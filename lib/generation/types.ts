export const CARD_TYPES = [
  "definition",
  "contrast",
  "misconception",
  "procedure",
  "cloze",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export type PassAConcept = {
  concept: string;
  type: CardType;
  importance: 1 | 2 | 3;
  source_hint: string;
};

export type RawCard = {
  card_type: string;
  front: string;
  back: string;
  difficulty?: number;
  importance?: number | null;
  source_page?: number | null;
  source_hint?: string | null;
};

export type InsertableCard = {
  card_type: CardType;
  front: string;
  back: string;
  difficulty: number;
  importance: number | null;
  source_page: number | null;
  source_hint: string | null;
};
