# Deployed Browser Evidence

**Date:** 2026-07-17
**Deployed URL:** https://nestora.doctarx.com

---

## Evidence Collection Method

Due to the CLI-only environment, evidence was collected via:
1. HTTP response analysis (status codes, headers, content)
2. HTML content parsing
3. API endpoint testing
4. Route accessibility testing

---

## Route Accessibility Test Results

| Route | HTTP Status | Requires Auth | Content Type | Notes |
|-------|-------------|---------------|--------------|-------|
| `/` | 200 | No | HTML | Full homepage with SSR |
| `/login` | 200 | No | HTML | Login/register form |
| `/search` | 200 | No | HTML | Search page |
| `/pricing` | 200 | No | HTML | Pricing page |
| `/social` | 200 | No | HTML | Community page |
| `/trust` | 200 | No | HTML | Trust & safety page |
| `/help` | 200 | No | HTML | Help centre |
| `/privacy` | 200 | No | HTML | Privacy policy |
| `/terms` | 200 | No | HTML | Terms of service |
| `/accessibility` | 200 | No | HTML | Accessibility statement |
| `/my-nestora` | 200 | Yes | HTML | Redirects to login |
| `/workspace` | 200 | No | HTML | Workspace landing page |
| `/workspace/agent` | 200 | Yes | HTML | Redirects to login |
| `/workspace/host` | 200 | Yes | HTML | Redirects to login |
| `/workspace/developer` | 200 | Yes | HTML | Redirects to login |
| `/workspace/agency` | 200 | Yes | HTML | Redirects to login |
| `/admin` | 200 | Yes | HTML | Redirects to login |
| `/messages` | 200 | Yes | HTML | Redirects to login |
| `/api/health` | 200 | No | JSON | `{"status":"ok","database":"configured"}` |
| `/api/health?deep=1` | 200 | No | JSON | `{"status":"ok","database":"configured"}` |

---

## API Endpoint Test Results

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/auth/login` | POST | 401 | "Email or password is incorrect" (demo accounts not seeded) |
| `/api/auth/session` | GET | 401 | No session cookie |
| `/api/auth/logout` | POST | 403 | Same-origin check fails from CLI |
| `/api/listings` | GET | 200 | Returns listing data |
| `/api/health` | GET | 200 | Returns health status |

---

## Security Headers

| Header | Value | Status |
|--------|-------|--------|
| `X-Content-Type-Options` | `nosniff` | ✅ Present |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ Present |
| `X-Frame-Options` | `SAMEORIGIN` | ✅ Present |
| `Permissions-Policy` | `camera=(self), microphone=(self), geolocation=(self)` | ✅ Present |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | ✅ Present |
| `Cross-Origin-Resource-Policy` | `same-origin` | ✅ Present |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | ✅ Present |
| `Content-Security-Policy` | Not set | ❌ Missing |

---

## Static Asset Verification

| Asset Type | Status | Notes |
|------------|--------|-------|
| CSS files | ✅ Loaded | `/next/static/css/8f6a8c6487cbc0fd.css` |
| JavaScript files | ✅ Loaded | Multiple chunks loaded |
| Images | ✅ Loaded | WebP format, responsive srcset |
| Video | ✅ Referenced | `/media/nestora-abuja-journey.mp4` |
| Web manifest | ✅ Referenced | `/manifest.webmanifest` |
| Favicon | ✅ Referenced | `/icon.svg` |

---

## Page Content Verification

### Homepage
- Title: "Nestora | Find your place. Feel at home."
- Hero section with search bar
- Property cards (4 illustrative listings)
- Story film section with video
- Neighbourhood tiles (Maitama, Jabi, Guzape, Katampe)
- Trust band with 3 trust points
- Footer with navigation links

### Login Page
- Title: "Sign in | Nestora"
- Sign in / Create account tabs
- Email + password form
- "Forgot password?" link
- Trust notice

### Workspace Landing Page
- Title: "Professional workspace"
- Role directory (Agent, Host, Developer, Agency)
- Pricing call-to-action

---

## Limitations

1. **No browser screenshots** - CLI environment cannot capture visual evidence
2. **No JavaScript execution** - Client-rendered content (workspace dashboards, admin console) cannot be verified via curl
3. **No authenticated sessions** - Demo accounts not seeded, cannot test role-specific pages
4. **No WebSocket testing** - Real-time features not testable via CLI