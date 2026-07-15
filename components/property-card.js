"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, BedDouble, Heart, MapPin, Star } from "lucide-react";
import { useNestora } from "@/components/providers";
import { priceLabel } from "@/lib/platform";

export function PropertyCard({ property, priority = false, horizontal = false }) {
  const { saved, toggleSaved } = useNestora();
  const isSaved = saved.includes(property.id);
  return (
    <article className={`property-card ${horizontal ? "property-card--horizontal" : ""}`}>
      <div className="property-card__media">
        <Link href={`/properties/${property.id}`} aria-label={`View ${property.title}`}><Image src={property.image} alt={`${property.title} in ${property.area}`} fill sizes={horizontal ? "(max-width: 700px) 100vw, 320px" : "(max-width: 700px) 88vw, (max-width: 1100px) 42vw, 25vw"} priority={priority} /></Link>
        <span className="media-label">{property.tag}</span>
        <button type="button" className={`save-button ${isSaved ? "active" : ""}`} onClick={() => toggleSaved(property.id)} aria-label={isSaved ? `Remove ${property.title} from saved` : `Save ${property.title}`} aria-pressed={isSaved}><Heart size={19} fill={isSaved ? "currentColor" : "none"} /></button>
      </div>
      <div className="property-card__body">
        <div className="card-meta"><span><MapPin size={14} />{property.location}</span><span><Star size={14} fill="currentColor" />{property.rating} <em>({property.reviews})</em></span></div>
        <h3><Link href={`/properties/${property.id}`}>{property.title}</Link></h3>
        <p className="property-facts"><span><BedDouble size={16} />{property.beds} beds</span><span>{property.baths} baths</span><span>{property.sqm} m²</span></p>
        <div className="property-card__price"><strong>{priceLabel(property)}</strong>{property.illustrative ? <span>Illustrative</span> : property.verified ? <span><BadgeCheck size={15} /> Verified</span> : null}</div>
        <p className="freshness">{property.illustrative ? "Catalogue presentation" : property.fresh}</p>
      </div>
    </article>
  );
}
