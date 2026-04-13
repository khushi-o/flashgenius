import mammoth from "mammoth";

/**
 * Extract plain text from a .docx buffer (Office Open XML).
 */
export async function extractDocxText(buf: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value ?? "";
}
