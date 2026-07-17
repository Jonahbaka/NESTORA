"use client";

import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PropertyCard } from "@/components/property-card";
import { useNestora } from "@/components/providers";

export function SavedPlaces() {
  const { saved, hydrated, notify } = useNestora();
  const [listings, setListings] = useState([]);
  useEffect(() => { fetch("/api/listings", { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setListings(payload.listings || []); }).catch((error) => notify(error.message)); }, [notify]);
  const items = listings.filter((property) => saved.includes(property.id));
  const unavailable = Math.max(0, saved.length - items.length);
  return <div className="account-page"><header className="account-hero shell"><p className="eyebrow">Your shortlist</p><h1>Saved places</h1><p>Keep the homes and stays you want to compare close at hand.</p></header><section className="section shell saved-content">{!hydrated ? <div className="empty-state">Loading your shortlist...</div> : items.length ? <><div className="saved-toolbar"><span>{items.length} current saved {items.length === 1 ? "place" : "places"}{unavailable ? ` · ${unavailable} no longer public` : ""}</span><Link href="/search"><Search size={16} />Keep exploring</Link></div><div className="property-grid">{items.map((property) => <PropertyCard key={property.id} property={property} />)}</div></> : <div className="empty-state empty-state--saved"><span><Heart size={28} /></span><h2>Your shortlist is ready when you are</h2><p>{unavailable ? "Your previously saved places are no longer public. Explore current verified inventory to build a new shortlist." : "Select the heart on any property to keep it here for easy comparison."}</p><Link href="/search" className="button button--coral">Explore current places</Link></div>}</section></div>;
}
