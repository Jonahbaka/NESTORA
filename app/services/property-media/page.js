import { PropertyMediaService } from "@/components/property-media-service";
import { getPropertyMediaConfiguration } from "@/lib/server/property-media-services";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Professional property photography, drone and 360° tours",
  description: "Transparent Abuja launch pricing for professional property photography, drone coverage, walkthrough video, floor plans and immersive 360° tours.",
};

export default async function PropertyMediaPage() {
  const configuration = await getPropertyMediaConfiguration();
  return <PropertyMediaService configuration={configuration} />;
}
