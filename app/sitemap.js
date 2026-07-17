import { listPublicListings } from "@/lib/server/public-listings";

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://nestora.doctarx.com";
  const routes = ["", "/search", "/pricing", "/workspace", "/trust", "/help", "/privacy", "/terms", "/accessibility"];
  const listings = await listPublicListings({ limit: 200 });
  return [...routes.map((route) => ({ url: `${base}${route}`, changeFrequency: "daily", priority: route === "" ? 1 : 0.7 })), ...listings.map((listing) => ({ url: `${base}/properties/${listing.id}`, changeFrequency: "daily", priority: 0.8 }))];
}
