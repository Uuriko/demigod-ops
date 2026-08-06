# Ship path: CDN + Webflow custom code

**Living guide.** Release identity always comes from `bin/dg truth`, not this file.  
**Authority:** publish / paste / money only when the **current user request** explicitly authorizes it (`AGENTS.md`).

## What “shipped” means

```
disk SoR  →  immutable CDN commit (jsDelivr)  →  Webflow head+footer paste  →  queue-publish  →  truth --require-match
```

`shipped=true` on truth means disk foot body, manifest, live loader URL, and live CDN bytes agree (plus sibling map/head assets as classified).

## Commands (single spine)

```bash
bin/dg ship help
bin/dg ship status          # freeze + prepare-only vs authorized
bin/dg ship prepare         # verify-source, honesty, smoke, review — never publishes
bin/dg lock claim --owner "$USER" --why ship
export DG_LOCK_TOKEN=…      # from claim output
export DEMIGOD_CURRENT_REQUEST_PUBLISH=1   # only with current-request auth
bin/dg ship run             # prepare → cdn → paste → verify
bin/dg ship verify          # truth --require-match + live-attest
bin/dg lock release --owner "$USER" --token "$DG_LOCK_TOKEN"
```

| Step | Script / action | Needs |
|------|-----------------|--------|
| **prepare** | gates only | nothing mutate |
| **cdn** | `demigod-foot-cdn-publish.mjs` | freeze OFF, lock, **current-request publish env** |
| **paste** | `demigod-cm6-paste-publish.mjs` | CDP Chrome `:9223`, Custom Code UI, lock |
| **verify** | `demigod-truth.mjs --require-match` | network |

Env: `DEMIGOD_CURRENT_REQUEST_PUBLISH=1` is required for mutate steps (`demigod-publish-freeze.mjs`).  
Optional: `DG_SHIP_NO_PERF=1` to skip system76-power performance bump.

## CDN bundle (what must stay together)

One commit pin on `Uuriko/demigod-site-cdn`:

| Asset | Disk source | CDN name |
|-------|-------------|----------|
| Foot JS | `demigod-foot-core.js` | `foot-latest.js` (+ `foot-v{N}.js`) |
| Startup directory JS | `demigod-startup-atlas-web.js` | `startup-map-latest.js` |
| Map data | `DEMIGOD-SF-STARTUP-MAP.json` | `sf-startup-map.json` |
| Head CSS | `demigod-head-styles.css` | `head-latest.css` |
| Roles feed (optional) | `DEMIGOD-ROLES-FEED.json` | `roles-feed.json` |

Manifest after success: `DEMIGOD-FOOT-CDN.json`.  
Footer loader pin: `demigod-footer-lite.html` (`#demigod-foot-cdn-loader`).  
Head CSS pin: `demigod-head-minimal.html` stylesheet URL.

## When local `gh` is not authenticated

Primary path in `demigod-foot-cdn-publish.mjs` is git push via `gh` into `demigod-site-cdn`. If that fails:

1. **Automatic fallback** (when `GITHUB_TOKEN` / `GH_TOKEN` / `DEMIGOD_GITHUB_TOKEN` is set):  
   `uploadViaActions()` → `demigod-cdn-actions-publish.mjs`  
   (catbox stage → GitHub Actions `ingest-site-bundle.yml` → poll main until foot bytes match disk → jsDelivr attest).
2. **Without a token:** helper still **catbox-stages** and writes  
   `/tmp/dg-busy/cdn-catbox-urls.json` + receipt  
   so an agent can `workflow_dispatch` via **GitHub MCP** (same workflow), then re-run CDN finalize / ship.

Manual helper:

```bash
node demigod-cdn-actions-publish.mjs --stage-only   # catbox only
GITHUB_TOKEN=… node demigod-cdn-actions-publish.mjs # stage + Actions + poll
```

Workflow: `.github/workflows/ingest-site-bundle.yml` on `Uuriko/demigod-site-cdn`  
(inputs: `ver`, `foot_url`, `mapjs_url`, `map_url`, `head_url`, `feed_url`).

**Do not** leave production on litterbox/temporary hosts. Truth must report permanent jsDelivr (or equivalent attested permanent URL).

## Webflow paste (CM6)

- Requires CDP browser with Designer **Custom Code** reachable.
- Pastes **exact** disk head + footer; refuses partial / mismatched pairs.
- Queue-publish must finish (`taskStatus: finished`); then curl **www.trydemigod.com**.

GitHub / CDP notes: [`docs/process/GITHUB-CDP-AGENTS.md`](process/GITHUB-CDP-AGENTS.md).

## Honesty gates (ship-related)

| Gate | Purpose |
|------|---------|
| `npm run demigod:verify:source` | Disk architecture, footer CDN pin vs manifest, head budget, leaks |
| Board honesty | Samples labeled; no fake fill inventory |
| `footer:cdn-matches-manifest` | Footer loader URL == `DEMIGOD-FOOT-CDN.json` |
| Truth sibling drift | Map/atlas lag intentional vs unexplained |

## Failure modes (short)

| Symptom | Likely cause | Fix direction |
|---------|--------------|---------------|
| `release-transport-unavailable` | No `gh` auth / no token | Token + actions path, or MCP dispatch after catbox stage |
| Gates green, live old | Paste/publish skipped or wrong domain | CM6 paste + publish **www** |
| Disk ahead of live | Normal without publish auth | prepare-only; do not invent “shipped” |
| Sibling NEED REVIEW | Map/atlas hash lag without prepare receipt | `bin/dg ship prepare` or intentional classification |

Postmortems: `docs/exchange/` (archive).

## Related

- Map: [`DOCS.md`](../DOCS.md)  
- Workflow: [`DEMIGOD-WORKFLOW.md`](../DEMIGOD-WORKFLOW.md)  
- Resources map § ship: [`DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md`](DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md)  
- Roles surface (ships inside footer when embedded): [`ROLES-PIPELINE.md`](ROLES-PIPELINE.md)  
