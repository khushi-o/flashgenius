/**
 * pdf.js requires `GlobalWorkerOptions.workerSrc` to be a real URL (empty string counts as
 * "unspecified" and fake-worker setup throws). Load DOM polyfills first, then the same pdf.js
 * instance pdf-parse will use, and set workerSrc before any `getDocument` runs.
 */
import "./install-pdfjs-node-polyfills";

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/** Keep in sync with package.json `pdfjs-dist` version for CDN fallback. */
const PDFJS_DIST_VERSION = "5.4.296";

export function getPdfjsWorkerSrc(): string {
  try {
    const require = createRequire(import.meta.url);
    const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    return pathToFileURL(workerPath).href;
  } catch {
    return `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_DIST_VERSION}/legacy/build/pdf.worker.mjs`;
  }
}

pdfjsLib.GlobalWorkerOptions.workerSrc = getPdfjsWorkerSrc();
