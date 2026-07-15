import { properties } from "@/lib/data";

export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";
  const routes = ["", "/search", "/social", "/saved", "/trust"];
  return [...routes.map((route) => ({ url: `${base}${route}`, changeFrequency: "daily", priority: route === "" ? 1 : 0.7 })), ...properties.map((property) => ({ url: `${base}/properties/${property.id}`, changeFrequency: "daily", priority: 0.8 }))];
}
