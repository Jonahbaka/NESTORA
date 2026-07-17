# Nestora Role-Feature Matrix

**Date:** 2026-07-17
**Classification key:**
- ✅ Implemented and verified through deployed UI
- ⚠️ Implemented but inaccessible
- 🔧 Implemented only in backend
- 🖼️ Implemented only as static UI
- 📊 Implemented only with mock data
- 🔄 Shared generic screen
- 🔗 Placeholder link
- 🚧 Partially implemented
- ❌ Not implemented
- 💥 Broken
- ❓ Unknown

---

## Customer (Renter/Buyer) — role: `member`

| Feature | Status | Details |
|---------|--------|---------|
| Search | ✅ | `/search` page renders with filters |
| Save property | ✅ | Toggle saved via `useNestora().toggleSaved()` |
| Saved collections | 🚧 | Saved list renders but no collections/groups |
| Messaging | ✅ | `/messages` route exists |
| Enquiry | ✅ | Enquiry form on property pages |
| Inspection booking | ✅ | Inspection request via `addInspection()` |
| Hotel reservation | ✅ | Booking request via `addBooking()` |
| Notifications | ✅ | Notification panel with API data |
| Trips and bookings | ✅ | Bookings list from API |
| Account settings | ✅ | Account tab with preferences form |
| Security settings | 🚧 | Links to `/trust` but no detailed security UI |
| Logout | ✅ | Sign-out button in Account tab |

---

## Agent — role: `agent`

| Feature | Status | Details |
|---------|--------|---------|
| Agent dashboard | ✅ | Overview with metrics (listings, leads, inspections, messages) |
| Agent profile editor | 🔧 | Backend `professional_profiles` table exists, no frontend editor |
| Listing creation | ✅ | Create listing form in workspace |
| Listing editing | ✅ | Edit listing form in workspace |
| Photo upload | 🚧 | Media manager UI exists, requires S3 credentials |
| Video upload | 🚧 | Media manager accepts video, requires S3 credentials |
| 360° upload | ❌ | Not implemented |
| Availability management | ❌ | No availability calendar |
| Lead inbox | ✅ | Leads section with stage/priority management |
| Lead pipeline | 🚧 | Stage management exists but no visual pipeline |
| Lead follow-up | ✅ | Next action tracking |
| Inspection management | ✅ | Create/update inspections |
| Analytics | ❌ | No analytics dashboard |
| Marketing-material generation | 🚧 | PDF generation backend exists, requires S3 for storage |
| PDF export | 🚧 | Backend renders PDFs, requires S3 |
| QR-code generation | 🚧 | Backend generates QR codes, requires S3 |

---

## Developer — role: `developer`

| Feature | Status | Details |
|---------|--------|---------|
| Developer dashboard | ✅ | Overview with metrics |
| Development creation | ✅ | Create development form |
| Project editing | ✅ | Edit project details |
| Phase creation | ❌ | No phase management |
| Block creation | ✅ | Create blocks within developments |
| Floor creation | ❌ | Floors are a property of blocks, not individually managed |
| Unit-type creation | ✅ | Create unit types |
| Individual unit creation | ✅ | Create individual units |
| Unit availability | ✅ | Status management (available/reserved/sold/unavailable) |
| Unit pricing | ✅ | Price management |
| Payment plans | ✅ | Payment plan text field |
| Construction updates | 🚧 | Progress percentage field exists |
| Developer leads | ✅ | Lead management |
| Agent allocation | ❌ | No agent allocation UI |
| Development brochures | 🚧 | Marketing PDF generation exists |

---

## Hotel Administrator — role: `host`

| Feature | Status | Details |
|---------|--------|---------|
| Hotel dashboard | ✅ | Overview with room/reservation/revenue metrics |
| Hotel profile | 🔧 | Backend organization profile exists, no frontend editor |
| Room-type creation | ✅ | Create room types |
| Individual room/unit creation | ✅ | Create individual rooms |
| Availability calendar | ❌ | No visual calendar |
| Reservation inbox | ✅ | Reservation list with status management |
| Guest messaging | ✅ | Links to `/messages` |
| Pricing | ✅ | Nightly rate management |
| Booking status | ✅ | Status management (requested/confirmed/declined/cancelled/completed) |
| Check-in tools | ❌ | Not implemented |
| Hotel analytics | ❌ | No analytics |
| Hotel marketing materials | 🚧 | Marketing PDF generation exists |

---

## Agency Administrator — role: `agency_admin`

| Feature | Status | Details |
|---------|--------|---------|
| Agency dashboard | ✅ | Overview with metrics |
| Team invitation | ✅ | Invite team members |
| Team members | ✅ | Member list with role/status management |
| Roles and permissions | ✅ | Role assignment (owner/admin/manager/agent/sales/front_desk) |
| Shared inventory | ✅ | Listings visible to agency members |
| Lead assignment | ✅ | Assign leads to team members |
| Lead routing | ✅ | Routing rules with strategy (round_robin/least_active/fixed) |
| Branches | ❌ | No branch management |
| Team analytics | ❌ | No analytics |
| Marketing templates | 🚧 | Marketing PDF generation exists |

---

## Platform Administrator — role: `admin` / `moderator`

| Feature | Status | Details |
|---------|--------|---------|
| Admin dashboard | ✅ | Overview with counts |
| Agent review | ✅ | Verification case management |
| Hotel review | ✅ | Verification case management |
| Developer review | ✅ | Verification case management |
| Listing approval | ✅ | Listing approval/rejection/suspension |
| Listing rejection | ✅ | Rejection with reason |
| Listing suspension | ✅ | Suspension with reason |
| User suspension | ✅ | User status management |
| Reinstatement | ✅ | User status management |
| Report queue | ✅ | Listing reports with investigation/resolution/dismissal |
| Document review | ❓ | Verification cases include document review |
| Verification management | ✅ | Verification case approval/revision/rejection |
| Audit logs | ✅ | Audit event list |
| Subscription assignment | ✅ | Plan assignment to users/organizations |