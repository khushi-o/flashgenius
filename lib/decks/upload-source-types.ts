/** MIME for Office Open XML Word (.docx). */
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** File input `accept` for deck source uploads (PDF + Word .docx). */
export const ACCEPT_DECK_SOURCE = [
  "application/pdf",
  ".pdf",
  DOCX_MIME,
  ".docx",
].join(",");

export function isDeckSourceUploadFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const t = (file.type || "").toLowerCase();
  if (name.endsWith(".pdf") || t === "application/pdf") return true;
  if (name.endsWith(".docx") || t === DOCX_MIME.toLowerCase()) return true;
  return false;
}
