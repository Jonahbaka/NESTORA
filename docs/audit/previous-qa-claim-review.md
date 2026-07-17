# Previous QA Claim Review

**Date:** 2026-07-17

---

## Claim: "Messaging, leads and inspections: Pass locally"

| Aspect | Finding |
|--------|---------|
| What exact test ran | Unknown - no test file found for workspace operations |
| Whether it used the UI | No - appears to be backend API testing |
| Whether it used Playwright or another browser | No - no Playwright/browser tests found |
| Whether it used the deployed environment | No - "locally" indicates local development |
| Which role executed it | Unknown |
| Which database records changed | Unknown |
| Which screenshots prove it | None provided |
| Which route was used | `/api/workspace/leads`, `/api/workspace/inspections` |
| Which assertion passed | Unknown |

**Verdict: OVERSTATED.** The backend API exists and works, but no end-to-end browser test was performed. The claim should be "Backend API implemented and tested locally."

---

## Claim: "Developer and hotel inventory: Pass locally"

| Aspect | Finding |
|--------|---------|
| What exact test ran | Unknown |
| Whether it used the UI | No |
| Whether it used Playwright or another browser | No |
| Whether it used the deployed environment | No |
| Which role executed it | Unknown |
| Which database records changed | Unknown |
| Which screenshots prove it | None provided |
| Which route was used | `/api/workspace/developer`, `/api/workspace/hotel` |
| Which assertion passed | Unknown |

**Verdict: OVERSTATED.** Backend CRUD operations exist for developer and hotel inventory. Seed script creates demo data. No browser-based testing was performed.

---

## Claim: "Agency invitations and subscriptions: Pass locally"

| Aspect | Finding |
|--------|---------|
| What exact test ran | Unknown |
| Whether it used the UI | No |
| Whether it used Playwright or another browser | No |
| Whether it used the deployed environment | No |
| Which role executed it | Unknown |
| Which database records changed | Unknown |
| Which screenshots prove it | None provided |
| Which route was used | `/api/workspace/team`, `/api/workspace/entitlements` |
| Which assertion passed | Unknown |

**Verdict: OVERSTATED.** Backend API exists. Seed script creates demo invitations and subscriptions. No browser-based testing.

---

## Claim: "Marketing materials: Pass"

| Aspect | Finding |
|--------|---------|
| What exact test ran | Unknown |
| Whether it used the UI | No |
| Whether it used Playwright or another browser | No |
| Whether it used the deployed environment | No |
| Which role executed it | Unknown |
| Which database records changed | Unknown |
| Which screenshots prove it | None provided |
| Which route was used | `/api/workspace/marketing` |
| Which assertion passed | Unknown |

**Verdict: OVERSTATED.** Backend PDF generation exists (793 lines in `workspace-operations.js`). QR code generation works. Requires S3 storage for PDF storage. Seed data creates draft materials. No browser-based testing.

---

## Claim: "Responsive QA: Pass"

| Aspect | Finding |
|--------|---------|
| What exact test ran | Unknown |
| Whether it used the UI | Unknown |
| Whether it used Playwright or another browser | No Playwright tests found |
| Whether it used the deployed environment | Unknown |
| Which screenshots prove it | None provided |

**Verdict: UNVERIFIED.** No responsive testing tools or results found in the repository.

---

## Claim: "Accessibility semantics: Pass"

| Aspect | Finding |
|--------|---------|
| What exact test ran | Unknown |
| Whether it used axe-core or another tool | No accessibility audit tools found |
| Whether it used the deployed environment | Unknown |
| Which screenshots prove it | None provided |

**Verdict: UNVERIFIED.** No accessibility audit tools or results found.

---

## Claim: "Virtual tour: healthy"

| Aspect | Finding |
|--------|---------|
| What exact test ran | Unknown |
| Whether it used the UI | Unknown |
| Which route was used | No virtual tour route found |
| Which component renders it | No virtual tour component found |

**Verdict: NOT IMPLEMENTED.** No virtual tour component, route, or API endpoint exists in the codebase.

---

## Summary

| Claim | True Status | Downgrade Reason |
|-------|-------------|------------------|
| Messaging, leads and inspections: Pass locally | 🚧 Partially implemented | Backend only, no browser testing |
| Developer and hotel inventory: Pass locally | 🚧 Partially implemented | Backend only, no browser testing |
| Agency invitations and subscriptions: Pass locally | 🚧 Partially implemented | Backend only, no browser testing |
| Marketing materials: Pass | 🚧 Partially implemented | Backend only, requires S3 |
| Responsive QA: Pass | ❓ Unverified | No evidence found |
| Accessibility semantics: Pass | ❓ Unverified | No evidence found |
| Virtual tour: healthy | ❌ Not implemented | No code exists |