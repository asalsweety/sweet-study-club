# Sweet Study Club

Sweet Study Club is a Persian-first study, progress, and social-focus product. The repository is moving from a browser-to-Supabase prototype to a Cloudflare modular monolith while keeping the existing React application usable during migration.

The accepted architecture is documented in `docs/adr/0001-cloudflare-pwa-expo.md`. Delivery phases and completion gates live in `ROADMAP.md`; they include the goals extracted from the provided product evaluation without preserving its personal message metadata.

## Current Status

- The active branch is `hesam-dev`; `main` remains release-only.
- React, TypeScript, and Vite remain the web stack.
- Cloudflare Workers Static Assets builds the web client and Worker API as one deployable unit.
- D1 has a versioned local foundation migration and readiness check.
- The PWA has a manifest, service worker, offline app-shell cache, and user-controlled update prompt.
- Netlify configuration has been removed.
- Existing product screens still call Supabase temporarily. Supabase is a migration source, not the target architecture.
- No Cloudflare resource or production deployment has been created from this repository yet. `wrangler.jsonc` intentionally contains a non-deployable placeholder database ID.

## Requirements

- Node.js `22.19.x`
- npm `10.9.x`
- A writable local directory for Wrangler and Workbox state
- During the transition only: browser-safe Supabase values for screens that have not moved to the Worker API

Use `.nvmrc` when Node Version Manager is available. npm enforces the supported engine range and installs the exact dependency graph from `package-lock.json` in CI.

## Local Setup

1. Copy `.env.example` to `.env.local` and fill only browser-safe `VITE_*` values. These values are embedded in browser code; a secret or Supabase service-role key must never be placed there.
2. Run `npm ci`. This installs the reviewed lockfile exactly. Use `npm install` only when intentionally changing dependencies, because it may rewrite the lockfile.
3. Run `npm run db:migrate:local`. This applies versioned SQL to Wrangler's local D1 emulator. The command is safe for local development because it includes `--local`; adding `--remote` would mutate a Cloudflare database.
4. Run `npm run dev`. This starts Vite with the Cloudflare Worker runtime, static assets, API routes, and local bindings. It does not deploy anything.

If the local database state becomes disposable, remove only the project-specific `.wrangler/state` directory and reapply migrations. Never point tests or local migrations at production data.

## Project Commands

- `npm run dev` starts the integrated React and Worker development server.
- `npm run lint` checks browser and Worker source with Oxlint.
- `npm run typecheck` checks the browser, Node tooling, and Worker TypeScript projects without emitting source files.
- `npm run test` starts Vitest watch mode; `npm run test:run` performs one deterministic CI run.
- `npm run db:migrate:local` applies pending SQL migrations to local D1.
- `npm run db:migrations:list:local` shows local migration state without changing it.
- `npm run build` creates `dist/client` and `dist/sweet_study_club`, including the PWA service worker and generated deployment configuration.
- `npm run preview` runs the built output in the Workers runtime for a production-like local smoke test.
- `npm run validate` runs lint, strict type checking, tests, and the production build in sequence.

The Vite launcher supplies a project-local temporary directory because Windows-mounted WSL environments can expose an unwritable system TEMP path. It also prevents Cloudflare tooling from importing legacy frontend `.env` values into the Worker environment.

## Architecture

The target is a modular monolith: one deploy and one API boundary, with modules separated by business responsibility rather than by network service.

```text
src/                     React web and shared platform-neutral code
  app/                   startup, providers, routing, PWA lifecycle
  features/              auth, timer, schedule, analytics, profile, social
  entities/              domain models and business rules
  shared/api/            runtime-validated contracts shared with Worker/Expo
  shared/                 UI primitives, utilities, configuration
worker/                  Hono API, authorization, services, repositories
migrations/              reviewed D1 SQL migrations
docs/adr/                durable architecture decisions
mobile/                  future Expo Router application after API stability
```

Browser components must not access D1, R2, or Durable Objects directly. They call same-origin `/api/*` endpoints. The Worker authenticates the session, authorizes the requested resource, validates input, and then calls storage.

Shared code is deliberately limited to API contracts, validation, domain calculations, design tokens, and the generated API client. DOM components and React Native components remain platform-owned because forced UI sharing usually creates unreadable platform conditionals.

## PWA and Offline Boundaries

The service worker precaches the application shell and versioned core assets. It does not cache `/api/*`, Supabase requests, private study records, or the heavy PDF export libraries.

Updates use a prompt instead of automatic reload so an active timer is not interrupted. Offline mutation queues, conflict resolution, and background sync are not enabled until timer/session rules are server-authoritative and tested across devices.

The current SVG icon is sufficient for the foundation build, but production installability validation still requires final 192px and 512px maskable PNG artwork during the design phase.

## Worker and D1

- `GET /api/health` proves the Worker runtime can answer without touching storage.
- `GET /api/ready` proves D1 is reachable and the expected foundation migration exists.
- Readiness failures return a generic `503` response and a request ID; internal database details are not sent to the browser.
- `migrations/0001_foundation.sql` creates only schema metadata. Product and authentication tables belong to their own reviewed vertical slices.

Wrangler copies `.dev.vars` into build output only for local preview and does not deploy that file. Local Worker secrets must use ignored `.dev.vars`; production secrets must use Cloudflare encrypted secrets, never `vars` or Vite variables.

## Deployment Preparation

Remote deployment is intentionally blocked until a Cloudflare account and environments are selected.

1. Create separate preview and production D1 databases and replace the placeholder IDs in environment-specific Wrangler configuration.
2. Apply migrations to preview first and run API integration and browser smoke tests.
3. Configure required secrets through Cloudflare encrypted secrets.
4. Run `npm ci` and `npm run validate` from a clean checkout.
5. Run `wrangler deploy --dry-run --config dist/sweet_study_club/wrangler.json` to inspect the exact Worker, assets, and bindings without uploading.
6. Deploy preview, validate login/timer/privacy/export flows, and only then promote production.

Creating D1 databases, applying `--remote` migrations, setting secrets, and deploying all change external state. They require explicit environment ownership and should never be inferred from the presence of credentials.

Rollback means deploying the previous immutable Worker version while keeping database migrations backward-compatible. Destructive schema changes require an expand-migrate-contract rollout and a tested D1 Time Travel recovery procedure.

## Testing Standards

- Unit tests cover pure time, export, invitation, pagination, and contract logic with deterministic fixtures.
- Worker route tests validate response contracts, authorization failures, and private error handling.
- D1 integration tests run migrations against isolated local state and verify constraints and cross-user denial.
- React Testing Library will cover forms, route guards, loading, errors, keyboard behavior, and PWA prompts.
- Playwright will cover signup, recovery, timer lifecycle, refresh, privacy, social, export, and offline boundaries.
- Expo tests will reuse contract fixtures but exercise native storage, deep links, notifications, and platform permissions separately.

## Security and Privacy

- Treat every browser value and identifier as attacker-controlled.
- Use secure `HttpOnly`, `SameSite` cookies for sessions; do not store access tokens in `localStorage`.
- Enforce user, friend, blocked-user, and admin rules in Worker services on every request.
- Keep R2 objects private unless public access is an explicit product rule.
- Do not log tokens, email bodies, invitation secrets, private profile fields, exported records, or raw provider errors.
- Use Turnstile and rate limits on signup, login, recovery, invitations, and social mutations.
- Keep the API provider-neutral so the future Expo application cannot bypass web security rules.

## Git Workflow

- `main` is release-only.
- Active migration and refactoring happen on `hesam-dev`.
- Use focused Conventional Commits such as `feat: add cloudflare worker health contract` or `refactor: move timer behind worker api`.
- Every commit must keep lint, type checking, tests, and the build green and remain independently reviewable or revertible.
