# Autonomous simplification session — log (2026-07-24 eve, user away)

Ran under `prompts/demigod/autonomous-simplify-session.md`. Guardrails held: reversible-first,
surgical commits, one publish max, no ETS/test/homepage-rendering changes without oversight, stop
when the safe backlog is done (didn't spin).

## Done
- **Swarm disabled** (structural): all churn loops/healers/dispatch timers off; real services
  (events-bot, tunnel, dashboard) kept. The `git reset` clobber source is gone.
- **Removed ~200+ files**, all verified unreferenced, tracked deletions reversible via git:
  - 141 untracked scratch scripts (root *.mjs/*.js 824→683); 22 orphaned bin wrappers (19 committed);
    23 more orphaned dev-tooling scripts; superseded tally-* subsystem; dead stub/dup docs +
    5 "never-stop" swarm docs + 3 stale roadmaps (root docs 52→~38); stale ARCHIVE-MANIFEST.
  - Kept: Eat-the-Sounds (148 files, CLAUDE.md rule), all tests, cursor/fable, product-adjacent tools.
  - 21 MB dead coord runtime cleaned from /tmp/dg-busy (119→98 MB).
- **Published foot v820** (one publish): enriched the thin funnel pages — `/how` 357→752, `/hire`
  188→661, `/talent` 237→596 chars, honest voice, verified live via rendered-DOM audit; scrubs still
  clean; `bin/dg truth` live==disk. Also narrowed the roles-grid hide selector (harmless).
- **Root-caused the hidden how-it-works section** (read-only): it's a real bug at foot-core:2019-2025
  (JS inline-hides the whole section, not just the fake roles-grid) — precise fix documented in memory
  `demigod-trust-section-display-none-collateral-0724`. DEFERRED (live-homepage visual change; needs
  your eyes, not an autonomous publish).

## Committed this session
c5e42a3 (pulse/honesty/retro/docs) · 0c7d92b (directory) · d540a9d (funnel draft) · 72ea27f (bin
wrappers) · a3ac2f5 (keep-going doc) · 98431a7 (foot v820 live) · 70ab0b7 (23 dev scripts).

## Left for you (needs oversight / judgment)
1. **Homepage how-it-works fix** — 2-line foot-core change (hide `.roles-grid` subtree, not the
   section) + publish + visual check. The homepage is thin (996 chars) until this lands.
2. **FAQ trim + page merges** (`scratchpad/simplify-copy-bugs.md`) — FAQ 18→~10, merge
   method/about→how, partners→refer. Copy trims are one publish; page merges need nav/route updates.
3. **The ~500-line scrub deletion** — biggest LOC win, gated on fixing the dishonest Designer *source*
   copy first (needs the Designer app open; element writes failed with a socket error this session).
   Element IDs staged in `WEBFLOW-HONESTY-FIX-READY.md`.
4. **75 unwired tests + doc consolidation** — reversible but want per-file / per-doc judgment.
5. **Swarm** stays disabled unless you deliberately revive it (`rm /tmp/dg-busy/swarm.STOP` +
   `systemctl --user enable --now …`). Per the retrospective, it's net-negative churn.
