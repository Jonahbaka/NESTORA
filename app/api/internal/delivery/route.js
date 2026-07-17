import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/server/db";
import { processDeliveryQueue } from "@/lib/server/delivery-processor";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!hasDatabase()) return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  const configured = process.env.NESTORA_JOB_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configured || !secureEqual(configured, provided)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json(await processDeliveryQueue({ limit: 25 }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Delivery queue processing failed", error);
    return NextResponse.json({ error: "Delivery processing failed." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

function secureEqual(left, right) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
