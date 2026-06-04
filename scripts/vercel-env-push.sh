#!/usr/bin/env bash
# Push an env file to a linked Vercel project — the FILE is the source of truth.
#
#   scripts/vercel-env-push.sh <app-dir> <env-file> [target]
#   e.g. scripts/vercel-env-push.sh api api/.env.prod production
#
# The app dir must already be linked (`vercel link` ran inside it).
# Idempotent: `--force` overwrites existing values.
set -euo pipefail

APP_DIR="$1"
ENV_FILE="$(realpath "$2")"
TARGET="${3:-production}"

cd "$APP_DIR"

while IFS= read -r line || [ -n "$line" ]; do
  # skip blanks and comments
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  # strip surrounding quotes if present
  val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
  printf '%s' "$val" | vercel env add "$key" "$TARGET" --force >/dev/null
  echo "✓ $key → $TARGET"
done < "$ENV_FILE"
