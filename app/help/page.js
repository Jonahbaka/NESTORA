import Link from "next/link";
import { ChevronRight, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { getSupportEmail } from "@/lib/operational-config";

export const metadata = { title: "Help centre" };

const topics = [
  ["Booking and stays", "Requests, confirmations, changes and payments."],
  ["Renting and buying", "Inspections, fees, documents and professional support."],
  ["Accounts and privacy", "Sign-in, security, profile controls and your data."],
  ["Trust and reporting", "Verification, safety guidance and reporting concerns."],
];

export default function HelpPage() {
  const supportEmail = getSupportEmail();
  const supportHref = `mailto:${supportEmail}?subject=Nestora%20support%20request`;

  return (
    <div className="simple-page">
      <header className="simple-hero shell">
        <p className="eyebrow">Nestora Help</p>
        <h1>How can we help?</h1>
        <label><Search size={18} /><input placeholder="Search bookings, inspections, verification or safety" /></label>
      </header>
      <section className="section shell help-grid">
        {topics.map(([title, copy]) => (
          <Link href="/trust" key={title}><ShieldCheck size={20} /><h2>{title}</h2><p>{copy}</p><ChevronRight size={17} /></Link>
        ))}
      </section>
      <section className="help-contact">
        <div className="shell">
          <MessageCircle size={22} />
          <div><h2>Still need a person?</h2><p>Our support team can review account, safety and transaction questions with the right context.</p></div>
          <a className="button button--light" href={supportHref}>Email support</a>
        </div>
      </section>
    </div>
  );
}
