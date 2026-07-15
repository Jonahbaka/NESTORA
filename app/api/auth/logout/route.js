import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";
import { assertSameOrigin } from "@/lib/server/request-security";
export async function POST(request) { try { assertSameOrigin(request); const response = NextResponse.json({ ok: true }); response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 }); return response; } catch { return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 }); } }
