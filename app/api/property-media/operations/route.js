import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { hasDatabase } from "@/lib/server/db";
import { attachDeliveredMedia, listPropertyMediaOperations, updatePropertyMediaOperation } from "@/lib/server/property-media-services";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    bookingId: z.uuid(),
    status: z.enum(["requested", "quote_pending", "awaiting_deposit", "confirmed", "scheduled", "capture_completed", "editing", "ready_for_review", "delivered", "cancelled"]),
    paymentStatus: z.enum(["unpaid", "deposit_pending", "deposit_paid", "paid", "refunded", "failed"]),
    staffAssignment: z.string().trim().max(140).optional().default(""),
    photographerAssignment: z.string().trim().max(140).optional().default(""),
    droneOperatorAssignment: z.string().trim().max(140).optional().default(""),
    equipmentRequirements: z.array(z.string().trim().min(1).max(140)).max(50).default([]),
    scheduledAt: z.union([z.iso.datetime(), z.literal("")]).optional().default(""),
    productionNotes: z.string().trim().max(10000).optional().default(""),
    revisionRequests: z.array(z.string().trim().min(1).max(1000)).max(50).default([]),
  }),
  z.object({
    action: z.literal("attachMedia"),
    bookingId: z.uuid(),
    mediaId: z.uuid(),
    mediaSource: z.enum(["professional_photography", "drone", "tour_360", "floor_plan", "brand_asset"]),
  }),
]);

export async function GET() {
  if (!hasDatabase()) return unavailable();
  try {
    const context = await getWorkspaceContext({ workspace: "admin" });
    return NextResponse.json({ bookings: await listPropertyMediaOperations(context) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "property-media-operations", { limit: 90, windowMs: 60_000 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the operations update and try again." }, { status: 400 });
    const context = await getWorkspaceContext({ workspace: "admin" });
    if (parsed.data.action === "attachMedia") {
      return NextResponse.json({ media: await attachDeliveredMedia({ context, input: parsed.data }) }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ booking: await updatePropertyMediaOperation({ context, input: { ...parsed.data, scheduledAt: parsed.data.scheduledAt || null } }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error);
  }
}

function routeError(error) {
  const access = accessErrorResponse(error);
  if (access) return NextResponse.json({ error: access.message }, { status: access.status });
  console.error("Property-media operations failed", { message: error.message });
  return unavailable();
}

function unavailable() {
  return NextResponse.json({ error: "Photography operations are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
