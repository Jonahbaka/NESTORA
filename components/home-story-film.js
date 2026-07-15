"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function HomeStoryFilm() {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame) return undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !reduceMotion) {
        video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else if (!video.paused) {
        video.pause();
        setPlaying(false);
      }
    }, { threshold: 0.12 });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().then(() => setPlaying(true));
    else {
      video.pause();
      setPlaying(false);
    }
  }

  function toggleMuted() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <section className="story-film" aria-labelledby="story-film-title">
      <div className="shell story-film__heading">
        <p className="eyebrow">A place becomes a feeling</p>
        <h2 id="story-film-title">From first look to first night home.</h2>
        <p>Nestora keeps discovery, expert guidance, viewing and handover in one considered journey.</p>
      </div>
      <div className="story-film__frame" ref={frameRef}>
        <video
          ref={videoRef}
          src="/media/nestora-home-story.mp4"
          poster="/media/nestora-home-storyboard.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => setProgress(event.currentTarget.duration ? (event.currentTarget.currentTime / event.currentTarget.duration) * 100 : 0)}
          aria-label="A couple discovers, tours and moves into a Nestora home"
        />
        <div className="story-film__shade" />
        <div className="story-film__label"><span>Life, found on Nestora</span><strong>Abuja, Nigeria</strong></div>
        <div className="story-film__controlbar">
          <div>
            <strong>Find it. See it. Live it.</strong>
            <span>One connected property journey</span>
          </div>
          <div className="story-film__controls">
            <button type="button" onClick={togglePlayback} aria-label={playing ? "Pause film" : "Play film"}>{playing ? <Pause size={19} /> : <Play size={19} />}</button>
            <button type="button" onClick={toggleMuted} aria-label={muted ? "Turn film sound on" : "Mute film"}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
          </div>
        </div>
        <div className="story-film__progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="shell story-steps" aria-label="Nestora property journey">
        <span><b>01</b> Discover</span><span><b>02</b> Compare</span><span><b>03</b> Tour</span><span><b>04</b> Move in</span><span><b>05</b> Belong</span>
      </div>
    </section>
  );
}
