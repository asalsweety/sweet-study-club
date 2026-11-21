#!/usr/bin/env bash
set -euo pipefail
umask 077

config=/etc/sweetstudy-db-backup
data=/opt/sweet-study-club-production/data/d1/miniflare-D1DatabaseObject
exec 9>/run/lock/sweetstudy-db-backup.lock
flock -n 9

mapfile -t databases < <(find "$data" -maxdepth 1 -type f -name '*.sqlite' ! -name metadata.sqlite)
test "${#databases[@]}" -eq 1
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
python3 - "${databases[0]}" "$scratch/backup.sqlite" <<'PY'
import pathlib
import sqlite3
import sys

source = pathlib.Path(sys.argv[1]).as_uri() + '?mode=ro'
with sqlite3.connect(source, uri=True, timeout=15) as live, sqlite3.connect(sys.argv[2]) as backup:
    live.backup(backup, pages=100)
    if backup.execute('PRAGMA integrity_check').fetchone() != ('ok',):
        raise ValueError('The SQLite snapshot failed its integrity check')
PY

filename="sweetstudy-production-$(date -u +%Y-%m-%dT%H%M%SZ).sqlite.gz.age"
gzip -c -- "$scratch/backup.sqlite" | age -R "$config/recovery.pub" -o "$scratch/$filename"
remote="sweetstudy-drive:Sweet Study Backups/$filename"
rclone --config "$config/rclone.conf" copyto --immutable --retries 3 "$scratch/$filename" "$remote"
local_checksum=$(md5sum "$scratch/$filename" | cut -d ' ' -f 1)
remote_checksum=$(rclone --config "$config/rclone.conf" md5sum "$remote" | cut -d ' ' -f 1)
test "$local_checksum" = "$remote_checksum"
printf 'Uploaded and verified %s\n' "$filename"
