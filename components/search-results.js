"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, ListFilter, LoaderCircle, Map, MapPin, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PropertyCard } from "@/components/property-card";
import { SearchBar } from "@/components/search-bar";
import { filterProperties, formatNaira, modes } from "@/lib/platform";

export function SearchResults() {
  const params = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [mode, setMode] = useState(params.get("mode") || "stay");
  const [area, setArea] = useState(params.get("area") || "All Abuja");
  const [beds, setBeds] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [sort, setSort] = useState("recent");
  const [mapOpen, setMapOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeMarker, setActiveMarker] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/listings", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Current listings are unavailable.");
        setProperties(payload.listings || []);
        setLoadState("ready");
      })
      .catch((error) => { if (error.name !== "AbortError") setLoadState("error"); });
    return () => controller.abort();
  }, []);

  const areaOptions = useMemo(() => ["All Abuja", ...new Set(properties.map((item) => item.area).filter(Boolean))], [properties]);
  const results = useMemo(() => {
    const filtered = filterProperties(properties, { mode, area: area === "All Abuja" ? "" : area, query: params.get("q") || "", maxPrice: maxPrice || "", beds: beds || "" });
    if (sort === "price-low") return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === "price-high") return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [area, beds, maxPrice, mode, params, properties, sort]);

  return (
    <div className="search-page">
      <div className="search-page__bar shell"><SearchBar initialMode={mode} compact /></div>
      <div className="search-controls shell">
        <div className="mode-chips" aria-label="Property category">{modes.map((item) => <button type="button" className={mode === item.value ? "active" : ""} onClick={() => setMode(item.value)} key={item.value}>{mode === item.value ? <Check size={14} /> : null}{item.label}</button>)}</div>
        <div className="filter-actions">
          <button type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> Filters{beds || maxPrice || area !== "All Abuja" ? <b>•</b> : null}</button>
          <button type="button" onClick={() => setMapOpen((value) => !value)}>{mapOpen ? <ListFilter size={16} /> : <Map size={16} />}{mapOpen ? "List only" : "Show map"}</button>
        </div>
      </div>

      <div className={`search-layout ${mapOpen ? "search-layout--map" : ""}`}>
        <section className="search-results" aria-labelledby="results-heading">
          <div className="results-header">
            <div><p className="eyebrow">{area === "All Abuja" ? "Abuja" : area}</p><h1 id="results-heading">{results.length} {mode === "stay" ? "places to stay" : mode === "new" ? "new homes" : mode === "buy" ? "homes to buy" : "homes to rent"}</h1><span>Only active listings reviewed for publication are shown.</span></div>
            <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Most recent</option><option value="price-low">Lowest price</option><option value="price-high">Highest price</option></select><ChevronDown size={14} /></label>
          </div>
          {loadState === "loading" ? <div className="empty-state"><LoaderCircle className="spin" size={28} /><h2>Loading current listings</h2></div> : null}
          {loadState === "error" ? <div className="empty-state"><MapPin size={28} /><h2>Listings are temporarily unavailable</h2><p>Please try again shortly.</p></div> : null}
          {loadState === "ready" && results.length ? <div className="results-list">{results.map((property, index) => <PropertyCard key={property.id} property={property} horizontal={mapOpen} priority={index === 0} headingLevel={2} />)}</div> : null}
          {loadState === "ready" && !results.length ? <div className="empty-state"><MapPin size={28} /><h2>No current matches</h2><p>Try a nearby area or remove one of your filters.</p><button className="button button--ink" type="button" onClick={() => { setArea("All Abuja"); setBeds(0); setMaxPrice(0); }}>Clear filters</button></div> : null}
        </section>

        {mapOpen ? <aside className="result-map" aria-label="Approximate listing areas"><div className="map-surface"><span className="map-road map-road--one" /><span className="map-road map-road--two" /><span className="map-road map-road--three" /><span className="map-water" /><div className="map-label map-label--jabi">Jabi Lake</div><div className="map-label map-label--central">Central Abuja</div><div className="map-label map-label--aso">Aso Rock</div>{results.map((property, index) => <button type="button" key={property.id} className={`map-price ${activeMarker === property.id ? "active" : ""}`} style={{ left: `${18 + ((index * 21) % 63)}%`, top: `${18 + ((index * 17) % 57)}%` }} onClick={() => setActiveMarker(property.id)} aria-label={`${property.title}, ${formatNaira(property.price, true)}`}>{formatNaira(property.price, true)}</button>)}{activeMarker ? (() => { const property = results.find((item) => item.id === activeMarker); return property ? <Link className="map-preview" href={`/properties/${property.id}`}><Image src={property.image} alt="" width={92} height={62} /><span><strong>{property.title}</strong><small>{property.location}</small></span></Link> : null; })() : null}<span className="map-attribution">Map view · Approximate areas</span></div></aside> : null}
      </div>

      {filtersOpen ? <div className="drawer-backdrop" role="presentation" onMouseDown={() => setFiltersOpen(false)}><aside className="filter-drawer" role="dialog" aria-modal="true" aria-labelledby="filters-title" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-header"><h2 id="filters-title">Refine places</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={20} /></button></div><div className="filter-group"><label htmlFor="area-filter">Area</label><select id="area-filter" value={area} onChange={(event) => setArea(event.target.value)}>{areaOptions.map((item) => <option key={item}>{item}</option>)}</select></div><div className="filter-group"><span>Bedrooms</span><div className="step-options">{[0,1,2,3,4].map((value) => <button type="button" className={beds === value ? "active" : ""} onClick={() => setBeds(value)} key={value}>{value === 0 ? "Any" : `${value}+`}</button>)}</div></div><div className="filter-group"><label htmlFor="price-filter">Maximum price</label><select id="price-filter" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))}><option value="0">Any price</option><option value="500000">₦500k</option><option value="10000000">₦10m</option><option value="100000000">₦100m</option><option value="300000000">₦300m</option><option value="700000000">₦700m</option></select></div><div className="drawer-footer"><button type="button" className="button button--outline" onClick={() => { setArea("All Abuja"); setBeds(0); setMaxPrice(0); }}>Reset</button><button type="button" className="button button--coral" onClick={() => setFiltersOpen(false)}>Show {results.length} places</button></div></aside></div> : null}
    </div>
  );
}
