# Demigod — Current State

This is an orientation card, not a release ledger. Run `bin/dg truth` for fresh website facts.

## Current facts

- Release state comes only from `bin/dg truth`; this card does not duplicate changing version, hash, freeze, or lock values.
- The active product is `trydemigod.com`: startup/talent intake, the public site, EventsBot, and SF community discovery.
- Public board entries remain samples unless backed by real receipts.
- Matching decisions are handled manually and are not an agent automation target.
- Public promises must match observed capability: no invented candidate volume, SLA, proof, attendance, or automation.
- Publishing, messages, posts, applications, form submissions, and money movement require authority in the current request.

## Canonical system

- Site source: `demigod-foot-core.js`, `demigod-head-styles.css`, `demigod-head-minimal.html`, and `demigod-footer-lite.html`.
- Release identity: `DEMIGOD-FOOT-CDN.json`; receipts: `/tmp/dg-busy/`.
- Operator spine: `bin/dg` → `truth` → `check edit|full|release` → guarded `ship status|prepare|verify`.
- Dashboard: an optional projection of canonical receipts at `http://127.0.0.1:9878/`; it is not a second source of truth.
- Integrity controls: `demigod-control-board.mjs`; private receipt `/tmp/dg-busy/control-board.json`; compact state is included in `demigod-orient.mjs`.
- Role observation clock: `demigod-role-ledger.timer` runs the fail-closed public ATS poll daily and persistently, then refreshes the private RecruitAI export and account-change feed; it never enriches or publishes the site.
- Agent coordination: Orca orchestration first; `ask-claude` and `grok-ask` are stateless fallbacks.
- Useful work: `demigod-useful-loop.service`.

## Operating rules

- Keep one control plane, one coordinator, one truth model, and one guarded ship path.
- Keep EventsBot external actions draft/export-only unless the current request explicitly authorizes them.
- Preserve private submission data and fail closed at publish, consent, event, and money boundaries.

History and postmortems live under `docs/exchange/`; current rules live in `AGENTS.md`, `DEMIGOD-AGENTS.md`, and `DEMIGOD-WORKFLOW.md`.
