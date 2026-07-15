import { NextResponse } from "next/server";
import { hasDatabase, query } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  if (deep && !hasDatabase()) {
    return NextResponse.json({ status: "unavailable", database: "not-configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (deep) {
    try { await query("SELECT 1"); }
    catch { return NextResponse.json({ status: "unavailable", database: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  }
  return NextResponse.json({ status: "ok", database: hasDatabase() ? "configured" : "not-configured", time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
