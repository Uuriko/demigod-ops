# Test triage — 12 failures across 4 files

Run: `node --test *.test.mjs` → **517 tests · 505 pass · 12 fail**.

Why this re-triage exists: the earlier audit classified 3 failures as environment
and 11 as "real," where real meant only "not explained by the wipe." Since then
**four confirmed false signals** turned up — three stale oracles in
`demigod-wizard-playtest.mjs` and one vacuous green in
`demigod-sprint-selftest.mjs`. A verdict of "failing" is not evidence about the
product, so every entry below was verified against current source or live DOM.

---

## [T1] `demigod-head-font-optional.test.mjs` — **REAL, uncommitted regression**

- **Assertion** (`:17-18`): `(head.match(/rel="preconnect"/g) || []).length === 1`
  — "exactly one custom preconnect (jsDelivr)". Actual **2**, expected **1**.
- **Evidence**: `demigod-head-minimal.html:270-271` now has both
  `cdn.jsdelivr.net` **and** `files.catbox.moe`. `git diff HEAD` shows the
  catbox line is **added and uncommitted**; the file has no commits since
  `349720d`.
- **Verdict**: the test is right, the code is wrong. A second preconnect is a
  real performance change — preconnect is a scarce resource and the file's own
  contract allows one.
- **Not mine.** `demigod-head-minimal.html` is in the other agent's active edit
  set (the same pass that moved foot-core v935→v939). **Left in place rather than
  reverted** — reverting another writer's in-flight work is how the earlier
  clobbering happened in reverse.
- **Action**: whoever added the catbox preconnect either removes it or updates the
  contract to allow two, deliberately. Do not silently bump the expected count.

## [T2] `demigod-matching-guards.test.mjs` — **STALE ORACLE / DEAD SUBJECT**

- **Assertion** (`:12`): `import { proposeIntro } from './demigod-matching-engine.mjs'`
  → `SyntaxError: does not provide an export named 'proposeIntro'`.
- **Evidence**: `proposeIntro` is defined **nowhere** in the tree (verified by
  grep for `function proposeIntro` and `proposeIntro =`). The engine exports
  `suggestMatches`, `proposeForCandidate`, `decideMatch`, and 14 others. The file
  aborts at import, so **zero assertions run** — this guard has protected nothing
  for an unknown period.
- **Second question — is the subject still worth guarding?** The test asserts
  fail-closed input validation on the intro entry point, which *is* worth
  guarding — but the function it guards does not exist. Either `proposeIntro` was
  renamed (retarget the test) or retired (delete the test).
- **Action**: needs a human call on which. Tracked; do not "fix" by deleting the
  import, which would leave a green test asserting nothing.

## [T3] `demigod-submissions-ingest-publish-policy.test.mjs` — **ENVIRONMENT**

- **Cause**: `ENOENT /home/potter/DEMIGOD-SUBMISSIONS-INBOX.json` (×2 tests).
- **Evidence**: that file is one of the 37 gitignored data files destroyed by the
  2026-08-02 wipe, never tracked, unrecoverable. Confirmed in
  `RECOVERY-2026-08-02.md`.
- **Action**: seed an empty inbox. Clears these without touching product code.

## [T4] `demigod-webhook-rate-limit.test.mjs` — **ENVIRONMENT**

- **Cause**: `ENOENT ~/.config/systemd/user/demigod-events-heal.service`.
- **Evidence**: `~/.config/systemd/user/` was destroyed by the wipe. The unit
  definitions survive in `~/systemd-user/`; only the installed symlinks are gone.
- **Action**: relink the units (three commands, in `LAPTOP-AND-WORKFLOW-PLAN.md`).

## [T5] `demigod-sprint-selftest-isolation.test.mjs` — **UNRESOLVED**

- **Cause**: `AssertionError: {"ok":false,"error":"real_pair_id_invalid"}`.
- **Status**: not yet classified. It is downstream of `demigod-sprint-selftest.mjs`,
  which I changed in `b09beec` to fail closed when the `proposeIntro` markers are
  absent — and per [T2] those markers *are* absent, so the selftest now correctly
  exits non-zero. This isolation test may be asserting the old exit-0 behaviour.
- **Action**: verify whether this failure is a consequence of the intended
  fail-closed change. If so it is a **stale oracle** and should assert the new
  contract. Do not revert the fail-closed fix to make it green.

---

## Summary

| Verdict | Count | Files |
| :--- | :--- | :--- |
| REAL (product wrong) | 1 | [T1] duplicate preconnect |
| STALE / dead subject | 1 | [T2] `proposeIntro` |
| ENVIRONMENT (wipe) | 2 | [T3] inbox, [T4] systemd unit |
| Unresolved | 1 | [T5] |

**Revision to the earlier audit.** It reported "11 real, 3 environment." The
accurate count is **1 real product defect**, 1 dead-subject guard, 2 environment
casualties, and 1 open. The rest of the earlier "real" failures were the wizard
staleness, now fixed and green.

That is the finding worth carrying: a standing red count of 14 was ~7% real.
Suites with normalised reds stop being read, which is exactly how [T1] — a
genuine regression added today — sat unnoticed among them.

## Class-level hardening still open

Marker-slice tests (`src.slice(src.indexOf(A), src.indexOf(B))` → `''` when a
marker vanishes, and every assertion passes) live in
`demigod-startup-atlas-web.test.mjs:198` and
`demigod-dashboard-events-native-invite.test.mjs:9,10,11,159`. **All four verified
non-empty today** — hardening, not a live bug. One shared `sliceBetween()` that
throws on a missing marker fixes the class.
