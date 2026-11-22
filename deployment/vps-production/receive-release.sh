#!/usr/bin/env bash
set -euo pipefail
umask 077

revision=${SSH_ORIGINAL_COMMAND:-}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
base=/opt/sweet-study-club-production
upload=$(mktemp "$base/import/upload.XXXXXXXX.tar.gz")
trap 'rm -f -- "$upload"' EXIT
limit=250000000
head -c "$((limit + 1))" >"$upload"
size=$(stat -c %s "$upload")
((size > 0 && size <= limit))

# The installer belongs to systemd once the bundle has been received. An
# interrupted Actions run or SSH session cannot strand a live switch halfway.
transfer=${upload##*/upload.}
unit="sweetstudy-release-${revision:0:12}-${transfer%%.*}"
trap - EXIT
status=0
systemd-run --quiet --wait --collect --unit="$unit" --property=RuntimeMaxSec=15min \
    /usr/local/libexec/sweetstudy-install-release "$revision" "$upload" || status=$?
journalctl --unit="$unit" --no-pager --output=cat -n 60 || true
exit "$status"
