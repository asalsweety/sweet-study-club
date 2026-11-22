# Sweet Study VPS production

GitHub Actions validates pull requests and pushes. The production job can run after validation on `main` when `SWEETSTUDY_VPS_DEPLOY_ENABLED` is `true`. It builds the Linux x86-64 image on the runner and starts a disposable container there. The VPS receives the tested image and static files for the same Git revision.

## Prepare a new VPS

1. Install Docker with the Compose plugin, Nginx, Python 3.12 or later, Certbot and standard Ubuntu system tools. Allow SSH, HTTP and HTTPS through the host and provider firewalls. Create `/opt/sweet-study-club-production` with `releases`, `runtime` and `acme` directories readable by Nginx. Create a root-only `import` directory and a private `data` directory writable by container UID and GID 1000.
2. Install `receive-release.sh` as `/usr/local/sbin/sweetstudy-release`, `install-release.sh` as `/usr/local/libexec/sweetstudy-install-release`, and `compose.yaml` as `/opt/sweet-study-club-production/runtime/compose.yaml`. Both installed scripts are executable and owned by root.
3. Add a dedicated deployment public key to root's `authorized_keys` with `restrict,command="/usr/local/sbin/sweetstudy-release"`. Configure GitHub's `SWEETSTUDY_VPS_RELEASE_KEY` secret and the `SWEETSTUDY_VPS_HOST` and `SWEETSTUDY_VPS_KNOWN_HOSTS` variables. Verify the new host key through the server console. Set `SWEETSTUDY_VPS_HEALTH_ORIGIN` to the HTTPS address used to verify the release if it differs from `https://sweetstudy.site`.
4. Create the root-only `/opt/sweet-study-club-production/production.env` with `APP_ORIGIN=https://sweetstudy.site` and the production `BETTER_AUTH_SECRET`. Reuse the current secret to keep existing sessions valid. Use separate data and credentials for staging.
5. Install both Nginx configurations. They expect the certificate lineage at `/etc/letsencrypt/live/sweetstudy.site/`, covering both `sweetstudy.site` and `www.sweetstudy.site`. Generate the private key on the new VPS and issue the certificate before moving DNS. Run `nginx -t` before reloading.

### Issue and test the certificate before moving traffic

DNS-01 can validate both names while members continue to use the old VPS. With Certbot's Cloudflare plugin, scope the token to DNS editing for the Sweet Study zone, keep its credentials file readable only by root, and request both names under `--cert-name sweetstudy.site`. The plugin can also handle renewals. [Certbot Cloudflare plugin](https://certbot-dns-cloudflare.readthedocs.io/en/stable/)

An alternative uses HTTP-01 through the existing VPS. Start Certbot on the new VPS with `certonly --manual --preferred-challenges http --cert-name sweetstudy.site -d sweetstudy.site -d www.sweetstudy.site`. For each challenge, place its public validation text at the exact path Certbot gives on the old VPS. Before continuing, verify each requested URL over public HTTP, including the hostname, path and full response text. Once Certbot succeeds, remove those challenge files. This approach keeps the private key on the new VPS and leaves the existing DNS and application routes in place. After DNS propagation, use `certbot reconfigure --cert-name sweetstudy.site --authenticator webroot --webroot-path /opt/sweet-study-club-production/acme` (Certbot 2.3+) to enable unattended renewal. Confirm the renewal timer and Nginx deploy hook and test with `certbot renew --cert-name sweetstudy.site --dry-run`. [Let's Encrypt challenge types](https://letsencrypt.org/docs/challenge-types/) · [Certbot renewal guide](https://eff-certbot.readthedocs.io/en/stable/using.html#modifying-the-renewal-configuration-of-existing-certificates)

From a separate machine, set `NEW_VPS_IPV4` to the new server address. These requests connect directly to it while validating the real hostnames and trusted certificate chain. Check for the expected release SHA, a ready API and a 308 redirect to `https://sweetstudy.site/planner?cutover=1`. DNS keeps serving existing members throughout.

```bash
curl --noproxy '*' --fail --resolve "sweetstudy.site:443:${NEW_VPS_IPV4:?}" https://sweetstudy.site/revision.txt
curl --noproxy '*' --fail --resolve "sweetstudy.site:443:${NEW_VPS_IPV4:?}" https://sweetstudy.site/api/ready
curl --noproxy '*' --head --resolve "www.sweetstudy.site:443:${NEW_VPS_IPV4:?}" 'https://www.sweetstudy.site/planner?cutover=1'
```

## Cut over production

1. Rehearse the release on the new host. Enable deployment and dispatch Validate on `main` with `deploy_to_vps` checked if using CI. CI connects directly to the configured VPS and verifies the expected revision over HTTPS before DNS moves. Allow members to continue using the old VPS during the rehearsal.
2. At cutover, gate public writes on the old host, stop its Sweet Study API and let active requests finish. Take a fresh consistent SQLite backup with the SQLite backup API. Check `PRAGMA integrity_check` and `PRAGMA foreign_key_check`. Record the snapshot's SHA-256 and counts for `user`, `study_logs`, `planner_sheets` and `shop_orders`. Transfer the snapshot privately and verify its SHA-256 on the new host. Keep the old database and its last backup intact.
3. Stop the new host's Sweet Study API too. Move its rehearsal database and any matching `-wal` and `-shm` files together to private rollback storage. Install the verified snapshot at the same path relative to `data` as on the old host. The database and parent directory must be writable by UID/GID 1000. Start the new API and allow it to apply the release's migrations. The installer skips deployment for an already running SHA, so a repeat dispatch alone cannot perform the database swap or restart the API.
4. Recheck the copied database's integrity, foreign keys, recorded counts and migration version. Test the apex, `www` and API against the new IP as above. Change DNS only after these checks pass. Keep writes on the old database disabled during DNS propagation. If reverting after the new host has accepted writes, preserve and reconcile those writes before making the old database authoritative again.

Once the archive has transferred, the VPS installer runs under systemd. It loads the image before interrupting traffic, then pauses public requests, snapshots any existing SQLite database and starts the replacement. It verifies the homepage, revision and API through local Nginx over trusted HTTPS before reopening traffic. The Nginx configuration allows those loopback requests during the switch. A failed replacement restores the previous container and database. An SSH disconnect after transfer leaves the installer running.

If the first start fails on an empty VPS, the installer keeps any data directory the candidate initialized for inspection. If a reboot strands the maintenance marker, check `journalctl -u 'sweetstudy-release-*'` and the latest root-only `import/release.*` state. Verify the previous Compose configuration, revision and matching SQLite snapshot before manually restoring traffic. The installer refuses another release while that marker remains.

Verify the live revision at [revision.txt](https://sweetstudy.site/revision.txt) and readiness at [api/ready](https://sweetstudy.site/api/ready) after changing DNS. Once the cutover checks pass, remove the migration announcement from the admin panel. Verify backups run from the new database before retiring the old VPS timer.

## Google Drive database backups

The VPS timer runs at 03:00 Tehran time. The service checks a consistent SQLite snapshot, compresses and encrypts it with age, uploads it to the dedicated `Sweet Study Backups` Drive folder, and verifies the stored checksum. The server needs only the public recovery key and an rclone Drive credential scoped to files created by the backup app.

Keep the private recovery key outside the VPS and GitHub. To verify or inspect a restored archive on a trusted machine, decrypt it without replacing the live database.

```bash
age -d -i /path/to/recovery-key snapshot.sqlite.gz.age | gzip -d > restored.sqlite
sqlite3 restored.sqlite 'PRAGMA integrity_check;'
```

Run `systemctl start sweetstudy-db-backup.service` for a manual backup and check `journalctl -u sweetstudy-db-backup.service` for the result.
