#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
fi

: "${FIREBASE_PROD_PROJECT:?Set FIREBASE_PROD_PROJECT in .env or environment}"

cd "$ROOT_DIR/web"
npm install

cd "$ROOT_DIR"
node scripts/sync_blogs.mjs

cd "$ROOT_DIR/web"
npm run build

cd "$ROOT_DIR/worker"
npm install

cd "$ROOT_DIR"

firebase deploy --project "$FIREBASE_PROD_PROJECT" --config firebase.json --only firestore:rules,firestore:indexes
firebase deploy --project "$FIREBASE_PROD_PROJECT" --config firebase.json --only hosting
npx wrangler deploy --cwd worker
