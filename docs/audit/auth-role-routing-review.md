# Authentication and Role Routing Review

## Root cause

The accounts do not share the same database role. The seed script writes distinct `users.role` values and links the professional users to organisations. The identical experience is caused by post-login routing and shared static presentation.

1. `app/login/page.js` defaults `nextPath` to `/my-nestora`.
2. `components/auth-panel.js` receives the authenticated role from `/api/auth/login` but ignores it. After 800 ms it assigns `window.location.href = nextPath`.
3. `components/site-header.js` has no session-aware workspace link. It always shows the same customer navigation.
4. `app/my-nestora/page.js` renders `components/my-nestora.js` without loading the signed-in profile. The displayed identity is always Adaeze Nwosu.
5. `app/workspace/[role]/page.js` selects a workspace from the URL parameter. It does not load the user's organisation, membership, inventory, subscription, or profile.
6. `components/pro-workspace.js` switches only labels and a small number of words. All four role routes share the same metrics, leads, listing table, schedule, and placeholders.

## What is correct

- `app/api/auth/login/route.js` verifies a bcrypt hash and returns the stored role.
- `lib/server/session.js` signs the role into the HTTP-only session cookie.
- `middleware.js` verifies the signature and applies `lib/access-control.js`.
- Agent, host, developer, agency, and admin boundaries are represented in the route guard.
- `scripts/seed-demo-environment.js` creates separate role values and organisation memberships.

## What is missing

- A server-owned role landing resolver after login.
- A role-aware account/workspace switcher.
- Organisation selection for users with multiple memberships.
- Session-backed identity and profile rendering.
- Entitlement checks connected to features.
- Database-backed workspace navigation and counts.

## Effective outcome

- Renter: ordinary login reaches the intended `/my-nestora` page.
- Agent: ordinary login incorrectly reaches `/my-nestora`; direct `/workspace/agent` is allowed.
- Developer: ordinary login incorrectly reaches `/my-nestora`; direct `/workspace/developer` is allowed.
- Hotel administrator: ordinary login incorrectly reaches `/my-nestora`; prior evidence says direct `/workspace/host` is allowed.
- Agency administrator: ordinary login incorrectly reaches `/my-nestora`; prior evidence says direct `/workspace/agency` is allowed.
- Platform administrator: ordinary login incorrectly reaches `/my-nestora`; prior evidence says direct `/admin` is allowed.

The roles appear identical because the default route and the customer page are role-agnostic, not because the role claims are identical.
