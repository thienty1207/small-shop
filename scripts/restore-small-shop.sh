#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/backend/.env}"
DUMP_PATH="${1:-$ROOT_DIR/small-shop.dump}"

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore not found. Install PostgreSQL client tools first." >&2
  exit 1
fi

if [[ ! -f "$DUMP_PATH" ]]; then
  echo "Dump file not found: $DUMP_PATH" >&2
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

# Use the same server credentials but connect to the maintenance DB `postgres`.
RESTORE_URL="${RESTORE_URL:-${DATABASE_URL%/*}/postgres}"

pg_restore \
  --clean \
  --if-exists \
  --create \
  --no-owner \
  --no-privileges \
  --dbname "$RESTORE_URL" \
  "$DUMP_PATH"

echo "Restore completed from: $DUMP_PATH"
