import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CalendarCheck2, ChevronRight, KeyRound, MessageCircle, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { HomeStoryFilm } from "@/components/home-story-film";
import { PropertyMediaHome } from "@/components/property-media-home";
import { PropertyCard } from "@/components/property-card";
import { SearchBar } from "@/components/search-bar";
import { SectionHeading } from "@/components/section-heading";
import { areas } from "@/lib/site-content";
import { listPublicListings } from "@/lib/server/public-listings";
import { getPropertyMediaConfiguration } from "@/lib/server/property-media-services";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [properties, propertyMedia] = await Promise.all([listPublicListings({ limit: 4 }), getPropertyMediaConfiguration()]);
  return (
    <>
      <section className="home-hero" aria-labelledby="home-heading">
        <Image src="/images/nestora/hero-abuja-residence.webp" alt="A contemporary Abuja home in the evening light" fill priority sizes="100vw" />
        <div className="home-hero__veil" />
        <div className="shell home-hero__content"><div className="hero-copy"><p className="hero-kicker"><BadgeCheck size={17} /> Trusted places and property professionals in Abuja</p><h1 id="home-heading">Find your place.<br />Feel at home.</h1><p>Stay for a weekend, settle in for a year, or find the home you will own. Clear details, trusted professionals and neighbourhood knowledge, all in one place.</p></div><SearchBar /><div className="hero-proof" aria-label="Nestora trust markers"><span><ShieldCheck size={17} /> Identity checks</span><span><CalendarCheck2 size={17} /> Current listing signals</span><span><MessageCircle size={17} /> On-platform conversations</span></div></div>
      </section>

      <section className="quick-paths" aria-label="Ways to use Nestora"><div className="shell quick-paths__grid"><Link href="/search?mode=stay"><span><KeyRound size={22} /></span><div><strong>Book a stay</strong><small>Hotels, serviced apartments and escapes</small></div><ChevronRight size={18} /></Link><Link href="/search?mode=rent"><span><Building2 size={22} /></span><div><strong>Find a rental</strong><small>Current homes with clear published prices</small></div><ChevronRight size={18} /></Link><Link href="/search?mode=buy"><span><ShieldCheck size={22} /></span><div><strong>Buy with clarity</strong><small>Inspections and documented conversations</small></div><ChevronRight size={18} /></Link><Link href="/workspace"><span><UsersRound size={22} /></span><div><strong>Manage property</strong><small>Listings, leads, reservations and teams</small></div><ChevronRight size={18} /></Link></div></section>

      <section className="section shell">
        <SectionHeading eyebrow="Current Abuja listings" title="Places worth opening" copy="Only active inventory reviewed for public publication appears here." href="/search" action="Explore all" />
        {properties.length ? <div className="property-grid">{properties.map((property, index) => <PropertyCard key={property.id} property={property} priority={index < 2} />)}</div> : <div className="marketplace-empty"><div><ShieldCheck size={25} /><p className="eyebrow">Publication review in progress</p><h2>No verified listings are public right now.</h2><p>New inventory appears here after ownership, media and publication checks are complete.</p></div><Link href="/workspace" className="button button--ink">Manage a property <ArrowRight size={17} /></Link></div>}
      </section>

      <PropertyMediaHome configuration={propertyMedia} />

      <HomeStoryFilm />

      <section className="section neighbourhood-band"><div className="shell"><SectionHeading eyebrow="Neighbourhoods, understood" title="Choose more than an address" copy="Explore the pace, everyday conveniences and character of Abuja's established districts." href="/search" action="Browse Abuja" /><div className="area-grid">{areas.map((area) => <Link href={`/search?area=${encodeURIComponent(area.name)}`} className="area-tile" key={area.name}><Image src={area.image} alt={`${area.name}, Abuja`} fill sizes="(max-width: 700px) 82vw, 25vw" /><span className="area-tile__veil" /><div><strong>{area.name}</strong><p>{area.note}</p><small>Explore current listings</small></div></Link>)}</div></div></section>

      <section className="section shell editorial-feature"><div className="editorial-feature__media"><Image src="/images/nestora/katampe-residences.webp" alt="Contemporary residences and landscaped pool in Abuja" fill sizes="(max-width: 800px) 100vw, 58vw" /><span className="media-label media-label--dark">New developments</span></div><div className="editorial-feature__copy"><p className="eyebrow">Track what is being built</p><h2>New homes, without the guesswork.</h2><p>Review current project progress, available units and published payment-plan information before a conversation begins.</p><Link href="/search?mode=new" className="button button--coral">Explore developments <ArrowRight size={17} /></Link></div></section>

      <section className="section escape-band"><Image src="/images/nestora/abuja-weekend-retreat.webp" alt="A peaceful weekend retreat in the hills near Abuja" fill sizes="100vw" /><div className="escape-band__veil" /><div className="shell escape-band__content"><p className="eyebrow">Plan a restorative stay</p><h2>Leave the city.<br />Keep the comfort.</h2><p>Browse current hotels, serviced apartments and retreats around Abuja.</p><Link href="/search?mode=stay" className="button button--light">Find a stay <ArrowRight size={17} /></Link></div></section>

      <section className="section shell host-feature"><div className="host-feature__copy"><span className="verified-line"><Sparkles size={18} /> Professional operations</span><h2>Run the relationship, not just the listing.</h2><p>Manage verified inventory, enquiries, inspections, reservations, buyer progress and team ownership from one accountable workspace.</p><Link href="/workspace" className="button button--ink">Open professional workspace <ArrowRight size={17} /></Link></div><div className="host-feature__media"><Image src="/images/nestora/amina-bello-agent.webp" alt="A property professional welcoming clients into an Abuja home" fill sizes="(max-width: 800px) 100vw, 42vw" /></div></section>

      <section className="section trust-band"><div className="shell trust-band__grid"><div><p className="eyebrow">Trust is a product feature</p><h2>Confidence at every step.</h2><p>Nestora gives people evidence, controls and human support for high-stakes property decisions.</p></div><div className="trust-points"><article><BadgeCheck size={24} /><h3>Verified identities</h3><p>Professionals submit identity and business evidence before earning verified status.</p></article><article><Sparkles size={24} /><h3>Current information</h3><p>Availability, pricing and project progress carry visible update signals.</p></article><article><ShieldCheck size={24} /><h3>Safer conversations</h3><p>On-platform messaging, reporting and moderation keep context in one secure place.</p></article></div></div></section>
    </>
  );
}
