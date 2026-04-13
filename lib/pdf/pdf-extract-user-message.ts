/**
 * Errors that should propagate to the client (wrong file type, encryption).
 * All other engine failures are treated as "no text extracted" so the API can return
 * PDF_EMPTY_TEXT or PDF_ENGINE instead of the generic PDF_NO_TEXT_OR_UNSUPPORTED catch-all.
 */
export function isPdfExtractFatalError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.toLowerCase();
  if (/password|encrypted|encrypt|need.*password|wrong password/i.test(msg)) return true;
  if (/invalid|corrupt|malformed|xref|startxref/i.test(m)) return true;
  return false;
}

/**
 * Map PDF.js extraction failures to a safe, user-facing string (no stack traces).
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
  if (/worker|canvas|wasm|offscreen|imagebitmap|skia|native|standardfont|fontdata|cmap|font\s*face/i.test(m)) {
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
