# Codex History Review — Round 4

**Audit basis:** specified source/docs plus `git log`, file history, package references, and worktree status on 2026-07-14. **State:** disk foot v199, live v198, freeze ON. “Shipped” below means committed and, only where live evidence exists, deployed; untracked files are explicitly called disk-only.

## 1. What Codex / Grok / Claude actually shipped

- Git does not encode agent identity: relevant commits are authored `potter`. Agent attribution below is supported by the atlas/prompts, not commit metadata; do not claim an individual wrote specific bytes without a receipt.
- **Grok/local executor:** committed the control plane and registry (`dcc2c65`, 683 lines across `demigod-control.mjs` and `demigod-tools-registry.mjs`), Orca bridge (`f6daa65`), and cohesion/freeze/honesty/full-check work (`305aa3f`). The atlas assigns implementation, verification, CDN/CDP, and ship automation to Grok.
- **Website deploy evidence:** v196–v198 are recorded live; `e9b744a` and `f228a61` committed the UI system, brand assets, product shell/pages, and home changes. Current live is v198; v199 section-banner work is disk-only and intentionally frozen.
- **Codex:** evidence supports review/spec output, not sole byte authorship: WIZ correctness, ship-pipeline specs, and tool fixes are the atlas role. `1748853` records “Codex full history synthesis”; the merged website prompt embeds the Codex principal-engineer brief. Codex-driven defects include exact foot version, MIME/412, WIZ ownership, boot integrity, and hash-gated live proof.
- **Claude:** evidence supports plans/audits/prompt authorship. The merged prompt names Claude’s senior-product-engineer brief; its concrete additions include after-every-edit parse/source checks, function-definition checks, freeze/human-publish discipline, and live hash verification. No commit proves Claude independently deployed code.
- **Jointly specified, not yet shipped:** `demigod-live-doctor.mjs` and `demigod-route-mime.mjs` exist untracked; registry edits are modified/uncommitted. `bin/dg` routes exist, but current `demigod-full-check.mjs` does not call these checks.

## 2. Critical code paths needing section-banner comments

- `demigod-foot-core.js:wizBuild` — WIZ DOM construction, one-wrapper ownership, reopen idempotence.
- `demigod-foot-core.js:show` / `form.__dgWizShow` — step visibility, validation boundary, resize/reopen refresh.
- `demigod-foot-core.js:run` — idempotent enhancement orchestration and deduped injections.
- `demigod-foot-core.js:loadProduct` — `/?p=` routing, final URL/MIME/body validation, failure UI.
- `demigod-foot-core.js:waitPost` — real form-result handshake; success/failure/double-submit semantics.
- `demigod-foot-core.js:superCleanup` / `patchMeta` / `scrubInputs` — honesty backstop and static/runtime copy boundary.
- `demigod-live-doctor.mjs:main` — disk/footer/live artifact resolution and drift policy.
- `demigod-route-mime.mjs:probe` — transport status vs semantic HTML classification.
- `demigod-full-check.mjs:run` / `main` — subprocess contract, required/optional gate composition, aggregate exit.
- `demigod-control.mjs:MODULES` / `main` — module discovery versus command dispatch.
- `demigod-tools-registry.mjs:TOOLS` — canonical discovery metadata and mutator classification.

## 3. Prompt defects that caused rework

- **Stale literal versions:** website source text says v198 while top-level state is v199 disk/v198 live; executors can overwrite newer disk work. Patch prompts to derive versions, never prescribe them.
- **Contradictory authority:** prompts alternate “human owns Publish” with workspace autonomy notes; this creates repeated ship/prep rewrites. State one precedence rule: current freeze plus explicit task authorization wins.
- **Scope overload:** “full improvement pass” combines P0 correctness, redesign, copy, pages, OAuth, SEO, analytics, and performance. This invites broad churn after a green design and conflicts with freeze.
- **Verification explosion:** “after every change” lists source, honesty, loop, smoke, WIZ, full-check, and visuals without defining change size or fast/full tiers; agents rerun expensive unrelated gates.
- **Tool duplication:** live doctor appears both P0 and P2/new tool; Round 3 asks to build it but never patches `full-check` acceptance/composition.
- **Ambiguous MIME target:** checking raw `DEMIGOD-PAGES.json` Catbox URLs “by design” fails even when only same-origin `/?p=` routes are user-facing. Prompts must separate release gates from diagnostic origin probes.
- **Soft HTML sniffing conflicts with requirement:** `route-mime` currently accepts HTML-looking bodies without `text/html`, while the prompt says product URLs “must be text/html.”
- **Attribution inflation:** merged prompts describe agents as agreeing/authoring even where Fable hung and Claude supplied an alternate. Preserve provenance as “source/alternate,” not consensus.
- **Incorrect command drift:** website matrix names `demigod-user-test.mjs`; registry uses `bin/dg-usertest` and outputs `user-test-latest.json`.
- **No dirty-worktree rule in execution brief:** Round 3 created untracked tools and a modified registry without requiring a status/receipt classification, enabling “shipped” claims for disk-only work.

## 4. Tool API design: live-doctor + route-mime into full-check

- Give both modules import-safe exports: `checkLive(options)` and `checkRouteMime(options)` returning reports; keep CLI wrappers thin. Do not `process.exit` inside reusable functions.
- Standard report contract: `{schemaVersion, id, at, pass, severity, required, summary, checks, issues, artifacts}`. Each check carries `{id, target, pass, observed, expected, hint}`.
- `live-doctor` owns artifact identity: disk/footer/live URL, exact version, bytes/hash, CSS URL, freeze, honesty freshness. Add real CDN SHA-256 comparison; current `sha256`/disk hashes are collected but not used to assert live byte equality.
- `route-mime` owns navigation deliverability: status/redirect chain, final origin/URL, exact MIME, HTML marker, route marker. Same-origin `/?p=` checks are required; raw manifest asset probes are diagnostic unless they are navigation targets.
- `full-check` should run local gates first, then `live-doctor`, then `route-mime`, then browser smoke. Under intentional frozen drift, live-doctor reports `driftExpected=true`; default full-check may remain green-with-warning, while `--release` or `DEMIGOD_REQUIRE_LIVE_MATCH=1` makes drift fatal.
- Add flags: `--offline` skips network with explicit SKIP; `--release` requires disk=CDN=live and MIME; `--skip-browser` replaces ambiguous `--skip-smoke`; `--json` emits only JSON.
- Never parse human stdout between tools. Full-check consumes returned objects or JSON artifacts, records duration/status, and writes one atomic `/tmp/dg-busy/full-check.json` with child reports embedded and linked.

## 5. Top 10 code annotations to add now (exact recommended headers)

1. `demigod-foot-core.js` before `wizBuild`: `/* === WIZ BUILD & OWNERSHIP — create chrome once; one active wrapper; reopen is idempotent === */`
2. Before WIZ step renderer: `/* === WIZ STEP STATE — show/validate exactly one question; preserve values across back/reopen/resize === */`
3. Before submit/waitPost path: `/* === FORM RESULT CONTRACT — pending → confirmed Webflow success|failure; never synthesize success === */`
4. Before `loadProduct`: `/* === PRODUCT ROUTER — same-origin /?p= only; validate final URL, MIME, and marker; render explicit failure === */`
5. Before `run`: `/* === IDEMPOTENT BOOT ORCHESTRATOR — safe to rerun; injections must dedupe by stable owner id === */`
6. Before honesty cleaners: `/* === HONESTY BACKSTOP — scrub runtime/static claims; canonical copy belongs in COPY/Designer source === */`
7. `demigod-live-doctor.mjs`: `/** LIVE ARTIFACT DOCTOR — read-only disk→loader→CDN→live identity check; JSON SoR: /tmp/dg-busy/live-doctor.json; used by bin/dg live and full-check. */`
8. `demigod-route-mime.mjs`: `/** ROUTE DELIVERY GATE — read-only final-status/MIME/marker checks for user-facing product routes; manifest assets are diagnostic unless navigable. */`
9. `demigod-full-check.mjs`: `/** FULL-CHECK ORCHESTRATOR — freeze-safe read-only aggregate; local gates → artifact doctor → route MIME → browser smoke; --release tightens drift to fatal. */`
10. `demigod-tools-registry.mjs`: `/** TOOL DISCOVERY SoR — metadata only; every executable declares owner group, output, mutation/freeze behavior, and hot-path status. */`

## 6. Keep vs archive for `*pass.mjs` one-shots

- **Keep/rename into maintained verbs:** `demigod-drift-fix-pass.mjs`, `demigod-final-publish-pass.mjs`, `demigod-forms-rename-pass.mjs`, `demigod-full-ship-pass.mjs`, `demigod-heavy-website-audit-pass.mjs`, `demigod-master-only-pass.mjs`, `demigod-partnerships-publish-pass.mjs`, `demigod-resume-field-pass.mjs` only while package scripts call them. Add freeze/read-only headers and migrate durable logic to shared libraries; names should describe present capability, not historical “pass.”
- **Archive now:** unreferenced `candidate-copy`, `cms-legal`, `legal-page`, `nav-forms`, `nav-master`, `partnerships-page`, `partnerships-rename`, `route-pages`, `seo-nav-forms`, and `source-truth` passes. They encode completed canvas/publish sequences and can conflict with canonical current state.
- **Archive after replacement confirmation:** `heavy-cleanup-pass` is already named by `demigod-archive-scripts.mjs`; archive it through that existing manifest path. Do not delete history.
- Archive standard: move under a dated `archive/demigod-one-shots/`, remove package/registry references, add README with commit, purpose, mutation scope, last known version, and replacement. Freeze means classify only in this round—do not move files now.

## 7. Round-4 prompt deltas (bullet patches)

- Replace literal disk versions with: “derive disk/live/CDN versions and hashes at start; abort on concurrent disk mutation.”
- Add: “Freeze ON in this round: documentation/annotation/tool design only; no CDN, CM6, Webflow, or foot-core behavior change.”
- Split `FAST_AFTER_EDIT` from `RELEASE_GATE`; list exact commands once and let `bin/dg full-check --release` own the latter.
- Make `live-doctor` and `route-mime` P0 existing-work completion, not P2 proposals; require clean git classification and selftests.
- Define intentional drift semantics: frozen disk-ahead-live is warning in normal health, failure in release mode.
- Require exact `text/html` on user-facing routes; allow body sniff only as diagnostics, never as a MIME pass.
- Require redirect chain, final URL/origin, route marker, and 412 classification in route reports.
- Patch full-check order/API and require embedded child JSON, atomic output, stable schema, and nonzero release exit on either child failure.
- Correct usertest command to `bin/dg-usertest --quick`; require registry/control/bin command parity tests.
- Add provenance language: “git proves commits/files; prompts/atlas suggest agent roles; do not convert role attribution into byte authorship.”
- Add one-shot policy: no new `*-pass.mjs`; extend a maintained tool/library or include an expiry/archive manifest entry.
- Remove OAuth/design expansion from P0/P1 hardening prompts while freeze is active; preserve it only as deferred backlog.
