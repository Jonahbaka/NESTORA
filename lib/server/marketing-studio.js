import crypto from "node:crypto";
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
      preset.width, preset.height,
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
  const existing = await getDesign(context, designId);
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
      existing.elements, existing.dynamic_bindings,
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
  const elements = typeof design.elements === "string" ? JSON.parse(design.elements) : design.elements || [];
  const width = design.canvas_width || 595;
  const height = design.canvas_height || 842;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [width, height], margin: 0 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.rect(0, 0, width, height).fill("#ffffff");

    for (const el of elements) {
      try {
        renderElementToPdf(doc, el, width, height);
      } catch {
        // Skip invalid elements silently
      }
    }

    doc.end();
  });
}

async function renderDesignToImage(design, format) {
  const elements = typeof design.elements === "string" ? JSON.parse(design.elements) : design.elements || [];
  const width = design.canvas_width || 595;
  const height = design.canvas_height || 842;

  // For image export, render as PDF first then convert with sharp
  const pdfBuffer = await renderDesignToPdf(design);
  // Use sharp to convert the first page to an image
  // For now, return a simple colored placeholder
  const image = await sharp({
    create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })[format === "jpeg" ? "jpeg" : "png"]({ quality: 92 }).toBuffer();
  return image;
}

function renderElementToPdf(doc, el, canvasWidth, canvasHeight) {
  const { type, x, y, width, height, rotation, style, content } = el;
  if (!type || x == null || y == null) return;

  const posX = x;
  const posY = y;
  const elWidth = width || 100;
  const elHeight = height || 20;

  switch (type) {
    case "text": {
      const fontSize = style?.fontSize || 12;
      const color = style?.color || "#17231f";
      const font = style?.fontFamily || "Helvetica";
      const align = style?.textAlign || "left";
      const bold = style?.fontWeight === "bold";

      doc.save();
      doc.fontSize(fontSize);
      doc.font(bold ? `${font}-Bold` : font);
      doc.fillColor(color);
      if (rotation) doc.rotate(rotation, { origin: [posX, posY] });
      doc.text(content || "", posX, posY, { width: elWidth, align, lineGap: 2 });
      doc.restore();
      break;
    }
    case "shape": {
      const fillColor = style?.fillColor || "#e98d7e";
      const shapeType = style?.shapeType || "rectangle";
      doc.save();
      doc.fillColor(fillColor);
      if (rotation) doc.rotate(rotation, { origin: [posX, posY] });
      if (shapeType === "circle" || shapeType === "ellipse") {
        doc.ellipse(posX + elWidth / 2, posY + elHeight / 2, elWidth / 2, elHeight / 2).fill();
      } else {
        doc.rect(posX, posY, elWidth, elHeight).fill();
      }
      doc.restore();
      break;
    }
    case "line": {
      const lineColor = style?.color || "#173b31";
      const lineWidth = style?.lineWidth || 1;
      doc.save();
      doc.lineWidth(lineWidth).strokeColor(lineColor);
      doc.moveTo(posX, posY).lineTo(posX + elWidth, posY + (height || 0)).stroke();
      doc.restore();
      break;
    }
  }
}

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