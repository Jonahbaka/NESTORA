# Demo Accounts

All identities and records are fictional, labelled QA data on the deployed Nestora environment.

Login URL: `https://nestora.doctarx.com/login`

| Role | Email | Verified destination | Preloaded data |
| --- | --- | --- | --- |
| Renter / buyer | `renter.qa@demo.nestora.local` | `/my-nestora` | Saved and viewed places, enquiry, inspection, messages |
| Independent agent | `agent.qa@demo.nestora.local` | `/workspace/agent` | Listings, lead, inspection, marketing access, analytics fixture |
| Developer administrator | `developer.qa@demo.nestora.local` | `/workspace/developer` | Development, blocks, unit types, inventory, lead |
| Hotel administrator | `hotel.qa@demo.nestora.local` | `/workspace/host` | Hotel, room inventory, reservation request, guest thread |
| Agency administrator | `agency.qa@demo.nestora.local` | `/workspace/agency` | Agency, membership, invitation, assigned lead, pilot entitlement |
| Platform administrator | `admin.qa@demo.nestora.local` | `/admin` | Verification decisions, report, moderation, audit events |

## Password handling

All six accounts share one temporary password supplied privately with the release handoff. It is generated on EC2, stored outside the release tree with mode `600`, and returned from GitHub Actions only as RSA-OAEP encrypted ciphertext. The password and private decryption key are not stored in Git.

The seed command remains fail-closed. It requires demo mode, an approved environment, a strong password, a database URL, and a separate deployment-only approval before it accepts the exact `https://nestora.doctarx.com` origin. Lookalike subdomains remain rejected.

## Rotation

Remove `/home/ec2-user/.config/doctarx-aux/nestora-demo-password` through an authorized server operation and run the auxiliary release again. The runner generates a new password and updates every labelled demo account idempotently.
