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
   * Do not use `gemini-1.5-flash` / `gemini-1.5-pro` in defaults — many AI Studio keys get 404 on 1.5.
   * `GEMINI_MODEL` is tried first when set to a non-legacy id.
   * @see https://ai.google.dev/gemini-api/docs/models/gemini
   */
  const defaults = ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"];
  /** Ids that often 404 on v1beta for newer keys; ignored so 2.x models run first. */
  const legacyModelIds = new Set([
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
  ]);
  const preferredRaw = process.env.GEMINI_MODEL?.trim();
  const preferred =
    preferredRaw && !legacyModelIds.has(preferredRaw) ? preferredRaw : undefined;
  if (preferredRaw && legacyModelIds.has(preferredRaw)) {
    console.warn(
      `[gemini] GEMINI_MODEL=${preferredRaw} is not available for many API keys; using 2.x defaults. Set GEMINI_MODEL to e.g. gemini-2.5-flash-lite or gemini-2.0-flash.`,
    );
  }
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
