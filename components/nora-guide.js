"use client";
import Link from "next/link";
import { ArrowRight, Bot, Building2, CalendarCheck2, Home, MapPin, MessageCircle, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useState } from "react";

const guidance = {
  "Find a rental": "Tell me the Abuja areas you prefer, your annual budget and how many bedrooms you need. I will take you straight to matching homes.",
  "Plan a stay": "Choose your dates, guest count and the kind of stay you want. I can help compare total prices, not just the nightly rate.",
  "Check a listing": "Look for the Nestora Verified mark, a recent update signal and a complete fee table. You can also request documents from the professional profile.",
};
export function NoraGuide() {
  const [open, setOpen] = useState(false); const [messages, setMessages] = useState([{ from: "nora", text: "Hello, I’m Nora, Nestora’s digital guide. I can help you find a place, compare costs or understand the next step." }]); const [draft, setDraft] = useState("");
  function ask(text) { const prompt = text.trim(); if (!prompt) return; const response = guidance[prompt] || "I can help with that. For the clearest answer, include the place, timing and budget you have in mind. I’ll keep recommendations inside Nestora’s verified inventory."; setMessages((current) => [...current, { from: "you", text: prompt }, { from: "nora", text: response }]); setDraft(""); }
  return <div className={`nora ${open ? "nora--open" : ""}`}><button type="button" className="nora-launcher" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close Nora digital guide" : "Open Nora digital guide"} aria-expanded={open}>{open ? <X size={21} /> : <><Sparkles size={20} /><span>Ask Nora</span></>}</button>{open ? <section className="nora-panel" role="dialog" aria-label="Nora, Nestora digital guide"><header><span><Bot size={20} /></span><div><strong>Nora</strong><small>Digital guide · Online</small></div><Link href="/nora" aria-label="Open full Nora guide"><ArrowRight size={17} /></Link></header><div className="nora-messages" aria-live="polite">{messages.map((message, index) => <p className={`nora-message nora-message--${message.from}`} key={`${message.from}-${index}`}>{message.text}</p>)}</div>{messages.length < 3 ? <div className="nora-suggestions">{Object.keys(guidance).map((item, index) => { const icons = [Home, CalendarCheck2, ShieldCheck]; const Icon = icons[index]; return <button type="button" onClick={() => ask(item)} key={item}><Icon size={15} />{item}</button>; })}</div> : null}<form onSubmit={(event) => { event.preventDefault(); ask(draft); }}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about a place or next step" aria-label="Message Nora" /><button type="submit" aria-label="Send to Nora"><Send size={17} /></button></form><footer><ShieldCheck size={12} /> Nora provides guidance, not legal or financial advice.</footer></section> : null}</div>;
}
