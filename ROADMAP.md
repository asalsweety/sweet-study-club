# Sweet Study Club Delivery Roadmap

This roadmap combines the provided product evaluation, the greenfield audit, and the accepted Cloudflare/PWA/Expo architecture. A feature is complete only when its API authorization, web behavior, tests, privacy, documentation, deployment validation, and rollback path are complete.

## Working Rules

- Development happens on `hesam-dev`; `main` remains release-only.
- Cloudflare is the target runtime. Supabase remains read-only migration context until each vertical slice is replaced and verified.
- Browser and Expo clients use the same Worker API; neither client accesses storage directly.
- D1 schema, indexes, constraints, and migrations are versioned product code.
- UI role checks improve usability but never replace Worker authorization.
- PWA ships before Expo because it validates the product and API with the existing web codebase sooner.
- Expo shares contracts and domain logic, not DOM components.
- Every phase keeps lint, strict type checking, tests, dependency audit, and production build green.
- Commits use Conventional Commits and stay small enough to review and revert.

## Product Reality

The original evaluation describes a promising prototype, but several claimed capabilities were not reproducible from the repository: backend schema and authorization were absent, navigation was local tab state, PWA tooling was unconfigured, and automated tests/CI did not exist. The existing Supabase RPCs and tables are treated as behavior to inventory, not as the target design.

## Phase 0 — Repository and Architecture Baseline

Status: complete.

Delivered:

- Safe `hesam-dev` branch and release-only `main` rule.
- Removal of tracked environment files, source dumps, backup components, unused assets, and unused dependencies.
- Reproducible Node/npm versions, strict TypeScript, CI, dependency policy, and validation scripts.
- Greenfield stack decision recorded as an ADR.
- Cloudflare modular monolith selected; Vercel/Next.js and Netlify rejected for this product.
- PWA-first and Expo Router second selected instead of Capacitor.

## Phase 1 — Cloudflare and PWA Foundation

Status: in progress.

Delivered:

- Cloudflare Vite integration and Workers Static Assets configuration.
- Hono Worker with health, D1 readiness, request IDs, secure headers, generic API errors, and shared Zod response contract.
- Local D1 binding and versioned foundation migration.
- PWA manifest, app-shell service worker, API cache exclusion, and user-controlled update prompt.
- Cloudflare `_headers` security policy and removal of Netlify configuration.
- Worker/client artifact separation and successful deployment dry-run.

Remaining:

- Final install icons and automated PWA installability/accessibility checks.
- Preview and production Wrangler environments with real D1/R2 bindings.
- Clean auth provider integration, secure cookies, email verification/recovery, Turnstile, and rate limiting.
- Core identity/profile schema with negative authorization tests.
- React application providers, routes, and shared API client.

Exit gate:

- Signup, verification, login, refresh, recovery, logout, and account deletion pass locally and in preview.
- An unrelated user and a non-admin cannot read or mutate protected resources.
- PWA installs, updates without interrupting a timer, and clearly communicates offline limits.
- No Supabase credential is required for the migrated identity/profile slice.

## Phase 2 — Core Study Data Migration

Goal: move the useful study product behind the Worker API and make the server authoritative.

Deliverables:

- Inventory existing Supabase tables/RPC behavior and export any user data that must be preserved.
- D1 schema for study sessions, active timers, schedules, subjects, logs, progress, achievements, and audit events.
- Atomic start, pause, resume, stop, and recovery operations with idempotency keys.
- UTC storage with explicit Tehran presentation rules.
- Indexed analytics queries and deterministic aggregation tests.
- Complete paginated CSV export with formula-injection protection.
- R2 avatar migration through authorized upload/download endpoints.
- Reconciliation reports comparing migrated records and totals.

Exit gate:

- Timer state is consistent across refresh, reconnect, tabs, and multiple devices.
- Core screens contain no direct Supabase query or RPC.
- Data reconciliation has documented counts and accepted differences.
- A rollback can return to the previous API version without corrupting migrated data.

## Phase 3 — Readable Web Architecture

Goal: replace the monolithic web UI with feature-owned routes and accessible primitives.

Target structure:

```text
src/
  app/             providers, routes, boundaries, PWA lifecycle
  features/        auth, timer, schedule, analytics, profile, social, admin
  entities/        domain models and rules
  shared/api/      shared contracts and generated client
  shared/ui/       accessible primitives
  styles/          tokens and global foundations
  test/            fixtures and test utilities
```

Deliverables:

- Real browser routes for auth, home, progress, ranking, profile, admin, invitations, and recovery.
- TanStack Query for server state and cache invalidation; React state only for local UI state.
- Feature services calling the Worker API instead of storage SDKs.
- Split `App.tsx`, `ExportCenter.tsx`, `StudyCircle.tsx`, and the 6,000-line stylesheet.
- Design tokens, scoped styles, dialogs, forms, notices, skeletons, loading, empty, and error states.
- RTL, keyboard, screen-reader, reduced-motion, responsive, and bundle-budget checks.

Exit gate:

- Routes deep-link and browser back/forward navigation works.
- Presentation components contain no storage or provider calls.
- Oversized modules require explicit justification.
- Primary flows pass automated accessibility and browser tests.

## Phase 4 — Complete PWA Core Product

Goal: make the web application the first installable production client.

Deliverables:

- Pomodoro presets, custom cycles, breaks, focus mode, and persisted preferences.
- Server-authoritative recovery with safe local display while disconnected.
- Offline read boundaries and explicit mutation behavior; no silent stale-data claims.
- Notification permission education and supported local/web push reminders.
- Cross-tab coordination and update handling that never discards active work.
- Admin schedule overrides, holidays, audit history, and reversible actions.
- Lighthouse/installability testing with final maskable icons and store-quality metadata.

Exit gate:

- Install, update, offline, reconnect, timer, and notification scenarios pass on supported desktop and mobile browsers.
- Unsupported browser capabilities fail clearly and preserve recorded study time.

## Phase 5 — Sweet World and Social Realtime

Goal: deliver the differentiating Chibi experience and consent-based collaboration.

Deliverables:

- Visual system for typography, color, spacing, icons, illustration, motion, and RTL.
- Modular 2D Chibi customization and study-room environments with performance budgets.
- Friend profiles and field-level visibility controls.
- Invite, accept, remove, block, ranking, and comparison flows with rate limits and audit events.
- Durable Object rooms using hibernating WebSockets for active live-study coordination only.
- Presence expiry, reconnection, multi-device behavior, and abuse prevention.

Exit gate:

- Blocked or unrelated users cannot discover private data through APIs, R2, realtime, exports, or error responses.
- Visual regression, contrast, reduced-motion, responsive, memory, and low-end-device checks pass.

## Phase 6 — Premium, Payments, and AI

Goal: add commercial capabilities only after legal, geographic, provider, and privacy decisions are explicit.

Required decisions:

- Supported countries, currency, payment provider, refunds, taxes, receipts, and subscription rules.
- Premium entitlements, trials, cancellation, grace periods, and account-deletion effects.
- AI provider, Persian quality benchmark, consent, data retention, age requirements, safety, and cost ceiling.

Deliverables:

- Provider-neutral payment and AI interfaces.
- Idempotent, server-verified webhooks and central Worker entitlement checks.
- Independently feature-flagged Sweet Plus, credits, shop, counseling, and AI modules.
- Reconciliation, duplicate event, refund, cancellation, privacy, quality, abuse, and cost tests.

## Phase 7 — Expo Router Android and iOS

Goal: build native clients after the Worker API and PWA product rules are stable.

Deliverables:

- Expo SDK and Expo Router application in a workspace-ready `mobile/` package.
- Shared Zod contracts, generated API client, domain calculations, fixtures, and design tokens.
- Native-owned screens and navigation; no forced reuse of DOM components.
- Secure native session storage, universal links/App Links, invitation links, and account recovery.
- Local and push notifications through Expo, with platform-specific permission education.
- Background sync only for deferrable work; timers remain timestamp/server based rather than relying on exact background execution.
- EAS development builds, Android AAB, iOS TestFlight, signing-key management, privacy disclosures, crash reporting, and store metadata.

Exit gate:

- Authentication, deep links, timers, reconnect, notifications, offline behavior, privacy, payments, and upgrades pass on supported physical Android/iOS devices.
- Store release, rollback, credential rotation, and incident procedures are documented and rehearsed.

## Immediate Work Order

1. Complete Phase 1 auth/profile contracts and D1 schema without introducing a vulnerable dependency tree.
2. Add web routing/providers and a typed same-origin API client.
3. Migrate the timer/session vertical slice and characterize current behavior before deleting its Supabase calls.
4. Migrate analytics, profile, exports, storage, admin, and social one slice at a time.
5. Finish production PWA checks and deploy preview.
6. Begin Expo only after the API contract and core product gates pass.
