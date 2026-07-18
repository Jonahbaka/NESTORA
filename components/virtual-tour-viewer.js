"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarCheck2, Expand, HelpCircle, MessageCircle, Pause, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PropertySaveButton } from "@/components/property-save-button";

export function VirtualTourViewer({ property, items, preview }) {
  const [activeId, setActiveId] = useState(items[0]?.id || null);
  const [help, setHelp] = useState(true);
  const [playing, setPlaying] = useState(true);
  const stageRef = useRef(null);
  const active = items.find((item) => item.id === activeId) || items[0];
  const panorama = active?.media_role === "panorama";

  const fullscreen = useCallback(() => {
    if (!document.fullscreenElement) stageRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  return <main className="tour-experience"><section className="tour-stage" ref={stageRef}>{panorama ? <PanoramaCanvas item={active} playing={playing} /> : <div className="tour-video-stage"><video key={active?.id} controls autoPlay playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}><source src={active?.url} type={active?.mime_type} /></video></div>}<div className="tour-vignette" /><header className="tour-topbar"><Link className="tour-icon" href={`/properties/${property.id}${preview ? "?preview=1" : ""}`} aria-label="Back to property"><ArrowLeft size={19} /></Link><div><h1>{property.title}</h1><span>{active?.scene_label || (panorama ? "360 scene" : "Video walkthrough")} | {property.location}</span></div><div className="tour-topbar__actions"><button className="tour-icon" type="button" onClick={() => setHelp(true)} aria-label="Tour controls"><HelpCircle size={18} /></button><button className="tour-icon" type="button" onClick={fullscreen} aria-label="Toggle fullscreen"><Expand size={18} /></button></div></header>{help ? <div className="tour-help"><RotateCcw size={19} /><span>{panorama ? "Drag or swipe to look around. Use the scene strip to move between rooms." : "Use the video controls or choose a 360 room scene below."}</span><button type="button" onClick={() => setHelp(false)}>Got it</button></div> : null}<div className="tour-bottom"><div className="tour-scenes" aria-label="Tour scenes">{items.map((item, index) => { const thumbnail = item.media_role === "panorama" ? item.url : property.image; return <button type="button" className={item.id === active?.id ? "active" : ""} onClick={() => { setActiveId(item.id); setHelp(false); }} aria-label={`Open ${item.scene_label || "walkthrough"}`} key={item.id}>{thumbnail ? <Image src={thumbnail} alt="" fill unoptimized sizes="72px" /> : <Play size={18} />}<span>{index + 1}</span></button>; })}</div></div><button className="tour-rotate" type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={16} /> : <Play size={16} />}{panorama ? playing ? "Pause motion" : "Resume motion" : playing ? "Playing" : "Paused"}</button><div className="tour-actions"><PropertySaveButton propertyId={property.id} title={property.title} /><Link href={`/messages?to=${property.hostId}&property=${property.id}`}><MessageCircle size={17} />Enquire</Link><Link href={`/properties/${property.id}#inquiry`}><CalendarCheck2 size={17} />Inspection</Link></div><p className="tour-disclaimer"><ShieldCheck size={14} />Media supplied by the listing professional. Confirm dimensions and condition in person.</p></section></main>;
}

function PanoramaCanvas({ item, playing }) {
  const mountRef = useRef(null);
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !item?.url) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x18231f });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    let disposed = false;
    new THREE.TextureLoader().load(item.url, (texture) => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
    });
    let longitude = 0;
    let latitude = 0;
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let startLongitude = 0;
    let startLatitude = 0;
    function resize() { const width = mount.clientWidth || 1; const height = mount.clientHeight || 1; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); }
    function pointerDown(event) { dragging = true; pointerX = event.clientX; pointerY = event.clientY; startLongitude = longitude; startLatitude = latitude; renderer.domElement.setPointerCapture?.(event.pointerId); }
    function pointerMove(event) { if (!dragging) return; longitude = startLongitude + (pointerX - event.clientX) * .12; latitude = startLatitude + (event.clientY - pointerY) * .1; }
    function pointerUp() { dragging = false; }
    function wheel(event) { event.preventDefault(); camera.fov = THREE.MathUtils.clamp(camera.fov + event.deltaY * .025, 45, 90); camera.updateProjectionMatrix(); }
    function keydown(event) { if (event.key === "ArrowLeft") longitude -= 4; if (event.key === "ArrowRight") longitude += 4; if (event.key === "ArrowUp") latitude -= 3; if (event.key === "ArrowDown") latitude += 3; }
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", pointerUp);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", keydown);
    resize();
    let frame;
    function render() {
      if (!dragging && playingRef.current) longitude += .015;
      latitude = Math.max(-80, Math.min(80, latitude));
      const phi = THREE.MathUtils.degToRad(90 - latitude);
      const theta = THREE.MathUtils.degToRad(longitude);
      camera.lookAt(500 * Math.sin(phi) * Math.cos(theta), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    }
    render();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", keydown);
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [item?.url]);

  return <div className="tour-canvas" ref={mountRef} role="application" aria-label={`Interactive 360 view of ${item?.scene_label || "property scene"}`} tabIndex={0} />;
}
