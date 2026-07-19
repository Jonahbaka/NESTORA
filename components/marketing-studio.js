"use client";

import { useState, useCallback } from "react";
import { useNestora } from "@/components/providers";
import { Plus, Save, FileText, Copy, Archive, Type, Image, Square, QrCode, Check } from "lucide-react";

const TEMPLATE_KINDS = [
  { value: "rental_flyer", label: "Rental flyer" },
  { value: "sale_brochure", label: "Sale brochure" },
  { value: "development_brochure", label: "Development brochure" },
  { value: "hotel_flyer", label: "Hotel flyer" },
  { value: "open_house_poster", label: "Open house poster" },
  { value: "agent_profile_sheet", label: "Agent profile sheet" },
  { value: "agency_brochure", label: "Agency brochure" },
  { value: "payment_plan_sheet", label: "Payment plan sheet" },
  { value: "construction_update", label: "Construction update" },
  { value: "room_promotion", label: "Room promotion" },
  { value: "short_stay_flyer", label: "Short-stay flyer" },
  { value: "weekend_offer", label: "Weekend offer" },
  { value: "social_square", label: "Social square" },
  { value: "social_portrait", label: "Social portrait" },
  { value: "social_story", label: "Social story" },
  { value: "whatsapp_status", label: "WhatsApp status" },
  { value: "facebook_post", label: "Facebook post" },
  { value: "linkedin_post", label: "LinkedIn post" },
  { value: "youtube_thumbnail", label: "YouTube thumbnail" },
  { value: "digital_sign", label: "Digital sign" },
  { value: "qr_poster", label: "QR poster" },
  { value: "comparison_sheet", label: "Comparison sheet" },
  { value: "email_header", label: "Email header" },
  { value: "open_house_promotional", label: "Open house promotional" },
];

const CANVAS_PRESETS = [
  { value: "a4", label: "A4", width: 595, height: 842 },
  { value: "us_letter", label: "US Letter", width: 612, height: 792 },
  { value: "square", label: "Square", width: 500, height: 500 },
  { value: "portrait", label: "Portrait", width: 400, height: 600 },
  { value: "story", label: "Story", width: 360, height: 640 },
  { value: "landscape", label: "Landscape", width: 800, height: 500 },
];

export function MarketingStudio({ data, reload }) {
  const [mode, setMode] = useState("gallery");
  const [selectedDesignId, setSelectedDesignId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const { account } = useNestora();
  const isProfessional = account?.role && ["agent", "agency_admin", "developer", "host"].includes(account.role);

  const designs = (data?.designs || []).filter((d) => !d.archived);
  const templates = (data?.templates || []).filter((t) => t.is_template || t.is_approved_template);
  const selectedDesign = designs.find((d) => d.id === selectedDesignId) || editing;

  async function performWrite(body, successMessage) {
    const response = await fetch("/api/workspace/marketing", {
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
    if (reload) reload();
    return payload;
  }

  async function createDesign(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await performWrite({
      action: "create",
      name: formData.get("name"),
      kind: formData.get("kind"),
      canvasPreset: formData.get("canvasPreset"),
      brandKitId: formData.get("brandKitId") || null,
      templateId: formData.get("templateId") || null,
      elements: [],
      dynamicBindings: {},
    }, "Design created.");
    if (result?.design) { setCreating(null); setMode("editor"); setSelectedDesignId(result.design.id); setEditing(result.design); }
  }

  async function updateDesign(event) {
    event.preventDefault();
    if (!selectedDesign) return;
    const result = await performWrite({ action: "update", designId: selectedDesign.id, ...editing }, "Design saved.");
    if (result?.design) setEditing(result.design);
  }

  async function exportDesign(format) {
    if (!selectedDesign) return;
    const result = await performWrite({ action: "export", designId: selectedDesign.id, format }, `${format.toUpperCase()} exported.`);
    if (result) {
      window.open(`/api/marketing/${selectedDesign.id}?download=${format}`, "_blank", "noopener,noreferrer");
    }
  }

  async function archiveCurrentDesign() {
    if (!selectedDesign) return;
    if (!confirm("Archive this design? You can restore it later from the archive.")) return;
    await performWrite({ action: "archive", designId: selectedDesign.id }, "Design archived.");
    setSelectedDesignId(null); setEditing(null); setMode("gallery");
  }

  return (
    <div className="marketing-studio">
      <header className="studio-header">
        <div>
          <h1>Marketing Studio</h1>
          <p>Design PDFs, posters, and social assets for your listings, projects, and hospitality brand.</p>
        </div>
        {isProfessional && <button className="button button--coral" type="button" onClick={() => { setCreating(true); setEditing(null); }}><Plus size={17} />New design</button>}
      </header>

      {notice ? <div className="studio-toast"><Check size={16} />{notice}</div> : null}

      {creating ? (
        <form className="studio-form" onSubmit={createDesign}>
          <label>Design name<input name="name" required minLength={2} maxLength={120} placeholder="Weekend stay flyer" /></label>
          <label>Material type<select name="kind" required>{TEMPLATE_KINDS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          <label>Canvas<select name="canvasPreset">{CANVAS_PRESETS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          {(data?.brandKits?.length || 0) > 0 && <label>Brand kit<select name="brandKitId"><option value="">None</option>{(data.brandKits || []).map((kit) => <option value={kit.id} key={kit.id}>{kit.name}</option>)}</select></label>}
          <div className="form-actions form-wide">
            <button type="button" onClick={() => setCreating(false)}>Cancel</button>
            <button className="button button--ink" type="submit">Create design</button>
          </div>
        </form>
      ) : null}

      {!creating && mode === "gallery" && (
        <>
          <section className="studio-gallery">
            <h2>Your designs</h2>
            {designs.length ? designs.map((item) => <article key={item.id} className={`design-card ${selectedDesignId === item.id ? "selected" : ""}`}>
              <button type="button" className="design-card__open" onClick={() => { setSelectedDesignId(item.id); setEditing(item); setMode("editor"); }}>
                <strong>{item.name}</strong>
                <small>{item.kind}</small>
                <span className={`status-pill status-pill--${item.status}`}>{item.status}</span>
              </button>
              <div className="design-card__actions">
                <button type="button" onClick={() => exportDesign("pdf")} aria-label={`Export ${item.name} as PDF`}><FileText size={16} /></button>
                <button type="button" onClick={() => exportDesign("png")} aria-label={`Export ${item.name} as PNG`}><Image size={16} /></button>
              </div>
            </article>) : <p className="panel-empty">No designs yet. Create your first marketing asset.</p>}
          </section>
          {(templates.length || 0) > 0 && (<section className="studio-gallery">
            <h2>Templates</h2>
            {templates.map((item) => <article key={item.id} className="design-card template-card">
              <div><strong>{item.name}</strong><small>{item.kind} {item.is_approved_template ? "· Approved" : ""}</small></div>
              <button type="button" className="button button--outline" onClick={async () => { const payload = await performWrite({ action: "duplicate", designId: item.id }, "Template duplicated."); if (payload?.design) { setSelectedDesignId(payload.design.id); setEditing(payload.design); setMode("editor"); } }}><Copy size={16} />Use template</button>
            </article>)}
          </section>)}
        </>
      )}

      {!creating && mode === "editor" && selectedDesign && (
        <form className="studio-editor" onSubmit={updateDesign}>
          <div className="studio-toolbar">
            <label className="form-wide"><Type size={16} />Name<input name="name" value={editing?.name || selectedDesign.name} onChange={(e) => setEditing((d) => ({ ...d, name: e.target.value }))} required /></label>
            <div className="studio-actions">
              <button type="button" className="button button--outline" onClick={() => exportDesign("pdf")}><FileText size={16} />PDF</button>
              <button type="button" className="button button--outline" onClick={() => exportDesign("png")}><Image size={16} />PNG</button>
              <button type="button" className="button button--ink" onClick={archiveCurrentDesign}><Archive size={16} />Archive</button>
              <button type="button" className="button button--outline" onClick={() => { setMode("gallery"); setSelectedDesignId(null); setEditing(null); }}>Back</button>
              <button className="button button--coral" type="submit"><Save size={16} />Save</button>
            </div>
          </div>
          <div className="studio-canvas-wrap">
            <div className="studio-canvas" style={{ width: Math.min(selectedDesign.canvas_width, 480), aspectRatio: `${selectedDesign.canvas_width} / ${selectedDesign.canvas_height}` }}>
              <div className="canvas-paper">
                {(editing?.elements || []).length ? (editing.elements.map((el, idx) => <div key={idx} className="canvas-element" style={{ left: `${(el.x / (selectedDesign.canvas_width || 595)) * 100}%`, top: `${(el.y / (selectedDesign.canvas_height || 842)) * 100}%`, width: `${(el.width / (selectedDesign.canvas_width || 595)) * 100}%`, height: `${(el.height / (selectedDesign.canvas_height || 842)) * 100}%`, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined, background: el.type === "shape" ? el.style?.fillColor : undefined, borderRadius: el.style?.shapeType === "circle" ? "50%" : undefined }}><span style={{ color: el.style?.color || "#17231f", fontSize: el.style?.fontSize ? `${el.style.fontSize * 0.18}px` : undefined }}>{el.content}</span></div>)) : <p className="canvas-empty">This canvas is blank. Add elements after saving.</p>}
              </div>
            </div>
            <aside className="studio-sidebar">
              <h3>Elements</h3>
              <p className="panel-empty">Element controls are available in the full editor. This compact view supports canvas preview, naming, and exports.</p>
              <div className="studio-quick-actions">
                <button type="button" onClick={() => setEditing((d) => ({ ...d, elements: [...(d.elements || []), { type: "text", x: 40, y: 40, width: 200, height: 30, content: "Sample text", style: { fontSize: 18, color: "#173b31", fontFamily: "Inter", textAlign: "left", fontWeight: "bold" } }] })}><Type size={16} />Add heading</button>
                <button type="button" onClick={() => setEditing((d) => ({ ...d, elements: [...(d.elements || []), { type: "shape", x: 40, y: 220, width: 160, height: 80, style: { fillColor: "#e98d7e", shapeType: "rectangle" } }] })}><Square size={16} />Add shape</button>
                <button type="button" onClick={() => setEditing((d) => ({ ...d, elements: [...(d.elements || []), { type: "qr_code", x: 330, y: 620, width: 120, height: 120, content: "https://nestora.doctarx.com", style: {}} } })}><QrCode size={16} />Add QR</button>
              </div>
            </aside>
          </div>
        </form>
      )}
    </div>
  );
}