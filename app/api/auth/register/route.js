import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createUser } from "@/lib/server/users";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/session";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { loginDestination } from "@/lib/role-destination";

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254), password: z.string().min(10).max(128), next: z.string().max(500).optional() });
export async function POST(request) {
  try {
    assertSameOrigin(request); rateLimit(request, "register", { limit: 5, windowMs: 10 * 60_000 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check your name, email and password, then try again." }, { status: 400 });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await createUser({ ...parsed.data, passwordHash });
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      destination: loginDestination(user.role, parsed.data.next),
    }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions);
    return response;
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    if (error.code === "23505" || error.code === "EMAIL_EXISTS") return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    console.error("Account registration failed", error);
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
  }
}
