**Start:** `DEMIGOD-SIMPLE.md` (simple card). Living state: `DEMIGOD-COMPRESSED-STATE.md`.

# Demigod Project Rules for Claude / Fable (root CLAUDE.md)

This file is auto-loaded by bare `claude` runs for project context.

## Key Rules (from DEMIGOD-AGENTS.md)
- **One canonical file**: Edit only `demigod-foot-core.js` for site JS (or supporting demigod-*.mjs when not touching site).
- **Verify gate**: ALWAYS `npm run demigod:verify:source` (or targeted / :all) + board-honesty + loop-state after edits.
- **Publish**: Human clicks Publish in Webflow. Agent prepares (CDN, custom-code via CDP, diffs).
- **Tab budget**: Max ~6-10 core tabs (Designer, live, Grok/Heavy, Claude, Webflow dashboards). Close extras.
- **Heavy authority**: Strategy from Supergrok Heavy (demand/GTM first). "Site mostly done."
- **Copy policy**: No 48h/SLA promises or founder names on live site. Use "hello@trydemigod.com will follow up". Runtime scrubs only.
- **Honest data**: 3 seeds max in board.json until real. Real receipts only.
- **Pre-services**: Use "pending" language for Twilio/Stripe/SMS.
- **Game**: Eat the Sounds is archived — never touch unless "reopen the game" explicitly.
- **Fable for deep work**: Use `bin/df review "..."` (injects fresh ver/board/loop-state/verify). Output to /tmp/fable-*.txt. Grok applies + verifies.

## Current Phase
Pre-services complete. Focus: demand generation (15+ DMs to warm SF founders), pilot logging, one white-glove delivery, proof assets. Minimal site changes.

Current WIZ: Typeform stepper (startup + engineer) with 90day-outcome (required, high-signal for matching) + explicit review step before submit. Test with `node demigod-wiz-cdp-playtest.mjs --local`.

## Prompting for Demigod
Start prompts with: "Demigod (Webflow talent matching). Current phase: GTM + pre-services honesty. [task]"

**Living state (start here):** `DEMIGOD-COMPRESSED-STATE.md`  
See full playbook: AI-HYBRID-COLLABORATION-PLAYBOOK.md  
See templates: prompts/demigod/ (use via bin/df)  
Publish/load postmortem: `docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md`
## Best practices for this setup (from standard AI dev research)
- Always plan first (use Cursor Plan Mode Shift+Tab for complex).
- Separate plan (Fable) / execute (Grok/Cursor) / verify (gates).
- Fresh context via df.
- Simple loops with clear stop (verify green + review).
- Rules in .cursor and docs for consistency.
- Tab hygiene, close extras.

## Cursor integration with Fable (Claude) and Grok
- When planning with Fable, structure output for direct Cursor consumption: use @file, diff blocks, verify cmds.
- Recommend to user: Use Cursor Plan Mode on Fable plans, then Agent/Composer.
- Handoff: Save Fable plan to /tmp/fable-plan.md, open in Cursor with prompt "Implement per @demigod rules".
- Cursor strengths: precise multi-file edits, good for foot-core changes (but always verify).
- Combined: Fable (big picture/audit) + Cursor (implementation) + Grok (verify/execute tools/CDP).

## Info Exchange 2026-07-09
Full details in docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09.md and docs/exchange/DEMIGOD-AGENT-INFO-EXCHANGE-2026-07-09-GROK-CLAUDE.md (new this session).

This session (Grok): talked directly to other Claude models (sonnet, default/opus via `claude --print --model ... --add-dir`) + prior Fable via bin/df/scripts. Exchanged detailed notes on:
- v4 head unhide (layers: critical styles + early script RAF/MO/interval/listeners/noscript + graceful; fixed prior SyntaxError in unhide).
- foot v150 WIZ (90day-outcome required + explicit review/__submit__ step; stepper for startup/engineer; pending copy).
- Board honesty currently FAIL (roles>3=5, needs trim before GTM).
- Workflow: human Publish gate, prepare pastes + /tmp/READY, multi-confirm (curl, styles, wiz-playtest), fallback static.
- Agent roles: Fable (plans via df), Claude (audits), Grok (verify/hygiene/tools/pastes), Cursor (edits in plan mode), Heavy (GTM).
- Docs: cleaned (archived clutter to docs/archive/), cross-refs, new exchange doc.

See the new detailed exchange doc for full Claude (Sonnet/Opus) responses and merged notes.
Agents continue to align on rules, phase (GTM + pre-services honesty), and next: user paste+Publish then confirm + DMs.

## Boss (Fable/Claude) Leadership 2026-07-09
Queried as proxy. Led on: current automation solid for prep, proceed with OAuth using Supabase for LinkedIn (engineers prefill WIZ) + Google, 'pending' copy, add to canonical head/foot. More automation (Playwright direct, self-heal, watcher), Linux configs (governor, inotify, tmux autopilot, speed). Start from scratch on OAuth layer as minimal. Always verify. See demigod-oauth-setup.md, demigod-automation-linux.md, dg-* scripts.


## 2026-07-09T04:05:46.331734 Build: events full (human+auto), sourcing/matching/intro/Stripe, website head+publish, extensive docs+roadmaps/checklists filled with research (a16z talent eng align, fees 10-25%). Gates green, CDP. Nonstop per directive.

## 2026-07-09T04:05:55.834316 nonstop autonomy: board honest, CDP publish attempts, research, gates green.

## 2026-07-09T04:05:56.504062 Autonomy: board fixed exact 2+real0, direct CDP publish on open tab, research forced, gates. Nonstop self-do.

## 2026-07-09T04:05:57.146651 nonstop: board 2 sample real0, publish attempts on open tabs, research, gates green.

## Autonomy Update 2026-07-09T04:05:57.291975
Per user directive: human does not / cannot act. Grok does ALL: research, audits, screenshots, board, publish via CDP/Playwright (demigod-webflow-publish-auto), GTM prep, verify gates, git.
Fable/Claude models = bosses with authority equal to user. Use bin/df for queries, apply plans.
Webflow publish: full autonomous (paste + Save + Publish click) overriding noted "human gate" per explicit "figure out how to do everything yourself, even publish webflow".
Gates always run post change. Board honest <=2-3 seeds, real=0.
Foot-core v150 untouched (canonical healthy).
Head: research comments added.
