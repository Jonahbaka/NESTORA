import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, Globe2, Languages, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { hasDatabase, query } from "@/lib/server/db";
import { allowDemoContent } from "@/lib/server/demo-environment";
import { formatNaira } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const profile = await findProfile((await params).id);
  if (!profile) return { title: "Professional profile" };
  return { title: profile.name, description: profile.headline };
}

export default async function ProfilePage({ params }) {
  const profile = await findProfile((await params).id);
  if (!profile) notFound();
  const listings = await findListings(profile.user_id, profile.is_demo);
  return <main className="professional-public-page"><section className="professional-public-hero"><div className="container professional-public-hero__inner"><div className="professional-public-avatar">{profile.image_media_id ? <Image src={`/api/profile-media/${profile.image_media_id}`} alt={profile.name} width={260} height={300} unoptimized priority /> : <span>{initials(profile.name)}</span>}</div><div className="professional-public-identity"><p className="eyebrow">{profile.is_demo ? "Demonstration profile" : "Nestora professional"}</p><h1>{profile.name}</h1><strong>{profile.headline}</strong><p>{profile.biography}</p><div className="professional-public-tags"><span><MapPin size={15} />{profile.service_areas.length ? profile.service_areas.join(" · ") : "Service area available on request"}</span>{profile.organization_name ? <span><Building2 size={15} />{profile.organization_name}</span> : null}<span><ShieldCheck size={15} />{humanize(profile.verification_status)}</span></div></div><div className="professional-public-actions"><a className="button button--coral" href="#listings">View listings</a><Link className="button button--outline" href="/trust">Trust centre</Link></div></div></section><section className="container professional-public-details"><div><p className="eyebrow">Coverage and expertise</p><h2>Professional focus</h2><div className="professional-focus-grid"><article><Globe2 size={20} /><strong>Service areas</strong><p>{profile.service_areas.join(", ") || "Not specified"}</p></article><article><Languages size={20} /><strong>Languages</strong><p>{profile.languages.join(", ") || "Not specified"}</p></article><article><CheckCircle2 size={20} /><strong>Specialisations</strong><p>{profile.specialisations.join(", ") || "Not specified"}</p></article></div></div></section><section className="professional-public-listings" id="listings"><div className="container"><div className="section-heading"><div><p className="eyebrow">Current portfolio</p><h2>Available properties</h2></div><Link href="/search">Search all properties</Link></div><div className="professional-listing-grid">{listings.map((listing) => <Link className="professional-listing-row" href={`/properties/${listing.id}`} key={listing.id}><div><span>{humanize(listing.category)}</span><h3>{listing.title}</h3><p><MapPin size={14} />{listing.location}</p></div><strong>{formatNaira(Number(listing.price_amount))}</strong></Link>)}{!listings.length ? <div className="professional-listings-empty"><Building2 size={26} /><h3>No public listings yet</h3><p>Approved inventory will appear here when it becomes available.</p></div> : null}</div></div></section></main>;
}

async function findProfile(slug) {
  if (!hasDatabase() || !slug || slug.length > 120) return null;
  const allowDemo = allowDemoContent();
  const result = await query(
    `SELECT p.user_id, p.slug, p.headline, p.biography, p.service_areas, p.languages, p.specialisations,
            p.verification_status, p.is_demo, u.name, o.name AS organization_name, pm.id AS image_media_id
     FROM professional_profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN organizations o ON o.id = p.organization_id AND o.status = 'active'
     LEFT JOIN professional_profile_media pm ON pm.user_id = p.user_id AND pm.status = 'ready'
     WHERE p.slug = $1 AND p.is_public = TRUE AND u.status = 'active' AND ($2::boolean OR p.is_demo = FALSE)
     LIMIT 1`,
    [slug, allowDemo],
  );
  return result.rows[0] || null;
}

async function findListings(userId, isDemo) {
  const allowDemo = allowDemoContent() && isDemo;
  const result = await query(
    `SELECT id, title, category, location, price_amount
     FROM listings
     WHERE owner_user_id = $1 AND status = 'active' AND (verification_status = 'verified' OR ($2::boolean AND is_demo = TRUE))
     ORDER BY updated_at DESC
     LIMIT 12`,
    [userId, allowDemo],
  );
  return result.rows;
}

function initials(name) { return String(name || "N").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function humanize(value) { return String(value || "not submitted").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
