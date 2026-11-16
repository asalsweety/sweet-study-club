#!/bin/zsh
set -e
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 22 or newer from https://nodejs.org, then open this file again."
  read -k 1 "?Press any key to close."
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci
fi
npm start
