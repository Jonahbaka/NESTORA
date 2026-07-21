import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PartnerWebsitePublic } from "@/components/partner-website-public";

export const dynamic = "force-dynamic";

export default async function PublicPartnerSite({ params }) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="partner-site-loading">Loading site...</div>}>
      <PartnerWebsitePublic slug={slug} />
    </Suspense>
  );
}