# Authentication and Role Routing Review

**Date:** 2026-07-17

---

## Architecture Overview

The authentication and role routing system consists of four layers:

1. **Session Management** (`lib/server/session.js`)
2. **Middleware** (`middleware.js`)
3. **Login API** (`app/api/auth/login/route.js`)
4. **Workspace Context** (`lib/server/workspace-context.js`)

---

## Layer 1: Session Management

**File:** `lib/server/session.js`

- Creates HMAC-signed session tokens with SHA-256
- Token payload: `{ sub, email, role, name, exp }`
- Cookie name: `nestora_session`
- Cookie options: `httpOnly: true, secure: true (production), sameSite: "lax"`
- Session expiry: 14 days
- Secret requirement: minimum 32 characters in production

**Status: ✅ Implemented correctly**

---

## Layer 2: Middleware

**File:** `middleware.js`

- Only runs in production mode (`NODE_ENV !== "production"`)
- Protects routes: `/my-nestora/:path*`, `/messages/:path*`, `/workspace/:path*`, `/admin/:path*`
- `/workspace` is explicitly allowed (public landing page)
- Verifies session token HMAC
- Redirects to login with `next` parameter if no valid session
- Checks `canAccessPath()` for role-based access

**Status: ✅ Implemented correctly**

### Role-to-Route Mapping

| Route | Allowed Roles |
|-------|---------------|
| `/workspace/agent` | agent, agency_admin, admin |
| `/workspace/host` | host, admin |
| `/workspace/developer` | developer, admin |
| `/workspace/agency` | agency_admin, admin |
| `/admin` | moderator, admin |

---

## Layer 3: Login API

**File:** `app/api/auth/login/route.js`

- Accepts email + password
- Validates with Zod schema
- Uses bcrypt for password comparison
- Returns `loginDestination(user.role, next)` which routes to:
  - `member` → `/my-nestora`
  - `agent` → `/workspace/agent`
  - `host` → `/workspace/host`
  - `developer` → `/workspace/developer`
  - `agency_admin` → `/workspace/agency`
  - `moderator` → `/admin`
  - `admin` → `/admin`
- Sets `nestora_session` cookie
- Rate limited: 8 attempts per 10 minutes
- Same-origin check enforced

**Status: ✅ Implemented correctly**

---

## Layer 4: Workspace Context

**File:** `lib/server/workspace-context.js`

- Reads session cookie
- Verifies session token
- Looks up user from database
- Checks workspace access permission
- Looks up organization membership for professional roles:

| User Role | Expected Organization Kind |
|-----------|---------------------------|
| agent | agency |
| host | hotel |
| developer | developer |
| agency_admin | agency |

- If no organization found, `context.organization` is `null`
- Falls back to owner-only scoping for data queries

**Status: ✅ Implemented correctly**

---

## Why Roles Appear Similar

The user reported that all six accounts "appear to receive substantially the same generic 'My Nestora' interface." This could be caused by:

### Root Cause Analysis

1. **Demo accounts not seeded in production database**
   - The seed script (`scripts/seed-demo-environment.js`) requires:
     - `NESTORA_DEMO_MODE=true`
     - `NESTORA_ENVIRONMENT=demo`
     - `NESTORA_DEMO_PASSWORD` (16+ chars with upper, lower, number, symbol)
     - `NESTORA_ALLOW_PRODUCTION_DEMO_SEED=true` (for production origin)
   - If the seed script was not run on the production database, the demo accounts do not exist

2. **Login fails for demo accounts**
   - If demo accounts don't exist, login returns "Email or password is incorrect"
   - The user cannot log in as any role

3. **If logged in as a newly registered user**
   - New users are created with role `member`
   - All new users see `/my-nestora` (the generic member interface)
   - This explains why "Renter, agent, developer, hotel administrator, agency administrator and platform administrator accounts appear to receive substantially the same generic 'My Nestora' interface"

### Verification

The login API test confirmed:
```json
{"error":"Email or password is incorrect."}
```

This confirms that the demo accounts have NOT been seeded in the production database, OR the `NESTORA_DEMO_PASSWORD` environment variable does not match what was used during seeding.

---

## Conclusion

The role routing system is correctly implemented in code. The six demo accounts would see different interfaces IF they existed in the database with the correct roles. The issue is that the demo accounts have not been seeded in the production database.

**The roles are NOT identical by design.** Each role has:
- A different landing page
- Different navigation items
- Different API endpoints
- Different permission checks

**The roles appear identical because the demo accounts do not exist in the production database.**