# Known Limitations

1. There is no online Nestora staging environment in the available repository or credentials.
2. Demo accounts are defined and safely seedable but are not working application credentials until staging PostgreSQL is provisioned and seeded.
3. Local commercial workflows are deterministic database QA, not full browser-driven API workflows; several professional workspace actions remain illustrative.
4. The local database adapter cannot execute PostgreSQL GiST exclusion constraints. The migration contains the constraint, but it needs real PostgreSQL validation.
5. Cloud uploads, private documents, signed media URLs, malware scanning, CDN delivery, and large-file behavior are not implemented.
6. Email, WhatsApp, SMS, push, payment processing, and provider webhooks are not configured.
7. Background workers, retry queues, production observability, cross-device sessions, and cloud persistence are not verified.
8. The accessibility review covers automated semantics and visual evidence; it is not a full WCAG conformance audit.
9. The property catalogue, workspace people, analytics, businesses, ratings, and conversations shown in public/local presentation are illustrative and labelled accordingly.
10. QR codes must be regenerated with the final staging or production origin before real-world distribution.
