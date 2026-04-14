/**
 * Groq OpenAI-compatible chat completions (server only).
 * @see https://console.groq.com/docs/quickstart
 */

function normalizeGroqApiKey(raw: string | undefined): string | null {
  if (!raw) return null;
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k || null;
}

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export async function generateGroqText(prompt: string): Promise<string> {
  const key = normalizeGroqApiKey(process.env.GROQ_API_KEY);
  if (!key) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 8192,
    }),
  });

  const rawBody = await res.text();
  let data: GroqChatResponse;
  try {
    data = JSON.parse(rawBody) as GroqChatResponse;
  } catch {
    throw new Error(`Groq HTTP ${res.status}: ${rawBody.slice(0, 400)}`);
  }

  if (!res.ok) {
    const msg = data.error?.message ?? rawBody.slice(0, 400);
    throw new Error(`Groq HTTP ${res.status}: ${msg}`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned empty content.");
  }
  return text;
}
