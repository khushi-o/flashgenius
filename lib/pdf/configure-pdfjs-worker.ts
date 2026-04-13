/**
 * pdf.js requires `GlobalWorkerOptions.workerSrc` to be loadable by Node's ESM loader.
 * Only `file:` and `data:` work — never `https:` (fake worker will throw).
 *
 * Load DOM polyfills first, then the same pdf.js instance pdf-parse will use.
 */
import "./install-pdfjs-node-polyfills";

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

function resolvePdfWorkerFsPath(): string {
  const tail = join("node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
  const fromCwd = join(process.cwd(), tail);
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    if (existsSync(resolved)) {
      return resolved;
    }
  } catch {
    /* createRequire may not resolve in some bundles */
  }

  const here = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth <= 10; depth++) {
    const parts: string[] = [here];
    for (let i = 0; i < depth; i++) {
      parts.push("..");
    }
    parts.push("node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
    const candidate = join(...parts);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find pdfjs-dist/legacy/build/pdf.worker.mjs (checked process.cwd(), require.resolve, and parent dirs).",
  );
}

/**
 * Prefer `file:` URL. If that ever fails, `data:` is also allowed by Node's worker loader.
 */
export function getPdfjsWorkerSrc(): string {
  const fsPath = resolvePdfWorkerFsPath();
  try {
    return pathToFileURL(fsPath).href;
  } catch {
    const buf = readFileSync(fsPath);
    return `data:application/javascript;base64,${buf.toString("base64")}`;
  }
}

pdfjsLib.GlobalWorkerOptions.workerSrc = getPdfjsWorkerSrc();
