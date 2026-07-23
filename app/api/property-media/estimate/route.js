import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { hasDatabase } from "@/lib/server/db";
import { estimatePropertyMediaBooking } from "@/lib/server/property-media-services";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

const schema = z.object({
  packageId: z.string().trim().min(2).max(80),
  preferredDate: z.iso.date(),
  distanceKm: z.number().min(0).max(5000).default(0),
  permitAllowanceNgn: z.number().int().min(0).max(100000000).default(0),
  extras: z.record(z.string(), z.union([z.boolean(), z.number().min(0).max(100)])).default({}),
});

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "property-media-estimate", { limit: 30, windowMs: 60_000 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Choose a valid package, date and extras." }, { status: 400 });
    return NextResponse.json({ estimate: await estimatePropertyMediaBooking(parsed.data) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    const access = accessErrorResponse(error);
    if (access) return NextResponse.json({ error: access.message }, { status: access.status });
    if (error.message === "INVALID_PACKAGE") return NextResponse.json({ error: "Choose a valid property-media package." }, { status: 400 });
    console.error("Property-media estimate failed", { message: error.message });
    return unavailable();
  }
}

function unavailable() {
  return NextResponse.json({ error: "A secure estimate could not be calculated right now." }, { status: 503 });
}
