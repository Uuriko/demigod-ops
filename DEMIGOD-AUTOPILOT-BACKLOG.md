<!-- CANONICAL autopilot backlog. Lives in the REPO, not /tmp.
     It used to live at /tmp/dg-busy/autopilot-backlog.md, which is wiped on reboot — so the
     Stop hook told every cycle to read a file that did not exist, and nothing recreated it.
     Recovered 2026-07-17 from session transcripts. The hook now reads THIS path. -->
# Claude autopilot backlog — SAFE self-drive scope (pull top item each cycle, append findings)
# Kill switch: rm /tmp/dg-busy/claude-autopilot.ON   (or touch /tmp/dg-busy/swarm.STOP)
# HARD RULES for every autopilot cycle:
#  - Ponytail. Read-only or gated small fixes only. Run verify:source + board-honesty + loop-state after ANY edit.
#  - NEVER: auto-publish to live, churn foot-core __dgFootVer, send DMs, touch the game, thrash the dashboard.
#  - Foot edits ONLY via: DG_LOCK_OWNER=coord-claude bin/dg-lock. Honest data only. Report, don't assign the user work.

## Rotating tasks (dogfood + improve until tools are useful)
1. DASHBOARD TRUTH AUDIT: fetch http://127.0.0.1:9878 /api/coord + AGENT-BRIEF.md; re-run each P0 it claims via the DIRECT command; log any STALE/FALSE P0 to /tmp/dg-busy/autopilot-findings.jsonl. (Memory: dashboard reports stale verify:source + false "live unreachable".)
2. GATE HONESTY: run demigod-verify-source / board-honesty / truth; confirm no false pass/fail; if a check is tautological or grep-gameable, note the file:line + fix.
3. WORKFLOW DATA: scan /tmp/dg-busy/*.log + *-drainer.log + coord for recurring errors/retries/backoff; summarize top-3 friction patterns + a concrete fix each.
4. CODE REVIEW: /ponytail-review on the newest diff or a demigod-*.mjs tool; report deletions/simplifications; apply only if trivially safe + gated.
5. BUGFIX: take one CONFIRMED small bug from autopilot-findings.jsonl; fix with the swarm (propose->apply->gates->verify); record outcome.
6. TOOL DOGFOOD: run bin/dg-publish --dry-run, ask-claude/grok-ask/codex round-trip, drainers status; note any broken tool + fix.

## Research scope directive (user 2026-07-16)
When doing ANY internet search for Demigod (positioning, copy, design, GTM), ALSO search:
- COMPETITORS: top talent-matching / vetted-engineer / hiring-marketplace sites (e.g. A.Team, Braintrust, Toptal, Lemon.io, Contra, Gun.io) — positioning, pricing model, proof/social-proof, WIZ/onboarding flow.
- DESIGN INSPO: top-tier landing pages (marketing-site galleries, award sites) — hero, trust blocks, motion, typography — for concrete ideas to adapt (never copy).
Capture: positioning gaps + 2-3 concrete design/copy ideas per pass → /tmp/dg-busy/autopilot-findings.jsonl. Read-only; no site edits without gates.
Task 7 (new rotating): COMPETITOR+INSPO RESEARCH — run one such search pass, log ideas.
