"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, BarChart3, Bell, Building2, CalendarCheck2, Check, ChevronDown, ChevronRight, CircleDollarSign, Clock3, Eye, FileCheck2, HelpCircle, Home, Hotel, Info, Landmark, LayoutDashboard, Menu, MessageCircle, MoreHorizontal, Plus, Search, Settings, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";
import { useState } from "react";
import { properties } from "@/lib/data";
import { formatNaira } from "@/lib/platform";

const roleConfig = {
  agent: { label: "Agent", company: "Bello & Co. Living", icon: Building2, focus: "client pipeline" },
  host: { label: "Host", company: "The Nook Collection", icon: Hotel, focus: "guest operations" },
  developer: { label: "Developer", company: "Northline Developments", icon: Landmark, focus: "project delivery" },
  agency: { label: "Agency", company: "Bello & Co. Living", icon: UsersRound, focus: "portfolio performance" },
};
const pipeline = [
  { name: "Adaeze Nwosu", property: "The Courtyard Residence", stage: "Viewing confirmed", time: "Thu · 4:30 pm", avatar: "AN" },
  { name: "Kelechi Eze", property: "Maitama Ridge Villa", stage: "Documents shared", time: "Updated 22 min ago", avatar: "KE" },
  { name: "Folasade A.", property: "Guzape Garden Duplex", stage: "New enquiry", time: "Received 41 min ago", avatar: "FA" },
];

export function ProWorkspace({ role }) {
  const config = roleConfig[role]; const Icon = config.icon;
  const [section, setSection] = useState("Overview"); const [mobileNav, setMobileNav] = useState(false); const [notice, setNotice] = useState("");
  const nav = [["Overview", LayoutDashboard], ["Listings", Building2], [role === "host" ? "Reservations" : role === "developer" ? "Projects" : "Pipeline", UsersRound], ["Calendar", CalendarCheck2], ["Messages", MessageCircle], ["Performance", BarChart3], ["Documents", FileCheck2]];
  function action(message) { setNotice(message); window.setTimeout(() => setNotice(""), 2600); }
  return (
    <div className="pro-shell">
      <aside className={`pro-sidebar ${mobileNav ? "open" : ""}`}>
        <Link href="/workspace" className="pro-brand"><span><Icon size={19} /></span><div><strong>{config.company}</strong><small>{config.label} workspace</small></div></Link>
        <nav>{nav.map(([item, ItemIcon]) => <button type="button" className={section === item ? "active" : ""} onClick={() => { setSection(item); setMobileNav(false); }} key={item}><ItemIcon size={18} />{item}{item === "Messages" ? <b>3</b> : null}</button>)}</nav>
        <div className="pro-sidebar__bottom"><Link href="/trust"><ShieldCheck size={17} />Trust centre</Link><button type="button" onClick={() => setSection("Settings")}><Settings size={17} />Settings</button><button type="button" onClick={() => action("Support request started")}><HelpCircle size={17} />Help and support</button></div>
      </aside>
      <div className="pro-main">
        <header className="pro-topbar"><button type="button" className="pro-menu" onClick={() => setMobileNav((value) => !value)} aria-label="Open workspace menu"><Menu size={20} /></button><label><Search size={17} /><input placeholder="Search listings, clients or messages" /></label><button type="button" className="pro-alert" aria-label="Notifications"><Bell size={19} /><span>3</span></button><div className="pro-user"><span><Image src="/images/nestora/amina-bello-agent.webp" alt="Fictional QA account" fill sizes="38px" /></span><div><strong>Amina Demo</strong><small>{config.label} demo account</small></div><ChevronDown size={14} /></div></header>
        <div className="pro-content">
          {notice ? <div className="workspace-toast"><Check size={16} />{notice}</div> : null}
          <div className="workspace-demo-notice" role="note"><Info size={16} /><span><strong>Fictional QA workspace.</strong> People, businesses, activity, and analytics on this screen are illustrative.</span></div>
          {section === "Overview" ? <WorkspaceOverview role={role} config={config} action={action} /> : section === "Listings" ? <ListingsWorkspace action={action} /> : section === "Pipeline" || section === "Reservations" || section === "Projects" ? <PipelineWorkspace title={section} /> : <WorkspacePlaceholder section={section} />}
        </div>
      </div>
    </div>
  );
}

function WorkspaceOverview({ role, config, action }) { return <><div className="pro-title"><div><p className="eyebrow">Tuesday, 14 July</p><h1>Good afternoon, Amina.</h1><p>Here is what needs attention across your {config.focus}.</p></div><button type="button" className="button button--coral" onClick={() => action("New listing workflow opened")}><Plus size={17} />{role === "developer" ? "Add project" : "Add listing"}</button></div><section className="metric-grid"><article><span><Eye size={19} /></span><p>Listing views</p><strong>12,840</strong><small><TrendingUp size={13} /> 18.4% this month</small></article><article><span><MessageCircle size={19} /></span><p>New enquiries</p><strong>46</strong><small><TrendingUp size={13} /> 8 this week</small></article><article><span><CalendarCheck2 size={19} /></span><p>{role === "host" ? "Confirmed stays" : "Scheduled viewings"}</p><strong>12</strong><small>4 need preparation</small></article><article><span><CircleDollarSign size={19} /></span><p>{role === "host" ? "Net earnings" : "Pipeline value"}</p><strong>{formatNaira(role === "host" ? 4280000 : 685000000, true)}</strong><small>Current period</small></article></section><div className="workspace-columns"><section className="workspace-panel pipeline-panel"><div className="panel-heading"><div><h2>Client activity</h2><p>Highest-priority conversations and next steps.</p></div><button type="button">View all <ChevronRight size={15} /></button></div>{pipeline.map((lead) => <article key={lead.name}><span>{lead.avatar}</span><div><strong>{lead.name}</strong><small>{lead.property}</small></div><b>{lead.stage}</b><time><Clock3 size={13} />{lead.time}</time><button type="button" aria-label={`Open ${lead.name}`}><ChevronRight size={17} /></button></article>)}</section><aside className="workspace-panel today-panel"><div className="panel-heading"><div><h2>Today</h2><p>3 items on your schedule</p></div><button type="button" aria-label="Schedule options"><MoreHorizontal size={18} /></button></div><div><span>10:00</span><p><b>Listing quality review</b><small>Katampe Court · Video call</small></p></div><div><span>14:00</span><p><b>Title document check</b><small>Maitama Ridge Villa</small></p></div><div><span>16:30</span><p><b>Property viewing</b><small>The Courtyard Residence</small></p></div><button className="button button--outline" type="button" onClick={() => action("Calendar opened")}>Open calendar</button></aside></div><section className="workspace-panel inventory-panel"><div className="panel-heading"><div><h2>Portfolio health</h2><p>Current listings and freshness status.</p></div><button type="button" onClick={() => action("Portfolio report prepared")}>Download report</button></div><ListingTable /></section></>; }
function ListingTable() { return <div className="listing-table"><header><span>Property</span><span>Status</span><span>Views</span><span>Enquiries</span><span>Updated</span><span /></header>{properties.slice(0,4).map((property, index) => <Link href={`/properties/${property.id}`} key={property.id}><span className="table-property"><i><Image src={property.image} alt="" fill sizes="54px" /></i><b>{property.title}<small>{property.location}</small></b></span><span><em className={index === 2 ? "attention" : "live"}>{index === 2 ? "Needs update" : "Live"}</em></span><span>{[3280,2460,1940,1730][index]}</span><span>{[18,12,9,7][index]}</span><span>{index === 2 ? "8 days ago" : property.fresh}</span><span><ChevronRight size={16} /></span></Link>)}</div>; }
function ListingsWorkspace({ action }) { return <><div className="pro-title"><div><p className="eyebrow">Portfolio</p><h1>Listings</h1><p>Keep presentation, pricing and availability current.</p></div><button className="button button--coral" type="button" onClick={() => action("New listing workflow opened")}><Plus size={17} />Add listing</button></div><section className="workspace-panel inventory-panel"><ListingTable /></section></>; }
function PipelineWorkspace({ title }) { return <><div className="pro-title"><div><p className="eyebrow">Active work</p><h1>{title}</h1><p>Move each opportunity forward with complete context.</p></div></div><section className="kanban-board">{["New", "In progress", "Ready to close"].map((stage, stageIndex) => <div key={stage}><header><h2>{stage}</h2><span>{stageIndex + 1}</span></header>{pipeline.slice(0, stageIndex + 1).map((lead) => <article key={`${stage}-${lead.name}`}><span>{lead.avatar}</span><h3>{lead.name}</h3><p>{lead.property}</p><small>{lead.time}</small></article>)}</div>)}</section></>; }
function WorkspacePlaceholder({ section }) { return <><div className="pro-title"><div><p className="eyebrow">Workspace</p><h1>{section}</h1><p>Your {section.toLowerCase()} tools and records are kept here.</p></div></div><div className="workspace-placeholder"><Home size={28} /><h2>{section} is ready</h2><p>Connect your organisation data source to populate this view.</p></div></>; }
