/**
 * Detect PDF by magic bytes. Some tools prepend BOM or junk before %PDF-;
 * scan the first few KB for the header (PDF spec allows leading non-PDF bytes in some cases).
 */
export function findPdfHeaderOffset(buf: Buffer, maxScan = 65536): number {
  const limit = Math.min(buf.length - 5, maxScan);
  for (let i = 0; i <= limit; i++) {
    if (
      buf[i] === 0x25 &&
      buf[i + 1] === 0x50 &&
      buf[i + 2] === 0x44 &&
      buf[i + 3] === 0x46
    ) {
      const after = buf[i + 4];
      if (after === 0x2d || (after >= 0x31 && after <= 0x39)) return i;
    }
  }
  return -1;
}

export function isPdfBuffer(buf: Buffer): boolean {
  return findPdfHeaderOffset(buf) >= 0;
}

/**
 * Some exporters prepend BOM or wrapper bytes before `%PDF-`. Parsers expect the file to start
 * at the header — slice so extraction matches Acrobat-style detection.
 */
export function slicePdfFromDetectedHeader(buf: Buffer): Buffer {
  const off = findPdfHeaderOffset(buf);
  if (off <= 0) return buf;
  return Buffer.from(buf.subarray(off));
}
