# Placeholder and No-Action Inventory

## Counts

- Exact `href="#"` application links: **3**.
- No-op runtime buttons on audited product surfaces: **21**.
- Literal empty `onClick={() => {}}` handlers: **0**.
- Static professional/admin dashboards: **5**.
- Shared placeholder panels: **20 role-section instances** from one component (Calendar, Messages, Performance, Documents, Settings across four workspaces).
- Mocked/local-only workflow groups: **12**.
- Correct role destinations skipped by ordinary login: **5**.
- Literal internal links to nonexistent routes found in the source audit: **0**.

## Hash links

| File | Visible label | Expected action | Current behaviour | Classification | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `components/my-nestora.js:15` | Bookings summary | Open bookings | Prevents navigation and changes React tab | Working local navigation with placeholder URL | Use a real tab button or routed account subpage |
| `components/my-nestora.js:15` | Inspections summary | Open inspections | Prevents navigation and changes React tab | Working local navigation with placeholder URL | Use a real tab button or routed account subpage |
| `components/my-nestora.js:15` | Saved places summary | Open saved list | Prevents navigation and changes React tab | Working local navigation with placeholder URL | Use a real tab button or routed account subpage |

`#main-content` skip links are accessibility controls and are not counted as placeholders.

## No-action controls

| File | Visible label | Runtime count | Expected action | Current behaviour | Recommendation |
| --- | --- | ---: | --- | --- | --- |
| `app/properties/[id]/page.js:48` | Report this listing | 1 | Open report flow | No handler | Hide or build report submission |
| `components/admin-console.js:12` | All reports | 1 | Open full queue | No handler | Route to a server-backed queue |
| `components/admin-console.js:12` | Escalate for senior review | 1 | Persist escalation | No handler | Build audited mutation |
| `components/messages-workspace.js:46` | Message options | 1 | Open options | No handler | Hide or implement menu |
| `components/messages-workspace.js:51` | Start video call | 1 | Start/offer call | No handler | Hide until service exists |
| `components/messages-workspace.js:51` | Conversation details | 1 | Open details | No handler | Implement panel or remove |
| `components/messages-workspace.js:56` | Attach a file | 1 | Upload attachment | No handler | Hide until signed upload and scanning exist |
| `components/messages-workspace.js:56` | Attach an image | 1 | Upload image | No handler | Hide until media path exists |
| `components/messages-workspace.js:59` | Search, Files, Places | 3 | Filter thread content | No handlers | Hide or implement |
| `components/messages-workspace.js:59` | Report conversation, Block profile | 2 | Apply safety action | No handlers | Build before exposing messaging |
| `components/my-nestora.js:20` | Save preferences | 1 | Persist account preferences | No handler | Build account API and confirmation |
| `components/pro-workspace.js:35` | Notifications | 1 | Open role notifications | No handler | Connect `notifications` records |
| `components/pro-workspace.js:46` | View all | 1 | Open lead/activity list | No handler | Route to real inbox |
| `components/pro-workspace.js:46` | Lead arrows | 3 | Open lead details | No handlers | Route to authorized lead records |
| `components/pro-workspace.js:46` | Schedule options | 1 | Open schedule menu | No handler | Hide or implement |
| `components/social-feed.js:45` | Search posts | 1 | Search community posts | No handler | Hide or build server-backed search |

## Local-only or misleading success actions

| File | Control | Current behaviour | Missing operation |
| --- | --- | --- | --- |
| `components/pro-workspace.js` | Add listing / Add project | Shows success-like toast | Form, validation, media, database write, review, publish |
| `components/pro-workspace.js` | Open calendar | Shows toast only | Calendar route and records |
| `components/pro-workspace.js` | Download report | Shows toast only | Report creation and download |
| `components/pro-workspace.js` | Help and support | Shows toast only | Support request or help route |
| `components/admin-console.js` | No violation / Restrict content | Removes row from local state | Authorized mutation, reason, audit event, reload persistence |
| `components/messages-workspace.js` | Send message | Appends local array | Conversation API, participant authorization, delivery |
| `components/social-feed.js` | Post, comment, react, follow, join, report | Changes local state/toast | Authenticated social APIs and moderation |
| `components/my-nestora.js` | Mark read | Sets local count to zero | User-specific notification read state |

## Static and placeholder sections

- Agent: Calendar, Messages, Performance, Documents, Settings.
- Developer: Calendar, Messages, Performance, Documents, Settings; Projects is a static shared board.
- Host: Calendar, Messages, Performance, Documents, Settings; Reservations is a static shared board.
- Agency: Calendar, Messages, Performance, Documents, Settings; Pipeline is a static shared board.
- Admin: section label changes, but all sections retain the same static queue and metrics.
