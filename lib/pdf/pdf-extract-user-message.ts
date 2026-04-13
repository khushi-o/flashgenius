/**
 * Map pdf-parse / pdfjs failures to a safe, user-facing string (no stack traces).
 */
export function pdfExtractUserMessage(err: unknown): { error: string; code: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.toLowerCase();

  if (/password|encrypted|encrypt|need.*password/i.test(msg)) {
    return {
      error:
        "This PDF is password-protected or encrypted. Save an unlocked copy (no open password) and upload again.",
      code: "PDF_ENCRYPTED",
    };
  }
  if (/invalid|corrupt|malformed|xref|startxref|wrong password/i.test(m)) {
    return {
      error:
        "This file could not be read as a valid PDF (damaged or incomplete). Re-download it or export again from the original app.",
      code: "PDF_INVALID",
    };
  }
  if (/worker|canvas|wasm|offscreen|imagebitmap|skia|native/i.test(m)) {
    return {
      error:
        "The PDF engine hit a server-side error on this file. Try re-exporting the PDF, or split into a smaller document.",
      code: "PDF_ENGINE",
    };
  }
  return {
    error:
      "No usable text could be extracted from this PDF. Typical causes: scanned pages (image-only, no text layer), unusual fonts, or a damaged file. Try “Print to PDF” / “Save as PDF” from a viewer that embeds text, or upload a digital (non-scanned) copy.",
    code: "PDF_NO_TEXT_OR_UNSUPPORTED",
  };
}
