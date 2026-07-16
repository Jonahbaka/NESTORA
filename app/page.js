import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CalendarCheck2, ChevronRight, KeyRound, MessageCircle, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { PropertyCard } from "@/components/property-card";
import { SectionHeading } from "@/components/section-heading";
import { HomeStoryFilm } from "@/components/home-story-film";
import { areas, communities, properties } from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <section className="home-hero" aria-labelledby="home-heading">
        <Image src="/images/nestora/hero-abuja-residence.webp" alt="A contemporary Abuja home in the evening light" fill priority sizes="100vw" />
        <div className="home-hero__veil" />
        <div className="shell home-hero__content">
          <div className="hero-copy">
            <p className="hero-kicker"><BadgeCheck size={17} /> Built for trusted places and people in Abuja</p>
            <h1 id="home-heading">Find your place.<br />Feel at home.</h1>
            <p>Stay for a weekend, settle in for a year, or find the home you will own. Clear details, trusted professionals and neighbourhood knowledge, all in one place.</p>
          </div>
          <SearchBar />
          <div className="hero-proof" aria-label="Nestora trust markers">
            <span><ShieldCheck size={17} /> Designed for identity checks</span>
            <span><CalendarCheck2 size={17} /> Visible freshness signals</span>
            <span><MessageCircle size={17} /> Safer on-platform conversations</span>
          </div>
        </div>
      </section>

      <section className="quick-paths" aria-label="Ways to use Nestora">
        <div className="shell quick-paths__grid">
          <Link href="/search?mode=stay"><span><KeyRound size={22} /></span><div><strong>Book a stay</strong><small>Hotels, serviced apartments and escapes</small></div><ChevronRight size={18} /></Link>
          <Link href="/search?mode=rent"><span><Building2 size={22} /></span><div><strong>Find a rental</strong><small>Verified homes with transparent move-in costs</small></div><ChevronRight size={18} /></Link>
          <Link href="/search?mode=buy"><span><ShieldCheck size={22} /></span><div><strong>Buy with clarity</strong><small>Title guidance, inspections and trusted advisors</small></div><ChevronRight size={18} /></Link>
          <Link href="/social"><span><UsersRound size={22} /></span><div><strong>Know the neighbourhood</strong><small>Local voices and useful community guides</small></div><ChevronRight size={18} /></Link>
        </div>
      </section>

      <section className="section shell">
        <SectionHeading eyebrow="Illustrative Abuja catalogue" title="Places worth opening" copy="A preview of the clear details and next steps Nestora is designed to provide." href="/search" action="Explore all" />
        <div className="property-grid">
          {properties.slice(0, 4).map((property, index) => <PropertyCard key={property.id} property={property} priority={index < 2} />)}
        </div>
      </section>

      <HomeStoryFilm />

      <section className="section neighbourhood-band">
        <div className="shell">
          <SectionHeading eyebrow="Neighbourhoods, understood" title="Choose more than an address" copy="See the pace, everyday conveniences and character of the places you are considering." href="/search" action="Browse Abuja" />
          <div className="area-grid">
            {areas.map((area) => (
              <Link href={`/search?area=${encodeURIComponent(area.name)}`} className="area-tile" key={area.name}>
                <Image src={area.image} alt={`${area.name}, Abuja`} fill sizes="(max-width: 700px) 82vw, 25vw" />
                <span className="area-tile__veil" />
                <div><strong>{area.name}</strong><p>{area.note}</p><small>{area.count} illustrative places</small></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell editorial-feature">
        <div className="editorial-feature__media">
          <Image src="/images/nestora/katampe-residences.webp" alt="Katampe Court residences and landscaped pool" fill sizes="(max-width: 800px) 100vw, 58vw" />
          <span className="media-label media-label--dark">New development</span>
        </div>
        <div className="editorial-feature__copy">
          <p className="eyebrow">Track what is being built</p>
          <h2>New homes, without the guesswork.</h2>
          <p>Follow construction progress, compare unit plans and review verified project documents before a conversation begins.</p>
          <dl className="feature-stats">
            <div><dt>Phase 1</dt><dd>78% complete</dd></div>
            <div><dt>Next update</dt><dd>24 July</dd></div>
            <div><dt>Illustrative price</dt><dd>NGN 245m</dd></div>
          </dl>
          <Link href="/properties/katampe-court-residences" className="button button--coral">Open project room <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="section escape-band">
        <Image src="/images/nestora/abuja-weekend-retreat.webp" alt="A peaceful weekend retreat in the hills near Abuja" fill sizes="100vw" />
        <div className="escape-band__veil" />
        <div className="shell escape-band__content">
          <p className="eyebrow">This weekend</p>
          <h2>Leave the city.<br />Keep the comfort.</h2>
          <p>Private villas, natural pools and unhurried hospitality, less than an hour from central Abuja.</p>
          <Link href="/properties/zuma-rock-retreat" className="button button--light">Explore the retreat <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="section shell">
        <SectionHeading eyebrow="People make a place" title="Useful conversations, close to home" copy="Follow trusted professionals, join local circles and learn from people who know the city." href="/social" action="Open community" />
        <div className="community-feature">
          <div className="community-feature__image"><Image src="/images/nestora/jabi-community.webp" alt="Friends sharing local knowledge at a Jabi lakeside cafe" fill sizes="(max-width: 800px) 100vw, 56vw" /></div>
          <div className="community-feature__content">
            <span className="community-icon"><UsersRound size={22} /></span>
            <p className="eyebrow">Illustrative community preview</p>
            <h2>Ask better questions before you move.</h2>
            <p>Commute notes, trusted artisans, quiet streets, school runs and weekend routines: the details that rarely make a listing but shape everyday life.</p>
            <div className="community-pills">{communities.map((community) => <Link key={community.id} href={`/communities/${community.id}`}>{community.name}</Link>)}</div>
            <Link href="/social" className="text-link">See what Abuja is talking about <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <section className="section shell host-feature">
        <div className="host-feature__copy">
          <span className="verified-line"><Sparkles size={18} /> Illustrative professional profile</span>
          <h2>Meet Amina, your property advisor in Abuja.</h2>
          <p>This fictional profile demonstrates how neighbourhood knowledge, viewing notes and response information can be presented.</p>
          <div className="host-metrics"><span><strong>Example</strong> client rating</span><span><strong>Example</strong> listings</span><span><strong>Example</strong> reply time</span></div>
          <Link href="/profile/amina-bello" className="button button--ink">View Amina&apos;s profile <ArrowRight size={17} /></Link>
        </div>
        <div className="host-feature__media"><Image src="/images/nestora/amina-bello-agent.webp" alt="Illustrative Abuja property advisor profile" fill sizes="(max-width: 800px) 100vw, 42vw" /></div>
      </section>

      <section className="section trust-band">
        <div className="shell trust-band__grid">
          <div><p className="eyebrow">Trust is a product feature</p><h2>Confidence at every step.</h2><p>Nestora gives people the evidence, controls and human support to make high-stakes property decisions with a clearer head.</p></div>
          <div className="trust-points">
            <article><BadgeCheck size={24} /><h3>Verified identities</h3><p>Professionals submit identity and business evidence before earning a verified status.</p></article>
            <article><Sparkles size={24} /><h3>Fresh information</h3><p>Availability, pricing and project progress carry visible update signals.</p></article>
            <article><ShieldCheck size={24} /><h3>Safer conversations</h3><p>On-platform messaging, reporting and moderation keep context in one secure place.</p></article>
          </div>
        </div>
      </section>
    </>
  );
}
