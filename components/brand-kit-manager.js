/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Trash2, Lock, Unlock, Palette, Copy, CheckCircle2, Download, Globe2 } from "lucide-react";

export function BrandKitManager({ data, role }) {
  const [kits, setKits] = useState(data?.kits || []);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (data?.kits) setKits(data.kits);
  }, [data]);

  async function performWrite(body, success) {
    setSaving(true);
    try {
      const response = await fetch("/api/workspace/brand-kits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "That change could not be saved.");
      setNotice(success || "Brand kit saved.");
      return payload;
    } catch (error) {
      setNotice(error.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = {
      action: editing?.id ? "update" : "create",
      name: formData.get("name"),
      brandColors: {
        primary: formData.get("primaryColor"),
        secondary: formData.get("secondaryColor"),
        accent: formData.get("accentColor"),
      },
      fonts: {
        heading: formData.get("headingFont"),
        body: formData.get("bodyFont"),
      },
      contactFooter: formData.get("contactFooter"),
      websiteUrl: formData.get("website"),
      socialHandles: {
        instagram: formData.get("instagram"),
        linkedin: formData.get("linkedin"),
        twitter: formData.get("twitter"),
      },
      disclaimer: formData.get("disclaimer"),
      brandSystem: {
        tagline: formData.get("tagline"),
        positioning: formData.get("positioning"),
        voice: formData.get("voice"),
        logoUsage: formData.get("logoUsage"),
        photographyDirection: formData.get("photographyDirection"),
        typographyScale: { display: formData.get("displayScale"), heading: formData.get("headingScale"), body: formData.get("bodyScale") },
      },
    };
    if (editing?.id) body.brandKitId = editing.id;
    const successMsg = editing?.id ? "Brand kit updated." : "Brand kit created.";
    const result = await performWrite(body, successMsg);
    if (editing?.id && result?.brandKit) {
      setEditing(result.brandKit);
      setKits((current) => current.map((kit) => kit.id === editing.id ? result.brandKit : kit));
    } else if (!editing?.id && result?.brandKit) {
      setEditing(null);
      setKits((current) => [result.brandKit, ...current]);
    }
  }

  async function removeKit(id) {
    const result = await performWrite({ action: "delete", brandKitId: id }, "Brand kit removed.");
    if (result) {
      setKits((current) => current.filter((kit) => kit.id !== id));
      if (editing?.id === id) setEditing(null);
    }
  }

  async function toggleLock(id) {
    const kit = kits.find((k) => k.id === id);
    if (!kit) return;
    const nextAction = kit.isLocked ? "unlock" : "lock";
    const result = await performWrite({ action: nextAction, brandKitId: id }, nextAction === "unlock" ? "Brand kit unlocked." : "Brand kit locked.");
    if (result) {
      setKits((current) => current.map((k) => k.id === id ? { ...k, isLocked: !k.isLocked } : k));
      if (editing?.id === id) setEditing((k) => ({ ...k, isLocked: !k.isLocked }));
    }
  }

  async function duplicateKit(kit) {
    const result = await performWrite({ action: "create", name: `${kit.name} Copy`, brandColors: kit.brandColors, fonts: kit.fonts, contactFooter: kit.contactFooter, websiteUrl: kit.websiteUrl, socialHandles: kit.socialHandles, disclaimer: kit.disclaimer, defaultQrStyle: kit.defaultQrStyle, approvedImages: kit.approvedImages, brandSystem: kit.brandSystem }, "Brand kit duplicated.");
    if (result?.brandKit) setKits((current) => [result.brandKit, ...current]);
  }

  function applyKit(kit) {
    window.localStorage.setItem("nestora-active-brand-kit", kit.id);
    setNotice(`${kit.name} will be applied to your next design.`);
  }

  function downloadBrandSheet(kit) {
    const payload = { name: kit.name, colors: kit.brandColors, fonts: kit.fonts, brandSystem: kit.brandSystem, contact: kit.contactFooter, website: kit.websiteUrl, social: kit.socialHandles, disclaimer: kit.disclaimer };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${kit.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-brand-system.json`; link.click(); URL.revokeObjectURL(link.href);
    setNotice("Portable brand system downloaded.");
  }

  async function applyToWebsites(kit) {
    const websites = data?.websites || [];
    if (!websites.length) { setNotice("Create a partner website first, then apply this Brand Kit."); return; }
    setSaving(true);
    try {
      for (const website of websites) {
        const response = await fetch("/api/workspace/websites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "update", websiteId: website.id, brandKitId: kit.id }) });
        if (!response.ok) throw new Error(`Could not update ${website.name}.`);
      }
      setNotice(`${kit.name} applied to ${websites.length} website${websites.length === 1 ? "" : "s"}.`);
    } catch (error) { setNotice(error.message); } finally { setSaving(false); }
  }

  return (
    <div className="brand-kit-manager">
      <header className="brand-header">
        <div>
          <h1>Brand kits</h1>
          <p>Manage logos, colours, fonts, contact details and default QR styling.</p>
        </div>
        <button className="button button--coral" type="button" onClick={() => setEditing({ name: "", brandColors: { primary: "#173b31", secondary: "#9b4d42", accent: "#e98d7e" }, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, contactFooter: "", websiteUrl: "", socialHandles: {}, disclaimer: "", brandSystem: {} })}>
          <Plus size={17} />New brand kit
        </button>
      </header>

      {notice ? <div className="workspace-toast">{notice}</div> : null}

      {editing ? (
        <form className="workspace-form" onSubmit={handleSubmit}>
          <label>Kit name<input name="name" value={editing.name || ""} onChange={(e) => setEditing((k) => ({ ...k, name: e.target.value }))} required /></label>
          <label>Primary colour<input name="primaryColor" type="color" value={editing.brandColors?.primary || "#173b31"} onChange={(e) => setEditing((k) => ({ ...k, brandColors: { ...(k.brandColors || {}), primary: e.target.value } }))} /></label>
          <label>Secondary colour<input name="secondaryColor" type="color" value={editing.brandColors?.secondary || "#9b4d42"} onChange={(e) => setEditing((k) => ({ ...k, brandColors: { ...(k.brandColors || {}), secondary: e.target.value } }))} /></label>
          <label>Accent colour<input name="accentColor" type="color" value={editing.brandColors?.accent || "#e98d7e"} onChange={(e) => setEditing((k) => ({ ...k, brandColors: { ...(k.brandColors || {}), accent: e.target.value } }))} /></label>
          <label>Heading font<input name="headingFont" value={editing.fonts?.heading || "Helvetica-Bold"} onChange={(e) => setEditing((k) => ({ ...k, fonts: { ...(k.fonts || {}), heading: e.target.value } }))} /></label>
          <label>Body font<input name="bodyFont" value={editing.fonts?.body || "Helvetica"} onChange={(e) => setEditing((k) => ({ ...k, fonts: { ...(k.fonts || {}), body: e.target.value } }))} /></label>
          <label>Website<input name="website" value={editing.websiteUrl || ""} onChange={(e) => setEditing((k) => ({ ...k, websiteUrl: e.target.value }))} /></label>
          <label>Instagram<input name="instagram" value={editing.socialHandles?.instagram || ""} onChange={(e) => setEditing((k) => ({ ...k, socialHandles: { ...(k.socialHandles || {}), instagram: e.target.value } }))} /></label>
          <label>LinkedIn<input name="linkedin" value={editing.socialHandles?.linkedin || ""} onChange={(e) => setEditing((k) => ({ ...k, socialHandles: { ...(k.socialHandles || {}), linkedin: e.target.value } }))} /></label>
          <label>Twitter/X<input name="twitter" value={editing.socialHandles?.twitter || ""} onChange={(e) => setEditing((k) => ({ ...k, socialHandles: { ...(k.socialHandles || {}), twitter: e.target.value } }))} /></label>
          <label className="form-wide">Contact footer<textarea name="contactFooter" value={editing.contactFooter || ""} onChange={(e) => setEditing((k) => ({ ...k, contactFooter: e.target.value }))} /></label>
          <label className="form-wide">Brand tagline<input name="tagline" value={editing.brandSystem?.tagline || ""} onChange={(e) => setEditing((k) => ({ ...k, brandSystem: { ...(k.brandSystem || {}), tagline: e.target.value } }))} placeholder="Remarkable property. Represented properly." /></label>
          <label className="form-wide">Positioning statement<textarea name="positioning" value={editing.brandSystem?.positioning || ""} onChange={(e) => setEditing((k) => ({ ...k, brandSystem: { ...(k.brandSystem || {}), positioning: e.target.value } }))} /></label>
          <label>Brand voice<input name="voice" value={editing.brandSystem?.voice || ""} onChange={(e) => setEditing((k) => ({ ...k, brandSystem: { ...(k.brandSystem || {}), voice: e.target.value } }))} placeholder="Assured, warm, precise" /></label>
          <label>Logo usage<input name="logoUsage" value={editing.brandSystem?.logoUsage || ""} onChange={(e) => setEditing((k) => ({ ...k, brandSystem: { ...(k.brandSystem || {}), logoUsage: e.target.value } }))} placeholder="Clear space and background rules" /></label>
          <label className="form-wide">Photography direction<textarea name="photographyDirection" value={editing.brandSystem?.photographyDirection || ""} onChange={(e) => setEditing((k) => ({ ...k, brandSystem: { ...(k.brandSystem || {}), photographyDirection: e.target.value } }))} placeholder="Natural light, honest geometry, lived-in detail" /></label>
          <label>Display scale<input name="displayScale" value={editing.brandSystem?.typographyScale?.display || "64/68"} onChange={(e) => setEditing((k) => ({ ...k, brandSystem: { ...(k.brandSystem || {}), typographyScale: { ...(k.brandSystem?.typographyScale || {}), display: e.target.value } } }))} /></label>
          <label>Heading scale<input name="headingScale" value={editing.brandSystem?.typographyScale?.heading || "36/42"} onChange={(e) => setEditing((k) => ({ ...k, brandSystem: { ...(k.brandSystem || {}), typographyScale: { ...(k.brandSystem?.typographyScale || {}), heading: e.target.value } } }))} /></label>
          <label>Body scale<input name="bodyScale" value={editing.brandSystem?.typographyScale?.body || "16/26"} onChange={(e) => setEditing((k) => ({ ...k, brandSystem: { ...(k.brandSystem || {}), typographyScale: { ...(k.brandSystem?.typographyScale || {}), body: e.target.value } } }))} /></label>
          <label className="form-wide">Disclaimer<textarea name="disclaimer" value={editing.disclaimer || ""} onChange={(e) => setEditing((k) => ({ ...k, disclaimer: e.target.value }))} /></label>
          <div className="form-actions form-wide">
            <button type="button" onClick={() => setEditing(null)}>Cancel</button>
            <button className="button button--ink" type="submit" disabled={saving}>{editing.id ? "Save brand kit" : "Create brand kit"}</button>
          </div>
        </form>
      ) : null}

<section className="kit-gallery">
        {kits.length ? kits.map((kit) => (
          <article key={kit.id} className="kit-card">
            <div className="kit-card__identity">{kit.approvedImages?.[0]?.url ? <img src={kit.approvedImages[0].url} alt={`${kit.name} logo`} /> : null}<strong>{kit.name}</strong><small>{kit.fonts?.heading || "Helvetica-Bold"} / {kit.fonts?.body || "Helvetica"}</small><em>{kit.isOrganizationKit ? "Organisation brand" : "Personal brand"}</em></div>
            <div className="kit-system-preview" style={{ "--kit-primary": kit.brandColors?.primary || "#173b31", "--kit-secondary": kit.brandColors?.secondary || "#9b4d42", "--kit-accent": kit.brandColors?.accent || "#e98d7e", "--kit-heading": kit.fonts?.heading || "Georgia" }}><span>For property with a point of view</span><h3>{kit.brandSystem?.tagline || "A complete visual system for every campaign."}</h3><p>{kit.brandSystem?.positioning || "Consistent identity across listings, websites, social campaigns and print."}</p><button type="button">View property</button></div>
            <div className="kit-swatches">
              <span style={{ background: kit.brandColors?.primary || "#173b31" }} />
              <span style={{ background: kit.brandColors?.secondary || "#9b4d42" }} />
              <span style={{ background: kit.brandColors?.accent || "#e98d7e" }} />
            </div>
            <div className="kit-actions">
              <button type="button" onClick={() => applyKit(kit)}><CheckCircle2 size={16} />Apply</button>
              <button type="button" onClick={() => applyToWebsites(kit)}><Globe2 size={16} />Use on websites</button>
              <button type="button" onClick={() => downloadBrandSheet(kit)}><Download size={16} />Brand sheet</button>
              <button type="button" onClick={() => setEditing(kit)}><Save size={16} />Edit</button>
              <button type="button" onClick={() => duplicateKit(kit)}><Copy size={16} />Duplicate</button>
              {role === "admin" ? kit.isLocked ? <button type="button" onClick={() => toggleLock(kit.id)}><Unlock size={16} />Unlock</button> : <button type="button" onClick={() => toggleLock(kit.id)}><Lock size={16} />Lock</button> : null}
              <button type="button" onClick={() => removeKit(kit.id)}><Trash2 size={16} />Remove</button>
            </div>
          </article>
        )) : <div className="kit-empty-state"><Palette size={42} /><h3>No brand kits yet</h3><p>Create your first brand kit to apply consistent colors, fonts, identity rules and styling across every campaign.</p><button className="button button--coral" type="button" onClick={() => setEditing({ name: "", brandColors: { primary: "#173b31", secondary: "#9b4d42", accent: "#e98d7e" }, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, contactFooter: "", websiteUrl: "", socialHandles: {}, disclaimer: "", brandSystem: {} })}><Plus size={16} />Create brand kit</button></div>}
      </section>
    </div>
  );
}
