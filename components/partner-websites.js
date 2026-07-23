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
  { id: "featured_listings", label: "Featured properties" },
  { id: "developments", label: "Developments" },
  { id: "available_units", label: "Available units" },
  { id: "rooms_stays", label: "Rooms and stays" },
  { id: "amenities", label: "Amenities" },
  { id: "team", label: "Team" },
  { id: "areas_served", label: "Areas served" },
  { id: "testimonials", label: "Testimonials" },
  { id: "construction_updates", label: "Construction updates" },
  { id: "gallery", label: "Gallery" },
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
      sections: defaultSiteSections(formData.get("kind")),
      theme: { primaryColor: "#173b31", accentColor: "#e98d7e", headingFont: "Georgia, serif", fontFamily: "Inter, sans-serif", heroImage: websitePreviewImage(formData.get("kind")) },
      contact: {},
      seo: { title: formData.get("name"), description: "Verified professional property services and current opportunities." },
      content: { heroTitle: formData.get("name"), heroCopy: "Local property expertise, presented with clarity.", aboutTitle: "Property decisions deserve uncommon clarity." },
      navigation: defaultSiteNavigation(formData.get("kind")),
    }, "Website created.");
    if (result?.website) { setCreating(false); setWebsites((current) => [result.website, ...current]); }
  }

  async function saveWebsite(event) {
    event.preventDefault();
    if (!editing) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const content = { ...(editing.configuration?.content || {}), heroTitle: formData.get("heroTitle"), heroCopy: formData.get("heroCopy"), aboutTitle: formData.get("aboutTitle"), aboutCopy: formData.get("aboutCopy"), collectionTitle: formData.get("collectionTitle"), servicesTitle: formData.get("servicesTitle"), contactTitle: formData.get("contactTitle") };
    const theme = { ...(editing.configuration?.theme || {}), primaryColor: formData.get("primaryColor"), accentColor: formData.get("accentColor"), headingFont: formData.get("headingFont"), fontFamily: formData.get("bodyFont"), heroImage: formData.get("heroImage") };
    const contact = { ...(editing.configuration?.contact || {}), email: formData.get("email"), phone: formData.get("phone"), address: formData.get("address") };
    const seo = { ...(editing.configuration?.seo || {}), title: formData.get("seoTitle"), description: formData.get("seoDescription") };
    const result = await performWrite({ action: "update", websiteId: editing.id, name: formData.get("name"), templateId: editing.configuration?.templateId || "professional", brandKitId: editing.configuration?.brandKitId || null, sections: formData.getAll("sections"), theme, contact, seo, content, navigation: editing.configuration?.navigation?.length ? editing.configuration.navigation : defaultSiteNavigation(editing.kind) }, "Site saved.");
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
          <div className="website-editor-grid">
            <section><h3>Identity & theme</h3><label>Primary colour<input name="primaryColor" type="color" value={editing.configuration?.theme?.primaryColor || "#173b31"} onChange={(e) => updateEditingConfig(setEditing, "theme", "primaryColor", e.target.value)} /></label><label>Accent colour<input name="accentColor" type="color" value={editing.configuration?.theme?.accentColor || "#e98d7e"} onChange={(e) => updateEditingConfig(setEditing, "theme", "accentColor", e.target.value)} /></label><label>Heading font<input name="headingFont" value={editing.configuration?.theme?.headingFont || "Georgia, serif"} onChange={(e) => updateEditingConfig(setEditing, "theme", "headingFont", e.target.value)} /></label><label>Body font<input name="bodyFont" value={editing.configuration?.theme?.fontFamily || "Inter, sans-serif"} onChange={(e) => updateEditingConfig(setEditing, "theme", "fontFamily", e.target.value)} /></label><label>Hero image path<input name="heroImage" value={editing.configuration?.theme?.heroImage || websitePreviewImage(editing.kind)} onChange={(e) => updateEditingConfig(setEditing, "theme", "heroImage", e.target.value)} /></label></section>
            <section><h3>Page navigation</h3>{(editing.configuration?.navigation?.length ? editing.configuration.navigation : defaultSiteNavigation(editing.kind)).map((item, index) => <div className="website-nav-row" key={item.id}><input value={item.label} aria-label={`${item.id} page label`} onChange={(event) => updateNavigation(setEditing, editing, index, { label: event.target.value })} /><label><input type="checkbox" checked={item.visible !== false} onChange={(event) => updateNavigation(setEditing, editing, index, { visible: event.target.checked })} />Visible</label></div>)}</section>
            <section className="website-copy-editor"><h3>Website copy</h3><label>Home headline<input name="heroTitle" value={editing.configuration?.content?.heroTitle || editing.name} onChange={(e) => updateEditingConfig(setEditing, "content", "heroTitle", e.target.value)} /></label><label>Home introduction<textarea name="heroCopy" value={editing.configuration?.content?.heroCopy || ""} onChange={(e) => updateEditingConfig(setEditing, "content", "heroCopy", e.target.value)} /></label><label>About headline<input name="aboutTitle" value={editing.configuration?.content?.aboutTitle || ""} onChange={(e) => updateEditingConfig(setEditing, "content", "aboutTitle", e.target.value)} /></label><label>About story<textarea name="aboutCopy" value={editing.configuration?.content?.aboutCopy || ""} onChange={(e) => updateEditingConfig(setEditing, "content", "aboutCopy", e.target.value)} /></label><label>Portfolio headline<input name="collectionTitle" value={editing.configuration?.content?.collectionTitle || ""} onChange={(e) => updateEditingConfig(setEditing, "content", "collectionTitle", e.target.value)} /></label><label>Services headline<input name="servicesTitle" value={editing.configuration?.content?.servicesTitle || ""} onChange={(e) => updateEditingConfig(setEditing, "content", "servicesTitle", e.target.value)} /></label><label>Contact headline<input name="contactTitle" value={editing.configuration?.content?.contactTitle || ""} onChange={(e) => updateEditingConfig(setEditing, "content", "contactTitle", e.target.value)} /></label></section>
            <section><h3>Contact & discovery</h3><label>Email<input name="email" type="email" value={editing.configuration?.contact?.email || ""} onChange={(e) => updateEditingConfig(setEditing, "contact", "email", e.target.value)} /></label><label>Phone<input name="phone" value={editing.configuration?.contact?.phone || ""} onChange={(e) => updateEditingConfig(setEditing, "contact", "phone", e.target.value)} /></label><label>Address<textarea name="address" value={editing.configuration?.contact?.address || ""} onChange={(e) => updateEditingConfig(setEditing, "contact", "address", e.target.value)} /></label><label>Search title<input name="seoTitle" value={editing.configuration?.seo?.title || editing.name} onChange={(e) => updateEditingConfig(setEditing, "seo", "title", e.target.value)} /></label><label>Search description<textarea name="seoDescription" value={editing.configuration?.seo?.description || ""} onChange={(e) => updateEditingConfig(setEditing, "seo", "description", e.target.value)} /></label></section>
          </div>
          <div className="website-device-preview"><header><span>Desktop</span><span>Tablet</span><span>Mobile</span><a href={`/sites/${editing.subdomain}`} target="_blank" rel="noreferrer">Open live preview <ExternalLink size={14} /></a></header><div style={{ "--preview-primary": editing.configuration?.theme?.primaryColor || "#173b31", backgroundImage: `linear-gradient(90deg, rgba(9,28,22,.88), rgba(9,28,22,.12)), url(${editing.configuration?.theme?.heroImage || websitePreviewImage(editing.kind)})` }}><small>{editing.name}</small><h3>{editing.configuration?.content?.heroTitle || editing.name}</h3><p>{editing.configuration?.content?.heroCopy || "Local property expertise, presented with clarity."}</p><button type="button">Explore</button></div></div>
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

function defaultSiteNavigation(kind) {
  const portfolio = kind === "developer" ? "Developments" : ["hospitality", "serviced_apartments", "short_stay"].includes(kind) ? "Rooms & stays" : "Properties";
  return [{ id: "home", label: "Home", visible: true }, { id: "portfolio", label: portfolio, visible: true }, { id: "about", label: "About", visible: true }, { id: "services", label: "Services", visible: true }, { id: "contact", label: "Contact", visible: true }];
}
function defaultSiteSections(kind) {
  if (kind === "developer") return ["hero", "about", "developments", "available_units", "construction_updates", "contact", "social_links"];
  if (["hospitality", "serviced_apartments", "short_stay"].includes(kind)) return ["hero", "about", "rooms_stays", "amenities", "gallery", "contact", "social_links"];
  if (kind === "agency") return ["hero", "about", "featured_listings", "team", "areas_served", "contact", "social_links"];
  return ["hero", "about", "featured_listings", "areas_served", "testimonials", "contact", "social_links"];
}
function updateEditingConfig(setEditing, group, key, value) { setEditing((current) => ({ ...current, configuration: { ...(current.configuration || {}), [group]: { ...(current.configuration?.[group] || {}), [key]: value } } })); }
function updateNavigation(setEditing, editing, index, patch) {
  const navigation = [...(editing.configuration?.navigation?.length ? editing.configuration.navigation : defaultSiteNavigation(editing.kind))];
  navigation[index] = { ...navigation[index], ...patch };
  setEditing((current) => ({ ...current, configuration: { ...(current.configuration || {}), navigation } }));
}
