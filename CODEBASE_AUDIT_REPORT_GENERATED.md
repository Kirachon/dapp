# Comprehensive Codebase Audit Report — LoveConnect Dating App
> Status Update (2025-09-06): NextAuth has been removed/deprecated across the codebase in favor of SuperTokens + GraphQL. Legacy Next.js API routes under `src/app/api/**` now return HTTP 410 Gone and are being replaced by GraphQL operations. The items below referencing NextAuth remain for historical context.



Last updated: 2025-08-20
Scope: Full-stack audit across backend (Fastify/Apollo/Prisma/SuperTokens/Socket.IO/MinIO), frontend (Next.js 15 App Router/React 19/Apollo), infra (Docker/Nginx), and tests.

## 1) Implementation Gaps & Incomplete Features

- [High] Mock auth endpoints enabled in production server bootstrap
  - Location: src/index.ts:37-137, 145-147, 165
  - Issue: Temporary mock signup/signin/refresh/signout endpoints set cookies with secure:false and allow non-ST sessions; can shadow real auth.
  - Impact: Security and consistency risk; tests may pass while real auth is bypassed.
  - Recommend: Guard behind explicit DEV flag; remove from prod builds. Fail fast when SuperTokens is unavailable; return 503.

- [High] GraphQL subscriptions scaffolded but disabled; client still assumes subs
  - Location: src/index.ts:1587-1599 (disabled); frontend uses Apollo without WS setup (frontend/src/lib/apollo.ts:25-27 comment). Chat UI likely subscribes.
  - Impact: Real-time features inconsistent; duplicated logic between Socket.IO and GraphQL subs.
  - Recommend: Choose a single real-time strategy. Either re-enable GraphQL WS with dedicated path and auth, or remove client GraphQL subs and rely on Socket.IO.

- [High] Onboarding photos page uses base64 local state; no backend upload integration
  - Location: frontend/src/app/onboarding/photos/page.tsx:37-57, 70-94, 122-126 (validation disabled), 129-147 (local save only)
  - Impact: User photos are never persisted; mock-like behavior in a critical onboarding step.
  - Recommend: Call POST /api/photos/upload-url (src/routes/photos.ts:38-72) to obtain presigned URL, put to MinIO, then persist URLs in profile via upsertMyProfile.

- [High] Admin panel depends on Admin GraphQL queries; resolvers are present but some fields are TODO-derived
  - Location: src/index.ts Admin resolvers: 765-1016, 1289-1386; frontend uses ADMIN_* queries (frontend/src/lib/admin-queries.ts)
  - Issues: revenue hardcoded TODO (808); reportCount placeholders (926, 988). Admin UI renders stats and lists, but certain values are placeholders.
  - Impact: Incomplete analytics/moderation accuracy.
  - Recommend: Implement revenue metric source; compute report counts via aggregates; add indices as needed.

- [Medium] AuthProvider is enabled but prior documentation referenced performance toggles
  - Location: frontend/src/app/providers.tsx uses <AuthProvider>; Auth context relies on SuperTokens and GET me
  - Impact: Historical flakiness if provider is toggled off; ensure it stays enabled with optimized queries.
  - Recommend: Keep provider enabled; keep useQuery skip logic as implemented to avoid early fetch.

- [Medium] Photo upload direct endpoint lacks explicit schema and antivirus scan
  - Location: src/routes/photos.ts:74-124 uses request.file(); relies on storageService validations only
  - Impact: Missing additional filtering (e.g., content scanning), although MIME/size checks exist in storage service.
  - Recommend: Add file type detection via magic bytes, optional ClamAV scan in production path, and rate limit (see middleware/validation.ts:153-161 for constants).

- [Low] CMS/Content service abundant but not surfaced in frontend
  - Location: src/services/content.ts fully implemented; frontend only has useAppConfig (frontend/src/hooks/useAppConfig.ts).
  - Impact: Unused features; dead-end until wired to UI.
  - Recommend: Expose content management UI and admin routes to manage feature flags, templates, configs.

## 2) Security Vulnerabilities

- [Critical] Mock auth endpoints set unsecured cookies and bypass SuperTokens
  - Location: src/index.ts:37-137, 145-147
  - Problem: Sets sAccessToken/sRefreshToken without CSRF protection, secure:false, sameSite:lax.
  - Impact: Session spoofing potential; mixed-mode auth.
  - Fix: Remove or gate to NODE_ENV!=='production' and explicit ALLOW_MOCK_AUTH=false default; in prod, return 503.

- [High] Public MinIO bucket policy and hardcoded dev credentials
  - Location: src/services/storage.ts:37-55 (public policy), 5-9 (MINIO creds defaults); docker-compose.yml:111-113
  - Impact: Public read for photos acceptable, but ensure path scoping; dev creds must not reach production.
  - Fix: Ensure production env flips policy to signed URLs or CDN with restricted access; enforce strong MINIO_ROOT_PASSWORD via secrets; use environment-specific bucket and endpoint.

- [High] Socket.IO allows unauthenticated test connections in non-prod based on origin/flag
  - Location: src/services/socketio.ts:72-81
  - Impact: In staging without proper NODE_ENV, could leak data paths.
  - Fix: Gate by explicit ALLOW_TEST_SOCKETS=false default; additional check for known test header in CI only.

- [High] CORS overly permissive origin: true
  - Location: src/index.ts:138-166
  - Impact: Reflects request origin, increasing CSRF risk; relies on SuperTokens antiCsrf VIA_TOKEN but broader origins widen exposure.
  - Fix: In production, set explicit allowed origins from env; disallow credentials for unknown origins.

- [Medium] Raw SQL via $queryRawUnsafe for discovery with string template
  - Location: src/index.ts:614-637, 651-652
  - Impact: Using $queryRawUnsafe is a risk if any interpolated input is not parameterized; params array used, but ensure no dynamic identifiers remain (the gender clause is conditional but parameterized).
  - Fix: Keep using parameter placeholders and avoid concatenated logic; consider $queryRaw with Prisma.sql for safer composition.

- [Medium] Email/password reset logging prints metadata
  - Location: src/auth/supertokens.ts:62-77 console logs of verification/reset links
  - Impact: Logs sensitive links; okay in dev, not in prod.
  - Fix: Suppress in production or route to secure audit sink without full tokens.

- [Medium] File upload: MIME trusts client; use magic byte detection
  - Location: src/services/storage.ts:65-71, 209-220
  - Impact: Possible disguised file types
  - Fix: Inspect buffer signatures before sharp; reject mismatches.

- [Low] Helmet CSP allows 'unsafe-inline' for styles
  - Location: src/index.ts:150-164
  - Impact: Increases XSS surface
  - Fix: For production, remove 'unsafe-inline' or add nonce-based styles.

## 3) Code Quality & Technical Debt

- [Medium] Duplicate auth systems in frontend (NextAuth + SuperTokens)
  - Location: frontend/src/lib/auth.ts and frontend/src/lib/supertokens.ts
  - Impact: Confusion and dead code; NextAuth API routes directories exist but largely empty; schema in frontend/prisma diverges from backend.
  - Fix: Remove NextAuth if not used; align on SuperTokens.

- [Medium] Multiple Prisma clients instantiated
  - Location: src/index.ts (new PrismaClient), routes/photos.ts (new PrismaClient), services/socketio.ts (new PrismaClient)
  - Impact: Extra connections; pool pressure under load.
  - Fix: Provide a shared Prisma instance (DI) everywhere; avoid new per-module clients.

- [Medium] Logging sensitive info and console noise
  - Locations: numerous console.log in auth flows, storage; may leak emails
  - Fix: Use structured logger with redaction (Fastify logger already configured for headers; extend for app logs, set level per env)

- [Low] Mixed responsibility in src/index.ts (monolithic server, schema, resolvers)
  - Impact: Hard to test/maintain
  - Fix: Extract schema, resolvers, context, routes into modules; add unit tests.

- [Low] Dead/unused directories and empty API routes
  - Location: frontend/src/app/api/auth/signin and signup directories empty; may be confusing.
  - Fix: Remove or implement.

## 4) Configuration & Infrastructure Issues

- [High] Dev credentials and permissive defaults
  - Locations: docker-compose.yml (POSTGRES_PASSWORD=app, MINIO_ROOT_PASSWORD=minio123, API_KEYS for SuperTokens), storage.ts defaults
  - Impact: If deployed as-is, weak security.
  - Fix: Enforce strong secrets in prod compose; use .env.production with CI secrets; disable public MinIO console in prod.

- [Medium] Dockerfile.dev runs npm audit fix --force
  - Location: Dockerfile.dev:21-23
  - Impact: Can break lockfile determinism; not recommended in CI.
  - Fix: Remove auto audit fix; run scans separately.

- [Medium] Nginx prod config placeholders and S3 exposure
  - Location: nginx/nginx.prod.conf:68-190
  - Issues: Placeholder cert paths; optional public S3 reverse proxy; ensure auth headers for /auth path; large timeouts
  - Fix: Review before going live; restrict MinIO exposure; configure proper domains/certs, HSTS good.

- [Low] CORS/connectSrc allows ws/wss broadly
  - Location: src/index.ts:156
  - Fix: Narrow in production to known hosts.

## 5) Testing & Documentation Gaps

- [High] Unit tests essentially missing; placeholder only
  - Location: __tests__/me.test.ts
  - Impact: No safety net for critical logic
  - Fix: Add tests for resolvers (auth, discovery, swipe, messaging), photo routes, content service; run in CI.

- [Medium] Playwright E2E depends on stable auth and realtime
  - Location: frontend; see Memories; ensure providers remain enabled
  - Fix: Stabilize auth, add Socket.IO hooks; verify <500ms latency where feasible.

- [Medium] Documentation divergence
  - There are several planning docs; ensure they reflect current architecture (e.g., subscriptions disabled, Socket.IO primary).

## Detailed Issue List (File/Line with Actions)

1) src/index.ts
- Severity: Critical — Mock auth endpoints enabled (37-137, 145-147). Action: Remove in prod; feature-flag.
- Severity: High — CORS origin: true (138-166). Action: Env-based allowlist.
- Severity: High — Subscriptions disabled causing drift (1587-1591). Action: Decide strategy.
- Severity: Medium — Helmet CSP 'unsafe-inline' (150-164). Action: tighten in prod.
- Severity: Medium — $queryRawUnsafe usage (614-652). Action: Prisma.sql or parameterize fully.

2) src/auth/supertokens.ts
- Severity: Medium — Debug=true and logs for reset/verify tokens (20, 62-77). Action: disable in prod.

3) src/routes/photos.ts
- Severity: High — No magic-bytes verification; relies on MIME (74-124). Action: add detection and antivirus in prod.
- Severity: Medium — Multiple PrismaClient instantiation (4-6). Action: inject shared client.

4) src/services/storage.ts
- Severity: High — Public bucket policy and dev creds (37-55, 5-9). Action: prod policies, secrets.
- Severity: Medium — Trusts MIME (65-71, 209-220). Action: magic bytes.

5) src/services/socketio.ts
- Severity: High — Test bypass for auth in non-prod (72-81). Action: env flag with default false; log and block by default.
- Severity: Medium — Multiple PrismaClient instantiation (5-7). Action: inject shared client.

6) frontend/src/lib/auth.ts (NextAuth)
- Severity: Medium — Parallel auth system not used elsewhere; password in frontend DB schema (frontend/prisma). Action: Remove NextAuth stack to reduce confusion unless required.

7) frontend/src/app/admin/*.tsx
- Severity: Medium — Relies on admin resolvers; some values are TODOs (stats placeholders). Action: complete backend computations; add pagination and filtering on server (already partially implemented).

8) docker-compose.yml
- Severity: High — Weak defaults for DB, MinIO; SuperTokens API_KEYS dev value (150-154). Action: Secure in prod override.

9) Dockerfile.dev
- Severity: Medium — npm audit fix --force (21-23). Action: remove.

10) __tests__/me.test.ts
- Severity: High — Placeholder only. Action: Add meaningful tests.

## Recommended Remediations (Prioritized)

1. Disable mock auth in prod; enforce CORS allowlist; tighten CSP (1–2 days)
2. Choose realtime strategy; if Socket.IO primary, remove GraphQL subs from client, add event parity (3–4 days)
3. Implement onboarding photo uploads with presigned URLs and persistence (2–3 days)
4. Harden storage: magic bytes, optional AV scan, prod bucket policy (1–2 days)
5. Consolidate Prisma client; DI pattern (0.5 day)
6. Remove NextAuth remnants (0.5–1 day)
7. Secure defaults in docker-compose.prod.yml and env templates (0.5 day)
8. Add unit tests for critical flows and photo routes (2–3 days)

## Acceptance Criteria
- No mock auth endpoints in prod builds; CORS restricted to known origins; CSP without unsafe-inline in prod
- Realtime delivery under 500ms via chosen transport; no orphaned GraphQL subs in client
- Onboarding photos persist to MinIO; profile updated with URLs; server validates content type by magic bytes
- Single PrismaClient shared; sockets and routes use DI
- NextAuth removed or fully configured; no duplicate auth systems
- Unit tests cover auth, discovery, messaging, photos; CI green

