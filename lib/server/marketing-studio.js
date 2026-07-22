import crypto from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import sharp from "sharp";
import { AccessError } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { getPool, query } from "@/lib/server/db";
import { requireFeatureAccess, requireUsageLimit } from "@/lib/server/subscriptions";
import { getPrivateObject, putPrivateObject } from "@/lib/server/object-storage";

const TEMPLATE_KINDS = [
  "rental_flyer", "sale_brochure", "development_brochure", "hotel_flyer",
  "open_house_poster", "agent_profile_sheet", "agency_brochure",
  "payment_plan_sheet", "construction_update", "room_promotion",
  "short_stay_flyer", "weekend_offer", "social_square", "social_portrait",
  "social_story", "whatsapp_status", "facebook_post", "linkedin_post",
  "youtube_thumbnail", "digital_sign", "qr_poster", "comparison_sheet",
  "email_header", "open_house_promotional",
];

const CANVAS_PRESETS = {
  a4: { width: 595, height: 842 },
  us_letter: { width: 612, height: 792 },
  square: { width: 500, height: 500 },
  portrait: { width: 400, height: 600 },
  story: { width: 360, height: 640 },
  landscape: { width: 800, height: 500 },
  social_square: { width: 500, height: 500 },
  social_portrait: { width: 400, height: 600 },
  social_story: { width: 360, height: 640 },
};

const ALLOWED_ELEMENT_TYPES = [
  "text", "image", "shape", "qr_code", "dynamic_field", "line", "group",
];

const ALLOWED_FONTS = [
  "Inter", "Helvetica", "Times New Roman", "Georgia", "Arial",
  "system-ui", "sans-serif", "serif", "monospace",
];

export async function getDesign(context, designId) {
  const result = await query(
    `SELECT md.*, bk.name AS brand_kit_name
     FROM marketing_designs md
     LEFT JOIN brand_kits bk ON bk.id = md.brand_kit_id
     WHERE md.id = $1 AND (md.owner_user_id = $2 OR ($3::uuid IS NOT NULL AND md.organization_id = $3) OR $4 = true)
     LIMIT 1`,
    [designId, context.user.id, context.organization?.id || null, context.isAdmin],
  );
  if (!result.rowCount) throw new AccessError("NOT_FOUND", "Design not found.");
  return result.rows[0];
}

export async function listDesigns(context, { kind, isTemplate } = {}) {
  const conditions = ["(md.owner_user_id = $1 OR ($2::uuid IS NOT NULL AND md.organization_id = $2) OR $3 = true)"];
  const values = [context.user.id, context.organization?.id || null, context.isAdmin];
  let idx = 4;
  if (kind) { conditions.push(`md.kind = $${idx}`); values.push(kind); idx++; }
  if (isTemplate) { conditions.push("md.is_template = true"); }

  const result = await query(
    `SELECT md.*, bk.name AS brand_kit_name
     FROM marketing_designs md
     LEFT JOIN brand_kits bk ON bk.id = md.brand_kit_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY md.updated_at DESC LIMIT 100`,
    values,
  );
  return result.rows;
}

export async function listTemplates(context, { kind } = {}) {
  const conditions = ["(md.is_template = true OR md.is_approved_template = true)"];
  const values = [];
  let idx = 1;
  if (kind) { conditions.push(`md.kind = $${idx}`); values.push(kind); idx++; }

  const result = await query(
    `SELECT md.*, bk.name AS brand_kit_name
     FROM marketing_designs md
     LEFT JOIN brand_kits bk ON bk.id = md.brand_kit_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY md.is_approved_template DESC, md.updated_at DESC LIMIT 50`,
    values,
  );
  return result.rows;
}

export async function createDesign(input, context) {
  await requireFeatureAccess(context, "marketing_studio");
  await requireUsageLimit(context, "marketingDesigns");

  if (!TEMPLATE_KINDS.includes(input.kind)) throw new AccessError("VALIDATION_ERROR", `Unknown design kind: ${input.kind}`);

  const preset = CANVAS_PRESETS[input.canvasPreset] || CANVAS_PRESETS.a4;
  const canvasWidth = Number.isInteger(input.canvasWidth) ? input.canvasWidth : preset.width;
  const canvasHeight = Number.isInteger(input.canvasHeight) ? input.canvasHeight : preset.height;
  const externalKey = `design-${crypto.randomUUID()}`;

  const result = await query(
    `INSERT INTO marketing_designs (external_key, owner_user_id, organization_id, brand_kit_id, name, kind, template_id,
      is_template, is_organization_template, canvas_width, canvas_height, elements, dynamic_bindings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb)
     RETURNING *`,
    [
      externalKey, context.user.id, context.organization?.id || null,
      input.brandKitId || null, input.name, input.kind, input.templateId || null,
      input.isTemplate || false, input.isOrganizationTemplate || false,
      canvasWidth, canvasHeight,
      JSON.stringify(input.elements || []),
      JSON.stringify(input.dynamicBindings || {}),
    ],
  );
  const design = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "marketing_design.created", targetType: "marketing_design",
    targetId: design.id, metadata: { kind: input.kind, name: input.name },
  });
  return { design };
}

export async function updateDesign(designId, input, context) {
  const existing = await getDesign(context, designId);

  const updates = [];
  const values = [];
  let idx = 1;

  const allowedFields = ["name", "brand_kit_id", "template_id", "canvas_width", "canvas_height"];
  const jsonFields = ["elements", "dynamic_bindings"];

  for (const [key, value] of Object.entries(input)) {
    if (allowedFields.includes(key)) {
      updates.push(`${snakeCase(key)} = $${idx}`);
      values.push(value);
      idx++;
    } else if (jsonFields.includes(key)) {
      if (key === "elements") {
        validateElements(value);
      }
      updates.push(`${snakeCase(key)} = $${idx}::jsonb`);
      values.push(JSON.stringify(value));
      idx++;
    }
  }

  if (!updates.length) return { design: existing };

  values.push(designId);
  updates.push("updated_at = NOW()");
  const result = await query(
    `UPDATE marketing_designs SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );
  const design = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "marketing_design.updated", targetType: "marketing_design",
    targetId: designId, metadata: { updatedFields: Object.keys(input) },
  });
  return { design };
}

export async function duplicateDesign(designId, context) {
  const source = await query(
    `SELECT * FROM marketing_designs
     WHERE id = $1 AND (owner_user_id = $2 OR ($3::uuid IS NOT NULL AND organization_id = $3) OR $4 = true OR is_approved_template = true)
     LIMIT 1`,
    [designId, context.user.id, context.organization?.id || null, context.isAdmin],
  );
  if (!source.rowCount) throw new AccessError("NOT_FOUND", "Template not found.");
  const existing = source.rows[0];
  await requireFeatureAccess(context, "marketing_studio");
  await requireUsageLimit(context, "marketingDesigns");

  const externalKey = `design-${crypto.randomUUID()}`;
  const result = await query(
    `INSERT INTO marketing_designs (external_key, owner_user_id, organization_id, brand_kit_id, name, kind, template_id,
      canvas_width, canvas_height, elements, dynamic_bindings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
     RETURNING *`,
    [
      externalKey, context.user.id, context.organization?.id || null,
      existing.brand_kit_id, `${existing.name} (copy)`, existing.kind, existing.template_id,
      existing.canvas_width, existing.canvas_height,
      JSON.stringify(existing.elements || []), JSON.stringify(existing.dynamic_bindings || {}),
    ],
  );
  const design = result.rows[0];
  await recordAuditEvent({
    actorId: context.user.id, action: "marketing_design.duplicated", targetType: "marketing_design",
    targetId: design.id, metadata: { sourceId: designId },
  });
  return { design };
}

export async function archiveDesign(designId, context) {
  const existing = await getDesign(context, designId);
  const result = await query(
    "UPDATE marketing_designs SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *",
    [designId],
  );
  await recordAuditEvent({
    actorId: context.user.id, action: "marketing_design.archived", targetType: "marketing_design", targetId: designId,
  });
  return { design: result.rows[0] };
}

export async function saveAsTemplate(designId, context) {
  const existing = await getDesign(context, designId);
  const result = await query(
    `UPDATE marketing_designs SET is_template = true, is_organization_template = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [designId, context.organization ? true : false],
  );
  await recordAuditEvent({
    actorId: context.user.id, action: "marketing_design.saved_as_template", targetType: "marketing_design", targetId: designId,
  });
  return { design: result.rows[0] };
}

export async function approveTemplate(designId, context) {
  if (!context.isAdmin && !context.canModerate) throw new AccessError("FORBIDDEN", "Administrative access is required.");
  const result = await query(
    "UPDATE marketing_designs SET is_approved_template = true, updated_at = NOW() WHERE id = $1 RETURNING *",
    [designId],
  );
  await recordAuditEvent({
    actorId: context.user.id, action: "marketing_design.template_approved", targetType: "marketing_design", targetId: designId,
  });
  return { design: result.rows[0] };
}

export async function exportDesign(designId, format, context) {
  const design = await getDesign(context, designId);
  await requireFeatureAccess(context, format === "pdf" ? "pdf_export" : "image_export");
  await requireUsageLimit(context, format === "pdf" ? "pdfExports" : "imageExports");

  const storageKey = `design-exports/${context.organization?.id || context.user.id}/${design.id}-${crypto.randomBytes(4).toString("hex")}.${format}`;
  let buffer;
  let contentType;

  if (format === "pdf") {
    buffer = await renderDesignToPdf(design);
    contentType = "application/pdf";
  } else {
    buffer = await renderDesignToImage(design, format);
    contentType = `image/${format === "jpeg" ? "jpeg" : format}`;
  }

  await putPrivateObject({ key: storageKey, body: buffer, contentType });
  const result = await query(
    `INSERT INTO design_exports (design_id, format, storage_key, file_size_bytes)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [designId, format, storageKey, buffer.length],
  );

  await recordAuditEvent({
    actorId: context.user.id, action: "marketing_design.exported", targetType: "marketing_design",
    targetId: designId, metadata: { format, fileSize: buffer.length },
  });

  return { exportId: result.rows[0].id, storageKey, contentType, fileSize: buffer.length };
}

async function renderDesignToPdf(design) {
  const width = design.canvas_width || 595;
  const height = design.canvas_height || 842;
  const pageImage = await renderDesignToImage(design, "png");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [width, height], margin: 0 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.image(pageImage, 0, 0, { width, height });
    doc.end();
  });
}

async function renderDesignToImage(design, format) {
  const elements = typeof design.elements === "string" ? JSON.parse(design.elements) : design.elements || [];
  const width = design.canvas_width || 595;
  const height = design.canvas_height || 842;
  const rendered = await Promise.all(elements.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(renderElementToSvg));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/>${rendered.join("")}</svg>`;
  const pipeline = sharp(Buffer.from(svg), { density: 144 });
  return format === "jpeg" ? pipeline.jpeg({ quality: 92 }).toBuffer() : pipeline.png({ compressionLevel: 8 }).toBuffer();
}

async function renderElementToSvg(element) {
  const x = finite(element.x, 0), y = finite(element.y, 0);
  const width = Math.max(1, finite(element.width, 100)), height = Math.max(1, finite(element.height, 40));
  const rotation = finite(element.rotation, 0);
  const transform = rotation ? ` transform="rotate(${rotation} ${x + width / 2} ${y + height / 2})"` : "";
  const style = element.style || {};
  if (element.type === "shape") {
    const fill = safeColor(style.fillColor, "#e98d7e");
    if (["circle", "ellipse"].includes(style.shapeType)) return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fill}"${transform}/>`;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${finite(style.borderRadius, 0)}" fill="${fill}"${transform}/>`;
  }
  if (element.type === "line") return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y + height}" stroke="${safeColor(style.color, "#173b31")}" stroke-width="${finite(style.lineWidth, 1)}"${transform}/>`;
  if (element.type === "text" || element.type === "dynamic_field") {
    const fontSize = Math.max(6, finite(style.fontSize, 12));
    const fontFamily = escapeXml(style.fontFamily || "Arial");
    const fontWeight = style.fontWeight === "bold" || Number(style.fontWeight) >= 600 ? "700" : "400";
    const anchor = style.textAlign === "center" ? "middle" : style.textAlign === "right" ? "end" : "start";
    const textX = anchor === "middle" ? x + width / 2 : anchor === "end" ? x + width : x;
    const lines = String(element.content || "").split(/\r?\n/).slice(0, 30);
    return `<text x="${textX}" y="${y + fontSize}" fill="${safeColor(style.color, "#17231f")}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${anchor}"${transform}>${lines.map((line, index) => `<tspan x="${textX}" dy="${index ? fontSize * finite(style.lineHeight, 1.15) : 0}">${escapeXml(line)}</tspan>`).join("")}</text>`;
  }
  if (element.type === "image") {
    const dataUri = await localImageDataUri(element.payload?.src || element.content);
    return dataUri ? `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${dataUri}" preserveAspectRatio="xMidYMid slice"${transform}/>` : `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#e7ede9"${transform}/>`;
  }
  if (element.type === "qr_code") {
    const rawTarget = element.payload?.target || element.payload?.destination || element.content;
    const target = typeof rawTarget === "string" ? rawTarget : rawTarget?.destination || "https://nestora.doctarx.com";
    const dataUri = await QRCode.toDataURL(target, { width: Math.round(Math.max(width, height)), margin: 1, color: { dark: safeColor(style.color, "#17231f"), light: "#ffffff" } });
    return `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${dataUri}"${transform}/>`;
  }
  return "";
}

async function localImageDataUri(source) {
  if (typeof source !== "string" || !source.startsWith("/")) return null;
  const publicRoot = path.resolve(process.cwd(), "public");
  const filename = path.resolve(publicRoot, `.${source.split("?")[0]}`);
  if (!filename.startsWith(`${publicRoot}${path.sep}`)) return null;
  try {
    const buffer = await readFile(filename);
    const extension = path.extname(filename).toLowerCase();
    const mime = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function finite(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
function safeColor(value, fallback) { return typeof value === "string" && /^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(value) ? value : fallback; }
function escapeXml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]); }

function validateElements(elements) {
  if (!Array.isArray(elements)) throw new AccessError("VALIDATION_ERROR", "Elements must be an array.");
  for (const el of elements) {
    if (!ALLOWED_ELEMENT_TYPES.includes(el.type)) {
      throw new AccessError("VALIDATION_ERROR", `Unknown element type: ${el.type}`);
    }
    if (el.type === "text" && el.content && el.content.length > 10000) {
      throw new AccessError("VALIDATION_ERROR", "Text content exceeds maximum length.");
    }
    if (el.style?.fontFamily && !ALLOWED_FONTS.includes(el.style.fontFamily)) {
      throw new AccessError("VALIDATION_ERROR", `Unsupported font: ${el.style.fontFamily}`);
    }
  }
}

function snakeCase(value) {
  return value.replace(/([A-Z])/g, "_$1").toLowerCase();
}
