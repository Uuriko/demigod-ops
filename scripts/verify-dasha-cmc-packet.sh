#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node contributing-oss.test.mjs
node --check demigod-dasha-cmc-packet.mjs
node --check fixtures/dasha-cmc-packet-fetch.mjs
node --test demigod-dasha-cmc-packet.test.mjs
