# Production deployment

The live domain now uses the [VPS production deployment](vps-production.md). The Cloudflare details below record the earlier Worker deployment and its rollback references.

Production serves [sweetstudy.site](https://sweetstudy.site). The domain cutover on November 21, 2026 reused the live app release, D1 database, and authentication secret.

- Account: `cdbe3c0024e00ce5ba021665569f9af7` (domain owner's account).
- Worker: `sweet-study-club`; environment: `production`.
- D1: `sweet-study-club-production`, ID `fde7fb60-983e-4299-80b1-b3d968f9dc8a`.
- Wrangler manages `sweetstudy.site` as the production Worker's custom domain.
- `asal.zendegidarkhavarmiane.lol` uses the `sweet-study-club-domain-redirect` Worker. It preserves paths and query strings in a 302 redirect to the new domain.
- Initial release version: `ef3b70d4-7695-443d-96a9-b9a8efd86b2b`.
- Domain cutover version `b7dcfaf6-25d5-4343-9df4-d50b2c512f58` changes `APP_ORIGIN` on version `0f4f9083-2ba6-4dc8-9fb5-bdc1ab9f34ee`.
- The Asal test deployment uses its own D1 database.

## Redeploy

```powershell
npm run cf:login
npm run validate
npm run cf:migrate:production
npm run cf:deploy:production
```

The production wrapper verifies account access before remote operations. The
build verifies the generated account, origin, domain and D1 binding and checks
that no `.dev.vars` file remains in output. `BETTER_AUTH_SECRET` was generated
uniquely and uploaded as a Cloudflare encrypted secret, without saving its value.
Redeployments retain this secret; do not rotate it as a routine deployment step.

To update the old-domain redirect, deploy its Worker with the production account wrapper.

```powershell
node scripts/run-production-wrangler.mjs deploy --config deployment/wrangler-production-redirect.jsonc
```

## Authentication and AI

Email/password is explicitly enabled for this deployment. Login and signup use
database-backed rate limits and the Cloudflare-provided client IP. Cookies are
secure and requests use the configured HTTPS origin. Remote signup always starts
as a member unless the email is already verified and matches the configured admin
list; a claimed email address alone cannot confer admin access.

Existing users sign in again on `sweetstudy.site` because session cookies are scoped to their original host.

Outbound email verification and password recovery have no mail provider yet.
Payments remain disabled outside the local development stand-in. Workers AI is
bound as `AI`; the study assistant has a 20-request per-user hourly cap. Text-only
AI is told that question images are not visible to it and must not be guessed.

## Persian library

`npm run content:build:persian` deterministically regenerates migration 10 from
the checked-in source snapshots. It imports 445 native Persian questions (139
Konkur 1404, 165 medical basic-science 1402, 141 preinternship 1402) and 24 Persian
textbook adaptations, placed in 33 subject/track collections. Some textbook
exercises occur in several tracks: 469 distinct source questions, 525 placements.
The English packs from migration 9 are archived without deleting old attempts.

Native papers provide answer keys rather than verified explanatory solutions.
Original medical-paper images are preserved; inaccessible, ambiguous, deleted,
multi-answer, incomplete and formula-corrupted records were excluded by the
importer. Residency and publisher weekly papers still require a content source.

## Verification and rollback

The domain cutover passed live HTTPS checks for the homepage, static assets, database readiness, and signed-out session. Sign-in accepted the new origin and rejected invalid credentials. The old hostname redirected to the new domain over HTTP and HTTPS with paths and query strings preserved.

Use a Worker version with `APP_ORIGIN=https://sweetstudy.site` for rollbacks on the new domain. The pre-cutover version trusts the old hostname for sign-in.

### November 12 verification history

The November 12 release passed lint, 108 tests in 22 files, TypeScript, the
production Worker/PWA build, artifact checks, and performance budgets. Account
entry JavaScript is 402,969 bytes (130,306 gzip); CSS is 127,588 bytes. The
remote migration check reported no pending migrations. Cloudflare confirms
100% traffic on version `691c81af-ed27-49cd-b622-345c8c97e15c`.

Read-only live checks on the existing workers.dev endpoint verified the new
entry asset hash, `/` 200, `/api/health` 200, `/api/ready` 200,
`/api/auth/get-session` 200 with a null session, and `/api/profile` 401.
Playwright navigation to the custom domain timed out from this workstation;
live browser behavior could not be verified. No production test data was
created. The rollback target at the time was version `9cc3480b-0e9a-488d-8c22-91420cab747c`.

### November 8 verification history

The November 8 release passed 108 tests in 22 files, lint, TypeScript, the
production PWA build, artifact checks and performance budgets. Production
configuration passed Wrangler's dry run. Playwright exercised authenticated
flows against an isolated local Worker/D1 database and captured desktop,
mobile, dark mode and 320px layouts. The remote migration check reported no
pending migrations; no D1 migration was applied for this UI release.

Cloudflare confirmed deployment of version `9cc3480b-0e9a-488d-8c22-91420cab747c`
to the existing custom domain and `sweet-study-club.hesammoradizadeh2002.workers.dev`.
The encrypted authentication secret and existing D1 binding were retained.

The deployments API confirms 100% traffic on the new version. Read-only HTTP
checks through the existing workers.dev endpoint passed: `/` 200 with the exact
entry asset hash from the production build, `/api/health` 200, `/api/ready` 200,
`/api/auth/get-session` 200 with a null session, and `/api/profile` 401.
No production test accounts or study records were created.

Live Playwright navigation failed from this workstation: the custom domain
timed out/reset its connection and workers.dev closed the browser connection.
The custom domain also reset a curl request, while curl checks against
workers.dev succeeded. Therefore the local authenticated browser checks and
live HTTP checks are verified separately; public-domain browser behavior is
not claimed as verified. Reports are in `test-results/playwright/` (ignored).

Use `node scripts/run-production-wrangler.mjs deployments list --env production`
to inspect versions, then Wrangler `rollback` for a known-good prior version.
Worker rollback does not revert D1 migrations; preserve backward compatibility.
