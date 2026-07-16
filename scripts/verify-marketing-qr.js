import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const campaigns = [
  "agent-profile-sheet",
  "rental-flyer",
  "sale-brochure",
  "development-brochure",
  "hotel-flyer",
  "payment-plan-sheet",
  "qr-poster",
  "comparison-sheet",
];
const origin = (process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3030").replace(/\/$/, "");
const outputPath = path.join(process.cwd(), "docs", "qa", "evidence", "data", "marketing-qr-results.json");
const results = [];

for (const campaign of campaigns) {
  const expected = `${origin}/marketing/${campaign}?utm_source=nestora_material&utm_medium=qr&utm_campaign=${campaign}`;
  const pngBuffer = await QRCode.toBuffer(expected, { width: 600, margin: 2, errorCorrectionLevel: "M" });
  const png = PNG.sync.read(pngBuffer);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!decoded || decoded.data !== expected) throw new Error(`QR decode failed for ${campaign}`);
  results.push({ campaign, status: "passed", decodedTarget: decoded.data });
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`, "utf8");
console.log(`Decoded and verified ${results.length} marketing QR codes.`);
console.log(`Evidence: ${outputPath}`);
