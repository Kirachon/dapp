# GraphQL Schema Extraction Plan

This folder will host the extracted GraphQL SDL schema files.

## Steps (scaffold)

1. Create `src/graphql/schema/root.graphql` and additional files per domain (e.g., `user.graphql`, `profile.graphql`, `match.graphql`, `message.graphql`).
2. Move the inline SDL currently defined in `src/index.ts` into the `.graphql` files without changing semantics.
3. Update Apollo Server initialization to read SDL from files (using `fs.readFileSync` or `@graphql-tools/load`), preserving existing resolvers.
4. Use `codegen.ts` at repo root to emit:
   - Server resolver types to `src/graphql/__generated__/resolvers-types.ts`
   - Client types to `frontend/src/__generated__/graphql.ts`
5. Wire CI to run codegen (dry-run if dependencies are not installed locally yet).

Note: Dependency installation for GraphQL Code Generator will be proposed and executed only after explicit approval.

## Roadmap: Phases 8–10 (Observability, Security/Performance, CI/CD, Seeds/Migrations)

### Phase 8 — Observability / Performance / Security

1. Structured logging + correlation IDs (4–6h)
   - Integrate pino logger + requestId; enrich with userId; replace console.\*
   - Acceptance: requestId/userId in logs; all resolvers log INFO entries; errors at ERROR.
2. Metrics & tracing (6–10h)
   - Prometheus /metrics via prom-client; OTel tracing for Fastify + resolvers.
   - Acceptance: scrapes succeed; traces visible; latency histograms populated.
3. Security headers & rate-limit (2–3h)
   - Helmet (CSP, HSTS in prod); stricter limits on mutations.
   - Acceptance: headers present; negative tests receive 429.
4. Performance budgets & GraphQL optimizations (6–8h)
   - Lighthouse CI; Apollo cache policies; DataLoader for N+1 hotspots.
   - Acceptance: p75 <3s, GraphQL p95 <400ms, Lighthouse >90.

### Phase 9 — CI/CD Hardening

1. Workflow suite (4–6h)
   - unit.yml, lint.yml; path filters; artifacts.
   - Acceptance: PRs gated; HTML reports stored.
2. Change-aware test selection (3–4h)
   - Skip unaffected suites/browsers using paths.
   - Acceptance: reduced CI time; consistent green.
3. Release promotion controls (2–3h)
   - Require green + approval for staging→prod.
   - Acceptance: enforced in repo settings and workflows.

### Phase 10 — Seeds & Migrations

1. Seed CLI (4–6h)
   - scripts/seed.ts idempotent; roles/profiles/media placeholders (MinIO).
   - Acceptance: npm run db:seed re-runnable; verified counts.
2. Migration/rollback (3–5h)
   - prisma migrate deploy in CI; rollback docs/scripts for non-prod.
   - Acceptance: one-command rollback; PR-reviewed migrations.
3. Data consistency validators (3–4h)
   - scripts/validate-data.ts checks orphans/admin flags/relations; wired to CI.
   - Acceptance: CI fails on anomalies; report artifact.
