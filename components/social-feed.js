"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Bookmark, Building2, Camera, Flag, Heart, Home, ImagePlus, MapPin, MessageCircle, MoreHorizontal, Plus, Search, Send, Share2, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { useNestora } from "@/components/providers";
import { communities, posts as initialPosts, profiles, properties } from "@/lib/data";

export function SocialFeed() {
  const { reactions, toggleReaction, joinedCommunities, toggleCommunity, following, toggleFollow, notify } = useNestora();
  const [posts, setPosts] = useState(initialPosts);
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState({});
  const [commentOpen, setCommentOpen] = useState(null);

  function publish(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    setPosts((current) => [{ id: `local-${Date.now()}`, author: "You", authorId: "me", avatar: "/images/nestora/jabi-community.webp", verified: false, time: "Now", text: draft.trim(), reactions: 0, comments: 0 }, ...current]);
    setDraft("");
    notify("Your post is now live");
  }

  function addComment(event, postId) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("comment")?.trim();
    if (!value) return;
    setComments((current) => ({ ...current, [postId]: [...(current[postId] || []), value] }));
    event.currentTarget.reset();
  }

  return (
    <div className="social-page">
      <div className="social-cover"><Image src="/images/nestora/jabi-community.webp" alt="Abuja neighbours sharing a morning by Jabi Lake" fill priority sizes="100vw" /><span /><div className="shell"><p className="eyebrow">Nestora Community</p><h1>Know the place.<br />Meet the people.</h1><p>Local knowledge, honest property stories and useful connections across Abuja.</p></div></div>
      <div className="shell social-layout">
        <aside className="social-left">
          <section className="mini-profile"><div className="mini-profile__image"><Image src="/images/nestora/amina-bello-agent.webp" alt="Your profile" fill sizes="64px" /></div><div><strong>Welcome to your city</strong><p>Follow useful voices and save the places that feel right.</p></div><Link href="/my-nestora">Open My Nestora</Link></section>
          <nav className="social-nav" aria-label="Community navigation"><Link className="active" href="/social"><Home size={18} />Home</Link><Link href="/communities"><UsersRound size={18} />Communities</Link><Link href="/search"><Building2 size={18} />Property stories</Link><Link href="/saved"><Bookmark size={18} />Saved posts</Link></nav>
          <section className="community-shortlist"><div className="aside-heading"><h2>Your circles</h2><Link href="/communities">See all</Link></div>{communities.map((community) => <Link href={`/communities/${community.id}`} key={community.id}><span className="circle-image"><Image src={community.image} alt="" fill sizes="38px" /></span><div><strong>{community.name}</strong><small>{community.members.toLocaleString()} members</small></div></Link>)}</section>
        </aside>

        <main className="feed-column">
          <form className="post-composer" onSubmit={publish}><div className="composer-row"><span className="composer-avatar"><Image src="/images/nestora/amina-bello-agent.webp" alt="" fill sizes="42px" /></span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Share something useful about your place or neighbourhood…" aria-label="Create a community post" rows="2" /></div><div className="composer-actions"><div><button type="button" onClick={() => notify("Image upload is ready for a signed media service")}><ImagePlus size={17} />Photo</button><button type="button" onClick={() => notify("Add a verified property from its listing page")}><Building2 size={17} />Property</button><button type="button" onClick={() => notify("Location added to your draft")}><MapPin size={17} />Place</button></div><button type="submit" disabled={!draft.trim()}><Send size={16} />Post</button></div></form>
          <div className="feed-filter"><strong>For you</strong><button type="button"><Search size={16} /> Search posts</button></div>
          {posts.map((post) => {
            const liked = reactions.includes(post.id);
            const property = post.propertyId ? properties.find((item) => item.id === post.propertyId) : null;
            return (
              <article className="feed-post" key={post.id}>
                <header><Link className="post-avatar" href={post.authorId === "me" ? "/my-nestora" : `/profile/${post.authorId}`}><Image src={post.avatar} alt="" fill sizes="46px" /></Link><div><Link href={post.authorId === "me" ? "/my-nestora" : `/profile/${post.authorId}`}><strong>{post.author}</strong>{post.verified ? <BadgeCheck size={15} /> : null}</Link><span>{post.time} · Abuja</span></div><button type="button" aria-label="Post options" onClick={() => notify("Post controls opened")}><MoreHorizontal size={19} /></button></header>
                <p className="post-copy">{post.text}</p>
                {post.image ? <div className="post-image"><Image src={post.image} alt="Image shared with this post" fill sizes="(max-width: 760px) 100vw, 620px" /></div> : null}
                {property ? <Link className="attached-property" href={`/properties/${property.id}`}><div><span>{property.tag}</span><strong>{property.title}</strong><small>{property.location}</small></div><b>View place</b></Link> : null}
                <div className="post-counts"><span>{post.reactions + (liked ? 1 : 0)} appreciations</span><span>{post.comments + (comments[post.id]?.length || 0)} comments</span></div>
                <div className="post-actions"><button type="button" className={liked ? "active" : ""} onClick={() => toggleReaction(post.id)}><Heart size={18} fill={liked ? "currentColor" : "none"} />Appreciate</button><button type="button" onClick={() => setCommentOpen(commentOpen === post.id ? null : post.id)}><MessageCircle size={18} />Comment</button><button type="button" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/social#${post.id}`); notify("Post link copied"); }}><Share2 size={18} />Share</button><button type="button" aria-label="Report post" onClick={() => notify("Report received for moderation review")}><Flag size={16} /></button></div>
                {commentOpen === post.id ? <div className="comment-thread">{(comments[post.id] || []).map((comment, index) => <p key={`${comment}-${index}`}><strong>You</strong>{comment}</p>)}<form onSubmit={(event) => addComment(event, post.id)}><input name="comment" placeholder="Write a thoughtful reply…" aria-label="Comment" /><button type="submit" aria-label="Send comment"><Send size={16} /></button></form></div> : null}
              </article>
            );
          })}
        </main>

        <aside className="social-right">
          <section className="safety-note"><ShieldCheck size={20} /><div><strong>A safer community</strong><p>Control who follows or messages you. Report concerns without leaving the conversation.</p><Link href="/trust">Community standards</Link></div></section>
          <section className="suggestions"><div className="aside-heading"><h2>Trusted voices</h2><span>Abuja</span></div>{profiles.map((profile) => { const followed = following.includes(profile.id); return <article key={profile.id}><Link href={`/profile/${profile.id}`} className="suggestion-photo"><Image src={profile.avatar} alt="" fill sizes="44px" /></Link><div><Link href={`/profile/${profile.id}`}><strong>{profile.name}</strong><BadgeCheck size={14} /></Link><small>{profile.role}</small></div><button type="button" className={followed ? "active" : ""} onClick={() => toggleFollow(profile.id)}>{followed ? "Following" : "Follow"}</button></article>; })}</section>
          <section className="join-card"><div className="join-card__image"><Image src="/images/nestora/katampe-residences.webp" alt="Contemporary homes in Katampe" fill sizes="300px" /></div><p className="eyebrow">Circle of the week</p><h2>First Home Circle</h2><p>Practical support for buying well, from title checks to closing day.</p><button type="button" className="button button--ink" onClick={() => toggleCommunity("first-home-circle")}>{joinedCommunities.includes("first-home-circle") ? "Joined" : <><Plus size={16} />Join circle</>}</button></section>
        </aside>
      </div>
    </div>
  );
}
