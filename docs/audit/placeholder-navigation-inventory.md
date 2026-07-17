# Placeholder Navigation Inventory

**Date:** 2026-07-17

---

## Summary

| Type | Count | Details |
|------|-------|---------|
| `href="#"` links | 0 | No literal `#` links found in deployed HTML |
| Empty click handlers | 0 | All buttons have defined handlers |
| Links to nonexistent routes | 0 | All routes resolve (some redirect to login) |
| `TODO` comments | 0 | No TODO comments found in production code |
| `comingSoon` references | 0 | No coming-soon markers found |
| Mock functions | 0 | No mock services in production code |
| Hard-coded success states | 0 | All API calls handle errors |
| Local-only state updates | 0 | All state changes sync with API |
| Disabled actions presented as active | 0 | No disabled-but-presented actions |
| Fake analytics | 0 | No analytics dashboard exists |
| Fake message threads | 0 | Messages are real API data |
| Fake notifications | 0 | Notifications are real API data |
| Static lead records | 0 | Leads are real API data |
| Static bookings | 0 | Bookings are real API data |
| Static inspection records | 0 | Inspections are real API data |

---

## Detailed Inventory

### Homepage (`app/page.js`)

| Element | Label | Expected Action | Current Behaviour | Recommendation |
|---------|-------|----------------|-------------------|----------------|
| "Explore all" link | "Explore all" | Navigate to `/search` | ✅ Works correctly | None needed |
| "Browse Abuja" link | "Browse Abuja" | Navigate to `/search` | ✅ Works correctly | None needed |
| "Open community" link | "Open community" | Navigate to `/social` | ✅ Works correctly | None needed |
| "See what Abuja is talking about" link | "See what Abuja is talking about" | Navigate to `/social` | ✅ Works correctly | None needed |
| "View Amina's profile" link | "View Amina's profile" | Navigate to `/profile/amina-bello` | ✅ Works correctly | None needed |
| "Open project room" link | "Open project room" | Navigate to `/properties/katampe-court-residences` | ✅ Works correctly | None needed |
| "Explore the retreat" link | "Explore the retreat" | Navigate to `/properties/zuma-rock-retreat` | ✅ Works correctly | None needed |
| "See plans and pricing" link | "See plans and pricing" | Navigate to `/pricing` | ✅ Works correctly | None needed |
| "Create account" link | "Create account" | Navigate to `/login?mode=register&next=/workspace` | ✅ Works correctly | None needed |

### Workspace Navigation (`components/pro-workspace.js`)

| Element | Label | Expected Action | Current Behaviour | Recommendation |
|---------|-------|----------------|-------------------|----------------|
| "Messages" nav item | "Messages" | Navigate to `/messages` | ✅ `window.location.assign("/messages")` | None needed |
| "Trust centre" link | "Trust centre" | Navigate to `/trust` | ✅ Works correctly | None needed |
| "Settings" button | "Settings" | Open entitlements section | ✅ Works correctly | None needed |
| "Sign out" button | "Sign out" | Log out | ✅ Works correctly | None needed |
| "Add listing" button | "Add listing" | Show create listing form | ✅ Works correctly | None needed |
| "Upload" button (media) | "Upload" | Upload media file | 🚧 Requires S3 credentials | Configure S3 |
| "Generate material" button | "Generate material" | Generate marketing PDF | 🚧 Requires S3 credentials | Configure S3 |
| "Invite" button | "Invite" | Show invite form | ✅ Works correctly | None needed |
| "Routing rule" button | "Routing rule" | Show routing rule form | ✅ Works correctly | None needed |
| "Room type" button | "Room type" | Show room type form | ✅ Works correctly | None needed |
| "Add room" button | "Add room" | Show add room form | ✅ Works correctly | None needed |
| "Add project" button | "Add project" | Show create project form | ✅ Works correctly | None needed |
| "Add block" button | "Add block" | Show create block form | ✅ Works correctly | None needed |
| "Unit type" button | "Unit type" | Show create unit type form | ✅ Works correctly | None needed |
| "Add unit" button | "Add unit" | Show create unit form | ✅ Works correctly | None needed |

### Admin Console (`components/admin-console.js`)

| Element | Label | Expected Action | Current Behaviour | Recommendation |
|---------|-------|----------------|-------------------|----------------|
| All sidebar nav items | Various | Switch admin section | ✅ Works correctly | None needed |
| "Sign out" button | "Sign out" | Log out | ✅ Works correctly | None needed |
| "Record decision" button | "Record decision" | Submit admin decision | ✅ Works correctly | None needed |
| "Resolve" button (incidents) | "Resolve" | Resolve incident | ✅ Works correctly | None needed |
| "Assign plan" button | "Assign plan" | Assign subscription | ✅ Works correctly | None needed |

### My Nestora (`components/my-nestora.js`)

| Element | Label | Expected Action | Current Behaviour | Recommendation |
|---------|-------|----------------|-------------------|----------------|
| Gear icon | "Account settings" | Open Account tab | ✅ Opens Account tab | Add explicit "Sign out" to header |
| "Sign out" button | "Sign out" | Log out | ✅ Works correctly | Move to header/nav |
| "Mark read" button | "Mark read" | Clear notifications | ✅ Works correctly | None needed |
| "Save preferences" button | "Save preferences" | Save account settings | ✅ Works correctly | None needed |
| "Security" link | "Security" | Navigate to `/trust` | ✅ Works correctly | None needed |

### Login Page (`components/auth-panel.js`)

| Element | Label | Expected Action | Current Behaviour | Recommendation |
|---------|-------|----------------|-------------------|----------------|
| "Sign in" tab | "Sign in" | Switch to sign-in mode | ✅ Works correctly | None needed |
| "Create account" tab | "Create account" | Switch to register mode | ✅ Works correctly | None needed |
| "Sign in" submit | "Sign in" | Submit login form | ✅ Works correctly | None needed |
| "Create account" submit | "Create account" | Submit registration form | ✅ Works correctly | None needed |
| "Forgot password?" link | "Forgot password?" | Navigate to `/help` | ✅ Works correctly | None needed |

---

## Conclusion

The deployed application contains **no placeholder links, empty handlers, or mock workflows**. All navigation elements have real, functional handlers. The primary gaps are:

1. **S3 credentials not configured** - Media upload and marketing PDF generation will fail
2. **Malware scanner token not synchronized** - Upload scanning may fail
3. **No explicit logout in main navigation** - Sign-out is buried in Account tab
4. **Demo accounts not accessible** - Require `NESTORA_DEMO_PASSWORD` environment variable