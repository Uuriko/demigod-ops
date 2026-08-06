# Webflow MCP + agent setup (this machine)

**Site:** talentlink-sf → www.trydemigod.com  
**Doctor:** `bin/dg-webflow connect` · `bin/dg-webflow connect setup`

## Layers

| Layer | Config | Auth | Use |
|-------|--------|------|-----|
| **Webflow Data MCP** | `~/.grok/config.toml` `[mcp_servers.webflow]` | OAuth once | CMS, SEO, pages, publish, webhooks, agent instructions |
| **Webflow Designer MCP** | same + Bridge app | OAuth + Bridge panel open | canvas structure/styles |
| **webflow-docs MCP** | `[mcp_servers.webflow_docs]` | none | Webflow developer docs |
| **chrome-devtools MCP** | `[mcp_servers.chrome_devtools]` → CDP `:9223` | CDP Chrome up | live proof screenshots/console |
| **CDP ship** | `~/agent-dev.sh up` | Webflow login in Chrome | CM6 head/footer paste + queue-publish |
| **REST site token** (optional) | `~/.config/demigod/webflow.env` | site API token | Node scripts when MCP not used |

## One-time OAuth (Grok)

Webflow MCP is configured but needs browser authorization:

1. In Grok TUI: `/mcps` (or Ctrl+L → MCP Servers)
2. Select **webflow** → press **`i`** (authenticate)
3. Log into Webflow in the browser → authorize **talentlink-sf**
4. Confirm: `grok mcp doctor webflow` is healthy
5. Credentials land in `~/.grok/mcp_credentials.json`

Claude: `claude mcp` / plugin auth if Claude’s Webflow token is empty.  
Codex: already has `[mcp_servers.webflow]` in `~/.codex/config.toml`.

## Session start (Webflow work)

```bash
~/agent-dev.sh up          # Chrome CDP :9223
bin/dg-webflow connect setup
bin/dg-webflow connect bridge   # Designer Bridge deep-link
bin/dg-webflow doctor
```

## Optional REST token

```bash
# Webflow → Site settings → Apps & integrations → API access → Generate
$EDITOR ~/.config/demigod/webflow.env   # WEBFLOW_API_TOKEN=…
node demigod-webflow-token.mjs
```

MCP OAuth ≠ REST site token. Scripts that call `api.webflow.com` need the site token.

## Chrome missing?

```bash
flatpak install --user flathub com.google.Chrome   # preferred (sign-in survives)
# or
npx playwright install chromium   # CDP fallback via launch-chrome-automation.sh
~/agent-dev.sh chrome
```

Playwright Chromium is fine for **live** proof and CDP plumbing. Designer / Custom Code paste needs a **signed-in** Webflow session in the CDP profile (`~/.grok/chrome-automation` or the Flatpak-seeded heavy profile). If tabs show `webflow-login`, log in once in that Chrome window.

## Canonical commands

| Intent | Command |
|--------|---------|
| Connect doctor | `bin/dg-webflow connect` / `connect setup` |
| Open Bridge | `bin/dg-webflow connect bridge` |
| Open Custom Code | `bin/dg-webflow open custom-code` |
| Orient / freeze | `bin/dg-webflow status` · `doctor` |
| Ship spine | `bin/dg ship` (request-gated for publish) |
| Truth | `bin/dg truth` |

See also: `docs/WEBFLOW-AGENT-PLAYBOOK.md`, `docs/WEBFLOW-EXPERT-GUIDE.md`.
