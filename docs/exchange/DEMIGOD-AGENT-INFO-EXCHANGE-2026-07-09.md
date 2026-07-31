# Demigod Agent Info Exchange - 2026-07-09

## Participants
- Grok (xAI): This session + prior
- Fable (Claude via bin/df, scripts/demigod-fable.mjs, claude -p)
- Supergrok Heavy (node demigod-heavy-*.mjs)
- Cursor (node cursor-*.mjs + .cursor/commands/dg-*.md)
- Additional this session: direct `claude --print --model sonnet` and `--model default` (Opus) calls for exchange when Fable quota limited.

## Work Summary (exchanged notes)

### Website (trydemigod.com Webflow)
- **Canonicals**:
  - `demigod-head-minimal.html` v4: unhide-v4 (critical/main/early styles + dg-early-unhide script with w-mod-ix3, RAF/interval/listeners, transform:none, graceful keyframes, noscript). Metas, CDN CSS, badge hide, simplify. (History: fixed prior SyntaxError that killed unhide script.)
  - `demigod-foot-core.js` v150: WIZ with 90day-outcome (required), explicit __review__ step, pending language for services, COPY for hero/WIZ, forms, board from CDN.
- **Pastes**:
  - /tmp/PASTE-HEAD-ONLY.txt (exact copy of head)
  - /tmp/PASTE-FOOTER-ONLY.txt (loader for xngres.js -> v150)
- **Publish Prep**:
  - /tmp/SIMPLE-PUBLISH.md, /tmp/READY-TO-PUBLISH.txt, /tmp/CURRENT-PASTE-STEPS.txt
  - Steps: Designer > Custom Code > paste HEAD/FOOTER > Save > clean lorem > PUBLISH > phone hard refresh ?v=4 clean URL.
  - Preflight: md5, diff, gates, grep v4.
  - Post: curls for publish time/v4/lorem, visual hero/WIZ.
- **Fallback (build new using existing)**:
  - /tmp/demigod-fallback-static.html (v4 head + minimal hero/content + foot loader).
  - Served at :8765 or open file directly on phone.
  - Uses ungated critical CSS + noscript for mobile resilience.
- **Other**:
  - WIZ: 90day-outcome required, review step, pending language.
  - Forms, a11y, CDP playtests (demigod-wiz-cdp-playtest.mjs --local).
  - Hygiene: tabs, CDP, procs.
  - Blockers: human Publish gate (Designer), CDP flakiness for automation.

### GTM + Startup Ops (pre-services honesty)
- DM templates, GTM personalizer, pilot tracker, proof stub.
- Board/ledger: honest samples (3 max), pending language.
- Outreach, pilots, 90d replacement.
- Pre-services: "pending" for Twilio/Stripe/SMS, hello@ follow up.
- Phase: demand gen (DMs to SF founders), 1 white-glove pilot, proof assets.
- Note (fresh from exchange): board-honesty currently FAIL (roles=5 >3 seeds). Trim before GTM.

### Agent Rules & Coordination
- **Core Rules** (DEMIGOD-AGENTS.md, CLAUDE.md, AGENTS.md):
  - One canonical: edit only demigod-head-minimal.html (head) / demigod-foot-core.js (JS). Supporting *.mjs ok if not site.
  - ALWAYS: npm run demigod:verify:source (or :all) + board-honesty + loop-state after edits.
  - Publish: Agent preps (pastes, diffs, /tmp files). Human clicks Publish in Webflow Designer.
  - Tab budget: ~6-10 (Designer, live, Grok/Heavy, Claude, Webflow dashboards).
  - Heavy authority: strategy from Supergrok Heavy (demand/GTM first). "Site mostly done."
  - Copy: no 48h/SLA, no founder names. "hello@trydemigod.com will follow up". Pending for services.
  - Honest data: 3 seeds max in board until real.
  - Game: archived (no touch unless "reopen the game").
  - Fable for deep: bin/df review "..." -> /tmp/fable-*.txt. Grok applies + verifies.
- **Coordination**:
  - Grok: tools, hygiene, verify, pastes, fallback, this exchange.
  - Fable/Claude: plans via df review, audits, summaries (via claude -p, bin/df). This session: direct sonnet/opus for exchange notes.
  - Heavy: audits, website audit pass.
  - Cursor: explore, webflow-enable, dg-*.md (verify, test, implement, pilot, gtm, cdp, snap).
  - Files for exchange: /tmp/COORD-AGENTS-*.md, fable-*.txt, cursor-task-*.md, READY/SIMPLE-PUBLISH.
  - Prompts: include only current disk truth and task-specific context.
- **Workflow**:
  - Plan (Fable/Cursor), execute (Grok/Cursor), verify (gates + board/loop).
  - Fresh context via df or --fresh.
  - Simple loops with clear stop (verify green + review).
  - Close tabs, agent-dev.sh, pkill.
  - Pre-services: pending language.
  - Tab hygiene, no game.

### Docs & Plans
- Root: DEMIGOD-AGENTS.md, CLAUDE.md, AGENTS.md, AI-HYBRID-COLLABORATION-PLAYBOOK.md, DEMIGOD-ROADMAP.md, DEMIGOD-GTM-*.md, DEMIGOD-STATE.md, many others (see ls). Clutter archived this session.
- docs/exchange/: exchange docs (this + new detailed GROK-CLAUDE one).
- /tmp: fable-*.txt, SIMPLE-PUBLISH.md, READY-TO-PUBLISH.txt, CURRENT-PASTE-STEPS.txt, coord-*.md, cursor-task-*.md, PASTE-*.txt, gtm-*.txt.
- Orca workspaces have copies of AGENTS.md etc.
- Scattered, some outdated (pre v4, old phases). Cleanup in progress.

### Stage & Blockers (2026-07-09 snapshot)
- Pre-services complete. Focus: demand gen (15+ DMs), pilot logging, 1 white-glove, proof.
- Blockers: Webflow publish (human gate), site load on phone (stale bake vs v4). Board honesty (fix before push).
- Next: user paste+Publish, confirm multi-way (curls, visual, screenshots), fix board, then GTM.

## Info Exchange Notes (Grok <-> Fable/Claude/Heavy/Cursor)
- **Grok (this session)**: Hygiene (tabs, procs, CDP), fresh diagnostics (curls, puppeteer, CDP), prep pastes/instructions/coord, fallback static, verify enforcement, agent coordination via tools/files/bg prompts, doc cleanup (archived clutter, new exchange doc, updates to CLAUDE.md + main exchange). Talked to Sonnet + Opus for fresh notes.
- **Fable/Claude**: Plans via bin/df review + claude -p (summaries, publish steps, audits). Confirmed v4 healthy (detailed layers, RAF/MO etc), publish gap, mobile CSS fallback, optional perf. This session Sonnet/Opus: detailed disk md5s, history of SyntaxError root cause, explicit board FAIL flag, multi-confirm advice, division of labor. Limits on df/claude calls handled by using other models.
- **Heavy**: Website audits (puppeteer/CDP), state checks.
- **Cursor**: Explore, webflow deep enable, dg- commands (verify, implement, test, gtm, pilot, cdp, snap). Task files for follow-up.
- **Common**: All agree on publish gap (human gate), v4 ready (disk/pastes), fallback (CSS/noscript covers mobile), rules (one canonical, verify always, hygiene), GTM honesty. Fresh flag: board >3 roles.
- **Exchange Method**: bg prompts (claude -p, node heavy, node cursor, bin/df, node fable), /tmp files, this doc. Direct model calls for when Fable limited.

## 2026-07-09 Grok <-> Sonnet/Opus Exchange (this session, added)
See the dedicated new doc: `docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md` for full verbatim-style notes from the Claude calls.

Highlights added:
- Detailed unhide v4 implementation (critical styles, early-unhide script internals, noscript, parse gate).
- WIZ v150 specifics (required 90d, review step, stepper counts, form patches).
- Board honesty FAIL explicitly called out (5 roles, dup id, pre-GTM trim required).
- Strong emphasis on "disk truth" (md5s provided), "human Publish only", "multi-confirm before live claim".
- Division of labor clarified.
- Suggested cmds for next (verify board first etc).
- Grok actions: ran the calls with prefixed prompts + --add-dir, captured, performed docs cleanup + created new doc, updated CLAUDE.md.

## Docs Cleanup (this session)
- Inventory + action: ~68 root *.md reduced to ~58 by archiving clutter/session outputs (CURSOR-ACTIVITY, DM-EXECUTE-NOW, HEAVY-*-REPLY*, outreach-today, SESSION-PAUSED, REVIEW-*, STORE-* etc) → docs/archive/.
- Removed root-level dup exchange copy (moved to archive).
- Updated CLAUDE.md with expanded Info Exchange section + this session details + board note.
- Enhanced this file + created dedicated new detailed exchange doc (GROK-CLAUDE) with merged Sonnet/Opus + Grok notes.
- Cross-refs improved. Scattered notes consolidated.
- (Future: more pruning of old ROADMAP variants, heavy history if needed; keep primary sources.)

## Next Steps (post-exchange)
- **Immediate**: User paste v4 head/foot in Designer, Save, clean, PUBLISH. Phone hard refresh ?v=4.
- Confirm: multi-way (curls cachebust + v4 marker + no lorem + hero visible + WIZ review present, screenshots, wiz-playtest, styles).
- Fix board-honesty (trim to 3 seeds) before GTM.
- Then GTM (3 DMs from templates in /tmp/, log pilot honestly).
- Iterate: Cursor for any perf (from Claude notes), more audits.
- Docs: continue light cleanup as needed; all agents use fresh df / verify.

## Key Commands (for all agents)
- Verify: `npm run demigod:verify:source && node demigod-verify-board-honesty.mjs && node demigod-verify-loop-state.mjs`
- Fable/Claude exchange: `bin/df review "..."` ; `node scripts/demigod-fable.mjs --fresh` ; `claude --print --model sonnet --add-dir /home/potter`
- Hygiene: `node cdp-close-tabs.mjs ; ~/agent-dev.sh tabs-cleanup ; pkill ...`
- Fallback: open file or serve :8765
- Paste: `cat demigod-head-minimal.html ; cat /tmp/PASTE-FOOTER-ONLY.txt`
- Publish: human in Designer.
- WIZ test: `node demigod-wiz-cdp-playtest.mjs --local`

*All notes grounded in disk truth and direct model exchanges.*

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
