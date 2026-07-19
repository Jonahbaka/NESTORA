"use client";

import { useState, useEffect } from "react";
import { useNestora } from "@/components/providers";
import { Check, ShieldCheck, Globe2, Images, FileText, BarChart3, Lock, X, ChevronRight, UsersRound, Building2, Landmark, Hotel, Send } from "lucide-react";

const PLANS = [
  { id: "basic", name: "Basic", monthlyPrice: 0, annualPrice: 0, audience: "New agents and individual landlords" },
  { id: "pro", name: "Pro", monthlyPrice: 30000, annualPrice: 288000, audience: "Active independent professionals", featured: true },
  { id: "team", name: "Team", monthlyPrice: 80000, annualPrice: 768000, audience: "Small agencies and operating teams" },
  { id: "agency", name: "Agency", monthlyPrice: 200000, annualPrice: 1920000, audience: "Multi-branch property businesses" },
];

const FEATURE_MAP = {
  media_upload: { label: "Media uploads", icon: Images },
  basic_analytics: { label: "Basic analytics", icon: BarChart3 },
  public_profile: { label: "Public profile", icon: UsersRound },
  basic_inbox: { label: "Basic enquiry inbox", icon: MessageCircle },
  availability_reminders: { label: "Availability reminders", icon: CalendarCheck2 },
  marketing_generation: { label: "Marketing generation", icon: FileText },
  lead_pipeline: { label: "Lead pipeline", icon: UsersRound },
  inspection_calendar: { label: "Inspection calendar", icon: CalendarCheck2 },
  advanced_analytics: { label: "Advanced analytics", icon: BarChart3 },
  pdf_export: { label: "PDF export", icon: FileText },
  image_export: { label: "Image export", icon: Images },
  qr_generation: { label: "QR generation", icon: QrCode },
  partner_website: { label: "Partner website", icon: Globe2 },
  brand_kit: { label: "Brand kit", icon: Palette },
  marketing_studio: { label: "Marketing Studio", icon: LayoutTemplate },
  follow_up_reminders: { label: "Follow-up reminders", icon: Bell },
  social_formats: { label: "Social formats", icon: Share2 },
  team_management: { label: "Team management", icon: UsersRound },
  shared_inbox: { label: "Shared inbox", icon: MessageCircle },
  shared_media_library: { label: "Shared media library", icon: Images },
  shared_templates: { label: "Shared templates", icon: LayoutTemplate },
  approval_workflows: { label: "Approval workflows", icon: Check },
  team_analytics: { label: "Team analytics", icon: BarChart3 },
  lead_routing: { label: "Lead routing", icon: UsersRound },
  external_delivery: { label: "External delivery", icon: Send },
  custom_domain: { label: "Custom domain", icon: Globe2 },
  bulk_import: { label: "Bulk import", icon: Upload },
  api_access: { label: "API access", icon: Code },
  webhooks: { label: "Webhooks", icon: RefreshCw },
  compliance_oversight: { label: "Compliance oversight", icon: ShieldCheck },
  branch_management: { label: "Branch management", icon: Building2 },
  csv_export: { label: "CSV export", icon: Download },
  scheduled_reports: { label: "Scheduled reports", icon: FileText },
  developer_inventory: { label: "Developer inventory", icon: Landmark },
  hotel_inventory: { label: "Hotel inventory", icon: Hotel },
  development_microsites: { label: "Development microsites", icon: Globe2 },
  payment_plan_sheets: { label: "Payment-plan sheets", icon: FileText },
  construction_updates: { label: "Construction updates", icon: RefreshCw },
  buyer_reports: { label: "Buyer reports", icon: BarChart3 },
  reservation_management: { label: "Reservation management", icon: CalendarCheck2 },
  guest_messaging: { label: "Guest messaging", icon: MessageCircle },
  availability_calendar: { label: "Availability calendar", icon: CalendarCheck2 },
  booking_analytics: { label: "Booking analytics", icon: BarChart3 },
};

export function SubscriptionManager({ data }) {
  const { account } = useNestora();
  const [subscription, setSubscription] = useState(data?.subscription || null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/workspace/entitlements", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const sub = payload.subscription || null;
          setSubscription(sub);
          const plansResponse = await fetch("/api/workspace/entitlements?resource=plans", { cache: "no-store" });
          const plansPayload = await plansResponse.json().catch(() => ({}));
          if (plansResponse.ok && !cancelled) setPlans(plansPayload.plans || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (!subscription && plans.length === 0) {
    return <div className="workspace-placeholder"><p>Subscription data is temporarily unavailable.</p></div>;
  }

  async function requestUpgrade(planId) {
    setRequesting(planId);
    try {
      const response = await fetch("/api/workspace/entitlements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "requestUpgrade", planId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Upgrade request failed.");
      alert("Upgrade request submitted. Our team will contact you shortly.");
    } catch (error) {
      alert(error.message);
    } finally {
      setRequesting(null);
    }
  }

  if (loading) return <div className="workspace-placeholder"><div className="spin">Loading subscription...</div></div>;

  const currentPlanId = subscription?.planId || "basic";
  const currentPlan = plans.find((p) => p.plan_id === currentPlanId) || PLANS.find((p) => p.id === currentPlanId) || PLANS[0];
  const availablePlans = plans.filter((p) => p.plan_id !== currentPlanId && p.is_active !== false);

  return (
    <div className="subscription-manager">
      <header className="subscription-header">
        <div>
          <h1>Plan and subscription</h1>
          <p>Review your current plan, usage, and available upgrades.</p>
        </div>
      </header>

      <section className="subscription-current">
        <h2>Current plan</h2>
        <div className="subscription-card">
          <div className="subscription-card__head">
            <div>
              <strong>{currentPlan.name || humanize(currentPlanId)}</strong>
              <small>{currentPlan.audience || "Professional workspace"}</small>
            </div>
            <span className={`status-pill status-pill--${subscription?.status || "active"}`}>{humanize(subscription?.status || "active")}</span>
          </div>
          <div className="subscription-meta">
            <span>Billing: {subscription?.billingInterval || "monthly"}</span>
            <span>{subscription?.endsAt ? `Renews ${formatDate(subscription.endsAt)}` : "No active renewal date"}</span>
            {subscription?.foundingPartner ? <span className="founding-badge">Founding Partner</span> : null}
          </div>
          <ul className="subscription-usage">
            <li>Users: {subscription?.usersUsed || 0} / {currentPlan.limits?.users || 1}</li>
            <li>Listings: {subscription?.listingsUsed || 0} / {currentPlan.limits?.activeListings || 5}</li>
            <li>Websites: {subscription?.websitesUsed || 0} / {currentPlan.limits?.websites || 0}</li>
            <li>Storage: {subscription?.storageUsedMb || 0} / {currentPlan.limits?.storageMb || 100} MB</li>
            <li>PDF exports: {subscription?.pdfExportsUsed || 0} / {currentPlan.limits?.pdfExports || 5}</li>
            <li>Image exports: {subscription?.imageExportsUsed || 0} / {currentPlan.limits?.imageExports || 10}</li>
          </ul>
        </div>
      </section>

      <section className="subscription-features">
        <h2>Included features</h2>
        <div className="feature-grid">
          {(currentPlan.features || []).map((key) => {
            const feature = FEATURE_MAP[key];
            if (!feature) return null;
            const Icon = feature.icon;
            return <div key={key} className="feature-pill"><Icon size={16} />{feature.label}</div>;
          })}
        </div>
      </section>

      <section className="subscription-upgrade">
        <h2>Available upgrades</h2>
        <div className="plan-cards">
          {availablePlans.map((plan) => {
            const isUpgrade = (plan.limits?.users || 0) > (currentPlan.limits?.users || 0) || (plan.limits?.activeListings || 0) > (currentPlan.limits?.activeListings || 0);
            return (
              <article key={plan.plan_id} className={`plan-card ${plan.featured ? "plan-card--featured" : ""}`}>
                <div>
                  <strong>{plan.name}</strong>
                  <p>{plan.audience}</p>
                  <p className="plan-price">NGN {plan.monthly_price_ngn?.toLocaleString?.() || plan.monthlyPrice?.toLocaleString?.() || 0}<small>/ month</small></p>
                </div>
                <ul>
                  {(plan.features || []).slice(0, 8).map((key) => {
                    const feature = FEATURE_MAP[key];
                    return <li key={key}>{feature ? feature.label : humanize(key)}</li>;
                  })}
                </ul>
                <button className="button button--coral" type="button" onClick={() => requestUpgrade(plan.plan_id)} disabled={requesting === plan.plan_id}>
                  {requesting === plan.plan_id ? "Requesting..." : "Request upgrade"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function humanize(value) {
  return String(value || "").replaceAll("_", " ").replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}
function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
function MessageCircle() { return null; }
function CalendarCheck2() { return null; }
function QrCode() { return null; }
function Palette() { return null; }
function LayoutTemplate() { return null; }
function Bell() { return null; }
function Share2() { return null; }
function Upload() { return null; }
function Code() { return null; }
function RefreshCw() { return null; }
function Download() { return null; }