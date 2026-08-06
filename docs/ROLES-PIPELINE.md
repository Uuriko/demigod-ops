# Public roles pipeline (observed boards → site)

**Living guide.** This is **board observation**, not matching inventory.
Matching samples remain in `DEMIGOD-BOARD.json` (honesty-gated).
Release of embeds to live still needs **authorized ship** ([`SHIP-AND-CDN.md`](SHIP-AND-CDN.md)).

## Product honesty

| Surface | Meaning |
|---------|---------|
| **Recently observed roles** (`#dg-observed-roles`) | Roles Demigod **first saw** on public employer ATS (Greenhouse / Lever / Ashby, …). Link = employer board. |
| **firstObservedAt** | Demigod’s sighting date (not always employer `postedAt`). |
| **Matching board / samples** | Labeled samples only until real mutual-yes inventory exists. |

**Never:** invent titles from tweets; claim fill rates; mix sample cards with observed ATS rows without labels.

**Homepage preference:** `demigod-public-roles.mjs` ranks **SF/Bay** (and multi-city rows that include them) over pure off-geo noise (e.g. India-only, Remote Canada-only) when enough preferred rows exist.

## Pipeline steps

```text
X (CDP, optional) → HN (optional) → ATS apply (--write)
  → role-ledger poll → roles-feed (--days 1) → public-roles → directory static (optional)
```

| Step | Module | Notes |
|------|--------|--------|
| X hiring posts | `demigod-x-hiring.mjs` | Staging `/tmp/dg-busy/x-hiring.json`; extract ATS URLs only |
| HN Who is hiring | `demigod-hn-hiring.mjs` | Optional; months window |
| Attach boards | `demigod-roles-ats-apply.mjs` | Host/slug match to map companies |
| Poll ATS | `demigod-role-ledger.mjs poll` | First-seen / still-open truth |
| Feed | `demigod-roles-feed.mjs` | `DEMIGOD-ROLES-FEED.json` |
| Public embed | `demigod-public-roles.mjs` | JSON + embed JS + **footer** inline `#demigod-public-roles-data` |
| Directory static | `demigod-directory-static.mjs` | `/startups` snapshot (optional) |

Orchestrator: `demigod-roles-pipeline.mjs`.

## Commands

```bash
node demigod-roles-pipeline.mjs --dry
node demigod-roles-pipeline.mjs --selftest
node demigod-roles-pipeline.mjs              # full (X optional if CDP flaky)
node demigod-roles-pipeline.mjs --skip-x
node demigod-public-roles.mjs --selftest
node demigod-public-roles.mjs --limit 24     # regenerate embed + footer payload
systemctl --user status demigod-roles-pipeline.timer
systemctl --user status demigod-role-ledger.timer   # daily ledger poll (separate)
```

## Timers

| Unit | Role |
|------|------|
| `demigod-roles-pipeline.timer` | ~07:30 and 19:30 local (+ random delay): full discover→public refresh |
| `demigod-role-ledger.timer` | Daily ATS poll / aging windows (does not alone update footer embed) |

Service working directory: `DEMIGOD_ROOT` (typically `/home/potter`). Prefer that SoR over a detached worktree when refreshing live-bound embeds.

## Artifacts

| Path | Role |
|------|------|
| `DEMIGOD-ROLES-FEED.json` | Windowed observed open roles |
| `DEMIGOD-PUBLIC-ROLES.json` | Homepage-sized public list |
| `demigod-public-roles-embed.js` | `window.__dgPublicRoles=…` |
| `demigod-footer-lite.html` | Inline script **before** foot CDN loader (ships with paste) |
| `/tmp/dg-busy/roles-pipeline-latest.json` | Last pipeline receipt |
| `/tmp/dg-busy/x-hiring.json` | X staging (triage; not auto inventory) |

Foot inject: `injectObservedRoles()` in `demigod-foot-core.js` reads `window.__dgPublicRoles`.

## Ship interaction

1. Pipeline updates **disk** feed + footer embed.
2. Live users see new roles only after **footer paste** (and usually full authorized ship if foot/CDN also moved).
3. Do not claim “live roles updated” from pipeline alone.

## Related

- Doc map: [`DOCS.md`](../DOCS.md)
- Ship: [`SHIP-AND-CDN.md`](SHIP-AND-CDN.md)
- Board honesty remains separate: `DEMIGOD-BOARD.json` + honesty gate
