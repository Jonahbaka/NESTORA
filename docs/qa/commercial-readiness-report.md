# Nestora Commercial Readiness Report

Date: 2026-07-16

## Recommendation

**Not ready** for partner demonstrations on a shared online environment. The local presentation, responsive experience, role boundaries, data model, deterministic commercial workflow QA, marketing output, QR attribution, and production build are substantially improved. A real isolated staging service, PostgreSQL database, object storage, email transport, and working demo logins are still absent.

## What was verified locally

- Twelve commercial data scenarios passed against a PostgreSQL-compatible in-memory adapter across renter, agent, developer, hotel, agency, and administrator roles.
- Four-message renter-agent, buyer-developer, and guest-hotel conversations persisted.
- Inspections, inventory states, reservation requests, team invitations, lead assignment, subscription assignment, verification decisions, suspension, reinstatement, and audit events persisted.
- Eight branded A4 marketing materials rendered as one-page PDFs and eight QR codes decoded to the expected attributed targets.
- Ten product surfaces were captured at eight responsive viewports. Automated checks found no horizontal overflow or broken visible images.
- Role and authorization regression tests, upload metadata policy tests, lint, type checking, unit tests, and the production build are release gates.

## Blockers

1. No isolated staging host, staging database URL, staging object-storage credentials, or staging domain is configured.
2. The Nestora repository has no GitHub Actions deployment workflow. The referenced DoctaRx workflow deploys zuma-teledoc production from its own `main` branch and is not a Nestora staging path.
3. No durable demo accounts can be verified through the application login until a real PostgreSQL environment is migrated and seeded.
4. Commercial workspace screens remain illustrative client-side presentations; they are not all connected to the new commercial schema through authenticated APIs.
5. Email delivery, WhatsApp, payment webhooks, signed media URLs, malware scanning, background jobs, CDN delivery, and cross-device persistence are not configured.

## Severity summary

- Blocker: missing isolated online staging environment and demo credentials.
- Critical: none confirmed in the locally exercised code paths.
- High: commercial workspaces are not end-to-end wired to durable APIs; cloud media and external delivery are absent.
- Medium: real PostgreSQL GiST double-booking enforcement and HTTPS cookie behavior remain unverified.
- Low: the visual catalogue is intentionally illustrative and must stay clearly labelled until real inventory is onboarded.

## Evidence

- Data workflows: `docs/qa/evidence/data/local-database-qa-results.json`
- Accessibility scan: `docs/qa/evidence/accessibility-results.json`
- Responsive results: `docs/qa/evidence/responsive/responsive-results.json`
- Marketing QR results: `docs/qa/evidence/data/marketing-qr-results.json`
- Marketing PDF results: `docs/qa/evidence/marketing/pdf/pdf-results.json`
