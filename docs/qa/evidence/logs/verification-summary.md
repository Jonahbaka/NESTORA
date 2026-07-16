# Verification Summary

Executed locally on 2026-07-16 from `codex/nestora-commercial-readiness-qa`.

| Command | Result | Key output |
| --- | --- | --- |
| `npm run qa:local-db` | Pass | 12 commercial scenarios; 27 migrated tables |
| `npm run qa:marketing-qr` | Pass | 8 QR codes decoded to attributed targets |
| `npm run qa:marketing-pdf` | Pass | 8 one-page A4 portrait PDFs generated |
| `npm run lint` | Pass | ESLint completed with zero warnings |
| `npm run typecheck` | Pass | TypeScript `--noEmit` completed cleanly |
| `npm test` | Pass | 24 tests passed, 0 failed |
| `next build` | Pass | Next.js 15.5.20 compiled; 58 static pages generated; final run exited 0 in 403 seconds |
| `git diff --check` | Pass | No whitespace errors; line-ending notices only |

The first npm build wrapper exceeded its five-minute command window after producing a valid `BUILD_ID`. The build was rerun directly through the repository's Next.js binary with telemetry disabled and completed successfully. After the final login-page semantics repair, the definitive build completed with exit code 0 in 403 seconds.

The production preview returned HTTP 200 for `/`, reported database status `not-configured`, and redirected unauthenticated protected routes to `/login`. The final ten-route production smoke evidence is in `docs/qa/evidence/production-smoke-results.json`.
