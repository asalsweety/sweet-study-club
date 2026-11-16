#!/usr/bin/env bash
set -euo pipefail

# Build host: Linux with Node >=22.12, Python 3, curl, tar, and rcodesign.
# Produces complete .app ZIPs; rcodesign adds ad-hoc signatures without an Apple account.
# Developer ID signing/notarization is a separate distribution step.
cd "$(dirname "$0")/.."
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm ci --ignore-scripts --no-audit --no-fund
npm run prepare:desktop
node --input-type=module <<'JS'
import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const config = structuredClone(pkg.build);
config.mac.identity = null; // Native codesign is unavailable on the Linux build host.
config.mac.notarize = false;
config.mac.target = [{ target: 'dir', arch: ['arm64', 'x64'] }];
config.directories.output = 'release/cross-mac';
await writeFile('release-cross-mac.json', JSON.stringify(config, null, 2));
JS
npx --no-install electron-builder --mac dir --arm64 --x64 --config release-cross-mac.json --publish never
python3 scripts/finish-mac-bundles.py
for arch in arm64 x64; do
  if [[ "$arch" = arm64 ]]; then folder=mac-arm64; else folder=mac; fi
  bundle="release/cross-mac/$folder/MeetStream Recorder.app"
  rcodesign sign --entitlements-xml-file main:build-resources/entitlements.mac.plist "$bundle"
done
python3 scripts/verify-mac-bundles.py
python3 scripts/archive-mac.py
