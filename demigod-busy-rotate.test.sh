#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BUSY="$(mktemp -d)"
trap 'rm -rf "$BUSY"' EXIT

for generation in 1 2; do
  truncate -s $((6 * 1024 * 1024)) "$BUSY/large.log"
  DEMIGOD_BUSY="$BUSY" "$ROOT/bin/dg-busy-rotate" >/dev/null
  [[ "$(stat -c%s "$BUSY/large.log")" == 1048576 ]]
  gzip -t "$BUSY/large.log.1.gz"
done

gzip -t "$BUSY/large.log.2.gz"
[[ ! -e "$BUSY/large.log.1" ]]
echo "busy rotate compression OK"
