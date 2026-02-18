#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
fi

: "${FIREBASE_DEV_PROJECT:?Set FIREBASE_DEV_PROJECT in .env or environment}"

cd "$ROOT_DIR/functions"
npm install
npm run build

cd "$ROOT_DIR/web"
npm install
npm run build

cd "$ROOT_DIR"

firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only firestore:rules,firestore:indexes,storage
firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only functions
firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only hosting
