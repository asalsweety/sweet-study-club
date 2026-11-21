#!/usr/bin/env bash
set -euo pipefail

revision=${1:?Provide the main commit SHA}
output=${2:?Provide an output archive path}
[[ "$revision" =~ ^[0-9a-f]{40}$ && "$(git rev-parse HEAD)" == "$revision" ]]
output=$(realpath -m "$output")
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
cp -R dist/client "$scratch/client"
mkdir "$scratch/worker"
cp dist/sweet_study_club/{index.js,wrangler.json} "$scratch/worker/"
cp -R dist/sweet_study_club/assets "$scratch/worker/assets"
cp -R migrations "$scratch/migrations"
cp deployment/vps-backup/{server.mjs,package.json,package-lock.json} "$scratch/"
printf '%s\n' "$revision" >"$scratch/revision.txt"
printf '%s\n' "$revision" >"$scratch/client/revision.txt"
tar -C "$scratch" -czf "$output" client worker migrations server.mjs package.json package-lock.json revision.txt
