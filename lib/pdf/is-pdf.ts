/** Magic bytes for PDF (ASCII "%PDF"). */
export function isPdfBuffer(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  return (
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    (buf[4] === 0x2d || (buf[4] >= 0x31 && buf[4] <= 0x39))
  );
}
