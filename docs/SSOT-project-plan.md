# Open Source Dating Application — Single Source of Truth (SSOT) and Work Breakdown Structure (WBS)

This SSOT is the definitive, open-source-only technical specification and roadmap for building a scalable, secure, privacy-first dating application. All technology choices below are open source (OSI-approved licenses or widely accepted FOSS). Where cloud/SaaS is mentioned, a self-hosted open-source option is always specified and is the default.

## 1) Architecture Overview (Open Source Only)
- Pattern: Modular Monolith (Node.js/TypeScript) → clear service boundaries → optional microservices when scale triggers are met
- API:
  - GraphQL (Apollo Server) for core data
  - REST for media uploads/webhooks/health
- Gateway/Ingress: Traefik CE or Kong Gateway CE
- Datastores (default MVP):
  - PostgreSQL 16+ (primary relational store) + PostGIS for geospatial
  - Redis 7+ for cache, sessions, rate limits, queues (Redis Streams)
  - MinIO for S3-compatible object storage (media)
- Realtime: Socket.IO (WS) with Redis adapter
- Search (optional): OpenSearch (Apache 2.0) when advanced search is required
- Stream processing (scale): Apache Kafka; optional ksqlDB/Kafka Streams
- Optional polyglot (scale triggers only): Apache Cassandra (high-volume swipes), Neo4j Community (graph); prefer Postgres until proven need
- Observability: OpenTelemetry Collector + Prometheus + Grafana + Loki + Jaeger/Tempo
- CI/CD: Jenkins (self-hosted) + Argo CD (GitOps); Harbor (container registry)
- Containerization/Runtime: Docker CE/BuildKit (or Podman), containerd; Kubernetes (or k3s) for staging/prod
- Frontend: React + Vite (web-first); Flutter (mobile parity later)
- Video: OpenVidu (Apache 2.0) or Jitsi (Apache 2.0)
- Crypto/E2EE (messages): libsignal-protocol (GPLv3) or Matrix Olm (Apache 2.0); note GPL implications

## 2) Entities and Relationships (ER Model)
- User(id, email, password_hash, roles[], verification_level, created_at, last_active, deleted_at)
- Profile(user_id PK/FK, name, age>=18, gender, orientation, bio, interests[], lifestyle JSON, education, photos[], video_intro_url, prompts[], visibility)
- Preferences(user_id PK/FK, age_range, distance_km, show_me, advanced_filters JSON)
- Location(user_id PK/FK, point geography, updated_at)
- Swipe(id, user_id, target_user_id, direction: left/right/super, created_at)
- Match(id, user_id_a, user_id_b, created_at, status, reason)
- Conversation(id, match_id unique, created_at, last_message_at)
- Message(id, conversation_id, sender_id, type, content, media_urls[], created_at, read_at)
- MediaAsset(id, user_id, type, original_url, variants[], moderation_score, status, created_at)
- NotificationToken(id, user_id, provider, token, last_seen)
- Report(id, reporter_id, reported_user_id, category, evidence_urls[], status, created_at, resolved_at)
- ModerationAction(id, user_id, action, reason, created_at, moderator_id)
- AuditLog(id, actor_id, action, resource, resource_id, fields_changed[], created_at)
- FeatureUsage(id, user_id, feature, count, window_start, window_end)

Relationships: User 1—1 Profile/Preferences/Location; Swipes target Users; Match connects two Users; Match 1—1 Conversation; Conversation 1—N Messages; User 1—N MediaAsset/NotificationToken/Report; Report → ModerationAction; global AuditLog

## 3) RBAC (Roles & Permissions)
- Roles: guest, user, verified_user, moderator, support, admin
- Examples (enforced via policy engine):
  - User: create(guest), read/update/delete(self)
  - Profile: read(public rules), update(self), verify(moderator/admin)
  - Swipe: create(self, rate-limited), read(self)
  - Match: read(self), delete(self) (unmatch)
  - Message: create/read(participants), delete(self within window), moderate(moderator)
  - Media: create(self via presign), read(visibility rules), moderate
  - Report: create(user), resolve(moderator/admin)
  - Config/Analytics: admin only
- Policy: attribute-based checks (subject roles + ownership + context); request-scoped subject from session/JWT; admin operations always audited

## 4) Authentication & Authorization (All Open Source)
- Auth Server: SuperTokens (open source) for email/password + social; upgrade path to Keycloak if enterprise features needed
- Flows: signup → email verify; login → session/refresh token rotation; logout
- 2FA: TOTP (open source libraries)
- Password reset: time-limited signed token via email
- Session store: Redis; device binding; revocation list
- Age verification: default open-source pipeline (OpenCV + DeepFace/age-estimation + liveness heuristics). Adapter interfaces allow optional proprietary providers, but default remains OSS
- Authorization: JWT with roles/claims; middleware calling policy engine

## 5) Validation & Error Handling
- Validation: Zod (shared client/server schemas where possible)
- Error model: code, message (i18n-friendly), details, requestId
- Retries: client exponential backoff for idempotent ops
- Offline queue: local queue + conflict resolution on sync

## 6) APIs (GraphQL + REST)
- GraphQL Queries: me, user(id), discoveryFeed(filters), matches(cursor), conversation(id), conversations, messages(conversationId, cursor)
- GraphQL Mutations: register, login, refreshSession, logout, requestPasswordReset, resetPassword, updateProfile, updatePreferences, updateLocation, swipeUser, unmatch, sendMessage, markRead, reportUser; admin/moderation mutations are role-gated (resolveReport, moderateContent, suspendUser)
- REST (media/infra): POST /media/presign, POST /media/webhook/processed, GET /health, GET /ready, GET /metrics, POST /notifications/register-token
- Rate limits: Redis-based (e.g., swipes N/min, messages N/min, login attempts)

## 7) Database Schema (PostgreSQL + PostGIS)
- users, profiles, preferences, locations (GIST on locations.point), swipes (idx by user_id, created_at), matches (unique pair), conversations, messages (idx conversation_id, created_at), media_assets, notification_tokens, reports, moderation_actions, audit_logs, feature_usage
- Constraints: FKs with cascade where appropriate; partial indexes for active users/unread messages; RLS where feasible for user_id isolation
- Retention: scheduled jobs for anonymization/deletion (GDPR); partitioning for messages/swipes if needed

## 8) Frontend (Web-first; Accessibility & i18n)
- Stack: React + Vite, TypeScript, CSS variables/design tokens; React Query/Apollo Client
- Core pages: Auth, Onboarding/Profile wizard, Discovery (swipe), Matches/Conversations, Chat, Settings, Admin (moderation, user mgmt, analytics)
- A11y: WCAG 2.1 AA, keyboard navigation, focus states
- i18n: RTL support; message catalogs; locale-aware formatting
- Performance: 60fps swipe animations; code-splitting; image lazy-load

## 9) Media & Moderation (Open Source)
- Storage: MinIO (S3-compatible)
- Processing: FFmpeg (video), Sharp (images), queue jobs
- Moderation (OSS models): OpenCV, NudeNet (NSFW), Detoxify (toxicity). Human-in-the-loop review UI; trust scores and actions (approve, reject, escalate)
- Presigned uploads + variant generation webhook; unsafe content blocked by default

## 10) Realtime Messaging & Notifications
- Messaging: Socket.IO + Redis adapter; participants-only delivery; read receipts; typing indicators
- E2EE: libsignal-protocol (GPLv3) or Matrix Olm; keys handled client-side; server relays ciphertext
- Push: UnifiedPush/AeroGear/NTFY/Gotify; token registration API; quiet hours; rate caps

## 11) Security & Privacy (Defense-in-Depth)
- Transport: TLS 1.3, HSTS, cert pinning (clients)
- App-layer: Helmet (security headers), CSP, CSRF tokens (REST), input validation & output encoding, bcrypt/argon2 password hashing, secrets not in repo
- Rate limiting & abuse prevention: Redis-based; device/IP heuristics; account protections
- PII logging policy: redact emails/phones; structured logs with correlation IDs
- Privacy by design: data minimization, user controls for export/delete; configurable retention; audit trails
- Secrets management: Mozilla SOPS + age (with GitOps); Sealed Secrets for Kubernetes

## 12) Observability (All Open Source)
- Metrics: Prometheus; business and performance SLIs (p95 latency, error rate, swipes/min, matches/hour)
- Logs: Loki; structured JSON logs with requestId/userId (redacted PII)
- Tracing: OpenTelemetry SDK → Jaeger/Tempo
- Dashboards: Grafana (app + business)
- Alerts: Prometheus Alertmanager → Email/Matrix/Slack-compatible webhooks (self-hosted bridges)

## 13) CI/CD & Dev Tooling (All Open Source)
- CI: Jenkins (self-hosted) running lint, type-check, unit/integration/E2E, security scans
- Security Scans: Trivy (containers/deps), OWASP Dependency-Check (deps), Semgrep (SAST), OWASP ZAP (DAST)
- Coverage: stored as artifacts; SonarQube Community (self-hosted) for code quality + coverage ingestion
- Registry: Harbor; Images built with Docker CE/BuildKit or Kaniko
- CD: Argo CD (GitOps); K8s manifests/Helm
- Dev environment: Docker Compose for local; MailHog for dev email; MinIO local; Traefik ingress

## 14) Deployment & Infrastructure (Self-Hosted First)
- Local: docker-compose stack (api, postgres, redis, minio, mailhog, prometheus, grafana, loki, jaeger)
- Staging/Prod: Kubernetes (k3s/k8s) on bare metal/vms; OpenStack as optional IaaS
- CDN/Caching: Varnish Cache or Apache Traffic Server; Nginx reverse proxy caching
- Optional Cloud Providers (as deployment options only): Hetzner/OVH/DigitalOcean; always paired with self-hosted OSS components
- Disaster Recovery: backups, PITR, multi-region failover plan; documented runbooks

## 15) Testing Strategy
- Unit: services/resolvers/policies/validators (Jest/Vitest); target >85%
- Integration: GraphQL ops vs Postgres/Redis using Testcontainers; target >70%
- E2E: Playwright/Cypress critical flows (sign up → onboarding → swipe → match → message → settings)
- Security: ZAP baseline, Semgrep ruleset, dependency scans (Trivy/ODC)
- Performance: k6 scripts for p95 API (<200ms), swipe/message throughput; CI smoke perf

## 16) Scale Triggers and Evolution
- Introduce Kafka for events when DAU > 50k and async workflows spike
- Introduce Cassandra for swipes if write throughput saturates Postgres partitioning
- Introduce OpenSearch for complex search facets beyond Postgres GIN/GiST
- Consider microservices split when 1) team ownership requires autonomy 2) service exhibits distinct scaling profile 3) bounded context is stable

## 17) Third-Party Integrations — Open Source Defaults
- Age/ID verification: default OSS pipeline (OpenCV + face/age models + liveness heuristics); adapter layer permits optional commercial providers without changing app logic
- Analytics/BI: OpenTelemetry + ClickHouse (optional) + Apache Superset or Metabase (AGPL)
- Push: UnifiedPush/AeroGear/NTFY/Gotify
- Email: Postal or Mailu (prod), MailHog (dev)
- Payment (if ever needed): Kill Bill (OSS); excluded from MVP

## 18) WBS — Sequenced, Non-Overlapping Tasks
1. Project Foundation
   - 1.1 Repo + TypeScript baseline (eslint/prettier/husky)
   - 1.2 Docker Compose dev stack (api, postgres, redis, minio, mailhog)
   - 1.3 Jenkins CI pipeline (lint/type/test), artifact storage
2. Domain Model & Migrations
   - 2.1 ERD + migrations (Prisma/Knex)
   - 2.2 Seeds/fixtures for dev/test
3. Auth & Sessions
   - 3.1 SuperTokens integration (email/password + social)
   - 3.2 Email verification + password reset flows
   - 3.3 2FA (TOTP) for sensitive actions
4. RBAC Policy Layer
   - 4.1 Roles/permissions matrix + policy engine
   - 4.2 Resolver/middleware enforcement + audits
5. Core CRUD & GraphQL API
   - 5.1 User/Profile/Preferences CRUD + validation
   - 5.2 Location updates + PostGIS discovery feed
   - 5.3 Swipe + Match creation with rate limits
   - 5.4 Conversations/Messages (pagination, receipts)
   - 5.5 Reporting/Moderation CRUD + queues
6. Media Pipeline (REST)
   - 6.1 Presigned uploads + processing webhook
   - 6.2 OSS moderation models + human review UI
7. Realtime & Notifications
   - 7.1 Socket.IO + Redis adapter; auth handshake
   - 7.2 Push provider abstraction + token registration
8. Frontend Web
   - 8.1 Design system + A11y foundations
   - 8.2 Auth + onboarding wizard
   - 8.3 Discovery/swipe UI with optimistic updates
   - 8.4 Matches/Chat UI (attachments, retries)
   - 8.5 Settings (preferences/privacy/notifications/account)
9. Security Hardening
   - 9.1 Headers/CSP/CSRF/validation/sanitization
   - 9.2 Rate limiting/abuse detection
   - 9.3 Secrets via SOPS/Sealed Secrets; PII logging policy
10. Compliance & Privacy
   - 10.1 Export/delete data endpoints + audits
   - 10.2 Retention jobs (anonymize/delete)
11. Observability
   - 11.1 Structured logging + correlation IDs
   - 11.2 Prometheus metrics + Grafana dashboards + alerts
12. Testing & Quality Gates
   - 12.1 Unit/integration suites + coverage
   - 12.2 E2E critical paths; deflake CI
   - 12.3 Security + performance tests (k6/ZAP)
13. Deployment
   - 13.1 Harbor registry, image builds, manifests/Helm
   - 13.2 Argo CD rollouts; rollback plan
14. Scale-Out (Feature-flagged)
   - 14.1 Kafka events; streams for matching
   - 14.2 Cassandra for swipes (if needed)
   - 14.3 OpenSearch for advanced search
15. Mobile (Flutter)
   - 15.1 Core parity (auth, onboarding, swipe, chat)
   - 15.2 Push, deep links, media capture

## 19) Acceptance Criteria (Global)
- Complete CRUD for all entities; RBAC enforced on every operation
- Auth flows robust (signup/login/refresh/logout/reset/2FA); age verification adapter in place
- Validation and consistent error model across GraphQL/REST
- API rate limits functioning; discovery/feed geospatial queries correct
- Frontend implements flows with A11y and i18n; swipe UX at 60fps
- Security scans pass; CSP/headers verified; secrets managed via SOPS
- Observability dashboards in place; alerts wired; p95 < 200ms for critical APIs
- Tests meet coverage targets; E2E covers critical paths; performance SLOs met
- CI/CD green; staging deploys; rollback verified

## 20) Open Source Compliance Checklist (Verified)
- Databases/Caches/Storage: PostgreSQL, PostGIS, Redis, MinIO, (optional) Cassandra, Neo4j CE — all OSS
- Frameworks/Libraries/Tools: Node.js, TypeScript, Fastify/Express, Apollo Server, React, Vite, Zod, Socket.IO — OSS
- Monitoring/Logging/Observability: OpenTelemetry, Prometheus, Grafana, Loki, Jaeger/Tempo — OSS
- CI/CD/Container/Deploy: Jenkins, Argo CD, Harbor, Kubernetes, Docker CE/Podman, Traefik/Kong CE — OSS
- Third-party integrations: push (UnifiedPush/AeroGear/NTFY/Gotify), email (Postal/Mailu), age verification (OpenCV + models) — OSS defaults; adapters allow optional proprietary swaps without core changes
- Cloud services: mentioned only as deployment options; self-hosted OSS components are the default

## 21) Proprietary Mentions Replaced (Mapping)
- GitHub Actions → Jenkins (self-hosted)
- SonarCloud → SonarQube Community (self-hosted)
- Snyk → Trivy + OWASP Dependency-Check
- Codecov → SonarQube coverage or self-hosted artifact reports
- Elasticsearch/CloudWatch → OpenSearch (search) / Loki (logs)
- BunnyCDN/Cloudflare (CDN) → Varnish/Apache Traffic Server/Nginx caching
- MongoDB (SSPL) → PostgreSQL partitioning or Apache CouchDB where document store required
- HashiCorp Vault (BSL) → Mozilla SOPS + age (+ Sealed Secrets)

Notes: libsignal-protocol (GPLv3) is open source; ensure license compatibility. Alternatively use Matrix Olm (Apache 2.0) if required.

