"use client";

import { useState, useEffect } from "react";
import { Plus, Save, X, ShieldCheck, Globe2, FileText, Check, Search, Download, RefreshCw, UsersRound } from "lucide-react";

const ADMIN_TABS = [
  { id: "plans", label: "Plans", icon: ShieldCheck },
  { id: "subscriptions", label: "Subscriptions", icon: UsersRound },
  { id: "websites", label: "Websites", icon: Globe2 },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "audit", label: "Audit log", icon: Check },
];

export function AdminConsole({ data }) {
  const [tab, setTab] = useState("plans");
  const [plans, setPlans] = useState(data?.plans || []);
  const [subscriptions, setSubscriptions] = useState(data?.subscriptions || []);
  const [websites, setWebsites] = useState(data?.websites || []);
  const [auditEvents, setAuditEvents] = useState(data?.auditEvents || []);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (data?.plans) setPlans(data.plans);
    if (data?.subscriptions) setSubscriptions(data.subscriptions);
    if (data?.websites) setWebsites(data.websites);
    if (data?.auditEvents) setAuditEvents(data.auditEvents);
  }, [data]);

  async function performWrite(body, success) {
    setSaving(true);
    try {
      const response = await fetch("/api/workspace/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "That admin action failed.");
      setNotice(success || "Change saved.");
      return payload;
    } catch (error) {
      setNotice(error.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-console">
      <header className="admin-header"><div><h1>Platform administration</h1><p>Manage plans, subscriptions, partner websites and templates.</p></div></header>

      {notice ? <div className="workspace-toast"><Check size={16} />{notice}</div> : null}

      <nav className="admin-tabs">{ADMIN_TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><item.icon size={16} />{item.label}</button>)}</nav>

      {tab === "plans" && <PlansTab plans={plans} saving={saving} performWrite={performWrite} />}
      {tab === "subscriptions" && <SubscriptionsTab subscriptions={subscriptions} search={search} setSearch={setSearch} saving={saving} performWrite={performWrite} />}
      {tab === "websites" && <WebsitesTab websites={websites} saving={saving} performWrite={performWrite} />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "audit" && <AuditTab events={auditEvents} />}
    </div>
  );
}

function PlansTab({ plans, saving, performWrite }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ planId: "", name: "", audience: "", monthlyPriceNgn: 0, annualPriceNgn: 0, limits: {}, features: [], isActive: true });

  function startCreate() {
    setEditing("create");
    setForm({ planId: "", name: "", audience: "", monthlyPriceNgn: 0, annualPriceNgn: 0, limits: { users: 1, activeListings: 5, storageMb: 100, pdfExports: 5, imageExports: 10 }, features: [], isActive: true });
  }
  function startEdit(plan) {
    setEditing(plan.plan_id);
    setForm({ planId: plan.plan_id, name: plan.name, audience: plan.audience || "", monthlyPriceNgn: plan.monthly_price_ngn || 0, annualPriceNgn: plan.annual_price_ngn || 0, limits: plan.limits || {}, features: plan.features || [], isActive: plan.is_active !== false });
  }
  async function save(event) {
    event.preventDefault();
    const action = editing === "create" ? "createPlan" : "updatePlan";
    const payload = await performWrite({ action, ...form }, editing === "create" ? "Plan created." : "Plan updated.");
    if (payload) setEditing(null);
  }

  return (
    <section className="admin-tab">
      <div className="admin-tab__head"><h2>Plans</h2><button className="button button--coral" type="button" onClick={startCreate} disabled={saving}><Plus size={16} />New plan</button></div>
      {editing ? <form className="workspace-form" onSubmit={save}><label>Plan ID<input value={form.planId} onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))} required disabled={editing !== "create"} /></label><label>Name<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></label><label>Audience<input value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} /></label><label>Monthly price (NGN)<input type="number" value={form.monthlyPriceNgn} onChange={(e) => setForm((f) => ({ ...f, monthlyPriceNgn: Number(e.target.value) }))} /></label><label>Annual price (NGN)<input type="number" value={form.annualPriceNgn} onChange={(e) => setForm((f) => ({ ...f, annualPriceNgn: Number(e.target.value) }))} /></label><label>Users<input type="number" value={form.limits.users || 0} onChange={(e) => setForm((f) => ({ ...f, limits: { ...f.limits, users: Number(e.target.value) } }))} /></label><label>Listings<input type="number" value={form.limits.activeListings || 0} onChange={(e) => setForm((f) => ({ ...f, limits: { ...f.limits, activeListings: Number(e.target.value) } }))} /></label><label>Storage MB<input type="number" value={form.limits.storageMb || 0} onChange={(e) => setForm((f) => ({ ...f, limits: { ...f.limits, storageMb: Number(e.target.value) } }))} /></label><label>PDF exports<input type="number" value={form.limits.pdfExports || 0} onChange={(e) => setForm((f) => ({ ...f, limits: { ...f.limits, pdfExports: Number(e.target.value) } }))} /></label><label>Image exports<input type="number" value={form.limits.imageExports || 0} onChange={(e) => setForm((f) => ({ ...f, limits: { ...f.limits, imageExports: Number(e.target.value) } }))} /></label><label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />Active</label><div className="form-actions form-wide"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button className="button button--ink" type="submit" disabled={saving}>Save plan</button></div></form> : <div className="admin-grid">{plans.map((plan) => <article key={plan.plan_id} className="admin-card"><div><strong>{plan.name}</strong><small>{plan.audience || "Professional"}</small></div><p>{plan.monthly_price_ngn?.toLocaleString?.() || 0} NGN / month</p><span className={`status-pill status-pill--${plan.is_active === false ? "inactive" : "active"}`}>{plan.is_active === false ? "Inactive" : "Active"}</span><div className="admin-card__actions"><button type="button" onClick={() => startEdit(plan)}>Edit</button></div></article>)}</div>}
    </section>
  );
}

function SubscriptionsTab({ subscriptions, search, setSearch, saving, performWrite }) {
  const [assigning, setAssigning] = useState(null);
  const filtered = subscriptions.filter((item) => `${item.user_name || item.user_email || ""} ${item.organization_name || ""}`.toLowerCase().includes(search.toLowerCase()));
  async function assignPlan(subscription, planId, status) {
    setAssigning(`${subscription.id}-${planId}`);
    const payload = await performWrite({ action: "subscription", subjectType: subscription.user_id ? "user" : "organization", subjectId: subscription.user_id || subscription.organization_id, planId, status: status || "active", reason: "Admin reassigned plan." }, "Subscription updated.");
    if (payload) setAssigning(null);
  }
  return (
    <section className="admin-tab">
      <div className="admin-tab__head"><h2>Subscriptions</h2><label><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user or org..." /></label></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User / org</th><th>Plan</th><th>Status</th><th>Starts</th><th>Ends</th><th>Assign</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.user_name || item.user_email || item.organization_name || "—"}</td><td>{item.plan_id}</td><td><span className={`status-pill status-pill--${item.status}`}>{item.status}</span></td><td>{item.starts_at ? new Date(item.starts_at).toLocaleDateString() : "—"}</td><td>{item.ends_at ? new Date(item.ends_at).toLocaleDateString() : "—"}</td><td><select value="" onChange={(e) => { if (e.target.value) assignPlan(item, e.target.value, "active"); }} disabled={assigning === `${item.id}-${e.target.value}`}><option value="">Assign plan...</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="team">Team</option><option value="agency">Agency</option></select></td></tr>)}</tbody></table></div>
    </section>
  );
}

function WebsitesTab({ websites, saving, performWrite }) {
  const [actionId, setActionId] = useState("");
  async function suspend(id, reason) { setActionId(`suspend-${id}`); await performWrite({ action: "suspendWebsite", websiteId: id, reason }, "Site suspended."); setActionId(""); }
  async function reinstate(id) { setActionId(`reinstate-${id}`); await performWrite({ action: "reinstateWebsite", websiteId: id }, "Site reinstated."); setActionId(""); }
  return (
    <section className="admin-tab">
      <div className="admin-tab__head"><h2>Partner websites</h2></div>
      <div className="admin-grid">{websites.map((site) => <article key={site.id} className="admin-card"><div><strong>{site.name}</strong><small>{site.subdomain} · {site.kind}</small></div><span className={`status-pill status-pill--${site.status}`}>{site.status}</span><p>{site.visitCount || 0} visits · {site.visitsLast30Days || 0} last 30 days</p><div className="admin-card__actions">{site.status === "published" ? <button type="button" onClick={() => suspend(site.id, "Admin review")} disabled={saving || actionId === `suspend-${site.id}`}>Suspend</button> : <button type="button" onClick={() => reinstate(site.id)} disabled={saving || actionId === `reinstate-${site.id}`}>Reinstate</button>}</div></article>)}</div>
    </section>
  );
}

function TemplatesTab() {
  return (
    <section className="admin-tab">
      <div className="admin-tab__head"><h2>Templates</h2><button className="button button--coral" type="button"><Plus size={16} />New template</button></div>
      <p className="panel-empty">Platform template editor will open here.</p>
    </section>
  );
}

function AuditTab({ events }) {
  return (
    <section className="admin-tab">
      <div className="admin-tab__head"><h2>Audit log</h2></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>{events.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString()}</td><td>{item.actor_name || "—"}</td><td>{item.action}</td><td>{item.target_type}:{item.target_id}</td></tr>)}</tbody></table></div>
    </section>
  );
}

