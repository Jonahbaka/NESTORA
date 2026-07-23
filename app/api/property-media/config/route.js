import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { hasDatabase } from "@/lib/server/db";
import { getPropertyMediaConfiguration, updatePropertyMediaConfiguration } from "@/lib/server/property-media-services";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";

const mediaItem = z.object({ src: z.string().trim().startsWith("/").max(300), alt: z.string().trim().min(12).max(300) });
const updateSchema = z.object({
  depositPercent: z.number().min(0).max(100),
  taxMode: z.enum(["inclusive", "exclusive"]),
  taxRatePercent: z.number().min(0).max(100),
  taxLabel: z.string().trim().min(5).max(300),
  includedRadiusKm: z.number().min(0).max(1000),
  additionalKmRateNgn: z.number().int().min(0).max(10000000),
  hostingRenewalNgn: z.number().int().min(0).max(100000000),
  packagePrices: z.record(z.string(), z.number().int().min(0).max(1000000000)),
  extraPrices: z.record(z.string(), z.number().int().min(0).max(1000000000)),
  serviceMedia: z.object({ team: mediaItem, interior: mediaItem, drone: mediaItem }).optional(),
});

export async function GET() {
  if (!hasDatabase()) return unavailable();
  try {
    return NextResponse.json(await getPropertyMediaConfiguration(), { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Property-media configuration read failed", { message: error.message });
    return unavailable();
  }
}

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "property-media-config", { limit: 12, windowMs: 60_000 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the pricing configuration and try again." }, { status: 400 });
    const context = await getWorkspaceContext({ workspace: "admin" });
    return NextResponse.json(await updatePropertyMediaConfiguration({ context, input: parsed.data }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    const access = accessErrorResponse(error);
    if (access) return NextResponse.json({ error: access.message }, { status: access.status });
    console.error("Property-media configuration update failed", { message: error.message });
    return unavailable();
  }
}

function unavailable() {
  return NextResponse.json({ error: "Property-media pricing is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
