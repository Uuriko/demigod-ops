# Demigod Agent Info Exchange — Grok + Claude (Sonnet/Opus) 2026-07-09

**Date:** 2026-07-09  
**Participants:** Grok (xAI, this session), Claude via `claude --print` (models: sonnet, default/opus; Fable limited by quota)  
**Context:** Demigod (Webflow talent matching).

## Purpose of this Exchange
Grok initiated direct conversations with other Claude models (and referenced prior Fable work) to exchange notes on:
- Progress and state of trydemigod.com (website fixes, canonicals, publish)
- Demigod startup ops (GTM, pilots, honesty)
- Agent collaboration patterns, rules, handoffs
- Docs state and needed cleanup

This supplements prior exchanges (see main DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md and /tmp/COORD*).

## How the Talk Happened
- Used `claude --print --model sonnet --add-dir /home/potter` and `--model default`
- Prompts included the task and relevant disk-truth references.
- Full project context via --add-dir + explicit references to disk truth (CLAUDE.md, AGENTS.md, demigod-head-minimal.html, demigod-foot-core.js, verifies, board, WIZ, recent /tmp files).
- Captured verbatim to `/tmp/claude-exchanges/{sonnet,opus-default}-exchange.txt`
- Also referenced `bin/df`, `scripts/demigod-fable.mjs`, prior Fable outputs (Fable 5 limit hit earlier).

Grok side also ran: `npm run demigod:verify:source`, board/loop checks, hygiene reminders.

## Grok's Summary of Recent Work (shared with Claude)
- **Website fix focus**: Stale Webflow bake (v3 only) causing blank/hero-hidden on phone + desktop. Prepared canonical v4 `demigod-head-minimal.html` (aggressive multi-layer unhide: dg-unhide-* styles !important, early script with RAF(60-120)/interval/MO/listeners, noscript, graceful keyframes, w-mod-ix3 force).
- Foot: `demigod-foot-core.js` v150 (WIZ_CFG with 90day-outcome required high-signal step + explicit review step "Ready to submit...", pending language, COPY scrub, xngres loader).
- Preps: exact /tmp/PASTE-HEAD-ONLY.txt + FOOTER, /tmp/SIMPLE-PUBLISH.md, fallback-static.html (ungated for phone test).
- Process: hygiene (tabs close via cdp-close-tabs + agent-dev.sh, pkill), verifies (source green, loop v150, board FAIL flagged), coord via /tmp/COORD-AGENTS-*.md + bg prompts to Fable/Claude/Heavy/Cursor.
- User gate: only human does Save + Publish in Designer (Custom Code HEAD/FOOTER). Agent never auto.
- Confirmed: source gates, md5s (head 601a1ea1, foot v150), no game touches.
- Other: GTM prep (3 DM templates ready), pilot logging, pre-services honesty everywhere.

## Claude (Sonnet) Key Notes & Contributions (verbatim merged)
- Confirmed canonicals: head-minimal v4 (4-layer defense vs IX3: critical + main + early + graceful + noscript + early script RAF+MO+timed retries + listeners).
- Foot v150: wizBuild defined, 90day-outcome required (textarea), explicit __review__ / __submit__ step. Stepper 11/13 steps. Forms patched (required, counters, 10MB uploads, trust copy).
- Flagged **board honesty FAIL**: roles>3 (5 entries, dup hashes like role-mrbemw35). Must trim to ≤3 seeds before GTM/publish. Suggested `node demigod-verify-board-honesty.mjs` + `demigod-board-reset.mjs` or manual.
- Agent collab: bin/df for Fable (fresh ver/board/loop/verify inject), verify:* surface, one canonical (only foot-core.js for site JS), human Publish only, tab hygiene (cdp-close-tabs), mobile resilience in v4.
- Copy: clean (no 48h, hello@ follow up, "Pending SMS").
- Next: fix board first, full verify:all, confirm live matches disk (verify:live), then GTM (3+ DMs), honest pilots only.
- Commands emphasized:
  - `npm run demigod:verify:source && ...board-honesty && ...loop-state`
  - `bin/df review "..."` ; `node demigod-wiz-cdp-playtest.mjs --local`
  - `node cdp-close-tabs.mjs`

## Claude (Opus / default) Key Notes & Contributions (verbatim merged)
- Root cause history: prior unhide had SyntaxError (misplaced catch before IIFE) silently killing script → hero stayed hidden (Webflow IX visibility gate + w-mod-ix3). v4 hardened with !important (45+), RAF loop + interval + 1x MutationObserver + 7 listeners + noscript (2 blocks) + graceful reduced-motion.
- Disk verified: foot md5 9e23ff36 v150, head 601a1ea1 ~8400B. wizBuild(), 90day req x16, dg-wiz-review x13, review step present.
- Diagnoses: stale custom-code bake (CDN vs disk), IX overrides (v4 drops), mobile hero-hidden from script fail.
- Advice: exact pastes, human Publish gate (CDP flaky), fallback static using v4, **multi-confirm** (curl ?v= + hash diff, CDP computed styles visibility, screenshots, wiz playtest --local). Never claim live from disk alone.
- Division of labor:
  - Fable/Claude: deep plans/audits (bin/df injects truth)
  - Cursor: precise edits (Plan Mode)
  - Grok: tools, hygiene, verify, prep, execute
  - Heavy: GTM strategy ("site mostly done")
- Rules same: one canonical, verify gate always (source+board+loop), tab budget, pre-services pending, honest board (realRoles:0), game archived.
- GTM phase: demand gen 15+ DMs to warm SF founders, 1 white-glove, proof. No simulated data.
- Key files/cmds listed (verify:source, verify:all, wiz playtest, bin/df, cdp-close-tabs; canonicals + pastes + board).

**Flag from Opus**: "live-published state is unverified this session (no confirmed curl). Don't let the doc imply v4/v150 are live — they're disk-ready and gated on a human Publish + multi-confirm."

## Merged Agreements & Fresh Findings (Grok + Claudes)
- All aligned on v4 + v150 readiness on disk, WIZ improvements (required 90d + review), rules, publish process, pre-services language.
- **Actionable this exchange**: board-honesty FAIL (5 roles) — must fix before more GTM. (Verify run in this session confirmed source PASS, loop v150 OK, board FAIL.)
- Exchange method effective: direct claude --print + --add-dir gives fresh disk-aware Claude perspective when Fable quota limited.
- Docs: this session did cleanup (moved clutter to docs/archive/, reduced root md count ~68→58, updated cross-refs).
- Next after publish: confirm multi-way, GTM (use /tmp/demigod-gtm-3dms-to-send.txt), pilot log, more proof.

## Docs Changes from this Exchange
- Created this new doc (detailed Claude responses + Grok side).
- Updated main exchange doc + CLAUDE.md with session summary.
- Archived session outputs/clutter.
- Added board honesty note and verify results.
- Cross-refs point to docs/exchange/.

## Key Commands (shared)
```bash
# Talk / exchange
claude --print --model sonnet --add-dir /home/potter   # or default, haiku, fable
cat /tmp/claude-exchanges/*.txt
bin/df review "..."   # Fable (when quota allows)
node scripts/demigod-fable.mjs --fresh --review "..."

# Verify (always)
npm run demigod:verify:source
node demigod-verify-board-honesty.mjs
node demigod-verify-loop-state.mjs
npm run demigod:verify:all

# Hygiene + prep
node cdp-close-tabs.mjs
~/agent-dev.sh tabs-cleanup
cat demigod-head-minimal.html   # for HEAD paste
cat /tmp/PASTE-FOOTER-ONLY.txt  # for FOOTER

# Test
node demigod-wiz-cdp-playtest.mjs --local
```

## Outcome
Successful exchange. Claude models provided detailed, disk-grounded validation + actionable flags (esp. board). Grok performed the requested cleanup + new doc creation. All notes now consolidated in docs/exchange/.

Continue per rules: verify, human Publish, GTM honesty, minimal site changes.

---
*Generated during Grok session on 2026-07-09. Sources: direct model calls + disk truth (head v4, foot v150, verifies).*

## Fresh Claude Summary (from bg task 2026-07-09, post prior exchange)
Claude (short, with prefix): 
**Demigod (Webflow talent-matching site), phase: retired setup framing.** The site is architecturally "mostly done" — canonical JS lives in `demigod-foot-core.js` (currently a healthy v150 build: `wizBuild` defined, 90day-outcome selector quoted, review step present, no banned 48h/SLA copy) with head/footer/WIZ Typeform stepper (startup + engineer, required 90day-outcome for match signal) and a `forceMainVisible` fallback; the recurring pain has been a HEAD unhide `<script>` SyntaxError that blanked the hero (fixed on disk, md5 759e28ce) plus repeated **publish gaps** — live custom code kept lagging disk because CDP paste/publish (port 9223 dead, tab bloat) and the Webflow human-Publish step keep failing, so "site won't load" was stale-publish, not code. Guardrails: edit only the one canonical file, run `npm run demigod:verify:source` + board-honesty + loop-state gates after every edit, keep the board to ≤3 honest seeds (pilot-tracker still spuriously mints `slaDue` receipts — known corruption engine), and let a human click Publish while the agent preps CDN/CDP diffs. **Current focus is demand generation** — 15+ DMs to warm SF founders (5 sent, follow-up ~07-08), pilot logging, one white-glove delivery, and real proof assets — with minimal further site changes; **next steps** are getting the fixed head+foot actually published and live-confirmed (verify hash matches disk, screenshot WIZ desktop/mobile), then resolving the dead webhook and unfreezing outreach once live is verified.

Notes on this summary: 
- Matches core state (v150, WIZ required 90d + review, publish gap is the blocker, GTM focus, rules).
- Minor md5 variance (actual current head: 601a1ea15f15c27bd70df3168b864c63; foot 9e23ff367dea98d7f86ffa103c4c55f8) — likely from cached context vs live disk at call time. Verified live now.
- Re-confirms Fable/Claude view of "human Publish only", verify gates, honest board, minimal site changes.
- Heavy audit in same bg failed (CDP 9223 ECONNREFUSED — CDP not up or tabs issue; use `~/agent-dev.sh up` + hygiene).

Fable attempt in bg: script usage error on first (no task), then limited ("Fable 5 limit"). Direct Claude (non-fable) used successfully for exchange.

## Fable/Claude Self-Summary (bg claude -p as Fable, 2026-07-09)

**Prompt framing**: "You are Fable/Claude working on Demigod... Summarize everything you and your sessions have worked on recently..." (website, GTM, coordination, docs, blockers).

**Full raw captured in**: `/home/potter/.grok/sessions/%2Fhome%2Fpotter/019f2a63-e18c-7620-b303-8b9a5eefd21a/terminal/call-6a7b6139-f115-4a6a-ad99-3dae17cc963f-265.log`

### 1. Website — custom code, publish, forms
- **Head** (`demigod-head-minimal.html`, md5 `601a1ea1`): Root cause of "site won't load on phone" was JS SyntaxError in unhide script (misplaced `}catch(e){}` before IIFE). Fixed on disk; added `head:inline-scripts-parse` gate (vm.Script). v4 drops bad `display:block`. 4 `w-mod-ix` unhide refs intact.
- **Foot** (`demigod-foot-core.js`, md5 `9e23ff36`, `__dgFootVer='150'`): Healthy v150. `wizBuild` defined, quoted `[name="90day-outcome"]`, explicit review step + `forceMainVisible`. Clean of 48h/SLA in custom code. History of concurrent churn/corruption (v37 rollback etc.).
- **Static fallback** (`.live-home.html`): Still contains 48h/SLA copy (Designer text drift, not covered by runtime scrubs).
- **Publish**: Strictly human-gated. Agent preps pastes/CDN; CDP repeatedly dead (9223, tab bloat ProtocolErrors). Recent handoffs as text step-files (e.g. FIX-SITE-CORRECTED-*.txt).

### 2. GTM / pilots — board, ledger, honesty
- **Board** (`DEMIGOD-BOARD.json`): `realRoles:0`, `realReceipts:0`, CDN `catbox.moe/06nhog.json`. Issues: 3× duplicate `role-mrbemw35`, mismatched skills, CDN reports 7 vs actual ~4. Honest-3-seeds policy holding (no fabricated receipts).
- Corruption engine: `pilot-tracker` / `sustain-cycle` repeatedly mint fake `slaDue` receipts → honesty FAILs.
- Pre-services: "pending" for services; "hello@trydemigod.com will follow up". 5 DMs sent (warm SF founders), follow-ups 07-08; DM freeze until live + 90d WIZ confirmed.
- Signed Potter, honest zero-delivery framing.

### 3. Agent coordination + rules
- Core: One canonical (`demigod-foot-core.js` for JS), mandatory verify:source + board + loop after edits, human Publish only, tab budget, Heavy strategy, game archived.
- Flow: Fable → plans/audits to `/tmp/fable-*.txt`; Grok applies + tools/verify/hygiene; Cursor precise edits (Plan mode). `bin/df review "..."` for fresh disk truth (ver/board/loop/verify).
- Chronic: Concurrent Grok sessions with no writer lock churn foot-core mid-work. Fable sessions often read-only (permissions/CLAUDE-PERMISSIONS-NOTE.md not installed). Deliverables as text for Grok to apply.
- `LOOP-STATE.json` stale (old game phase "paused", 2026-06-23 data — ignore for site/GTM).

### 4. Current blockers & status
- Phone load: Fixed on disk (SyntaxError + parse gate). Not live-confirmed this session (no curl).
- Publish: Human paste (v4 head + v150 foot) + Publish. CDP blocked.
- Static 48h: Drift in `.live-home.html` (needs Designer edit).
- Board: Dedupe dups + reconcile CDN.
- Corruption: pilot-tracker minting fake receipts (durable fix pending).
- DMs frozen until live confirmed carrying 90day WIZ.
- **Bottom line (per Fable)**: Disk healthiest state yet. Chain is publish + live-verify + hygiene items. "No live-confirmed claim should be made until a real fetch confirms the new head/foot hashes are serving."

**Fable offers in summary**: (a) clean single-file publish handoff, (b) dedupe board + CDN reconcile, (c) live fetch to confirm hashes.

**Cross-ref to this session disk**:
- Foot v150, head md5 `601a1ea15f15c27bd70df3168b864c63` (matches).
- 90day-outcome ×16, review markers present.
- verify:source PASS, board FAIL (roles>3=5) — consistent.
- No new /tmp/fable-*.txt produced in this run (quota).
