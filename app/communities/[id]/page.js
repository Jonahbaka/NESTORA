import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, Lock, ShieldCheck, UsersRound } from "lucide-react";
import { CommunityJoinButton } from "@/components/community-join-button";
import { communities, posts } from "@/lib/data";

export function generateStaticParams() { return communities.map((community) => ({ id: community.id })); }
export default async function CommunityPage({ params }) {
  const { id } = await params; const community = communities.find((item) => item.id === id); if (!community) notFound();
  const feed = posts.filter((post) => post.communityId === id || id === "living-in-abuja");
  return <div className="community-page"><section className="community-hero"><Image src={community.image} alt={community.name} fill priority sizes="100vw" /><span /><div className="shell"><p>{community.privacy === "Private" ? <Lock size={14} /> : <UsersRound size={14} />}{community.privacy} community</p><h1>{community.name}</h1><strong>{community.members.toLocaleString()} members</strong></div></section><div className="shell community-page__layout"><main><div className="community-about"><h2>About this community</h2><p>{community.description}</p><div><span><ShieldCheck size={17} /> Moderated for safety</span><span><BadgeCheck size={17} /> Local contributors verified</span></div></div><h2 className="community-feed-title">Recent conversations</h2>{feed.length ? feed.map((post) => <article className="community-post" key={post.id}><header><span><Image src={post.avatar} alt="" fill sizes="42px" /></span><div><strong>{post.author}</strong><small>{post.time}</small></div></header><p>{post.text}</p>{post.image ? <div><Image src={post.image} alt="" fill sizes="700px" /></div> : null}</article>) : <div className="empty-state"><h2>The first conversation starts here</h2><p>Members can begin posting after joining this community.</p></div>}</main><aside><div className="community-join"><UsersRound size={25} /><h2>Join {community.name}</h2><p>Participate in local conversations and receive relevant community updates.</p><CommunityJoinButton id={community.id} /></div><div className="community-rules"><h2>Community commitments</h2><ol><li>Be useful and specific.</li><li>Respect privacy and consent.</li><li>No discriminatory housing practices.</li><li>Declare professional interests.</li></ol></div></aside></div></div>;
}
