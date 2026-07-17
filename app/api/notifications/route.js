import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { hasDatabase, query } from "@/lib/server/db";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";
const schema = z.object({ id: z.uuid().optional(), all: z.boolean().optional() }).refine((value) => value.id || value.all, "Choose notifications to mark read");

export async function GET() {
  if (!hasDatabase()) return unavailable();
  try {
    const context = await getWorkspaceContext();
    const result = await query("SELECT id, kind, title, body, deep_link, delivery_status, read_at, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [context.user.id]);
    return NextResponse.json({ notifications: result.rows, unread: result.rows.filter((item) => !item.read_at).length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return routeError(error); }
}

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request); rateLimit(request, "notifications", { limit: 60, windowMs: 60_000 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Notification selection is invalid." }, { status: 400 });
    const context = await getWorkspaceContext();
    const result = parsed.data.all
      ? await query("UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE user_id = $1 RETURNING id", [context.user.id])
      : await query("UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = $1 AND user_id = $2 RETURNING id", [parsed.data.id, context.user.id]);
    return NextResponse.json({ updated: result.rowCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { const known = securityError(error); if (known) return NextResponse.json({ error: known.message }, { status: known.status }); return routeError(error); }
}

function unavailable() { return NextResponse.json({ error: "Notifications are temporarily unavailable." }, { status: 503 }); }
function routeError(error) { const access = accessErrorResponse(error); if (access) return NextResponse.json({ error: access.message }, { status: access.status }); console.error("Notification operation failed", error); return unavailable(); }
