#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

base=/opt/sweet-study-club-production
revision=${1:?Missing revision}
upload=${2:?Missing upload path}
[[ "$revision" =~ ^[0-9a-f]{40}$ && "$upload" =~ ^/opt/sweet-study-club-production/import/upload\.[a-zA-Z0-9]{8}\.tar\.gz$ ]]
trap 'rm -f -- "$upload"' EXIT
exec 9>"$base/release.lock"
flock -w 240 9

origin=$(sed -n 's/^APP_ORIGIN=//p' "$base/production.env")
[[ "$origin" =~ ^https://([a-zA-Z0-9.-]+)$ ]]
hostname=${BASH_REMATCH[1]}
scratch=$(mktemp -d "$base/import/release.XXXXXXXX")
mv -- "$upload" "$scratch/release.tar.gz"
release="$base/releases/$revision"
gate="$base/switching"
compose="$base/compose.yaml"
previous=
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

check_published() {
    local options=(--noproxy '*' -fsS --max-time 8 --resolve "$hostname:443:127.0.0.1")
    curl "${options[@]}" "$origin/" >/dev/null &&
        curl "${options[@]}" "$origin/api/ready" >/dev/null &&
        [[ "$(curl "${options[@]}" "$origin/revision.txt")" == "$revision" ]]
}

finish() {
    local result=$?
    trap - EXIT
    if [[ "$result" != 0 && "$switching" == true && -e "$gate" ]]; then
        echo 'Release failed; restoring the previous application.' >&2
        if [[ "$replaced" == true ]]; then
            docker compose -f "$compose" logs --tail 35 api >&2 || true
            docker compose -f "$compose" stop --timeout 10 api >&2 || exit 1
            if [[ -n "$db" ]]; then
                rm -f -- "$db-wal" "$db-shm"
                chown --reference="$db" "$scratch/rollback.sqlite"
                chmod --reference="$db" "$scratch/rollback.sqlite"
                mv -f -- "$scratch/rollback.sqlite" "$db" || exit 1
            fi
        fi
        if [[ -n "$previous" ]]; then
            install -m 600 "$scratch/previous-compose.yaml" "$compose" || exit 1
            ln -sfn -- "$previous" "$base/current.next" && mv -Tf -- "$base/current.next" "$base/current" || exit 1
            docker compose -f "$compose" up -d --no-build api >&2 && readiness || exit 1
        else
            rm -f -- "$compose" "$base/current"
        fi
        rm -f -- "$gate"
    fi
    rm -rf -- "$scratch"
    exit "$result"
}
trap finish EXIT
trap 'exit 1' HUP INT TERM
if [[ -e "$gate" ]]; then
    echo 'A previous switch is still in maintenance mode. Recover that switch before deploying.' >&2
    exit 1
fi

if [[ -L "$base/current" && -f "$compose" ]]; then
    previous=$(readlink "$base/current")
    test -r "$previous/client/index.html"
elif [[ -e "$base/current" || -L "$base/current" || -e "$compose" ]]; then
    echo 'Current release metadata is incomplete.' >&2
    exit 1
fi
if [[ "$previous" == "$release" ]]; then
    readiness
    check_published
    echo "Already serving $revision"
    exit 0
fi

image="sweet-study-club-production:$revision"
python3 - "$scratch" "$revision" "$image" <<'PY'
import json
import pathlib
import sys
import tarfile

scratch = pathlib.Path(sys.argv[1])
target = scratch / 'bundle'
target.mkdir()
allowed = {'client', 'runtime.tar', 'runtime-id.txt', 'revision.txt'}
with tarfile.open(scratch / 'release.tar.gz', 'r:gz') as archive:
    members = archive.getmembers()
    if sum(member.size for member in members) > 750_000_000:
        raise ValueError('Expanded release is too large')
    if any(not (member.isfile() or member.isdir()) or
           not (parts := pathlib.PurePosixPath(member.name).parts) or
           parts[0] not in allowed or '..' in parts for member in members):
        raise ValueError('Unexpected file in release archive')
    archive.extractall(target, filter='data')
if (target / 'revision.txt').read_text().strip() != sys.argv[2]:
    raise ValueError('Archive does not match the requested revision')
for file in ('client/index.html', 'runtime.tar', 'runtime-id.txt', 'client/revision.txt'):
    if not (target / file).is_file():
        raise ValueError('Required release file missing')
if (target / 'client/revision.txt').read_text().strip() != sys.argv[2]:
    raise ValueError('Client assets do not match the requested revision')
with tarfile.open(target / 'runtime.tar') as runtime:
    manifest = runtime.getmember('manifest.json')
    if not manifest.isfile() or manifest.size > 1_000_000:
        raise ValueError('Invalid Docker image manifest')
    images = json.load(runtime.extractfile(manifest))
    if [entry.get('RepoTags') for entry in images] != [[sys.argv[3]]]:
        raise ValueError('Release must contain only its revision-tagged runtime image')
PY

image_id=$(cat "$scratch/bundle/runtime-id.txt")
[[ "$image_id" =~ ^sha256:[0-9a-f]{64}$ ]]
docker load --input "$scratch/bundle/runtime.tar"
test "$(docker image inspect -f '{{.Id}}' "$image")" = "$image_id"
install -d -m 755 "$release"
if [[ -d "$release/client" ]]; then
    rm -rf -- "$release/client"
fi
mv -T -- "$scratch/bundle/client" "$release/client"
chmod -R a+rX "$release/client"
sed "s/__RELEASE__/$revision/" "$base/runtime/compose.yaml" >"$scratch/next-compose.yaml"
if [[ -n "$previous" ]]; then cp -- "$compose" "$scratch/previous-compose.yaml"; fi
test ! -e "$gate"
switching=true
touch "$gate"
if [[ -n "$previous" ]]; then docker compose -f "$compose" stop --timeout 10 api; fi

database_dir="$base/data/d1/miniflare-D1DatabaseObject"
databases=()
if [[ -d "$database_dir" ]]; then
    mapfile -t databases < <(find "$database_dir" -maxdepth 1 -type f -name '*.sqlite' ! -name metadata.sqlite)
fi
if [[ ${#databases[@]} -eq 1 ]]; then
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
elif [[ -n "$previous" || ${#databases[@]} -ne 0 ]]; then
    echo 'Unable to identify a single live database for rollback.' >&2
    exit 1
fi

install -m 600 "$scratch/next-compose.yaml" "$compose"
replaced=true
docker compose -f "$compose" up -d --no-build api
readiness
ln -sfn -- "$release" "$base/current.next"
mv -Tf -- "$base/current.next" "$base/current"
check_published
rm -f -- "$gate"
switching=false
echo "Serving revision $revision"
