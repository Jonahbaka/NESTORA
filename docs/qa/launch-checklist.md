# Launch Checklist

## Stakeholder demonstration

- [x] Deploy the commercial-readiness release to AWS.
- [x] Run PostgreSQL migrations and seed six labelled accounts.
- [x] Verify the public deep-health endpoint, DNS, and TLS.
- [x] Verify application login and authorized destination for every role.
- [x] Keep the shared credential out of Git and workflow plaintext.
- [x] Verify desktop and mobile public presentation.
- [x] Generate attributed QR targets against the production origin.
- [x] Verify tablet presentation and decode a QR rendered by the live marketing page.
- [x] Verify saved homes, inspection requests, and stay requests persist through the public API and account UI.
- [x] Verify denied role access remains on the public Nestora origin.

## Before pilot

- [ ] Configure sandbox email and verify registration, reset, invitation, and workflow notifications.
- [ ] Add private object storage, signed uploads/downloads, content sniffing, and malware scanning.
- [ ] Connect priority workspace actions to authenticated APIs and durable records.
- [ ] Enforce subscription entitlements server-side.
- [ ] Add error monitoring, uptime alerts, retry queues, and audit-log retention.
- [ ] Verify backup restoration, rollback rehearsal, and low-bandwidth behavior.
- [ ] Rotate the shared demonstration credential before expanding access.

## Before unrestricted public launch

- [ ] Replace illustrative inventory with verified owner-controlled records or preserve explicit labels.
- [ ] Complete legal, privacy, data-retention, moderation, incident-response, and support ownership.
- [ ] Complete payment-provider and webhook security testing if payments are enabled.
- [ ] Complete external penetration testing and disaster-recovery rehearsal.
- [ ] Verify WAF, least privilege, secrets rotation, production backups, and observability.
