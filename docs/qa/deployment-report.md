# Deployment Report

Date: 2026-07-16

## Release path

- Nestora repository: `https://github.com/Jonahbaka/NESTORA.git`
- Nestora release branch: `codex/nestora-commercial-readiness-qa`
- Deployed Nestora commit: `4896a7903d3ae13876275d85cb2202dda808450b`
- Deployment owner: `Jonahbaka/zuma-teledoc`
- Deployment commit: `9e23cec5e754ee583ab423df7706cc813c6d237e`
- Production URL: `https://nestora.doctarx.com`
- EC2 address: `18.217.97.145`

The deployment uses the established zuma-teledoc auxiliary release channel. A push to zuma-teledoc `main` starts the normal `Deploy to EC2` workflow. The auxiliary workflow waits for that commit to become healthy, then builds the pinned Nestora commit, runs PostgreSQL migrations, activates the versioned PM2 release, verifies the EC2 origin, DNS, TLS, and public health endpoint, and retains the previous release for rollback.

## Verified result

| Check | Result | Evidence |
| --- | --- | --- |
| DoctaRx prerequisite deploy | Pass | Run `29510100067` completed successfully |
| Nestora auxiliary deploy | Pass | Run `29510099849` completed successfully |
| Public health | Pass | `/api/health?deep=1` returned HTTP 200, `status=ok`, `database=configured` |
| DNS | Pass | `nestora.doctarx.com` resolves to `18.217.97.145` |
| TLS and nginx | Pass | HTTPS active; workflow origin and public checks passed |
| Runtime | Pass | PM2 reported Nestora online after activation |
| Demo seed | Pass | Six labelled fictional accounts seeded through the release runner |
| Public login | Pass | Six roles authenticated and reached their authorized destinations |

The shared demo password is generated on the server, stored with mode `600`, and emitted only as RSA-OAEP encrypted ciphertext. No reusable password is committed to either repository.

## Rollback

The EC2 release script keeps versioned releases under `/home/ec2-user/apps/nestora/releases` and switches `/home/ec2-user/apps/nestora/current` atomically. If process startup or the deep health check fails, the script restores the previous symlink and restarts the previous PM2 release.
