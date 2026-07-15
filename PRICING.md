# Nestora Pricing Strategy

Effective review date: 15 July 2026

The application-wide source of truth is `lib/pricing.js`. Plan names, prices, limits, specialist workspaces, marketplace rates, and published add-ons must be changed there rather than repeated in UI components.

## Launch Positioning

Nestora uses a free-to-enter professional plan, followed by paid tiers that increase operational capacity and automation:

| Plan | Monthly | Annual | Primary fit |
| --- | ---: | ---: | --- |
| Basic | NGN 0 | NGN 0 | New agents and individual landlords |
| Pro | NGN 30,000 | NGN 288,000 | Active independent professionals |
| Team | NGN 80,000 | NGN 768,000 | Small agencies and operating teams |
| Agency | NGN 200,000 | NGN 1,920,000 | Multi-branch property businesses |

Annual billing is 20% below twelve monthly payments. Developer Studio, Host Centre, Property Manager, marketplace fees, and property services are also configured centrally.

## Market Rationale

The launch ladder deliberately sits inside the current Nigerian operating-software market while accounting for Nestora's broader marketplace, CRM, inspection, media, and workspace scope.

- [Smart Estate Nigeria](https://www.smartestateio.com/) publishes monthly tiers from NGN 15,000 to NGN 225,000 across IDX, CRM, and operating-system bundles.
- [Ledge](https://ledgeapp.co/) publishes property-management tiers from free to NGN 50,000 per month, depending on unit capacity.
- [Porchplus](https://www.porchplus.com/pricing) publishes free, NGN 12,000, and NGN 36,000 monthly tiers plus capacity and onboarding add-ons.
- [Rentyx](https://www.rentyx.org/pricing) publishes managed-property tiers from NGN 80,000 to NGN 850,000 per month.
- [3Dive](https://3dive.com/pricing/) publishes Abuja-relevant interactive 360-tour pricing around NGN 60,000 per property, which anchors Nestora's NGN 65,000 capture rate.

International hospitality and property-software benchmarks should be checked during each review, but direct currency conversion is not the pricing method. Nestora prices are based on local willingness to pay, operating scope, support cost, and the value of connected demand and workflow data.

## Billing Principles

- Paid activation must produce a written order summary before any charge.
- Provider processing charges, message usage, travel, permits, and statutory taxes must be disclosed before confirmation.
- A paid plan never grants verification automatically.
- On-site listing checks describe the observed listing and property state; they are not legal title verification.
- Marketplace commission is due only after a platform-arranged job is completed.
- Entitlements and limits must ultimately be enforced server-side when subscription billing is enabled.

## Current Activation Path

The public pricing page opens a pre-addressed enquiry to the configured `CONTACT_EMAIL` for paid plans. It does not display a false checkout or payment-success state. Basic account creation opens the real registration flow.

When a payment provider is added, keep provider calls behind a server-side billing abstraction, verify signed webhooks, enforce idempotency, and record a billing event ledger before replacing this activation path.

## Review Cadence

Review pricing quarterly and whenever provider costs, Nigerian taxes, exchange rates, or support costs change materially. Record the effective date, evidence, approved changes, and migration treatment for existing customers.
