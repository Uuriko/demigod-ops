# Demigod product surfaces

How we productize the stack without building Clay or a single mega-webapp.

## Architecture

| Surface | Audience | Implementation |
|---------|----------|----------------|
| **Match** | Founders + talent | Public site: hire/talent wizards, mutual yes, 10% fee copy |
| **Directory** | Public / GTM free | `/startups` map, roles, aging, pulse |
| **Notes** | Public | Blog SPA from `demigod-blog-posts.json` |
| **Desk** | Operator (you) | Local dash `:9878` + **`/desk`** + **`/api/desk`** |
| **DIE** | Ops / match-review | Evidence-backed company facts **only for accepted real roles** |

Canonical JSON: `node demigod-product-desk.mjs` → `/tmp/dg-busy/product-desk.json`  
Human page: `http://127.0.0.1:9878/desk` (dash must be running)

## Rules

- **Clay clone is a non-goal.** No people-email waterfalls, no GTM sequencer product, no public research SaaS.
- **Delivery loop** is the product risk: accepted real role → real pair → mutual yes → intro draft (send auth-gated).
- **DIE Phase 2** stays closed until accepted-for-delivery receipts exist (`demigod-accepted-role.mjs`).
- **Publish** of foot/map stays current-request-gated; Desk can still show prepare-only lag.

## Commands

```bash
export DEMIGOD_ROOT=…/demigod
node demigod-product-desk.mjs --md
just desk
node demigod-accepted-role.mjs status
# Dash must use worktree DEMIGOD_ROOT (systemd user unit demigod-dash.service)
# then open http://127.0.0.1:9878/desk  and  /api/desk
```

## Desk process

`~/.config/systemd/user/demigod-dash.service` should set `WorkingDirectory` + `DEMIGOD_ROOT` to the active Orca worktree (not only `/home/potter`), so `/desk` loads product code from the same tree agents edit.

## Not productized as customer webapp

Agent cockpit internals, useful-loop, reseal thrash, raw CRM PII, talent-crm tarballs.
