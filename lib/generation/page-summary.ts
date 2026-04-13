import { safeParseJSON } from "./json";

export type PageSummaryPayload = {
  takeaways: string[];
  spark: string;
  quiz: string;
};

export function buildPageSummaryPrompt(pageText: string): string {
  const excerpt =
    pageText.length > 12_000 ? `${pageText.slice(0, 12_000)}\n…` : pageText;
  return `You are a friendly tutor. Given ONE page of course material, output ONLY JSON (no markdown fences) with this exact shape:
{"takeaways": ["3-6 short bullets"],"spark": "one memorable analogy or tiny story (school-safe) to relate the ideas","quiz": "one question the student should answer after reading"}

Page:
"""
${excerpt}
"""`;
}

export function parsePageSummaryOutput(raw: string): PageSummaryPayload | null {
  const parsed = safeParseJSON(raw.trim());
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const takeaways = Array.isArray(o.takeaways)
    ? o.takeaways.filter((x): x is string => typeof x === "string").map((s) => s.trim())
    : [];
  const spark = typeof o.spark === "string" ? o.spark.trim() : "";
  const quiz = typeof o.quiz === "string" ? o.quiz.trim() : "";
  if (!takeaways.length && !spark && !quiz) return null;
  return { takeaways, spark, quiz };
}
