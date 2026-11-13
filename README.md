# Sweet Study Club

Sweet Study Club is a Persian-first study, progress, and social-focus product. The repository is moving from a browser-to-Supabase prototype to a Cloudflare modular monolith while keeping the existing React application usable during migration.

The accepted architecture is documented in `docs/adr/0001-cloudflare-pwa-expo.md`. Delivery phases and completion gates live in `ROADMAP.md`; they include the goals extracted from the provided product evaluation without preserving its personal message metadata.

## Current Status

- The active branch is `hesam-dev`; `main` remains release-only.
- The whole product runs on one Cloudflare Worker (Hono API + static PWA) with D1. Supabase has been removed completely.
- Features: email/password accounts (Better Auth), study timer with scheduled parts / free / Pomodoro modes, konkur-style test results (درصد with negative marking), focus rating and notes, a full-screen focus room with a digital or animated Chibi Asal scene and generated ambient sounds, daily/monthly planner with reminders, progress (day/week/month vs previous, best/longest day, favourite subject, heatmap), XP/levels/badges, Study DNA, CSV/PNG/print exports, friends (codes, invite links, requests, blocking), opt-in Live Study and leaderboard league, cheers, shop with Sweet Plus and Plan by Asal requests, and the admin Studio (overview, users/roles, daily parts, holidays, plan replies, broadcasts, prices).
- The PWA installs with maskable icons, shortcuts and an offline app shell; API responses are never cached.
- Payments use a local-only stand-in (`/api/shop/orders/:id/dev-pay` refuses outside `APP_ENVIRONMENT=local`) until a real gateway is configured.
- Production is deployed at <https://asal.zendegidarkhavarmiane.lol> in the domain owner's Cloudflare account, with an isolated D1 database, encrypted auth secret, email/password sign-in and Workers AI. See [deployment instructions](docs/cloudflare-production.md). The older `env.asal` test deployment remains separate; the top-level configuration is local-only.

## Learning and exams

The **Learning and exam hub** lives at `/learn`, with question banks, educational and exam modes, mind maps, micro-lessons, spaced review, private notes/highlights, preparation checklists, score tracking, and AI assistance. Its library contains 445 native Persian exam questions and 24 Persian textbook adaptations, with original paper images and source answer keys. Studio includes content import and scheduled weekly publication. See [docs/learning-hub.md](docs/learning-hub.md) for content provenance and configuration.

## Experience and showcase features

- **Motion system.** Pages cascade in section by section, the active navigation pill morphs between items (View Transitions where supported), dialogs spring open, numbers count up, the daily goal ring draws itself in, and charts grow from their baseline. Every animation respects `prefers-reduced-motion`. Styles live in `src/styles/experience.css`.
- **Command palette.** `Ctrl/⌘ + K` (or `/`) opens a search over every page plus quick actions: start a session, open the focus room, invite a friend, switch dark mode or any theme preset. It folds Arabic/Persian letter forms and digits so either keyboard matches.
- **Live session capsule.** While a timer runs, a capsule with the subject and live clock sits in the desktop header and floats above the phone tab bar; one tap returns to the focus room.
- **Session celebration.** Finishing a session (from Today or the focus room) shows confetti, a trophy card with animated minutes and test percentage, and progress toward today's goal. Level-ups also fire confetti.
- **Asal's pixel study room.** When a session starts, a lo-fi pixel-art room appears in the timer card and fills the focus room ("اتاق پیکسلی"): Asal writes and nods along while the timer runs, dozes with floating "z"s when paused, and sips tea with happy eyes on a pomodoro break, beside a rainy or snowy city window, string lights, a desk lamp, a steaming mug and a sleeping cat. The four scene options change the room and weather; day and night follow Tehran time. Her sprite is generated from the illustrated character by `python scripts/pixelate-asal.py` (Pillow) into `public/images/pixel/asal-desk.png`. The scene draws at ~12 fps, pauses off-screen, and shows a still frame for reduced-motion users.
- **Focus room.** The pixel room or an animated aurora backdrop with a breathing halo, a compact control dock, a fullscreen button, `Space` to pause/resume, `F` for fullscreen, and a screen wake lock while a session runs.
- **Clock.** Timers use the display font with fixed-width digit slots so the time never jitters, and the colon breathes while running.
- **In-app confirmations.** Deleting a plan item, subject, friend or club part, and blocking someone, use the app's own confirmation dialog instead of the browser's.
- **Native feel on phones.** A floating glass tab bar, bottom sheets with a swipe-down handle, safe-area padding under the notch and home indicator, no tap flash or long-press text selection on controls, 16px inputs (no iOS zoom), no stuck hover states, per-theme status-bar color, and light haptics on Android.
- **Typography.** Body text uses Estedad (`@fontsource-variable/estedad`, OFL). Titles, headings and clocks use the handwritten **Mahboubeh Mehravar**, with the free **Lalezar** (`@fontsource/lalezar`, OFL) as fallback. All free fonts are self-hosted and precached for offline use.

### Title font

Titles use **Mahboubeh Mehravar** (fontiran.com), which the owner confirmed is free to use on the site. The file is kept out of this public repository in the git-ignored `public/fonts/licensed/mahboubeh-mehravar.woff2`. `npm run cf:build:production` ships and precaches it whenever that file exists on the building machine, and prints whether it was included; a checkout without the file falls back to the free Lalezar. Other builds include it only with `VITE_TITLE_FONT_LICENSED=true`.

### Demo data for a walkthrough or video

`npm run demo:seed` fills the **local** D1 database (the script hard-codes `--local`) with a ready-to-use admin login: five weeks of study history with a current streak, six subjects, today's planner, and five study friends, two of them studying live. Rerun it any time to reset the demo and move its timeline to today.

- Email: `demo@sweetstudy.test`
- Password: `sweet-study-demo` (local demo only)
- Override with `DEMO_EMAIL=… DEMO_PASSWORD=… npm run demo:seed`.

The first sign-in shows the demo's earned badges as toasts and a level-up celebration, which makes a good opening shot.

## Requirements

- Node.js `22.19.x`
- npm `10.9.x`
- A writable local directory for Wrangler and Workbox state
- During the transition only: browser-safe Supabase values for screens that have not moved to the Worker API

Use `.nvmrc` when Node Version Manager is available. npm enforces the supported engine range and installs the exact dependency graph from `package-lock.json` in CI.

## Local Setup

1. Copy `.env.example` to `.env.local` if you need browser-safe `VITE_*` overrides; the defaults work for local development.
2. Copy `.dev.vars.example` to `.dev.vars`, replace the example Better Auth secret with a unique local value of at least 32 characters, and set `APP_ORIGIN=http://localhost:5173` (it must match the URL you open, or sign-in is refused as an invalid origin). Optionally set `ADMIN_EMAILS=a@x.com,b@y.com`. `.dev.vars` is ignored and belongs only to the Worker.
3. Run `npm ci`. This installs the reviewed lockfile exactly. Use `npm install` only when intentionally changing dependencies, because it may rewrite the lockfile.
4. Run `npm run db:migrate:local`. This applies versioned SQL to Wrangler's local D1 emulator. The command is safe for local development because it includes `--local`; adding `--remote` would mutate a Cloudflare database.
5. Run `npm run dev` and open `http://localhost:5173`. This starts Vite with the Cloudflare Worker runtime, static assets, API routes, and local bindings. It does not deploy anything.

The first account created on a fresh local database becomes an admin automatically (local environment only), so the Sweet Studio admin pages are reachable right away. In other environments only `ADMIN_EMAILS` grants admin at signup.

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
- `npm run perf:report` reports the built welcome JavaScript graph, CSS, and onboarding image sizes.
- `npm run check:performance` enforces size budgets after a build; it also runs in `validate`.

The performance audit, measured before/after results, and development tradeoffs are documented in [docs/performance.md](docs/performance.md).

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

Until migration is complete, files named `legacySupabase*` are the explicit compatibility boundary. They validate old provider-shaped rows and translate snake_case fields into provider-neutral domain models. New UI code must not add direct Supabase storage calls; each migrated Worker endpoint removes a method from those adapters.

## PWA and Offline Boundaries

The service worker precaches the application shell and versioned core assets. It does not cache `/api/*`, Supabase requests, private study records, or the heavy PDF export libraries.

Updates use a prompt instead of automatic reload so an active timer is not interrupted. Offline mutation queues, conflict resolution, and background sync are not enabled until timer/session rules are server-authoritative and tested across devices.

The current SVG icon is sufficient for the foundation build, but production installability validation still requires final 192px and 512px maskable PNG artwork during the design phase.

## Worker and D1

- `GET /api/health` proves the Worker runtime can answer without touching storage.
- `GET /api/ready` proves D1 is reachable and the expected foundation migration exists.
- Readiness failures return a generic `503` response and a request ID; internal database details are not sent to the browser.
- `migrations/0001_foundation.sql` creates schema metadata; `0002_auth_foundation.sql` adds Better Auth storage; `0003_study_timer_foundation.sql` adds constrained study logs, active timers, and idempotent command receipts.
- `/api/auth/*` is the project-owned authentication boundary. Remote email/password requires `EMAIL_PASSWORD_AUTH_ENABLED=true`; production enables it with D1-backed rate limits and secure cookies. Unverified remote signups cannot gain admin roles. Email verification/recovery still requires a mail provider.
- `GET /api/profile` returns the authenticated user's provider-neutral profile; `PATCH /api/profile` accepts only display-name and theme changes.
- Profile routes derive the user ID from the verified session. Query parameters and request bodies cannot select another user or grant a role.
- `GET /api/study/timer` returns only the authenticated user's active timer. The mutation endpoints are intentionally not exposed until their retry and concurrency rules pass as one reviewed slice.

Wrangler copies `.dev.vars` into build output only for local preview and does not deploy that file. Local Worker secrets must use ignored `.dev.vars`; production secrets must use Cloudflare encrypted secrets, never `vars` or Vite variables.

## Deployment Preparation

The `asal` test environment has been deployed. Its isolated account checks,
database, encrypted secret, public origin, and cross-account domain instructions
are documented in [`docs/cloudflare-asal-deployment.md`](docs/cloudflare-asal-deployment.md).
Production still requires its own environment and release gates:

1. Create separate preview and production D1 databases and replace the placeholder IDs in environment-specific Wrangler configuration.
2. Apply migrations to preview first and run API integration and browser smoke tests.
3. Configure a unique `BETTER_AUTH_SECRET` per environment through Cloudflare encrypted secrets. Never copy the local or preview secret into production.
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
