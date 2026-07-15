"use client";

import { CalendarDays, ChevronDown, MapPin, Search, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { modes } from "@/lib/platform";

export function SearchBar({ initialMode = "stay", compact = false }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState("");
  const [guests, setGuests] = useState("2");

  function submit(event) {
    event.preventDefault();
    const params = new URLSearchParams({ mode });
    if (query.trim()) params.set("q", query.trim());
    if (mode === "stay") params.set("guests", guests);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className={`unified-search ${compact ? "unified-search--compact" : ""}`}>
      <div className="search-tabs" role="tablist" aria-label="Search category">
        {modes.map((item) => <button key={item.value} type="button" role="tab" aria-selected={mode === item.value} className={mode === item.value ? "active" : ""} onClick={() => setMode(item.value)}>{item.label}</button>)}
      </div>
      <form onSubmit={submit} className="search-fields">
        <label className="search-field search-field--where">
          <MapPin size={19} aria-hidden="true" />
          <span><small>Where</small><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Area, landmark or property" aria-label="Destination or area" /></span>
        </label>
        {mode === "stay" ? (
          <>
            <label className="search-field hide-small"><CalendarDays size={19} aria-hidden="true" /><span><small>When</small><input type="date" aria-label="Check-in date" /></span></label>
            <label className="search-field hide-small"><UsersRound size={19} aria-hidden="true" /><span><small>Guests</small><select value={guests} onChange={(event) => setGuests(event.target.value)} aria-label="Number of guests"><option value="1">1 guest</option><option value="2">2 guests</option><option value="4">4 guests</option><option value="6">6+ guests</option></select></span><ChevronDown size={15} /></label>
          </>
        ) : (
          <label className="search-field hide-small"><span><small>Budget</small><select aria-label="Maximum budget"><option value="">Any budget</option><option>Up to ₦10m</option><option>Up to ₦100m</option><option>Up to ₦300m</option></select></span><ChevronDown size={15} /></label>
        )}
        <button className="search-submit" type="submit" aria-label="Search Nestora"><Search size={20} /><span>Search</span></button>
      </form>
    </div>
  );
}
