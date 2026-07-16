# Demo Accounts

All identities are fictional QA profiles. They must only be seeded into a local, demo, test, or staging database with `NESTORA_DEMO_MODE=true`.

Login URL after staging exists: `<staging-origin>/login`

| Role | Email | Preloaded data |
| --- | --- | --- |
| Renter / buyer | `renter.qa@demo.nestora.local` | Saved and viewed places, enquiry, inspection, messages |
| Independent agent | `agent.qa@demo.nestora.local` | Listings, lead, inspection, marketing access, analytics fixture |
| Developer administrator | `developer.qa@demo.nestora.local` | Development, blocks, unit types, available/reserved/sold inventory, lead |
| Hotel administrator | `hotel.qa@demo.nestora.local` | Hotel, room inventory, reservation request, guest thread |
| Agency administrator | `agency.qa@demo.nestora.local` | Agency, team membership, invitation, assigned lead, pilot entitlement |
| Platform administrator | `admin.qa@demo.nestora.local` | Verification decisions, report, suspension, reinstatement, audit events |

## Password handling

No reusable password is stored in Git. Set a strong value through `NESTORA_DEMO_PASSWORD` when seeding. There is currently no working staging password to share because no staging database or deployment target is configured.

## Seed and reset

```powershell
$env:NESTORA_DEMO_MODE='true'
$env:NEXT_PUBLIC_APP_ORIGIN='https://your-isolated-staging-host'
$env:DATABASE_URL='<isolated-staging-postgresql-url>'
$env:NESTORA_DEMO_PASSWORD='<strong-temporary-password>'
npm run migrate
npm run demo:seed
```

Run `npm run demo:reset` with the same safety variables to remove only labelled demo records.
