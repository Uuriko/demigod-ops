---
status: working
owner: claude
created: 2026-08-11
---

# Who watches the watchers — an audit of the Dasha gates

Every other audit this session asked whether the *site* is correct. This one asks whether the things
that answer that question can be trusted. Method: reachability analysis, a scan for assertions that
cannot discriminate, a scan for swallowed failures, and — where it could be done safely — **mutation
testing**: break the thing a gate exists to protect, on a copy, and see whether the gate notices.

The answer, in one line: **the watchers consistently check *presence* and *self-consistency*, and
consistently fail to check *absence* and *correctness*.** Seven concrete instances below, three of
them found by this audit and four already fixed earlier today by the same pattern.

---

## W1 · The mint gate cannot detect a mint substitution — proven

`dasha-desk/dasha-mint-consistency.test.mjs` is the gate whose name promises the site's
highest-stakes invariant. It does this:

```js
const cfg  = JSON.parse(read('config/dasha.json'));
const mint = cfg.mint;                              // ← the value under test
assert.match(mint, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/); // ← "looks like an address"
assert.ok(body.includes(mint));                      // ← does the site agree with the config?
```

It takes the mint **from the artifact it is auditing** and then checks the artifact agrees with
itself. Any base58 string 32–44 chars passes the shape check.

**Mutation proof.** On a throwaway copy, I replaced the mint with an unrelated address across
`config/dasha.json`, `src/body.html` and `src/app.js`:

```
baseline copy                     → dasha-mint-consistency: PASS
after full mint substitution      → dasha-mint-consistency: PASS   (exit 0)
```

The gate reports success on a site that now points every buyer at a different token.

Second defect in the same file: the "no divergent mint" loop matches `/53uxQtB9[A-Za-z0-9]+/` — the
current mint's own prefix. Substitute the mint entirely and that regex matches nothing, so the loop
body never runs and the check is vacuous.

**Severity is bounded, and I want to be exact about why.** Twelve other gates pin the literal mint
as a constant — including `dasha-ship.mjs`'s fast gate (`if (!html.includes(MINT)) fail(...)`) and
`dasha-live-verify.mjs`. A substitution in `src/body.html` would be caught there. And nothing
consumes `dasha-desk/config/dasha.json` at all — no build step, no runtime read — so the file this
gate validates is dead.

So the real harm is not a live exploit path; it is **false assurance**. A reader scanning gate names
sees "mint consistency: PASS" and concludes the mint is verified. It is not. The gate is also an
orphan (W3), so it does not even run.

- **Fix:** pin the expected mint as a literal in the test and assert the config equals it, the way
  the other twelve gates do. Then delete `config/dasha.json` or give it a consumer — a config
  nothing reads, guarded by a test nothing runs, is two kinds of dead.

## W2 · The command `CLAUDE.md` calls "truth" cannot fail

`CLAUDE.md`, `AGENTS.md`, `DASHA-RULES.md` and `package.json`'s `dasha:verify:live` all designate
`node dasha-live-verify.mjs` as Dasha's source of truth. Measured just now against live:

```
$ node dasha-live-verify.mjs ; echo $?
ok = False | shipLag = ['inkuPop-apple-touch'] | warnings = ['inkuPop 2020 template apple-touch still in live HTML']
EXIT CODE = 0
```

It correctly detects a real live defect, prints `ok: false`, and **exits 0**. `DASHA_LIVE_STRICT=1`
does exit 1 — but **not one documented invocation sets it**. Every call site in the docs and in
`package.json` runs the advisory mode.

Any `node dasha-live-verify.mjs && <next step>` proceeds on failure. The truth command's ability to
say no is opt-in, and nothing opts in.

- **Fix:** make a detected `shipLag` exit non-zero by default and give the advisory mode a flag, or
  set `DASHA_LIVE_STRICT=1` in `dasha:verify:live`. The detection logic is already right — only its
  exit status disagrees with it.

## W3 · Seven gates are reachable from nothing

Not referenced by any npm script and not invoked by the ship gate:

```
dasha-forum.test.mjs                      ← mine, written today, never wired
dasha-relay-lab.test.mjs
dasha-remix-pack.test.mjs
dasha-social-card.test.mjs
dasha-studio-static.test.mjs              ← expected: it is a publish source, see below
dasha-desk/dasha-mint-consistency.test.mjs ← the W1 gate
dasha-desk/dasha-oss-docs.test.mjs
```

`dasha-studio-static.test.mjs` is a false positive — it is the source that
`dasha-studio-publish.mjs:97` copies out to `dasha-desk/studio/studio.test.mjs`, where it runs and
passes. The other six are simply unwired. I include my own `dasha-forum.test.mjs` because writing a
gate and not wiring it is precisely the failure this section is about.

## W4 · One swallowed failure worth naming

`dasha-discovery.test.mjs:65` parses JSON-LD blocks inside `try { JSON.parse(raw)['@type'] } catch`.
A malformed structured-data block is swallowed rather than failing the discovery gate — the exact
class of defect that gate exists to catch. (A broader scan for swallowed failures returned mostly
false positives from `dasha-lobby-static-gen.mjs`, which is generated client JS, not a gate.)

---

## The four already fixed today — same pattern, listed as evidence

| Watcher | How it failed | Shape |
|---|---|---|
| `dasha-surfaces.test.mjs` | Named owner files and never `stat`ed them; listed `/rally` → a deleted file while reporting **0 failures** | claim never checked against reality |
| `dasha-live-verify.mjs` | SRI pin chosen by a `.find()` whose clauses were trivially true for every candidate; then by a window that swallowed a neighbour's pin. **Wrong twice before it was right** | predicate that cannot discriminate |
| `dasha-live.test.mjs` | Asserted the correct touch icon with `.some()` — "is ours present" — so a stale 2020 webclip sitting beside it was invisible | presence checked, absence never |
| `dasha-contrast.test.mjs` | Measured through a first-visit modal's dimming scrim, producing **96 phantom findings**; its own 8:1 self-check passed because the modal's own text was undimmed | instrument unvalidated against its environment |

Four of six real defects in the Wave 1 UX audit were invisible to every gate that runs, because the
only browser gate that visits `/dasha` and `/lobby` is `dasha-contrast.test.mjs`, and the wired npm
script passes `--local`, which covers home and Studio only.

---

## What this says about the system

The gates are unusually well-written where they assert — the copy-regression suite is thorough and
its comments record real incidents. The failure is structural and consistent:

1. **Self-reference.** W1 validates the site against the site. A gate must compare against something
   it cannot itself be talked out of — a pinned literal, an external fetch, a hash.
2. **Presence over absence.** `.some()` proves the right thing is there; it never proves the wrong
   thing is gone. Both webclip and mint defects are this shape.
3. **Silence read as success.** An unwired gate, an advisory exit code and a swallowed exception all
   produce the same output as a pass. Nothing distinguishes "checked and fine" from "never ran".
4. **Instruments unvalidated.** The contrast tool had a self-check and still produced 96 phantoms,
   because the self-check tested the wrong property.

The cheapest structural fix is (3): make silence impossible. A runner that enumerates every
`dasha-*.test.mjs`, runs it, and reports `ran / passed / skipped / unreachable` would have caught
W3 and W1's orphan status on the day each was introduced, and costs about thirty lines.
