# Rebuild Priority Plan

## Existing and usable

1. Public catalogue search and property detail rendering.
2. Bcrypt login, signed HTTP-only session cookie, active-user revalidation, and route guards.
3. Customer saved-property persistence.
4. Customer inspection-request persistence.
5. Customer stay-request persistence and My Nestora rendering, with the form flow requiring a complete browser retest.
6. PostgreSQL migrations and core commercial schema.
7. Public marketing preview layouts, browser print, and QR rendering as static templates only.
8. Virtual-tour rendering as a visual catalogue feature.

## Repair

1. Route each authenticated role to its actual workspace after login.
2. Fix the deployed black-on-black/black-overlay rendering and right-edge clipping before showing any workspace.
3. Render the signed-in person's identity instead of Adaeze/Amina constants.
4. Replace the gear-to-login link with settings and add real logout.
5. Stop local browser state from merging one user's marks into another signed-in account.
6. Remove or disable every no-op control and every success toast that does not represent a completed operation.
7. Correct previous QA statuses and prevent direct SQL tests from being reported as UI workflow passes.

## Complete

1. Finish the customer stay form and verify it entirely through the deployed UI.
2. Connect inspection and reservation requests to professional inboxes and status transitions.
3. Connect notification records to user-specific UI and durable read state.
4. Connect subscriptions and entitlements to actual feature access.
5. Turn static marketing templates into owner-authorized generation, stored outputs, and audited downloads.

## Build

1. Agent listing create/edit flow, media upload, availability, lead inbox, follow-up, inspections, and analytics.
2. Developer project, phase, block, floor, unit type, unit, pricing, payment plan, progress, lead, and allocation operations.
3. Hotel profile, room type, room, availability calendar, reservation processing, guest messaging, pricing, check-in, and analytics.
4. Agency invitations, members, roles, shared inventory, lead routing, branches, and team analytics.
5. Admin verification, document review, listing decisions, user suspension/reinstatement, report queue, audit log, and subscription assignment APIs.
6. Real messaging APIs, participant authorization, attachments, delivery/read state, reporting, and blocking.
7. Private media storage, signed URLs, content validation, malware scanning, queues, monitoring, and backup restoration tests.

## Remove or hide

Until the corresponding operation exists, hide or label as unavailable:

- Add Listing/Add Project.
- Static lead and reservation boards.
- Fictional metrics and notification badges.
- Empty Calendar, Messages, Performance, Documents, and Settings panels.
- No-op notification, report, lead, schedule, message attachment, safety, and account controls.
- Admin moderation buttons that only remove a row locally.
- Marketing-generation claims from professional workspace copy.

## Exact implementation order

1. Authentication landing, identity, logout, and account isolation.
2. Shared API conventions: validation, ownership, tenancy, audit events, errors, and end-to-end test harness.
3. Agent listing and media workflow.
4. Customer enquiry to agent lead and inspection workflow.
5. Messaging.
6. Hotel inventory and reservation processing.
7. Developer inventory and buyer lead processing.
8. Agency team and lead routing.
9. Admin verification and moderation.
10. Subscriptions, entitlements, marketing generation, external notifications, and operational hardening.

Every stage must be accepted through the deployed UI with role-correct data, a database state change, logout/login persistence, and negative authorization tests before the next stage is described as complete.
