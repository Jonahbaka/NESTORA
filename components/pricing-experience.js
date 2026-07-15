"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  CircleDollarSign,
  Hotel,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import {
  ANNUAL_DISCOUNT_PERCENT,
  PRICING_CURRENCY,
  addOnGroups,
  calculateAnnualPrice,
  comparisonRows,
  enterprisePlan,
  marketplaceRates,
  professionalPlans,
  specialistPlans,
  usageCharges,
} from "@/lib/pricing";

const specialistIcons = {
  "developer-studio": Landmark,
  "host-centre": Hotel,
  "property-manager": Building2,
};

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: PRICING_CURRENCY,
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  return currency.format(value);
}

function emailHref(contactEmail, subject, body) {
  const query = new URLSearchParams({ subject, body });
  return `mailto:${contactEmail}?${query.toString()}`;
}

function PlanPrice({ plan, billingCycle }) {
  if (plan.monthlyPrice === 0) {
    return <div className="plan-card__price"><strong>{formatPrice(0)}</strong><span>forever</span></div>;
  }

  if (billingCycle === "annual") {
    const annualPrice = calculateAnnualPrice(plan.monthlyPrice);
    return (
      <>
        <div className="plan-card__price"><strong>{formatPrice(annualPrice)}</strong><span>per year</span></div>
        <small>{formatPrice(annualPrice / 12)} monthly equivalent</small>
      </>
    );
  }

  return <div className="plan-card__price"><strong>{formatPrice(plan.monthlyPrice)}</strong><span>per month</span></div>;
}

export function PricingExperience({ contactEmail }) {
  const [billingCycle, setBillingCycle] = useState("monthly");

  return (
    <>
      <section className="section pricing-plans" id="plans" aria-labelledby="pricing-plans-title">
        <div className="shell">
          <div className="pricing-plans__heading">
            <div>
              <p className="eyebrow">Professional plans</p>
              <h2 id="pricing-plans-title">Start useful. Upgrade when the work grows.</h2>
              <p>Every plan has a clear operating limit. Annual billing reduces the subscription price by {ANNUAL_DISCOUNT_PERCENT}%.</p>
            </div>
            <div className="billing-toggle" role="group" aria-label="Billing cycle">
              <button type="button" className={billingCycle === "monthly" ? "active" : ""} onClick={() => setBillingCycle("monthly")} aria-pressed={billingCycle === "monthly"}>Monthly</button>
              <button type="button" className={billingCycle === "annual" ? "active" : ""} onClick={() => setBillingCycle("annual")} aria-pressed={billingCycle === "annual"}>Annual <span>Save {ANNUAL_DISCOUNT_PERCENT}%</span></button>
            </div>
          </div>

          <div className="plan-grid">
            {professionalPlans.map((plan) => {
              const href = plan.id === "basic"
                ? "/login?mode=register&next=/workspace"
                : emailHref(contactEmail, `Nestora ${plan.name} plan`, `Hello Nestora,\n\nI would like to discuss the ${plan.name} plan for my property business.\n\nOrganisation or professional name:\nPrimary use case:\nPreferred billing cycle: ${billingCycle}\n`);
              const Wrapper = plan.id === "basic" ? Link : "a";

              return (
                <article className={`plan-card${plan.featured ? " plan-card--featured" : ""}`} key={plan.id}>
                  {plan.featured ? <span className="plan-card__flag">Most chosen</span> : null}
                  <p className="plan-card__audience">{plan.audience}</p>
                  <h3>{plan.name}</h3>
                  <PlanPrice plan={plan} billingCycle={billingCycle} />
                  <p className="plan-card__summary">{plan.summary}</p>
                  <ul>
                    {plan.features.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}
                  </ul>
                  <Wrapper className={`button ${plan.featured ? "button--coral" : "button--outline"}`} href={href}>{plan.cta}<ArrowRight size={17} /></Wrapper>
                </article>
              );
            })}
          </div>

          <div className="enterprise-band">
            <div>
              <p className="eyebrow">{enterprisePlan.name}</p>
              <h3>Governance and scale under one agreement.</h3>
              <p>{enterprisePlan.summary}</p>
            </div>
            <a className="button button--light" href={emailHref(contactEmail, "Nestora Enterprise rollout", "Hello Nestora,\n\nI would like to discuss an Enterprise rollout.\n\nOrganisation:\nTeams or locations:\nPrimary requirements:\nTarget timeline:\n")}>{enterprisePlan.cta}<ArrowRight size={17} /></a>
          </div>
        </div>
      </section>

      <section className="pricing-comparison" aria-labelledby="comparison-title">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Compare plans</p>
              <h2 id="comparison-title">The limits that matter at a glance</h2>
              <p>Specialist workspaces are priced separately below because their inventory and workflows are different.</p>
            </div>
          </div>
          <div className="comparison-scroll" tabIndex="0" aria-label="Scrollable plan comparison">
            <table>
              <thead><tr><th scope="col">Capability</th>{professionalPlans.map((plan) => <th scope="col" key={plan.id}>{plan.name}</th>)}</tr></thead>
              <tbody>{comparisonRows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${professionalPlans[index].id}`}>{value}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section specialist-pricing" aria-labelledby="specialist-title">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Specialist operations</p>
              <h2 id="specialist-title">Purpose-built workspaces for property operations</h2>
              <p>Each subscription includes the core workspace and the operating capacity shown. Annual billing receives the same {ANNUAL_DISCOUNT_PERCENT}% reduction.</p>
            </div>
          </div>
          <div className="specialist-grid">
            {specialistPlans.map((plan) => {
              const Icon = specialistIcons[plan.id];
              return (
                <article className="specialist-card" key={plan.id}>
                  <div className="specialist-card__media"><Image src={plan.image} alt={plan.imageAlt} fill sizes="(max-width: 760px) 100vw, 33vw" /></div>
                  <div className="specialist-card__body">
                    <span className="specialist-card__icon"><Icon size={19} /></span>
                    <h3>{plan.name}</h3>
                    <div className="specialist-card__price"><strong>{formatPrice(plan.monthlyPrice)}</strong><span>per month</span></div>
                    <p>{plan.summary}</p>
                    <small>{plan.scope}</small>
                    <a className="text-link" href={emailHref(contactEmail, `Nestora ${plan.name}`, `Hello Nestora,\n\nI would like to discuss ${plan.name}.\n\nOrganisation:\nCurrent portfolio size:\nPrimary requirements:\n`)}>Discuss this workspace <ArrowRight size={16} /></a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section pricing-addons" aria-labelledby="addons-title">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Services and add-ons</p>
              <h2 id="addons-title">Buy capacity and specialist help without changing plan</h2>
              <p>Published Abuja rates make budgeting easier. Any unusual scope is quoted before work begins.</p>
            </div>
          </div>
          <div className="pricing-addons__grid">
            {addOnGroups.map((group) => (
              <div className="pricing-addons__group" key={group.id}>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
                <dl>{group.items.map((item) => <div key={item.name}><dt>{item.name}</dt><dd>{formatPrice(item.price)}<span> / {item.unit}</span></dd></div>)}</dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketplace-pricing" aria-labelledby="marketplace-title">
        <div className="shell marketplace-pricing__grid">
          <div>
            <p className="eyebrow">Provider marketplace</p>
            <h2 id="marketplace-title">No monthly fee before the first completed job.</h2>
          </div>
          {marketplaceRates.map((item) => <article key={item.name}><strong>{item.rate}%</strong><div><h3>{item.name}</h3><p>{item.copy}</p></div></article>)}
        </div>
      </section>

      <section className="section billing-clarity" aria-labelledby="billing-clarity-title">
        <div className="shell billing-clarity__layout">
          <div>
            <span><CircleDollarSign size={24} /></span>
            <p className="eyebrow">Billing clarity</p>
            <h2 id="billing-clarity-title">You see the charge before it becomes a charge.</h2>
            <p>Paid subscriptions are confirmed with a written order summary. No plan, service or add-on activates from a decorative button.</p>
          </div>
          <ul>{usageCharges.map((charge) => <li key={charge}><ShieldCheck size={18} />{charge}</li>)}</ul>
        </div>
      </section>

      <section className="pricing-contact">
        <div className="shell">
          <div><p className="eyebrow">Choose with context</p><h2>Tell us how you operate. We will recommend the smallest plan that fits.</h2></div>
          <div><a className="button button--coral" href={emailHref(contactEmail, "Nestora pricing consultation", "Hello Nestora,\n\nPlease help me choose the right plan.\n\nBusiness type:\nTeam size:\nActive listings or units:\nImportant workflows:\n")}>Talk to Nestora <ArrowRight size={17} /></a><Link className="button button--light" href="/workspace">Explore workspaces</Link></div>
        </div>
      </section>
    </>
  );
}
