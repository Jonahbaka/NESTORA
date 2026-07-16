# Workflow Test Matrix

| Workflow | Local result | Online staging | Evidence or limitation |
| --- | --- | --- | --- |
| Registration and role accounts | Pass with limitation | Blocked by environment | Six accounts seed in isolated database QA; no application staging login verified |
| Renter-agent messaging | Pass | Blocked by environment | Four persisted messages with both participants |
| Save property and tour | Pass with limitation | Blocked by environment | Browser surfaces verified; saved state is not cloud cross-device state |
| Agent lead receipt and reply | Pass with limitation | Blocked by environment | Database workflow passed; workspace API integration remains incomplete |
| Inspection booking | Pass | Blocked by environment | Confirmed inspection and feedback persisted |
| Buyer-developer workflow | Pass | Blocked by environment | Lead, four messages, payment-plan request, inspection, inventory check |
| Hotel reservation | Pass with limitation | Blocked by environment | Request and overlap query passed; real PostgreSQL exclusion constraint needs staging |
| Agency invitation and lead assignment | Pass | Blocked by environment | Accepted invite, membership, assigned lead, pilot entitlement |
| Admin verification and moderation | Pass | Blocked by environment | Approve, revise, reject, report, suspend, reinstate, audit |
| Notifications | Pass with limitation | Blocked by environment | Thirteen events captured locally; no external email or WhatsApp delivery |
| Marketing generation | Pass | Blocked by environment | Eight previews, PDFs, and attributed QR codes verified |
| Responsive experience | Pass | Blocked by environment | Ten routes x eight viewports, 80 captures |
| Accessibility semantics | Pass with limitation | Blocked by environment | Automated landmarks, names, headings, alt text; no full assistive-technology audit |
| Role enforcement | Pass | Blocked by environment | Middleware and server authorization regression tests |
| Tenant isolation | Pass with limitation | Blocked by environment | Scoped database query passed; online API isolation not available |
| File uploads | Not implemented | Blocked by environment | Metadata policy tested; no upload route, storage, malware scan, or signed URL |
| Payments and entitlements | Pass with limitation | Blocked by environment | Pilot entitlement persisted; payment provider/webhooks not implemented |
