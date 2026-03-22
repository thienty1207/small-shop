#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/backend/.env}"
DEFAULT_OUTPUT="$ROOT_DIR/backups/small-shop-latest.dump"
OUTPUT_PATH="${1:-$DEFAULT_OUTPUT}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install PostgreSQL client tools first." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "DATABASE_URL is not set and env file was not found: $ENV_FILE" >&2
    exit 1
  fi

  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  export DATABASE_URL
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is empty." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

TMP_PATH="${OUTPUT_PATH}.tmp"
rm -f "$TMP_PATH"

pg_dump \
  --clean \
  --if-exists \
  --create \
  --no-owner \
  --no-privileges \
  --format=custom \
  --compress=9 \
  --file "$TMP_PATH" \
  "$DATABASE_URL"

mv -f "$TMP_PATH" "$OUTPUT_PATH"

echo "Backup created at: $OUTPUT_PATH"
