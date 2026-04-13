import { GoogleGenerativeAI } from "@google/generative-ai";

function normalizeGeminiApiKey(raw: string | undefined): string | null {
  if (!raw) return null;
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k || null;
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const key = normalizeGeminiApiKey(process.env.GEMINI_API_KEY);
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(key);
  /**
   * Stable ids for Google AI Studio (`generativelanguage.googleapis.com`).
   * Do not use `*-latest` for 1.5 (often 404 on v1beta). Do not rely on `gemini-1.5-pro`
   * for all keys (many projects get 404). Only use ids that `models.list` returns for
   * your key — e.g. `gemini-1.5-flash-8b` is not available on this API (404).
   * @see https://ai.google.dev/gemini-api/docs/models/gemini
   */
  const defaults = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-001",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-lite-001",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
  ];
  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = preferred
    ? [preferred, ...defaults.filter((m) => m !== preferred)]
    : defaults;
  let lastErr: unknown;
  for (let pass = 0; pass < 2; pass++) {
    if (pass > 0) {
      await new Promise((r) => setTimeout(r, 750));
    }
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
  }
  const tried = models.join(", ");
  const base =
    lastErr instanceof Error ? lastErr.message : "Gemini returned no text from any model.";
  throw new Error(`${base} (tried: ${tried})`);
}
