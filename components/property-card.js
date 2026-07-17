"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Bath, BedDouble, Heart, MapPin } from "lucide-react";
import { useNestora } from "@/components/providers";
import { priceLabel } from "@/lib/platform";

export function PropertyCard({ property, priority = false, horizontal = false, headingLevel = 3 }) {
  const { saved, toggleSaved } = useNestora();
  const isSaved = saved.includes(property.id);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className={`property-card ${horizontal ? "property-card--horizontal" : ""}`}>
      <div className="property-card__media">
        <Link href={`/properties/${property.id}`} aria-label={`View ${property.title}`}><Image src={property.image} alt={`${property.title} in ${property.area}`} fill sizes={horizontal ? "(max-width: 700px) 100vw, 320px" : "(max-width: 700px) 88vw, (max-width: 1100px) 42vw, 25vw"} priority={priority} /></Link>
        {property.tag ? <span className="media-label">{property.tag}</span> : null}
        <button type="button" className={`save-button ${isSaved ? "active" : ""}`} onClick={() => toggleSaved(property.id)} aria-label={isSaved ? `Remove ${property.title} from saved` : `Save ${property.title}`} aria-pressed={isSaved}><Heart size={19} fill={isSaved ? "currentColor" : "none"} /></button>
      </div>
      <div className="property-card__body">
        <div className="card-meta"><span><MapPin size={14} />{property.location}</span>{property.verified ? <span><BadgeCheck size={14} />Verified</span> : null}</div>
        <Heading><Link href={`/properties/${property.id}`}>{property.title}</Link></Heading>
        {(property.beds != null || property.baths != null) ? <p className="property-facts">{property.beds != null ? <span><BedDouble size={16} />{property.beds} beds</span> : null}{property.baths != null ? <span><Bath size={16} />{property.baths} baths</span> : null}</p> : null}
        <div className="property-card__price"><strong>{priceLabel(property)}</strong>{property.verified ? <span><BadgeCheck size={15} /> Verified</span> : null}</div>
        <p className="freshness">{property.fresh}</p>
      </div>
    </article>
  );
}
