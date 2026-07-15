# Demigod — Compressed State (living)

## 2026-07-15 · WEBSITE v209 LIVE (post net-outage reconfirm)

- **LIVE foot:** **v209** `yeepfv.js` — WIZ progress "N of total", logo→home, a11y focus rings, mobile footer density
- Built on v208; re-shipped after internet restore when paste failed mid-flight
- Freeze ON

---

## 2026-07-15 · WEBSITE v208 LIVE

- **LIVE foot:** **v208** `ixb392.js` (shorter WIZ welcome/thanks, About+Status pages, focus rings, page focus trap)
- Prior v207 still documented below; pilot log website-first (no auto-DM)
- Freeze after this ship

---

## 2026-07-15 · WEBSITE v207 LIVE · STARTUP-ONLY PHASE

- **Phase:** Website + startup only — **no Twitter / no auto-DM**
- **LIVE foot (superseded by v208):** was v207 `jar78p.js` · head CSS `cycbs6.css` · favicon `bvp5uy.svg`
- **Home:** decision screen (~350 chars) · dual CTAs **I'm hiring** / **Find a job** · mobile bar
- **Pages:** short `/?p=` overlays (how, pricing, faq, hire, talent, contact, legal, partners, compare, pilot)
- **Footer-lite v27:** clean path redirects → `/?p=` · `/events` → catbox
- **Git tip:** `7d37db9` (v207 site+docs) · live CDN `jar78p.js`
- **Gates:** verify:source + foot-smoke green at v207 ship
- **Freeze:** OFF (re-freeze when quiet) · foot lock may need force-release if abandoned
- **Full writeup:** `docs/exchange/DEMIGOD-SESSION-STATUS-2026-07-15-WEBSITE.md`
- **Backlog:** `docs/process/WEBSITE-BACKLOG-MEGA.md` · review: `docs/process/WEBSITE-REVIEW-2026-07-15-V207.md`
- **GTM:** auto-DM hard-stopped (`DEMIGOD_ALLOW_AUTO_DM=1` emergency only)

---

## 2026-07-14 · P4 + TOOLS BRAINSTORM + REVIEW

- Cockpit NEXT = demigod-next (override only live-down/board/verify)
- Dash demand refresh ≤15m; next-canon --assert-same; ledger delta
- ship-status: facts + nextCanon (stage next ≠ agent NEXT)
- Fable/Codex tools want merged: /tmp/dg-busy/swarm-tools-brainstorm/MERGED-TOOLS-WANT.md
- Code review tools stack: REVIEW OK high=0 (info: dash size)
- tools-os-selftest ALL PASS


## 2026-07-14 · P3 AGENT SURFACE (no human tasks)

- Dash `/api/next` + glance use **demigod-next** (canonical)
- Demand line on dash from demand-status.json
- Jobs: demand · next-canon · wiz-ownership
- **wiz-ownership-selftest** source gate (90day required, no SLA)
- agent-smoke soft driftExpected under freeze (WARN, not core fail)
- tools-os-selftest green

## 2026-07-14 · P2 DEMAND OPS + NEXT + LEDGER

- **`bin/dg demand`** status/queue/log/templates — honest SENT-CONFIRMED + 0 pilots
- **`bin/dg next-canon`** / demigod-next.mjs — freeze+green → demand human
- **Version ledger** DEMIGOD-VERSION-LEDGER.jsonl append on every truth
- Control plane next uses buildNext (same as next-canon)
- Still freeze ON · live v198 · disk v199 · human DMs

## 2026-07-14 · P1 OPS SURFACE (ship + dash light)

- **`bin/dg ship`** status|prepare|cdn|paste|verify|run — mutators freeze+lock gated
- **Dash:** Light card + whyGreen from `refuseIfStale('truth')`
- **Control:** truthEvidence on plane; spine prepends truth or freeze-hold
- **Registry:** ship canonical; ship-prep/checklist/help aliases
- **Selftest:** demigod-ship-selftest + tools-os includes it
- **Still freeze ON** live v198 · disk v199 · demand-first

## 2026-07-14 · ROUND-4 · history + tools + annotations

- **LIVE** foot **v198** `ksbrmy.js` + CSS `vjxyrf.css` · **DISK** foot **v199** (section banners + header)
- **FREEZE ON** — intentional; live-doctor reports driftExpected=true (PASS)
- **Tools hot:** `bin/dg live` · `bin/dg mime` · `bin/dg full-check [--release]`
- **Docs:** ROUND4 discussion + Fable/Codex history · atlas §12 · one-shot classification
- **Annotation policy:** headers + section banners + JSDoc — **not** every-line comments
- **Next ship (when intentional):** freeze off → CDN v199 → CM6 → `full-check --release`
- **Next software (disk):** WIZ ownership tests · smoke disk/live soft assert · version ledger

---
## 2026-07-14 · TRUTH + FOOT LOCK LIVE

- **Oracle:** `bin/dg truth` → PASS (driftExpected: disk v199 / live v198)
- **Freeze ON:** sales surface v198 — demand-first; disk v199 staged
- **Foot lock:** free; `bin/dg lock require` hard-fails until claim
- **Ship:** only when intentional unfreeze + CDN body match

---

## 2026-07-14 · ELEGANT REFINE

- **Too complex?** Yes — we over-built process essays. **Fix:** one card `DEMIGOD-SIMPLE.md` + one ops page `docs/process/OPS.md`.
- Agents: open SIMPLE first; exchange/ = history; don’t re-read 58 docs per session.
- Method still true: stages PLAN/EXECUTE/REVIEW; human authorizes blast radius; 1 agent default.

---

## 2026-07-14 · AGENT METHOD CRITIQUE

- **Verdict:** process “hats” OK for humans/checklists; **bad as agent authority**
- **Replace with:** PLAN→EXECUTE→REVIEW + contracts · topology 1/2/3
- **Doc:** `docs/process/AGENT-COLLABORATION-METHOD.md`
- Swarm: Fable+Codex method notes in `docs/exchange/DEMIGOD-*-AGENT-METHOD.md`

---

## 2026-07-14 · FULL TEAM PROCESS OS

- **Master index:** `docs/process/README.md` (RACI, cadences, checklist catalog, anti-process)
- **Swarm inputs:** `docs/exchange/DEMIGOD-FABLE-TEAM-PROCESS.md` · `DEMIGOD-CODEX-TEAM-PROCESS.md`
- **Executable checklists:** OPS/DEM/INT/CAN/MAT/INTRO/PIL/HIR/BRD/WEB/INC/AGT under `docs/process/`
- **Ops records dirs:** `demigod-ops/{demand,intake,intros,finance,outcomes,incidents,releases}/`
- **Missing-before:** mutual-yes/consent/invoice/incident DoR · weekly rhythm · doc sprawl plan
- **Still true:** freeze ON · live v198 · disk v199 · human DMs + freeze A

---


## 2026-07-14 · EXEC PASS · disk v199 / live v198

- **Disk foot:** v199 (section banners + prior design)
- **Live foot:** still **v198** `ksbrmy.js` + CSS `vjxyrf.css` until next ship
- **Freeze:** ON (`v198 great design live — no thrash`) until intentional unfreeze
- **Docs:** FULL-HISTORY atlas, module/bin indexes, MASTER website + ops prompts v2
- **Next:** live-doctor + MIME check tools; ship v199; WIZ ownership harden; smoke version assert

---


## 2026-07-13 · v195 LIVE SHIP

- **One-question:** forceWizVisible chrome-only; removed ultimate unhide; critical = current key only
- **Validation:** checkbox `.checked`; non-optional steps require non-empty; company-name required
- **Click:** bare `href="#"` no longer opens hire modal
- **Product:** loadProduct onerror + empty fallback UI
- **Dashboard:** site-green only when live==disk versions + freeze off
- **CDN:** https://files.catbox.moe/gxwld0.js · footer v41
- truth claims.live==disk true


## 2026-07-13 · v194 DISK (not live) — WIZ reopen idempotent

- `show()` no longer deletes `dgWizBuilt` / rebuilds chrome every open
- Reopen uses `form.__dgWizShow` to refresh current step
- Gates: smoke + verify:source PASS · **publish freeze ON** → live still v193 until ship
- Codex API: gpt-5.6-sol ~$5/1M in · $30/1M out; rate limit sample 5k RPM / 4M TPM on gpt-4o-mini tier


## 2026-07-13 · v193 LIVE — dual CTAs

- **Buttons:** `I'm hiring` (startup) · `Find a job` (candidate) — not Hire/Find Talent pair
- **Competitor copy:** Underdog "I'm Hiring"/"I'm a Candidate"; Wellfound "Find your next hire/job"; Arc "Hire talent"/"Find jobs"
- **CDN:** `https://files.catbox.moe/7s02w8.js` · footer-lite **v40**
- **Also:** submit wrapper fix, How→/?p=how, resume step, #dg-bar hide in modal
- **Gates:** source PASS · smoke v193
- **Prompt pack still drives:** product loader race, one-question ownership, waitPost fixtures


## 2026-07-13 · v191 DISK (multi-agent pack + form P1s)

- **Agents queried:** Fable, Codex exec+review, Claude Sonnet, Claude Opus (Heavy-grade). SuperGrok Heavy browser: no grok.com tab.
- **Master pack:** `docs/exchange/DEMIGOD-MULTI-AGENT-PROMPT-PACK-2026-07-13.md` · `/tmp/dg-busy/prompt-pack/`
- **Disk foot v191:** submit wrapper fix (`dgWfStatusRoot`), no force `.w-form-done`, How → `/?p=how`, resume `startIdx`, truth CDN `src=` match.
- **Gates:** verify:source PASS · foot-smoke v191 PASS · board honesty OK.
- **Live:** still **v190** `f5r4yt.js` — publish freeze ON; ship CDN+Webflow after unfreeze.
- **Next Grok:** fixture for waitPost · product loader · one-question ownership · CDN ship v191.

---

## 2026-07-13 · v187 FREEZE FIX (shipped)

- **Root cause:** `wizBuild` form MutationObserver wrote `style` on every attribute mutation → infinite sync thrash → page freeze / never `load`.
- **Also:** removed full-document OBS thrash; hero CTAs no longer `display:none` by aggressive nav dedupe (v184).
- **Live foot:** `https://files.catbox.moe/sx8bw3.js` · footer-lite **v31 map5** · product sticky mobile CTAs.
- **Local proof:** load 120ms · WIZ open · deep-link · mobile bar · hero CTAs visible.
- **Verify:** `demigod:verify:source` PASS.
- **Product map5:** hire 9hf7zj, talent kuejms, how qoc2gv, pricing af8teb, pilot 7tf8v0, proof ne8030, faq ylgfkk, compare njdv6h.


**Update this file every ship.** Source of truth for humans + agents.  
**Last update:** 2026-07-13 · Live foot **v187** (`sx8bw3.js`) freeze fix
**Live:** https://www.trydemigod.com · Staging: https://talentlink-sf.webflow.io  
**Decision:** **FIX** not rewrite · demand + lean site build  
**Roadmaps:** `docs/exchange/DEMIGOD-STARTUP-ROADMAP.md` · `docs/exchange/DEMIGOD-LIVING-ROADMAP.md`

---

## 1. One-line truth

**SF startup talent matching:** human-reviewed briefs ↔ candidates; **10% on hire**; `hello@trydemigod.com`.  
**Differentiator:** not a job board / not ATS — **90-day outcome + mutual yes + private until both sides agree**.  
**Bottleneck:** demand (founder DMs + one pilot) · site conversion polish is secondary.

---

## 2. Live vs disk

| Piece | Truth |
|-------|--------|
| Foot disk | `demigod-foot-core.js` **v183** · `__dgFootVer='183'` |
| Foot CDN | https://files.catbox.moe/3fzlp6.js |
| Loader | `demigod-footer-lite.html` → 3fzlp6 + honesty soft-patch |
| Head | `demigod-head-minimal.html` unhide-v5-safe |
| Board | 2 samples · realRoles 0 · realReceipts 0 |
| Verify | `npm run demigod:verify:source` + board-honesty + loop-state |

**Version rule:** Never claim live == disk without CDN body hash.

---

## 3. Recent ships

| Ver | What |
|-----|------|
| v181 | Mobile CTA color fix; 48h scrub |
| v182 | Diff FAQ; hero not board/ATS; contact deep-links |
| **v183** | Path pills **I'm hiring / I'm looking**; `ensureHowLink` in run; badge HUMAN-MATCHED; CDN sync |

---

## 4. Startup phase (summary)

| Phase | Focus |
|-------|--------|
| **Now** | Demand + first white-glove pilot + conversion site polish |
| **30–90d** | Proof + first invoice path |
| **90d+** | Light matching OS only if demand hurts humans |

Full: `docs/exchange/DEMIGOD-STARTUP-ROADMAP.md`  
Research: `docs/research/DEMIGOD-DEEP-RESEARCH-STRATEGY-2026-07-13.md`

---

## 5. Agent roles

| Actor | Job |
|-------|-----|
| Heavy / Opus | Strategy |
| Fable | Plans via `bin/df` |
| Sonnet | Copy / audit |
| Codex | Code review |
| Grok | Execute, verify, publish, docs |
| Human | Real DMs + money decisions |

**Not for Demigod product:** Hermes / ElizaOS (personal later only).

---

## 6. Hard constraints

No 48h/SLA/founder-name · pending Twilio/Stripe language · ≤3 sample board roles · one foot-core writer · no game work · no concurrent thrash

---

## 7. Next

1. Human Top3–15 warm founder DMs  
2. Form e2e when useful  
3. Pilot terms + invoice SOP  
4. Site only for P0 / clear conversion wins

---

## Agent session tooling (2026-07-13)
- `bin/dg-start` — refresh AGENT-BRIEF + ship-status + lock
- `demigod-foot-lock.mjs` / `bin/dg-lock` — durable + flock foot writer lock
- `demigod-ship-status.mjs` — disk→CDN→live state machine
- Dashboard: http://127.0.0.1:9878/ · brief file `/tmp/dg-busy/AGENT-BRIEF.md`
- Docs: `docs/exchange/DEMIGOD-AGENT-TOOLING-2026-07-13.md`

## Agent wants debate (2026-07-13)
See `docs/research/DEMIGOD-AGENT-WANTS-DEBATE-SETTLEMENT-2026-07-13.md` — settlement: demand pack + hash-gated publish + PLAN-LEDGER + claim-verifier.
