import Image from "next/image";
import Link from "next/link";
import { ArrowDown, BadgeCheck, CircleDollarSign, Layers3 } from "lucide-react";
import { PricingExperience } from "@/components/pricing-experience";
import { getContactEmail } from "@/lib/operational-config";

export const metadata = {
  title: "Plans and pricing",
  description: "Clear Nestora Business subscriptions, specialist workspaces and property-service pricing for professionals across Abuja.",
};

export default function PricingPage() {
  const contactEmail = getContactEmail();

  return (
    <div className="pricing-page">
      <section className="pricing-hero">
        <Image src="/images/nestora/maitama-villa.webp" alt="Contemporary premium property in Maitama, Abuja" fill priority sizes="100vw" />
        <span className="pricing-hero__veil" />
        <div className="shell pricing-hero__content">
          <p className="eyebrow">Nestora Business pricing</p>
          <h1>Professional tools priced for the work they do.</h1>
          <p>Begin with a credible free presence, then add CRM, team operations, specialist workflows and property services as your portfolio grows.</p>
          <div className="pricing-hero__actions">
            <a className="button button--coral" href="#plans">See plans <ArrowDown size={17} /></a>
            <Link className="button button--light" href="/workspace">Explore workspaces</Link>
          </div>
          <div className="pricing-hero__proof" aria-label="Pricing commitments">
            <span><BadgeCheck size={17} /> Useful free plan</span>
            <span><CircleDollarSign size={17} /> Published service rates</span>
            <span><Layers3 size={17} /> Upgrade without rebuilding your workspace</span>
          </div>
        </div>
      </section>
      <PricingExperience contactEmail={contactEmail} />
    </div>
  );
}
