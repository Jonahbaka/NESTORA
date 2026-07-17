# Previous QA Claim Review

## Summary

The previous reports mixed four evidence classes without keeping their conclusions separate:

1. Unit and authorization tests.
2. Direct PostgreSQL reads and writes.
3. Local browser rendering.
4. Deployed UI workflows.

Only the fourth class proves a deployed user workflow, and only when the action starts and finishes through the UI.

| Previous claim | Exact test that ran | UI/browser | Deployed | Role | Database change | Screenshot | Route/assertion | Corrected status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Registration and role accounts: Pass | Login form plus direct protected-route navigation; route unit tests | Partial browser | Yes | Six accounts | Session only | Current renter/agent/developer captures; no complete six-role capture set | Direct destinations were reachable | Partial: login works, but five roles land on `/my-nestora` by default |
| Messaging, leads and inspections: Pass locally | `scripts/run-commercial-qa.js` counted seeded messages and directly updated leads/inspections | No UI; direct SQL | No | Script impersonated none | Yes, by SQL | None | Row counts and statuses | Inaccurate: messaging and lead UI are mocked; only customer inspection request is deployed |
| Renter-agent messaging: Pass | Static message page and SQL message fixture count | Local browser plus SQL | Page was deployed | Generic account | Local reply only; no message row | Local preview captures only | UI explicitly says no message is delivered | Mocked |
| Agent lead receipt and reply: Pass with limitation | Static `pipeline` array rendered; seeded lead queried/updated by SQL | Static browser plus SQL | Route deployed | Agent route | SQL only | Agent workspace screenshot | No lead endpoint or detail action | Mock data only |
| Inspection booking: Pass | Customer UI request plus SQL scenario for a different seeded inspection | Mixed | Customer request yes | Renter | Customer request persisted; professional update was SQL | Renter account capture | `/api/account/state` creates request | Customer request implemented; advisor workflow absent |
| Developer inventory: Pass locally | SQL checked seeded units and updated a lead/material row | No UI; direct SQL | No | None | Yes, by SQL | None | Available/reserved/sold rows existed | Backend fixtures only |
| Hotel inventory/reservation: Pass locally | SQL confirmed a seeded reservation and tested exclusion constraint | No UI; direct SQL | No | None | Yes, by SQL | None | Overlap insert failed | Backend constraint only; no hotel UI workflow |
| Agency invitations/subscriptions: Pass locally | SQL accepted a seeded invitation and checked membership; subscription rows seeded | No UI; direct SQL | No | None | Yes, by SQL | None | Membership row existed | Backend fixtures only |
| Admin verification/moderation: Pass locally | SQL updated verification, listing, report, and audit rows | No UI; direct SQL | No | None | Yes, by SQL | None | SQL assertions | Backend operations were proven possible, not user-authorized UI actions |
| Admin moderation: Pass online | Static queue buttons remove local rows | Browser | Yes | Admin direct route in prior artifact | No | No retained current admin capture | Reload restores queue | Mocked |
| Marketing materials: Pass | Static route renders, local print/PDF packaging, QR decode | Local browser/files | QR preview checked online | No authorized owner role | QA SQL changed material row, not UI | Marketing captures exist | Print and QR output rendered | Static templates work; generation workflow is not implemented |
| Responsive QA: Pass | 80 local captures at eight viewports | Browser screenshots | No; JSON URLs are `localhost:3030` | Generic/static states | None | 83 local PNGs; current deployed captures added | Local script reported no overflow | Invalid as a deployed pass; current developer capture has black occlusion and wide captures clip the right edge |
| Accessibility semantics: Pass | Automated local DOM checks for names, landmarks, headings, alt text | Automated local browser | No; JSON URLs are `localhost:3030` | Generic/static states | None | JSON only | Structural checks passed | Limited local automated check, not a full accessibility pass |
| Virtual tour: healthy | Local responsive captures plus a prior deployed canvas observation | Browser | Rendering checked online | Public | None | Local captures; no current deployed capture | Nonblank 1600x900 canvas | Rendering verified; says nothing about role workflows |
| Role enforcement: Pass | `tests/access-control.test.js`, middleware checks, direct route navigation | Unit plus browser | Yes | Six roles | None | No complete six-role set | Unauthorized route redirected | Route guard works; post-login role routing does not |
| Tenant isolation: Pass | Authorization unit tests and local database query | No complete HTTP workflow | No | Synthetic users | Local test DB | None | Query returned no outsider row | Helper/query coverage only; professional APIs do not exist |
| Payments and entitlements: Pass with limitation | Subscription fixtures and pricing calculations | No provider UI | No | None | Seeded records | None | Rows/calculations existed | Not configured or enforced as a commercial workflow |

## Invalidated language

- A database seed record is not a workflow.
- A direct SQL update is not a user action.
- A toast is not successful completion.
- A static dashboard is not a professional workspace.
- A direct protected URL is not correct post-login routing.
- A generated file in `docs/qa/evidence` is not an authorized product feature.
- A local responsive screenshot does not prove production behaviour.

No prior `Pass` label should remain attached to messaging, professional leads, developer inventory, hotel operations, agency invitations, admin moderation, subscription enforcement, or marketing generation.
