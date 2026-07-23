"use client";

import { AlertTriangle, BarChart3, Building2, Camera, Check, CircleDollarSign, FileSearch, Flag, LayoutDashboard, RefreshCw, Search, ShieldCheck, UserCheck, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNestora } from "@/components/providers";

const sections = [["Overview", "overview", LayoutDashboard], ["Media production", "propertyMedia", Camera], ["Listing approval", "pendingListings", Building2], ["Listing reports", "reports", Flag], ["Message safety", "conversationReports", UsersRound], ["Verification", "verifications", UserCheck], ["User access", "users", UsersRound], ["Plans", "subscriptions", CircleDollarSign], ["Incidents", "incidents", AlertTriangle], ["Audit log", "auditEvents", BarChart3]];

export function AdminConsole() {
  const [section, setSection] = useState("overview");
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { logout } = useNestora();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [adminResponse, mediaResponse, pricingResponse] = await Promise.all([
        fetch("/api/workspace/admin", { cache: "no-store" }),
        fetch("/api/property-media/operations", { cache: "no-store" }),
        fetch("/api/property-media/config", { cache: "no-store" }),
      ]);
      const [payload, mediaPayload, pricingPayload] = await Promise.all([adminResponse.json().catch(() => ({})), mediaResponse.json().catch(() => ({})), pricingResponse.json().catch(() => ({}))]);
      if (!adminResponse.ok) throw new Error(payload.error || "Administration data could not be loaded.");
      setData({ ...payload, propertyMedia: mediaResponse.ok ? mediaPayload.bookings || [] : [], propertyMediaError: mediaResponse.ok ? "" : mediaPayload.error, propertyMediaPricing: pricingResponse.ok ? pricingPayload : null });
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = { propertyMedia: data?.propertyMedia?.filter((item) => !["delivered","cancelled"].includes(item.status)).length || 0, pendingListings: data?.pendingListings?.filter((item) => item.verification_status === "pending").length || 0, reports: data?.reports?.filter(openItem).length || 0, conversationReports: data?.conversationReports?.filter(openItem).length || 0, verifications: data?.verifications?.filter((item) => item.status === "submitted").length || 0, users: data?.users?.filter((item) => item.status === "suspended").length || 0, incidents: data?.incidents?.filter((item) => !item.resolved_at).length || 0 };
  const rows = useMemo(() => section === "overview" ? [] : (data?.[section] || []).filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [data, query, section]);
  function chooseSection(value) { setSection(value); setSelected(null); }
  function showNotice(message) { setNotice(message); window.setTimeout(() => setNotice(""), 2300); }

  return <div className="admin-shell"><aside className="admin-sidebar"><div><ShieldCheck size={23} /><span><strong>Nestora Trust</strong><small>Operations console</small></span></div><nav>{sections.map(([label,key,Icon]) => <button type="button" className={section === key ? "active" : ""} onClick={() => chooseSection(key)} key={key}><Icon size={17} />{label}{counts[key] ? <b>{counts[key]}</b> : null}</button>)}</nav><p><ShieldCheck size={14} /> Administrative decisions are durable and audit logged.</p><button className="admin-signout" type="button" onClick={logout}>Sign out</button></aside><main className="admin-main"><header><div><p className="eyebrow">Restricted workspace</p><h1>{sections.find((item) => item[1] === section)?.[0]}</h1></div><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" /></label><span>{initials(data?.account?.name)}</span></header><div className="admin-content">{notice ? <div className="workspace-toast"><Check size={16} />{notice}</div> : null}{loading ? <AdminState icon={RefreshCw} title="Loading operations" copy="Retrieving moderation and administration records." /> : null}{error ? <AdminState icon={AlertTriangle} title="Administration unavailable" copy={error} action={load} /> : null}{!loading && !error && section === "overview" ? <AdminOverview counts={counts} data={data} /> : null}{!loading && !error && section !== "overview" ? <AdminQueue section={section} rows={rows} data={data} selected={selected} setSelected={setSelected} reload={load} notify={showNotice} /> : null}</div></main></div>;
}

function AdminOverview({ counts, data }) { return <><section className="admin-metrics"><Metric icon={Building2} label="Listing approval" value={counts.pendingListings} detail="Awaiting review" /><Metric icon={Flag} label="Listing reports" value={counts.reports} detail="Open or investigating" /><Metric icon={UsersRound} label="Message safety" value={counts.conversationReports} detail="Open or investigating" /><Metric icon={AlertTriangle} label="Open incidents" value={counts.incidents} detail="Operational signals" /></section><section className="workspace-panel admin-summary"><ShieldCheck size={25} /><div><h2>Durable moderation</h2><p>{data?.auditEvents?.length || 0} recent audit events are available. Every decision requires a written reason and records the acting administrator.</p></div></section></>; }
function Metric({ icon: Icon, label, value, detail }) { return <article><span><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong></div><em>{detail}</em></article>; }

function AdminQueue({ section, rows, data, selected, setSelected, reload, notify }) {
  if (section === "propertyMedia") return <PropertyMediaAdmin data={data} rows={rows} reload={reload} notify={notify} />;
  if (section === "subscriptions") return <SubscriptionAdmin data={data} rows={rows} reload={reload} notify={notify} />;
  if (section === "auditEvents") return <section className="audit-list workspace-panel">{rows.map((item) => <article key={item.id}><span>{item.action}</span><strong>{item.target_type} · {item.target_id}</strong><small>{item.actor_name || "System"} · {formatDateTime(item.created_at)}</small></article>)}</section>;
  if (section === "incidents") return <section className="audit-list workspace-panel">{rows.map((item) => <article key={item.id}><span className={`incident-${item.level}`}>{item.level}</span><strong>{item.source} · {item.event_key}</strong><p>{item.message}</p><small>{formatDateTime(item.created_at)}</small>{!item.resolved_at ? <button type="button" onClick={() => resolveIncident(item.id, reload, notify)}>Resolve</button> : <em>Resolved</em>}</article>)}</section>;
  return <div className="admin-grid"><section className="review-queue"><div className="panel-heading"><div><h2>Review queue</h2><p>{rows.length} records in this view.</p></div></div><header><span>Record</span><span>Subject</span><span>Status</span><span>Created</span><span>Owner</span></header>{rows.map((item) => <button type="button" key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelected(item)}><span>{String(item.external_key || item.id).slice(0,12)}</span><span><b>{subjectFor(section, item)}</b><small>{item.reason || item.kind || item.location || item.email}</small></span><span><em className={`risk risk--${riskFor(statusFor(section, item))}`}>{statusFor(section, item)}</em></span><span>{formatDateTime(item.created_at)}</span><span>{item.assignee_name || item.reviewer_name || item.owner_name || item.role || "Unassigned"}</span></button>)}</section><aside className="case-panel">{selected ? <DecisionPanel section={section} item={selected} reload={reload} notify={notify} clear={() => setSelected(null)} /> : <div className="empty-state"><FileSearch size={28} /><h2>Select a record</h2><p>Review its context and record a reasoned decision.</p></div>}</aside></div>;
}

function PropertyMediaAdmin({ data, rows, reload, notify }) {
  const [tab, setTab] = useState("jobs");
  async function updateJob(item, event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/property-media/operations", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update", bookingId: item.id, status: form.get("status"), paymentStatus: form.get("paymentStatus"),
        staffAssignment: form.get("staffAssignment"), photographerAssignment: form.get("photographerAssignment"),
        droneOperatorAssignment: form.get("droneOperatorAssignment"),
        equipmentRequirements: String(form.get("equipmentRequirements") || "").split(",").map((value) => value.trim()).filter(Boolean),
        scheduledAt: form.get("scheduledAt") ? new Date(form.get("scheduledAt")).toISOString() : "",
        productionNotes: form.get("productionNotes"),
        revisionRequests: String(form.get("revisionRequests") || "").split("\n").map((value) => value.trim()).filter(Boolean),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { notify(payload.error || "Production job could not be updated."); return; }
    notify("Production job and audit trail updated."); await reload();
  }
  async function savePricing(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const config = data.propertyMediaPricing;
    const packagePrices = Object.fromEntries(config.pricing.packages.map((item) => [item.id, Number(form.get(`package-${item.id}`))]));
    const extraPrices = Object.fromEntries(config.pricing.extras.filter((item) => item.priceNgn != null).map((item) => [item.id, Number(form.get(`extra-${item.id}`))]));
    const serviceMedia = Object.fromEntries(["team","interior","drone"].map((key) => [key, { src: form.get(`${key}Src`), alt: form.get(`${key}Alt`) }]));
    const response = await fetch("/api/property-media/config", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        depositPercent: Number(form.get("depositPercent")), taxMode: form.get("taxMode"),
        taxRatePercent: Number(form.get("taxRatePercent")), taxLabel: form.get("taxLabel"),
        includedRadiusKm: Number(form.get("includedRadiusKm")), additionalKmRateNgn: Number(form.get("additionalKmRateNgn")),
        hostingRenewalNgn: Number(form.get("hostingRenewalNgn")), packagePrices, extraPrices, serviceMedia,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { notify(payload.error || "Pricing could not be updated."); return; }
    notify("Authoritative public pricing and service media updated."); await reload();
  }
  if (data.propertyMediaError) return <AdminState icon={AlertTriangle} title="Media operations unavailable" copy={data.propertyMediaError} action={reload} />;
  const pricing = data.propertyMediaPricing?.pricing;
  return <div className="media-admin"><div className="media-admin__tabs"><button type="button" className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}>Production jobs ({rows.length})</button><button type="button" className={tab === "pricing" ? "active" : ""} onClick={() => setTab("pricing")}>Pricing & service media</button></div>{tab === "jobs" ? <div className="media-admin__jobs">{rows.length ? rows.map((item) => <form className="workspace-panel media-job" onSubmit={(event) => updateJob(item, event)} key={item.id}><header><div><span>{item.booking_reference}</span><h2>{item.estimate?.package?.name || humanize(item.package_id)}</h2><p>{item.customer_name} · {item.property_type} · {item.property_address}</p></div><strong>{formatNairaAdmin(item.estimate?.totalNgn || 0)}</strong></header><dl><div><dt>Preferred</dt><dd>{formatDateTime(item.preferred_date)}</dd></div><div><dt>Deposit</dt><dd>{formatNairaAdmin(item.estimate?.deposit?.amountNgn || 0)}</dd></div><div><dt>Listing</dt><dd>{item.listing_title || "Not connected"}</dd></div><div><dt>Requester</dt><dd>{item.requester_name || item.customer_email}</dd></div></dl><div className="workspace-form"><label>Status<select name="status" defaultValue={item.status}>{["requested","quote_pending","awaiting_deposit","confirmed","scheduled","capture_completed","editing","ready_for_review","delivered","cancelled"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label>Payment<select name="paymentStatus" defaultValue={item.payment_status}>{["unpaid","deposit_pending","deposit_paid","paid","refunded","failed"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label>Schedule<input name="scheduledAt" type="datetime-local" defaultValue={localDateTime(item.scheduled_at)} /></label><label>Crew lead<input name="staffAssignment" defaultValue={item.staff_assignment || ""} /></label><label>Photographer<input name="photographerAssignment" defaultValue={item.photographer_assignment || ""} /></label><label>Drone operator<input name="droneOperatorAssignment" defaultValue={item.drone_operator_assignment || ""} /></label><label className="form-wide">Equipment requirements<input name="equipmentRequirements" defaultValue={(item.equipment_requirements || []).join(", ")} placeholder="Full-frame camera, 360 camera, lighting kit" /></label><label className="form-wide">Private production notes<textarea name="productionNotes" defaultValue={item.production_notes || ""} /></label><label className="form-wide">Revision requests, one per line<textarea name="revisionRequests" defaultValue={(item.revision_requests || []).join("\n")} /></label><div className="form-actions form-wide"><button className="button button--ink" type="submit">Save production job</button></div></div></form>) : <AdminState icon={Camera} title="No production jobs" copy="New property-media bookings will appear here." />}</div> : pricing ? <form className="workspace-panel media-pricing-editor" onSubmit={savePricing}><header><div><p className="eyebrow">Authoritative configuration</p><h2>Public package prices and production policy</h2></div><button className="button button--ink" type="submit">Publish pricing</button></header><div className="media-price-fields">{pricing.packages.map((item) => <label key={item.id}>{item.name}<input name={`package-${item.id}`} type="number" min="0" defaultValue={item.priceNgn} /><small>{item.startingFrom ? "Starting-from price" : "Published fixed price"}</small></label>)}</div><h3>Extras</h3><div className="media-price-fields">{pricing.extras.filter((item) => item.priceNgn != null).map((item) => <label key={item.id}>{item.name}<input name={`extra-${item.id}`} type="number" min="0" defaultValue={item.priceNgn} /></label>)}</div><h3>Policy controls</h3><div className="workspace-form"><label>Deposit %<input name="depositPercent" type="number" min="0" max="100" defaultValue={pricing.depositPercent} /></label><label>Tax mode<select name="taxMode" defaultValue={pricing.taxMode}><option value="exclusive">Exclusive</option><option value="inclusive">Inclusive</option></select></label><label>Tax rate %<input name="taxRatePercent" type="number" min="0" max="100" defaultValue={pricing.taxRatePercent} /></label><label>Included radius km<input name="includedRadiusKm" type="number" min="0" defaultValue={pricing.includedRadiusKm} /></label><label>Additional km rate NGN<input name="additionalKmRateNgn" type="number" min="0" defaultValue={pricing.additionalKmRateNgn} /></label><label>Annual 360 hosting NGN<input name="hostingRenewalNgn" type="number" min="0" defaultValue={pricing.hostingRenewalNgn} /></label><label className="form-wide">Tax disclosure<input name="taxLabel" minLength={5} defaultValue={pricing.taxLabel} /></label></div><h3>Admin-replaceable service visuals</h3><div className="workspace-form">{["team","interior","drone"].flatMap((key) => [<label key={`${key}-src`}>{humanize(key)} image path<input name={`${key}Src`} required defaultValue={data.propertyMediaPricing.serviceMedia[key].src} /></label>,<label key={`${key}-alt`}>{humanize(key)} accessible description<input name={`${key}Alt`} required minLength={12} defaultValue={data.propertyMediaPricing.serviceMedia[key].alt} /></label>])}</div></form> : <AdminState icon={RefreshCw} title="Pricing unavailable" copy="The authoritative pricing configuration could not be loaded." action={reload} />}</div>;
}

function DecisionPanel({ section, item, reload, notify, clear }) {
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = section === "verifications" ? "verification" : section === "conversationReports" ? "conversationReport" : section === "pendingListings" ? "listingDecision" : section === "users" ? "userStatus" : "report";
    const response = await adminWrite({ action, id: item.id, status: form.get("status"), reason: form.get("reason") });
    if (!response.ok) { notify(response.error); return; }
    notify("Decision recorded."); clear(); await reload();
  }
  const statuses = section === "verifications" ? [["approved","Approve"],["revision_requested","Request revision"],["rejected","Reject"]] : section === "pendingListings" ? [["approved","Approve publication"],["rejected","Reject"],["suspended","Suspend"]] : section === "users" ? [["active","Active"],["suspended","Suspend"]] : [["investigating","Investigating"],["resolved","Resolve"],["dismissed","Dismiss"]];
  return <form className="admin-decision" onSubmit={submit}><div className="case-panel__head"><div><span>{String(item.external_key || item.id).slice(0,18)}</span><h2>{subjectFor(section, item)}</h2></div></div><dl><div><dt>Current status</dt><dd>{statusFor(section, item)}</dd></div><div><dt>Created</dt><dd>{formatDateTime(item.created_at)}</dd></div><div><dt>Owner / subject</dt><dd>{item.reporter_name || item.subject_name || item.organization_name || item.owner_name || item.email || "Organization"}</dd></div>{item.media_count != null ? <div><dt>Ready media</dt><dd>{item.media_count}</dd></div> : null}</dl><label>Decision<select name="status">{statuses.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Decision reason<textarea name="reason" minLength={5} maxLength={2000} required /></label><button className="button button--ink" type="submit">Record decision</button></form>;
}

function SubscriptionAdmin({ data, rows, reload, notify }) {
  const [subjectType, setSubjectType] = useState("organization");
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const endsAt = form.get("endsAt");
    const response = await adminWrite({ action: "subscription", subjectType, subjectId: form.get("subjectId"), planId: form.get("planId"), status: form.get("status"), endsAt: endsAt ? new Date(endsAt).toISOString() : null, reason: form.get("reason") });
    if (!response.ok) { notify(response.error); return; }
    event.currentTarget.reset(); notify("Plan assigned."); await reload();
  }
  const subjects = subjectType === "organization" ? data.organizations || [] : data.users || [];
  return <div className="subscription-admin"><form className="workspace-form" onSubmit={submit}><label>Subject type<select value={subjectType} onChange={(event) => setSubjectType(event.target.value)}><option value="organization">Organization</option><option value="user">User</option></select></label><label>Subject<select name="subjectId" required><option value="">Select subject</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}{item.email ? ` · ${item.email}` : ""}</option>)}</select></label><label>Plan<select name="planId">{["basic","pilot","pro","team","agency","developer-studio","hotel-operations","host-centre","enterprise"].map((value) => <option value={value} key={value}>{humanize(value)}</option>)}</select></label><label>Status<select name="status"><option value="active">Active</option><option value="trial">Trial</option><option value="grace">Grace</option></select></label><label>Ends at<input name="endsAt" type="datetime-local" /></label><label className="form-wide">Assignment reason<textarea name="reason" minLength="5" required /></label><div className="form-actions form-wide"><button className="button button--ink" type="submit">Assign plan</button></div></form><section className="audit-list workspace-panel">{rows.map((item) => <article key={item.id}><span>{item.plan_id}</span><strong>{item.organization_name || item.user_name}</strong><p>{item.status}{item.ends_at ? ` · ends ${formatDateTime(item.ends_at)}` : ""}</p><small>{formatDateTime(item.starts_at)}</small></article>)}</section></div>;
}

async function adminWrite(body) { const response = await fetch("/api/workspace/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json().catch(() => ({})); return { ok: response.ok, error: payload.error || "The operation could not be saved.", payload }; }
async function resolveIncident(id, reload, notify) { const response = await adminWrite({ action: "incident", id }); if (!response.ok) { notify(response.error); return; } notify("Incident resolved."); await reload(); }
function AdminState({ icon: Icon, title, copy, action }) { return <div className="workspace-placeholder"><Icon size={28} /><h2>{title}</h2><p>{copy}</p>{action ? <button className="button button--ink" type="button" onClick={action}>Try again</button> : null}</div>; }
function subjectFor(section, item) { if (section === "verifications") return item.subject_name || item.organization_name || `${item.kind} verification`; if (section === "conversationReports") return `${item.subject_type} conversation`; if (section === "pendingListings") return item.title; if (section === "users") return item.name; return item.listing_title || "Listing report"; }
function statusFor(section, item) { return section === "pendingListings" ? item.verification_status : item.status; }
function riskFor(status) { return ["open","submitted","pending","suspended"].includes(status) ? "high" : ["investigating","revision_requested"].includes(status) ? "medium" : "low"; }
function openItem(item) { return item.status === "open" || item.status === "investigating"; }
function initials(name = "NA") { return name.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase(); }
function humanize(value) { return String(value || "").replaceAll("-", " ").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatDateTime(value) { return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; }
function formatNairaAdmin(value) { return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function localDateTime(value) { if (!value) return ""; const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }
