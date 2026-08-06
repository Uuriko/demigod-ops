# Loop iteration N — a real selftest-guard violation

## State

```
lock     FREE
suite    549 tests · 547 pass · 2 fail
           ✖ canonical command and registry surfaces stay consolidated
           ✖ no module runs its selftest merely because it was imported
```

## Triage of the two reds

**`canonical command and registry surfaces` — not mine, and not to be touched.**
The expected ID list is missing `axe-routes`, `blog-sync`, `button-audit` and
others that now exist in the registry. Another agent is mid-change: they have
registered new tools and the test's frozen list has not caught up. Editing either
side while they are working is how the clobbering earlier today happened.

**`no module runs its selftest merely because it was imported` — REAL, and fixable.**
The offender is `demigod-button-audit.mjs:25`:

```js
if (process.argv.includes('--selftest')) {
  ...
  console.log(JSON.stringify({ ok: true, selftest: 'button-audit-404' }));
```

This is not gated on `isMain`. Any module that imports `demigod-button-audit.mjs`
inside a process whose own argv contains `--selftest` will run button-audit's
selftest as a side effect of the import — and, per the guard's own message,
"an importer inherits a silent exit(0)".

That is exactly the failure class this session has been about: a module that
appears to have run its own checks when it actually ran someone else's, or exits
zero for a reason the caller never intended. `demigod-verify-all.mjs --selftest`
is precisely the shape of caller that would trip it.

The guard is well built — it enumerates every non-test `.mjs` in the tree and
asserts `offenders` is empty, with `assert.ok(files.length > 50)` first so an
empty read cannot vacuously pass. It is right and the code is wrong.

## Task 1 — fix it with the pattern the codebase already uses

`isMain` is the established idiom here:

```js
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
```

It appears in `demigod-hn-hiring.mjs`, `demigod-public-roles.mjs`,
`demigod-x-hiring.mjs`, `demigod-roles-pipeline.mjs` and others. Read one of them
first and match it exactly — do not invent a variant. `demigod-button-audit.mjs`
may already compute `isMain` for another purpose; if so, reuse it rather than
adding a second.

The change must not alter behaviour when the file **is** run directly:
`node demigod-button-audit.mjs --selftest` must still run the selftest and print
`{"ok":true,"selftest":"button-audit-404"}`.

## Task 2 — prove both directions

- `node demigod-button-audit.mjs --selftest` → still passes, same output.
- Importing the module with `--selftest` in argv must **not** run it. Construct
  that case explicitly:
  `node --input-type=module -e "import('./demigod-button-audit.mjs')" --selftest`
  or an equivalent that puts `--selftest` in `process.argv`. Before the fix it
  should print the selftest line; after, silence.
  **Run the before case first**, on the unmodified file, so the proof is real
  rather than asserted.
- `node --test demigod-selftest-guard.test.mjs` → green.

## Task 3 — check for latent siblings

The guard reports one offender today, but it only catches the exact shape it
looks for. Read `unguardedSelftestLines()` in the guard and establish what it
matches. If it only catches `process.argv.includes('--selftest')`, then variants
like `process.argv[2] === '--selftest'` or `argv.some(...)` would slip past.

If such variants exist in the tree, that is a finding worth reporting even if the
guard stays green — an honest note that the check is narrower than its name.
Do not widen the guard speculatively; widening it while another agent is editing
the registry surface risks a second red they did not cause.

## Constraints

- Do not touch `demigod-dashboard-clean-ui.test.mjs` or the tools registry.
  Another agent is mid-change there.
- The fix is in a non-foot-core file, so no lock is needed — but re-check before
  editing in case that changes.
- Prove the before state, not just the after. Three times this session I have
  reported a fix working when I had only observed the after.
- Suite must end at 548/549 — the registry red is expected to remain.
