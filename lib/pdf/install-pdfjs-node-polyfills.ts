/**
 * pdf.js / pdf-parse evaluate browser globals (DOMMatrix, Path2D, ImageData) at module load.
 * Node serverless has none — install minimal shims before any `import("pdfjs-dist")` / `import("pdf-parse")`.
 */
import CSSMatrix from "dommatrix";

function install(): void {
  const g = globalThis as typeof globalThis & Record<string, unknown>;

  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = CSSMatrix as unknown as typeof DOMMatrix;
  }

  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {} as unknown as typeof Path2D;
  }

  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageDataPoly {
      readonly colorSpace = "srgb" as const;
      readonly data: Uint8ClampedArray;
      readonly width: number;
      readonly height: number;
      constructor(sw: number, sh: number) {
        this.width = sw;
        this.height = sh;
        this.data = new Uint8ClampedArray(sw * sh * 4);
      }
    } as unknown as typeof ImageData;
  }
}

install();
