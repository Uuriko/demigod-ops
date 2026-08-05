# Demigod public roles pipeline

Regular multi-source discovery → verified ATS observation → website surface.

## What it is
- **X/Twitter** (CDP public search): company *hiring posts* → extract public ATS board URLs only.
- **HN Who is hiring**: structured public posts → companies + often ATS links.
- **ATS poll** (`role-ledger`): only roles that exist on employer boards enter the feed.
- **Site**: `DEMIGOD-PUBLIC-ROLES.json` + `demigod-public-roles-embed.js` → foot injects **Recently observed roles** (`#dg-observed-roles`). `/startups` static also lists recent observations.

## What it is not
- Not matching inventory (`DEMIGOD-BOARD.json` stays sample-gated).
- Not auto-publish to CDN — run authorized ship after pipeline when live must update.
- Not inventing titles from tweet prose — boards must parse.

## Run
```bash
node demigod-roles-pipeline.mjs --dry
node demigod-roles-pipeline.mjs              # full
node demigod-roles-pipeline.mjs --skip-x     # no CDP
systemctl --user status demigod-roles-pipeline.timer
```

## Timer
`demigod-roles-pipeline.timer` — ~07:30 and 19:30 local, randomized delay.
