import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse, AccessError } from "@/lib/server/authorization";
import { recordAuditEvent, recordMonitoringEvent } from "@/lib/server/audit";
import { getPool, hasDatabase } from "@/lib/server/db";
import { allowDemoContent } from "@/lib/server/demo-environment";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";

const schema = z.object({
  listingId: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(10).max(2000),
});

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "listing-reports", { limit: 8, windowMs: 60 * 60_000 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Describe the concern in at least 10 characters." }, { status: 400 });
    const context = await getWorkspaceContext();
    const report = await createListingReport({ user: context.user, ...parsed.data });
    return NextResponse.json({ report }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    const access = accessErrorResponse(error);
    if (access) return NextResponse.json({ error: access.message }, { status: access.status });
    if (error?.code === "23505") return NextResponse.json({ error: "You already have an open report for this listing." }, { status: 409 });
    console.error("Listing report failed", error);
    await recordMonitoringEvent({ level: "error", source: "listing-reports", eventKey: "listing_report_failed", message: error.message }).catch(() => null);
    return unavailable();
  }
}

async function createListingReport({ user, listingId, reason }) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const runQuery = client.query.bind(client);
    const listingResult = await runQuery(
      `SELECT id, title, owner_user_id FROM listings
       WHERE id = $1 AND status = 'active' AND verification_status = 'verified' AND (is_demo = FALSE OR $2::boolean)
       LIMIT 1 FOR UPDATE`,
      [listingId, allowDemoContent()],
    );
    const listing = listingResult.rows[0];
    if (!listing) throw new AccessError("NOT_FOUND", "Listing not found.");
    if (listing.owner_user_id === user.id) throw new AccessError("FORBIDDEN", "You cannot report your own listing.");
    const result = await runQuery(
      `INSERT INTO listing_reports (external_key, listing_id, reporter_id, reason, status)
       VALUES ($1, $2, $3, $4, 'open') RETURNING id, listing_id, status, created_at`,
      [`report-${crypto.randomUUID()}`, listingId, user.id, reason],
    );
    const reviewers = await runQuery("SELECT id, email FROM users WHERE role IN ('admin', 'moderator') AND status = 'active'");
    for (const reviewer of reviewers.rows) {
      await runQuery(
        `INSERT INTO notifications (user_id, kind, title, body, deep_link, delivery_status)
         VALUES ($1, 'listing_reported', 'Listing report received', $2, '/admin', 'queued')`,
        [reviewer.id, `${listing.title} has a new customer report.`],
      );
      await runQuery(
        `INSERT INTO delivery_jobs (user_id, channel, destination, template_key, payload)
         VALUES ($1, 'email', $2, 'listing_reported', $3::jsonb)`,
        [reviewer.id, reviewer.email, JSON.stringify({ reportId: result.rows[0].id, listingId, listingTitle: listing.title })],
      );
    }
    await recordAuditEvent({ actorId: user.id, action: "listing.reported", targetType: "listing", targetId: listingId, metadata: { reportId: result.rows[0].id }, runQuery });
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

function unavailable() {
  return NextResponse.json({ error: "Reporting is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
