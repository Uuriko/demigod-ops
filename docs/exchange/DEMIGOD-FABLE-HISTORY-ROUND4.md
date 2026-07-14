# Demigod Swarm Synthesis — Round 4 Prep (Fable, 2026-07-14)

## 1. Chronology by Agent

**Phase 0 (07-05, "corruption era")** — Grok ran 3-5 concurrent unlocked sessions against `demigod-foot-core.js`, causing 5 documented foot-core corruptions (wizBuild undefined, v37 rollback, parse breaks, dead wizard stepper) and 3 board-honesty corruptions (SMS sims laundered into fake pilots/receipts). Fable/Claude ran read-only, delivering fix specs as text (Write/cp/curl denied). No writer lock existed. This era is why "one canonical file" + verify gates are now rule #1 in CLAUDE.md.

**Phase 1 (07-06→07-08)** — Stabilization: v150 foot-core reached first fully-green state (smoke+source+90day+review-step). HEAD unhide SyntaxError found as the real "site won't load" root cause (not stale publish). Publish-gap pattern identified repeatedly: disk healthy, CDN stale, human-paste-only, CDP flaky (ProtocolError on tab bloat). `demigod-publish-force.mjs` and allowlist installed to reduce read-only friction.

**Phase 2 (07-09)** — Autonomy expansion: user explicitly authorized Grok to do full CDP/Playwright publish (overriding the human-gate default). Board honesty gate, dedupe/cap fixes, OAuth deferred (trigger: ≥10 real WIZ subs/wk). Laptop hygiene pass (85/100). Events/matching-engine build (proposeIntro, Stripe fee research). `dg` alias/palette tooling and `bin/df` (Fable proxy) established as the standard query path.

**Phase 3 (07-12→07-13)** — GTM freeze discipline: potter froze v195 (07-13 17:05Z), later v198 (18:15Z). Fable/Claude's job shifted from "find bugs" to "respect freeze, distinguish real drift from freeze-blind false positives." Two false-drift incidents caught (`truth.mjs` cdnId regex matching wrong page's script; AGENT-BRIEF reading stale JSON). WIZ 7-fields-visible confirmed as *intentional design*, not a bug — smoke tooling's stale-tab artifacts caused false "broken" reports twice.

**Today (07-14)** — Live=v198, disk=v199 (one version ahead, freeze still ON). New tooling: `demigod-live-doctor.mjs`, `demigod-route-mime.mjs`, `bin/dg live|mime`. Docs consolidated into FULL-HISTORY-AND-TOOL-ATLAS, MODULE/BIN indexes, FOOT-CORE-FUNCTION-MAP, MASTER prompts (ops/website), Codex's 359k-char CODEX-FULL-HISTORY-SYNTHESIS. Round 2/3 exec checklists produced.

## 2. Documentation Gaps Still Hurting Agents

- **No single "is this actually live" oracle.** Repeated false-drift reports (regex mismatch, stale JSON, stale tabs) all trace to *ad hoc* freshness checks. `demigod-live-doctor.mjs` should become the *only* sanctioned freshness check — every doc referencing manual curl/grep drift checks should be pointed at it.
- **Freeze state is not machine-legible enough.** Multiple agents wasted cycles because "freeze ON since v195" lived only in memory/prose, not a checked-in `FREEZE.json` with version+timestamp+reason that tools can assert against before proposing any publish/ship action.
- **No changelog mapping version→content.** v150→v199 spans ~50 versions with no terse table of "what changed, who, why." Function-map doc exists but not a version ledger — new agents can't tell what v199 adds over v198 without re-diffing foot-core by hand.
- **CDP/tooling flakiness undocumented as a known-issue list.** wiz-cdp-playtest hangs on puppeteer.connect, CDP tab-bloat ProtocolErrors — these recur across sessions but aren't centralized as "known broken, don't trust, here's the workaround."
- **Role boundaries fuzzy at execution time.** "Grok=execute, Fable=plan" is stated but nothing stops Grok from also planning or Fable-sessions from being read-only-surprised mid-task — costing multiple sessions their entire output (delivered as text, never applied).

## 3. Prompt Improvements

**MASTER-OPS prompt** — add a mandatory preamble step: *"Before any drift/health claim: run `bin/dg live` (live-doctor) fresh — do not reuse a cached tab or prior session's read. State the live version and disk version explicitly before proceeding."* This single line would have prevented at least 4 memory'd false-positive incidents.

**MASTER-WEBSITE prompt** — add: *"Check FREEZE.json (or grep CLAUDE.md's latest freeze note) before proposing any foot-core edit past the frozen version. If frozen, disk-ahead-of-live is expected and NOT a P0 — only flag if disk is unhealthy on its own gates."*

**Role prompts (Grok/execute)** — add an explicit **no-concurrent-write** rule with a lock-file check (`.demigod.lock` or similar) before touching foot-core, citing the phase-0 corruption history as the reason — currently this is tribal memory, not enforced in the prompt.

**Role prompts (Fable/plan)** — add: *"If the session is read-only (Write/curl denied), say so in the first line of output, not the last — downstream agents currently discover this only after parsing your whole deliverable."*

**All prompts** — replace narrative version claims ("site mostly done", "v150 healthy") with a required structured header: `LIVE=vNNN(hash) DISK=vNNN(hash) FREEZE=on/off GATES=pass/fail`. This is cheap and would make memory entries and handoffs machine-diffable.

## 4. New Tools vs Archive Candidates

**Build:**
- `demigod-freeze-guard.mjs` — single source of truth for freeze state; every publish-capable tool imports it and hard-fails if frozen without `DEMIGOD_FORCE_PUBLISH`.
- `demigod-version-ledger.mjs` — appends a one-line entry per verified foot-core version (hash, delta summary, author) to a checked-in `VERSION-LEDGER.md`.
- `demigod-drift-oracle.mjs` — wraps `live-doctor` + `route-mime` into the one command all agents are told to run instead of hand-rolled curl/grep drift checks.

**Archive/delete candidates:**
- `demigod-wiz-cdp-playtest.mjs` — known to hang on puppeteer.connect across multiple sessions; either fix the connect path or retire in favor of a lighter DOM-injection test (the "v150 wiz review" mocked-POST approach already proved more reliable).
- Redundant one-off `demigod-*-pass.mjs` scripts (canvas-simplify, hero-canvas-cleanup, pricing-canvas-delete, partnerships-*-pass, legal-*-pass) — these read as single-use migration scripts from completed passes. Confirm each ran successfully once, then move to `scripts/archive/`.
- `.orca-run-demigod-sequence.py`/`.sh` — verify still referenced by an active loop; if superseded by `bin/dg`, archive.

## 5. Annotation Priority (Top 15 Files — headers + section banners, not line spam)

1. `demigod-foot-core.js` — the canonical file; needs a version-ledger-linked header + section banners per feature block (WIZ, board render, matching, forms).
2. `demigod-live-doctor.mjs` — new, becomes the drift oracle; document its exit codes.
3. `demigod-route-mime.mjs` — new, pair with live-doctor.
4. `bin/dg` — entrypoint; header should list every subcommand (live, mime, verify, ship, etc.) since it's grown organically.
5. `demigod-verify-source.mjs` — gate logic; document each check's purpose (several are known-soft: :66 hardcoded true, smoke stubs).
6. `demigod-board-honesty` (wherever it lives) — dedupe/cap logic, history of 3 corruption incidents.
7. `demigod-pilot-tracker.mjs` — slaDue-minting bug recurred across sessions; needs a loud warning banner.
8. `demigod-webflow-ai-ship.mjs` / `demigod-ghost-push.mjs` / `demigod-publish-foot.mjs` — the three publish paths; document which is canonical now post-autonomy-grant.
9. `demigod-full-ship-pass.mjs` — orchestrator; needs a step list banner.
10. `demigod-source-truth-pass.mjs` — was root cause of a false-drift P0; needs a "known limitations" section.
11. `demigod-match.mjs` — matching engine, proposeIntro honesty-bypass history.
12. `demigod-drift-fix-pass.mjs` — pair with truth-pass caveats.
13. `demigod-final-publish-pass.mjs` — freeze-interaction needs explicit doc.
14. `DEMIGOD-COMPRESSED-STATE.md` — not code but is the primary agent entrypoint; audit for staleness (living doc, easy to drift).
15. `demigod-nav-master-pass.mjs` / `demigod-seo-nav-forms-pass.mjs` — high blast-radius nav/forms passes, worth a "what this touches" banner before next agent reruns them blind.

## 6. Round-4 Protocol

1. **Open with the structured header** (`LIVE=/DISK=/FREEZE=/GATES=`) from a fresh `bin/dg live` run — no session starts work on stale beliefs.
2. **Single writer at a time on foot-core.** Grok holds the lock; Fable/Claude/Codex stay read-only-plan unless explicitly hand off write access, logged in the version ledger.
3. **Freeze-guard check before any publish-shaped tool runs**, including "just verifying" ones that historically triggered writes as a side effect.
4. **Every P0 claim requires a fresh-tab, timestamped repro** (not a reused tab) — the two false-positive incidents this week were both stale-tab artifacts.
5. **Annotate before extending**: apply section banners to the top-5 priority files above before adding new features to them — reduces the odds of a 6th corruption incident.
6. **Close with a version-ledger entry**, not just a memory note — memory is for cross-session judgment calls (freeze exceptions, honesty-policy nuance), the ledger is for "what changed and does it parse."
7. **No new one-off `demigod-*-pass.mjs` scripts** without a stated archive plan — write the pass, run it once, move it to `scripts/archive/`, don't leave it as permanent surface area for the next agent to wonder about.
