import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ChartNoAxesCombined, Hotel, Landmark, ShieldCheck, UsersRound } from "lucide-react";

const roles = [
  { id: "agent", title: "Agent", copy: "Manage listings, enquiries, viewings and client follow-up.", icon: Building2, image: "/images/nestora/amina-bello-agent.webp" },
  { id: "host", title: "Host", copy: "Run availability, reservations, guest messages and payouts.", icon: Hotel, image: "/images/nestora/asokoro-rooftop.webp" },
  { id: "developer", title: "Developer", copy: "Publish projects, unit inventory and verified progress updates.", icon: Landmark, image: "/images/nestora/katampe-residences.webp" },
  { id: "agency", title: "Agency", copy: "Coordinate teams, portfolios, service quality and reporting.", icon: UsersRound, image: "/images/nestora/guzape-duplex.webp" },
];

export const metadata = { title: "Professional workspace" };
export default function WorkspacePage() { return <div className="workspace-entry"><section className="workspace-entry__hero"><Image src="/images/nestora/maitama-villa.webp" alt="Contemporary premium property represented on Nestora" fill priority sizes="100vw" /><span /><div className="shell"><p className="eyebrow">Nestora for professionals</p><h1>Run a better property business.</h1><p>Present places beautifully, respond with context and keep every client step visible to the right people.</p><div><span><ShieldCheck size={17} /> Verified professional identities</span><span><ChartNoAxesCombined size={17} /> Clear performance signals</span></div></div></section><section className="section shell role-directory"><div className="section-heading"><div><p className="eyebrow">Choose your workspace</p><h2>Tools matched to how you operate</h2><p>Each workspace shares one trusted listing, conversation and activity record.</p></div></div><div className="role-grid">{roles.map(({ id, title, copy, icon: Icon, image }) => <Link href={`/workspace/${id}`} key={id}><div><Image src={image} alt="" fill sizes="(max-width: 700px) 100vw, 25vw" /></div><span><Icon size={19} /></span><h2>{title}</h2><p>{copy}</p><b>Open workspace <ArrowRight size={16} /></b></Link>)}</div></section></div>; }
