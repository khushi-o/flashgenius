import { GoogleGenerativeAI } from "@google/generative-ai";

function normalizeGeminiApiKey(raw: string | undefined): string | null {
  if (!raw) return null;
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k || null;
}

/** Bound each model attempt so /summarize stays under route maxDuration (e.g. 60s on Vercel). */
const PER_MODEL_TIMEOUT_MS = 11_000;
/** Hard cap — worst case ~4×11s ≈ 44s before other work. */
const MAX_MODEL_ATTEMPTS = 4;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const key = normalizeGeminiApiKey(process.env.GEMINI_API_KEY);
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(key);
  /**
   * Fallback list for Google AI Studio keys (`generativelanguage.googleapis.com`, v1beta).
   * Avoid version-suffixed ids like `gemini-1.5-flash-002` — many keys get 404 on those.
   * Set GEMINI_MODEL to the first id that works for your project (see ListModels in the API docs).
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
      const result = await withTimeout(
        model.generateContent(prompt),
        PER_MODEL_TIMEOUT_MS,
        name,
      );
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
    `${base} (tried: ${tried}). If every model 404s, set GEMINI_MODEL in .env.local to an id your key supports — see https://ai.google.dev/api/rest/v1beta/models/list`,
  );
}
