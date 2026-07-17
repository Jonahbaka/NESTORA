# Nestora Deployment

## Required Runtime

- Node.js 20.19 or newer
- PostgreSQL 15 or newer with `pgcrypto`
- HTTPS at the load balancer or application edge
- Persistent object storage and a CDN for user-uploaded media

## Required Environment

```text
DATABASE_URL=postgresql://...
NESTORA_SESSION_SECRET=<at least 32 random characters>
NEXT_PUBLIC_APP_ORIGIN=https://your-production-host
NESTORA_STORAGE_BUCKET=<private S3 bucket>
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=<least-privileged application identity>
AWS_SECRET_ACCESS_KEY=<from Secrets Manager>
NESTORA_MALWARE_SCAN_URL=https://your-scanner/scan
NESTORA_MALWARE_SCAN_TOKEN=<scanner bearer token>
NESTORA_DELIVERY_WEBHOOK_URL=https://your-delivery-provider/...
NESTORA_DELIVERY_WEBHOOK_TOKEN=<provider bearer token>
NESTORA_JOB_SECRET=<at least 32 random characters>
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
DATABASE_POOL_MAX=10
```

Generate the session secret through a secure secret manager. Do not place production secrets in source control, build arguments or client-prefixed environment variables.

## Release Sequence

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run migrate
npm start
```

Run migrations as a single release job before directing traffic to the new application revision. Back up the database and verify rollback compatibility before schema changes.

## AWS Reference Topology

- Route 53 and ACM for DNS and TLS
- CloudFront for static and media delivery
- AWS WAF on the public edge
- ECS Fargate or an equivalent managed Node.js runtime for Next.js
- Application Load Balancer liveness checks against `/api/health` and traffic readiness checks against `/api/health?deep=1`
- RDS PostgreSQL in private subnets with automated backups and deletion protection
- Secrets Manager for database credentials and the session secret
- S3 with private buckets, authenticated server-side object requests, malware scanning and lifecycle rules
- CloudWatch application logs, alarms and audit-log retention

Use at least two application tasks across availability zones. Keep RDS and application security groups least-privileged. Restrict administrative routes with identity-aware access at the edge in addition to application role checks.

## Launch Gates

- Production origin and cookie security verified over HTTPS
- Database migration applied and account registration/sign-in exercised
- User uploads use private object storage, type/size validation and a fail-closed malware scan before storage
- Email verification and account recovery provider configured
- Payment provider uses hosted/tokenised collection and verified webhooks
- Error monitoring, uptime checks and rate-limit observability enabled
- Data retention, deletion, incident response and moderation escalation owners assigned
- Accessibility, mobile browser and low-bandwidth checks completed
- Delivery worker invokes `POST /api/internal/delivery` with `Authorization: Bearer $NESTORA_JOB_SECRET`

## Rollback

Keep the previous application image available. If the release fails health or smoke checks, remove it from traffic and restore the prior image. Database changes must be backward compatible for at least one release; use an explicit down migration only after confirming no new-version data will be lost.
