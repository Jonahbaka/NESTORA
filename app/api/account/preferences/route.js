import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { recordAuditEvent } from "@/lib/server/audit";
import { hasDatabase, query } from "@/lib/server/db";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  homeCity: z.string().trim().max(100).nullable(),
  propertyInterests: z.array(z.enum(["rent", "buy", "stay", "developments"])).max(4),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

export async function GET() {
  if (!hasDatabase()) return unavailable();
  try {
    const context = await getWorkspaceContext();
    const result = await query(
      `SELECT u.name, u.email, p.home_city, p.property_interests, p.email_notifications, p.push_notifications
       FROM users u LEFT JOIN user_preferences p ON p.user_id = u.id WHERE u.id = $1`,
      [context.user.id],
    );
    const row = result.rows[0];
    return NextResponse.json({ preferences: { name: row.name, email: row.email, homeCity: row.home_city || "", propertyInterests: row.property_interests || [], emailNotifications: row.email_notifications ?? true, pushNotifications: row.push_notifications ?? true } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return routeError(error); }
}

export async function PUT(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "account-preferences", { limit: 20, windowMs: 60_000 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check your profile preferences and try again." }, { status: 400 });
    const context = await getWorkspaceContext();
    await query("UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2", [parsed.data.name, context.user.id]);
    await query(
      `INSERT INTO user_preferences (user_id, home_city, property_interests, email_notifications, push_notifications)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET home_city = EXCLUDED.home_city, property_interests = EXCLUDED.property_interests,
         email_notifications = EXCLUDED.email_notifications, push_notifications = EXCLUDED.push_notifications, updated_at = NOW()`,
      [context.user.id, parsed.data.homeCity || null, parsed.data.propertyInterests, parsed.data.emailNotifications, parsed.data.pushNotifications],
    );
    await recordAuditEvent({ actorId: context.user.id, action: "account.preferences_updated", targetType: "user", targetId: context.user.id, metadata: { profileNameUpdated: parsed.data.name !== context.user.name } });
    return NextResponse.json({ preferences: { ...parsed.data, email: context.user.email } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error);
  }
}

function unavailable() { return NextResponse.json({ error: "Account preferences are temporarily unavailable." }, { status: 503 }); }
function routeError(error) { const access = accessErrorResponse(error); if (access) return NextResponse.json({ error: access.message }, { status: access.status }); console.error("Account preference operation failed", error); return unavailable(); }
