#!/usr/bin/env bash
set -euo pipefail

revision=${1:?Provide the main commit SHA}
output=${2:?Provide an output archive path}
[[ "$revision" =~ ^[0-9a-f]{40}$ && "$(git rev-parse HEAD)" == "$revision" ]]
output=$(realpath -m "$output")
scratch=$(mktemp -d)
smoke=
cleanup() {
    if [[ -n "$smoke" ]]; then docker rm -f "$smoke" >/dev/null 2>&1 || true; fi
    rm -rf -- "$scratch"
}
trap cleanup EXIT
image="sweet-study-club-production:$revision"
mkdir -p "$scratch/runtime/worker"
cp -R dist/client "$scratch/client"
cp dist/sweet_study_club/{index.js,wrangler.json} "$scratch/runtime/worker/"
cp -R dist/sweet_study_club/assets "$scratch/runtime/worker/assets"
cp -R migrations "$scratch/runtime/migrations"
cp deployment/vps-backup/{server.mjs,package.json,package-lock.json} "$scratch/runtime/"
docker build --platform linux/amd64 -f deployment/vps-backup/Dockerfile -t "$image" "$scratch/runtime"
smoke=$(docker run -d --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
    --tmpfs /tmp:rw,size=128m --tmpfs /data:rw,mode=1777,size=192m \
    -e APP_ENVIRONMENT=production -e APP_ORIGIN=https://sweetstudy.site \
    -e BETTER_AUTH_SECRET=local-image-smoke-test-only-invalid-for-production "$image")
ready=false
for attempt in {1..60}; do
    if docker exec "$smoke" node -e "fetch('http://127.0.0.1:8787/api/ready').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" 2>/dev/null; then
        ready=true
        break
    fi
    [[ "$(docker inspect -f '{{.State.Running}}' "$smoke")" == true ]] || break
    sleep 1
done
if [[ "$ready" == false ]]; then docker logs "$smoke"; exit 1; fi
docker image inspect -f '{{.Id}}' "$image" >"$scratch/runtime-id.txt"
docker save -o "$scratch/runtime.tar" "$image"
printf '%s\n' "$revision" >"$scratch/revision.txt"
printf '%s\n' "$revision" >"$scratch/client/revision.txt"
tar -C "$scratch" -czf "$output" client runtime.tar runtime-id.txt revision.txt
