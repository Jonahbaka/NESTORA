# Nestora Rebuild Priority Plan

**Date:** 2026-07-17

---

## Classification

### Existing and Usable

Features that genuinely work in the deployed application:

| Feature | Role | Notes |
|---------|------|-------|
| Homepage with search | Public | Full SSR, working navigation |
| Login/Register | Public | Working auth flow |
| Property search | Public | `/search` with filters |
| Pricing page | Public | Static pricing information |
| Social/Community | Public | Community page |
| Trust & Safety | Public | Trust information |
| Help centre | Public | Help page |
| Privacy/Terms/Accessibility | Public | Legal pages |
| Health check API | Public | `/api/health` and `/api/health?deep=1` |
| Listings API | Public | Returns listing data |
| Session management | All | HMAC-signed tokens, secure cookies |
| Role-based middleware | All | Route protection |
| Workspace landing page | Public | Role directory |

### Repair

Features that exist but are broken or inaccessible:

| Feature | Issue | Priority | Effort |
|---------|-------|----------|--------|
| Demo account seeding | Accounts not seeded in production DB | **HIGH** | 1 hour |
| S3 storage credentials | `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` empty | **HIGH** | 2 hours |
| Malware scanner token | Auto-generated, may not match scanner | **HIGH** | 1 hour |
| Delivery webhook token | Auto-generated, may not match DoctaRx | **HIGH** | 1 hour |
| Explicit logout in My Nestora | No sign-out in main navigation | **MEDIUM** | 30 min |
| Deep health check | Returns simplified response | **MEDIUM** | 2 hours |

### Complete

Features that are partially implemented:

| Feature | Missing Piece | Priority | Effort |
|---------|--------------|----------|--------|
| Media upload | S3 credentials + frontend upload UI | **HIGH** | 4 hours |
| Marketing PDF generation | S3 storage for generated PDFs | **HIGH** | 2 hours |
| Agent profile editor | Frontend UI for professional profile | **MEDIUM** | 4 hours |
| Hotel profile editor | Frontend UI for hotel profile | **MEDIUM** | 4 hours |
| Construction update timeline | Visual timeline for development progress | **LOW** | 8 hours |
| Lead pipeline visualization | Kanban/visual pipeline for leads | **LOW** | 8 hours |
| Availability calendar | Visual calendar for hotel rooms | **LOW** | 8 hours |
| Saved collections | Group saved properties into collections | **LOW** | 4 hours |
| Security settings page | Detailed security settings UI | **LOW** | 4 hours |

### Build

Features that were never implemented:

| Feature | Role | Priority | Effort |
|---------|------|----------|--------|
| 360° virtual tour upload | Agent | **LOW** | 8 hours |
| Agent availability management | Agent | **LOW** | 4 hours |
| Analytics dashboard | All professional roles | **MEDIUM** | 12 hours |
| Development phase management | Developer | **LOW** | 4 hours |
| Hotel check-in tools | Host | **LOW** | 6 hours |
| Hotel analytics | Host | **LOW** | 8 hours |
| Agency branch management | Agency | **LOW** | 6 hours |
| Agency team analytics | Agency | **LOW** | 8 hours |
| Marketing templates | All professional roles | **LOW** | 8 hours |
| Content Security Policy header | Public | **MEDIUM** | 1 hour |

### Remove or Hide

Features currently represented as working but actually static, mocked, or misleading:

| Feature | Current State | Action | Reason |
|---------|---------------|--------|--------|
| Homepage illustrative listings | Hard-coded demo data | **Keep as-is** | Clearly labeled "Illustrative" |
| "Amina Bello" agent profile | Static demo profile | **Keep as-is** | Clearly labeled "Illustrative professional profile" |
| Neighbourhood descriptions | Hard-coded text | **Keep as-is** | Static content, not misleading |
| Trust markers | Hard-coded text | **Keep as-is** | Static content, not misleading |

---

## Recommended Implementation Sequence

### Phase 1: Production Readiness (Week 1)

| Order | Task | Dependencies |
|-------|------|--------------|
| 1 | Configure S3 credentials in AWS Secrets Manager | AWS access |
| 2 | Synchronize malware scanner token | Scanner endpoint access |
| 3 | Synchronize delivery webhook token | DoctaRx access |
| 4 | Seed demo accounts in production database | Database access, `NESTORA_DEMO_PASSWORD` |
| 5 | Add explicit logout to My Nestora header | None |
| 6 | Fix deep health check response | Database access |

### Phase 2: Professional Workspace Completion (Week 2-3)

| Order | Task | Dependencies |
|-------|------|--------------|
| 7 | Complete media upload flow (S3 integration) | Phase 1.1 |
| 8 | Complete marketing PDF generation (S3 storage) | Phase 1.1 |
| 9 | Build agent profile editor UI | None |
| 10 | Build hotel profile editor UI | None |
| 11 | Add Content Security Policy header | None |

### Phase 3: Enhancement (Week 4-6)

| Order | Task | Dependencies |
|-------|------|--------------|
| 12 | Build analytics dashboard | None |
| 13 | Build lead pipeline visualization | None |
| 14 | Build availability calendar | None |
| 15 | Build saved collections | None |
| 16 | Build security settings page | None |

### Phase 4: Future (Month 2+)

| Order | Task | Dependencies |
|-------|------|--------------|
| 17 | 360° virtual tour upload | Phase 2.7 |
| 18 | Agent availability management | None |
| 19 | Development phase management | None |
| 20 | Hotel check-in tools | None |
| 21 | Hotel analytics | None |
| 22 | Agency branch management | None |
| 23 | Agency team analytics | None |
| 24 | Marketing templates | Phase 2.8 |

---

## Effort Summary

| Phase | Tasks | Estimated Effort |
|-------|-------|------------------|
| Phase 1: Production Readiness | 6 | 8.5 hours |
| Phase 2: Workspace Completion | 5 | 22 hours |
| Phase 3: Enhancement | 5 | 36 hours |
| Phase 4: Future | 8 | 56 hours |
| **Total** | **24** | **~122.5 hours** |