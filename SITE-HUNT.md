# Site hunt (Demigod + Dasha)

FIND -> TEST -> report. Does not mutate live sites. Do not import elizaOS. Do not steal Claude's slot.

## Run

    node /home/potter/site-hunt.mjs

Writes /home/potter/slop-agent-inbox/mission-control/site-hunt-latest.json (and /workspace/site-hunt-latest.json when that path exists).

Laptop .mjs is source of truth. Keep /workspace/site-hunt.mjs in sync.

If ExternalShell bind-fails on node site-hunt.mjs, run the same file from the box (node /workspace/site-hunt.mjs) or python3 /home/potter/site-hunt.py (fallback port). Prefer the node command.

## v3 vs v2

- Dedup one finding per (site, kind, msg) with n + urls[]. Demigod is an SPA -- pretty paths share one HTML shell.
- Honesty ignores copy-scrub JS (dg-early-copy-scrub, replacement arrays like [/Access to pre-vetted SF talent/gi, Human-reviewed]). JSON-LD still counts.
- Feeds: prefer raw.githubusercontent.com + the foot-latest.js pin SHA from HTML. jsDelivr @main lag is P3, not a fail, when raw is clean. Stale pin tree vs raw is P2.
- Palette hex-in-HTML is P3 only (does not fail the run). Notes whether a stylesheet link exists (CSS vars).
- Copy-budget counts the bounty mount (#bb-app, #dg-bounty-live) after stripping nav/footer, or follows the bounties iframe. SPA homepage chrome is not a P2.
- JSON starts with summary: {p0,p1,p2,p3,unique}. Schema site-hunt/3.
