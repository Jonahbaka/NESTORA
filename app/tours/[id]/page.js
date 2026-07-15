import { notFound } from "next/navigation";
import { ImmersiveTour } from "@/components/immersive-tour";
import { getProperty, properties } from "@/lib/data";

export function generateStaticParams() { return properties.map((property) => ({ id: property.id })); }
export async function generateMetadata({ params }) { const { id } = await params; const property = getProperty(id); return property ? { title: `Tour ${property.title}`, description: `Explore ${property.title} in an immersive property tour.` } : {}; }

export default async function TourPage({ params }) {
  const { id } = await params;
  const property = getProperty(id);
  if (!property) notFound();
  return <ImmersiveTour property={property} />;
}
