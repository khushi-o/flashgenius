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
  const models = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
  ];
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
  throw lastErr instanceof Error ? lastErr : new Error("Gemini returned no text");
}
