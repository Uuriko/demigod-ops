#!/usr/bin/env bash
# Finish getdasha.com -> Webflow. Creates the DNS records and waits for the domain to serve.
#
# WHY THIS SCRIPT EXISTS
#   Webflow's Data API has no write operation for custom domains (only "Get Custom Domains",
#   a GET), so attaching getdasha.com in Webflow cannot be automated from here at all.
#   Cloudflare's API *does* expose DNS writes — so the DNS half can be fully automated the
#   moment a token exists. This script is that half.
#
# USAGE
#   1. Create a token: Cloudflare dashboard -> My Profile -> API Tokens -> Create Token
#      -> template "Edit zone DNS" -> Zone Resources: Include -> Specific zone -> getdasha.com
#   2. export CLOUDFLARE_API_TOKEN='...'
#   3. ./dasha-domain-finish.sh
#
# Safe to re-run: existing records with the same name+type are updated, not duplicated.

set -euo pipefail

DOMAIN="getdasha.com"
API="https://api.cloudflare.com/client/v4"
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN first (see header)}"

auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

api() { # api <method> <path> [body]
  local method=$1 path=$2 body=${3:-}
  if [ -n "$body" ]; then
    curl -sS -X "$method" "${API}${path}" "${auth[@]}" --data "$body"
  else
    curl -sS -X "$method" "${API}${path}" "${auth[@]}"
  fi
}

jqf() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

echo "==> Resolving zone id for ${DOMAIN}"
zone_json=$(api GET "/zones?name=${DOMAIN}")
echo "$zone_json" | grep -q '"success":true' || { echo "$zone_json"; exit 1; }
ZONE=$(echo "$zone_json" | jqf "d['result'][0]['id'] if d['result'] else ''")
[ -n "$ZONE" ] || { echo "Zone ${DOMAIN} not found on this account/token"; exit 1; }
echo "    zone=${ZONE}"

# Webflow's published values. Verify against what Webflow's Publishing tab shows; they can change.
upsert() { # upsert <type> <name> <content>
  local type=$1 name=$2 content=$3
  local existing id body
  existing=$(api GET "/zones/${ZONE}/dns_records?type=${type}&name=${name}")
  id=$(echo "$existing" | jqf "next((r['id'] for r in d['result'] if r['content']=='${content}'), '')")
  body=$(printf '{"type":"%s","name":"%s","content":"%s","ttl":1,"proxied":false}' "$type" "$name" "$content")
  if [ -n "$id" ]; then
    echo "==> Updating ${type} ${name} -> ${content} (DNS-only)"
    api PUT "/zones/${ZONE}/dns_records/${id}" "$body" | grep -q '"success":true' && echo "    ok"
  else
    echo "==> Creating ${type} ${name} -> ${content} (DNS-only)"
    api POST "/zones/${ZONE}/dns_records" "$body" | grep -q '"success":true' && echo "    ok"
  fi
}

# proxied:false is load-bearing. Cloudflare's orange cloud in front of Webflow blocks their
# SSL issuance and can produce redirect loops. Grey cloud until Webflow shows SSL green.
upsert A     "${DOMAIN}"      "198.202.211.1"
upsert CNAME "www.${DOMAIN}"  "cdn.webflow.com"

echo "==> Verifying against public resolvers"
for n in "${DOMAIN}" "www.${DOMAIN}"; do
  printf '    %-22s ' "$n"
  curl -s "https://cloudflare-dns.com/dns-query?name=${n}&type=A" \
    -H 'accept: application/dns-json' \
    | jqf "[a.get('data') for a in d.get('Answer',[])] or 'no answer yet'"
done

echo "==> Waiting for HTTPS to serve (Webflow must have the domain attached + SSL issued)"
deadline=$(( $(date +%s) + 900 ))
until [ "$(curl -s -o /dev/null -m 8 -w '%{http_code}' "https://${DOMAIN}" || true)" = "200" ]; do
  [ "$(date +%s)" -lt "$deadline" ] || { echo "    still not serving after 15m — check Webflow shows Connected + SSL"; exit 1; }
  sleep 15
done
echo "    https://${DOMAIN} is live"
