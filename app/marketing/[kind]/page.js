import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { BadgeCheck, BedDouble, MapPin, ShieldCheck } from "lucide-react";
import { PrintMaterialActions } from "@/components/print-material-actions";
import { getProperty } from "@/lib/data";
import { formatNaira } from "@/lib/platform";

const materials = {
  "agent-profile-sheet": {
    eyebrow: "Professional profile presentation",
    propertyId: "wuye-courtyard-residence",
    title: "Neighbourhood knowledge, presented with professional clarity.",
    accent: "forest",
    targetPath: "/profile/amina-bello",
  },
  "rental-flyer": {
    eyebrow: "Rental presentation",
    propertyId: "wuye-courtyard-residence",
    title: "A calm Wuye address, presented with clarity.",
    accent: "coral",
  },
  "sale-brochure": {
    eyebrow: "Sale presentation",
    propertyId: "maitama-ridge-villa",
    title: "A considered Maitama home for a considered decision.",
    accent: "forest",
  },
  "development-brochure": {
    eyebrow: "Development presentation",
    propertyId: "katampe-court-residences",
    title: "Track the home being built, not just the promise.",
    accent: "blue",
  },
  "hotel-flyer": {
    eyebrow: "Stay presentation",
    propertyId: "jabi-lake-serviced-suite",
    title: "A Jabi stay with the details settled before arrival.",
    accent: "gold",
  },
  "payment-plan-sheet": {
    eyebrow: "Payment plan presentation",
    propertyId: "katampe-court-residences",
    title: "Understand the path to ownership before the first commitment.",
    accent: "blue",
  },
  "qr-poster": {
    eyebrow: "Property QR presentation",
    propertyId: "wuye-courtyard-residence",
    title: "One scan. The full illustrative property room.",
    accent: "coral",
  },
  "comparison-sheet": {
    eyebrow: "Property comparison presentation",
    propertyId: "wuye-courtyard-residence",
    title: "Compare the details that shape a confident decision.",
    accent: "forest",
    targetPath: "/search?mode=rent",
  },
};

export function generateStaticParams() {
  return Object.keys(materials).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }) {
  const { kind } = await params;
  return materials[kind] ? { title: materials[kind].eyebrow } : {};
}

export default async function MarketingMaterialPage({ params }) {
  const { kind } = await params;
  const material = materials[kind];
  if (!material) notFound();
  const property = getProperty(material.propertyId);
  if (!property) notFound();

  const origin = (process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3030").replace(/\/$/, "");
  const targetPath = material.targetPath || `/properties/${property.id}`;
  const separator = targetPath.includes("?") ? "&" : "?";
  const qrTarget = `${origin}${targetPath}${separator}utm_source=nestora_material&utm_medium=qr&utm_campaign=${kind}`;
  const qrCode = await QRCode.toDataURL(qrTarget, { width: 420, margin: 1, errorCorrectionLevel: "M", color: { dark: "#12231d", light: "#ffffff" } });

  return (
    <div className="material-screen">
      <div className="shell"><PrintMaterialActions /></div>
      <article className={`marketing-material marketing-material--${material.accent}`} aria-label={`${material.eyebrow} for ${property.title}`}>
        <header className="marketing-material__brand">
          <div><strong>NESTORA</strong><span>Find your place. Feel at home.</span></div>
          <p>Illustrative catalogue material</p>
        </header>

        <div className="marketing-material__hero">
          <Image src={property.image} alt={`${property.title} illustrative presentation`} fill priority sizes="900px" />
          <span className="marketing-material__veil" />
          <div>
            <p>{material.eyebrow}</p>
            <h1>{material.title}</h1>
            <span><MapPin size={17} /> {property.location}</span>
          </div>
        </div>

        <div className="marketing-material__body">
          <section>
            <p className="eyebrow">Illustrative property catalogue</p>
            <h2>{property.title}</h2>
            <p>{property.description}</p>
            <div className="marketing-material__facts">
              <span><BedDouble size={18} /><strong>{property.beds}</strong> bedrooms</span>
              <span><strong>{property.baths}</strong> bathrooms</span>
              <span><strong>{property.sqm}</strong> sqm</span>
            </div>
            <div className="marketing-material__price">
              <small>Illustrative published price</small>
              <strong>{formatNaira(property.price)}</strong>
              <span>{property.priceSuffix || ""}</span>
            </div>
          </section>

          <aside>
            {/* qrcode emits a PNG data URL so the printed code remains self-contained. */}
            <Image src={qrCode} alt={`QR code opening ${property.title} with campaign attribution`} width={180} height={180} unoptimized />
            <strong>Open the property room</strong>
            <p>Scan to review the illustrative details and begin an on-platform conversation.</p>
            <small>Campaign: {kind}</small>
            <a href="mailto:jonahbaka00@gmail.com">jonahbaka00@gmail.com</a>
          </aside>
        </div>

        <footer className="marketing-material__footer">
          <span><ShieldCheck size={16} /> Built for identity and document checks</span>
          <span><BadgeCheck size={16} /> Clear pricing and visible update signals</span>
          <p>This is clearly fictional QA content, not a live property offer.</p>
        </footer>
      </article>
    </div>
  );
}
