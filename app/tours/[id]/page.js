import { notFound } from "next/navigation";
import { VirtualTourViewer } from "@/components/virtual-tour-viewer";
import { getManagedListingPreview, getPublicListing } from "@/lib/server/public-listings";
import { getWorkspaceContext } from "@/lib/server/workspace-context";

export const dynamic = "force-dynamic";

export default async function TourPage({ params, searchParams }) {
  const id = (await params).id;
  const preview = (await searchParams)?.preview === "1";
  let property = null;
  if (preview) {
    try { property = await getManagedListingPreview(id, await getWorkspaceContext()); }
    catch { property = null; }
  } else {
    property = await getPublicListing(id);
  }
  const items = property?.media?.filter((item) => ["walkthrough", "panorama"].includes(item.media_role)) || [];
  if (!property || !items.length) notFound();
  return <VirtualTourViewer property={property} items={items} preview={preview} />;
}
