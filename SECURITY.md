# Security Model

## Account Access

- Passwords are hashed with bcrypt at cost 12.
- Sessions are HMAC-signed, expiry-bound and stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookies in production.
- Authentication endpoints validate input, enforce same-origin writes and apply a bounded in-process abuse guard.
- Production refuses local file-based account persistence and requires PostgreSQL.

The in-process guard reduces accidental bursts but is not a replacement for distributed rate limiting. Production must enforce account and IP controls at the WAF or shared data layer.

## Authorisation

Member, professional, moderator and administrator roles are distinct in the database schema. The middleware provides an unauthenticated route gate. Production service methods must also verify the signed session and required role before every protected read or mutation; edge routing alone is never an authorisation boundary.

Member activity endpoints derive ownership from the signed session, use idempotent writes for relationship state and record booking and inspection creation in the audit log.

## Property and Community Safety

- Verification status is evidence-scoped and does not guarantee property condition or title.
- Reports preserve item context for human review.
- High-risk moderation decisions support escalation and recorded outcomes.
- Messaging surfaces off-platform payment warnings and direct report/block controls.

## Data Handling

- Do not write passwords, full session tokens, identity documents or private messages to application logs.
- Store identity evidence and user uploads in private object storage with short-lived signed access.
- Hash or truncate network identifiers in durable audit records.
- Apply documented retention periods by data class and legal basis.
- Encrypt traffic end to end and use managed encryption at rest for databases, backups and object storage.

## Reporting

Security issues should be reported privately to the designated Nestora security contact. Include the affected route, reproduction steps and impact. Do not include credentials or identity documents in ordinary email.
