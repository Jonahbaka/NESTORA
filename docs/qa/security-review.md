# Security Review

## Passed locally

- Exact role boundaries are centralized in `lib/access-control.js` and enforced in middleware and server authorization helpers.
- Agency administrators can reach agency and agent functions without gaining developer, hotel, or platform-administrator access.
- Admin routes reject ordinary professional roles.
- Account state revalidates the active user and current role server-side.
- Tenant-scoped database QA confirms an agency query cannot return the hotel tenant.
- Suspended listings are excluded from the active state and reinstatement is audited.
- Demo seed/reset scripts refuse production origins and require an explicit demo-mode flag, database URL, and strong password.
- Upload metadata validation rejects unsupported categories, MIME/extension mismatches, malformed sizes, and over-limit files.

## Not yet proven

- Private document access and signed media URLs: no storage integration exists.
- Malware scanning and file-content sniffing: not implemented. Metadata validation alone is not sufficient for public uploads.
- HTTPS secure-cookie behavior, CORS, CDN delivery, and cross-device session persistence: require online staging.
- Cross-tenant API access for every commercial resource: schema-level QA exists, but the workspaces are not fully API-wired.
- Subscription bypass protection: entitlement records persist, but paid feature enforcement is incomplete.
- Rate limits, password recovery delivery, provider webhooks, and operational alerting require external services.

## Required before pilot

Use private object storage with short-lived signed URLs, server-side content inspection, asynchronous malware scanning, strict ownership checks, and retained audit events. Repeat the authorization suite against real authenticated HTTP sessions and a real PostgreSQL staging database.
