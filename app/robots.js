export default function robots() {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }, sitemap: `${process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000"}/sitemap.xml` };
}
