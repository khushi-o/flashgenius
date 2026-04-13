import { maxPdfPagesStored } from "@/lib/constants/uploads";
import { slicePdfFromDetectedHeader } from "@/lib/pdf/is-pdf";

export type PdfPageText = { pageNumber: number; text: string };

type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

function isNonEmpty(out: { fullText: string; pages: PdfPageText[] }): boolean {
  return out.pages.length > 0 || out.fullText.trim().length > 0;
}

async function extractWithPdfjsModule(
  pdfjs: PdfjsModule,
  buffer: Buffer,
  disableFontFace: boolean,
): Promise<{ fullText: string; pages: PdfPageText[] }> {
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    verbosity: 0,
    disableFontFace,
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
      console.warn(`[pdf] pdfjs skipped page ${i}`, pageErr);
    }
  }

  await doc.destroy().catch(() => undefined);
  const fullText = parts.join("\n\n").trim();
  return { fullText, pages };
}

type TextResultLike = {
  text?: string;
  total?: number;
  pages?: { num?: number; text?: string }[];
  getPageText?: (n: number) => string;
};

/**
 * pdf-parse (v2) wraps the same pdf.js engine with tuned text extraction — historically this
 * app relied on it first. Pass serverless-friendly `getDocument` options through `LoadParameters`.
 */
async function extractWithPdfParse(buffer: Buffer): Promise<{ fullText: string; pages: PdfPageText[] } | null> {
  let parser: { getText: (o: { first: number }) => Promise<unknown>; destroy: () => Promise<void> } | undefined;
  try {
    const { PDFParse } = await import("pdf-parse");
    PDFParse.setWorker("");

    type ParserInstance = InstanceType<typeof PDFParse>;
    parser = new PDFParse({
      data: buffer,
      verbosity: 0,
      useSystemFonts: true,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableFontFace: true,
    }) as ParserInstance;

    const pageCap = Math.min(maxPdfPagesStored(), 500);
    const result = (await parser.getText({ first: pageCap })) as TextResultLike;
    let fullText = (result.text || "").trim();
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

    if (pages.length === 0 && fullText.length > 0) {
      pages.push({ pageNumber: 1, text: fullText });
    } else if (pages.length > 0 && fullText.length === 0) {
      fullText = pages.map((p) => p.text).join("\n\n").trim();
    }

    return { fullText, pages };
  } catch (e) {
    console.warn("[pdf] pdf-parse failed or unavailable", e);
    return null;
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

/**
 * Not every PDF under your upload size limit can yield text: scanned pages are images only
 * unless OCR was applied. This pipeline maximizes success for digital PDFs.
 *
 * Order: normalize header → pdf-parse (same as legacy app) → pdf.js with two font modes.
 * Never rethrow a pdf.js error if pdf-parse completed without throwing (avoids masking empty
 * extractions with a generic engine error).
 */
export async function extractPdfText(buffer: Buffer): Promise<{
  fullText: string;
  pages: PdfPageText[];
}> {
  const working = slicePdfFromDetectedHeader(buffer);
  if (working.length < 5) {
    return { fullText: "", pages: [] };
  }

  const fromParse = await extractWithPdfParse(working);
  if (fromParse && isNonEmpty(fromParse)) {
    return fromParse;
  }

  let lastPdfjsThrow: unknown;
  const pdfjsAttempts: Array<{
    label: string;
    load: () => Promise<PdfjsModule>;
    disableFontFace: boolean;
  }> = [
    {
      label: "pdfjs-legacy+disableFontFace",
      load: () => import("pdfjs-dist/legacy/build/pdf.mjs"),
      disableFontFace: true,
    },
    {
      label: "pdfjs-legacy+fontFace",
      load: () => import("pdfjs-dist/legacy/build/pdf.mjs"),
      disableFontFace: false,
    },
  ];

  for (const att of pdfjsAttempts) {
    try {
      const pdfjs = await att.load();
      const out = await extractWithPdfjsModule(pdfjs, working, att.disableFontFace);
      lastPdfjsThrow = undefined;
      if (isNonEmpty(out)) {
        return out;
      }
    } catch (e) {
      lastPdfjsThrow = e;
      console.warn(`[pdf] ${att.label} failed`, e);
    }
  }

  if (fromParse !== null) {
    return fromParse;
  }

  if (lastPdfjsThrow !== undefined) {
    throw lastPdfjsThrow instanceof Error
      ? lastPdfjsThrow
      : new Error(String(lastPdfjsThrow), { cause: lastPdfjsThrow });
  }

  return { fullText: "", pages: [] };
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { fullText } = await extractPdfText(buffer);
  return fullText;
}
