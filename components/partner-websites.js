"use client";

import { useState, useEffect } from "react";
import { useNestora } from "@/components/providers";
import { Plus, Save, Globe2, ExternalLink, BarChart3, Eye, XCircle, Archive, RefreshCw, Check, Lock, Palette, LayoutTemplate } from "lucide-react";

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

export function PartnerWebsites({ data }) {
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
    if (data?.reload) data.reload();
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
      subdomain: formData.get("subdomain"),
      configuration: {
        templateId: formData.get("templateId"),
        sections: ["hero", "about", "contact", "social"],
        brand: {},
      },
    }, "Website created.");
    if (result?.website) { setCreating(false); setWebsites((current) => [result.website, ...current]); }
  }

  async function saveWebsite(event) {
    event.preventDefault();
    if (!editing) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const configuration = {
      ...editing.configuration,
      sections: formData.getAll("sections"),
    };
    const result = await performWrite({ action: "update", websiteId: editing.id, ...editing, configuration }, "Site saved.");
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
          <h1>Partner websites</h1>
          <p>Create and manage public websites for your listings, developments, and hospitality brand.</p>
        </div>
        {isProfessional && <button className="button button--coral" type="button" onClick={() => setCreating(true)}><Plus size={17} />New website</button>}
      </header>

      {notice ? <div className="studio-toast"><Check size={16} />{notice}</div> : null}

      {creating ? (
        <form className="studio-form" onSubmit={createWebsite}>
          <label>Website name<input name="name" required minLength={2} maxLength={120} placeholder="Aisha Ibrahim Properties" /></label>
          <label>Website type<select name="kind" required>{TEMPLATE_OPTIONS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Template<select name="templateId" required>{TEMPLATE_OPTIONS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Subdomain<input name="subdomain" required pattern="[a-z0-9][a-z0-9-]{1,40}" placeholder="aisha-properties" /></label>
          <div className="form-actions form-wide">
            <button type="button" onClick={() => setCreating(false)}>Cancel</button>
            <button className="button button--ink" type="submit">Create website</button>
          </div>
        </form>
      ) : null}

      {!creating && !editing && (
        <section className="website-gallery">
          {websites.length ? websites.map((site) => <article key={site.id} className="website-card">
            <div>
              <strong>{site.name}</strong>
              <small>{site.kind} · {site.subdomain}.nestora.doctarx.com</small>
              <span className={`status-pill status-pill--${site.status}`}>{site.status}</span>
            </div>
            <div className="website-card__metrics">
              <span><Eye size={16} />{site.visitCount || 0} visits</span>
              <span><BarChart3 size={16} />{site.visitsLast30Days || 0} last 30 days</span>
            </div>
            <div className="website-card__actions">
              <button type="button" onClick={() => setPreviewing(site)}><ExternalLink size={16} />Preview</button>
              <button type="button" onClick={() => setEditing(site)}>Edit</button>
              {site.status === "published" ? <button type="button" onClick={() => unpublish(site.id)}><XCircle size={16} />Unpublish</button> : <button type="button" onClick={() => publish(site.id)}><Globe2 size={16} />Publish</button>}
            </div>
          </article>) : <p className="panel-empty">No partner websites yet.</p>}
        </section>
      )}

      {editing && !previewing && (
        <form className="website-editor" onSubmit={saveWebsite}>
          <div className="website-toolbar">
            <label>Name<input name="name" value={editing.name || ""} onChange={(e) => setEditing((d) => ({ ...d, name: e.target.value }))} required /></label>
            <label>Subdomain<input name="subdomain" value={editing.subdomain || ""} onChange={(e) => setEditing((d) => ({ ...d, subdomain: e.target.value }))} required pattern="[a-z0-9][a-z0-9-]{1,40}" /></label>
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