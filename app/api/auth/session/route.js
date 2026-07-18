import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";
import { shouldUseSecureCookies } from "@/lib/server/demo-environment";
import { findUserById } from "@/lib/server/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return unauthorized();
  try {
    const user = await findUserById(session.sub);
    if (!user || user.status !== "active") return unauthorized();
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at || null },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Session validation failed", error);
    return NextResponse.json({ error: "Account validation is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

function unauthorized() {
  const response = NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: shouldUseSecureCookies(), sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
