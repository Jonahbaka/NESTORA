"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CheckCheck, ChevronRight, Search, Send, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function MessagesWorkspace() {
  const params = useSearchParams();
  const requestedProperty = params.get("property");
  const requestedConversation = params.get("conversation");
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(requestedConversation || null);
  const [thread, setThread] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileThread, setMobileThread] = useState(Boolean(requestedConversation || requestedProperty));
  const [safetyMode, setSafetyMode] = useState(null);
  const [requestedListing, setRequestedListing] = useState(null);
  const property = thread?.conversation?.subject_type === "listing" ? { id: thread.conversation.subject_id, title: thread.conversation.subject_title, location: thread.conversation.subject_location } : requestedListing;

  useEffect(() => {
    if (!requestedProperty) return;
    fetch("/api/listings", { cache: "no-store" }).then((response) => response.json()).then((payload) => setRequestedListing((payload.listings || []).find((item) => item.id === requestedProperty) || null)).catch(() => null);
  }, [requestedProperty]);

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/messages", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Messages could not be loaded.");
    setConversations(payload.conversations || []);
    if (!activeId && !requestedProperty && payload.conversations?.length) setActiveId(payload.conversations[0].id);
  }, [activeId, requestedProperty]);

  useEffect(() => {
    let cancelled = false;
    loadConversations().catch((loadError) => { if (!cancelled) setError(loadError.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) { setThread(null); return; }
    let cancelled = false;
    setError("");
    fetch(`/api/messages?conversation=${encodeURIComponent(activeId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "This conversation could not be opened.");
        if (!cancelled) setThread(payload);
      })
      .catch((loadError) => { if (!cancelled) setError(loadError.message); });
    return () => { cancelled = true; };
  }, [activeId]);

  const filtered = useMemo(() => conversations.filter((conversation) => conversation.other_name.toLowerCase().includes(query.toLowerCase())), [conversations, query]);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const recipientName = thread?.conversation?.other_name || activeConversation?.other_name || (requestedProperty ? "listing professional" : "conversation");

  async function send(event) {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const body = input.value.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const requestBody = activeId
        ? { action: "send", conversationId: activeId, body, clientNonce: crypto.randomUUID() }
        : { action: "startListing", listingId: requestedProperty, body, clientNonce: crypto.randomUUID() };
      const response = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Your message could not be sent.");
      input.value = "";
      const conversationId = activeId || payload.conversationId;
      setActiveId(conversationId);
      setThread((current) => current ? { ...current, messages: [...current.messages, payload.message] } : current);
      await loadConversations();
      setNotice("Message sent.");
      window.setTimeout(() => setNotice(""), 2200);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  async function submitSafety(event) {
    event.preventDefault();
    if (!activeId) return;
    const reason = new FormData(event.currentTarget).get("reason")?.toString().trim();
    setError("");
    try {
      const response = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: safetyMode, conversationId: activeId, reason }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "That safety action could not be completed.");
      setNotice(safetyMode === "report" ? "Report submitted for review." : "This profile has been blocked.");
      setSafetyMode(null);
    } catch (safetyError) {
      setError(safetyError.message);
    }
  }

  return (
    <div className={`messages-page ${mobileThread ? "messages-page--thread" : ""}`}>
      <aside className="conversation-list">
        <header><div><h1>Messages</h1></div><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label></header>
        <nav aria-label="Conversations">
          {loading ? <p className="message-list-state">Loading conversations...</p> : null}
          {!loading && !filtered.length ? <p className="message-list-state">No conversations yet.</p> : null}
          {filtered.map((conversation) => <button type="button" key={conversation.id} className={activeId === conversation.id ? "active" : ""} onClick={() => { setActiveId(conversation.id); setMobileThread(true); setSafetyMode(null); }}><Initials name={conversation.other_name} /><div><span><strong>{conversation.other_name}</strong><small>{formatRelative(conversation.last_message_at)}</small></span><p>{conversation.preview || "Open conversation"}</p></div>{conversation.unread_count ? <b>{conversation.unread_count}</b> : null}</button>)}
        </nav>
      </aside>

      <section className="message-thread">
        <header><button type="button" className="thread-back" onClick={() => setMobileThread(false)} aria-label="Back to conversations"><ArrowLeft size={20} /></button><Initials name={recipientName} compact /><div><strong>{recipientName}</strong><small>{thread?.conversation?.other_role ? roleLabel(thread.conversation.other_role) : requestedProperty ? "Property enquiry" : "Nestora member"}</small></div><button type="button" onClick={() => setSafetyMode("report")} aria-label="Conversation safety"><ShieldAlert size={19} /></button></header>
        {property ? <Link href={`/properties/${property.id}`} className="message-property"><span className="message-property__icon"><Building2 size={22} /></span><div><small>Conversation about</small><strong>{property.title}</strong><span>{property.location}</span></div><ChevronRight size={18} /></Link> : null}
        <div className="message-safety"><ShieldCheck size={15} /> Keep payments and important agreements on Nestora. Never share a password or one-time code.</div>
        {error ? <p className="message-api-status error" role="alert">{error}</p> : null}
        {notice ? <p className="message-api-status success" role="status">{notice}</p> : null}
        <div className="message-history" aria-live="polite">
          {activeId && !thread ? <div className="message-empty"><p>Opening conversation...</p></div> : null}
          {!activeId && requestedProperty ? <div className="message-empty"><Building2 size={28} /><h2>Ask about {property?.title || "this property"}</h2><p>Your first message will create a private enquiry and notify the listing professional.</p></div> : null}
          {!activeId && !requestedProperty ? <div className="message-empty"><UserRound size={28} /><h2>Your conversations</h2><p>Open a conversation or message a professional from a listing.</p></div> : null}
          {thread?.messages?.length ? <><div className="date-divider"><span>Conversation</span></div>{thread.messages.map((message) => <div key={message.id} className={`bubble-row bubble-row--${message.sender_id === thread.conversation.other_user_id ? "them" : "me"}`}><div className="message-bubble"><p>{message.body}</p><span>{formatTime(message.created_at)}{message.sender_id !== thread.conversation.other_user_id ? <CheckCheck size={13} /> : null}</span></div></div>)}</> : null}
        </div>
        {(activeId || requestedProperty) ? <form className="message-composer" onSubmit={send}><input name="message" autoComplete="off" placeholder={`Message ${recipientName.split(" ")[0]}...`} aria-label="Message" maxLength={5000} /><button type="submit" className="send-message" disabled={sending} aria-label="Send message"><Send size={18} /></button></form> : null}
      </section>

      <aside className="message-details">
        <div className="message-details__profile"><Initials name={recipientName} large /><h2>{recipientName}</h2><p><ShieldCheck size={14} /> Identity linked to an authenticated account</p></div>
        <section><h3>Safety controls</h3><button type="button" onClick={() => setSafetyMode("report")} disabled={!activeId}>Report conversation</button><button type="button" onClick={() => setSafetyMode("block")} disabled={!activeId}>Block this profile</button></section>
        {safetyMode ? <form className="message-safety-form" onSubmit={submitSafety}><label>{safetyMode === "report" ? "Tell our safety team what happened" : "Reason (optional)"}<textarea name="reason" required={safetyMode === "report"} minLength={safetyMode === "report" ? 10 : undefined} maxLength={2000} /></label><div><button type="button" onClick={() => setSafetyMode(null)}>Cancel</button><button type="submit">{safetyMode === "report" ? "Submit report" : "Block profile"}</button></div></form> : null}
        <p className="encrypted-note"><ShieldCheck size={15} /> Messages use authenticated, access-logged delivery and encrypted transport.</p>
      </aside>
    </div>
  );
}

function Initials({ name = "Nestora", compact = false, large = false }) {
  const value = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className={`conversation-initials ${compact ? "compact" : ""} ${large ? "large" : ""}`}>{value}</span>;
}

function roleLabel(role) {
  return ({ agent: "Property professional", host: "Hospitality host", developer: "Developer representative", agency_admin: "Agency administrator", admin: "Nestora administrator", member: "Nestora member" })[role] || "Nestora member";
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString() ? formatTime(value) : date.toLocaleDateString([], { month: "short", day: "numeric" });
}
