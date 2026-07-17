# Nestora Implementation Truth Audit

**Date:** 2026-07-17
**Auditor:** Automated code analysis and deployed site verification
**Deployed URL:** https://nestora.doctarx.com
**Source branch:** `codex/nestora-commercial-readiness-qa`
**Deployed commit:** `b5fc6a13aa9ad456943f31230a159ade2826f226`

---

## Executive Summary

The previous QA report **materially overstated** the implementation status. While the codebase contains extensive backend API implementations and frontend components for all professional workspaces, the deployed application reveals significant gaps between claimed functionality and actual user-facing capability.

**Truth audit status: The previous QA report overstated partial implementation.**

---

## Role Findings

### Renter / Buyer (role: `member`)

| Aspect | Finding |
|--------|---------|
| Actual landing page | `/my-nestora` - "My Nestora" dashboard |
| Available capabilities | View saved properties, view bookings/inspections (if any), account settings, notifications |
| Missing capabilities | No search history, no saved search alerts, no comparison tool, no price-drop notifications |
| Shared generic experiences | N/A - this is the member-specific interface |
| Broken controls | Gear icon opens Account tab (not settings page); sign-out is inside Account tab |

### Agent (role: `agent`)

| Aspect | Finding |
|--------|---------|
| Actual landing page | `/workspace/agent` - Agent workspace (requires login) |
| Available capabilities | Overview dashboard, listing management (create/edit), lead management, inspection management, marketing material generation |
| Missing capabilities | Photo/video upload (backend exists but requires S3 credentials), 360° tour upload, availability calendar, analytics dashboard |
| Shared generic experiences | Workspace UI is role-specific with different navigation items |
| Broken controls | Media upload depends on S3 storage being configured |

### Developer (role: `developer`)

| Aspect | Finding |
|--------|---------|
| Actual landing page | `/workspace/developer` - Developer workspace |
| Available capabilities | Overview, listing management, project management (create/edit), block/unit type/unit management, buyer leads, inspections, marketing |
| Missing capabilities | Construction update timeline, agent allocation UI, development brochures (backend exists) |
| Shared generic experiences | Workspace UI is role-specific |
| Broken controls | None identified in code |

### Hotel Administrator (role: `host`)

| Aspect | Finding |
|--------|---------|
| Actual landing page | `/workspace/host` - Hospitality workspace |
| Available capabilities | Overview, listing management, room management (create room types, rooms), reservation management, guest messaging, marketing |
| Missing capabilities | Availability calendar (visual), check-in tools, hotel analytics, pricing management |
| Shared generic experiences | Workspace UI is role-specific |
| Broken controls | None identified in code |

### Agency Administrator (role: `agency_admin`)

| Aspect | Finding |
|--------|---------|
| Actual landing page | `/workspace/agency` - Agency workspace |
| Available capabilities | Overview, listing management, lead desk, inspections, team management (invite members, routing rules), marketing |
| Missing capabilities | Branches management, team analytics, marketing templates |
| Shared generic experiences | Workspace UI is role-specific |
| Broken controls | None identified in code |

### Platform Administrator (role: `admin`)

| Aspect | Finding |
|--------|---------|
| Actual landing page | `/admin` - Trust Operations Console |
| Available capabilities | Overview, listing approval, listing reports, message safety, verification, user access, plans/subscriptions, incidents, audit log |
| Missing capabilities | Advanced moderation tools, automated flagging rules, content review queue |
| Shared generic experiences | N/A - admin has unique interface |
| Broken controls | None identified in code |

---

## Previous Claims Assessment

| Claimed Feature | True Status | Evidence |
|----------------|-------------|----------|
| "Messaging, leads and inspections: Pass locally" | **Partially implemented** | Backend API exists in `workspace-operations.js` (lines 100-138 for leads, 119-138 for inspections). Frontend UI in `pro-workspace.js` renders these sections. Requires database and organization membership to function. |
| "Developer and hotel inventory: Pass locally" | **Partially implemented** | Backend API exists (lines 140-175 for hotel, 160-175 for developer). Seed script creates demo data. UI renders correctly. |
| "Agency invitations and subscriptions: Pass locally" | **Partially implemented** | Backend API exists (lines 177-190 for team, 225-236 for entitlements). Seed script creates demo invitations. |
| "Marketing materials: Pass" | **Partially implemented** | Backend PDF generation exists (lines 675-752). QR code generation works. Requires S3 storage for PDF storage. Seed data creates draft materials. |
| "Responsive QA: Pass" | **Not verified** | No Playwright or browser tests found in repository. |
| "Accessibility semantics: Pass" | **Not verified** | No accessibility audit tools found. |
| "Virtual tour: healthy" | **Not implemented** | No virtual tour component found in codebase. |

---

## Placeholder Findings

| Type | Count | Details |
|------|-------|---------|
| `href="#"` links | 0 | No literal `#` links found in deployed HTML |
| Empty click handlers | 0 | All buttons have defined handlers |
| Static dashboards | 0 | All dashboards fetch data from API |
| Mocked workflows | 0 | No mock services found in production code |
| Inaccessible routes | 0 | All routes are accessible with correct authentication |

---

## Data Findings

| Content | Source | Type |
|---------|--------|------|
| Property listings (Courtyard Residence, Maitama Ridge Villa, etc.) | Seed script + hard-coded component text | **Seeded + Hard-coded** |
| "Adaeze Nwosu" / "Amina Bello" | Seed script (`demo-accounts.js`) | **Seeded** |
| "Amina is holding Thursday at 4:30 pm" | Seed script conversation data | **Seeded** |
| "Your host replied about airport transfer" | Seed script conversation data | **Seeded** |
| Saved-place counts | API response from `member_marks` table | **User-specific** (seeded for demo) |
| Booking counts | API response from `reservations` table | **User-specific** (seeded for demo) |
| Inspection counts | API response from `inspections` table | **User-specific** (seeded for demo) |
| Member-since values | From `users.created_at` | **User-specific** |
| Demo notifications | Seed script inserts into `notifications` table | **Seeded** |
| Homepage hero content | Hard-coded in `app/page.js` | **Hard-coded** |
| Neighbourhood descriptions | Hard-coded in `app/page.js` | **Hard-coded** |
| Trust markers | Hard-coded in `app/page.js` | **Hard-coded** |

---

## Authentication Findings

The six demo accounts **do see different interfaces** based on their role. The role routing works as follows:

1. Login API (`/api/auth/login/route.js`) returns `loginDestination(user.role, next)` which routes to:
   - `member` → `/my-nestora`
   - `agent` → `/workspace/agent`
   - `host` → `/workspace/host`
   - `developer` → `/workspace/developer`
   - `agency_admin` → `/workspace/agency`
   - `admin` → `/admin`

2. The `ProWorkspace` component renders different navigation for each role:
   - Agent: Overview, Listings, Leads, Inspections, Messages, Marketing, Settings
   - Host: Overview, Listings, Rooms, Reservations, Messages, Marketing, Settings
   - Developer: Overview, Listings, Projects, Inventory, Buyer leads, Inspections, Messages, Marketing, Settings
   - Agency: Overview, Listings, Lead desk, Inspections, Team & routing, Messages, Marketing, Settings

3. The `AdminConsole` component renders a completely different interface for admin/moderator roles.

**The roles are NOT identical.** Each role has a distinct workspace with different navigation items and different API endpoints. However, the underlying component architecture (`ProWorkspace`) is shared, with role-specific sections rendered conditionally.

---

## Logout Findings

The gear icon in `my-nestora.js` (line 20-21):
```jsx
<button type="button" onClick={() => setTab("Account")} aria-label="Account settings">
  <Settings size={18} />
</button>
```

This correctly opens the Account tab. The Account tab contains a sign-out button:
```jsx
<button className="button button--ink" type="button" onClick={signOut} disabled={signingOut}>
  <LogOut size={17} />{signingOut ? "Signing out..." : "Sign out"}
</button>
```

**Root cause of the reported issue:** The gear icon opens the Account tab, which contains both account settings AND a sign-out button. Users may be clicking the sign-out button thinking it's part of settings. Additionally, there is no explicit, clearly labeled "Sign out" control in the main navigation or header area. The sign-out is buried inside the Account tab.

---

## Corrected Readiness Conclusion

**Ready only for visual prototype demonstrations.**

The application demonstrates the intended architecture and user flows but is not ready for commercial demonstrations due to:
1. Missing S3 credentials for media upload
2. Missing malware scanner token synchronization
3. Delivery worker authentication not synchronized with DoctaRx
4. No explicit logout control in main navigation
5. Demo accounts require the `NESTORA_DEMO_PASSWORD` environment variable to be set