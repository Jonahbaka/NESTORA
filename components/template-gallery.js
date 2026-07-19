"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Star, FileText, Copy, Archive, Filter } from "lucide-react";

const TEMPLATES = [
  { id: "property-flyer", name: "Property flyer", category: "sale", kind: "sale_brochure", description: "Single-page listing flyer with photo, features and agent contact." },
  { id: "open-house-poster", name: "Open-house poster", category: "sale", kind: "qr_poster", description: "Event poster with QR check-in and map callout." },
  { id: "agent-profile", name: "Agent profile", category: "profile", kind: "agent_profile", description: "Professional bio with listings, stats and call links." },
  { id: "agency-brochure", name: "Agency brochure", category: "agency", kind: "sale_brochure", description: "Multi-listing agency overview with team callout." },
  { id: "developer-brochure", name: "Developer brochure", category: "development", kind: "development_brochure", description: "Project brochure with phases, units and payment plan." },
  { id: "payment-plan-sheet", name: "Payment-plan sheet", category: "development", kind: "payment_plan", description: "Installment breakdown with totals and due dates." },
  { id: "construction-update", name: "Construction update", category: "development", kind: "development_brochure", description: "Progress update with milestones and imagery." },
  { id: "hotel-flyer", name: "Hotel flyer", category: "hospitality", kind: "hotel_flyer", description: "Property flyer with rooms, amenities and booking QR." },
  { id: "room-promotion", name: "Room promotion", category: "hospitality", kind: "hotel_flyer", description: "Single room offer with nightly rate and booking link." },
  { id: "short-stay-promo", name: "Short-stay promotion", category: "hospitality", kind: "hotel_flyer", description: "Weekend or weekly stay offer with amenities." },
  { id: "weekend-offer", name: "Weekend offer", category: "hospitality", kind: "hotel_flyer", description: "Limited-time package with inclusions." },
  { id: "social-square", name: "Social square", category: "social", kind: "qr_poster", description: "1080x1080 social post with listing image and QR." },
  { id: "social-portrait", name: "Social portrait", category: "social", kind: "qr_poster", description: "1080x1350 vertical social post." },
  { id: "story", name: "Story", category: "social", kind: "qr_poster", description: "1080x1920 story format with swipe-up QR." },
  { id: "whatsapp-status", name: "WhatsApp status", category: "social", kind: "qr_poster", description: "Vertical status video or image with QR." },
  { id: "qr-poster", name: "QR poster", category: "general", kind: "qr_poster", description: "Generic print-ready QR poster." },
];

export function TemplateGallery({ data }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [favorites, setFavorites] = useState([]);
  const [duplicating, setDuplicating] = useState(null);
  const [notice, setNotice] = useState("");

  const [templates, setTemplates] = useState(data?.templates || []);
  const [designs, setDesigns] = useState(data?.designs || []);

  useEffect(() => {
    if (data?.templates) setTemplates(data.templates);
    if (data?.designs) setDesigns(data.designs);
  }, [data]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("nestora-template-favorites") : null;
    if (stored) setFavorites(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("nestora-template-favorites", JSON.stringify(favorites));
  }, [favorites]);

  const categories = ["all", ...Array.from(new Set(TEMPLATES.map((item) => item.category)))];
  const filtered = TEMPLATES.filter((item) => (category === "all" || item.category === category) && `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()));

  function toggleFavorite(id) {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function duplicate(template) {
    setDuplicating(template.id);
    try {
      const response = await fetch("/api/workspace/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", kind: template.kind, name: template.name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not duplicate template.");
      setNotice(`Created design from template: ${template.name}`);
      setDesigns((current) => [payload.design, ...current]);
      setTimeout(() => setNotice(""), 2600);
    } catch (error) {
      setNotice(error.message);
      setTimeout(() => setNotice(""), 4000);
    } finally {
      setDuplicating(null);
    }
  }

  return (
    <div className="template-gallery">
      <header className="gallery-header">
        <div>
          <h1>Template gallery</h1>
          <p>Start from an editable template, then apply brand kits and property data.</p>
        </div>
      </header>

      {notice ? <div className="workspace-toast">{notice}</div> : null}

      <div className="gallery-toolbar">
        <label><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." /></label>
        <div className="gallery-filters">
          {categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{humanize(item)}</button>)}
        </div>
      </div>

      <div className="gallery-grid">
        {filtered.map((template) => (
          <article key={template.id} className="gallery-card">
            <div>
              <strong>{template.name}</strong>
              <p>{template.description}</p>
              <span className="status-pill">{humanize(template.category)}</span>
            </div>
            <div className="gallery-actions">
              <button type="button" onClick={() => toggleFavorite(template.id)} aria-label={favorites.includes(template.id) ? "Remove favorite" : "Add favorite"}>
                <Star size={16} fill={favorites.includes(template.id) ? "currentColor" : "none"} />
              </button>
              <button type="button" onClick={() => duplicate(template)} disabled={duplicating === template.id}>
                <Copy size={16} />{duplicating === template.id ? "Creating..." : "Duplicate"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {designs.length ? <section className="template-designs"><h2>Your designs</h2><div>{designs.map((design) => <article key={design.id} className="workspace-record compact"><div><strong>{design.name}</strong><small>{humanize(design.kind)}</small></div><span className="status-pill">{design.status}</span></article>)}</div></section> : null}
    </div>
  );
}

function humanize(value) {
  return String(value || "").replaceAll("_", " ").replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}