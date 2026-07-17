# Nestora Implementation Truth Report

Date: 2026-07-17

## Conclusion

**The previous QA report was materially inaccurate.** It correctly identified some limitations, but it still presented database fixtures, direct SQL scenarios, static role screens, local-only state changes, and public print layouts as working commercial workflows.

Nestora is not ready for demonstrations. In addition to the missing workflows, the current deployed developer-workspace capture contains large black regions that obscure navigation and content, and wide account/workspace captures clip content at the right edge.

## Audit boundary

- Deployed environment: `https://nestora.doctarx.com`
- Deployed application commit: `d989650c83467328ff7c8af4aec940b3633ef753`
- Current report branch: `codex/nestora-commercial-readiness-qa`
- Browser evidence captured through the deployed login page for renter, agent, and developer accounts.
- Existing deployment evidence was reviewed for hotel, agency, and administrator route access. Those three accounts were not fully re-clicked in a fresh browser context during this audit and their unobserved controls remain `Unknown` or are classified from the shared source component.
- No direct database mutation is treated as proof of a user-facing workflow.

## Product truth

1. All six logins default to `/my-nestora` because `app/login/page.js` supplies that default and `components/auth-panel.js` redirects only to the supplied `nextPath`. It does not choose a destination from the authenticated role.
2. `/my-nestora` is a shared generic page. The name Adaeze Nwosu, member date, profile image, account form, and two notifications are hard-coded in `components/my-nestora.js`.
3. Agent, host, developer, and agency routes exist and are authorized by `middleware.js` and `lib/access-control.js`, but all four render `components/pro-workspace.js` with different labels. Data, metrics, leads, schedules, listings, and analytics are illustrative constants.
4. The admin route renders `components/admin-console.js`. Its report queue and metrics are constants; moderation changes only React state and reset on reload.
5. Only customer marks, booking requests, and inspection requests have a deployed UI-to-API-to-PostgreSQL path. Professional processing of those requests is absent.
6. Commercial tables for leads, conversations, developments, rooms, invitations, subscriptions, verification, reports, and marketing materials exist, but there are no corresponding deployed application endpoints.
7. Current deployed screenshots contradict the previous blanket visual-pass claim: the developer workspace is materially unreadable in the retained capture and wide layouts are clipped.

## Trace of previously claimed workflows

| Workflow | Route | Page/component | Backend | Database | Permission | Test/evidence | Deployed entry point | Truth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Search | `/search` | `app/search/page.js`, `components/search-results.js` | None; static catalogue | None | Public | Deployed browser search recorded in prior evidence | Header and home search | Implemented against static catalogue |
| Save property | `/properties/[id]`, `/saved` | `components/providers.js`, `components/saved-places.js` | `GET/POST /api/account/state` | `member_marks` | Active session for persistence | Deployed UI and persisted account state | Property save control | Implemented and verified |
| Inspection request | `/properties/[id]`, `/my-nestora` | `components/inquiry-panel.js`, `components/my-nestora.js` | `POST /api/account/state` | `inspection_requests`, `audit_events` | Active session | Deployed UI request and account rendering | Property enquiry panel | Customer request works; professional processing absent |
| Stay request | `/properties/[id]`, `/my-nestora` | `components/inquiry-panel.js`, `components/my-nestora.js` | `POST /api/account/state` | `booking_requests`, `audit_events` | Active session | One request was created through an authenticated HTTP call, then rendered in UI | Stay property panel | Partial; not fully proven through the deployed date form |
| Messaging | `/messages` | `components/messages-workspace.js` | None | Tables exist but are not read or written | Protected route only | Local state; page says no message is delivered | Header Messages link | Mocked, not functional messaging |
| Agent listing upload | `/workspace/agent` | `components/pro-workspace.js` | None | `listings` seeded only | Agent route guard | Add Listing click shows only a toast | Workspace button | Static UI; no form, media, API, storage, review, or publish path |
| Lead pipeline | `/workspace/agent` | `components/pro-workspace.js` | None | `leads` seeded and changed by QA SQL | Agent route guard | Kanban uses local constants | Pipeline button | Mock data only |
| Developer inventory | `/workspace/developer` | `components/pro-workspace.js` | None | Development and unit tables/fixtures | Developer route guard | Projects renders shared static pipeline | Projects button | Backend schema and mock UI are disconnected |
| Hotel operations | `/workspace/host` | `components/pro-workspace.js` | None | Room and reservation tables/fixtures | Host route guard | Existing route-access artifact only | Direct URL; login does not route there | Backend schema and mock UI are disconnected |
| Agency invitations | `/workspace/agency` | `components/pro-workspace.js` | None | `team_invitations` seeded/changed by SQL | Agency route guard | No invitation control | None | Backend fixture only |
| Admin moderation | `/admin` | `components/admin-console.js` | None | Verification/report tables changed by QA SQL | Admin route guard | Restrict/No violation remove local row only | Direct URL; login does not route there | Static UI; no durable moderation |
| Marketing generation | `/marketing/[kind]` | `app/marketing/[kind]/page.js`, `components/print-material-actions.js` | None | `marketing_materials` seeded/changed by SQL | Public, not owner-scoped | Local render, print, PDF packaging, QR decode | No professional workspace entry point | Static print templates, not generation workflow |

## Placeholder counts

- Exact application links with `href="#"`: **3**. They switch My Nestora tabs locally and do not navigate.
- Runtime buttons with no explicit action on the audited surfaces: **21**.
- Static professional or admin dashboards: **5** (agent, host, developer, agency, admin).
- Mocked or local-only workflow groups: **12**.
- Correct role destinations not reached by ordinary login: **5** (agent, developer, host, agency, admin).

## Corrected readiness

**Not ready for demonstrations.** Customer search, saved state, inspection requests, and account activity have useful implemented paths. Role routing, visual rendering, professional workspaces, messaging, administration, and marketing generation do not meet the definition of a demonstrable commercial product.
