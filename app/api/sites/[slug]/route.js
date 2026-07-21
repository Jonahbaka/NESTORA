import { NextResponse } from "next/server";
import { getPartnerWebsite, listPartnerWebsites } from "@/lib/server/partner-websites";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { slug } = await params;
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized || !/^[a-z0-9]([a-z0-9-]{0,40})$/.test(normalized)) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  const websites = await listPartnerWebsites({ subdomain: normalized });
  const published = websites.find((site) => site.subdomain === normalized && site.status === "published");
  if (!published) return NextResponse.json({ error: "Site not found." }, { status: 404 });
  const website = await getPartnerWebsite(published.id);
  if (!website || website.status !== "published") return NextResponse.json({ error: "Site not found." }, { status: 404 });
  return NextResponse.json({ site: { ...website, configuration: website.configuration || {} } });
}