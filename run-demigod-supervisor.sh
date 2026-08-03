#!/usr/bin/env bash
# Demigod auto-loop supervisor — DISABLED (manual workflow only).
echo "[$(date -Iseconds)] demigod supervisor disabled — use manual npm scripts instead" >&2
echo "  publish: npm run demigod:fix:code-leak && publish in Webflow" >&2
echo "  verify:  npm run demigod:playtest" >&2
rm -f /tmp/demigod-supervisor.lock 2>/dev/null
exit 0