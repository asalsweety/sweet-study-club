# Sweet Study VPS production

GitHub Actions validates pull requests and pushes. The production job runs after validation for `main` and streams the exact commit's artifacts over SSH. The SSH key is stored in `SWEETSTUDY_VPS_RELEASE_KEY`. Its authorized command on the VPS accepts only an archive and a commit SHA.

Production serves [sweetstudy.site](https://sweetstudy.site/). Verify the deployed commit at [revision.txt](https://sweetstudy.site/revision.txt). To rerun a release, dispatch the Validate workflow on `main`.

The receiver builds the image before switching traffic. During the switch it pauses incoming requests, snapshots SQLite, applies migrations as the new API starts, and verifies readiness. A failed release restores the previous container configuration and the pre-release database snapshot.

## Google Drive database backups

The VPS timer runs at 03:00 Tehran time. The service checks a consistent SQLite snapshot, compresses and encrypts it with age, uploads it to the dedicated `Sweet Study Backups` Drive folder, and verifies the stored checksum. The server needs only the public recovery key and an rclone Drive credential scoped to files created by the backup app.

Keep the private recovery key outside the VPS and GitHub. To verify or inspect a restored archive on a trusted machine, decrypt it without replacing the live database.

```bash
age -d -i /path/to/recovery-key snapshot.sqlite.gz.age | gzip -d > restored.sqlite
sqlite3 restored.sqlite 'PRAGMA integrity_check;'
```

Run `systemctl start sweetstudy-db-backup.service` for a manual backup and check `journalctl -u sweetstudy-db-backup.service` for the result.
