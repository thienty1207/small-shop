#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/backend/.env}"
if [[ -n "${1:-}" ]]; then
  DUMP_PATH="$1"
elif [[ -f "$ROOT_DIR/backups/small-shop-latest.dump" ]]; then
  DUMP_PATH="$ROOT_DIR/backups/small-shop-latest.dump"
else
  latest_dump="$(ls -1t "$ROOT_DIR"/backups/*.dump 2>/dev/null | head -n1 || true)"
  if [[ -n "$latest_dump" ]]; then
    DUMP_PATH="$latest_dump"
  else
    DUMP_PATH="$ROOT_DIR/small-shop.dump"
  fi
fi
SQL_DIR="$ROOT_DIR/sql"

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore not found. Install PostgreSQL client tools first." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client tools first." >&2
  exit 1
fi

if ! command -v sha384sum >/dev/null 2>&1; then
  echo "sha384sum not found." >&2
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

  # Trim CR to support .env files with Windows line endings.
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '\r')"
  export DATABASE_URL
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is empty." >&2
  exit 1
fi

DB_NAME="${DATABASE_URL##*/}"
DB_NAME="${DB_NAME%%\?*}"

if [[ -z "$DB_NAME" ]]; then
  echo "Could not determine database name from DATABASE_URL." >&2
  exit 1
fi

# Use the same server credentials but connect to the maintenance DB `postgres`.
MAINTENANCE_URL="${RESTORE_URL:-${DATABASE_URL%/*}/postgres}"

# Create the target DB if missing. We restore into DATABASE_URL directly instead of
# relying on CREATE DATABASE inside the dump, which avoids cross-OS locale issues.
if ! psql "$DATABASE_URL" -c 'select 1' >/dev/null 2>&1; then
  psql "$MAINTENANCE_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\""
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname "$DATABASE_URL" \
  "$DUMP_PATH"

# Sync SQLx checksums with the current migration files. This keeps local restores
# usable even when the dump was created before migration files were reformatted.
TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT
echo "BEGIN;" > "$TMP_SQL"
for file in "$SQL_DIR"/*.sql; do
  base="$(basename "$file")"
  if [[ ! "$base" =~ ^[0-9]+_.+\.sql$ ]]; then
    continue
  fi

  version="$(basename "$file" | cut -d_ -f1 | sed 's/^0*//')"
  checksum="$(sha384sum "$file" | awk '{print $1}')"
  printf "UPDATE _sqlx_migrations SET checksum = decode('%s', 'hex') WHERE version = %s;\n" \
    "$checksum" "$version" >> "$TMP_SQL"
done
echo "COMMIT;" >> "$TMP_SQL"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$TMP_SQL" >/dev/null

echo "Restore completed from: $DUMP_PATH"
