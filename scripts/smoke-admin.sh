#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
USERNAME="${SMOKE_ADMIN_USERNAME:-}"
PASSWORD="${SMOKE_ADMIN_PASSWORD:-}"

if [[ -z "$USERNAME" || -z "$PASSWORD" ]]; then
  echo "[SMOKE] FAIL: set SMOKE_ADMIN_USERNAME and SMOKE_ADMIN_PASSWORD" >&2
  exit 1
fi

echo "[SMOKE] Admin login"
TOKEN="$(curl -sS -X POST "$BASE_URL/api/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [[ -z "$TOKEN" ]]; then
  echo "[SMOKE] FAIL: missing token" >&2
  exit 1
fi

echo "[SMOKE] GET /api/admin/me"
curl -sS "$BASE_URL/api/admin/me" -H "Authorization: Bearer $TOKEN" >/dev/null

echo "[SMOKE] GET /api/admin/customers?page=1&limit=5"
CUSTOMERS_PAYLOAD="$(curl -sS "$BASE_URL/api/admin/customers?page=1&limit=5" -H "Authorization: Bearer $TOKEN")"
echo "$CUSTOMERS_PAYLOAD" | grep -q '"items"' || { echo "[SMOKE] FAIL: customers payload missing items" >&2; exit 1; }

echo "[SMOKE] GET /api/admin/orders?page=1&limit=5"
ORDERS_PAYLOAD="$(curl -sS "$BASE_URL/api/admin/orders?page=1&limit=5" -H "Authorization: Bearer $TOKEN")"
echo "$ORDERS_PAYLOAD" | grep -q '"items"' || { echo "[SMOKE] FAIL: orders payload missing items" >&2; exit 1; }

echo "[SMOKE] POST /api/admin/auth/logout"
curl -sS -X POST "$BASE_URL/api/admin/auth/logout" -H "Authorization: Bearer $TOKEN" >/dev/null

echo "[SMOKE] Verify revoked token is denied"
if curl -sS "$BASE_URL/api/admin/me" -H "Authorization: Bearer $TOKEN" >/dev/null; then
  echo "[SMOKE] FAIL: revoked token was still accepted" >&2
  exit 1
fi

echo "[SMOKE] PASS: admin core flow is healthy"
