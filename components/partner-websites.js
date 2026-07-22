"use client";

import { useState, useEffect } from "react";
import { useNestora } from "@/components/providers";
import { Plus, Save, Globe2, ExternalLink, BarChart3, Eye, XCircle, Check, Palette, Sparkles } from "lucide-react";

const TEMPLATE_OPTIONS = [
  { id: "professional", name: "Professional", description: "Independent agent profile with featured listings" },
  { id: "agency", name: "Agency", description: "Multi-branch agency with team and listings" },
  { id: "developer", name: "Developer", description: "Property developer with developments and units" },
  { id: "hospitality", name: "Hospitality", description: "Hotel and serviced apartment operator" },
];

const SECTION_OPTIONS = [
  { id: "hero", label: "Hero banner" },
  { id: "about", label: "About" },
  { id: "featured", label: "Featured properties" },
  { id: "developments", label: "Developments" },
  { id: "available_units", label: "Available units" },
  { id: "rooms_stays", label: "Rooms and stays" },
  { id: "amenities", label: "Amenities" },
  { id: "team", label: "Team" },
  { id: "contact", label: "Contact and enquiry" },
  { id: "social", label: "Social links" },
];

export function PartnerWebsites({ data, reload }) {
  const [websites, setWebsites] = useState(data?.websites || []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [analytics, setAnalytics] = useState(data?.analytics || null);
  const [notice, setNotice] = useState("");
  const { account } = useNestora();
  const isProfessional = account?.role && ["agent", "agency_admin", "developer", "host"].includes(account.role);

  useEffect(() => {
    if (data?.websites) setWebsites(data.websites);
    if (data?.analytics) setAnalytics(data.analytics);
  }, [data]);

  async function performWrite(body, successMessage) {
    const response = await fetch("/api/workspace/websites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error || "That change could not be saved.");
      return null;
    }
    setNotice(successMessage || "Changes saved.");
    reload?.();
    return payload;
  }

  async function createWebsite(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await performWrite({
      action: "create",
      name: formData.get("name"),
      kind: formData.get("kind"),
      templateId: formData.get("templateId"),
      sections: ["hero", "about", "featured_listings", "contact", "social_links"],
      theme: {},
      contact: {},
      seo: {},
    }, "Website created.");
    if (result?.website) { setCreating(false); setWebsites((current) => [result.website, ...current]); }
  }

  async function saveWebsite(event) {
    event.preventDefault();
    if (!editing) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await performWrite({ action: "update", websiteId: editing.id, name: formData.get("name"), templateId: editing.configuration?.templateId || "professional", brandKitId: editing.configuration?.brandKitId || null, sections: formData.getAll("sections"), theme: editing.configuration?.theme || {}, contact: editing.configuration?.contact || {}, seo: editing.configuration?.seo || {} }, "Site saved.");
    if (result?.website) setEditing(result.website);
  }

  async function publish(websiteId) {
    const result = await performWrite({ action: "publish", websiteId }, "Site published.");
    if (result?.website) setWebsites((current) => current.map((item) => item.id === websiteId ? result.website : item));
  }

  async function unpublish(websiteId) {
    const result = await performWrite({ action: "unpublish", websiteId }, "Site unpublished.");
    if (result?.website) setWebsites((current) => current.map((item) => item.id === websiteId ? result.website : item));
  }

  return (
    <div className="partner-websites">
      <header className="partner-header">
        <div>
          <span className="studio-kicker"><Sparkles size={15} />No-code AI website builder</span>
          <h1>Launch a property website in minutes.</h1>
          <p>Publish a polished, mobile-ready home for your listings, developments, or hospitality brand.</p>
        </div>
        {isProfessional && <button className="button button--coral" type="button" onClick={() => setCreating(true)}><Plus size={17} />New website</button>}
      </header>

      {notice ? <div className="studio-toast"><Check size={16} />{notice}</div> : null}

      {creating ? (
        <form className="studio-form" onSubmit={createWebsite}>
          <label>Website name<input name="name" required minLength={2} maxLength={120} placeholder="Aisha Ibrahim Properties" /></label>
          <label>Website type<select name="kind" required>{TEMPLATE_OPTIONS.map((item) => <option value={item.id === "professional" ? "agent" : item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Template<select name="templateId" required>{TEMPLATE_OPTIONS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <p className="form-wide form-hint">Your public address is generated securely from the website name and can be previewed before publishing.</p>
          <div className="form-actions form-wide">
            <button type="button" onClick={() => setCreating(false)}>Cancel</button>
            <button className="button button--ink" type="submit">Create website</button>
          </div>
        </form>
      ) : null}

{!creating && !editing && (
        <section className="website-gallery">
          {websites.length ? websites.map((site) => <article key={site.id} className="website-card">
            <div className="website-card__preview" style={{ backgroundImage: `linear-gradient(0deg, rgba(11,35,27,.25), transparent), url(${websitePreviewImage(site.kind)})` }}><span>{site.status}</span></div>
            <div>
              <strong>{site.name}</strong>
              <small>{site.kind} · {site.subdomain}.nestora.doctarx.com</small>
            </div>
            <div className="website-metrics">
              <span><Eye size={15} />{site.visitCount || 0}</span>
              <span><BarChart3 size={15} />{site.visitsLast30Days || 0}</span>
            </div>
            <div className="website-actions">
              <a href={`/sites/${site.subdomain}`} target="_blank" rel="noreferrer"><ExternalLink size={15} />Open site</a>
              <button type="button" onClick={() => setEditing(site)}><Palette size={15} />Customize</button>
              {site.status === "published" ? <button type="button" onClick={() => unpublish(site.id)} className="website-action--danger"><XCircle size={15} />Unpublish</button> : <button type="button" onClick={() => publish(site.id)}><Globe2 size={15} />Publish</button>}
            </div>
          </article>) : <div className="website-empty-state"><Globe2 size={42} /><h3>No partner websites yet</h3><p>Create a public website to showcase your portfolio, developments, or hospitality brand.</p>{isProfessional ? <button className="button button--coral" type="button" onClick={() => setCreating(true)}><Plus size={16} />Create website</button> : null}</div>}
        </section>
      )}

      {editing && !previewing && (
        <form className="website-editor" onSubmit={saveWebsite}>
          <div className="website-toolbar">
            <label>Name<input name="name" value={editing.name || ""} onChange={(e) => setEditing((d) => ({ ...d, name: e.target.value }))} required /></label>
            <label>Public address<input value={`${editing.subdomain}.nestora.doctarx.com`} readOnly aria-readonly="true" /></label>
            <div className="studio-actions">
              <button type="button" className="button button--outline" onClick={() => publish(editing.id)}><Globe2 size={16} />Publish</button>
              <button type="button" className="button button--outline" onClick={() => { setEditing(null); setPreviewing(null); }}>Back</button>
              <button className="button button--coral" type="submit"><Save size={16} />Save</button>
            </div>
          </div>
          <div className="website-sections">
            <h3>Sections</h3>
            <div className="section-grid">
              {SECTION_OPTIONS.map((option) => {
                const checked = (editing.configuration?.sections || []).includes(option.id);
                return <label key={option.id} className={`section-option ${checked ? "section-option--active" : ""}`}>
                  <input type="checkbox" name="sections" value={option.id} checked={checked} onChange={(e) => {
                    const next = new Set(editing.configuration?.sections || []);
                    if (e.target.checked) next.add(option.id); else next.delete(option.id);
                    setEditing((d) => ({ ...d, configuration: { ...(d.configuration || {}), sections: Array.from(next) } }));
                  }} />
                  <span>{option.label}</span>
                </label>;
              })}
            </div>
          </div>
        </form>
      )}

      {previewing && (
        <div className="website-preview">
          <div className="website-preview__toolbar">
            <strong>{previewing.name}</strong>
            <button type="button" className="button button--outline" onClick={() => setPreviewing(null)}>Close preview</button>
          </div>
          <div className="website-preview__frame">
            <p>Public preview is available after publishing at <strong>{previewing.subdomain}.nestora.doctarx.com</strong></p>
            <p>Status: {previewing.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function websitePreviewImage(kind) {
  if (kind === "developer") return "/images/nestora/katampe-residences.webp";
  if (["hospitality", "serviced_apartments", "short_stay"].includes(kind)) return "/images/nestora/jabi-serviced-suite.webp";
  if (kind === "agency") return "/images/nestora/hero-abuja-residence.webp";
  return "/images/nestora/maitama-villa.webp";
}
