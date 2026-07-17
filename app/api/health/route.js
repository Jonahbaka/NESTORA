import { NextResponse } from "next/server";
import { hasDatabase, query } from "@/lib/server/db";
import { hasRemoteStorage } from "@/lib/server/object-storage";
import { hasMalwareScanner } from "@/lib/server/malware-scan";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  if (deep && !hasDatabase()) {
    return NextResponse.json({ status: "unavailable", database: "not-configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (deep) {
    try {
      await query("SELECT 1");
      const [delivery, incidents] = await Promise.all([
        query("SELECT COUNT(*)::int AS count FROM delivery_jobs WHERE status = 'failed' AND attempts >= 5"),
        query("SELECT COUNT(*)::int AS count FROM monitoring_events WHERE resolved_at IS NULL AND level = 'critical'"),
      ]);
      const storageReady = hasRemoteStorage() || process.env.NODE_ENV !== "production";
      const scannerReady = hasMalwareScanner() || process.env.NODE_ENV !== "production";
      const sessionSecurityReady = process.env.NODE_ENV !== "production" || String(process.env.NESTORA_SESSION_SECRET || "").length >= 32;
      const deliveryReady = process.env.NODE_ENV !== "production" || Boolean(process.env.NESTORA_DELIVERY_WEBHOOK_URL && process.env.NESTORA_DELIVERY_WEBHOOK_TOKEN && String(process.env.NESTORA_JOB_SECRET || "").length >= 32);
      const originReady = hasSecureProductionOrigin();
      const healthy = originReady && sessionSecurityReady && storageReady && scannerReady && deliveryReady && delivery.rows[0].count === 0 && incidents.rows[0].count === 0;
      return NextResponse.json({ status: healthy ? "ok" : "degraded", database: "configured", origin: originReady ? "configured" : "not-configured", sessionSecurity: sessionSecurityReady ? "configured" : "not-configured", storage: storageReady ? "configured" : "not-configured", malwareScanner: scannerReady ? "configured" : "not-configured", delivery: deliveryReady ? "configured" : "not-configured", failedDeliveries: delivery.rows[0].count, criticalIncidents: incidents.rows[0].count, time: new Date().toISOString() }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
    }
    catch { return NextResponse.json({ status: "unavailable", database: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  }
  return NextResponse.json({ status: "ok", database: hasDatabase() ? "configured" : "not-configured", time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

function hasSecureProductionOrigin() {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    const origin = new URL(process.env.NEXT_PUBLIC_APP_ORIGIN || "");
    return origin.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(origin.hostname);
  } catch {
    return false;
  }
}
