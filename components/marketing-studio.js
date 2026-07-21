"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Type, Save, Download, Undo, Redo, Trash2, Lock, Unlock, ChevronUp, ChevronDown, Maximize2, Upload } from "lucide-react";

const INITIAL_WIDTH = 595;
const INITIAL_HEIGHT = 420;
const SNAP = 12;
const MIN_ELEMENT_SIZE = 20;
const HANDLE_SIZE = 8;

export function MarketingStudio({ data, reload }) {
  const canvasRef = useRef(null);
  const [elements, setElements] = useState(data?.elements || []);
  const [designId, setDesignId] = useState(data?.designId || null);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadingImage, setUploadingImage] = useState(null);
  const [resizing, setResizing] = useState(null);
  const dragSnapshotRef = useRef(null);
  const elementsRef = useRef(elements);
  useEffect(() => { elementsRef.current = elements; }, [elements]);

  const selectedElement = elements.find((item) => item.id === selectedId) || null;

  // Initialize history from loaded data once
  const initialisedRef = useRef(false);
  useEffect(() => {
    if (data?.elements && !initialisedRef.current) {
      initialisedRef.current = true;
      const loaded = data.elements;
      setElements(loaded);
      setHistory([JSON.stringify(loaded)]);
      setHistoryIndex(0);
      if (data.designId) setDesignId(data.designId);
    }
  }, [data]);

  const pushHistory = useCallback((next) => {
    setHistory((current) => {
      const nextHistory = current.slice(0, historyIndex + 1);
      nextHistory.push(JSON.stringify(next));
      const trimmed = nextHistory.slice(-60);
      setHistoryIndex(trimmed.length - 1);
      return trimmed;
    });
  }, [historyIndex]);

  const commitTransaction = useCallback((snapshotBefore, elementsAfter) => {
    const before = JSON.parse(snapshotBefore);
    const after = elementsAfter;
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    pushHistory(after);
  }, [pushHistory]);

  const createElement = useCallback((kind) => {
    const base = { id: `element-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, type: kind, x: 80, y: 80, width: 220, height: 140, rotation: 0, locked: false, zIndex: 1, content: "", style: {} };
    if (kind === "text") return { ...base, content: "Double-click to edit", style: { fontFamily: "Helvetica", fontSize: 26, fontWeight: "700", color: "#17231f" } };
    if (kind === "image") return { ...base, width: 260, height: 180, mediaId: null, src: null };
    if (kind === "qr_code") return { ...base, width: 140, height: 140, payload: "/r/example-qr" };
    if (kind === "dynamic_field") return { ...base, width: 280, height: 120, listingId: null };
    return base;
  }, []);

  const addElement = useCallback((kind) => {
    const before = JSON.stringify(elements);
    const next = [...elements, createElement(kind)];
    setElements(next);
    commitTransaction(before, next);
    setSelectedId(next[next.length - 1].id);
  }, [createElement, elements, commitTransaction]);

  const updateElement = useCallback((id, patch) => {
    const before = JSON.stringify(elementsRef.current);
    const next = elements.map((item) => item.id === id ? { ...item, ...patch } : item);
    setElements(next);
    commitTransaction(before, next);
  }, [elements, commitTransaction]);

  const removeElement = useCallback((id) => {
    const before = JSON.stringify(elements);
    const next = elements.filter((item) => item.id !== id);
    setElements(next);
    setSelectedId(null);
    commitTransaction(before, next);
  }, [elements, commitTransaction]);

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

  function normalizeElements(elems) {
    return elems.map((element) => {
      if (!element || typeof element !== "object") return element;
      const normalized = { ...element };
      if ("kind" in normalized && !("type" in normalized)) normalized.type = normalized.kind;
      if (normalized.type === "qr") normalized.type = "qr_code";
      if (normalized.type === "property") normalized.type = "dynamic_field";
      if (normalized.type === "text" && "text" in normalized && !("content" in normalized)) {
        normalized.content = normalized.text;
        delete normalized.text;
      }
      if (normalized.type === "text" && "font" in normalized && "fontSize" in normalized && !("style" in normalized)) {
        normalized.style = {
          fontFamily: normalized.font || "Helvetica",
          fontSize: normalized.fontSize,
          fontWeight: String(normalized.font || "Helvetica").includes("Bold") ? "700" : "400",
          color: normalized.color || "#17231f",
        };
        delete normalized.font;
        delete normalized.fontSize;
        delete normalized.color;
      }
      if (normalized.type === "image" && "src" in normalized && !("mediaId" in normalized)) {
        normalized.mediaId = null;
      }
      delete normalized.kind;
      return normalized;
    });
  }

  async function saveDraft() {
    if (saving) return;
    setSaving(true);
    try {
      const normalizedElements = normalizeElements(elements);
      const body = { action: "save", elements: normalizedElements };
      if (designId) body.designId = designId;
      const response = await fetch("/api/workspace/marketing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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

  async function exportDesign(format) {
    if (exporting || !designId) {
      if (!designId) { setNotice("Save the design before exporting."); setTimeout(() => setNotice(""), 4000); }
      return;
    }
    setExporting(true);
    try {
      const response = await fetch("/api/workspace/marketing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "export", designId, format }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Export failed.");
      if (payload.downloadUrl) window.open(payload.downloadUrl, "_blank");
      else if (payload.exportId) setNotice("Export completed.");
      else setNotice("Export completed.");
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
      setElements((current) => current.map((item) => item.id === elementId ? { ...item, x: Math.max(0, Math.min(INITIAL_WIDTH - item.width, newX)), y: Math.max(0, Math.min(INITIAL_HEIGHT - item.height, newY)) } : item));
    }

    function onUp() {
      const snapshotAfter = JSON.stringify(elementsRef.current);
      if (snapshotBefore !== snapshotAfter) pushHistory(JSON.parse(snapshotAfter));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(elementId, handle, event) {
    if (event.button !== 0) return;
    const element = elements.find((e) => e.id === elementId);
    if (!element || element.locked) return;
    event.stopPropagation();
    event.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;
    const startW = element.width;
    const startH = element.height;
    const startElemX = element.x;
    const startElemY = element.y;
    const snapshotBefore = JSON.stringify(elementsRef.current);

    function onMove(e) {
      const dx = (e.clientX - rect.left - startX) / zoom;
      const dy = (e.clientY - rect.top - startY) / zoom;
      let newW = startW, newH = startH, newX = startElemX, newY = startElemY;

      if (handle.includes("e")) { newW = Math.max(MIN_ELEMENT_SIZE, startW + dx); }
      if (handle.includes("w")) { newW = Math.max(MIN_ELEMENT_SIZE, startW - dx); newX = startElemX + startW - newW; }
      if (handle.includes("s")) { newH = Math.max(MIN_ELEMENT_SIZE, startH + dy); }
      if (handle.includes("n")) { newH = Math.max(MIN_ELEMENT_SIZE, startH - dy); newY = startElemY + startH - newH; }

      newX = Math.max(0, Math.min(INITIAL_WIDTH - newW, newX));
      newY = Math.max(0, Math.min(INITIAL_HEIGHT - newH, newY));
      if (newW !== startW) newW = snap(newW);
      if (newH !== startH) newH = snap(newH);

      setElements((current) => current.map((item) => item.id === elementId ? { ...item, x: snap(newX), y: snap(newY), width: newW, height: newH } : item));
    }

    function onUp() {
      const snapshotAfter = JSON.stringify(elementsRef.current);
      if (snapshotBefore !== snapshotAfter) pushHistory(JSON.parse(snapshotAfter));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <div className="marketing-studio">
      {notice ? <div className="workspace-toast">{notice}</div> : null}
      <header className="studio-header"><div><h1>Marketing Studio</h1><p>Design marketing assets visually. Drag elements to position them, adjust properties in the sidebar.</p></div></header>
      <div className="studio-layout">
        <aside className="studio-sidebar">
          <div className="studio-tool-group">
            <button type="button" onClick={() => addElement("text")}><Type size={16} />Text</button>
            <button type="button" onClick={() => addElement("image")}><Maximize2 size={16} />Image</button>
            <button type="button" onClick={() => addElement("qr_code")}><Download size={16} />QR</button>
            <button type="button" onClick={() => addElement("dynamic_field")}>Property</button>
          </div>
          <div className="studio-history">
            <button type="button" onClick={handleUndo} disabled={historyIndex <= 0}><Undo size={16} />Undo</button>
            <button type="button" onClick={handleRedo} disabled={historyIndex >= history.length - 1}><Redo size={16} />Redo</button>
          </div>
          {selectedElement ? <div className="studio-selection">
            <h3>Selection</h3>
            <label>X<input type="number" value={selectedElement.x} onChange={(e) => updateElement(selectedElement.id, { x: snap(Number(e.target.value)) })} /></label>
            <label>Y<input type="number" value={selectedElement.y} onChange={(e) => updateElement(selectedElement.id, { y: snap(Number(e.target.value)) })} /></label>
            <label>Width<input type="number" value={selectedElement.width} onChange={(e) => updateElement(selectedElement.id, { width: snap(Number(e.target.value)) })} /></label>
            <label>Height<input type="number" value={selectedElement.height} onChange={(e) => updateElement(selectedElement.id, { height: snap(Number(e.target.value)) })} /></label>
            <label>Rotation<input type="number" value={selectedElement.rotation || 0} onChange={(e) => updateElement(selectedElement.id, { rotation: Number(e.target.value) })} /></label>
            {selectedElement.type === "text" ? <label className="form-wide">Text<textarea value={selectedElement.content || ""} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} rows={2} /></label> : null}
            {selectedElement.type === "image" && !selectedElement.src ? <label className="studio-upload"><Upload size={14} /><span>Upload image</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(selectedElement.id, file); }} /></label> : null}
            <button type="button" onClick={() => { const before = JSON.stringify(elements); updateElement(selectedElement.id, { locked: !selectedElement.locked }); commitTransaction(before, elements.map((el) => el.id === selectedElement.id ? { ...el, locked: !el.locked } : el)); }}>{selectedElement.locked ? <><Lock size={16} />Locked</> : <><Unlock size={16} />Unlocked</>}</button>
            <div className="studio-actions">
              <button type="button" onClick={() => { updateElement(selectedElement.id, { zIndex: (selectedElement.zIndex || 1) + 1 }); }}><ChevronUp size={16} />Bring forward</button>
              <button type="button" onClick={() => { updateElement(selectedElement.id, { zIndex: Math.max(0, (selectedElement.zIndex || 1) - 1) }); }}><ChevronDown size={16} />Send backward</button>
            </div>
            <button type="button" className="button--danger" onClick={() => removeElement(selectedElement.id)}><Trash2 size={16} />Delete</button>
          </div> : <p className="panel-empty">Select an element to edit its size, position and stacking order.</p>}
        </aside>
        <div className="studio-canvas-wrap">
          <div className="studio-zoom">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>-</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>+</button>
          </div>
          <div className="studio-canvas" onClick={() => setSelectedId(null)} style={{ transform: `scale(${zoom})` }} ref={canvasRef}>
            <div style={{ width: INITIAL_WIDTH, height: INITIAL_HEIGHT, background: "#ffffff", border: "1px solid #d6ded9", position: "relative", overflow: "hidden" }}>
              {elements.map((element) => {
                const isSelected = selectedId === element.id;
                const style = { position: "absolute", left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation || 0}deg)`, transformOrigin: "center center", border: isSelected ? "2px solid #173b31" : "1px solid transparent", boxShadow: element.locked ? "inset 0 0 0 2px rgba(23,59,49,.2)" : "none", background: "#ffffff", zIndex: element.zIndex || 1, cursor: element.locked ? "default" : "move" };
                return (
                  <div key={element.id} style={style} onPointerDown={(e) => { if (element.locked) return; e.stopPropagation(); setSelectedId(element.id); startDrag(element.id, e); }}>
                    {element.type === "text" ? <div style={{ padding: 8, fontFamily: element.style?.fontFamily || "Helvetica, Arial, sans-serif", fontSize: element.style?.fontSize || 26, fontWeight: Number(element.style?.fontWeight) || 400, color: element.style?.color || "#17231f", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{element.content || "Text"}</div> : null}
                    {element.type === "image" ? <div style={{ width: "100%", height: "100%", position: "relative" }}>{element.src ? <img alt="design element" src={element.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ background: "#eef3f1", color: "#5f6965", display: "grid", placeItems: "center", height: "100%", fontSize: 12 }}>Image{uploadingImage === element.id ? " (uploading...)" : ""}</div>}</div> : null}
                    {element.type === "qr_code" ? <div style={{ background: "#eef3f1", height: "100%", display: "grid", placeItems: "center", fontFamily: "monospace", fontSize: 10 }}>QR</div> : null}
                    {element.type === "dynamic_field" ? <div style={{ background: "#fffdf9", border: "1px solid #d6ded9", padding: 12, fontSize: 12 }}>Property card</div> : null}
                    {isSelected && !element.locked ? RESIZE_HANDLES.map((handle) => {
                      const hStyle = {
                        position: "absolute",
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        background: "#173b31",
                        border: "1px solid #fff",
                        zIndex: 10,
                        cursor: `${handle}-resize`,
                      };
                      if (handle.includes("n")) hStyle.top = -HANDLE_SIZE / 2;
                      if (handle.includes("s")) hStyle.bottom = -HANDLE_SIZE / 2;
                      if (handle.includes("w")) hStyle.left = -HANDLE_SIZE / 2;
                      if (handle.includes("e")) hStyle.right = -HANDLE_SIZE / 2;
                      if (handle === "n" || handle === "s") { hStyle.left = "50%"; hStyle.marginLeft = -HANDLE_SIZE / 2; }
                      if (handle === "e" || handle === "w") { hStyle.top = "50%"; hStyle.marginTop = -HANDLE_SIZE / 2; }
                      return <div key={handle} style={hStyle} onPointerDown={(e) => startResize(element.id, handle, e)} />;
                    }) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="studio-footer">
        <button type="button" onClick={saveDraft} disabled={saving}><Save size={16} />{saving ? "Saving..." : "Save draft"}</button>
        <button type="button" onClick={() => exportDesign("pdf")} disabled={exporting || !designId}><Download size={16} />{exporting ? "Exporting..." : "Export PDF"}</button>
        <button type="button" onClick={() => exportDesign("png")} disabled={exporting || !designId}><Download size={16} />PNG</button>
        <button type="button" onClick={() => exportDesign("jpeg")} disabled={exporting || !designId}><Download size={16} />JPEG</button>
      </div>
    </div>
  );
}

function snap(value) {
  return Math.round(value / SNAP) * SNAP;
}