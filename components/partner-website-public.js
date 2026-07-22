"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Check, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";

export function PartnerWebsitePublic({ slug }) {
  const searchParams = useSearchParams();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sites/${slug}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 404 ? "not_found" : "unavailable");
        return response.json();
      })
      .then((payload) => { if (!cancelled) setSite(payload.site); })
      .catch((loadError) => { if (!cancelled) setError(loadError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="partner-site-loading">Preparing this property website…</div>;
  if (error === "not_found" || !site) return <div className="partner-site-loading">This partner site is not published yet.</div>;
  if (error) return <div className="partner-site-loading">This site is temporarily unavailable.</div>;

  const sections = site.configuration?.sections || [];
  const brand = site.configuration?.brand || {};
  const primary = brand.primaryColor || "#173b31";
  const accent = brand.accentColor || brand.secondaryColor || "#e98d7e";
  const showcase = showcaseFor(site.kind, site.name);
  const has = (...names) => names.some((name) => sections.includes(name));

  return (
    <main className="partner-site" style={{ "--partner-primary": primary, "--partner-accent": accent }}>
      <nav className="partner-site__nav"><strong>{site.name}</strong><div><a href="#story">Our story</a><a href="#collection">Collection</a><a href="#contact">Contact</a></div><a className="partner-site__nav-cta" href="#contact">Enquire</a></nav>
      {has("hero") ? <header className="partner-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,24,19,.88), rgba(8,24,19,.24)), url(${brand.heroImage || "/images/nestora/hero-abuja-residence.webp"})` }}><div className="partner-hero__inner"><span><Sparkles size={15} />Curated property expertise</span><h1>{brand.tagline || site.name}</h1><p>{showcase.intro}</p><div><a href="#collection">Explore the collection <ArrowRight size={17} /></a><a href="#contact">Speak with us</a></div></div><aside><ShieldCheck size={18} /><span><strong>Verified on Nestora</strong><small>Professional identity and listings protected</small></span></aside></header> : null}

      {has("about") ? <section className="partner-story" id="story"><div><span>Our approach</span><h2>Property decisions deserve uncommon clarity.</h2></div><div><p>{showcase.story}</p><dl><div><dt>Local</dt><dd>market intelligence</dd></div><div><dt>Clear</dt><dd>documented guidance</dd></div><div><dt>Trusted</dt><dd>Nestora verification</dd></div></dl></div></section> : null}

      {has("featured", "featured_listings", "developments", "available_units", "rooms_stays", "hotels_rooms", "gallery") ? <section className="partner-collection" id="collection"><header><span>{showcase.eyebrow}</span><h2>{showcase.title}</h2><p>{showcase.copy}</p></header><div>{showcase.cards.map((card, index) => <article key={card.title}><div style={{ backgroundImage: `url(${card.image})` }}><span>{index === 0 ? "Featured" : card.badge}</span></div><h3>{card.title}</h3><p>{card.detail}</p><button type="button">View details <ArrowRight size={15} /></button></article>)}</div></section> : null}

      {has("team", "areas_served", "amenities", "construction_updates", "testimonials") ? <section className="partner-proof"><div><span>Why clients choose us</span><h2>{showcase.proofTitle}</h2></div><ul><li><Check />Responsive, documented communication</li><li><Check />Current availability and transparent next steps</li><li><Check />A professional Nestora-powered experience</li></ul></section> : null}

      {has("contact") ? <section className="partner-contact-section" id="contact"><div><span>Start a conversation</span><h2>Tell us what you’re looking for.</h2><p>Share your brief and our team will respond with a focused, practical next step.</p><ul>{brand.email ? <li><Mail />{brand.email}</li> : null}{brand.phone ? <li><Phone />{brand.phone}</li> : null}{brand.address ? <li><MapPin />{brand.address}</li> : null}</ul></div><form onSubmit={(event) => event.preventDefault()}><label>Name<input required placeholder="Your full name" /></label><label>Email<input type="email" required placeholder="you@example.com" /></label><label>What can we help with?<textarea required placeholder="Tell us about your property brief…" /></label><button type="submit">Send enquiry <ArrowRight size={16} /></button><small>Demo enquiry form. No message is sent from this preview.</small></form></section> : null}

      <footer className="partner-footer"><strong>{site.name}</strong><span>{searchParams.get("source") === "qr" ? "Opened from a Nestora QR campaign · " : ""}Powered and verified by Nestora</span></footer>
    </main>
  );
}

function showcaseFor(kind, name) {
  const common = { intro: "A considered selection, local perspective and a clearer path from first enquiry to confident decision.", story: `${name} brings thoughtful presentation and disciplined follow-through to every client relationship. We combine local insight with transparent communication at each stage.`, proofTitle: "A modern service, grounded in human judgment." };
  if (kind === "developer") return { ...common, eyebrow: "The development", title: "Considered residences, built for how Abuja lives.", copy: "Explore the vision, available residences and current construction story.", cards: [{ title: "Three-bedroom residence", detail: "Generous living · Private terrace", badge: "Available", image: "/images/nestora/katampe-residences.webp" }, { title: "Four-bedroom penthouse", detail: "Panoramic views · Private lobby", badge: "Limited", image: "/images/nestora/maitama-villa.webp" }, { title: "The garden collection", detail: "Ground-floor living · Landscaped court", badge: "New", image: "/images/nestora/hero-abuja-residence.webp" }] };
  if (kind === "hospitality") return { ...common, eyebrow: "Stay beautifully", title: "Rooms designed for slower, warmer weekends.", copy: "Discover calm interiors, thoughtful service and an easy base beside the city.", cards: [{ title: "Lake-view suite", detail: "2 guests · Breakfast included", badge: "Popular", image: "/images/nestora/jabi-serviced-suite.webp" }, { title: "Weekend residence", detail: "4 guests · Private lounge", badge: "Weekend", image: "/images/nestora/abuja-weekend-retreat.webp" }, { title: "Signature studio", detail: "2 guests · Extended stay", badge: "New", image: "/images/nestora/hero-abuja-residence.webp" }] };
  return { ...common, eyebrow: kind === "agency" ? "Selected by our team" : "Personally selected", title: "Homes with a reason to look closer.", copy: "A focused collection across Abuja’s most sought-after neighbourhoods.", cards: [{ title: "Katampe Court Residence", detail: "3 beds · Katampe, Abuja", badge: "For sale", image: "/images/nestora/katampe-residences.webp" }, { title: "Maitama Garden Villa", detail: "5 beds · Maitama, Abuja", badge: "Exclusive", image: "/images/nestora/maitama-villa.webp" }, { title: "Jabi Lake Suite", detail: "2 beds · Jabi, Abuja", badge: "For rent", image: "/images/nestora/jabi-serviced-suite.webp" }] };
}
