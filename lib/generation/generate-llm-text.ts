import { generateGeminiText } from "./gemini";
import { generateGroqText } from "./groq";

export type LlmProviderId = "gemini" | "groq";

export function getActiveLlmProvider(): LlmProviderId {
  const p = process.env.LLM_PROVIDER?.trim().toLowerCase();
  return p === "groq" ? "groq" : "gemini";
}

/** Non-null if the active provider's API key is missing. */
export function missingLlmKeyMessage(provider: LlmProviderId): string | null {
  if (provider === "groq") {
    return process.env.GROQ_API_KEY?.trim()
      ? null
      : "Server is missing GROQ_API_KEY.";
  }
  return process.env.GEMINI_API_KEY?.trim()
    ? null
    : "Server is missing GEMINI_API_KEY.";
}

/**
 * Single entry for deck generation + page summaries.
 * Controlled by `LLM_PROVIDER` (`gemini` default, or `groq`).
 */
export async function generateLlmText(prompt: string): Promise<string> {
  const provider = getActiveLlmProvider();
  if (provider === "groq") {
    return generateGroqText(prompt);
  }
  return generateGeminiText(prompt);
}
