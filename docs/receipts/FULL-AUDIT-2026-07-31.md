# Demigod full audit — 2026-07-31T17:05Z

Scope: `www.trydemigod.com`, disk SoR in worktree  
`/home/potter/.grok/worktrees/potter/demigod`, docs, tools, GitHub, ops timers.  
Method: gates + live HTTP probes + control-board + blog quality + CI status.

---

## Executive scorecard

| Area | Status | Notes |
|------|--------|--------|
| Live site reachability | **GREEN** | All product routes 200 `text/html` |
| Live honesty (banned claims) | **GREEN** | No banned strings in served HTML |
| Site-health (36 routes) | **GREEN** | fullyServed; /startups fragment fresh |
| Route MIME | **GREEN** | 9/9 product query routes HTML |
| Disk source verify | **GREEN** | `demigod:verify:source` pass |
| Board honesty | **GREEN** | 3 sample roles, real=0 |
| Blog disk SoR | **GREEN** | 9 published, quality blockers 0 |
| Blog live | **RED** | Live foot v868 embeds **1** post only |
| Release identity | **YELLOW** | Disk **v869** vs live **v868** (prepare-only) |
| Map data CDN | **YELLOW** | Disk ~3706 cos vs live CDN ~2740 |
| Control board | **YELLOW** | ok=false: truth_seal + research_seal red |
| GitHub CI | **GREEN** | Latest verify runs success |
| Git tree | **GREEN** | Clean on `snapshot/v567-predisk` |
| Foot lock hygiene | **YELLOW** | Often held by dead `codex-final` PID |
| Research reseal | **RED** | Queue pending; fail-fresh thrash |
| Delivery loop | **YELLOW** | No real board roles, no pairs, pilots mostly closed |
| Docs orientation | **GREEN** | Entry cards avoid hard-coded release versions |
| Gmail agent MCP | **RED** | Permanently revoked (reauth `/mcps` → gmail → `i`) |

**Bottom line:** Production site is up, honest, and fully routed. Product **content lag** (blog 1 vs 9 posts, foot v868 vs v869, map CDN lag) is the main public gap. Ops **seals thrash** (truth/research) and **empty delivery loop** (samples only) are the main internal gaps. Ship of v869 + map-data closes the public lag when explicitly authorized.

---

## 1. Live website (`https://www.trydemigod.com`)

### Routes (all 200 HTML)

| Route | Bytes (approx) | Notes |
|-------|----------------|--------|
| `/` | 64k | Title: Demigod · SF startup talent matching |
| `/startups` | 96k | Crawlable fragment fresh (43203 sealed) |
| `/blog`, `/?p=blog` | 45–64k | SPA notes surface; **content thin live** |
| `/pricing` | 89k | 10% fee language present |
| `/hire`, `/talent`, `/how`, `/faq`, `/legal`, `/refer`, `/contact`, `/about`, `/events` | 45–87k | All HTML 200 |

### Assets

- Foot CDN: `…/demigod-site-cdn@7ce4e16c3fc6/foot-latest.js` → **v868**
- Head CSS: same release → matches disk CSS (truth)
- Manifest `DEMIGOD-FOOT-CDN.json`: version **868**, permanent jsDelivr, ok
- HSTS present; Cloudflare HIT cache observed
- Live honesty audit: **ok**, no banned assets

### Product claims on live HTML

- **10%** fee language: present (home/pricing)
- **Mutual / both sides**: present
- Contact email served: **`potter@trydemigod.com`** (not hello@)
- “guarantee” string hits are **scrubber regex / rewrite logic in foot**, not marketing SLA claims (live-honesty clean)
- Forms: home ~3 forms / 15 inputs; hire/blog shell form counts low (wizard injected by foot)

### Blog (live vs disk)

| | Live (v868) | Disk (v869) |
|--|-------------|-------------|
| Posts in embed | **1** (Epicurus only) | **9** (5 Product + 4 Market) |
| Reading CSS | Older measure | Wider measure + mobile fix |
| Quality gate | n/a | All published ready |

User-visible complaint (“trash blog”) is **explained**: live never received the v869 blog ship.

### Directory / map

- Live startups page renders recently observed roles; conversion audit shows no rendered dishonesty
- Map CDN JSON smaller (~1.2MB) than disk (~1.6MB); companies **~2740 live vs ~3706 disk**
- Atlas/startup-map JS identity matches disk (truth)
- Map-data body lag classified **intentional-expand** after fix (`disk > live` + hiring not down + ≥15% or +200)

---

## 2. Disk / gates (worktree)

| Gate | Result |
|------|--------|
| `bin/dg truth --no-cache` | PASS prepare-only · lagTracked · siblings intentional-expand |
| `npm run demigod:verify:source` | PASS |
| `demigod-verify-board-honesty` | OK |
| `demigod-blog-quality` | ok · 9 posts · 0 blockers |
| `demigod-blog-sync --status` | synced · 9 published |
| `demigod-site-health` | PASS · 36 routes fullyServed |
| `demigod-live-honesty-audit` | ok |
| `demigod-route-mime` | PASS 9/9 |
| `demigod-import-integrity` | OK · 524 edges · 10 contracts |
| `demigod-foot-smoke` | PASS **but defaults path `/home/potter/demigod-foot-core.js`** → reports **v868** (split-brain risk) |

### Key SoR sizes

| File | State |
|------|--------|
| `demigod-foot-core.js` | **v869** |
| `demigod-blog-posts.json` | 9 published posts |
| `DEMIGOD-SF-STARTUP-MAP.json` | 3706 companies |
| `DEMIGOD-ROLES-FEED.json` | 200 roles |
| `DEMIGOD-BOARD.json` | 3 sample roles · realRoles=0 · realReceipts=0 |
| `DEMIGOD-HN-HIRING.json` | 314 cos |
| `DEMIGOD-FOOT-CDN.json` | v868 shipped identity |
| Pilots (`~/DEMIGOD-PILOTS.json`) | 4 rows: closed/churned/piloted — no active warm LOI row in this store |

### Foot-smoke / DEMIGOD_ROOT split-brain

`demigod-foot-smoke.mjs` hard-defaults source to `/home/potter/demigod-foot-core.js`.  
Agents in the Orca worktree can get **false greens on old home foot**. Prefer  
`DEMIGOD_ROOT=<worktree> node demigod-foot-smoke.mjs` after foot edits.

---

## 3. Control board / delivery honesty

Control board receipt: **ok=false** · 7 failing · 62 pass · highExitFail=1

| Control | Sev | State |
|---------|-----|--------|
| truth_seal | high | **FAIL** input-hash-mismatch (disk moves faster than sealed evidence) |
| research_seal | high | **FAIL** fail-fresh reseal thrash |
| reseal_queue_drained | med | **FAIL** pending=1 |
| board_has_real_role | med | **FAIL** all sample |
| phase2_has_accepted_role | med | **FAIL** acceptedForDelivery=0 |
| pairs_has_real | med | **FAIL** no pairs store / real=0 |
| demand_drafts_only | high | **PASS** auto-DM off |
| role_poll_timer_healthy | med | **PASS** timer active |
| startups_fragment_fresh | low | **PASS** |
| export_board_identity_clean | med | **PASS** |
| research_export_honest | high | **PASS** CR=0 while research green false |

**Interpretation:** Pre-services honesty model is intact (samples only, no fake real pipeline). Delivery is empty by design until real pilots land — not a website bug.

Map observations of note:

- hiringLabeled=892 with ledgerOpen=0 (hiring flag vs poll lag)
- withJobsUrl=92 of 3706 (mostly directory, not ATS-enriched)
- withRoleMix=0 (role-mix enrich not stamped on map)

---

## 4. Docs

- **~181** files under `docs/`
- Areas: `agents`, `die` (+research), `events`, `exchange`, `gtm`, `process`, `receipts`, `research`
- Entry: `DEMIGOD-SIMPLE.md` / `DEMIGOD-COMPRESSED-STATE.md` correctly defer version to `bin/dg truth`
- Process checklists present (ship, consent, mutual-yes, hire invoice, blog path decision 2026-07-31)
- Research 2026-07-31 pack present (Builders, Laurelin, Clay, market synthesis)
- Historical website reviews under process (v207 etc.) — **archival**, not current release truth
- `docs/process/BLOG-PATH-DECISION-2026-07-31.md` documents JSON SoR vs Webflow CMS

No entry-card version lie detected in SIMPLE/COMPRESSED/AGENTS.

---

## 5. Tools / automation / GitHub

| Item | State |
|------|--------|
| Tools registry | **145** tools |
| `demigod-useful-loop.service` | **active** |
| `demigod-role-ledger.timer` | **active** (next ~daily) |
| GitHub `Uuriko/demigod-ops` | private · pushed · CI **green** |
| GitHub `Uuriko/demigod-site-cdn` | public · last push ~v868 era |
| Work queue | reseal-run only (research) |
| Gmail MCP (agent gateway) | **revoked** |
| Claude Code MCP | Gmail + Calendar connected; Stripe needs auth |

---

## 6. Severity-ranked findings

### P0 — public product lag (fix when publish authorized)

1. **Live foot v868 / disk v869** — blog UX + 8 missing notes + other foot fixes not on CDN  
2. **Map-data CDN lag** — ~966 fewer companies live than disk  
3. **Blog live = 1 post** — matches user “thin blog” complaint  

### P1 — ops integrity thrash

4. **truth_seal / research_seal** red almost continuously (input-hash-mismatch / fail-fresh) — reseal queue thrash  
5. **Foot lock** repeatedly claimed by dead `codex-final` PIDs — blocks concurrent foot work  
6. **foot-smoke default path** points at home foot, not worktree — agent split-brain  

### P2 — delivery / product depth

7. Board/pairs/phase2 empty of **real** delivery (samples only) — expected pre-services, but no LOI/hire pipeline in SoR  
8. Map hiring labels without ledger open-role stamps (lag honesty, not fake scores)  
9. Research export CR=0 while reseal pending — offline enrich incomplete  

### P3 — polish

10. Blog quality **warnings** (long Market essays outside 140–320 word band; repeated product 5-grams)  
11. Docs process backlog files are large historical prompts — navigation cost for new agents  
12. Guarantee scrubber still ships regex containing the word “guarantee” (harmless; confuses greps)  

---

## 7. What is healthy (do not “fix”)

- Public honesty model (no invented volume/SLA; sample board)
- Route surface fully served HTML
- Demand drafts-only / no auto-DM
- Import integrity contracts
- Source verify green on worktree
- CI green after recent test fixes
- Entry docs defer version to truth
- Events fabricated-speaker gate clean
- /startups fragment seal matches live

---

## 8. Recommended sequence (agent-executable)

1. **Release stale foot locks** (`node demigod-foot-lock.mjs release --force`) when owner PID dead  
2. **Authorize ship**: `DEMIGOD_CURRENT_REQUEST_PUBLISH=1` + lock + `bin/dg ship run` → lands **v869** + blog 9 + map-data  
3. Stop thrashing research reseal until benchmark fixture is fixed; leave fail-fresh as known debt  
4. Point foot-smoke default (or all agent invocations) at `DEMIGOD_ROOT` worktree  
5. Reauth Gmail MCP for agent mail  
6. Keep board sample until real LOI/pilot receipts exist  

---

## 9. Evidence paths

| Receipt | Path |
|---------|------|
| Truth | `/tmp/dg-busy/truth.json` |
| Control board | `/tmp/dg-busy/control-board.json` |
| Site health | `/tmp/dg-busy/site-health.json` |
| Source verify | `DEMIGOD-VERIFY-SOURCE.json` / home mirror |
| Ship prepare evidence | `/tmp/dg-busy/evidence/latest-ship-prepare.json` |
| This audit | `docs/receipts/FULL-AUDIT-2026-07-31.md` |

---

*Generated by agent audit pass 2026-07-31. Live numbers change after ship; re-run `bin/dg truth`.*
