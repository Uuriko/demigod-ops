#!/usr/bin/env bash
# POST the DIE Access app for app.trydemigod.com once Zero Trust is enabled.
# Does not embed secrets. Reads CF_API_TOKEN (or CLOUDFLARE_API_TOKEN) from the environment.
set -euo pipefail

ACCOUNT_ID="${CF_ACCOUNT_ID:-5a919d6c1785d47e15e10c24450a8ff7}"
HOST="app.trydemigod.com"
EMAIL="potter@trydemigod.com"
APP_NAME="DIE"
TOKEN="${CF_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"

if [[ -z "${TOKEN}" ]]; then
  echo "Set CF_API_TOKEN (Access: Apps and Policies Write). Do not commit it." >&2
  exit 2
fi

API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps"

existing="$(curl -sS -X GET "${API}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" || true)"

if echo "${existing}" | grep -q '"success":false'; then
  echo "Access list failed. Enable Zero Trust on this account, then retry." >&2
  echo "${existing}" >&2
  exit 1
fi

if echo "${existing}" | grep -Fq "\"name\":\"${APP_NAME}\""; then
  echo "Access app ${APP_NAME} already exists for this account. No POST."
  exit 0
fi

payload="$(cat <<JSON
{
  "name": "${APP_NAME}",
  "type": "self_hosted",
  "domain": "${HOST}",
  "destinations": [
    { "type": "public", "uri": "${HOST}" }
  ],
  "session_duration": "24h",
  "app_launcher_visible": false,
  "policies": [
    {
      "name": "Potter",
      "decision": "allow",
      "include": [
        { "email": { "email": "${EMAIL}" } }
      ]
    }
  ]
}
JSON
)"

resp="$(curl -sS -X POST "${API}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data "${payload}")"

if echo "${resp}" | grep -q '"success":true'; then
  echo "Created Access app ${APP_NAME} for ${HOST} allowing ${EMAIL}."
  exit 0
fi

echo "Access create failed. If Zero Trust is not enabled, enable it first." >&2
echo "${resp}" >&2
exit 1
