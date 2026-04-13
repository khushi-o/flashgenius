import { GoogleGenerativeAI } from "@google/generative-ai";

function normalizeGeminiApiKey(raw: string | undefined): string | null {
  if (!raw) return null;
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k || null;
}

/** Max model ids to try (avoids endless fallbacks if every call fails). */
const MAX_MODEL_ATTEMPTS = 8;

export async function generateGeminiText(prompt: string): Promise<string> {
  const key = normalizeGeminiApiKey(process.env.GEMINI_API_KEY);
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(key);
  /**
   * Google AI Studio (`generativelanguage.googleapis.com`, v1beta).
   * Do not use version-suffixed ids like `gemini-1.5-flash-002` here — many keys return 404.
   * `GEMINI_MODEL` is tried first (see your .env.local).
   * No artificial per-call timeout: summarization/generation often needs 20–60s+; a short
   * timeout caused false failures while the layout work was unrelated.
   * @see https://ai.google.dev/gemini-api/docs/models/gemini
   */
  const defaults = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  const preferred = process.env.GEMINI_MODEL?.trim();
  const merged = preferred
    ? [preferred, ...defaults.filter((m) => m !== preferred)]
    : defaults;
  const models = merged.slice(0, MAX_MODEL_ATTEMPTS);

  let lastErr: unknown;
  for (const name of models) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent(prompt);
      const out = result.response.text();
      if (out?.trim()) return out.trim();
    } catch (e) {
      lastErr = e;
    }
  }
  const tried = models.join(", ");
  const base =
    lastErr instanceof Error ? lastErr.message : "Gemini returned no text from any model.";
  throw new Error(
    `${base} (tried: ${tried}). If you see 404s, set GEMINI_MODEL to an id your key supports — https://ai.google.dev/api/rest/v1beta/models/list`,
  );
}
