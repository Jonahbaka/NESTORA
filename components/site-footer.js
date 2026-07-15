import Link from "next/link";
import { Info, Instagram, Linkedin, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";

const columns = [
  { title: "Discover", links: [["Stays", "/search?mode=stay"], ["Homes to rent", "/search?mode=rent"], ["Homes to buy", "/search?mode=buy"], ["New developments", "/search?mode=new"]] },
  { title: "Nestora", links: [["Community", "/social"], ["Nora guide", "/nora"], ["Trust & safety", "/trust"], ["Help centre", "/help"]] },
  { title: "Professionals", links: [["Agent workspace", "/workspace/agent"], ["Host workspace", "/workspace/host"], ["Developer workspace", "/workspace/developer"], ["Agency workspace", "/workspace/agency"]] },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-intro">
          <Brand inverse />
          <p>A trusted way to stay, rent, buy and belong across Africa, beginning in Abuja.</p>
          <div className="footer-trust"><ShieldCheck size={18} /> Identity safeguards, clear pricing, human support.</div>
        </div>
        {columns.map((column) => (
          <div key={column.title} className="footer-column">
            <h2>{column.title}</h2>
            {column.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </div>
        ))}
      </div>
      <div className="shell catalogue-disclosure"><Info size={15} /><p>Property listings, profiles, reviews and community posts shown in the current catalogue are illustrative content and are not live offers.</p></div>
      <div className="shell footer-bottom">
        <p>© {new Date().getFullYear()} Nestora Technologies. All rights reserved.</p>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/accessibility">Accessibility</Link><a href="https://www.linkedin.com" aria-label="Nestora on LinkedIn"><Linkedin size={17} /></a><a href="https://www.instagram.com" aria-label="Nestora on Instagram"><Instagram size={17} /></a></div>
      </div>
    </footer>
  );
}
