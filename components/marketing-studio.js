/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Type, Save, Download, Undo, Redo, Trash2, Lock, Unlock, ChevronUp, ChevronDown, Maximize2, Upload, Shapes, QrCode, Building2, Sparkles, Plus } from "lucide-react";

const INITIAL_WIDTH = 595;
const INITIAL_HEIGHT = 420;
const SNAP = 12;

export function MarketingStudio({ data, reload }) {
  const canvasRef = useRef(null);
  const draft = data?.latestDraft || null;
  const [elements, setElements] = useState(() => toEditorElements(draft?.elements || []));
  const [designId, setDesignId] = useState(draft?.id || null);
  const [designName, setDesignName] = useState(draft?.name || "Untitled property campaign");
  const [designKind, setDesignKind] = useState(draft?.kind || "sale_brochure");
  const [canvasSize, setCanvasSize] = useState({ width: draft?.canvasWidth || INITIAL_WIDTH, height: draft?.canvasHeight || INITIAL_HEIGHT });
  const [brandKitId, setBrandKitId] = useState(draft?.brandKitId || "");
  const [listingId, setListingId] = useState(draft?.dynamicBindings?.listingId || "");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadingImage, setUploadingImage] = useState(null);

  const selectedElement = elements.find((item) => item.id === selectedId) || null;
  const elementsRef = useRef(elements);
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  const loadedDesignIdRef = useRef(null);

  useEffect(() => {
    const draft = data?.latestDraft;
    if (!draft || loadedDesignIdRef.current === draft.id) return;
    loadedDesignIdRef.current = draft.id;
    setDesignId(draft.id);
    setDesignName(draft.name || "Untitled property campaign");
    setDesignKind(draft.kind || "sale_brochure");
    setCanvasSize({ width: draft.canvasWidth || INITIAL_WIDTH, height: draft.canvasHeight || INITIAL_HEIGHT });
    setBrandKitId(draft.brandKitId || window.localStorage.getItem("nestora-active-brand-kit") || "");
    setListingId(draft.dynamicBindings?.listingId || "");
    const editorElements = toEditorElements(draft.elements || []);
    setElements(editorElements);
    setHistory([JSON.stringify(editorElements)]);
    setHistoryIndex(0);
  }, [data?.latestDraft]);

  function openDesign(id) {
    const next = data?.designs?.find((item) => item.id === id);
    if (!next) return;
    loadedDesignIdRef.current = next.id;
    setDesignId(next.id); setDesignName(next.name); setDesignKind(next.kind || "sale_brochure"); setCanvasSize({ width: next.canvasWidth, height: next.canvasHeight });
    setBrandKitId(next.brandKitId || ""); setListingId(next.dynamicBindings?.listingId || "");
    const editorElements = toEditorElements(next.elements || []);
    setElements(editorElements); setHistory([JSON.stringify(editorElements)]); setHistoryIndex(0); setSelectedId(null);
  }

  function newDesign() {
    loadedDesignIdRef.current = null; setDesignId(null); setDesignName("Untitled property campaign"); setDesignKind("sale_brochure"); setCanvasSize({ width: 595, height: 842 });
    setElements([]); setHistory(["[]"]); setHistoryIndex(0); setSelectedId(null);
  }

  const pushHistory = useCallback((next) => {
    setHistory((current) => {
      const nextHistory = current.slice(0, historyIndex + 1);
      nextHistory.push(JSON.stringify(next));
      const trimmed = nextHistory.slice(-60);
      setHistoryIndex(trimmed.length - 1);
      return trimmed;
    });
  }, [historyIndex]);

  const createElement = useCallback((kind) => {
    const base = { id: `element-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, kind, x: 80, y: 80, width: 220, height: 140, rotation: 0, locked: false, zIndex: 1 };
    if (kind === "text") return { ...base, text: "Double-click to edit", font: "Helvetica", fontWeight: 700, fontSize: 26, color: "#17231f" };
    if (kind === "image") return { ...base, width: 260, height: 180, src: null, mediaId: null };
    if (kind === "shape") return { ...base, width: 220, height: 120, color: "#e98d7e", shapeType: "rectangle", borderRadius: 18 };
    if (kind === "qr") return { ...base, width: 140, height: 140, qrTarget: "/r/example-qr" };
    if (kind === "property") return { ...base, width: 280, height: 120, listingId: null };
    return base;
  }, []);

  const addElement = useCallback((kind) => {
    const next = [...elements, createElement(kind)];
    setElements(next);
    pushHistory(next);
    setSelectedId(next[next.length - 1].id);
  }, [createElement, elements, pushHistory]);

  const updateElement = useCallback((id, patch) => {
    const next = elements.map((item) => item.id === id ? { ...item, ...patch } : item);
    setElements(next);
    pushHistory(next);
  }, [elements, pushHistory]);

  const removeElement = useCallback((id) => {
    const next = elements.filter((item) => item.id !== id);
    setElements(next);
    setSelectedId(null);
    pushHistory(next);
  }, [elements, pushHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setElements(JSON.parse(history[nextIndex]));
    setSelectedId(null);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setElements(JSON.parse(history[nextIndex]));
    setSelectedId(null);
  }, [history, historyIndex]);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Delete" && selectedId && document.activeElement?.tagName !== "INPUT") removeElement(selectedId);
      if ((event.metaKey || event.ctrlKey) && event.key === "z") { event.preventDefault(); handleUndo(); }
      if ((event.metaKey || event.ctrlKey) && event.key === "y") { event.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, handleUndo, handleRedo, removeElement]);

  async function saveDraft() {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/workspace/marketing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", designId, name: designName, kind: designKind, canvasWidth: canvasSize.width, canvasHeight: canvasSize.height, brandKitId: brandKitId || null, elements: toCanonicalElements(elements), dynamicBindings: { ...(draft?.dynamicBindings || {}), listingId: listingId || null } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Draft could not be saved.");
      if (payload.designId && !designId) setDesignId(payload.designId);
      setNotice("Draft saved successfully.");
      setTimeout(() => setNotice(""), 2600);
    } catch (error) {
      setNotice(error.message);
      setTimeout(() => setNotice(""), 4000);
    } finally {
      setSaving(false);
    }
  }

  async function exportDesignFile() {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await fetch("/api/workspace/marketing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "export", format: exportFormat, designId, name: designName, kind: designKind, canvasWidth: canvasSize.width, canvasHeight: canvasSize.height, brandKitId: brandKitId || null, elements: toCanonicalElements(elements), dynamicBindings: { ...(draft?.dynamicBindings || {}), listingId: listingId || null } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Export failed.");
      if (payload.downloadUrl) window.open(payload.downloadUrl, "_blank");
      else setNotice("Export completed. Download will begin shortly.");
      setTimeout(() => setNotice(""), 4000);
    } catch (error) {
      setNotice(error.message);
      setTimeout(() => setNotice(""), 4000);
    } finally {
      setExporting(false);
    }
  }

  async function uploadImage(elementId, file) {
    if (!file) return;
    setUploadingImage(elementId);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/profile-media", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Upload failed.");
      updateElement(elementId, { src: payload.url, mediaId: payload.id });
    } catch (error) {
      setNotice(error.message);
      setTimeout(() => setNotice(""), 4000);
    } finally {
      setUploadingImage(null);
    }
  }

  function startDrag(elementId, event) {
    if (event.button !== 0) return;
    const element = elements.find((e) => e.id === elementId);
    if (!element || element.locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;
    const startPosX = element.x;
    const startPosY = element.y;
    const snapshotBefore = JSON.stringify(elementsRef.current);

    function onMove(e) {
      const newX = snap(startPosX + (e.clientX - rect.left - startX) / zoom);
      const newY = snap(startPosY + (e.clientY - rect.top - startY) / zoom);
      setElements((current) => {
        const next = current.map((item) => item.id === elementId ? { ...item, x: Math.max(0, Math.min(canvasSize.width - item.width, newX)), y: Math.max(0, Math.min(canvasSize.height - item.height, newY)) } : item);
        elementsRef.current = next;
        return next;
      });
    }

    function onUp() {
      const snapshotAfter = JSON.stringify(elementsRef.current);
      if (snapshotBefore !== snapshotAfter) pushHistory(JSON.parse(snapshotAfter));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("lostpointercapture", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("lostpointercapture", onUp);
  }

  return (
    <div className="marketing-studio">
      {notice ? <div className="workspace-toast">{notice}</div> : null}
      <header className="studio-header">
        <div>
          <span className="studio-kicker"><Sparkles size={15} />AI-ready creative workspace</span>
          <input className="studio-title-input" aria-label="Design name" value={designName} onChange={(event) => setDesignName(event.target.value)} />
          <p>Create listing campaigns visually, connect live property data, and export production-ready assets.</p>
        </div>
        <div className="studio-document-controls"><label>Open design<select value={designId || ""} onChange={(event) => openDesign(event.target.value)}><option value="">Current unsaved design</option>{(data?.designs || []).map((design) => <option key={design.id} value={design.id}>{design.name}</option>)}</select></label><button type="button" onClick={newDesign}><Plus size={16} />New design</button></div>
      </header>
      <div className="studio-layout">
        <aside className="studio-sidebar">
          <div className="studio-tool-group">
            <button type="button" onClick={() => addElement("text")}><Type size={16} />Text</button>
            <button type="button" onClick={() => addElement("image")}><Maximize2 size={16} />Image</button>
            <button type="button" onClick={() => addElement("shape")}><Shapes size={16} />Shape</button>
            <button type="button" onClick={() => addElement("qr")}><QrCode size={16} />QR code</button>
            <button type="button" onClick={() => addElement("property")}><Building2 size={16} />Property</button>
          </div>
          <div className="studio-history">
            <button type="button" onClick={handleUndo} disabled={historyIndex <= 0}><Undo size={16} />Undo</button>
            <button type="button" onClick={handleRedo} disabled={historyIndex >= history.length - 1}><Redo size={16} />Redo</button>
          </div>
          <div className="studio-connections"><h3>Connected data</h3><label>Brand Kit<select value={brandKitId} onChange={(event) => setBrandKitId(event.target.value)}><option value="">No Brand Kit</option>{(data?.brandKits || []).map((kit) => <option key={kit.id} value={kit.id}>{kit.name}</option>)}</select></label><label>Property<select value={listingId} onChange={(event) => setListingId(event.target.value)}><option value="">No connected property</option>{(data?.listings || []).map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select></label></div>
          {selectedElement ? (
            <div className="studio-selection">
              <h3>Selection</h3>
              <label>X<input type="number" value={selectedElement.x} onChange={(e) => updateElement(selectedElement.id, { x: snap(Number(e.target.value)) })} /></label>
              <label>Y<input type="number" value={selectedElement.y} onChange={(e) => updateElement(selectedElement.id, { y: snap(Number(e.target.value)) })} /></label>
              <label>Width<input type="number" value={selectedElement.width} onChange={(e) => updateElement(selectedElement.id, { width: snap(Number(e.target.value)) })} /></label>
              <label>Height<input type="number" value={selectedElement.height} onChange={(e) => updateElement(selectedElement.id, { height: snap(Number(e.target.value)) })} /></label>
              <label>Rotation<input type="number" value={selectedElement.rotation || 0} onChange={(e) => updateElement(selectedElement.id, { rotation: Number(e.target.value) })} /></label>
              {selectedElement.kind === "text" ? <label className="form-wide">Text<textarea value={selectedElement.text || ""} onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })} rows={2} /></label> : null}
              {selectedElement.kind === "image" && !selectedElement.src ? <label className="studio-upload"><Upload size={14} /><span>Upload image</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(selectedElement.id, file); }} /></label> : null}
              <button type="button" onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })}>{selectedElement.locked ? <><Lock size={16} />Locked</> : <><Unlock size={16} />Unlocked</>}</button>
              <div className="studio-actions">
                <button type="button" onClick={() => updateElement(selectedElement.id, { zIndex: (selectedElement.zIndex || 1) + 1 })}><ChevronUp size={16} />Bring forward</button>
                <button type="button" onClick={() => updateElement(selectedElement.id, { zIndex: Math.max(0, (selectedElement.zIndex || 1) - 1) })}><ChevronDown size={16} />Send backward</button>
              </div>
              <button type="button" className="button--danger" onClick={() => removeElement(selectedElement.id)}><Trash2 size={16} />Delete</button>
            </div>
          ) : <p className="panel-empty">Select an element to edit its size, position and stacking order.</p>}
        </aside>
        <div className="studio-canvas-wrap">
          <div className="studio-zoom">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>-</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>+</button>
          </div>
          <div className="studio-canvas" onClick={() => setSelectedId(null)} style={{ transform: `scale(${zoom})` }} ref={canvasRef}>
            <div style={{ width: canvasSize.width, height: canvasSize.height, background: "#ffffff", border: "1px solid #d6ded9", position: "relative", overflow: "hidden" }}>
              {elements.map((element) => {
                const isSelected = selectedId === element.id;
                const style = { position: "absolute", left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation || 0}deg)`, transformOrigin: "center center", border: isSelected ? "2px solid #173b31" : "1px solid transparent", boxShadow: element.locked ? "inset 0 0 0 2px rgba(23,59,49,.2)" : "none", background: "#ffffff", zIndex: element.zIndex || 1, cursor: element.locked ? "default" : "move" };
                return (
                  <div key={element.id} style={style} onPointerDown={(e) => { if (element.locked) return; e.stopPropagation(); setSelectedId(element.id); startDrag(element.id, e); }}>
                    {element.kind === "text" ? <div style={{ padding: 8, fontFamily: "Helvetica, Arial, sans-serif", fontSize: element.fontSize, fontWeight: element.fontWeight || (element.font?.includes("Bold") ? 700 : 400), color: element.color, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{element.text || "Text"}</div> : null}
                    {element.kind === "image" ? <div style={{ width: "100%", height: "100%", position: "relative" }}>{element.src ? <img alt="design element" src={element.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ background: "#eef3f1", color: "#5f6965", display: "grid", placeItems: "center", height: "100%", fontSize: 12 }}>Image{uploadingImage === element.id ? " (uploading...)" : ""}</div>}</div> : null}
                    {element.kind === "shape" ? <div style={{ width: "100%", height: "100%", background: element.color || "#e98d7e", borderRadius: element.shapeType === "circle" ? "50%" : element.borderRadius || 0 }} /> : null}
                    {element.kind === "qr" ? <div style={{ background: "#eef3f1", height: "100%", display: "grid", placeItems: "center", fontFamily: "monospace", fontSize: 10 }}>QR</div> : null}
                    {element.kind === "property" ? <div style={{ background: "#fffdf9", border: "1px solid #d6ded9", padding: 12, fontSize: 12 }}>Property card</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="studio-footer">
        <button type="button" onClick={saveDraft} disabled={saving}><Save size={16} />{saving ? "Saving..." : "Save draft"}</button>
        <label className="studio-export-format">Export<select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}><option value="pdf">PDF</option><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label>
        <button type="button" onClick={exportDesignFile} disabled={exporting}><Download size={16} />{exporting ? "Exporting..." : `Export ${exportFormat.toUpperCase()}`}</button>
      </div>
    </div>
  );
}

function snap(value) {
  return Math.round(value / SNAP) * SNAP;
}

function toEditorElements(elements) {
  return elements.map((element) => ({
    ...element,
    kind: element.kind || (element.type === "qr_code" ? "qr" : element.type),
    text: element.text ?? element.content,
    src: element.src ?? element.payload?.src ?? (element.type === "image" ? element.content : null),
    font: element.font ?? element.style?.fontFamily,
    fontSize: element.fontSize ?? element.style?.fontSize,
    color: element.color ?? element.style?.color ?? element.style?.fillColor,
    shapeType: element.shapeType ?? element.style?.shapeType,
    borderRadius: element.borderRadius ?? element.style?.borderRadius,
    qrTarget: normalizedQrTarget(element),
  }));
}

function toCanonicalElements(elements) {
  return elements.map((element) => ({
    id: element.id,
    type: element.kind === "qr" ? "qr_code" : element.kind,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation || 0,
    locked: Boolean(element.locked),
    zIndex: element.zIndex || 1,
    content: element.kind === "text" ? element.text : element.kind === "image" ? element.src : element.kind === "qr" ? element.qrTarget : undefined,
    payload: element.kind === "image" ? { src: element.src, mediaId: element.mediaId } : element.kind === "qr" ? { target: element.qrTarget || "/" } : undefined,
    style: { fontFamily: element.font, fontSize: element.fontSize, fontWeight: element.fontWeight || (element.font?.includes("Bold") ? 700 : undefined), color: element.color, fillColor: element.color, shapeType: element.shapeType, borderRadius: element.borderRadius },
  }));
}

function normalizedQrTarget(element) {
  const candidates = [element.qrTarget, element.payload?.target, element.payload?.destination, element.content];
  for (const candidate of candidates) {
    if (typeof candidate === "string") return candidate;
    if (candidate && typeof candidate.destination === "string") return candidate.destination;
  }
  return "/";
}
