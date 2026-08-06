# Demigod — Current State

This is an orientation card, not a release ledger. Run `bin/dg truth` for fresh website facts.

## Current facts

- Release state comes only from `bin/dg truth`; this card does not duplicate changing version, hash, freeze, or lock values.
- The active product is `trydemigod.com`: startup/talent intake, the public site, EventsBot, and SF community discovery.
- Public **matching board** entries remain samples unless backed by real receipts (`DEMIGOD-BOARD.json` + honesty).
- **Recently observed roles** on the homepage are first-seen public ATS observations (roles pipeline), not fill claims or matching inventory.
- Matching decisions are handled manually and are not an agent automation target.
- Public promises must match observed capability: no invented candidate volume, SLA, proof, attendance, or automation.
- Publishing, messages, posts, applications, form submissions, and money movement require authority in the current request.

## Canonical system

- Site source: `demigod-foot-core.js`, `demigod-head-styles.css`, `demigod-head-minimal.html`, and `demigod-footer-lite.html`.
- Release identity: `DEMIGOD-FOOT-CDN.json` + jsDelivr commit pin; receipts under `/tmp/dg-busy/`.
- Operator spine: `bin/dg` → `truth` → `check edit|full|release` → guarded `ship status|prepare|cdn|paste|verify|run`.
- Ship detail: [`docs/SHIP-AND-CDN.md`](docs/SHIP-AND-CDN.md) (includes catbox + Actions path when local `gh` is unauthenticated).
- Dashboard: optional projection of receipts at `http://127.0.0.1:9878/`; not a second source of truth.
- Integrity: `demigod-control-board.mjs`; orient via `demigod-orient.mjs` / `bin/dg session`.
- Role observation: `demigod-role-ledger.timer` (ATS poll) + `demigod-roles-pipeline.timer` (discover → public embed); guide [`docs/ROLES-PIPELINE.md`](docs/ROLES-PIPELINE.md).
- Agent coordination: Orca first; `ask-claude` / `grok-ask` stateless fallbacks.
- Useful work: `demigod-useful-loop.service`; standing nonstop flag `/tmp/dg-busy/KEEP_WORKING` when the user has ordered continuous work.

## Operating rules

- Keep one control plane, one coordinator, one truth model, and one guarded ship path.
- Prefer `DEMIGOD_ROOT` / home SoR used by systemd timers when refreshing production-bound embeds.
- Keep EventsBot external actions draft/export-only unless the current request authorizes them.
- Preserve private submission data; fail closed at publish, consent, event, and money boundaries.
- Disk ahead of live is normal until an authorized ship completes.

History and postmortems: `docs/exchange/`. Rules: `AGENTS.md`, `DEMIGOD-AGENTS.md`, `DEMIGOD-WORKFLOW.md`. Doc map: [`DOCS.md`](DOCS.md).
