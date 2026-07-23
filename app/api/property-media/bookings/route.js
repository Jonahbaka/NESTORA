import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { hasDatabase } from "@/lib/server/db";
import { getOptionalWorkspaceContext } from "@/lib/server/optional-workspace-context";
import { createPropertyMediaBooking, listPropertyMediaBookings } from "@/lib/server/property-media-services";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";

const text = (min, max) => z.string().trim().min(min).max(max);
const schema = z.object({
  customerName: text(2, 140),
  email: z.string().trim().email().max(254),
  phone: text(7, 40),
  whatsapp: text(7, 40),
  customerType: z.enum(["agent", "agency", "developer", "hotel", "short_stay", "landlord", "property_manager", "commercial_owner", "other"]),
  propertyType: text(2, 100),
  propertyAddress: text(5, 300),
  mapLocation: z.string().trim().max(300).optional().default(""),
  packageId: text(2, 80),
  extras: z.record(z.string(), z.union([z.boolean(), z.number().min(0).max(100)])).default({}),
  rooms: z.number().int().min(0).max(1000),
  unitTypes: z.number().int().min(0).max(1000),
  approximateSizeSqm: z.number().min(0).max(10000000),
  distanceKm: z.number().min(0).max(5000),
  permitAllowanceNgn: z.number().int().min(0).max(100000000).default(0),
  droneRequested: z.boolean(),
  tour360Requested: z.boolean(),
  preferredDate: z.iso.date(),
  alternateDate: z.union([z.iso.date(), z.literal("")]).default(""),
  accessInstructions: z.string().trim().max(3000).default(""),
  occupancyStatus: z.enum(["vacant", "occupied", "partly_occupied", "under_construction", "operational_hospitality"]),
  specialRequirements: z.string().trim().max(3000).default(""),
  listingId: z.string().trim().max(160).optional().default(""),
  consent: z.literal(true),
}).strict();

export async function GET() {
  if (!hasDatabase()) return unavailable();
  try {
    const context = await getWorkspaceContext();
    return NextResponse.json({ bookings: await listPropertyMediaBookings(context) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "property-media-booking", { limit: 6, windowMs: 10 * 60_000 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check every required booking detail and try again.", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }
    const context = await getOptionalWorkspaceContext();
    const booking = await createPropertyMediaBooking({
      context,
      input: { ...parsed.data, alternateDate: parsed.data.alternateDate || null, listingId: parsed.data.listingId || null },
    });
    return NextResponse.json({ booking }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error);
  }
}

function routeError(error) {
  const access = accessErrorResponse(error);
  if (access) return NextResponse.json({ error: access.message }, { status: access.status, headers: { "Cache-Control": "no-store" } });
  if (error.message === "INVALID_PACKAGE") return NextResponse.json({ error: "Choose a valid property-media package." }, { status: 400 });
  console.error("Property-media booking operation failed", { message: error.message });
  return unavailable();
}

function unavailable() {
  return NextResponse.json({ error: "Property-media booking is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
