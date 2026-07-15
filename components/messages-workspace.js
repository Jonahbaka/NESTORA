"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, CheckCheck, ChevronRight, FileText, ImagePlus, Info, MoreHorizontal, Paperclip, Search, Send, ShieldCheck, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { conversations, properties } from "@/lib/data";

const initialMessages = {
  "conv-amina": [
    { id: 1, from: "them", text: "Hello Adaeze, thank you for your interest in The Courtyard Residence. What would you like to know before viewing?", time: "11:26" },
    { id: 2, from: "me", text: "Could I see it after work on Thursday? I would also like to confirm the annual service charge.", time: "11:34" },
    { id: 3, from: "them", text: "Absolutely. The current service charge is ₦620,000 and the full breakdown is attached to the listing. I have held the 4:30 pm viewing for you.", time: "11:42", read: true },
  ],
  "conv-nook": [{ id: 1, from: "them", text: "Your Jabi suite request is ready for confirmation. Airport pickup can be added until 6 pm.", time: "Yesterday" }],
  "conv-northline": [{ id: 1, from: "them", text: "The title pack and latest independent progress note are ready in your documents.", time: "Monday" }],
};

export function MessagesWorkspace() {
  const params = useSearchParams();
  const requested = params.get("to");
  const requestedProperty = params.get("property");
  const defaultConversation = requested === "amina-bello" ? "conv-amina" : requested === "the-nook-jabi" ? "conv-nook" : requested ? "conv-northline" : "conv-amina";
  const [activeId, setActiveId] = useState(defaultConversation);
  const [messages, setMessages] = useState(initialMessages);
  const [query, setQuery] = useState("");
  const [mobileThread, setMobileThread] = useState(Boolean(requested));
  const active = conversations.find((conversation) => conversation.id === activeId) || conversations[0];
  const property = properties.find((item) => item.id === (requestedProperty || active.propertyId));
  const filtered = useMemo(() => conversations.filter((conversation) => conversation.name.toLowerCase().includes(query.toLowerCase())), [query]);

  function send(event) {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const text = input.value.trim();
    if (!text) return;
    setMessages((current) => ({ ...current, [activeId]: [...(current[activeId] || []), { id: Date.now(), from: "me", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), read: false }] }));
    input.value = "";
  }

  return (
    <div className={`messages-page ${mobileThread ? "messages-page--thread" : ""}`}>
      <aside className="conversation-list">
        <header><div><h1>Messages</h1><button type="button" aria-label="Message options"><MoreHorizontal size={19} /></button></div><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label></header>
        <nav aria-label="Conversations">{filtered.map((conversation) => <button type="button" key={conversation.id} className={activeId === conversation.id ? "active" : ""} onClick={() => { setActiveId(conversation.id); setMobileThread(true); }}><span className="conversation-avatar"><Image src={conversation.avatar} alt="" fill sizes="46px" /></span><div><span><strong>{conversation.name}</strong><small>{conversation.time}</small></span><p>{conversation.preview}</p></div>{conversation.unread ? <b>{conversation.unread}</b> : null}</button>)}</nav>
      </aside>

      <section className="message-thread">
        <header><button type="button" className="thread-back" onClick={() => setMobileThread(false)} aria-label="Back to conversations"><ArrowLeft size={20} /></button><span className="thread-avatar"><Image src={active.avatar} alt="" fill sizes="42px" /></span><div><strong>{active.name}<BadgeCheck size={14} /></strong><small>Verified · Active now</small></div><button type="button" aria-label="Start video call"><Video size={19} /></button><button type="button" aria-label="Conversation details"><Info size={19} /></button></header>
        {property ? <Link href={`/properties/${property.id}`} className="message-property"><span className="message-property__image"><Image src={property.image} alt="" fill sizes="64px" /></span><div><small>Conversation about</small><strong>{property.title}</strong><span>{property.location}</span></div><ChevronRight size={18} /></Link> : null}
        <div className="message-safety"><ShieldCheck size={15} /> Keep payments and important agreements on Nestora. We will never ask for your password or one-time code.</div>
        <div className="message-history" aria-live="polite"><div className="date-divider"><span>Today</span></div>{(messages[activeId] || []).map((message) => <div key={message.id} className={`bubble-row bubble-row--${message.from}`}><div className="message-bubble"><p>{message.text}</p><span>{message.time}{message.from === "me" ? <CheckCheck size={13} /> : null}</span></div></div>)}</div>
        <form className="message-composer" onSubmit={send}><button type="button" aria-label="Attach a file"><Paperclip size={19} /></button><input name="message" autoComplete="off" placeholder={`Message ${active.name.split(" ")[0]}…`} aria-label="Message" /><button type="button" aria-label="Attach an image"><ImagePlus size={19} /></button><button type="submit" className="send-message" aria-label="Send message"><Send size={18} /></button></form>
      </section>

      <aside className="message-details"><div className="message-details__profile"><span><Image src={active.avatar} alt={active.name} fill sizes="76px" /></span><h2>{active.name}</h2><p><BadgeCheck size={14} /> Verified on Nestora</p></div><div className="detail-actions"><button type="button"><Search size={18} /><span>Search</span></button><button type="button"><FileText size={18} /><span>Files</span></button><button type="button"><Building2 size={18} /><span>Places</span></button></div><section><h3>Safety controls</h3><button type="button">Report conversation</button><button type="button">Block this profile</button></section><p className="encrypted-note"><ShieldCheck size={15} /> Messages are encrypted in transit and access is logged.</p></aside>
    </div>
  );
}
