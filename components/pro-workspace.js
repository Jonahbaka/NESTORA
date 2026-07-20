"use client";

import Image from "next/image";
import Link from "next/link";
import { Archive, ArrowDown, ArrowUp, ArrowRight, BarChart3, Bell, Building2, CalendarCheck2, Camera, Check, ChevronRight, CircleDollarSign, Eye, FileImage, FileText, Globe2, Hotel, Images, Landmark, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, RefreshCw, ScanLine, Search, Settings, ShieldCheck, Trash2, Upload, UserRound, UsersRound, Video, X, Palette, LayoutTemplate } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNestora } from "@/components/providers";
import { formatNaira } from "@/lib/platform";
import { PartnerWebsites } from "@/components/partner-websites";
import { SubscriptionManager } from "@/components/subscription-manager";
import { MarketingStudio } from "@/components/marketing-studio";
import { BrandKitManager } from "@/components/brand-kit-manager";
import { TemplateGallery } from "@/components/template-gallery";

const roleLabels = { agent: "Agent", host: "Hospitality", developer: "Developer", agency: "Agency" };

const navigationByRole = {
  agent: [nav("Overview", "overview", LayoutDashboard), nav("Professional profile", "profile", UserRound), nav("Listings", "listings", Building2), nav("Leads", "leads", UsersRound), nav("Inspections", "inspections", CalendarCheck2), nav("Messages", "messages", MessageCircle), nav("Marketing Studio", "marketing-studio", FileImage), nav("Brand kits", "brand-kits", Palette), nav("Template gallery", "templates", LayoutTemplate), nav("Websites", "websites", Globe2), nav("Subscription", "subscription", Settings)],
  host: [nav("Overview", "overview", LayoutDashboard), nav("Professional profile", "profile", UserRound), nav("Listings", "listings", Building2), nav("Rooms", "hotel-rooms", Hotel), nav("Reservations", "hotel-reservations", CalendarCheck2), nav("Messages", "messages", MessageCircle), nav("Marketing Studio", "marketing-studio", FileImage), nav("Brand kits", "brand-kits", Palette), nav("Template gallery", "templates", LayoutTemplate), nav("Websites", "websites", Globe2), nav("Subscription", "subscription", Settings)],
  developer: [nav("Overview", "overview", LayoutDashboard), nav("Professional profile", "profile", UserRound), nav("Listings", "listings", Building2), nav("Projects", "developer-projects", Landmark), nav("Inventory", "developer-units", Building2), nav("Buyer leads", "leads", UsersRound), nav("Inspections", "inspections", CalendarCheck2), nav("Messages", "messages", MessageCircle), nav("Marketing Studio", "marketing-studio", FileImage), nav("Brand kits", "brand-kits", Palette), nav("Template gallery", "templates", LayoutTemplate), nav("Websites", "websites", Globe2), nav("Subscription", "subscription", Settings)],
  agency: [nav("Overview", "overview", LayoutDashboard), nav("Professional profile", "profile", UserRound), nav("Listings", "listings", Building2), nav("Lead desk", "leads", UsersRound), nav("Inspections", "inspections", CalendarCheck2), nav("Team & routing", "team", UsersRound), nav("Messages", "messages", MessageCircle), nav("Marketing Studio", "marketing-studio", FileImage), nav("Brand kits", "brand-kits", Palette), nav("Template gallery", "templates", LayoutTemplate), nav("Websites", "websites", Globe2), nav("Subscription", "subscription", Settings)],
};

export function ProWorkspace({ role }) {
  const navItems = navigationByRole[role];
  const [section, setSection] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const { account: sessionAccount, logout } = useNestora();
  const apiResource = resourceForSection(section);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (section === "messages") return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/workspace/${apiResource}?workspace=${role}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Workspace data could not be loaded.");
      setData(payload);
    } catch (loadError) {
      setError(loadError.message);
      setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiResource, role, section]);
  const reload = useCallback(() => load({ silent: true }), [load]);

  useEffect(() => { load(); }, [load]);

  function changeSection(next) {
    if (next === "messages") { window.location.assign("/messages"); return; }
    setSection(next);
    setMobileNav(false);
  }

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }, []);

  const account = data?.account || sessionAccount;
  const organizationName = data?.account?.organization?.name || `${roleLabels[role]} workspace`;
  const activeNav = navItems.find((item) => item.key === section) || navItems[0];

  return (
    <div className="pro-shell">
      <aside className={`pro-sidebar ${mobileNav ? "open" : ""}`}>
        <button className="pro-mobile-close" type="button" onClick={() => setMobileNav(false)} aria-label="Close workspace menu"><X size={19} /></button>
        <Link href="/" className="pro-brand"><span>{roleIcon(role)}</span><div><strong>{organizationName}</strong><small>{roleLabels[role]} workspace</small></div></Link>
        <nav>{navItems.map(({ key, label, Icon }) => <button type="button" className={section === key ? "active" : ""} onClick={() => changeSection(key)} key={key}><Icon size={18} />{label}</button>)}</nav>
        <div className="pro-sidebar__bottom"><Link href="/trust"><ShieldCheck size={17} />Trust centre</Link><button type="button" onClick={() => changeSection("entitlements")}><Settings size={17} />Settings</button><button type="button" onClick={() => logout()}><LogOut size={17} />Sign out</button></div>
      </aside>
      <div className="pro-main">
        <header className="pro-topbar"><button type="button" className="pro-menu" onClick={() => setMobileNav(true)} aria-label="Open workspace menu"><Menu size={20} /></button><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeNav.label.toLowerCase()}`} /></label><button type="button" className="pro-alert" aria-label="Notifications"><Bell size={19} /></button><div className="pro-user"><Initials name={account?.name} /><div><strong>{account?.name || "Nestora professional"}</strong><small>{roleLabels[role]}</small></div></div></header>
        <div className="pro-content">
          {notice ? <div className="workspace-toast"><Check size={16} />{notice}</div> : null}
          {error ? <WorkspaceError message={error} retry={load} /> : null}
          {loading ? <WorkspaceLoading /> : null}
          {!loading && !error ? <WorkspaceSection section={section} role={role} data={data || {}} query={query} reload={reload} notify={showNotice} logout={logout} /> : null}
        </div>
      </div>
    </div>
  );
}

function WorkspaceSection({ section, role, data, query, reload, notify, logout }) {
  if (section === "overview") return <Overview role={role} data={data} />;
  if (section === "profile") return <ProfessionalProfile data={data} role={role} reload={reload} notify={notify} />;
  if (section === "listings") return <Listings data={data} role={role} query={query} reload={reload} notify={notify} />;
  if (section === "leads") return <Leads data={data} query={query} role={role} reload={reload} notify={notify} />;
  if (section === "inspections") return <Inspections data={data} query={query} role={role} reload={reload} notify={notify} />;
  if (section === "hotel-rooms") return <HotelOperations data={data} mode="rooms" role={role} reload={reload} notify={notify} />;
  if (section === "hotel-reservations") return <HotelOperations data={data} mode="reservations" role={role} reload={reload} notify={notify} />;
  if (section === "developer-projects") return <DeveloperOperations data={data} mode="projects" role={role} reload={reload} notify={notify} />;
  if (section === "developer-units") return <DeveloperOperations data={data} mode="units" role={role} reload={reload} notify={notify} />;
  if (section === "team") return <TeamOperations data={data} role={role} reload={reload} notify={notify} />;
  if (section === "marketing") return <Marketing data={data} role={role} reload={reload} notify={notify} />;
  if (section === "marketing-studio") return <MarketingStudio data={data} reload={reload} />;
  if (section === "brand-kits") return <BrandKitManager data={data} role={role} reload={reload} notify={notify} />;
  if (section === "templates") return <TemplateGallery data={data} />;
  if (section === "websites") return <PartnerWebsites data={data} role={role} reload={reload} notify={notify} />;
  if (section === "subscription") return <SubscriptionManager data={data} role={role} reload={reload} notify={notify} />;
  return <PlanSettings data={data} logout={logout} />;
}

function resourceForSection(section) {
  if (section === "marketing-studio") return "marketing";
  if (section === "brand-kits") return "brand-kits";
  if (section === "templates") return "templates";
  if (section.startsWith("hotel-")) return "hotel";
  if (section.startsWith("developer-")) return "developer";
  return section;
}

function ProfessionalProfile({ data, role, reload, notify }) {
  const profile = data.profile || {};
  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await performWrite("profile", role, {
      action: "update",
      headline: form.get("headline"),
      biography: form.get("biography"),
      serviceAreas: splitList(form.get("serviceAreas")),
      languages: splitList(form.get("languages")),
      specialisations: splitList(form.get("specialisations")),
      isPublic: form.get("isPublic") === "on",
    }, notify);
    if (result) await reload();
  }
  async function upload(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const response = await fetch("/api/profile-media", { method: "POST", body: new FormData(formElement) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { notify(payload.error || "The profile image could not be uploaded."); return; }
    formElement.reset(); notify("Profile image updated."); await reload();
  }
  async function removeImage() {
    const response = await fetch("/api/profile-media", { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { notify(payload.error || "The profile image could not be removed."); return; }
    notify("Profile image removed."); await reload();
  }
  return <><Title eyebrow="Professional identity" title="Public profile" copy="Keep the information customers use to understand your expertise and coverage current." action={profile.publicUrl && profile.isPublic ? <Link className="button button--outline" href={profile.publicUrl} target="_blank"><Globe2 size={17} />View public profile</Link> : null} /><div className="profile-workspace-grid"><section className="workspace-panel profile-photo-panel"><div className="profile-photo">{profile.imageUrl ? <Image src={profile.imageUrl} alt="Professional profile" width={240} height={240} unoptimized /> : <UserRound size={54} />}</div><div><h2>Profile image</h2><p>Use a clear square or portrait image. JPG, PNG and WebP are supported.</p></div><form onSubmit={upload} className="profile-photo-actions"><label className="button button--outline"><Camera size={17} />Choose image<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label><button className="button button--ink" type="submit">Upload</button>{profile.imageUrl ? <button className="icon-danger" type="button" onClick={removeImage} aria-label="Remove profile image"><Trash2 size={17} /></button> : null}</form></section><form className="workspace-form profile-editor" onSubmit={save}><label className="form-wide">Professional headline<input name="headline" required minLength={3} maxLength={140} defaultValue={profile.headline || ""} placeholder="Abuja residential property advisor" /></label><label className="form-wide">Biography<textarea name="biography" required minLength={20} maxLength={3000} defaultValue={profile.biography || ""} /></label><label>Agency affiliation<input value={profile.organization?.name || "Independent professional"} readOnly aria-readonly="true" /></label><label>Service areas<input name="serviceAreas" defaultValue={(profile.serviceAreas || []).join(", ")} placeholder="Maitama, Wuye, Guzape" /></label><label>Languages<input name="languages" defaultValue={(profile.languages || []).join(", ")} placeholder="English, Hausa" /></label><label>Specialisations<input name="specialisations" defaultValue={(profile.specialisations || []).join(", ")} placeholder="Residential rentals, Buyer representation" /></label><label className="profile-visibility form-wide"><input name="isPublic" type="checkbox" defaultChecked={profile.isPublic !== false} /><span><strong>Publish professional profile</strong><small>Customers can discover this profile and its active verified listings.</small></span></label><div className="form-actions form-wide"><span className="status-pill">{humanize(profile.verificationStatus || "not_submitted")}</span><button className="button button--ink" type="submit">Save profile</button></div></form></div></>;
}

function Overview({ role, data }) {
  const metrics = data.metrics || {};
  const labels = {
    activeListings: ["Active listings", Building2], openLeads: ["Open leads", UsersRound], inspections: ["Upcoming inspections", CalendarCheck2], unreadConversations: ["Unread conversations", MessageCircle], availableRooms: ["Available rooms", Hotel], reservations: ["Active reservations", CalendarCheck2], revenue: ["Confirmed revenue", CircleDollarSign],
  };
  return <><Title eyebrow={new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })} title={`Welcome to your ${roleLabels[role].toLowerCase()} workspace.`} copy="Live operational records that need your attention." /><section className="metric-grid">{Object.entries(metrics).map(([key, value]) => { const [label, Icon] = labels[key] || [humanize(key), BarChart3]; return <article key={key}><span><Icon size={19} /></span><p>{label}</p><strong>{key === "revenue" ? formatNaira(value, true) : value}</strong><small>Current workspace</small></article>; })}</section><section className="workspace-panel workspace-welcome"><div><ShieldCheck size={22} /><h2>Tenant-protected operations</h2><p>Records shown here are limited to your authenticated account and active organization membership. Changes are written to the audit log.</p></div><Link href="/messages" className="button button--ink">Open messages <ChevronRight size={16} /></Link></section></>;
}

function Listings({ data, role, query, reload, notify }) {
  const [creating, setCreating] = useState(false);
  const [mediaListing, setMediaListing] = useState(null);
  const listings = (data.listings || []).filter((item) => `${item.title} ${item.location}`.toLowerCase().includes(query.toLowerCase()));
  async function create(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await performWrite("listings", role, { action: "create", category: form.get("category"), ...listingPayload(form) }, notify);
    if (!result) return;
    formElement.reset(); setCreating(false); await reload();
  }
  async function update(item, event) {
    const form = new FormData(event.currentTarget);
    const result = await performWrite("listings", role, { action: "update", id: item.id, ...listingPayload(form) }, notify);
    if (!result) return;
    await reload();
  }
  async function listingAction(item, action) {
    const result = await performWrite("listings", role, { action, id: item.id }, notify);
    if (result) await reload();
  }
  return <><Title eyebrow="Portfolio" title="Listings and media" copy="Build complete property records, submit them for review, and publish only after approval." action={<button className="button button--coral" type="button" onClick={() => setCreating((value) => !value)}><Plus size={17} />Add listing</button>} />{creating ? <form className="workspace-form listing-editor listing-editor--create" onSubmit={create}><label>Category<select name="category" defaultValue={role === "host" ? "stay" : role === "developer" ? "development" : "rent"}><option value="rent">Rental</option><option value="sale">Sale</option><option value="stay">Stay</option><option value="development">Development</option></select></label><ListingFields /><div className="form-actions form-wide"><button type="button" onClick={() => setCreating(false)}>Cancel</button><button className="button button--ink" type="submit">Create draft</button></div></form> : null}<div className="workspace-records listing-records">{listings.length ? listings.map((item) => <article className="workspace-record listing-record" key={item.id}><header className="listing-record__head"><div className="record-primary"><strong>{item.title}</strong><small>{humanize(item.category)} | {item.location}</small></div><div className="listing-status"><span className={`status-pill status-pill--${item.verification_status}`}>{listingStatus(item)}</span><small>{item.media_count} media | {item.panorama_count} scenes</small></div></header>{item.review_note && item.verification_status === "rejected" ? <p className="listing-review-note"><ShieldCheck size={16} /><span><strong>Review feedback</strong>{item.review_note}</span></p> : null}<form className="workspace-form listing-editor" onSubmit={(event) => { event.preventDefault(); update(item, event); }}><ListingFields item={item} /><div className="form-actions form-wide listing-actions"><button type="button" onClick={() => setMediaListing(mediaListing === item.id ? null : item.id)}><FileImage size={16} />Media ({item.media_count})</button><Link href={`/properties/${item.id}?preview=1`} target="_blank"><Eye size={16} />Preview</Link><button type="button" onClick={() => listingAction(item, "archive")}><Archive size={16} />Archive</button><button className="button button--outline" type="submit">Save draft</button><button className="button button--coral" type="button" disabled={item.verification_status === "pending"} onClick={() => listingAction(item, "submit")}><ArrowRight size={16} />{item.verification_status === "pending" ? "Review pending" : "Submit for review"}</button></div></form>{mediaListing === item.id ? <MediaManager listingId={item.id} notify={notify} onChanged={reload} /> : null}</article>) : <EmptyState title="No listings yet" copy="Create the first complete draft to begin building your portfolio." />}</div></>;
}

function ListingFields({ item = {} }) {
  const fees = item.fees || {};
  return <><label className="form-wide">Listing title<input name="title" required minLength={3} maxLength={140} defaultValue={item.title || ""} /></label><label>Property type<input name="propertyType" required minLength={2} maxLength={80} defaultValue={item.property_type || ""} placeholder="Apartment, duplex, serviced suite" /></label><label>Address line 1<input name="addressLine1" required defaultValue={item.address_line1 || ""} placeholder="12 Example Crescent" /></label><label>Address line 2<input name="addressLine2" defaultValue={item.address_line2 || ""} placeholder="Estate or district (optional)" /></label><label>City<input name="city" required defaultValue={item.city || "Abuja"} /></label><label>State / FCT<input name="stateRegion" required defaultValue={item.state_region || "FCT"} /></label><label>Postal code<input name="postalCode" defaultValue={item.postal_code || ""} /></label><label>Price (NGN)<input name="priceAmount" type="number" min="0" step="1" required defaultValue={item.price_amount ?? ""} /></label><label>Bedrooms<input name="bedrooms" type="number" min="0" max="100" defaultValue={item.bedrooms ?? ""} /></label><label>Bathrooms<input name="bathrooms" type="number" min="0" max="100" step="0.5" defaultValue={item.bathrooms ?? ""} /></label><label>Area (sqm)<input name="areaSqm" type="number" min="1" step="0.01" defaultValue={item.area_sqm ?? ""} /></label><label>Availability<select name="availabilityStatus" defaultValue={item.availability_status || "available"}><option value="available">Available</option><option value="coming_soon">Coming soon</option><option value="occupied">Occupied</option><option value="unavailable">Unavailable</option></select></label><label>Available from<input name="availableFrom" type="date" defaultValue={dateInput(item.available_from)} /></label><label className="form-wide">Description<textarea name="description" required minLength={20} maxLength={5000} defaultValue={item.description || ""} /></label><label className="form-wide">Features<input name="features" defaultValue={(item.features || []).join(", ")} placeholder="Balcony, inverter, fitted kitchen, parking" /></label><fieldset className="listing-fees form-wide"><legend>Published fees (NGN)</legend><label>Service charge<input name="serviceCharge" type="number" min="0" step="1" defaultValue={fees.serviceCharge || 0} /></label><label>Caution deposit<input name="cautionDeposit" type="number" min="0" step="1" defaultValue={fees.cautionDeposit || 0} /></label><label>Agency fee<input name="agencyFee" type="number" min="0" step="1" defaultValue={fees.agencyFee || 0} /></label><label>Legal fee<input name="legalFee" type="number" min="0" step="1" defaultValue={fees.legalFee || 0} /></label><label>Cleaning fee<input name="cleaningFee" type="number" min="0" step="1" defaultValue={fees.cleaningFee || 0} /></label></fieldset><label className="profile-visibility form-wide"><input name="tourEnabled" type="checkbox" defaultChecked={Boolean(item.tour_enabled)} /><span><strong>Enable virtual tour</strong><small>Requires a walkthrough video or at least one labelled 360 scene before submission.</small></span></label></>;
}

function MediaManager({ listingId, notify, onChanged }) {
  const [media, setMedia] = useState([]); const [loading, setLoading] = useState(true); const [uploadRole, setUploadRole] = useState("gallery");
  const load = useCallback(async () => { const response = await fetch(`/api/media?listingId=${encodeURIComponent(listingId)}`, { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setMedia(payload.media || []); setLoading(false); }, [listingId]);
  useEffect(() => { load().catch((error) => { notify(error.message); setLoading(false); }); }, [load, notify]);
  async function upload(event) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); form.set("listingId", listingId); const response = await fetch("/api/media", { method: "POST", body: form }); const payload = await response.json(); if (!response.ok) { notify(payload.error); return; } formElement.reset(); setUploadRole("gallery"); notify("Media uploaded securely."); await load(); await onChanged(); }
  async function remove(id) { const response = await fetch(`/api/media?id=${id}`, { method: "DELETE" }); const payload = await response.json(); if (!response.ok) { notify(payload.error); return; } notify("Media removed."); await load(); await onChanged(); }
  async function patchMedia(body) { const response = await fetch("/api/media", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) { notify(payload.error); return; } notify("Media updated."); await load(); await onChanged(); }
  async function updateRole(item, event) { event.preventDefault(); const form = new FormData(event.currentTarget); await patchMedia({ action: "setRole", id: item.id, mediaRole: form.get("mediaRole"), sceneLabel: form.get("sceneLabel") }); }
  return <section className="media-manager"><header><div><h3>Property media</h3><p>Assign a purpose, choose the cover, order the gallery, and label every 360 room scene.</p></div></header><form className="media-upload-form" onSubmit={upload}><label>Purpose<select name="mediaRole" value={uploadRole} onChange={(event) => setUploadRole(event.target.value)}><option value="gallery">Gallery image</option><option value="cover">Cover image</option><option value="walkthrough">Walkthrough video</option><option value="floor_plan">Floor plan</option><option value="panorama">360 scene</option></select></label>{uploadRole === "panorama" ? <label>Room label<input name="sceneLabel" minLength={2} maxLength={80} required placeholder="Living room" /></label> : null}<label className="media-file-picker"><Upload size={16} /><span>Choose {humanize(uploadRole)}</span><input name="file" type="file" accept={mediaAccept(uploadRole)} required /></label><button className="button button--outline" type="submit">Upload</button></form>{loading ? <p>Loading media...</p> : <div className="media-list">{media.map((item, index) => <article key={item.id}><span>{mediaIcon(item)}</span><div className="media-file"><strong>{item.filename}</strong><small>{humanize(item.media_role)} | {formatBytes(item.byte_size)}{item.scene_label ? ` | ${item.scene_label}` : ""}</small></div><form className="media-metadata" onSubmit={(event) => updateRole(item, event)}><select name="mediaRole" defaultValue={normalizedMediaRole(item)} aria-label={`Purpose for ${item.filename}`}>{mediaRoleOptions(item.kind).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input name="sceneLabel" defaultValue={item.scene_label || ""} placeholder="Room label for 360" aria-label={`Scene label for ${item.filename}`} /><button type="submit">Save</button></form><div className="media-row-actions"><button type="button" disabled={index === 0} onClick={() => patchMedia({ action: "move", id: item.id, direction: "up" })} aria-label={`Move ${item.filename} up`} title="Move up"><ArrowUp size={15} /></button><button type="button" disabled={index === media.length - 1} onClick={() => patchMedia({ action: "move", id: item.id, direction: "down" })} aria-label={`Move ${item.filename} down`} title="Move down"><ArrowDown size={15} /></button><a href={item.url} target="_blank" rel="noreferrer" aria-label={`Preview ${item.filename}`} title="Preview"><Eye size={15} /></a><button className="media-delete" type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.filename}`} title="Remove"><Trash2 size={15} /></button></div></article>)}{!media.length ? <p>No media uploaded.</p> : null}</div>}</section>;
}

function Leads({ data, query, role, reload, notify }) {
  const leads = (data.leads || []).filter((item) => `${item.customer_name} ${item.listing_title || ""}`.toLowerCase().includes(query.toLowerCase()));
  async function save(item, event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("leads", role, { action: "update", id: item.id, stage: form.get("stage"), priority: form.get("priority"), nextAction: form.get("nextAction"), ownerUserId: form.get("ownerUserId") || null }, notify); if (result) await reload(); }
  return <><Title eyebrow="Relationship desk" title="Enquiries and leads" copy="Move every verified enquiry forward with an owner, stage and next action." /><div className="workspace-records">{leads.map((item) => <form className="workspace-record compact" key={item.id} onSubmit={(event) => save(item, event)}><div className="record-primary"><strong>{item.customer_name}</strong><small>{item.listing_title || "General enquiry"} · {item.customer_email}</small></div>{role === "agency" ? <label>Owner<select name="ownerUserId" defaultValue={item.owner_user_id || ""}><option value="">Keep current owner</option>{(data.teamMembers || []).map((member) => <option value={member.user_id} key={member.user_id}>{member.name} · {humanize(member.role)}</option>)}</select></label> : null}<label>Stage<select name="stage" defaultValue={item.stage}>{["new","contacted","qualified","inspection","reservation","won","lost"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label>Priority<select name="priority" defaultValue={item.priority}>{["low","normal","high","urgent"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label className="record-notes">Next action<input name="nextAction" defaultValue={item.next_action || ""} /></label><div className="record-actions"><Link href="/messages"><MessageCircle size={16} />Message</Link><button className="button button--ink" type="submit">Update</button></div></form>)}{!leads.length ? <EmptyState title="No open leads" copy="New listing enquiries will appear here automatically." /> : null}</div></>;
}

function Inspections({ data, query, role, reload, notify }) {
  const items = (data.inspections || []).filter((item) => `${item.customer_name} ${item.listing_title}`.toLowerCase().includes(query.toLowerCase()));
  async function save(item, event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("inspections", role, { action: "update", id: item.id, status: form.get("status"), scheduledAt: new Date(form.get("scheduledAt")).toISOString(), notes: form.get("notes") }, notify); if (result) await reload(); }
  return <><Title eyebrow="Calendar" title="Inspections" copy="Confirm schedules, record preparation notes and close completed viewings." /><div className="workspace-records">{items.map((item) => <form className="workspace-record compact" key={item.id} onSubmit={(event) => save(item, event)}><div className="record-primary"><strong>{item.customer_name}</strong><small>{item.listing_title} · {item.location}</small></div><label>Status<select name="status" defaultValue={item.status}>{["proposed","confirmed","reschedule_requested","cancelled","completed"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label>Schedule<input name="scheduledAt" type="datetime-local" defaultValue={toLocalDateTime(item.scheduled_at)} required /></label><label className="record-notes">Notes<textarea name="notes" defaultValue={item.notes || ""} /></label><div className="record-actions"><button className="button button--ink" type="submit">Save inspection</button></div></form>)}{!items.length ? <EmptyState title="No inspections scheduled" copy="Confirmed lead inspections will appear here." /> : null}</div></>;
}

function HotelOperations({ data, mode, role, reload, notify }) {
  const [creating, setCreating] = useState(null);
  async function updateReservation(item, event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("hotel", role, { action: "reservation", id: item.id, status: form.get("status"), paymentStatus: form.get("paymentStatus") }, notify); if (result) await reload(); }
  async function updateRoom(item, event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("hotel", role, { action: "room", id: item.id, status: form.get("status") }, notify); if (result) await reload(); }
  async function createRoomType(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("hotel", role, { action: "roomType", listingId: form.get("listingId"), code: form.get("code"), name: form.get("name"), capacity: Number(form.get("capacity")), nightlyRate: Number(form.get("nightlyRate")) }, notify); if (!result) return; setCreating(null); await reload(); }
  async function createRoom(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("hotel", role, { action: "roomCreate", roomTypeId: form.get("roomTypeId"), code: form.get("code") }, notify); if (!result) return; setCreating(null); await reload(); }
  if (mode === "rooms") return <><Title eyebrow="Hotel inventory" title="Rooms and availability" copy="Create listing-specific room categories and keep each physical room's operating status current." action={<div className="title-actions"><button className="button button--outline" type="button" onClick={() => setCreating("type")}>Room type</button><button className="button button--coral" type="button" onClick={() => setCreating("room")}><Plus size={17} />Add room</button></div>} />{creating === "type" ? <form className="workspace-form" onSubmit={createRoomType}><label>Stay listing<select name="listingId" required><option value="">Select stay listing</option>{(data.stayListings || []).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><label>Code<input name="code" required pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*" /></label><label>Name<input name="name" required /></label><label>Capacity<input name="capacity" type="number" min="1" max="30" required /></label><label>Nightly rate (NGN)<input name="nightlyRate" type="number" min="0" required /></label><div className="form-actions form-wide"><button type="button" onClick={() => setCreating(null)}>Cancel</button><button className="button button--ink" type="submit">Create room type</button></div></form> : null}{creating === "room" ? <form className="workspace-form" onSubmit={createRoom}><label>Room type<select name="roomTypeId" required><option value="">Select room type</option>{(data.roomTypes || []).map((item) => <option value={item.id} key={item.id}>{item.listing_title} · {item.name}</option>)}</select></label><label>Room code<input name="code" required pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*" /></label><div className="form-actions form-wide"><button type="button" onClick={() => setCreating(null)}>Cancel</button><button className="button button--ink" type="submit">Create room</button></div></form> : null}<div className="workspace-records">{(data.rooms || []).map((item) => <form className="workspace-record compact" key={item.id} onSubmit={(event) => updateRoom(item, event)}><div className="record-primary"><strong>{item.code}</strong><small>{item.listing_title} · {item.room_type} · capacity {item.capacity} · {formatNaira(item.nightly_rate)} / night</small></div><label>Status<select name="status" defaultValue={item.status}>{["available","occupied","maintenance","inactive"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><div className="record-actions"><button className="button button--ink" type="submit">Update room</button></div></form>)}{!data.rooms?.length ? <EmptyState title="No rooms configured" copy="Create a room type, then add the first physical room." /> : null}</div></>;
  return <><Title eyebrow="Guest operations" title="Reservations" copy="Confirm viable stays, track payment state and close completed visits." /><div className="workspace-records">{(data.reservations || []).map((item) => <form className="workspace-record compact" key={item.id} onSubmit={(event) => updateReservation(item, event)}><div className="record-primary"><strong>{item.guest_name}</strong><small>{item.room_code} · {formatDate(item.check_in)} to {formatDate(item.check_out)} · {formatNaira(item.total_amount)}</small></div><label>Status<select name="status" defaultValue={item.status}>{["requested","confirmed","declined","cancelled","completed"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label>Payment<select name="paymentStatus" defaultValue={item.payment_status}>{["unpaid","pending","paid","refunded","failed"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><div className="record-actions"><Link href="/messages"><MessageCircle size={16} />Message guest</Link><button className="button button--ink" type="submit">Save</button></div></form>)}</div></>;
}

function DeveloperOperations({ data, mode, role, reload, notify }) {
  const [creating, setCreating] = useState(null);
  async function saveUnit(item, event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("developer", role, { action: "unit", id: item.id, status: form.get("status"), priceAmount: Number(form.get("priceAmount")) }, notify); if (result) await reload(); }
  async function saveProject(item, event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("developer", role, { action: "development", id: item.id, progress: Number(form.get("progress")), paymentPlan: form.get("paymentPlan"), completionDate: form.get("completionDate") || null }, notify); if (result) await reload(); }
  async function createRecord(action, event) { event.preventDefault(); const form = new FormData(event.currentTarget); const body = action === "developmentCreate" ? { action, name: form.get("name"), location: form.get("location"), completionDate: form.get("completionDate") || null, paymentPlan: form.get("paymentPlan") } : action === "blockCreate" ? { action, developmentId: form.get("developmentId"), code: form.get("code"), name: form.get("name"), floors: Number(form.get("floors")) } : action === "unitTypeCreate" ? { action, developmentId: form.get("developmentId"), code: form.get("code"), name: form.get("name"), bedrooms: Number(form.get("bedrooms")), bathrooms: Number(form.get("bathrooms")), areaSqm: Number(form.get("areaSqm")), priceAmount: Number(form.get("priceAmount")) } : { action, developmentId: form.get("developmentId"), blockId: form.get("blockId"), unitTypeId: form.get("unitTypeId"), code: form.get("code"), floor: Number(form.get("floor")), priceAmount: Number(form.get("priceAmount")) }; const result = await performWrite("developer", role, body, notify); if (!result) return; setCreating(null); await reload(); }
  if (mode === "projects") return <><Title eyebrow="Development portfolio" title="Projects" copy="Create projects and maintain delivery progress, completion targets and payment plans." action={<button className="button button--coral" type="button" onClick={() => setCreating("developmentCreate")}><Plus size={17} />Add project</button>} />{creating === "developmentCreate" ? <form className="workspace-form" onSubmit={(event) => createRecord("developmentCreate", event)}><label>Name<input name="name" required /></label><label>Location<input name="location" required /></label><label>Completion<input name="completionDate" type="date" /></label><label className="form-wide">Payment plan<textarea name="paymentPlan" required /></label><div className="form-actions form-wide"><button type="button" onClick={() => setCreating(null)}>Cancel</button><button className="button button--ink" type="submit">Create project</button></div></form> : null}<div className="workspace-records">{(data.developments || []).map((item) => <form className="workspace-record" key={item.id} onSubmit={(event) => saveProject(item, event)}><div className="record-primary"><strong>{item.name}</strong><small>{item.location} · {item.status}</small></div><label>Progress<input name="progress" type="number" min="0" max="100" defaultValue={item.construction_progress} /></label><label>Completion<input name="completionDate" type="date" defaultValue={String(item.completion_date || "").slice(0,10)} /></label><label className="record-notes">Payment plan<textarea name="paymentPlan" defaultValue={item.payment_plan_summary || ""} required /></label><div className="record-actions"><button className="button button--ink" type="submit">Save project</button></div></form>)}{!data.developments?.length ? <EmptyState title="No projects yet" copy="Create the first development to begin structuring inventory." /> : null}</div></>;
  return <><Title eyebrow="Sales inventory" title="Blocks, unit types and units" copy="Build the inventory structure, then keep every unit's pricing and availability current." action={<div className="title-actions"><button className="button button--outline" type="button" onClick={() => setCreating("blockCreate")}>Add block</button><button className="button button--outline" type="button" onClick={() => setCreating("unitTypeCreate")}>Unit type</button><button className="button button--coral" type="button" onClick={() => setCreating("unitCreate")}><Plus size={17} />Add unit</button></div>} />{creating ? <DeveloperCreateForm mode={creating} data={data} submit={createRecord} cancel={() => setCreating(null)} /> : null}<div className="workspace-records">{(data.units || []).map((item) => <form className="workspace-record compact" key={item.id} onSubmit={(event) => saveUnit(item, event)}><div className="record-primary"><strong>{item.code} · {item.unit_type}</strong><small>{item.development_name} · {item.block_name} · floor {item.floor}</small></div><label>Status<select name="status" defaultValue={item.status}>{["available","reserved","sold","unavailable"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label>Price<input name="priceAmount" type="number" min="0" defaultValue={item.price_amount} /></label><div className="record-actions"><button className="button button--ink" type="submit">Update unit</button></div></form>)}{!data.units?.length ? <EmptyState title="No units yet" copy="Add a block and unit type before creating the first unit." /> : null}</div></>;
}

function DeveloperCreateForm({ mode, data, submit, cancel }) {
  const developmentOptions = (data.developments || []).map((item) => <option value={item.id} key={item.id}>{item.name}</option>);
  if (mode === "blockCreate") return <form className="workspace-form" onSubmit={(event) => submit(mode, event)}><label>Development<select name="developmentId" required><option value="">Select project</option>{developmentOptions}</select></label><label>Code<input name="code" required pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*" /></label><label>Name<input name="name" required /></label><label>Floors<input name="floors" type="number" min="1" max="250" required /></label><FormButtons cancel={cancel} label="Create block" /></form>;
  if (mode === "unitTypeCreate") return <form className="workspace-form" onSubmit={(event) => submit(mode, event)}><label>Development<select name="developmentId" required><option value="">Select project</option>{developmentOptions}</select></label><label>Code<input name="code" required pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*" /></label><label>Name<input name="name" required /></label><label>Bedrooms<input name="bedrooms" type="number" min="0" required /></label><label>Bathrooms<input name="bathrooms" type="number" min="0" step="0.5" required /></label><label>Area (sqm)<input name="areaSqm" type="number" min="1" step="0.1" required /></label><label>Base price<input name="priceAmount" type="number" min="0" required /></label><FormButtons cancel={cancel} label="Create unit type" /></form>;
  return <form className="workspace-form" onSubmit={(event) => submit(mode, event)}><label>Development<select name="developmentId" required><option value="">Select project</option>{developmentOptions}</select></label><label>Block<select name="blockId" required><option value="">Select block</option>{(data.blocks || []).map((item) => <option value={item.id} key={item.id}>{item.development_name} · {item.name}</option>)}</select></label><label>Unit type<select name="unitTypeId" required><option value="">Select unit type</option>{(data.unitTypes || []).map((item) => <option value={item.id} key={item.id}>{item.development_name} · {item.name}</option>)}</select></label><label>Unit code<input name="code" required pattern="[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*" /></label><label>Floor<input name="floor" type="number" min="0" required /></label><label>Price<input name="priceAmount" type="number" min="0" required /></label><FormButtons cancel={cancel} label="Create unit" /></form>;
}

function TeamOperations({ data, role, reload, notify }) {
  const [mode, setMode] = useState(null);
  async function invite(event) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const result = await performWrite("team", role, { action: "invite", email: form.get("email"), role: form.get("role") }, notify); if (!result) return; formElement.reset(); setMode(null); await reload(); }
  async function route(event) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const result = await performWrite("team", role, { action: "routingRule", name: form.get("name"), source: form.get("source") || null, listingCategory: form.get("listingCategory") || null, assigneeUserId: form.get("assigneeUserId") || null, strategy: form.get("strategy"), priority: Number(form.get("priority")) }, notify); if (!result) return; formElement.reset(); setMode(null); await reload(); }
  async function updateMember(item, event) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await performWrite("team", role, { action: "member", userId: item.user_id, role: form.get("role"), status: form.get("status") }, notify); if (result) await reload(); }
  return <><Title eyebrow="Agency operations" title="Team and lead routing" copy="Manage active team access and determine how new opportunities are assigned." action={<div className="title-actions"><button className="button button--outline" type="button" onClick={() => setMode("rule")}>Routing rule</button><button className="button button--coral" type="button" onClick={() => setMode("invite")}><Plus size={17} />Invite</button></div>} />{mode === "invite" ? <form className="workspace-form" onSubmit={invite}><label>Email<input name="email" type="email" required /></label><label>Role<select name="role"><option value="agent">Agent</option><option value="manager">Manager</option><option value="sales">Sales</option><option value="admin">Administrator</option></select></label><div className="form-actions form-wide"><button type="button" onClick={() => setMode(null)}>Cancel</button><button className="button button--ink" type="submit">Queue invitation</button></div></form> : null}{mode === "rule" ? <form className="workspace-form" onSubmit={route}><label>Name<input name="name" required /></label><label>Source<select name="source"><option value="">Any source</option><option value="listing">Listing</option><option value="profile">Profile</option><option value="qr">QR</option><option value="tour">Tour</option></select></label><label>Category<select name="listingCategory"><option value="">Any category</option><option value="rent">Rent</option><option value="sale">Sale</option><option value="stay">Stay</option></select></label><label>Strategy<select name="strategy"><option value="round_robin">Round robin</option><option value="least_active">Least active</option><option value="fixed">Fixed assignee</option></select></label><label>Assignee<select name="assigneeUserId"><option value="">Automatic</option>{(data.members || []).filter((item) => item.status === "active").map((item) => <option value={item.user_id} key={item.user_id}>{item.name}</option>)}</select></label><label>Priority<input name="priority" type="number" min="1" max="1000" defaultValue="100" /></label><div className="form-actions form-wide"><button type="button" onClick={() => setMode(null)}>Cancel</button><button className="button button--ink" type="submit">Create rule</button></div></form> : null}<div className="team-grid"><section className="workspace-panel"><div className="panel-heading"><div><h2>Team access</h2><p>Membership, role and current workload.</p></div></div>{(data.members || []).map((item) => <form className="team-row team-row--editable" key={item.user_id} onSubmit={(event) => updateMember(item, event)}><Initials name={item.name} /><div><strong>{item.name}</strong><small>{item.email} · {item.open_leads} open leads</small></div><select name="role" defaultValue={item.role} aria-label={`Role for ${item.name}`}>{["owner","admin","manager","agent","sales","front_desk"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select><select name="status" defaultValue={item.status} aria-label={`Status for ${item.name}`}>{["active","suspended","removed"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select><button type="submit">Save</button></form>)}</section><section className="workspace-panel"><div className="panel-heading"><div><h2>Routing rules</h2><p>Evaluated in priority order.</p></div></div>{(data.routingRules || []).map((item) => <article className="rule-row" key={item.id}><div><strong>{item.name}</strong><small>{humanize(item.strategy)} · priority {item.priority}</small></div><span>{item.assignee_name || "Automatic"}</span></article>)}{!data.routingRules?.length ? <p className="panel-empty">No routing rules configured.</p> : null}</section><section className="workspace-panel"><div className="panel-heading"><div><h2>Pending invitations</h2><p>Invitations expire after seven days.</p></div></div>{(data.invitations || []).map((item) => <article className="rule-row" key={item.id}><div><strong>{item.email}</strong><small>{humanize(item.role)} · sent {formatDate(item.created_at)}</small></div><span className="status-pill">{humanize(item.status)}</span></article>)}{!data.invitations?.length ? <p className="panel-empty">No invitations have been sent.</p> : null}</section></div></>;
}

function Marketing({ data, role, reload, notify }) {
  async function generate(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const payload = await performWrite("marketing", role, { action: "generate", kind: form.get("kind"), listingId: form.get("listingId") || null, developmentId: null, qrTarget: form.get("qrTarget") || null }, notify); if (!payload) return; await reload(); if (payload.previewPath) window.open(payload.previewPath, "_blank", "noopener,noreferrer"); }
  return <><Title eyebrow="Growth tools" title="Marketing generation" copy="Create traceable, QR-ready materials from your owned inventory." /><form className="workspace-form marketing-form" onSubmit={generate}><label>Material<select name="kind"><option value="rental_flyer">Rental flyer</option><option value="sale_brochure">Sale brochure</option><option value="development_brochure">Development brochure</option><option value="hotel_flyer">Hotel flyer</option><option value="qr_poster">QR poster</option><option value="comparison_sheet">Comparison sheet</option></select></label><label>Listing<select name="listingId"><option value="">Portfolio-wide material</option>{(data.listings || []).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><label className="form-wide">QR destination<input name="qrTarget" placeholder="/properties/..." pattern="/.*" /></label><div className="form-actions form-wide"><button className="button button--coral" type="submit">Generate material</button></div></form><div className="workspace-records">{(data.materials || []).map((item) => <article className="workspace-record compact" key={item.id}><div className="record-primary"><strong>{humanize(item.kind)}</strong><small>{item.listing_title || item.development_name || "Portfolio material"}{item.destination_path ? ` | ${item.destination_path}` : ""}</small></div><span className="status-pill">{item.status}</span><span className="marketing-attribution">{item.qr_opens || 0} QR opens</span>{item.previewPath ? <div className="record-actions"><a href={item.previewPath} target="_blank" rel="noreferrer">Open</a><a href={`${item.previewPath}?download=1`}>Download</a></div> : null}</article>)}</div></>;
}

function PlanSettings({ data, logout }) {
  const subscription = data.subscription;
  return <><Title eyebrow="Account" title="Plan and settings" copy="Review the active commercial subscription and account access." /><div className="settings-grid"><section className="workspace-panel settings-panel"><CircleDollarSign size={22} /><h2>{subscription ? humanize(subscription.planId) : "No active subscription"}</h2><p>{subscription ? `${humanize(subscription.status)} access${subscription.endsAt ? ` through ${formatDate(subscription.endsAt)}` : ""}.` : "Choose a professional plan to unlock commercial capacity."}</p><Link className="button button--outline" href="/pricing">Review plans</Link></section><section className="workspace-panel settings-panel"><ShieldCheck size={22} /><h2>Account access</h2><p>Sign out on shared devices and review Nestora&#39;s trust controls regularly.</p><button className="button button--ink" type="button" onClick={logout}><LogOut size={17} />Sign out</button></section></div></>;
}

function Title({ eyebrow, title, copy, action }) { return <div className="pro-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{action}</div>; }
function WorkspaceLoading() { return <div className="workspace-placeholder"><RefreshCw className="spin" size={27} /><h2>Loading workspace</h2><p>Retrieving your organization records.</p></div>; }
function WorkspaceError({ message, retry }) { return <div className="workspace-placeholder error-state"><ShieldCheck size={27} /><h2>Workspace unavailable</h2><p>{message}</p><button className="button button--ink" type="button" onClick={retry}>Try again</button></div>; }
function EmptyState({ title, copy }) { return <div className="workspace-placeholder small"><Building2 size={26} /><h2>{title}</h2><p>{copy}</p></div>; }
function Initials({ name = "Nestora" }) { const text = name.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join("").toUpperCase(); return <span className="pro-initials">{text}</span>; }
function nav(label, key, Icon) { return { label, key, Icon }; }
function roleIcon(role) { const Icon = role === "host" ? Hotel : role === "developer" ? Landmark : role === "agency" ? UsersRound : Building2; return <Icon size={19} />; }
function humanize(value) { return String(value || "").replaceAll("_", " ").replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function nullableNumber(value) { return value === "" || value == null ? null : Number(value); }
function formatDate(value) { return value ? new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : ""; }
function dateInput(value) { return value ? String(value).slice(0, 10) : ""; }
function toLocalDateTime(value) { if (!value) return ""; const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0,16); }
function formatBytes(value) { if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`; return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function splitList(value) { return [...new Set(String(value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean))]; }
function listingPayload(form) {
  return {
    title: form.get("title"), propertyType: form.get("propertyType"), addressLine1: form.get("addressLine1"), addressLine2: form.get("addressLine2"),
    city: form.get("city"), stateRegion: form.get("stateRegion"), postalCode: form.get("postalCode"), priceAmount: Number(form.get("priceAmount")),
    description: form.get("description"), bedrooms: nullableNumber(form.get("bedrooms")), bathrooms: nullableNumber(form.get("bathrooms")), areaSqm: nullableNumber(form.get("areaSqm")),
    features: splitList(form.get("features")), availabilityStatus: form.get("availabilityStatus"), availableFrom: form.get("availableFrom") || null,
    tourEnabled: form.get("tourEnabled") === "on",
    fees: { serviceCharge: numberOrZero(form.get("serviceCharge")), cautionDeposit: numberOrZero(form.get("cautionDeposit")), agencyFee: numberOrZero(form.get("agencyFee")), legalFee: numberOrZero(form.get("legalFee")), cleaningFee: numberOrZero(form.get("cleaningFee")) },
  };
}
function numberOrZero(value) { return value === "" || value == null ? 0 : Number(value); }
function listingStatus(item) {
  if (item.status === "active" && item.verification_status === "verified") return "Published";
  if (item.verification_status === "pending") return "Pending review";
  if (item.verification_status === "rejected") return "Changes requested";
  return humanize(item.status || "draft");
}
function mediaAccept(role) { if (role === "walkthrough") return "video/mp4,video/webm"; if (role === "floor_plan") return "image/jpeg,image/png,image/webp,application/pdf"; return "image/jpeg,image/png,image/webp"; }
function mediaRoleOptions(kind) {
  if (kind === "video") return [["walkthrough", "Walkthrough video"]];
  if (kind === "document") return [["floor_plan", "Floor plan"]];
  return [["gallery", "Gallery image"], ["cover", "Cover image"], ["floor_plan", "Floor plan"], ["panorama", "360 scene"]];
}
function normalizedMediaRole(item) {
  const options = mediaRoleOptions(item.kind).map(([value]) => value);
  return options.includes(item.media_role) ? item.media_role : options[0];
}
function FormButtons({ cancel, label }) {
  return <div className="form-actions form-wide"><button type="button" onClick={cancel}>Cancel</button><button className="button button--ink" type="submit">{label}</button></div>;
}

function mediaIcon(item) {
  if (item.media_role === "panorama") return <ScanLine size={17} />;
  if (item.kind === "video") return <Video size={17} />;
  if (item.kind === "document") return <FileText size={17} />;
  return <Images size={17} />;
}

async function performWrite(resource, role, body, notify) {
  const response = await fetch(`/api/workspace/${resource}?workspace=${role}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { notify(payload.error || "That change could not be saved."); return null; }
  notify("Changes saved.");
  return payload;
}