import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";

const kinds = [
  "agent-profile-sheet",
  "rental-flyer",
  "sale-brochure",
  "development-brochure",
  "hotel-flyer",
  "payment-plan-sheet",
  "qr-poster",
  "comparison-sheet",
];
const sourceDir = path.join(process.cwd(), "docs", "qa", "evidence", "marketing", "print");
const outputDir = path.join(process.cwd(), "docs", "qa", "evidence", "marketing", "pdf");
const results = [];

await fsPromises.mkdir(outputDir, { recursive: true });

for (const kind of kinds) {
  const imagePath = path.join(sourceDir, `${kind}-a4-browser-render.png`);
  const pdfPath = path.join(outputDir, `${kind}.pdf`);
  await fsPromises.access(imagePath);
  await createPdf(imagePath, pdfPath);
  const stats = await fsPromises.stat(pdfPath);
  results.push({ kind, path: pdfPath, bytes: stats.size, pages: 1, pageSize: "A4 portrait" });
}

const evidencePath = path.join(outputDir, "pdf-results.json");
await fsPromises.writeFile(evidencePath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`, "utf8");
console.log(`Generated ${results.length} single-page A4 marketing PDFs.`);
console.log(`Evidence: ${evidencePath}`);

function createPdf(imagePath, pdfPath) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true, info: { Title: path.basename(pdfPath, ".pdf"), Author: "Nestora QA" } });
    const stream = fs.createWriteStream(pdfPath);
    document.pipe(stream);
    document.image(imagePath, 0, 0, { fit: [document.page.width, document.page.height], align: "center", valign: "center" });
    document.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}
