import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUserByEmail } from "@/lib/server/users";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/session";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { loginDestination } from "@/lib/role-destination";

const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128), next: z.string().max(500).optional() });
export async function POST(request) {
  try {
    assertSameOrigin(request); rateLimit(request, "login", { limit: 8, windowMs: 10 * 60_000 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address and password." }, { status: 400 });
    const user = await findUserByEmail(parsed.data.email);
    const valid = user?.password_hash ? await bcrypt.compare(parsed.data.password, user.password_hash) : false;
    if (!user || !valid || user.status !== "active") return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      destination: loginDestination(user.role, parsed.data.next),
    });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions);
    return response;
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    console.error("Account login failed", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}
