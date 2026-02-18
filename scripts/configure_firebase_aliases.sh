#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
fi

: "${FIREBASE_DEV_PROJECT:?Set FIREBASE_DEV_PROJECT in .env or environment}"
: "${FIREBASE_PROD_PROJECT:?Set FIREBASE_PROD_PROJECT in .env or environment}"

cat > "$ROOT_DIR/.firebaserc" <<JSON
{
  "projects": {
    "default": "${FIREBASE_DEV_PROJECT}",
    "dev": "${FIREBASE_DEV_PROJECT}",
    "prod": "${FIREBASE_PROD_PROJECT}"
  }
}
JSON

echo "Wrote aliases to $ROOT_DIR/.firebaserc"
echo "  dev  -> ${FIREBASE_DEV_PROJECT}"
echo "  prod -> ${FIREBASE_PROD_PROJECT}"
