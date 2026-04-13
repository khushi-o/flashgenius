import { maxPdfPagesStored } from "@/lib/constants/uploads";
import { extractPdfTextViaPdfjs } from "@/lib/pdf/extract-text-fallback";

export type PdfPageText = { pageNumber: number; text: string };

type TextResultLike = {
  text?: string;
  total?: number;
  pages?: { num?: number; text?: string }[];
  getPageText?: (n: number) => string;
};

/**
 * Full-document text plus per-page strings.
 * pdf-parse v2 often returns `total` + `getPageText` reliably; `pages` alone can be sparse.
 * We pass `{ first: N }` so extraction is not limited to a single page by default parameters.
 */
export async function extractPdfText(buffer: Buffer): Promise<{
  fullText: string;
  pages: PdfPageText[];
}> {
  const { PDFParse } = await import("pdf-parse");
  type ParserInstance = InstanceType<typeof PDFParse>;
  let parser: ParserInstance | undefined;
  try {
    parser = new PDFParse({ data: buffer });
    const pageCap = Math.min(maxPdfPagesStored(), 500);
    const result = (await parser.getText({ first: pageCap })) as TextResultLike;
    const fullText = (result.text || "").trim();
    const total =
      typeof result.total === "number" && Number.isFinite(result.total) && result.total > 0
        ? result.total
        : 0;

    const pages: PdfPageText[] = [];
    const getPageText =
      typeof result.getPageText === "function"
        ? (result.getPageText as (this: unknown, n: number) => string).bind(result)
        : null;

    if (getPageText && total > 0) {
      const nPages = Math.min(total, pageCap);
      for (let n = 1; n <= nPages; n++) {
        const t = (getPageText(n) || "").trim();
        if (t.length > 0) {
          pages.push({ pageNumber: n, text: t });
        }
      }
    }

    if (pages.length === 0 && Array.isArray(result.pages) && result.pages.length > 0) {
      let i = 0;
      for (const row of result.pages) {
        i += 1;
        const num = typeof row.num === "number" ? row.num : i;
        const t = (row.text || "").trim();
        if (t.length > 0) {
          pages.push({ pageNumber: num, text: t });
        }
      }
    }

    let out: { fullText: string; pages: PdfPageText[] } = { fullText, pages };
    if (!out.fullText.trim() && out.pages.length === 0) {
      try {
        const fb = await extractPdfTextViaPdfjs(buffer);
        if (fb.fullText.trim().length > 0 || fb.pages.length > 0) {
          out = { fullText: fb.fullText, pages: fb.pages };
        }
      } catch (emptyFbErr) {
        console.warn("[pdf] fallback after empty primary", emptyFbErr);
      }
    }
    return out;
  } catch (primaryErr) {
    console.warn("[pdf] primary PDFParse extract failed, trying pdfjs fallback", primaryErr);
    try {
      const fb = await extractPdfTextViaPdfjs(buffer);
      if (fb.fullText.length > 0 || fb.pages.length > 0) {
        return { fullText: fb.fullText, pages: fb.pages };
      }
    } catch (fbErr) {
      console.warn("[pdf] fallback extract failed", fbErr);
    }
    throw primaryErr;
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { fullText } = await extractPdfText(buffer);
  return fullText;
}
