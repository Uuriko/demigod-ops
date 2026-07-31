#!/usr/bin/env bash
# Wire Chrome DevTools MCP to your Flatpak Chrome CDP session (port 9223).
set -euo pipefail

CDP_PORT="${CDP_PORT:-9223}"
BROWSER_URL="http://127.0.0.1:${CDP_PORT}"

echo "==> Checking CDP at ${BROWSER_URL}..."
if ! curl -sf "${BROWSER_URL}/json/version" >/dev/null; then
  echo "CDP not running. Launch Chrome first:"
  echo "  /home/potter/launch-flatpak-chrome-cdp.sh"
  exit 1
fi

echo "==> Grok MCP config..."
if ! grep -q 'browserUrl=' "$HOME/.grok/config.toml" 2>/dev/null; then
  grok mcp add chrome-devtools -- npx -y chrome-devtools-mcp@1.3.0 --browserUrl="${BROWSER_URL}"
fi

mkdir -p /home/potter/.grok
if [ ! -f /home/potter/.grok/config.toml ]; then
  cat > /home/potter/.grok/config.toml <<EOF
[mcp_servers.chrome-devtools]
command = "npx"
args = [
    "-y",
    "chrome-devtools-mcp@1.3.0",
    "--browserUrl=${BROWSER_URL}",
]
enabled = true
EOF
fi

echo "==> Cursor IDE MCP config..."
mkdir -p /home/potter/.cursor
cat > /home/potter/.cursor/mcp.json <<EOF
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@1.3.0",
        "--browserUrl=${BROWSER_URL}"
      ]
    }
  }
}
EOF

echo "==> Open tabs:"
curl -s "${BROWSER_URL}/json/list" | python3 -c "
import sys, json
for t in json.load(sys.stdin):
    if t.get('type')=='page':
        print(' -', t.get('title','')[:60], '|', t.get('url','')[:80])
"

echo ""
echo "Done. In Grok: run /mcps and press r to refresh MCP servers."
echo "Test: node /home/potter/chrome-cursor-tab.mjs"