#!/usr/bin/env bash
set -euo pipefail

echo "[ci-smoke] host: $(uname -a)"
echo "[ci-smoke] node: $(node --version)"
echo "[ci-smoke] npm: $(npm --version)"
echo "[ci-smoke] git: $(git --version)"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "${NODE_MAJOR}" -lt 20 ]]; then
  echo "[ci-smoke] ERROR: Node.js 20+ is required for this workflow."
  exit 1
fi

echo "[ci-smoke] npm ci"
npm ci

echo "[ci-smoke] npm run lint"
npm run lint

echo "[ci-smoke] npm run test"
npm run test

echo "[ci-smoke] npm run build"
npm run build

echo "[ci-smoke] success"
