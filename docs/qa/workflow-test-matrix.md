# Workflow Test Matrix

| Workflow | Local result | Online result | Evidence or limitation |
| --- | --- | --- | --- |
| Registration and role accounts | Pass | Pass | Six public logins and authorized destinations verified |
| Renter-agent messaging | Pass | Mocked | Message renders online but the page explicitly states it is local preview activity and not delivered |
| Save property and tour | Pass with limitation | Pass | Guzape saved in PostgreSQL; 1600 x 900 WebGL tour rendered online |
| Agent lead receipt and reply | Pass with limitation | Pass with limitation | Role workspace loads; several actions remain illustrative |
| Inspection booking | Pass | Pass with limitation | Public request persisted and rendered after redeploy; advisor processing is not connected |
| Buyer-developer workflow | Pass | Mocked | Developer role and Projects view load, but unit selection, lead updates, and payment-plan actions are not connected |
| Hotel reservation | Pass with limitation | Pass with limitation | Stay request persisted; host processing, availability updates, and confirmed-inventory protection are not connected |
| Agency invitation and lead assignment | Pass | Not implemented online | Agency role loads; there is no invitation or permission-management control |
| Admin verification and moderation | Pass | Mocked | Restrict action changes local UI, then resets on reload; no online mutation API exists |
| Notifications | Pass with limitation | Partial | In-app fixtures render; external channels are not configured |
| Marketing generation | Pass | Pass | Production-origin QR targets decode; eight PDF layouts verified locally |
| Responsive experience | Pass | Pass | Desktop, 390px mobile, and 768px tablet checks; no overflow or broken images |
| Accessibility semantics | Pass with limitation | Pass with limitation | Automated landmarks, names, headings, and alt text; no full WCAG audit |
| Role enforcement | Pass | Pass | Six allowed destinations and renter denial verified; internal-origin redirect bug fixed and redeployed |
| Tenant isolation | Pass with limitation | Not fully exercised | Scoped queries pass; broader adversarial online API testing remains |
| File uploads | Not implemented | Not implemented | Metadata policy exists; storage and malware scan are absent |
| Payments and entitlements | Pass with limitation | Not configured | Seeded entitlement exists; provider and webhook enforcement remain |
