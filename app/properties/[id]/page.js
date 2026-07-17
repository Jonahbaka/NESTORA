import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Bath, BedDouble, ChevronRight, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { InquiryPanel } from "@/components/inquiry-panel";
import { PropertyCard } from "@/components/property-card";
import { ReportListing } from "@/components/report-listing";
import { priceLabel } from "@/lib/platform";
import { getPublicListing, listPublicListings } from "@/lib/server/public-listings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const property = await getPublicListing((await params).id);
  return property ? { title: property.title, description: property.description, openGraph: { images: [property.image] } } : {};
}

export default async function PropertyPage({ params }) {
  const property = await getPublicListing((await params).id);
  if (!property) notFound();
  const related = (await listPublicListings({ limit: 30 })).filter((item) => item.id !== property.id && item.mode === property.mode).slice(0, 3);
  const videos = property.media.filter((item) => item.kind === "video");
  return (
    <div className="property-page">
      <div className="shell breadcrumb"><Link href="/">Home</Link><ChevronRight size={13} /><Link href={`/search?mode=${property.mode}`}>{property.mode === "new" ? "New homes" : property.mode}</Link><ChevronRight size={13} /><span>{property.title}</span></div>
      <section className="shell property-intro">
        <div><div className="verified-line verified-line--light"><BadgeCheck size={17} /> Nestora Verified<span>{property.fresh}</span></div><h1>{property.title}</h1><p><MapPin size={16} />{property.location}</p></div>
      </section>
      <section className="shell property-gallery" aria-label="Property photography">
        {property.gallery.slice(0, 5).map((image, index) => <div className={`gallery-item gallery-item--${index + 1}`} key={image}><Image src={image} alt={`${property.title} view ${index + 1}`} fill priority={index === 0} sizes={index === 0 ? "(max-width: 800px) 100vw, 62vw" : "25vw"} /></div>)}
      </section>

      <div className="shell property-layout">
        <article className="property-main">
          <header className="property-summary"><div><p className="eyebrow">{property.tag}</p><h2>{property.title}</h2><p className="property-summary__facts">{property.beds != null ? <span><BedDouble size={18} />{property.beds} bedrooms</span> : null}{property.baths != null ? <span><Bath size={18} />{property.baths} baths</span> : null}</p></div></header>
          <div className="trust-strip"><ShieldCheck size={22} /><div><strong>Information reviewed by Nestora</strong><p>Identity, publication status and core listing details were reviewed before publication.</p></div><Link href="/trust">How verification works</Link></div>
          <section className="property-copy"><h2>About this place</h2><p>{property.description}</p></section>
          {videos.length ? <section className="listing-videos"><h2>Property video</h2>{videos.map((item) => <video key={item.id} controls preload="metadata"><source src={item.url} type={item.mime_type} /></video>)}</section> : null}
          <section className="fee-details"><h2>Published price</h2><p>This is the amount supplied by the verified listing professional. Confirm every additional charge in your Nestora conversation before signing or paying.</p><dl><div className="fee-total"><dt>{property.mode === "stay" ? "Nightly rate" : property.mode === "rent" ? "Annual rent" : "Listing price"}</dt><dd>{priceLabel(property)}</dd></div></dl></section>
          <section className="location-section"><h2>Location</h2><p>{property.location}. Precise directions are shared after a confirmed booking or inspection.</p><div className="detail-map"><span className="map-road map-road--one" /><span className="map-road map-road--two" /><span className="detail-map__pin"><MapPin size={23} fill="currentColor" /></span><strong>{property.area}</strong></div></section>
          <section className="host-panel host-panel--text"><div><span className="verified-line verified-line--light"><BadgeCheck size={16} /> Verified listing professional</span><h2>{property.host}</h2><p>Use on-platform messaging to keep questions, agreements and follow-up in one documented place.</p><div className="host-panel__actions"><Link href={`/messages?to=${property.hostId}&property=${property.id}`} className="button button--ink"><MessageCircle size={17} /> Message</Link><ReportListing listingId={property.id} /></div></div></section>
        </article>
        <aside className="property-sidebar"><InquiryPanel property={property} /></aside>
      </div>

      {related.length ? <section className="section shell related-section"><div className="section-heading"><div><p className="eyebrow">Keep exploring</p><h2>Similar verified places</h2></div></div><div className="property-grid property-grid--three">{related.map((item) => <PropertyCard key={item.id} property={item} />)}</div></section> : null}
    </div>
  );
}
