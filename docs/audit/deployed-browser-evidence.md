# Deployed Browser Evidence

Environment: `https://nestora.doctarx.com`

## Current audit captures

| Evidence | Route | Observation |
| --- | --- | --- |
| `evidence/login-screen.png` | `/login` | Real deployed login form |
| `evidence/renter-landing.png` | `/my-nestora` | Hard-coded Adaeze identity; persisted renter booking, inspection, and saved records |
| `evidence/renter-account-tab.png` | `/my-nestora` | Static account values and Save Preferences button without an action |
| `evidence/renter-gear-result.png` | `/login` transition | Gear points to login; follow-up navigation proved the session remained active |
| `evidence/agent-landing.png` | `/my-nestora` | Agent also lands on Adaeze customer screen |
| `evidence/agent-workspace.png` | `/workspace/agent` | Direct role route is allowed; page declares its data illustrative |
| `evidence/developer-landing.png` | `/my-nestora` | Developer also lands on Adaeze customer screen |
| `evidence/developer-workspace.png` | `/workspace/developer` | Direct role route is allowed, but large black regions obscure navigation and content; Projects is a shared mock board and other sections are placeholders |

## Click results

### Renter

- Landing: `/my-nestora`.
- Overview, Trips & bookings, Inspections, Saved, and Account switch local tabs.
- Three `href="#"` summary links also switch those tabs locally.
- Persisted saved, booking, and inspection records render from `/api/account/state`.
- Notifications, profile identity, member date, and account form values are hard-coded.
- Save Preferences has no action.
- Gear opens `/login` but does not log out.

### Agent

- Ordinary login landing: `/my-nestora`, showing Adaeze Nwosu.
- Direct role route: `/workspace/agent`.
- Add Listing only displays `New listing workflow opened`.
- Notifications, View all, lead arrows, and Schedule options do nothing.
- Open Calendar, Download Report, and Help only display local toasts.
- Listings and Pipeline use static catalogue and pipeline constants.
- Calendar, Messages, Performance, Documents, and Settings render `Connect your organisation data source` placeholders.

### Developer

- Ordinary login landing: `/my-nestora`, showing Adaeze Nwosu.
- Direct role route: `/workspace/developer`.
- The retained deployed screenshot is materially unreadable because large black regions obscure most of the workspace.
- Overview and Listings reuse the agent presentation.
- Projects renders the same static pipeline cards.
- Calendar, Messages, Performance, Documents, and Settings are placeholders.

## Prior deployment artifact

`docs/qa/evidence/online-deployment-results.json` records successful direct access to `/workspace/host`, `/workspace/agency`, and `/admin`. It does not prove ordinary role-based landing, complete navigation clicking, or working professional actions. This audit therefore uses it only as route-access evidence.

## Browser-context limitation

The available in-app browser creates fresh tabs but does not expose a supported clean profile/context operation. Each observed account was re-authenticated through the real login form, which replaced the session, but shared browser storage could not be independently cleared or inspected. The current audit does not claim full clean-context completion for all six roles.

No browser recording was produced. Screenshots are the retained visual evidence.

## Visual contradiction

The current renter and professional captures also show right-edge clipping in wide layouts. These captures invalidate any unqualified statement that the deployed responsive experience passed. The prior responsive JSON was generated against `http://localhost:3030`, not the deployed origin.
