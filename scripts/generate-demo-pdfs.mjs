import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "demo");
fs.mkdirSync(outDir, { recursive: true });

const samples = [
  {
    file: "01-algebra-quadratics.pdf",
    title: "Algebra - Quadratic equations",
    lines: [
      "Chapter excerpt (demo). The discriminant b^2 - 4ac tells you how many real roots a quadratic has.",
      "If D > 0: two distinct real roots. If D = 0: one repeated real root. If D < 0: two complex roots.",
    ],
  },
  {
    file: "02-biology-cells.pdf",
    title: "Biology - Cell structure",
    lines: [
      "Demo notes: The nucleus stores DNA. Mitochondria produce ATP. Ribosomes synthesize proteins.",
      "The cell membrane is selectively permeable - it controls what enters and leaves the cell.",
    ],
  },
  {
    file: "03-history-industrial.pdf",
    title: "History - Industrial Revolution",
    lines: [
      "Sample outline: Steam power, textile mills, and railways transformed production and transport.",
      "Urbanization grew as workers moved to factory cities; reform movements followed poor conditions.",
    ],
  },
  {
    file: "04-cs-big-o.pdf",
    title: "Computer science - Big-O intuition",
    lines: [
      "Demo sheet: O(1) constant time, O(log n) binary search, O(n) linear scan, O(n log n) efficient sorts.",
      "Big-O describes worst-case growth as input size n grows - compare algorithms at large n.",
    ],
  },
  {
    file: "05-chemistry-stoichiometry.pdf",
    title: "Chemistry - Stoichiometry",
    lines: [
      "Practice PDF: Balance equations first, then use mole ratios from coefficients to convert between substances.",
      "The limiting reactant determines how much product can form in a reaction mixture.",
    ],
  },
];

for (const s of samples) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 720;
  page.drawText(s.title, {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.2, 0.15, 0.35),
  });
  y -= 36;
  page.drawText("FlashGenius - sample PDF for upload demo", {
    x: 50,
    y,
    size: 11,
    font,
    color: rgb(0.4, 0.38, 0.42),
  });
  y -= 28;

  for (const line of s.lines) {
    const words = line.split(/\s+/);
    let chunk = "";
    const lineHeight = 16;
    const maxW = 500;
    for (const w of words) {
      const test = chunk ? `${chunk} ${w}` : w;
      const tw = font.widthOfTextAtSize(test, 12);
      if (tw > maxW && chunk) {
        page.drawText(chunk, { x: 50, y, size: 12, font, color: rgb(0.15, 0.14, 0.16) });
        y -= lineHeight;
        chunk = w;
      } else {
        chunk = test;
      }
    }
    if (chunk) {
      page.drawText(chunk, { x: 50, y, size: 12, font, color: rgb(0.15, 0.14, 0.16) });
      y -= lineHeight + 6;
    }
  }

  const bytes = await doc.save();
  fs.writeFileSync(path.join(outDir, s.file), bytes);
  console.log("Wrote", s.file);
}
