import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasDatabase } from "@/lib/server/db";
import { accessErrorResponse, requireActiveSessionUser } from "@/lib/server/authorization";
import { createBookingRequest, createInspectionRequest, getMemberState, setMemberMark } from "@/lib/server/member-state";
import { getPublicListing } from "@/lib/server/public-listings";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const markSchema = z.object({
  type: z.literal("mark"),
  key: z.literal("saved"),
  value: z.string().trim().min(1).max(160),
  enabled: z.boolean(),
});
const futureDate = z.iso.date().refine((value) => value >= new Date().toISOString().slice(0, 10), "Date must not be in the past");
const requestBase = { propertyId: z.string().trim().min(1).max(160), date: futureDate };
const bookingSchema = z.object({ type: z.literal("booking"), ...requestBase, guests: z.number().int().min(1).max(30), nights: z.number().int().min(1).max(365) });
const inspectionSchema = z.object({ type: z.literal("inspection"), ...requestBase });
const writeSchema = z.discriminatedUnion("type", [markSchema, bookingSchema, inspectionSchema]);

export async function GET() {
  try {
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "Sign in to access account activity." }, { status: 401 });
    if (!hasDatabase()) return unavailable();
    const user = await requireActiveSessionUser(session);
    return NextResponse.json({ state: await getMemberState(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const access = accessErrorResponse(error);
    if (access) return NextResponse.json({ error: access.message }, { status: access.status, headers: { "Cache-Control": "no-store" } });
    if (error.code === "NO_AVAILABILITY" || error.code === "LISTING_UNAVAILABLE") return NextResponse.json({ error: error.message }, { status: 409, headers: { "Cache-Control": "no-store" } });
    console.error("Account activity read failed", error);
    return unavailable();
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    rateLimit(request, "account-state", { limit: 90, windowMs: 60_000 });
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "Sign in to keep this activity with your account." }, { status: 401 });
    if (!hasDatabase()) return unavailable();
    const user = await requireActiveSessionUser(session);
    const parsed = writeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the request details and try again." }, { status: 400 });
    const input = parsed.data;
    const property = input.type === "mark" ? await getPublicListing(input.value) : await getPublicListing(input.propertyId);
    if (input.type === "mark" && !property) return NextResponse.json({ error: "That item is no longer available." }, { status: 404 });
    if (input.type !== "mark" && !property) return NextResponse.json({ error: "That property is no longer available." }, { status: 404 });
    if (input.type === "booking" && property.mode !== "stay") return NextResponse.json({ error: "This property accepts inspection requests instead of stay bookings." }, { status: 400 });
    if (input.type === "inspection" && property.mode === "stay") return NextResponse.json({ error: "This stay accepts booking requests instead of inspections." }, { status: 400 });
    const record = input.type === "mark"
      ? await setMemberMark({ userId: user.id, ...input })
      : input.type === "booking"
        ? await createBookingRequest({ userId: user.id, ...input })
        : await createInspectionRequest({ userId: user.id, ...input });
    return NextResponse.json({ record }, { status: input.type === "mark" ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    const access = accessErrorResponse(error);
    if (access) return NextResponse.json({ error: access.message }, { status: access.status, headers: { "Cache-Control": "no-store" } });
    if (error.code === "NO_AVAILABILITY" || error.code === "LISTING_UNAVAILABLE") return NextResponse.json({ error: error.message }, { status: 409, headers: { "Cache-Control": "no-store" } });
    console.error("Account activity write failed", error);
    return unavailable();
  }
}

async function readSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

function unavailable() {
  return NextResponse.json({ error: "Account activity is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
