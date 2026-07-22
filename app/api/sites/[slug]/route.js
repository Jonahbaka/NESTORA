import { NextResponse } from "next/server";
import { getPartnerWebsiteBySubdomain } from "@/lib/server/partner-websites";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { slug } = await params;
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized || !/^[a-z0-9]([a-z0-9-]{0,40})$/.test(normalized)) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }
  const website = await getPartnerWebsiteBySubdomain(normalized);
  if (!website || website.status !== "published") return NextResponse.json({ error: "Site not found." }, { status: 404 });
  return NextResponse.json({ site: { id: website.id, externalKey: website.external_key, kind: website.template_id || "professional", name: website.name, subdomain: website.subdomain, status: website.status, configuration: { sections: website.sections || [], theme: website.theme || {}, contact: website.contact || {}, seo: website.seo || {}, brand: { ...(website.theme || {}), ...(website.contact || {}) } } } });
}
