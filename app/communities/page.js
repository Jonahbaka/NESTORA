import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Lock, UsersRound } from "lucide-react";
import { communities } from "@/lib/data";

export const metadata = { title: "Communities" };
export default function CommunitiesPage() {
  return <div className="directory-page"><header className="directory-hero shell"><p className="eyebrow">Nestora communities</p><h1>Find your people,<br />close to home.</h1><p>Neighbourhood circles, homebuyer support and professional peer groups built around useful, respectful conversation.</p></header><section className="section shell community-directory">{communities.map((community) => <Link href={`/communities/${community.id}`} key={community.id}><div><Image src={community.image} alt={community.name} fill sizes="(max-width: 700px) 100vw, 33vw" /></div><span>{community.privacy === "Private" ? <Lock size={14} /> : <UsersRound size={14} />}{community.privacy} · {community.members.toLocaleString()} members</span><h2>{community.name}</h2><p>{community.description}</p><b>Open community <ArrowRight size={16} /></b></Link>)}</section></div>;
}
