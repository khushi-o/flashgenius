import { maxPdfPagesStored } from "@/lib/constants/uploads";

export type PdfPageText = { pageNumber: number; text: string };

/**
 * PDF text extraction using pdf.js in-process (no worker). Avoids pdf-parse, which is brittle
 * when bundled for Vercel/serverless.
 */
export async function extractPdfText(buffer: Buffer): Promise<{
  fullText: string;
  pages: PdfPageText[];
}> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    verbosity: 0,
    disableFontFace: true,
    useSystemFonts: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });

  const doc = await loadingTask.promise;
  const pageCap = Math.min(maxPdfPagesStored(), 500);
  const nPages = Math.min(doc.numPages, pageCap);
  const pages: PdfPageText[] = [];
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

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { fullText } = await extractPdfText(buffer);
  return fullText;
}
