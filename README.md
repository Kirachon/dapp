# Dating App (API)

Production-focused GraphQL API built on Fastify, Prisma, and SuperTokens.

## Features

- Auth: SuperTokens Email/Password + Sessions
- Profiles & Preferences
- Discovery Feed
- Swipes & Matches
- Conversations & Messages
- Read Receipts
- Rate limiting, validation, error handling
- Basic metrics endpoint

## Docs

- See docs/API.md and docs/DEVELOPER_SETUP.md

## Quickstart

- npm install
- docker compose up -d
- npm run prisma:migrate
- npm run dev

## Security Configuration

1. Copy environment template

```
cp .env.example .env
```

2. Key security env vars

- GRAPHQL_MAX_COMPLEXITY (default 300)
- GRAPHQL_MAX_DEPTH (default 10)
- ADMIN_IP_WHITELIST (comma-separated IPs; deny-by-default in production when empty)
- CSP_REPORT_ONLY (default false)
- CSP_REPORT_URI (optional; defaults to backend /csp-report)

3. Admin IP allowlist

- Production: requests to admin endpoints are allowed only when the client IP is in ADMIN_IP_WHITELIST
- Development: allow by default for DX when whitelist is empty

4. Content Security Policy

- Frontend adds strict CSP in production; use CSP_REPORT_ONLY=true in development to collect reports without blocking

See SECURITY.md for detailed guidance.
