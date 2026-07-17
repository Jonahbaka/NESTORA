import { NextResponse } from "next/server";
import { listPublicListings } from "@/lib/server/public-listings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listings = await listPublicListings();
    return NextResponse.json({ listings }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("Public listing query failed", error);
    return NextResponse.json({ error: "Current listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
