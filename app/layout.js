import "./globals.css";
import { NestoraProvider } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { NoraGuide } from "@/components/nora-guide";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000"),
  title: { default: "Nestora | Find your place. Feel at home.", template: "%s | Nestora" },
  description: "A clearer way to explore stays, rentals, homes and neighbourhoods across Africa, beginning in Abuja.",
  applicationName: "Nestora",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "Nestora",
    description: "Find your place. Feel at home.",
    images: ["/images/nestora/hero-abuja-residence.webp"],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#f8f5ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <NestoraProvider>
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter />
          <NoraGuide />
          <MobileNav />
        </NestoraProvider>
      </body>
    </html>
  );
}
