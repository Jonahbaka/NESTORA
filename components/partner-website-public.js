"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Globe2, Mail, Phone, MapPin, ExternalLink, Image, Users, Building2, Landmark, Hotel, Check } from "lucide-react";

const TEMPLATE_REGISTRY = {
  professional: {
    name: "Professional",
    sections: { hero: true, about: true, featured: true, contact: true, social: true },
  },
  agency: {
    name: "Agency",
    sections: { hero: true, about: true, team: true, featured: true, contact: true, social: true },
  },
  developer: {
    name: "Developer",
    sections: { hero: true, developments: true, available_units: true, contact: true, social: true },
  },
  hospitality: {
    name: "Hospitality",
    sections: { hero: true, rooms_stays: true, amenities: true, contact: true, social: true },
  },
};

export function PartnerWebsitePublic({ slug }) {
  const searchParams = useSearchParams();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/sites/${slug}`, { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 404) throw new Error("not_found");
          throw new Error("unavailable");
        }
        const payload = await response.json();
        if (!cancelled) setSite(payload.site);
      } catch (err) {
        if (!cancelled) setError(err.message || "unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="partner-site-loading">Loading site...</div>;
  if (error === "not_found" || !site) return <div className="partner-site-loading">This partner site is not published yet.</div>;
  if (error) return <div className="partner-site-loading">This site is temporarily unavailable.</div>;

  const template = TEMPLATE_REGISTRY[site.kind] || TEMPLATE_REGISTRY.professional;
  const sections = site.configuration?.sections || Object.keys(template.sections);
  const brand = site.configuration?.brand || {};

  return (
    <div className="partner-site">
      {sections.includes("hero") && (
        <header className="partner-hero" style={{ background: brand.primaryColor || "#173b31", color: "#ffffff" }}>
          <div className="partner-hero__inner">
            <h1>{site.name}</h1>
            <p>{brand.tagline || "Verified partner on Nestora"}</p>
          </div>
        </header>
      )}

      {sections.includes("about") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>About</h2>
            <p>{site.configuration?.about || "This partner site showcases verified listings and services on Nestora."}</p>
           </div>
        </section>
      )}

      {sections.includes("featured") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>Featured</h2>
            <p>Featured listings and services will appear here once configured.</p>
          </div>
        </section>
      )}

      {sections.includes("developments") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>Developments</h2>
            <p>Current developments will appear here.</p>
          </div>
        </section>
      )}

      {sections.includes("available_units") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>Available units</h2>
            <p>Available units will appear here.</p>
          </div>
        </section>
      )}

      {sections.includes("rooms_stays") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>Rooms and stays</h2>
            <p>Available rooms and stays will appear here.</p>
          </div>
        </section>
      )}

      {sections.includes("amenities") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>Amenities</h2>
            <p>Property amenities will appear here.</p>
          </div>
        </section>
      )}

      {sections.includes("team") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>Team</h2>
            <p>Team members will appear here.</p>
          </div>
        </section>
      )}

      {sections.includes("contact") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>Contact</h2>
            <ul className="partner-contact">
              {brand.email ? <li><Mail size={16} />{brand.email}</li> : null}
              {brand.phone ? <li><Phone size={16} />{brand.phone}</li> : null}
              {brand.address ? <li><MapPin size={16} />{brand.address}</li> : null}
            </ul>
          </div>
        </section>
      )}

      {sections.includes("social") && (
        <section className="partner-section">
          <div className="partner-section__inner">
            <h2>Connect</h2>
            <div className="partner-socials">
              {searchParams.get("source") === "qr" && <span className="qr-attribution">Scanned from Nestora</span>}
              <a className="button button--outline" href={`https://nestora.doctarx.com/r/${site.externalKey || site.id}`}>Open on Nestora</a>
            </div>
          </div>
        </section>
      )}

      <footer className="partner-footer">
        <div className="partner-footer__inner">
          <span>{site.name}</span>
          <span>Powered by Nestora</span>
        </div>
      </footer>
    </div>
  );
}