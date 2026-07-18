import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Bath, BedDouble, Building2, CalendarCheck2, ChevronRight, MapPin, MessageCircle, Ruler, ScanLine, ShieldCheck } from "lucide-react";
import { InquiryPanel } from "@/components/inquiry-panel";
import { PropertyCard } from "@/components/property-card";
import { PropertySaveButton } from "@/components/property-save-button";
import { ReportListing } from "@/components/report-listing";
import { priceLabel } from "@/lib/platform";
import { getManagedListingPreview, getPublicListing, listPublicListings } from "@/lib/server/public-listings";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const property = await getPublicListing((await params).id);
  return property ? { title: property.title, description: property.description, openGraph: { images: [property.image] } } : {};
}

export default async function PropertyPage({ params, searchParams }) {
  const id = (await params).id;
  const previewRequested = (await searchParams)?.preview === "1";
  let property = null;
  if (previewRequested) {
    try { property = await getManagedListingPreview(id, await getWorkspaceContext()); }
    catch { property = null; }
  } else {
    property = await getPublicListing(id);
  }
  if (!property) notFound();
  const related = previewRequested ? [] : (await listPublicListings({ limit: 30 })).filter((item) => item.id !== property.id && item.mode === property.mode).slice(0, 3);
  const videos = property.media.filter((item) => item.media_role === "walkthrough");
  const feeRows = listingFees(property);
  const minimumInquiryDate = new Date().toISOString().slice(0, 10);
  return (
    <div className="property-page">
      {previewRequested ? <div className="listing-preview-banner"><ShieldCheck size={16} />Private listing preview. Customers cannot see this record until an administrator approves it.</div> : null}
      <div className="shell breadcrumb"><Link href="/">Home</Link><ChevronRight size={13} /><Link href={`/search?mode=${property.mode}`}>{property.mode === "new" ? "New homes" : property.mode}</Link><ChevronRight size={13} /><span>{property.title}</span></div>
      <section className="shell property-intro">
        <div><div className="verified-line verified-line--light"><BadgeCheck size={17} />{previewRequested ? "Preview record" : "Nestora Verified"}<span>{property.fresh}</span></div><h1>{property.title}</h1><p><MapPin size={16} />{property.location}</p></div><div className="property-intro__actions"><PropertySaveButton propertyId={property.id} title={property.title} />{property.hasTour ? <Link className="button button--ink" href={`/tours/${property.id}${previewRequested ? "?preview=1" : ""}`}><ScanLine size={17} />Open virtual tour</Link> : null}</div>
      </section>
      <section className={`shell property-gallery ${property.gallery.length ? `property-gallery--${Math.min(property.gallery.length, 5)}` : "property-gallery--empty"}`} aria-label="Property photography">
        {property.gallery.slice(0, 5).map((image, index) => <div className={`gallery-item gallery-item--${index + 1}`} key={image}><Image src={image} alt={`${property.title} view ${index + 1}`} fill priority={index === 0} sizes={index === 0 ? "(max-width: 800px) 100vw, 62vw" : "25vw"} /></div>)}
        {!property.gallery.length ? <div><FileImageFallback /><h2>Add property photography</h2><p>Uploaded gallery images will appear in this preview.</p></div> : null}
      </section>

      <div className="shell property-layout">
        <article className="property-main">
          <header className="property-summary"><div><p className="eyebrow">{property.tag}</p><h2>{property.title}</h2><p className="property-summary__facts">{property.beds != null ? <span><BedDouble size={18} />{property.beds} bedrooms</span> : null}{property.baths != null ? <span><Bath size={18} />{property.baths} baths</span> : null}{property.areaSqm != null ? <span><Ruler size={18} />{property.areaSqm.toLocaleString()} sqm</span> : null}{property.propertyType ? <span><Building2 size={18} />{property.propertyType}</span> : null}</p></div></header>
          <div className="trust-strip"><ShieldCheck size={22} /><div><strong>Information reviewed by Nestora</strong><p>Identity, publication status and core listing details were reviewed before publication.</p></div><Link href="/trust">How verification works</Link></div>
          <section className="property-copy"><h2>About this place</h2><p>{property.description}</p></section>
          {property.features.length ? <section className="property-features"><h2>Property features</h2><div>{property.features.map((feature) => <span key={feature}><ShieldCheck size={15} />{feature}</span>)}</div></section> : null}
          {videos.length ? <section className="listing-videos"><h2>Property video</h2>{videos.map((item) => <video key={item.id} controls preload="metadata"><source src={item.url} type={item.mime_type} /></video>)}</section> : null}
          <section className="fee-details"><h2>Published price and fees</h2><p>These costs were supplied with the listing. Confirm the final agreement in your Nestora conversation before signing or paying.</p><dl><div className="fee-total"><dt>{property.mode === "stay" ? "Nightly rate" : property.mode === "rent" ? "Annual rent" : "Listing price"}</dt><dd>{priceLabel(property)}</dd></div>{feeRows.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{formatCurrency(amount, property.currency)}</dd></div>)}</dl></section>
          <section className="availability-details"><CalendarCheck2 size={22} /><div><h2>{humanAvailability(property.availabilityStatus)}</h2><p>{property.availableFrom ? `Available from ${new Date(property.availableFrom).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}.` : "Contact the listing professional to confirm the current handover date."}</p></div></section>
          <section className="location-section"><h2>Location</h2><p>{previewRequested ? property.address : property.location}. {previewRequested ? "This full address is visible only in the private preview." : "Precise directions are shared after a confirmed booking or inspection."}</p><div className="detail-map"><span className="map-road map-road--one" /><span className="map-road map-road--two" /><span className="detail-map__pin"><MapPin size={23} fill="currentColor" /></span><strong>{property.area}</strong></div></section>
          <section className="host-panel host-panel--text"><div><span className="verified-line verified-line--light"><BadgeCheck size={16} /> Verified listing professional</span><h2>{property.host}</h2><p>Use on-platform messaging to keep questions, agreements and follow-up in one documented place.</p><div className="host-panel__actions"><Link href={`/messages?to=${property.hostId}&property=${property.id}`} className="button button--ink"><MessageCircle size={17} /> Message</Link><ReportListing listingId={property.id} /></div></div></section>
        </article>
        <aside className="property-sidebar" id="inquiry"><InquiryPanel property={property} minimumDate={minimumInquiryDate} /></aside>
      </div>

      {related.length ? <section className="section shell related-section"><div className="section-heading"><div><p className="eyebrow">Keep exploring</p><h2>Similar verified places</h2></div></div><div className="property-grid property-grid--three">{related.map((item) => <PropertyCard key={item.id} property={item} />)}</div></section> : null}
    </div>
  );
}

function listingFees(property) {
  const labels = { serviceCharge: "Service charge", cautionDeposit: "Caution deposit", agencyFee: "Agency fee", legalFee: "Legal fee", cleaningFee: "Cleaning fee" };
  return Object.entries(labels).map(([key, label]) => [label, Number(property.fees?.[key] || 0)]).filter(([, amount]) => amount > 0);
}
function formatCurrency(value, currency = "NGN") { return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value); }
function humanAvailability(value) { return ({ available: "Available now", coming_soon: "Coming soon", occupied: "Currently occupied", unavailable: "Temporarily unavailable" })[value] || "Availability on request"; }
function FileImageFallback() { return <ScanLine size={30} />; }
