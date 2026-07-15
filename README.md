# Nestora

Nestora is an African hospitality, rentals, property and neighbourhood platform. The first production market is Abuja, Nigeria.

**Product promise:** Find your place. Feel at home.

## Product Surface

- Unified discovery for stays, annual rentals, homes for sale and new developments
- Map and list search with price, area, bedroom and freshness signals
- Rich property pages with transparent fee tables, verification context and immersive tours
- Persistent shortlists, booking requests, inspection requests and a member activity centre
- Professional profiles, community feeds, moderated groups and contextual messaging
- Agent, host, developer and agency operating workspaces
- Restricted trust operations for verification, reports and moderation
- Nora, an explicitly identified digital guide for platform navigation and next-step support

## Local Development

Requirements: Node.js 20.19 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Development can use an encrypted-permissions local account file under `.data/`. Production account routes fail closed unless `DATABASE_URL` and a session secret of at least 32 characters are configured.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Architecture

- `app/`: Next.js App Router pages, metadata, API routes and route-level composition
- `components/`: shared product UI and client interaction boundaries
- `lib/data.js`: Abuja content contracts used by the current discovery index
- `lib/server/`: database, account activity, session and request-security boundaries
- `db/migrations/`: PostgreSQL schema migrations
- `public/images/nestora/`: generated and optimised first-party visual library
- `public/media/`: homepage brand film and reduced-motion poster

Guest shortlists remain locally durable for immediate UX continuity. After sign-in, saved homes, follows, community memberships, reactions, booking requests and inspection requests synchronize through the authenticated PostgreSQL service boundary. Sensitive requests are only confirmed after the server records them.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production configuration and [SECURITY.md](./SECURITY.md) for the security model.
