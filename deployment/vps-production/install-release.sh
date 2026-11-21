#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

base=/opt/sweet-study-club-production
revision=${SSH_ORIGINAL_COMMAND:-}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
exec 9>"$base/release.lock"
flock -w 240 9

scratch=$(mktemp -d "$base/import/release.XXXXXXXX")
release="$base/releases/$revision"
gate="$base/switching"
compose="$base/compose.yaml"
previous=$(readlink "$base/current")
switching=false
replaced=false
db=
readiness() {
    for attempt in {1..35}; do
        if curl --noproxy '*' -fsS --max-time 2 -H 'Host: sweetstudy.site' http://127.0.0.1:28787/api/ready >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

finish() {
    local result=$?
    trap - EXIT
    if [[ "$result" != 0 && "$switching" == true ]]; then
        echo 'Release failed; restoring the previous application.' >&2
        if [[ "$replaced" == true ]]; then
            docker compose -f "$compose" stop --timeout 10 api >&2 || exit 1
            rm -f -- "$db-wal" "$db-shm"
            chown --reference="$db" "$scratch/rollback.sqlite"
            chmod --reference="$db" "$scratch/rollback.sqlite"
            mv -f -- "$scratch/rollback.sqlite" "$db" || exit 1
        fi
        cp -- "$scratch/previous-compose.yaml" "$compose" || exit 1
        ln -sfn -- "$previous" "$base/current.next" && mv -Tf -- "$base/current.next" "$base/current" || exit 1
        docker compose -f "$compose" up -d --no-build api >&2 && readiness || exit 1
        rm -f -- "$gate"
    fi
    rm -rf -- "$scratch"
    exit "$result"
}
trap finish EXIT

head -c 200000001 >"$scratch/release.tar.gz"
test "$(stat -c %s "$scratch/release.tar.gz")" -le 200000000
if [[ "$previous" == "$release" ]]; then
    echo "Already serving $revision"
    exit 0
fi

python3 - "$scratch" "$revision" <<'PY'
import pathlib
import sys
import tarfile

scratch = pathlib.Path(sys.argv[1])
target = scratch / 'bundle'
target.mkdir()
allowed = {'client', 'worker', 'migrations', 'server.mjs', 'package.json', 'package-lock.json', 'revision.txt'}
with tarfile.open(scratch / 'release.tar.gz', 'r:gz') as archive:
    members = archive.getmembers()
    if sum(member.size for member in members) > 500_000_000:
        raise ValueError('Expanded release is too large')
    if any(not (member.isfile() or member.isdir()) or
           not (parts := pathlib.PurePosixPath(member.name).parts) or
           parts[0] not in allowed or '..' in parts for member in members):
        raise ValueError('Unexpected file in release archive')
    archive.extractall(target, filter='data')
if (target / 'revision.txt').read_text().strip() != sys.argv[2]:
    raise ValueError('Archive does not match the requested revision')
for file in ('client/index.html', 'worker/wrangler.json', 'server.mjs', 'package-lock.json'):
    if not (target / file).is_file():
        raise ValueError('Required release file missing')
PY

printf 'client\nrevision.txt\n' >"$scratch/bundle/.dockerignore"
docker build --file "$base/runtime/Dockerfile" --tag "sweet-study-club-production:$revision" "$scratch/bundle"
install -d -m 755 "$release"
if [[ -d "$release/client" ]]; then
    rm -rf -- "$release/client"
fi
mv -T -- "$scratch/bundle/client" "$release/client"
chmod -R a+rX "$release/client"
sed "s/__RELEASE__/$revision/" "$base/runtime/compose.yaml" >"$scratch/next-compose.yaml"
cp -- "$compose" "$scratch/previous-compose.yaml"
test ! -e "$gate"
touch "$gate"
switching=true
docker compose -f "$compose" stop --timeout 10 api

mapfile -t databases < <(find "$base/data/d1/miniflare-D1DatabaseObject" -maxdepth 1 -type f -name '*.sqlite' ! -name metadata.sqlite)
test "${#databases[@]}" -eq 1
db=${databases[0]}
python3 - "$db" "$scratch/rollback.sqlite" <<'PY'
import pathlib
import sqlite3
import sys

source = pathlib.Path(sys.argv[1]).as_uri()
with sqlite3.connect(source + '?mode=ro', uri=True) as database, sqlite3.connect(sys.argv[2]) as backup:
    database.backup(backup)
    if backup.execute('PRAGMA quick_check').fetchone() != ('ok',):
        raise ValueError('Rollback database failed validation')
PY

replaced=true
install -m 600 "$scratch/next-compose.yaml" "$compose"
docker compose -f "$compose" up -d --no-build api
readiness
ln -sfn -- "$release" "$base/current.next"
mv -Tf -- "$base/current.next" "$base/current"
rm -f -- "$gate"
switching=false
echo "Serving revision $revision"
