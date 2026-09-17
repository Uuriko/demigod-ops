# Demigod leftover honesty pin — 2026-09-17

Live leftover-redirects on `www.trydemigod.com` still leak Motley machine faces to getdasha.com. CDN faces landed in `Uuriko/demigod-site-cdn` #24. This note is the laptop hop: the Worker that actually 308s is live `demigod-html`, and that source is ahead of every pushed branch (#121).

Hands-off: people-data, Designer-publish, `dasha-lobby`.

## Who serves live leftover-redirects

| Signal | Value |
| --- | --- |
| Host | `www.trydemigod.com` |
| Worker name | `demigod-html` |
| Route | `www.trydemigod.com/*` on zone `trydemigod.com` |
| Account | `5a919d6c1785d47e15e10c24450a8ff7` |
| Header | `X-Demigod-Edge: leftover-redirect` |
| Accessible snapshot | `Uuriko/demigod-ops` `workers/demigod-html/` |
| Live source | Laptop Instinct/Potter tree — **newer than GitHub** (issue #121) |

`dasha-lobby` is the getdasha.com Worker. Do not deploy or edit it for this pin.

The GitHub `demigod-html` snapshot leftover-redirects **same-host only** and does not list `/humans.txt`. Live does. Live leftover table (proved 2026-09-17, no follow):

| GET | Status | Location |
| --- | --- | --- |
| `/humans.txt` | **308** | `https://www.getdasha.com/contribute` |
| `/contribute` | **308** | `https://www.getdasha.com/contribute` |
| `/.well-known/ai-plugin.json` | **308** | `https://www.getdasha.com/.well-known/mcp.json` |
| `/ai-plugin.json` | **308** | `https://www.getdasha.com/.well-known/mcp.json` |
| `/.well-known/mcp.json` | **308** | `https://www.getdasha.com/.well-known/mcp.json` |
| `/openapi.json` | **308** | `https://www.getdasha.com/compute/openapi.json` |

Live Worker **does not read** `leftover-motley.json`. Pinning CDN alone cannot stop the 308s.

## CDN pin (already merged, already on jsDelivr)

`Uuriko/demigod-site-cdn` #24 merge SHA:

```
73e5ff7eb843ff478a27c7c238610cc4c5c9c1e5
```

```bash
curl -sS -D- -o /tmp/leftover-motley.json \
  "https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@73e5ff7eb843ff478a27c7c238610cc4c5c9c1e5/leftover-motley.json"
curl -sS -D- -o /tmp/humans.txt \
  "https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@73e5ff7eb843ff478a27c7c238610cc4c5c9c1e5/humans.txt"
curl -sS -D- -o /tmp/plugin.json \
  "https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@73e5ff7eb843ff478a27c7c238610cc4c5c9c1e5/.well-known/ai-plugin.json"
```

Expect 200. `humans.txt` is `text/plain` with `Desk: Demigod`. Plugin `name` is `Demigod`. `leftover-motley.json` `neverLocationHosts` lists getdasha hosts.

Worker constant once this PR is cherry-picked:

```
LEFTOVER_MOTLEY_PIN = "73e5ff7eb843ff478a27c7c238610cc4c5c9c1e5"
```

No extra wrangler vars. Faces are embedded (same bytes as the pin) so the Worker does not have to fetch CDN on each request. Optional later: `loadCdnJson("leftover-motley.json")` against that SHA and fetch `faces[].file`.

## Do not deploy the GitHub snapshot over live

`workers/demigod-html/wrangler.jsonc` says Instinct/Potter lane — do not `wrangler deploy` from a cloud PR.

Issue #121: live Worker source is newer than every pushed branch. Deploying this repo's `demigod-html-worker.js` as-is would drop laptop-only leftover maps and other live-ahead edges.

**Cherry-pick the honesty functions onto the live laptop file, then deploy that file.**

## Laptop hop (exact)

On the machine that last deployed `demigod-html`:

```bash
# 1. Find the live Worker file (not dasha-lobby).
#    Confirm leftoverRedirect / leftoverRedirectPath exist and that
#    GET /humans.txt currently 308s to getdasha.com/contribute.
cd "$HOME"  # then the live demigod-html tree

# 2. Pull the merged demigod-ops honesty patch (this PR) as a reference.
#    Copy these into the LIVE worker, in this order:
#      - LEFTOVER_MOTLEY_PIN / NEVER_LOCATION_HOSTS / HUMANS_TXT /
#        CONTRIBUTE_TXT / AI_PLUGIN_JSON / LEFTOVER_HONESTY_FACES /
#        LEFTOVER_HONESTY_ALIASES
#      - leftoverSameHostLocation
#      - leftoverHonestyDoc
#      - leftoverHonesty
#    Call leftoverHonesty(url, request.method) BEFORE leftoverRedirect(url).
#    Change leftoverRedirect to use leftoverSameHostLocation(dest)
#    so an absolute getdasha dest cannot become Location.
#    Add leftover-motley leftoverSameHost keys to the live leftover table
#    (mcp.json → /room/.well-known/agent.json, openapi* → /compute).

# 3. Disk prove on the live file (or the ops snapshot tests if you
#    applied the same functions there):
node --test workers/demigod-html/demigod-html-worker.test.mjs
# or, from demigod-ops:
npm run demigod:html:worker

# 4. Deploy ONLY demigod-html. Do not wrangler deploy dasha-lobby.
cd workers/demigod-html
npx wrangler deploy --config wrangler.jsonc
# Expected wrangler name: demigod-html
# Expected route: www.trydemigod.com/*
# Expected account_id: 5a919d6c1785d47e15e10c24450a8ff7
```

If the live leftover table already stores absolute `https://www.getdasha.com/…` dests, leave those rows. `leftoverHonesty` wins first on `/humans.txt`, `/contribute`, `/.well-known/ai-plugin.json`. `leftoverSameHostLocation` refuses any remaining getdasha Location.

## Live prove (after deploy, no `-L`)

```bash
curl -sS -D- -o /tmp/h.txt https://www.trydemigod.com/humans.txt
# 200 text/plain; X-Demigod-Edge: humans; body has Desk: Demigod
# Location must be empty. Fail if 308 to getdasha.com.

curl -sS -D- -o /tmp/p.json https://www.trydemigod.com/.well-known/ai-plugin.json
# 200 application/json; X-Demigod-Edge: ai-plugin; name Demigod
# api.url is https://www.trydemigod.com/room/.well-known/agent.json
# Fail if name is Dasha Compute or Location is getdasha.com.

curl -sS -D- -o /tmp/c.txt https://www.trydemigod.com/contribute
# 200 text/plain; Contribute to Demigod. Not getdasha.com/contribute.

curl -sS -D- -o /dev/null https://www.trydemigod.com/ai-plugin.json
# 308 Location: https://www.trydemigod.com/.well-known/ai-plugin.json

curl -sS -D- -o /dev/null https://www.trydemigod.com/.well-known/mcp.json
# 308 Location: https://www.trydemigod.com/room/.well-known/agent.json

curl -sS -D- -o /dev/null https://www.trydemigod.com/openapi.json
# 308 Location: https://www.trydemigod.com/compute
```

Fail the pin if any of those 308 to `getdasha.com`.

## What this repo PR is

Accessible Uuriko repo: `demigod-ops` `workers/demigod-html`.

- Serves `/humans.txt` + `/contribute` + `/.well-known/ai-plugin.json` as Demigod faces
- Same-host leftover for mcp/openapi leftovers
- `leftoverSameHostLocation` never emits getdasha Location
- Documents `LEFTOVER_MOTLEY_PIN`
- Tests: `npm run demigod:html:worker`

Live will not change until the laptop cherry-pick + `wrangler deploy` above.
