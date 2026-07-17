# Logout Defect Review

## Observed behaviour

The gear icon on My Nestora opens `/login`. It has no accessible name, and there is no separate visible Logout control.

Browser evidence:

1. The renter was signed in at `/my-nestora`.
2. The gear link was clicked.
3. The browser reached `/login` and looked signed out.
4. Returning to `/my-nestora` did not require credentials, proving the session cookie had not been cleared.

## Root cause

- `components/my-nestora.js` renders the gear as `<Link href="/login">`.
- The link does not call `POST /api/auth/logout`.
- `app/api/auth/logout/route.js` exists and correctly expires the session cookie, but repository search found no caller in the application.
- The Account tab is local component state and there is no `/settings` or account-security route.
- There is no event bubbling into logout and no middleware logout. This is a misrouted settings link, not an actual session-clearing defect.

## Risk

- Users believe they signed out when they did not.
- Shared-device sessions can remain active.
- The unlabeled icon is inaccessible.
- The product has no discoverable, trustworthy sign-out path.

## Required repair

1. Replace the gear destination with a real account settings route or the existing Account tab.
2. Add an explicit accessible Logout button.
3. Submit `POST /api/auth/logout`, then redirect to `/login` only after success.
4. Add a browser test proving the session endpoint returns unauthenticated after logout.
5. Add a browser test proving the gear never changes authentication state.

No code fix was made in this audit because the defect did not prevent account verification and the audit explicitly limited non-security implementation work. It remains a release blocker.
