"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Trash2, Lock, Unlock, Globe2, Palette, Type, Link2 } from "lucide-react";

export function BrandKitManager({ data }) {
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
      setKits((current) => current.map((k) => k.id === id ? { ...k, locked: !k.locked } : k));
      if (editing?.id === id) setEditing((k) => ({ ...k, locked: !k.locked }));
    }
  }

  return (
    <div className="brand-kit-manager">
      <header className="brand-header">
        <div>
          <h1>Brand kits</h1>
          <p>Manage logos, colours, fonts, contact details and default QR styling.</p>
        </div>
        <button className="button button--coral" type="button" onClick={() => setEditing({ name: "", brandColors: { primary: "#173b31", secondary: "#9b4d42", accent: "#e98d7e" }, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, contactFooter: "", websiteUrl: "", socialHandles: {}, disclaimer: "" })}>
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
            <div><strong>{kit.name}</strong><small>{kit.fonts?.heading || "Helvetica-Bold"} / {kit.fonts?.body || "Helvetica"}</small></div>
            <div className="kit-swatches">
              <span style={{ background: kit.brandColors?.primary || "#173b31" }} />
              <span style={{ background: kit.brandColors?.secondary || "#9b4d42" }} />
              <span style={{ background: kit.brandColors?.accent || "#e98d7e" }} />
            </div>
            <div className="kit-actions">
              <button type="button" onClick={() => setEditing(kit)}><Save size={16} />Edit</button>
              {kit.locked ? <button type="button" onClick={() => toggleLock(kit.id)}><Unlock size={16} />Unlock</button> : <button type="button" onClick={() => toggleLock(kit.id)}><Lock size={16} />Lock</button>}
              <button type="button" onClick={() => removeKit(kit.id)}><Trash2 size={16} />Remove</button>
            </div>
          </article>
        )) : <div className="kit-empty-state"><Palette size={42} /><h3>No brand kits yet</h3><p>Create your first brand kit to apply consistent colors, fonts, and styling across your marketing materials.</p><button className="button button--coral" type="button" onClick={() => setEditing({ name: "", brandColors: { primary: "#173b31", secondary: "#9b4d42", accent: "#e98d7e" }, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, contactFooter: "", websiteUrl: "", socialHandles: {}, disclaimer: "" })}><Plus size={16} />Create brand kit</button></div>}
      </section>
    </div>
  );
}