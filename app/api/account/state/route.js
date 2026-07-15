import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { communities, getProfile, getProperty, posts } from "@/lib/data";
import { calculateStayTotal } from "@/lib/platform";
import { hasDatabase } from "@/lib/server/db";
import { createBookingRequest, createInspectionRequest, getMemberState, setMemberMark } from "@/lib/server/member-state";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const markSchema = z.object({
  type: z.literal("mark"),
  key: z.enum(["saved", "following", "joinedCommunities", "reactions"]),
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
    return NextResponse.json({ state: await getMemberState(session.sub) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
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
    const parsed = writeSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the request details and try again." }, { status: 400 });
    const input = parsed.data;
    if (input.type === "mark" && !isKnownMarkTarget(input.key, input.value)) return NextResponse.json({ error: "That item is no longer available." }, { status: 404 });
    const property = input.type === "mark" ? null : getProperty(input.propertyId);
    if (input.type !== "mark" && !property) return NextResponse.json({ error: "That property is no longer available." }, { status: 404 });
    if (input.type === "booking" && property.mode !== "stay") return NextResponse.json({ error: "This property accepts inspection requests instead of stay bookings." }, { status: 400 });
    if (input.type === "inspection" && property.mode === "stay") return NextResponse.json({ error: "This stay accepts booking requests instead of inspections." }, { status: 400 });
    const record = input.type === "mark"
      ? await setMemberMark({ userId: session.sub, ...input })
      : input.type === "booking"
        ? await createBookingRequest({ userId: session.sub, ...input, title: property.title, total: calculateStayTotal(property, input.nights).total })
        : await createInspectionRequest({ userId: session.sub, ...input, title: property.title });
    return NextResponse.json({ record }, { status: input.type === "mark" ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
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

function isKnownMarkTarget(key, value) {
  if (key === "saved") return Boolean(getProperty(value));
  if (key === "following") return Boolean(getProfile(value));
  if (key === "joinedCommunities") return communities.some((community) => community.id === value);
  if (key === "reactions") return posts.some((post) => post.id === value);
  return false;
}
