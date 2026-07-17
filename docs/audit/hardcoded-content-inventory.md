# Hard-Coded Content Inventory

| Visible content | Source | Actual origin | User-specific? | Persisted? | Finding |
| --- | --- | --- | --- | --- | --- |
| Adaeze Nwosu profile name and image | `components/my-nestora.js:15` | JSX constant | No | No | Every role sees the same identity on ordinary login |
| Member since 2026 | `components/my-nestora.js:15` | JSX constant | No | No | Not derived from `users.created_at` |
| Account full name and `adaeze@example.com` | `components/my-nestora.js:20` | Input `defaultValue` | No | No | Save Preferences has no action |
| Amina is holding Thursday at 4:30 pm | `components/my-nestora.js:15` | JSX constant | No | No | Not read from `notifications` |
| Your host replied about airport transfer | `components/my-nestora.js:15` | JSX constant | No | No | Not read from `messages` or `notifications` |
| Initial unread count 3 | `components/providers.js:8` | React initial state | No | Browser only | Clear action is local only |
| Amina Demo workspace identity | `components/pro-workspace.js:35` | JSX constant | No | No | All four professional workspaces reuse it |
| Company names and role labels | `components/pro-workspace.js:10` | `roleConfig` constant | URL-role only | No | Not loaded from `organizations` |
| Tuesday, 14 July | `components/pro-workspace.js:46` | JSX constant | No | No | Stale fixed date |
| Listing views 12,840 | `components/pro-workspace.js:46` | JSX constant | No | No | Fake analytics |
| New enquiries 46 | `components/pro-workspace.js:46` | JSX constant | No | No | Fake analytics |
| Scheduled viewings/confirmed stays 12 | `components/pro-workspace.js:46` | JSX constant | No | No | Role label changes; value does not |
| Pipeline/earnings value | `components/pro-workspace.js:46` | JSX constant | No | No | Fake analytics |
| Adaeze, Kelechi, Folasade pipeline | `components/pro-workspace.js:16` | `pipeline` constant | No | No | Reused by agent, developer, host, and agency |
| Today schedule | `components/pro-workspace.js:46` | JSX constant | No | No | Not linked to requests or reservations |
| Portfolio views/enquiries/status | `components/pro-workspace.js:47` | Static arrays plus `lib/data.js` | No | No | Not read from `listings` table |
| Message conversations and message text | `components/messages-workspace.js:9`, `lib/data.js` | Static arrays | No | Browser only for replies | Page explicitly labels replies local preview |
| Admin report queue | `components/admin-console.js` | `reports` constant | No | Browser only | Resolving a case only removes local state |
| Admin metrics and response time | `components/admin-console.js:12` | JSX constants | No | No | Not queried from audit or report tables |
| Property catalogue, including The Courtyard Residence, Maitama Ridge Villa, and Guzape Garden Duplex | `lib/data.js:15` onward | Static module data | No | No | Seed rows with similar names exist, but the UI imports this module |
| Community posts, profiles, counts, and preview engagement | `lib/data.js`, `components/social-feed.js` | Static module data and local state | No | Browser only | Not server-backed social content |
| Marketing layout copy, pricing, contacts, and QR target inputs | `app/marketing/[kind]/page.js` | Route constants and `lib/data.js` | No | No | `marketing_materials` rows are not read |
| Demo organisations, listings, leads, conversations, reservations, invitations, and verification cases | `scripts/seed-demo-environment.js` | Seed database fixtures | Yes, by demo IDs | Yes | Backend fixtures only unless a UI/API reads them |

## Dynamic customer values

These values are not hard-coded, but they are mixed with the static identity above:

- Saved-place count: `components/providers.js` merges PostgreSQL marks with browser-local marks.
- Booking count and list: loaded from `booking_requests` through `/api/account/state`.
- Inspection count and list: loaded from `inspection_requests` through `/api/account/state`.
- Property titles in account activity: stored when the request is created, while property presentation still comes from `lib/data.js`.

The resulting page looks user-specific because counts and requests can be real while the displayed person, notifications, settings, and surrounding narrative remain fictional constants.
