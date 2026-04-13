import { maxPdfPagesStored } from "@/lib/constants/uploads";

/**
 * Second-pass extraction: same pdfjs stack as pdf-parse, but page-by-page with
 * tolerant options so one bad page or font edge case does not fail the whole upload.
 */
export async function extractPdfTextViaPdfjs(buffer: Buffer): Promise<{
  fullText: string;
  pages: { pageNumber: number; text: string }[];
}> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);

  const loadingTask = pdfjs.getDocument({
    data,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
    disableFontFace: true,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const doc = await loadingTask.promise;
  const pageCap = Math.min(maxPdfPagesStored(), 500);
  const nPages = Math.min(doc.numPages, pageCap);
  const pages: { pageNumber: number; text: string }[] = [];
  const parts: string[] = [];

  for (let i = 1; i <= nPages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent({ disableNormalization: false });
      const chunks: string[] = [];
      for (const item of content.items) {
        if ("str" in item && typeof item.str === "string") chunks.push(item.str);
        if ("hasEOL" in item && item.hasEOL) chunks.push("\n");
      }
      const t = chunks.join("").trim();
      if (t.length > 0) {
        pages.push({ pageNumber: i, text: t });
        parts.push(t);
      }
      page.cleanup();
    } catch (pageErr) {
      console.warn(`[pdf] skipped page ${i}`, pageErr);
    }
  }

  await doc.destroy().catch(() => undefined);
  const fullText = parts.join("\n\n").trim();
  return { fullText, pages };
}
