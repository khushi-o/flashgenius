export const TONE_PRESETS = {
  "exam-crisp": {
    pass_a_instruction:
      "Limit to importance 1–2 concepts where possible. Prefer definition, cloze, procedure types.",
    pass_b_style:
      "Terse exam style: front is a direct question; back is the minimum correct answer (no filler).",
  },
  "deep-understanding": {
    pass_a_instruction:
      "Include some importance-3 supporting detail. Prefer definition, contrast, misconception.",
    pass_b_style:
      "Conceptual: front may ask why/how; back explains clearly, may use a short example.",
  },
  "quick-recall": {
    pass_a_instruction: "Only importance-1 concepts. Prefer definition and cloze.",
    pass_b_style: "One fact per card. Back is one or two short sentences maximum.",
  },
} as const;

export type TonePreset = keyof typeof TONE_PRESETS;

export function tonePresetOrDefault(p: string): TonePreset {
  if (p in TONE_PRESETS) return p as TonePreset;
  return "exam-crisp";
}
