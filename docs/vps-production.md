# Sweet Study VPS production

GitHub Actions validates pull requests and pushes. The production job can run after validation on `main` when `SWEETSTUDY_VPS_DEPLOY_ENABLED` is `true`. It builds the Linux x86-64 image on the runner and starts a disposable container there. The VPS receives the tested image and static files for the same Git revision.

## Prepare a new VPS

1. Install Docker with the Compose plugin, Nginx, Python 3.12 or later, Certbot and standard Ubuntu system tools. Allow SSH, HTTP and HTTPS through the host and provider firewalls. Create `/opt/sweet-study-club-production` with `releases`, `runtime` and `acme` directories readable by Nginx. Create a root-only `import` directory and a private `data` directory writable by container UID and GID 1000.
2. Install `receive-release.sh` as `/usr/local/sbin/sweetstudy-release`, `install-release.sh` as `/usr/local/libexec/sweetstudy-install-release`, and `compose.yaml` as `/opt/sweet-study-club-production/runtime/compose.yaml`. Both installed scripts are executable and owned by root.
3. Add a dedicated deployment public key to root's `authorized_keys` with `restrict,command="/usr/local/sbin/sweetstudy-release"`. Configure GitHub's `SWEETSTUDY_VPS_RELEASE_KEY` secret and the `SWEETSTUDY_VPS_HOST` and `SWEETSTUDY_VPS_KNOWN_HOSTS` variables. Verify the new host key through the server console. Set `SWEETSTUDY_VPS_HEALTH_ORIGIN` to the HTTPS address used to verify the release if it differs from `https://sweetstudy.site`.
4. Create the root-only `/opt/sweet-study-club-production/production.env` with `APP_ORIGIN=https://sweetstudy.site` and the production `BETTER_AUTH_SECRET`. Reuse the current secret to keep existing sessions valid. Use separate data and credentials for staging.
5. Use the Nginx configurations in the deployment directory for the apex and `www`. Obtain a trusted certificate covering both names through DNS validation before changing DNS. Verify both names with `openssl x509 -checkhost` before enabling the HTTPS configuration. The HTTP configuration serves ACME webroot challenges for renewal after cutover. Test with `nginx -t` before reloading. For a rehearsal use a staging hostname and certificate and adjust the Nginx names, health-check origin, and app origin together.

## Cut over production

Test the new release and a restored database on the new host first. For cutover, pause new writes on the old VPS and take a fresh consistent SQLite snapshot. Place it on the new VPS under the same path relative to the `data` directory and give container UID 1000 access. Leave the old database intact for recovery. Enable deployment and dispatch Validate on `main` with `deploy_to_vps` checked. CI connects directly to the configured VPS and verifies HTTPS using the health-check hostname before DNS moves.

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
