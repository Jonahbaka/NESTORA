import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";

const columns = [
  { title: "Discover", links: [["Stays", "/search?mode=stay"], ["Homes to rent", "/search?mode=rent"], ["Homes to buy", "/search?mode=buy"], ["New developments", "/search?mode=new"]] },
  { title: "Nestora", links: [["Nora guide", "/nora"], ["Trust & safety", "/trust"], ["Help centre", "/help"], ["Contact", "mailto:jonahbaka00@gmail.com"]] },
  { title: "Professionals", links: [["Plans and pricing", "/pricing"], ["All workspaces", "/workspace"], ["Agent workspace", "/workspace/agent"], ["Host workspace", "/workspace/host"], ["Developer workspace", "/workspace/developer"], ["Agency workspace", "/workspace/agency"]] },
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
      <div className="shell catalogue-disclosure"><Mail size={15} /><p>Support: jonahbaka00@gmail.com</p></div>
      <div className="shell footer-bottom">
        <p>&copy; {new Date().getFullYear()} Nestora Technologies. All rights reserved.</p>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/accessibility">Accessibility</Link></div>
      </div>
    </footer>
  );
}
