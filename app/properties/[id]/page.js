import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Bath, BedDouble, Building2, Car, Check, ChevronRight, DoorOpen, Flag, MapPin, Maximize2, MessageCircle, ShieldCheck, Sparkles, Star, UsersRound, Wifi } from "lucide-react";
import { InquiryPanel } from "@/components/inquiry-panel";
import { PropertyCard } from "@/components/property-card";
import { getProperty, properties } from "@/lib/data";
import { formatNaira, priceLabel } from "@/lib/platform";

export function generateStaticParams() { return properties.map((property) => ({ id: property.id })); }
export async function generateMetadata({ params }) { const { id } = await params; const property = getProperty(id); return property ? { title: property.title, description: property.description, openGraph: { images: [property.image] } } : {}; }

export default async function PropertyPage({ params }) {
  const { id } = await params;
  const property = getProperty(id);
  if (!property) notFound();
  const related = properties.filter((item) => item.id !== id && (item.area === property.area || item.mode === property.mode)).slice(0, 3);
  return (
    <div className="property-page">
      <div className="shell breadcrumb"><Link href="/">Home</Link><ChevronRight size={13} /><Link href={`/search?mode=${property.mode}`}>{property.mode === "new" ? "New homes" : property.mode}</Link><ChevronRight size={13} /><span>{property.title}</span></div>
      <section className="shell property-intro">
        <div><div className="verified-line verified-line--light">{property.illustrative ? <><Sparkles size={17} /> Illustrative catalogue</> : property.verified ? <><BadgeCheck size={17} /> Nestora Verified</> : null}<span>{property.illustrative ? "Not a live offer" : property.fresh}</span></div><h1>{property.title}</h1><p><MapPin size={16} />{property.address}</p></div>
        <div className="property-intro__rating"><Star size={17} fill="currentColor" /><strong>{property.rating}</strong><span>{property.illustrative ? "Illustrative rating" : `${property.reviews} reviews`}</span></div>
      </section>
      <section className="shell property-gallery" aria-label="Property photography">
        {property.gallery.map((image, index) => <div className={`gallery-item gallery-item--${index + 1}`} key={image}><Image src={image} alt={`${property.title} view ${index + 1}`} fill priority={index === 0} sizes={index === 0 ? "(max-width: 800px) 100vw, 62vw" : "25vw"} /></div>)}
        <Link href={`/tours/${property.id}`} className="gallery-tour"><Sparkles size={17} /> Explore immersive tour</Link>
      </section>

      <div className="shell property-layout">
        <article className="property-main">
          <header className="property-summary"><div><p className="eyebrow">{property.tag}</p><h2>{property.beds}-bedroom {property.mode === "stay" ? "stay" : property.mode === "new" ? "new home" : "residence"} hosted by {property.host}</h2><p className="property-summary__facts"><span><BedDouble size={18} />{property.beds} bedrooms</span><span><Bath size={18} />{property.baths} baths</span><span><Maximize2 size={18} />{property.sqm} m²</span>{property.mode === "stay" ? <span><UsersRound size={18} />{property.guests} guests</span> : null}</p></div><Link href={`/profile/${property.hostId}`} className="host-thumb"><Image src={property.hostId === "amina-bello" ? "/images/nestora/amina-bello-agent.webp" : property.image} alt={property.host} fill sizes="64px" /></Link></header>

          <div className="trust-strip"><ShieldCheck size={22} /><div><strong>{property.illustrative ? "Catalogue presentation" : "Information checked by Nestora"}</strong><p>{property.illustrative ? "Photography, names and details illustrate the intended Nestora experience and do not represent a live offer." : "Identity, location and core property details were reviewed before publication."}</p></div><Link href="/trust">How verification works</Link></div>

          <section className="property-copy"><h2>About this place</h2><p>{property.description}</p><div className="highlight-list">{property.highlights.map((item) => <span key={item}><Check size={16} />{item}</span>)}</div></section>

          <section className="amenities"><h2>What this place offers</h2><div>{property.amenities.map((item, index) => { const icons = [Wifi, DoorOpen, Building2, Car]; const Icon = icons[index % icons.length]; return <span key={item}><Icon size={20} />{item}</span>; })}</div></section>

          <section className="fee-details"><h2>Clear costs, before you commit</h2><p>Every required property-side charge supplied by the host or advisor is shown here. Your final agreement should match this summary.</p><dl>{Object.entries(property.fees).map(([key, value]) => <div key={key}><dt>{key.replace(/^./, (letter) => letter.toUpperCase())}</dt><dd>{formatNaira(value)}</dd></div>)}<div className="fee-total"><dt>{property.mode === "stay" ? "Typical 3-night total" : "Published move-in / purchase total"}</dt><dd>{property.mode === "stay" ? formatNaira((property.fees.nightly * 3) + Object.values(property.fees).filter((_, index) => index > 0).reduce((sum, value) => sum + value, 0)) : formatNaira(Object.values(property.fees).reduce((sum, value) => sum + value, 0))}</dd></div></dl></section>

          <section className="location-section"><h2>Know the area</h2><p>{property.location} · Precise directions are shared after a booking or confirmed inspection.</p><div className="detail-map"><span className="map-road map-road--one" /><span className="map-road map-road--two" /><span className="detail-map__pin"><MapPin size={23} fill="currentColor" /></span><strong>{property.area}</strong></div></section>

          <section className="reviews-section"><div><h2>{property.illustrative ? "Example feedback layout" : "Guest and client reviews"}</h2><p><Star size={17} fill="currentColor" /> {property.illustrative ? "Illustrative catalogue content" : `${property.rating} from ${property.reviews} verified experiences`}</p></div><div className="review-grid"><article><header><span>EX</span><div><strong>{property.illustrative ? "Example guest" : "Guest reviewer"}</strong><small>{property.illustrative ? "Illustrative feedback" : "Verified stay"}</small></div></header><p>Exactly as presented, with thoughtful communication from first message to arrival. This sample demonstrates how verified feedback will appear after launch.</p></article><article><header><span>EX</span><div><strong>{property.illustrative ? "Example client" : "Client reviewer"}</strong><small>{property.illustrative ? "Illustrative feedback" : "Verified viewing"}</small></div></header><p>A calm, well-organised viewing. This sample demonstrates how clear cost information can be presented before a real customer makes a decision.</p></article></div></section>

          <section className="host-panel"><div className="host-panel__photo"><Image src={property.hostId === "amina-bello" ? "/images/nestora/amina-bello-agent.webp" : property.image} alt={property.host} fill sizes="110px" /></div><div><span className="verified-line verified-line--light">{property.illustrative ? <><Sparkles size={16} /> Illustrative professional</> : <><BadgeCheck size={16} /> Verified professional</>}</span><h2>{property.host}</h2><p>{property.illustrative ? "Example profile · Abuja catalogue" : property.hostId === "amina-bello" ? "Property advisor · Abuja specialist" : "Professional host · Identity checked"}</p><div className="host-panel__actions"><Link href={`/profile/${property.hostId}`} className="button button--outline">View profile</Link><Link href={`/messages?to=${property.hostId}&property=${property.id}`} className="button button--ink"><MessageCircle size={17} /> Message</Link></div></div></section>

          <button type="button" className="report-link"><Flag size={14} /> Report this listing</button>
        </article>
        <aside className="property-sidebar"><InquiryPanel property={property} /></aside>
      </div>

      <section className="section shell related-section"><div className="section-heading"><div><p className="eyebrow">Keep exploring</p><h2>Similar places to consider</h2></div></div><div className="property-grid property-grid--three">{related.map((item) => <PropertyCard key={item.id} property={item} />)}</div></section>
    </div>
  );
}
