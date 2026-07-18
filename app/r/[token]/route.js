import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { allowDemoContent, shouldUseSecureCookies } from "@/lib/server/demo-environment";
import { hasDatabase, query } from "@/lib/server/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

const ATTRIBUTION_COOKIE = "nestora_attribution";

export async function GET(request, { params }) {
  if (!hasDatabase()) return NextResponse.redirect(new URL("/", request.url));
  const token = String((await params).token || "");
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return NextResponse.redirect(new URL("/", request.url));
  const result = await query(
    `SELECT id, destination_path FROM marketing_attribution_links
     WHERE token = $1 AND (is_demo = FALSE OR $2::boolean) LIMIT 1`,
    [token, allowDemoContent()],
  );
  const link = result.rows[0];
  if (!link) return NextResponse.redirect(new URL("/", request.url));
  const suppliedSession = request.cookies.get(ATTRIBUTION_COOKIE)?.value;
  const anonymousSession = /^[0-9a-f-]{36}$/i.test(suppliedSession || "") ? suppliedSession : crypto.randomUUID();
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  await query(
    `INSERT INTO marketing_attribution_events (link_id, user_id, anonymous_session, referrer_host)
     SELECT $1, (SELECT id FROM users WHERE id = $2 AND status = 'active'), $3, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM marketing_attribution_events WHERE link_id = $1 AND anonymous_session = $3 AND created_at > NOW() - INTERVAL '5 minutes'
     )`,
    [link.id, session?.sub || null, anonymousSession, referrerHost(request.headers.get("referer"))],
  );
  const response = NextResponse.redirect(new URL(link.destination_path, request.url), 307);
  response.cookies.set(ATTRIBUTION_COOKIE, anonymousSession, { httpOnly: true, secure: shouldUseSecureCookies(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function referrerHost(value) {
  if (!value) return null;
  try { return new URL(value).hostname.slice(0, 255); }
  catch { return null; }
}
