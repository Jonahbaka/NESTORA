import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";
export async function GET() { const store = await cookies(); const session = verifySessionToken(store.get(SESSION_COOKIE)?.value); return session ? NextResponse.json({ user: session }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } }); }
