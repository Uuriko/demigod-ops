# Demigod Multi-Agent Swarm Synthesis
**When:** 2026-07-13T16:46:10.782862+00:00  
**Agents:** 4× Codex API + 1× Codex history lane · Fable · Claude (retry) · Grok  
**Artifacts:** `/tmp/dg-busy/swarm/`  
**Live:** foot **v193** (`7s02w8.js`) · **Disk:** foot **v194** (reopen idempotent, unshipped) · freeze **ON**

---

## Swarm roster

| Agent | Role | Status | Output |
|-------|------|--------|--------|
| Codex API #1 | Forms + submissions | Done | `codex/forms-audit.md` |
| Codex API #2 | Site design/UX | Done | `codex/site-ux-audit.md` |
| Codex API #3 | Tools + dashboard | Running/partial | `codex/tools*.log` |
| Codex API #4 | Roadmap + features | Done | `codex/roadmap.md` |
| Codex history | Historical bugs status | Done | `codex/history-bugs.md` |
| Fable | Planner | Slow/empty at compile | `fable/fable-swarm.md` |
| Claude Sonnet/Opus | Copy + strategy | First launch failed CLI; retrying | `claude/` |
| Grok | Live CDP + gates + assets | Done | `grok/*` + images |

---

## Grok live user-test (hard evidence)

### Home (v193 live)
- body `display:block`, h1 visible ~600×786, foot **193**
- CTAs: **I'm hiring** → startup · **Find a job** → jobseeker · path pills OK
- CDN: `7s02w8.js`

### WIZ startup (CRITICAL)
- Modal opens (`display:flex`), next button present
- **FAIL one-question:** on open, **many fields visible at once** (contact-email, company-stage, company-name, role-title, stack-needs, timeline, team-size, 90day-outcome, salary-range, why-this-role, role-jd)
- **FAIL reopen:** `.dg-wiz-head` count grew **2 → 3 → 4 → 5** across open cycles (duplicate chrome on **live v193**)
- Disk **v194** was written to fix rebuild; **not live yet**

### Engineer modal
- Question text present; open state flaky in test (needs retest after ship)

### Product `/?p=hire`
- **PASS:** body block, h1 "Hire for the 90-day outcome…", ~3.4k text — product page works

### Gates / tools
- smoke + verify:source PASS on disk v194
- board honesty OK (2 samples, real0)
- dashboard: `openai_key: set`, reports disk/live drift (correct)
- freeze ON — do not claim live==disk for v194

---

## Consensus P0 (all lanes agree)

1. **Ship v194** — reopen idempotent (stop head/nav multiplication) + then retest CDP reopen counts = 1  
2. **One-question ownership** — kill `forceWizVisible` / modal force CSS fighting `showStep` (Codex forms + site + Grok CDP prove leak)  
3. **Submit fixtures** — `dgWfStatusRoot` shipped but unproven e2e; company-name required gap; sf-bay checkbox `.value` bug  
4. **Product loader** — replace `document.write` races (Codex site P0)

## Consensus P1

- Nav `href="#"` → always opens startup (logo hijack)  
- Over-broad `forceMainVisible` / aria-hidden unhide  
- CTA surface overload (hero + pills + mobile bar)  
- Thanks step may not render WIZ_THANKS reliably  
- Disk/live drift until publish  
- Tool sprawl: keep core path only (see tools keep doc)

## Consensus P2 / features (lean)

From roadmap Codex: fixtures first, then deterministic product routes, then content polish.  
**Do not build:** marketplace, ATS, live Stripe/Twilio, fake proof, accounts.

### Content to produce (swarm)
- Hero/trust microcopy variants (pending Claude retry)  
- +3 FAQ answers  
- Assets generated this run:
  - `images/11.jpg` hero gold match concept  
  - `images/12.jpg` dual CTA social mock  
  - also under `/tmp/dg-busy/swarm/assets/` when copied

---

## Ranked next actions (owners)

| # | Action | Owner | Stop |
|---|--------|-------|------|
| 1 | Unfreeze → CDN+CM6 ship **v194** → CDP reopen counts=1 | Grok | freeze off + hash match |
| 2 | One visibility owner for WIZ steps (minimal CSS/class) | Grok | wiz-playtest one field/step |
| 3 | Fix sf-bay `checked` + company-name `required` | Grok | fixtures |
| 4 | Submit success/fail fixture | Grok+Codex | dual pass |
| 5 | Product route loader non-write | Grok | 8 routes + fallback |
| 6 | Scope `href="#"` click handler | Grok | logo ≠ open WIZ |
| 7 | Copy pack apply (hero/FAQ) | Claude→Grok | policy grep clean |
| 8 | Drop CTA duplicate pills OR sticky-only-after-scroll | Design | mobile shot |
| 9 | Dashboard: keep brief honest post-ship | Grok | openai set, no false P0 |
| 10 | Human: warm DMs + 1 real form receipt check | Human | — |

---

## What each Codex file says (pointer)

### forms-audit.md
Overall **FAIL** isolation contract; matrices for every step; P0 fixes listed with lines.

### site-ux-audit.md
P0 product `document.write`; P0 one-question thrash; P1 hash→startup; blank-guard overreach; CTA overload.

### roadmap.md
P0 form completion + routes; decision rules; no premature marketplace; owners assigned.

### history-bugs.md
Blank-body/MO freeze **FIXED** on live lineage; form vis / one-question / submit **REGRESSION RISK**.

---

## Operating note

Parallel Codex **API key path works** (5 concurrent). Claude first invoke failed (`--print` needs stdin/arg — fixed on retry). Fable may still be buffering.

**Do not** open more foot writers until v194 ships or freeze remains intentional.

---

## Raw paths
```
/tmp/dg-busy/swarm/SHARED-BRIEF.md
/tmp/dg-busy/swarm/codex/forms-audit.md
/tmp/dg-busy/swarm/codex/site-ux-audit.md
/tmp/dg-busy/swarm/codex/roadmap.md
/tmp/dg-busy/swarm/codex/history-bugs.md
/tmp/dg-busy/swarm/grok/cdp-user-test.json
/tmp/dg-busy/swarm/grok/live-tools.md
docs/exchange/DEMIGOD-SWARM-SYNTHESIS-2026-07-13.md  (this file)
```
