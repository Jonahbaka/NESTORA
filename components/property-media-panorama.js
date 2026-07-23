"use client";

import Image from "next/image";
import { Expand, Move3d, RotateCcw, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const scenes = [
  {
    id: "courtyard",
    name: "Arrival courtyard",
    src: "/images/property-media/katampe-courtyard-360.webp",
    fallback: "/images/property-media/katampe-courtyard-360.webp",
    description: "A landscaped arrival court connecting the development entrance, residential blocks, pool and pedestrian paths.",
    hotspots: ["Main entrance", "Landscaped pool", "Residences"],
  },
  {
    id: "living",
    name: "Main living room",
    src: "/images/property-media/katampe-living-360.webp",
    fallback: "/images/property-media/katampe-living-360.webp",
    description: "A warm living room with connected dining space, broad windows, balcony access and views toward the Abuja hills.",
    hotspots: ["Balcony view", "Dining room", "Bedroom hallway"],
  },
];

export function PropertyMediaPanorama({ compact = false }) {
  const [started, setStarted] = useState(false);
  const [activeId, setActiveId] = useState(scenes[0].id);
  const [help, setHelp] = useState(true);
  const [webglError, setWebglError] = useState(false);
  const [motion, setMotion] = useState(false);
  const stageRef = useRef(null);
  const active = scenes.find((scene) => scene.id === activeId) || scenes[0];
  const handleWebglError = useCallback(() => setWebglError(true), []);

  const fullscreen = useCallback(async () => {
    if (!document.fullscreenElement) await stageRef.current?.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }, []);

  async function enableMotion() {
    const permission = typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"
      ? await DeviceOrientationEvent.requestPermission().catch(() => "denied")
      : "granted";
    if (permission === "granted") setMotion(true);
  }

  return (
    <div className={`media-tour ${compact ? "media-tour--compact" : ""}`} ref={stageRef}>
      {!started || webglError ? (
        <div className="media-tour__poster">
          <Image src={active.fallback} alt={active.description} fill sizes="(max-width: 800px) 100vw, 70vw" />
          <span className="media-tour__veil" />
          <div>
            <p>Interactive 360° demonstration</p>
            <h3>Katampe Court Residences</h3>
            <span>{webglError ? "Your browser is showing the accessible panorama fallback." : "Load the full tour only when you are ready."}</span>
            {!webglError ? <button type="button" onClick={() => setStarted(true)}><Move3d size={18} />Explore the 360° tour</button> : null}
          </div>
        </div>
      ) : (
        <>
          <PanoramaStage scene={active} motion={motion} onError={handleWebglError} />
          <span className="media-tour__veil" />
          <div className="media-tour__topbar">
            <div><p>Katampe Court Residences — demonstration</p><strong>{active.name}</strong></div>
            <div>
              <button type="button" onClick={enableMotion} aria-pressed={motion} aria-label="Enable mobile motion control"><Smartphone size={18} /></button>
              <button type="button" onClick={() => setHelp(true)} aria-label="Show 360 tour controls"><RotateCcw size={18} /></button>
              <button type="button" onClick={fullscreen} aria-label="Toggle fullscreen"><Expand size={18} /></button>
            </div>
          </div>
          <div className="media-tour__hotspots" aria-label="Scene highlights">{active.hotspots.map((item, index) => <span style={{ "--hotspot-index": index }} key={item}>{item}</span>)}</div>
          <div className="media-tour__scenes" aria-label="Tour scenes">{scenes.map((scene) => <button type="button" className={scene.id === active.id ? "active" : ""} onClick={() => setActiveId(scene.id)} key={scene.id}><Image src={scene.fallback} alt="" width={80} height={44} /><span>{scene.name}</span></button>)}</div>
          {help ? <div className="media-tour__help" role="dialog" aria-modal="false" aria-label="360 tour controls"><button type="button" onClick={() => setHelp(false)} aria-label="Close tour instructions"><X size={18} /></button><RotateCcw size={23} /><strong>Look around naturally</strong><p>Drag, swipe, use arrow keys or enable mobile motion. Choose another scene below and use fullscreen for an immersive view.</p></div> : null}
        </>
      )}
      <p className="sr-only" aria-live="polite">{active.name}: {active.description}</p>
    </div>
  );
}

function PanoramaStage({ scene: activeScene, motion, onError }) {
  const mountRef = useRef(null);
  const motionRef = useRef(motion);
  useEffect(() => { motionRef.current = motion; }, [motion]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("aria-label", `Interactive 360 view of ${activeScene.name}`);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1100);
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x203029 });
    scene.add(new THREE.Mesh(geometry, material));
    let disposed = false;
    new THREE.TextureLoader().load(activeScene.src, (texture) => {
      if (disposed) return texture.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
    }, undefined, onError);

    let longitude = 0;
    let latitude = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLongitude = 0;
    let startLatitude = 0;
    function resize() {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }
    function pointerDown(event) {
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startLongitude = longitude;
      startLatitude = latitude;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    }
    function pointerMove(event) {
      if (!dragging) return;
      longitude = startLongitude + (startX - event.clientX) * 0.12;
      latitude = startLatitude + (event.clientY - startY) * 0.1;
    }
    function pointerUp() { dragging = false; }
    function keyDown(event) {
      if (event.key === "ArrowLeft") longitude -= 5;
      if (event.key === "ArrowRight") longitude += 5;
      if (event.key === "ArrowUp") latitude -= 4;
      if (event.key === "ArrowDown") latitude += 4;
    }
    function orientation(event) {
      if (!motionRef.current || event.alpha == null || event.beta == null) return;
      longitude = event.alpha;
      latitude = THREE.MathUtils.clamp(event.beta - 45, -70, 70);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", pointerUp);
    renderer.domElement.addEventListener("keydown", keyDown);
    window.addEventListener("deviceorientation", orientation);
    resize();
    let frame;
    function render() {
      latitude = THREE.MathUtils.clamp(latitude, -80, 80);
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
      window.removeEventListener("deviceorientation", orientation);
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [activeScene, onError]);

  return <div className="media-tour__canvas" ref={mountRef} />;
}
