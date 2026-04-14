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

function parseRateLimitMs(): number {
  const raw = process.env.GEMINI_RATE_LIMIT_MS?.trim();
  if (!raw) return 4500;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 400 ? n : 4500;
}

function parseRetries(): number {
  const raw = process.env.GEMINI_MAX_RETRIES?.trim();
  if (!raw) return 2;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && n <= 6 ? n : 2;
}

let lastGeminiCallAt = 0;

async function waitForGeminiRateLimit(): Promise<void> {
  const ms = parseRateLimitMs();
  const now = Date.now();
  const elapsed = now - lastGeminiCallAt;
  if (elapsed < ms) {
    await new Promise((r) => setTimeout(r, ms - elapsed));
  }
  lastGeminiCallAt = Date.now();
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.toLowerCase().includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

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

  const retries = parseRetries();
  let lastErr: unknown;

  for (const name of models) {
    const model = genAI.getGenerativeModel({ model: name });
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await waitForGeminiRateLimit();
        const result = await model.generateContent(prompt);
        const out = result.response.text();
        if (out?.trim()) return out.trim();
        break;
      } catch (e) {
        lastErr = e;
        if (isRateLimitError(e) && attempt < retries) {
          const wait = 5000 * 3 ** attempt;
          console.warn(`[gemini] rate limited on ${name}, retry ${attempt + 1} after ${wait}ms`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        break;
      }
    }
  }

  const tried = models.join(", ");
  const base =
    lastErr instanceof Error ? lastErr.message : "Gemini returned no text from any model.";
  throw new Error(
    `${base} (tried: ${tried}). If you see 404s, set GEMINI_MODEL to an id your key supports — https://ai.google.dev/api/rest/v1beta/models/list`,
  );
}
