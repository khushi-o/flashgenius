/**
 * Browser-only: create a deck row then POST the PDF for extraction.
 * Used by CreateDeckForm and the library quick-upload zone.
 */

async function parseResponseBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: `Server returned ${res.status} (non-JSON response).` };
  }
}

export async function createAndUploadPdf(file: File, title: string): Promise<{ deckId: string }> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Deck title is required.");

  const createRes = await fetch("/api/decks", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: trimmed.slice(0, 200) }),
  });
  const createJson = await parseResponseBody(createRes);
  if (!createRes.ok) {
    throw new Error(
      typeof createJson.error === "string" ? createJson.error : "Could not create deck.",
    );
  }
  const deck = createJson.deck as { id?: string } | undefined;
  const deckId = deck?.id;
  if (!deckId) throw new Error("Invalid response from server.");

  const fd = new FormData();
  fd.set("file", file);

  const upRes = await fetch(`/api/decks/${deckId}/upload`, {
    method: "POST",
    credentials: "same-origin",
    body: fd,
  });
  const upJson = await parseResponseBody(upRes);
  if (!upRes.ok) {
    const msg = typeof upJson.error === "string" ? upJson.error : "Upload or extraction failed.";
    const detail = typeof upJson.detail === "string" ? ` (${upJson.detail})` : "";
    throw new Error(`${msg}${detail}`);
  }

  return { deckId };
}
