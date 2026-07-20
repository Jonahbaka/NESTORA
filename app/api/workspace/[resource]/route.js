import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { recordMonitoringEvent } from "@/lib/server/audit";
import { hasDatabase } from "@/lib/server/db";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";
import { readWorkspaceResource, writeWorkspaceResource } from "@/lib/server/workspace-operations";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  action: z.literal("update"),
  headline: z.string().trim().min(3).max(140),
  biography: z.string().trim().min(20).max(3000),
  serviceAreas: z.array(z.string().trim().min(1).max(80)).max(30),
  languages: z.array(z.string().trim().min(1).max(80)).max(20),
  specialisations: z.array(z.string().trim().min(1).max(100)).max(30),
  isPublic: z.boolean(),
});
const feesSchema = z.object({
  serviceCharge: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  cautionDeposit: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  agencyFee: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  legalFee: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  cleaningFee: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
const listingFields = {
  title: z.string().trim().min(3).max(140),
  propertyType: z.string().trim().min(2).max(80),
  addressLine1: z.string().trim().min(3).max(180),
  addressLine2: z.string().trim().max(180),
  city: z.string().trim().min(2).max(100),
  stateRegion: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(24),
  priceAmount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  description: z.string().trim().min(20).max(5000),
  bedrooms: z.number().int().min(0).max(100).nullable(),
  bathrooms: z.number().min(0).max(100).nullable(),
  areaSqm: z.number().positive().max(10_000_000).nullable(),
  features: z.array(z.string().trim().min(1).max(100)).max(80),
  fees: feesSchema,
  availabilityStatus: z.enum(["available", "coming_soon", "occupied", "unavailable"]),
  availableFrom: z.iso.date().nullable(),
  tourEnabled: z.boolean(),
};
const listingSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), category: z.enum(["rent", "sale", "stay", "development"]), ...listingFields }),
  z.object({ action: z.literal("update"), id: z.string().trim().min(1).max(160), ...listingFields }),
  z.object({ action: z.literal("submit"), id: z.string().trim().min(1).max(160) }),
  z.object({ action: z.literal("archive"), id: z.string().trim().min(1).max(160) }),
]);
const leadSchema = z.object({ action: z.literal("update"), id: z.uuid(), stage: z.enum(["new", "contacted", "qualified", "inspection", "reservation", "won", "lost"]), priority: z.enum(["low", "normal", "high", "urgent"]), nextAction: z.string().trim().max(500).optional(), ownerUserId: z.uuid().nullable().optional() });
const inspectionSchema = z.object({ action: z.literal("update"), id: z.uuid(), status: z.enum(["proposed", "confirmed", "reschedule_requested", "cancelled", "completed"]), scheduledAt: z.iso.datetime(), notes: z.string().trim().max(2000).optional() });
const hotelSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reservation"), id: z.uuid(), status: z.enum(["requested", "confirmed", "declined", "cancelled", "completed"]), paymentStatus: z.enum(["unpaid", "pending", "paid", "refunded", "failed"]) }),
  z.object({ action: z.literal("room"), id: z.uuid(), status: z.enum(["available", "occupied", "maintenance", "inactive"]) }),
  z.object({ action: z.literal("roomType"), listingId: z.string().trim().min(1).max(160), code: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9-]+$/), name: z.string().trim().min(2).max(100), capacity: z.number().int().min(1).max(30), nightlyRate: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }),
  z.object({ action: z.literal("roomCreate"), roomTypeId: z.uuid(), code: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9-]+$/) }),
]);
const developerSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("unit"), id: z.uuid(), status: z.enum(["available", "reserved", "sold", "unavailable"]), priceAmount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }),
  z.object({ action: z.literal("development"), id: z.uuid(), progress: z.number().int().min(0).max(100), paymentPlan: z.string().trim().min(3).max(3000), completionDate: z.iso.date().nullable().optional() }),
  z.object({ action: z.literal("developmentCreate"), name: z.string().trim().min(3).max(140), location: z.string().trim().min(3).max(180), completionDate: z.iso.date().nullable().optional(), paymentPlan: z.string().trim().min(3).max(3000) }),
  z.object({ action: z.literal("blockCreate"), developmentId: z.uuid(), code: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9-]+$/), name: z.string().trim().min(2).max(100), floors: z.number().int().min(1).max(250) }),
  z.object({ action: z.literal("unitTypeCreate"), developmentId: z.uuid(), code: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9-]+$/), name: z.string().trim().min(2).max(100), bedrooms: z.number().int().min(0).max(100), bathrooms: z.number().min(0).max(100), areaSqm: z.number().positive().max(100000), priceAmount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }),
  z.object({ action: z.literal("unitCreate"), developmentId: z.uuid(), blockId: z.uuid(), unitTypeId: z.uuid(), code: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9-]+$/), floor: z.number().int().min(0).max(250), priceAmount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }),
]);
const teamSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), email: z.string().trim().email().max(254), role: z.enum(["admin", "manager", "agent", "sales", "front_desk"]) }),
  z.object({ action: z.literal("routingRule"), name: z.string().trim().min(2).max(120), source: z.enum(["listing", "profile", "qr", "tour", "hotel", "development"]).nullable().optional(), listingCategory: z.enum(["rent", "sale", "stay", "development"]).nullable().optional(), assigneeUserId: z.uuid().nullable().optional(), strategy: z.enum(["fixed", "round_robin", "least_active"]), priority: z.number().int().min(1).max(1000) }),
  z.object({ action: z.literal("member"), userId: z.uuid(), role: z.enum(["owner", "admin", "manager", "agent", "sales", "front_desk"]), status: z.enum(["active", "suspended", "removed"]) }),
]);
const adminSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("report"), id: z.uuid(), status: z.enum(["investigating", "resolved", "dismissed"]), reason: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("verification"), id: z.uuid(), status: z.enum(["approved", "revision_requested", "rejected"]), reason: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("conversationReport"), id: z.uuid(), status: z.enum(["investigating", "resolved", "dismissed"]), reason: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("incident"), id: z.uuid() }),
  z.object({ action: z.literal("listingDecision"), id: z.string().trim().min(1).max(160), status: z.enum(["approved", "rejected", "suspended"]), reason: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("userStatus"), id: z.uuid(), status: z.enum(["active", "suspended"]), reason: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("subscription"), subjectType: z.enum(["user", "organization"]), subjectId: z.uuid(), planId: z.string().trim().min(1).max(80), status: z.enum(["active", "trial", "grace", "founding_partner"]), endsAt: z.iso.datetime().nullable().optional(), billingInterval: z.enum(["monthly", "annual", "founding_partner", "trial", "promotional"]).optional(), reason: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("planDefinition"), planId: z.string().trim().min(1).max(80), name: z.string().trim().min(2).max(100), audience: z.string().trim().max(200).optional(), monthlyPriceNgn: z.number().int().nonnegative(), annualPriceNgn: z.number().int().nonnegative().nullable().optional(), limits: z.record(z.any()), features: z.array(z.string()), isActive: z.boolean().optional() }),
  z.object({ action: z.literal("suspendWebsite"), websiteId: z.uuid(), reason: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("reinstateWebsite"), websiteId: z.uuid() }),
  z.object({ action: z.literal("approveTemplate"), designId: z.uuid() }),
]);
const VALID_MARKETING_KINDS = [
  "rental_flyer", "sale_brochure", "development_brochure", "hotel_flyer",
  "payment_plan", "qr_poster", "comparison_sheet", "agent_profile",
  "open_house_poster", "agent_profile_sheet", "agency_brochure",
  "payment_plan_sheet", "construction_update", "room_promotion",
  "short_stay_flyer", "weekend_offer", "social_square", "social_portrait",
  "social_story", "whatsapp_status", "facebook_post", "linkedin_post",
  "youtube_thumbnail", "digital_sign", "email_header",
];

const VALID_CANVAS_PRESETS = [
  "a4", "us_letter", "square", "portrait", "story", "landscape",
  "social_square", "social_portrait", "social_story",
];

const ELEMENT_VALID_TYPES = ["text", "image", "shape", "qr_code", "dynamic_field", "line", "group"];
const ELEMENT_VALID_FONTS = ["Inter", "Helvetica", "Times New Roman", "Georgia", "Arial", "system-ui", "sans-serif", "serif", "monospace"];

const elementSchema = z.object({
  id: z.string().trim().min(1).max(200),
  type: z.enum(ELEMENT_VALID_TYPES),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rotation: z.number().min(-360).max(360).default(0),
  locked: z.boolean().default(false),
  zIndex: z.number().int().min(0).max(9999).default(1),
  content: z.string().max(10000).default(""),
  style: z.object({
    fontFamily: z.enum(ELEMENT_VALID_FONTS).optional(),
    fontSize: z.number().int().min(4).max(200).optional(),
    fontWeight: z.string().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{3,6}$|^#[0-9a-fA-F]{8}$/).optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    fillColor: z.string().regex(/^#[0-9a-fA-F]{3,6}$|^#[0-9a-fA-F]{8}$/).optional(),
    lineWidth: z.number().int().min(1).max(20).optional(),
    shapeType: z.enum(["rectangle", "circle", "ellipse"]).optional(),
  }).optional(),
  mediaId: z.string().trim().max(200).nullable().optional(),
  src: z.string().trim().max(2000).nullable().optional(),
  payload: z.string().trim().max(500).nullable().optional(),
  listingId: z.string().trim().max(160).nullable().optional(),
}).passthrough().partial({
  content: true, style: true, mediaId: true, src: true, payload: true, listingId: true,
});

const marketingSaveSchema = z.object({
  action: z.literal("save"),
  designId: z.string().trim().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  kind: z.enum(VALID_MARKETING_KINDS).optional(),
  canvasPreset: z.enum(VALID_CANVAS_PRESETS).optional(),
  canvasWidth: z.number().int().positive().max(10000).optional(),
  canvasHeight: z.number().int().positive().max(10000).optional(),
  brandKitId: z.string().trim().uuid().nullable().optional(),
  elements: z.array(elementSchema).default([]),
  dynamicBindings: z.record(z.string()).default({}),
});

const marketingExportSchema = z.object({
  action: z.literal("export"),
  designId: z.string().trim().uuid(),
  format: z.enum(["pdf", "png", "jpeg"]),
});

const marketingGenerateSchema = z.object({
  action: z.literal("generate"),
  kind: z.enum(VALID_MARKETING_KINDS),
  listingId: z.string().trim().min(1).max(160).nullable().optional(),
  developmentId: z.string().trim().uuid().nullable().optional(),
  qrTarget: z.string().trim().max(500).refine((value) => !value || (value.startsWith("/") && !value.startsWith("//")), "Use a Nestora path beginning with one slash.").nullable().optional(),
});

const marketingSchema = z.discriminatedUnion("action", [
  marketingGenerateSchema,
  marketingSaveSchema,
  marketingExportSchema,
]);

const brandKitSchema = z.object({
  action: z.enum(["create", "update", "delete", "lock", "unlock"]),
  name: z.string().trim().min(2).max(120).optional(),
  brandColors: z.record(z.string()).optional(),
  fonts: z.record(z.string()).optional(),
  contactFooter: z.string().trim().max(500).optional(),
  websiteUrl: z.string().trim().max(200).optional(),
  socialHandles: z.record(z.string()).optional(),
  disclaimer: z.string().trim().max(2000).optional(),
  defaultQrStyle: z.record(z.any()).optional(),
  isOrganizationKit: z.boolean().optional(),
  brandKitId: z.uuid().optional(),
  logoMediaId: z.uuid().nullable().optional(),
  alternateLogoMediaId: z.uuid().nullable().optional(),
});
const templateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(1).max(200),
    kind: z.enum(VALID_MARKETING_KINDS),
    templateId: z.string().trim().uuid().nullable().optional(),
    canvasPreset: z.enum(VALID_CANVAS_PRESETS).optional(),
    brandKitId: z.string().trim().uuid().nullable().optional(),
    elements: z.array(elementSchema).default([]),
    dynamicBindings: z.record(z.string()).default({}),
    isTemplate: z.boolean().optional(),
    isOrganizationTemplate: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("duplicate"),
    designId: z.string().trim().uuid(),
  }),
]);
const writeSchemas = { profile: profileSchema, listings: listingSchema, leads: leadSchema, inspections: inspectionSchema, hotel: hotelSchema, developer: developerSchema, team: teamSchema, admin: adminSchema, marketing: marketingSchema, subscription: z.object({ action: z.enum(["requestUpgrade"]), planId: z.string().trim().min(1).max(80) }), "brand-kits": brandKitSchema, templates: templateSchema };

export async function GET(request, { params }) {
  const { resource } = await params;
  if (!hasDatabase()) return unavailable();
  try {
    const workspace = new URL(request.url).searchParams.get("workspace") || undefined;
    const context = await getWorkspaceContext({ workspace });
    const data = await readWorkspaceResource(resource, context);
    return NextResponse.json({ ...data, account: publicContext(context) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error, { source: `workspace.${resource}.read` });
  }
}

export async function POST(request, { params }) {
  const { resource } = await params;
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, `workspace-${resource}`, { limit: 90, windowMs: 60_000 });
    const schema = writeSchemas[resource];
    if (!schema) return NextResponse.json({ error: "This workspace resource is read-only." }, { status: 405 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the submitted details and try again.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
    const workspace = new URL(request.url).searchParams.get("workspace") || undefined;
    const context = await getWorkspaceContext({ workspace });
    const data = await writeWorkspaceResource(resource, parsed.data, context);
    const created = ["create", "invite", "roomType", "roomCreate", "developmentCreate", "blockCreate", "unitTypeCreate", "unitCreate", "routingRule", "generate"].includes(parsed.data.action);
    return NextResponse.json(data, { status: created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error, { source: `workspace.${resource}.write` });
  }
}

function publicContext(context) {
  return {
    id: context.user.id,
    name: context.user.name,
    email: context.user.email,
    role: context.user.role,
    workspace: context.workspace,
    organization: context.organization ? { id: context.organization.id, name: context.organization.name, kind: context.organization.kind, role: context.membership?.role } : null,
  };
}

function unavailable() {
  return NextResponse.json({ error: "Workspace data is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

async function routeError(error, { source }) {
  const access = accessErrorResponse(error);
  if (access) return NextResponse.json({ error: access.message }, { status: access.status, headers: { "Cache-Control": "no-store" } });
  if (error?.code === "23505") return NextResponse.json({ error: "That code or identifier is already in use." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  console.error("Workspace operation failed", { source, message: error.message });
  await recordMonitoringEvent({ level: "error", source, eventKey: "workspace_operation_failed", message: error.message }).catch(() => null);
  return unavailable();
}
