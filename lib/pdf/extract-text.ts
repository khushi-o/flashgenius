import "@/lib/pdf/install-pdfjs-node-polyfills";
import { maxPdfPagesStored } from "@/lib/constants/uploads";
import { slicePdfFromDetectedHeader } from "@/lib/pdf/is-pdf";
import { isPdfExtractFatalError } from "@/lib/pdf/pdf-extract-user-message";

export type PdfPageText = { pageNumber: number; text: string };

/** Result of {@link extractPdfText}; `emptyReason` is set only when there is no usable text. */
export type PdfExtractOutcome = {
  fullText: string;
  pages: PdfPageText[];
  /** No text, but engines failed (fonts/canvas/server) — not the same as a scanned PDF. */
  emptyReason?: "engine";
};

type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

function isNonEmpty(out: { fullText: string; pages: PdfPageText[] }): boolean {
  return out.pages.length > 0 || out.fullText.trim().length > 0;
}

/** Vercel logs often truncate `console` output — log a structured object instead. */
function serializeEngineError(e: unknown): Record<string, unknown> {
  if (!(e instanceof Error)) return { value: String(e) };
  const o: Record<string, unknown> = { name: e.name, message: e.message };
  if (e.stack) o.stackPreview = e.stack.slice(0, 2500);
  if (e.cause !== undefined) {
    o.cause =
      e.cause instanceof Error
        ? { name: e.cause.name, message: e.cause.message }
        : String(e.cause);
  }
  return o;
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
 * pdf-parse (v2) wraps pdf.js. Try **minimal** `getDocument` args first (library defaults), then
 * explicit serverless flags — some hosts reject the extra flags for certain PDFs.
 */
async function extractWithPdfParse(buffer: Buffer): Promise<{ fullText: string; pages: PdfPageText[] } | null> {
  let lastErr: unknown;
  try {
    const { PDFParse } = await import("pdf-parse");
    PDFParse.setWorker("");

    type ParserInstance = InstanceType<typeof PDFParse>;
    const variants: Array<Record<string, unknown>> = [
      { data: buffer, verbosity: 0 },
      {
        data: buffer,
        verbosity: 0,
        useSystemFonts: true,
        isEvalSupported: false,
        useWorkerFetch: false,
        disableFontFace: true,
      },
    ];

    for (let vi = 0; vi < variants.length; vi++) {
      let parser: ParserInstance | undefined;
      try {
        parser = new PDFParse(variants[vi] as never) as ParserInstance;
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

        await parser.destroy().catch(() => undefined);
        return { fullText, pages };
      } catch (e) {
        lastErr = e;
        console.warn(`[pdf] pdf-parse variant ${vi} failed`, serializeEngineError(e));
        await parser?.destroy().catch(() => undefined);
      }
    }

    console.warn("[pdf] pdf-parse all variants failed", serializeEngineError(lastErr));
    return null;
  } catch (e) {
    console.warn("[pdf] pdf-parse import or setup failed", serializeEngineError(e));
    return null;
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
export async function extractPdfText(buffer: Buffer): Promise<PdfExtractOutcome> {
  const working = slicePdfFromDetectedHeader(buffer);
  if (working.length < 5) {
    return { fullText: "", pages: [] };
  }

  const fromParse = await extractWithPdfParse(working);
  if (fromParse && isNonEmpty(fromParse)) {
    return { fullText: fromParse.fullText, pages: fromParse.pages };
  }

  let lastPdfjsThrow: unknown;
  /**
   * `disableFontFace: false` loads real font faces and often needs native canvas on Node.
   * On Vercel that path frequently throws opaque errors (e.g. message "F") while
   * `disableFontFace: true` is stable — skip the risky pass there.
   */
  const skipFontFacePass = process.env.VERCEL === "1" || process.env.PDFJS_SKIP_FONT_FACE === "1";
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
    ...(skipFontFacePass
      ? []
      : [
          {
            label: "pdfjs-legacy+fontFace",
            load: () => import("pdfjs-dist/legacy/build/pdf.mjs"),
            disableFontFace: false,
          },
        ]),
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
      console.warn(`[pdf] ${att.label} failed`, serializeEngineError(e));
    }
  }

  if (fromParse !== null) {
    if (!isNonEmpty(fromParse) && lastPdfjsThrow !== undefined) {
      if (isPdfExtractFatalError(lastPdfjsThrow)) {
        throw lastPdfjsThrow instanceof Error
          ? lastPdfjsThrow
          : new Error(String(lastPdfjsThrow), { cause: lastPdfjsThrow });
      }
      console.error("[pdf] pdf-parse returned empty and pdfjs failed", {
        err: serializeEngineError(lastPdfjsThrow),
        bytes: working.length,
        headerHex: working.subarray(0, Math.min(32, working.length)).toString("hex"),
      });
      return {
        fullText: fromParse.fullText,
        pages: fromParse.pages,
        emptyReason: "engine",
      };
    }
    return { fullText: fromParse.fullText, pages: fromParse.pages };
  }

  if (lastPdfjsThrow !== undefined) {
    if (isPdfExtractFatalError(lastPdfjsThrow)) {
      throw lastPdfjsThrow instanceof Error
        ? lastPdfjsThrow
        : new Error(String(lastPdfjsThrow), { cause: lastPdfjsThrow });
    }
    console.error("[pdf] non-fatal engine failure — returning empty", {
      err: serializeEngineError(lastPdfjsThrow),
      bytes: working.length,
      headerHex: working.subarray(0, Math.min(32, working.length)).toString("hex"),
    });
    return { fullText: "", pages: [], emptyReason: "engine" };
  }

  if (process.env.LOG_PDF_EXTRACT === "1" || process.env.NODE_ENV === "development") {
    console.error("[pdf] all extractors returned empty", {
      bytes: working.length,
      headerHex: working.subarray(0, Math.min(32, working.length)).toString("hex"),
    });
  }

  return { fullText: "", pages: [] };
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { fullText } = await extractPdfText(buffer);
  return fullText;
}
