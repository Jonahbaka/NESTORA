/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, Search, Sparkles, Star, X, Zap } from "lucide-react";

const CATEGORY_LABELS = {
  rental_flyer: "Property marketing", sale_brochure: "Property marketing", open_house_poster: "Property marketing", comparison_sheet: "Property marketing",
  agent_profile_sheet: "Agent marketing", agency_brochure: "Agency marketing",
  development_brochure: "Developer marketing", payment_plan_sheet: "Developer marketing", construction_update: "Developer marketing",
  hotel_flyer: "Hospitality", room_promotion: "Hospitality", weekend_offer: "Hospitality", short_stay_flyer: "Hospitality",
  social_square: "Social", social_portrait: "Social", social_story: "Social", whatsapp_status: "Social", qr_poster: "Social",
};

export function TemplateGallery({ data, onOpenDesign }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [preview, setPreview] = useState(null);
  const [creating, setCreating] = useState(null);
  const [notice, setNotice] = useState("");
  const templates = useMemo(() => data?.templates || [], [data?.templates]);

  useEffect(() => {
    try { setFavorites(JSON.parse(window.localStorage.getItem("nestora-template-favorites") || "[]")); } catch { setFavorites([]); }
  }, []);

  const cards = useMemo(() => templates.map((template) => ({
    ...template,
    category: CATEGORY_LABELS[template.kind] || "Campaigns",
    format: formatLabel(template.canvasWidth, template.canvasHeight),
    description: templateDescription(template.kind),
  })), [templates]);
  const categories = ["All", ...new Set(cards.map((item) => item.category))];
  const filtered = cards.filter((item) => (category === "All" || item.category === category) && `${item.name} ${item.description} ${item.kind}`.toLowerCase().includes(search.toLowerCase()));

  function toggleFavorite(id) {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);
    window.localStorage.setItem("nestora-template-favorites", JSON.stringify(next));
  }

  async function applyTemplate(template) {
    setCreating(template.id);
    try {
      const response = await fetch("/api/workspace/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "duplicate", designId: template.id }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not create this design.");
      setNotice(`${template.name} is ready in Marketing Studio.`);
      onOpenDesign?.(payload.design);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setCreating(null);
      window.setTimeout(() => setNotice(""), 4000);
    }
  }

  return (
    <div className="template-gallery template-gallery--visual">
      <header className="gallery-hero">
        <div><span><Sparkles size={16} />Curated for property professionals</span><h1>Start brilliant. Make it unmistakably yours.</h1><p>Editable campaigns for listings, developments, teams and stays—with brand and live property data ready to connect.</p></div>
        <div className="gallery-hero__stat"><strong>{cards.length}</strong><span>editable designs</span></div>
      </header>
      {notice ? <div className="workspace-toast" role="status">{notice}</div> : null}
      <div className="gallery-toolbar gallery-toolbar--visual">
        <label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search flyers, brochures, stories…" /></label>
        <div className="gallery-filters" role="group" aria-label="Template categories">{categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </div>
      <div className="gallery-grid gallery-grid--visual">
        {filtered.map((template) => <article key={template.id} className="template-card">
          <button type="button" className="template-card__preview" onClick={() => setPreview(template)} aria-label={`Preview ${template.name}`}>
            <DesignThumbnail template={template} />
            <span className="template-card__hover"><Eye size={20} />Preview design</span>
          </button>
          <div className="template-card__body">
            <div className="template-card__eyebrow"><span>{template.category}</span><button type="button" onClick={() => toggleFavorite(template.id)} aria-label={favorites.includes(template.id) ? "Remove favorite" : "Add favorite"}><Star size={17} fill={favorites.includes(template.id) ? "currentColor" : "none"} /></button></div>
            <h2>{template.name}</h2><p>{template.description}</p>
            <div className="template-card__meta"><span>{template.format}</span><span><Zap size={13} />Dynamic data</span><span>Brand-ready</span></div>
            <div className="template-card__actions"><button type="button" onClick={() => setPreview(template)}><Eye size={16} />Preview</button><button className="button button--coral" type="button" onClick={() => applyTemplate(template)} disabled={creating === template.id}><Copy size={16} />{creating === template.id ? "Creating…" : "Use template"}</button></div>
          </div>
        </article>)}
      </div>
      {!filtered.length ? <div className="gallery-no-results"><Search size={32} /><h2>No templates found</h2><p>Try a broader search or another category.</p></div> : null}
      {preview ? <div className="template-modal" role="dialog" aria-modal="true" aria-label={`${preview.name} preview`}><button className="template-modal__backdrop" type="button" onClick={() => setPreview(null)} aria-label="Close preview" /><div className="template-modal__panel"><button className="template-modal__close" type="button" onClick={() => setPreview(null)} aria-label="Close preview"><X size={20} /></button><div className="template-modal__canvas"><DesignThumbnail template={preview} large /></div><div className="template-modal__details"><span>{preview.category}</span><h2>{preview.name}</h2><p>{preview.description}</p><ul><li>Every headline and detail is editable</li><li>Connect a listing, unit, development or room</li><li>Apply any saved Brand Kit in one click</li></ul><button className="button button--coral" type="button" onClick={() => applyTemplate(preview)}><Sparkles size={17} />Use this template</button></div></div></div> : null}
    </div>
  );
}

export function DesignThumbnail({ template, large = false }) {
  const width = template.canvasWidth || 595;
  const height = template.canvasHeight || 842;
  const scale = large ? Math.min(640 / width, 640 / height) : 320 / width;
  return <div className={`design-thumbnail ${large ? "design-thumbnail--large" : ""}`} style={{ aspectRatio: `${width}/${height}` }}><div className="design-thumbnail__stage" style={{ width, height, transform: `scale(${scale})` }}>{(template.elements || []).slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((element) => <PreviewElement key={element.id} element={element} />)}</div></div>;
}

function PreviewElement({ element }) {
  const style = { left: `${(element.x || 0)}px`, top: `${(element.y || 0)}px`, width: `${element.width || 100}px`, height: `${element.height || 40}px`, zIndex: element.zIndex || 1, transform: `rotate(${element.rotation || 0}deg)` };
  if (element.type === "image") return <div className="preview-element" style={style}><img src={element.payload?.src || element.content} alt="" /></div>;
  if (element.type === "shape") return <div className="preview-element" style={{ ...style, background: element.style?.fillColor || "#ddd", borderRadius: element.style?.shapeType === "circle" ? "50%" : element.style?.borderRadius || 0 }} />;
  if (element.type === "qr_code") return <div className="preview-element preview-element--qr" style={style}><span /><span /><span /><i /><i /><i /></div>;
  if (element.type === "text") return <div className="preview-element preview-element--text" style={{ ...style, color: element.style?.color, fontFamily: element.style?.fontFamily, fontSize: element.style?.fontSize, fontWeight: element.style?.fontWeight, textAlign: element.style?.textAlign, lineHeight: element.style?.lineHeight }}>{element.content}</div>;
  return null;
}

function formatLabel(width, height) { if (width === height) return "Square"; if (height > width * 1.4) return "Portrait"; if (width > height) return "Landscape"; return "Print"; }
function templateDescription(kind) { const descriptions = { sale_brochure: "Present a premium listing with confident hierarchy and a clear enquiry path.", rental_flyer: "Turn availability, price and essential facts into a polished one-page campaign.", open_house_poster: "Build anticipation for a viewing with date, location and scan-to-register action.", agent_profile_sheet: "Introduce your expertise, service areas and contact channels with authority.", agency_brochure: "Showcase a team, a market point of view and a curated property portfolio.", development_brochure: "Package a project story, specifications and buyer proposition beautifully.", payment_plan_sheet: "Explain deposits and milestones with clarity buyers can act on.", construction_update: "Transform progress milestones into a credible social update.", hotel_flyer: "Sell the feeling of the stay alongside rates, amenities and booking details.", room_promotion: "Make a room offer instantly understandable and easy to book.", weekend_offer: "Package an irresistible short-stay escape for mobile sharing.", comparison_sheet: "Help buyers compare a shortlist without losing the important details." }; return descriptions[kind] || "A flexible, editable campaign with connected property data and Brand Kit support."; }
