# Asal's Cloudflare test deployment

Deployed on October 15, 2026.

| Setting | Value |
| --- | --- |
| Confirmed Cloudflare login | `asal.aboali@gmail.com` |
| Cloudflare account | `1a34166ec8a0cab09d02f58aa666b346` |
| Worker | `sweet-study-club-test` |
| Live origin | <https://sweet-study-club-test.asal-aboali.workers.dev> |
| Intended public origin | <https://test.zendegidarkhavarmiane.lol> |
| D1 database | `sweet-study-club-test` |
| D1 ID | `05b7e7bb-a61f-4658-872c-ed92ae39a032` |
| Wrangler environment | `asal` |
| Initial Worker version | `c899ede3-7b23-456c-b93b-cfaeba0e7f45` |

The existing `sweet-study-club` Worker was left unchanged. This test deployment
has its own database and encrypted `BETTER_AUTH_SECRET`. No local user accounts
or study history were copied into the remote database.

## Current release boundary

The PWA and API are deployed. `/api/health` and `/api/ready` return `200`, and
unauthenticated `/api/profile` requests return `401`.

Email/password authentication remains disabled outside the local environment,
as defined in `worker/auth.ts`. Account registration and login need the existing
verification/recovery and abuse-control work before they can be enabled remotely.
The deployment is a technical preview, not a release with working user signup.
Real payments and AI are also not configured.

## Manual setup in the domain's existing Cloudflare account

The domain and DNS zone stay in their current account. Cloudflare Workers custom
domains are zone-scoped, and a normal cross-account CNAME is not sufficient for
this architecture. A small forwarding Worker receives the domain traffic and
sends it over HTTPS to Asal's application Worker.

1. Open the account that owns the `zendegidarkhavarmiane.lol` DNS zone.
2. Under Workers & Pages, create a Worker called `sweet-study-club-forwarder`.
3. Open its code editor and replace the starter code with the complete contents
   of [`../deployment/domain-forwarder.mjs`](../deployment/domain-forwarder.mjs).
   Deploy that Worker. Its upstream hostname is already set to the live app.
4. Add the following record under the domain's DNS settings. If a record already
   exists for this exact hostname, inspect and update it instead of adding a
   conflicting second record. Leave the domain's other records untouched.

   | Type | Name | IPv4 address | Proxy status | TTL |
   | --- | --- | --- | --- | --- |
   | `A` | `test` | `192.0.2.1` | **Proxied / orange cloud** | Auto |

5. In the forwarding Worker's Settings > Domains & Routes, add a **Route**:

   - Zone: `zendegidarkhavarmiane.lol`
   - Route: `test.zendegidarkhavarmiane.lol/*`
   - Worker: `sweet-study-club-forwarder`
   - If offered, use **Fail closed** so an exhausted Worker cannot pass requests
     through to the placeholder IP.

6. Visit <https://test.zendegidarkhavarmiane.lol> and check
   <https://test.zendegidarkhavarmiane.lol/api/ready>.

`192.0.2.1` is a documentation placeholder, not an application server address.
The proxied DNS record lets Cloudflare receive the request, and the Worker route
handles it before an origin connection. Both the record and forwarding route
are required. The forwarding Worker's own `workers.dev` URL intentionally
returns `404` because it only accepts the public test hostname.

The forwarder preserves request methods, bodies, cookies, browser Origin, URL
paths and query strings; rewrites redirects from the upstream host back to the
public hostname; and sets private API responses to `no-store`.

For a future CLI deployment from the domain account, the separate configuration
is [`../deployment/wrangler-domain-forwarder.jsonc`](../deployment/wrangler-domain-forwarder.jsonc).
It must use the domain account's login/account ID, not Asal's profile. No changes
have been made to that account or its DNS by this deployment.

## Redeploy the app to Asal

From the repository root:

```powershell
npm run cf:whoami:asal
npm run validate
npm run cf:migrate:asal
npm run cf:deploy:asal
```

`cf:whoami:asal` must show `asal.aboali@gmail.com` and the account ID above. The
wrapper refuses remote commands if the signed-in email or account does not
match. Its OAuth state is isolated under ignored `.wrangler/auth/asal`, rather
than replacing another project's Wrangler login.

To refresh an expired login:

```powershell
npm run cf:login:asal
```

Open the link Wrangler prints in a browser on the same computer and authorize
its requested permissions. The local callback is at `localhost:8976`.

The build selects `CLOUDFLARE_ENV=asal`, verifies the generated configuration,
and removes `.dev.vars` from generated Worker directories. Vite names the output
directory after the top-level Worker, so the test build is still under
`dist/sweet_study_club`; its generated Wrangler configuration targets
`sweet-study-club-test`. Always use `cf:deploy:asal` so local bindings cannot be
published accidentally. Cloudflare retains the encrypted remote secret across
redeployments. The temporary file used for its first upload has been removed.

## Verification and rollback

The deployment passed the repository's validation and performance checks,
Wrangler's deployment dry run, and live checks for the homepage, `/planner`, PWA
manifest/service worker/icon, health, database readiness, auth session endpoint,
and rejection of unauthenticated profile requests. The forwarder has seven tests
covering authenticated POST forwarding, cookies/redirects, fixed upstream
routing, HTTPS, host restrictions, and failure handling. The public hostname
cannot be tested end to end until the manual domain setup is complete.
The final public DNS-over-HTTPS check returned `NXDOMAIN` for
`test.zendegidarkhavarmiane.lol`; its DNS record has not been created.

List available versions without changing a deployment:

```powershell
node scripts/run-asal-wrangler.mjs deployments list --config wrangler.jsonc --env asal
```

After there is a known good prior version, restore it with Wrangler's `rollback`
command using its recorded version ID and the same `--config` and `--env`
arguments. A Worker rollback does not roll back database migrations. Keep future
schema changes compatible with the previous Worker version.

Official references:

- [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cross-account CNAME restrictions](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1014/)
- [Workers routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Cloudflare's example of a proxied placeholder record](https://developers.cloudflare.com/pulumi/tutorial/hello-world/)
