# ADR 0001: Cloudflare Modular Monolith, PWA First, Expo Second

- Status: accepted
- Date: 2026-08-26
- Decision owners: project maintainers

## Context

The prototype is a React/Vite application whose presentation components directly call Supabase Auth, tables, RPC functions, and Storage. The repository does not contain the corresponding backend schema or authorization policies, and Netlify only hosts the generated frontend. The product roadmap adds realtime study rooms, social privacy, commercial features, a PWA, and native mobile clients.

The greenfield review evaluated keeping Supabase, moving only hosting, using Vercel/Next.js, using a Cloudflare-native backend, and building native clients with either a web wrapper or React Native/Expo.

## Decision

Build a modular monolith deployed as one Cloudflare Worker with Static Assets:

- React, TypeScript, and Vite remain the web client.
- Hono provides the same-origin Worker API.
- D1 stores relational application and authentication data.
- R2 stores private user files.
- Durable Objects are reserved for coordinated realtime rooms and hibernating WebSockets.
- Zod contracts and domain logic are shared across Worker, web, and future Expo clients.
- The browser never accesses Cloudflare storage directly.
- PWA is the first installable client.
- Expo Router is used for later Android/iOS applications.
- Netlify, Capacitor, Vercel, and a Next.js rewrite are not part of the target architecture.

Authentication uses Better Auth 1.7 directly against D1 behind the Worker-owned `/api/auth/*` boundary. The unused Drizzle ORM was removed so npm no longer installs Better Auth's optional Drizzle Kit peer; the resulting lockfile contains neither Drizzle Kit nor the vulnerable legacy esbuild loader path and passes the repository audit gate. Remote email/password signup remains deliberately disabled until verified transactional email, recovery, Turnstile, and distributed rate limiting are configured.

## Why PWA Comes First

The existing product is already a React web application. A PWA validates install, routing, offline boundaries, update behavior, and the same Worker API without delaying product learning for two store pipelines.

PWA is not treated as a complete native substitute. Browser notification, storage, background execution, and platform integration vary. The timer therefore uses timestamps and server state rather than expecting a service worker to execute exactly on schedule.

## Why Expo Follows

Expo Router provides native Android/iOS navigation, deep linking, notifications, secure device storage, development builds, and store delivery while remaining in the React/TypeScript ecosystem. It is preferred over Capacitor because the mobile goal is a real native client rather than the existing DOM application inside a WebView.

The Expo application shares contracts, API client code, business calculations, fixtures, and design tokens. It does not automatically share web components. Platform-owned UI keeps accessibility and native interaction patterns understandable.

## Why Not Vercel or Next.js

The product does not require server-rendered pages enough to justify a framework rewrite. Vercel would still require separate database, authentication, file, and realtime providers, and its serverless Functions are not the selected WebSocket coordination layer. Cloudflare provides a single low-cost path for static assets, API, SQL, object storage, and Durable Objects.

## Consequences

Positive:

- One deployment and one authorization boundary.
- Same API for web, PWA, Expo, and future integrations.
- Versioned local D1 development and migrations.
- No public database key or direct browser database access.
- Durable Objects match room-based realtime coordination.
- Static assets can be served without invoking Worker compute.

Costs and risks:

- Existing Supabase RPC behavior must be reimplemented and tested.
- Existing passwords may require a reset unless a compatible migration is proven.
- D1 uses SQLite semantics and has different concurrency/transaction constraints from PostgreSQL.
- Cloudflare free-tier hard limits are suitable for development, not an uptime promise.
- Email verification/recovery requires a production transactional-email decision.
- The team owns API authorization and admin tooling previously provided by Supabase.
- Web and native UI require separate testing and deliberate design parity.

## Security Boundaries

- Session credentials use secure `HttpOnly` cookies on web and secure platform storage on native.
- Worker services authorize every resource using the authenticated identity.
- R2 remains private and is accessed through authorized Worker endpoints.
- PWA cache excludes API responses and private records by default.
- Secrets use ignored `.dev.vars` locally and encrypted Cloudflare secrets remotely.
- Error responses expose a stable code and request ID, not provider/database details.
- Signup, login, recovery, invites, and social mutations require rate limiting and bot protection.

## Migration Strategy

Use vertical replacement rather than a big-bang rewrite:

1. Establish Worker, D1, contracts, tests, and PWA shell.
2. Replace identity/profile.
3. Replace timer/session and make server state authoritative.
4. Replace analytics/gamification/export.
5. Replace R2-backed profile files.
6. Replace social operations and add Durable Object live rooms.
7. Reconcile preserved data and remove Supabase only after the final slice passes.

Netlify configuration can be removed immediately because hosting has no product data. Supabase must not be removed from a slice until migration and rollback behavior are verified.

## Operational Rules

- Preview and production use separate Worker names, D1 databases, R2 buckets, secrets, and deployment approvals.
- Remote migration and deployment commands are never run implicitly.
- Schema changes use expand-migrate-contract and preserve compatibility with the previous Worker version.
- Dependency changes require lockfile review, vulnerability audit, tests, and production build.
- Expo development begins only after core API contracts and PWA product behavior are stable.
