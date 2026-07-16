"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Info, Maximize, MousePointer2, Pause, Play, Rotate3D, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const sceneNames = ["Living space", "Private suite", "Outdoor view", "Neighbourhood"];

export function ImmersiveTour({ property }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const autoRotateRef = useRef(true);
  const [scene, setScene] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [ambient, setAmbient] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [help, setHelp] = useState(true);

  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  useEffect(() => {
    const saveData = navigator.connection?.saveData;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (saveData) {
      setFallback(true);
      setLoading(false);
      return undefined;
    }
    let disposed = false;
    let cleanup = () => {};
    import("three").then((THREE) => {
      if (disposed || !mountRef.current) return;
      const mount = mountRef.current;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-label", `Interactive 360-degree view of ${property.title}`);
      mount.appendChild(renderer.domElement);
      const world = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 1000);
      camera.position.set(0, 0, 0.1);
      const geometry = new THREE.SphereGeometry(8, 64, 40);
      geometry.scale(-1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sphere = new THREE.Mesh(geometry, material);
      world.add(sphere);

      let lon = 0;
      let lat = 0;
      let dragging = false;
      let previousX = 0;
      let previousY = 0;
      let raf = 0;

      function loadTexture(index) {
        setLoading(true);
        new THREE.TextureLoader().load(property.gallery[index], (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          if (material.map) material.map.dispose();
          material.map = texture;
          material.needsUpdate = true;
          setLoading(false);
        }, undefined, () => {
          setFallback(true);
          setLoading(false);
        });
      }
      sceneRef.current = loadTexture;
      loadTexture(0);

      const onDown = (event) => { dragging = true; previousX = event.clientX; previousY = event.clientY; renderer.domElement.setPointerCapture?.(event.pointerId); setHelp(false); };
      const onMove = (event) => { if (!dragging) return; lon -= (event.clientX - previousX) * 0.14; lat += (event.clientY - previousY) * 0.11; previousX = event.clientX; previousY = event.clientY; };
      const onUp = () => { dragging = false; };
      const onWheel = (event) => { camera.fov = Math.max(45, Math.min(86, camera.fov + event.deltaY * 0.025)); camera.updateProjectionMatrix(); };
      const onResize = () => { if (!mount.clientWidth || !mount.clientHeight) return; camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("pointerup", onUp);
      renderer.domElement.addEventListener("pointercancel", onUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
      window.addEventListener("resize", onResize);

      function render() {
        if (autoRotateRef.current && !dragging && !reduced) lon += 0.025;
        lat = Math.max(-52, Math.min(52, lat));
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);
        camera.lookAt(8 * Math.sin(phi) * Math.cos(theta), 8 * Math.cos(phi), 8 * Math.sin(phi) * Math.sin(theta));
        renderer.render(world, camera);
        raf = requestAnimationFrame(render);
      }
      render();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerup", onUp);
        renderer.dispose();
        geometry.dispose();
        material.map?.dispose();
        material.dispose();
        renderer.domElement.remove();
      };
    }).catch(() => { setFallback(true); setLoading(false); });
    return () => { disposed = true; cleanup(); };
  }, [property.gallery, property.title]);

  function changeScene(next) {
    const normalized = (next + property.gallery.length) % property.gallery.length;
    setScene(normalized);
    sceneRef.current?.(normalized);
  }

  function fullscreen() { mountRef.current?.parentElement?.requestFullscreen?.(); }

  return (
    <section className="tour-experience">
      <div className="tour-stage">
        {fallback ? <Image src={property.gallery[scene]} alt={`${property.title}, ${sceneNames[scene] || "property view"}`} fill priority sizes="100vw" className="tour-fallback" /> : <div className="tour-canvas" ref={mountRef} />}
        <div className="tour-vignette" />
        {loading ? <div className="tour-loading" role="status"><span /><p>Preparing {sceneNames[scene]}</p></div> : null}
        <div className="tour-topbar">
          <Link href={`/properties/${property.id}`} className="tour-icon" aria-label="Back to property"><ArrowLeft size={20} /></Link>
          <div><h1>{property.title}</h1><span>{sceneNames[scene]} / {scene + 1} of {property.gallery.length}</span></div>
          <div className="tour-topbar__actions"><button type="button" className="tour-icon" onClick={() => setAmbient((value) => !value)} aria-label={ambient ? "Mute ambient sound" : "Turn on ambient sound"}>{ambient ? <Volume2 size={19} /> : <VolumeX size={19} />}</button><button type="button" className="tour-icon" onClick={fullscreen} aria-label="Enter fullscreen"><Maximize size={19} /></button></div>
        </div>

        {!fallback ? <button type="button" className="tour-hotspot tour-hotspot--one" onClick={() => changeScene(scene + 1)}><span>+</span><b>Continue to {sceneNames[(scene + 1) % property.gallery.length]}</b></button> : null}
        {help && !fallback ? <div className="tour-help"><MousePointer2 size={18} /><span>Drag to look around. Scroll or pinch to zoom.</span><button type="button" onClick={() => setHelp(false)}>Got it</button></div> : null}

        <div className="tour-bottom">
          <button type="button" className="tour-icon" onClick={() => changeScene(scene - 1)} aria-label="Previous scene"><ChevronLeft size={20} /></button>
          <div className="tour-scenes">{property.gallery.map((image, index) => <button type="button" key={image} className={scene === index ? "active" : ""} onClick={() => changeScene(index)} aria-label={`Open ${sceneNames[index]}`}><Image src={image} alt="" fill sizes="72px" /><span>{index + 1}</span></button>)}</div>
          <button type="button" className="tour-icon" onClick={() => changeScene(scene + 1)} aria-label="Next scene"><ChevronRight size={20} /></button>
        </div>
        <button type="button" className="tour-rotate" onClick={() => setAutoRotate((value) => !value)} aria-pressed={autoRotate}>{autoRotate ? <Pause size={16} /> : <Play size={16} />}{autoRotate ? "Pause rotation" : "Resume rotation"}</button>
        <div className="tour-disclaimer"><Info size={13} /> Illustrative tour imagery helps you orient yourself; dimensions should be independently verified.</div>
      </div>
    </section>
  );
}
