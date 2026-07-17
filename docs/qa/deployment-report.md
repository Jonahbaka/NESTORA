# Deployment Report

Date: 2026-07-16

## Release path

- Nestora repository: `https://github.com/Jonahbaka/NESTORA.git`
- Nestora release branch: `codex/nestora-commercial-readiness-qa`
- Deployed Nestora commit: `b5fc6a13aa9ad456943f31230a159ade2826f226`
- Deployment owner: `Jonahbaka/zuma-teledoc`
- Deployment commit: `ddb89d6cbc369e969f0e8305d6f900d06346f036`
- Production URL: `https://nestora.doctarx.com`
- EC2 address: `18.217.97.145`

The deployment uses the established zuma-teledoc auxiliary release channel. A push to zuma-teledoc `main` starts the normal `Deploy to EC2` workflow. The auxiliary workflow waits for that commit to become healthy, then builds the pinned Nestora commit, runs PostgreSQL migrations, activates the versioned PM2 release, verifies the EC2 origin, DNS, TLS, and public health endpoint, and retains the previous release for rollback.

## Verified result

| Check | Result | Evidence |
| --- | --- | --- |
| DoctaRx prerequisite deploy | Pass | Run `29515770411` completed successfully |
| Nestora auxiliary deploy | Pass | Run `29515770353` completed successfully |
| Public health | Pass | `/api/health?deep=1` returned HTTP 200, `status=ok`, `database=configured` |
| DNS | Pass | `nestora.doctarx.com` resolves to `18.217.97.145` |
| TLS and nginx | Pass | HTTPS active; workflow origin and public checks passed |
| Runtime | Pass | PM2 reported Nestora online after activation |
| Demo seed | Pass | Six labelled fictional accounts seeded through the release runner |
| Public login | Pass | Six roles authenticated and reached their authorized destinations |
| Role denial redirect | Pass | Renter access to `/workspace/agency` returned to the public My Nestora URL |

The shared demo password is generated on the server, stored with mode `600`, and emitted only as RSA-OAEP encrypted ciphertext. No reusable password is committed to either repository.

## Rollback

The EC2 release script keeps versioned releases under `/home/ec2-user/apps/nestora/releases` and switches `/home/ec2-user/apps/nestora/current` atomically. If process startup or the deep health check fails, the script restores the previous symlink and restarts the previous PM2 release.
