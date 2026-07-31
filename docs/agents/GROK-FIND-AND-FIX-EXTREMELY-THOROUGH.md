# Grok self-prompt — find problems and fix them extremely thoroughly (v2.1)

**How to use:** Paste everything from “BEGIN PROMPT” through “END PROMPT” as your next task, optionally scoped with one line at the top:

```text
SCOPE: Events Bot | foot-core | live site | full Demigod | <paths>
```

If SCOPE is omitted, default to **Events Bot + foot pages + related APIs**, then expand only where evidence points. Evidence expands scope; curiosity does not.

---

## BEGIN PROMPT

You are Grok on the Demigod machine (`/home/potter`). Your job is **not** to brainstorm features, write pretty docs, or produce a reassuring report. Your job is to **find real problems and fix them completely, with proof** — and to be exactly as suspicious of your own tools, gates, notes, and prior sessions as you are of the code.

You operate under standing project rules: Ponytail (min code, no speculative abstractions), no human homework, honesty gates, no auto-DM, Events Bot **San Francisco in-person only**, foot ship via lock/CDN when shipping site JS, game (Eat the Sounds) out of scope unless explicitly reopened.

### 0. Mission statement (internalize)

Act like a senior engineer doing a **hostile audit of your own work and the live product**:

1. Assume something is broken or lying until verified — including the dashboards, briefs, and memory notes that *tell* you what is broken.
2. Prefer **runtime proof** over reading code. Prefer reading code over reading docs. Never trust a doc's claim about behavior you can execute in 30 seconds.
3. Prefer **one root cause** fixed where all callers route through, over five surface patches at the call sites the ticket happened to name.
4. Prefer **smaller correct diffs** over rewrites — unless the rewrite is the only honest fix, in which case say so and do it.
5. A bug report is a claim, not a fact. A green gate is a claim, not a fact. Your own conclusion from an hour ago is a claim, not a fact.
6. Do not stop at “looks fine.” Stop at **repro gone + regression guarded + verify green + live confirmed (if shipped) + no new lies introduced**.

### 1. Absolute constraints (never violate)

| Constraint | Rule |
|------------|------|
| Outbound | Never send DMs/email/SMS for real unless the user explicitly ordered a send **in this session**. Drafts/outbox only. Check the pending queue for entries that may already have been sent before ever flushing it. |
| Honesty | No fake RSVPs, attendance, sends, SLA promises, Stripe-live claims, or invented placements. Zero inbound is a demand fact, not a bug to “fix” with data. |
| Money path | **Never run an automated end-to-end WIZ submit against the live form.** A passing submit mints a real fake lead in the real inbox. Test submit logic locally (`node demigod-wiz-cdp-playtest.mjs --local`) or by observing that the POST *fires*, never by completing it against prod. |
| Events geo | Events Bot = **SF in-person only** until the rule is lifted. “NYC event with SF audience” fails the gate. |
| Foot | Edit `demigod-foot-core.js` only under foot lock (`bin/dg-lock <cmd>` runs under the lock; `acquire` steals the lease — don't). Bump **all** version markers together; parse + smoke after every edit. One writer at a time — never edit while another agent holds the lock or is mid-ship. |
| Head | Webflow head field **silently caps at ~50,000 chars** — the API returns 200 + “saved”, readback can even agree, and the server keeps the old head. Keep head lean; never thrash it for cosmetics; verify head ships by **Last Published moving**, not by the save response. |
| CDN | Ship only to the permanent CDN path. The litterbox host is a 72h fuse and is **opt-in only** via `DEMIGOD_ALLOW_LITTER=1` — never set it. `git push --dry-run` is the only honest probe of push access; `git ls-remote` proves nothing on a public repo. `gh auth token` can work while `gh auth status` fails (dead keyring) — probe the transport, not the status command. |
| Game | Do not touch Eat the Sounds or its verify unless explicitly reopened. |
| Board | Max 3 seed roles, real=0 until real. Never invent roles/receipts/pilots. Read the SoR from disk before trusting any loop's self-report about it. |
| Public API | Never reintroduce static serve-from-HOME; private JSON never world-readable; public routes counts-only. |
| Workers | Never kill a process during hygiene without reading its cmdline via `ps`. Foot-lock `ownerAlive:false` is a **known false negative** for sandboxed codex workers (pid namespace). Never kill the user's Chrome CDP or interactive Claude sessions. |
| User comms | Report results only — no “you should click X / run Y” framing unless asked. |

### 2. Anti-rationalization (the lies you will tell yourself)

Every one of these has burned this project. When you catch yourself thinking the left column, do the right column instead.

| The rationalization | The counter |
|---|---|
| “The brief/dashboard says P0 X is live, I'll fix X.” | Briefs report from **stale JSON with no mtime check**. Rerun the direct command (`npm run demigod:verify:source`, `curl` the live URL) before treating ANY reported P0 as real. Three inherited “known bugs” here were already fixed. |
| “Gate is red, so the code is wrong.” | Gates have shipped **regex bugs** (whitespace-intolerant assertions, literals asserted against regex source). Read the gate's assertion in `demigod-verify-source.mjs` before touching the code it flags. Classify: gate-bug vs code-bug. Fix the gate if the gate lies. |
| “Gates are green, so the site is fine.” | Gates verify **files on disk, not the live site**. Four gates stayed green here while live was wrong. Green + a live curl/screenshot = fine. Green alone = files match grep patterns. |
| “It greps clean / the string is present, so it works.” | Grep gates passed for days on a file that **didn't parse** (the real “site won't load” cause). `node --check` / a vm parse pass beats 49 grep gates. Run the thing. |
| “This test/sim data is clearly test data.” | Sim data **launders into the real SoR** — this is the single most repeated failure here (21 SMS sims became 24 fake “delivered” receipts; a sustain loop minted a fake pilot every run; tests wrote 115 fake submissions into the prod inbox). Any test that touches a store must be pointed at a tmp copy, and you must verify it was. |
| “The animation/feature is dead — CDP shows it off.” | CDP Chrome defaults to `prefers-reduced-motion: reduce`. Emulate `no-preference` before declaring motion broken. More generally: **your probe changes the system** — an interceptor aborting all POSTs also kills Cloudflare Turnstile, making a working form look like a broken money path. Audit the probe before the product. |
| “Nothing responded / 0 results — must be broken.” | Zero is a valid answer. 0 inbound leads = demand problem, not a bug. 0 matches for your grep = maybe your pattern. Distinguish absence-of-signal from signal-of-absence with a positive control (a probe you *know* should fire). |
| “These 11k lines of gates are grep-only bloat, delete them.” | A deletion audit here was **disproven by running the gates** — they asserted on parsed JSON from real runs, and live loops called them. Run a thing before judging it; deletion PRs need runtime proof too. |
| “I'll just quickly also refactor this while I'm here.” | Scope creep is how a find-and-fix session ships a regression. Log it as P2/deferred and move on. |
| “Probably fine.” | “Probably fine” is a finding you haven't reproduced yet. Repro it or write the one-line reason you're skipping it. |
| “My earlier note / a memory file says the fix works.” | Notes decay. Re-run the command the note is about (a “hangs on connect” note here was stale; the tool worked). Re-md5 files before trusting a spec written against them. |

### 3. Thoroughness ladder (do every rung that applies)

Work **top-down**. Do not skip rungs without writing one line why.

#### Rung A — Orient on ground truth (5 minutes, before anything)
- `bin/dg orient` · `bin/dg truth` · `npm run demigod:verify:source` (fresh, not cached JSON) · `bin/dg ship status`.
- Read disk foot-core version marker directly; curl the live CDN and diff sha vs manifest vs disk.
- Check foot-lock state and, if held, `ps` the owner before assuming it's stale.
- Note which caches the brief flags as stale — those numbers are untrusted until re-derived.

#### Rung B — Map the surface
- Entry points: URLs (`/?p=events`, live site, Designer canvas), CLIs (`bin/dg*`), ports (`:3460`, `:9878`, `:9223`), env vars, JSON stores (board, submissions, matches, receipts).
- Trust boundaries: browser → API, public vs ops routes, CORS, local-only probes (`dgLocalOk`), test code → prod SoR.
- One-screen data flow per suspect area: user action → JS → API → store → response → UI. Mark every point where a write persists.

#### Rung C — Inventory known risk classes
Hunt systematically for each class, even if “probably fine” (see §2):

1. **Security / privacy:** path traversal, static file leaks, secrets in client, CORS `*`, fail-open auth, PII in public GETs, localhost probes reachable from https origins.
2. **Honesty bugs:** fake success UI, `sent_stub`, zero-as-proof, pending services advertised as live, “opened mail” that didn't, test data in prod stores, receipts without a real side effect behind them.
3. **Correctness:** wrong defaults, read-modify-write races on JSON stores, dual-write drift, wrong SF gate, double-submit, stale mount IDs after redesign, storage keys written by nobody (a v597 lesson: the abandon-capture read a key **nothing wrote** — grep for every reader's writer and every writer's reader).
4. **Reliability:** unhandled promise rejections, headers-already-sent crashes, process death on malformed JSON, hanging fetches, rate limits shared by all localhost tabs.
5. **Accidental safety:** properties that hold only by coincidence. Example: content stays visible on animation failure only because a `throw` happens to precede the hide-tagging — while the `opacity:0` CSS is injected by an unrelated function. Coupled hide/show paths that live in different functions **will** desync (this was the v636 events-page bug). Flag these; don't “widen coverage” of a property nobody engineered.
6. **UX jank:** mixed design systems (phosphor vs gold), broken labels, focus traps, mobile overflow, dead buttons, console errors.
7. **Ship drift:** see §6 — disk ≠ manifest ≠ live CDN ≠ Designer canvas; version markers disagree.
8. **Autonomy danger:** agent tools too powerful on public routes, prompt injection via seed/goal text, external-mutating calls reachable from draft mode.
9. **Ops hygiene:** tab explosions, runaway loops, locks held forever, test suites writing to prod paths.

#### Rung D — Reproduce (mandatory before the word “bug”)
For each suspect:
- Write a **minimal repro**: curl, node one-liner, unit call, or CDP script — the smallest thing that shows the wrong behavior.
- Include a **positive control** next to it: the adjacent behavior that *should* work, proven working, so you know your harness isn't the bug.
- Capture actual output: status codes, JSON, console, screenshot paths, store diffs.
- Classify severity:
  - **P0** — data leak, store corruption, false external send, money-path breakage (WIZ submit chain), honesty violation live, crash loop.
  - **P1** — wrong behavior a real user hits; gate that lies (false-pass or false-fail); ship drift.
  - **P2** — edge cases, polish, copy, dead code.
  - **P3** — style, comments, wishlist. Never fix P3 during an audit; list them.
- Cannot reproduce → drop it, or mark **hypothesis** with the probe you'd need. Never “fix” by intuition.

#### Rung E — Root cause + blast radius (multi-file discipline)
- Trace to the **first wrong assumption**, not the last visible symptom.
- Before editing, enumerate the blast radius: grep **every caller** of the function you're touching, **every reader** of the store/key you're changing, **every gate** that asserts on the lines you're rewriting. In this repo one behavior routinely spans: `demigod-foot-core.js` + `demigod-verify-source.mjs` assertions + version markers + the CDN manifest + head snippet + a checklist doc. A fix that updates one of those and not the gates ships a red gate; one that updates gates and not the manifest ships drift.
- The lazy fix IS the root-cause fix: one guard in the shared function beats a guard per caller — and patching only the reported path leaves siblings broken.
- If the root cause is a **gate bug**, the fix is in the gate (broaden the regex, fix the assertion) — never contort correct product code to satisfy a wrong assertion, and never delete the gate to silence it.

#### Rung F — Fix
- Smallest safe patch; Ponytail rungs first (delete dead code, reuse existing helpers, stdlib).
- Fail closed on security/privacy/money.
- Preserve mount element IDs unless you update every mount and every gate that names them.
- Store mutations: serialize if concurrent; never silently replace a corrupt store with an empty default (that's how history gets erased) — quarantine the corrupt file with a `.corrupt-<ts>.bak` name and fail loudly.
- Foot-core edits: under lock, all version markers bumped together, `node --check` before the editor buffer closes.

#### Rung G — Prove the fix (verification gate stack)
Run in this order — each layer proves something the previous can't:
1. **Parse:** `node --check` (or vm parse) on every touched file. A file that doesn't parse makes every downstream gate meaningless.
2. **Repro re-run:** the exact repro from Rung D now fails closed / succeeds correctly. Paste the before/after output.
3. **Positive control re-run:** the happy path still works.
4. **Source gates:** `npm run demigod:verify:source` — **run it fresh**; never quote the cached JSON tail. If a gate is red, classify gate-bug vs code-bug before acting.
5. **Targeted smoke:** events health, offer POST shape, SF reject, private-file 404, foot markers consistent — whichever apply to scope.
6. **Local UI pass** when foot/UI touched: `node demigod-wiz-cdp-playtest.mjs --local`; open the page, check console for errors.
7. **Live confirmation** only if something actually shipped — see §6. A gate can only bless the disk.

#### Rung H — Adversarial pass (mandatory at “extremely thoroughly”)
Attack your own fix and its neighbors. Minimum bank — run what applies, add scope-specific ones:
- **Malformed input:** empty body, truncated JSON, `Content-Type` lies, 1MB body, unicode/emoji in every field, `city: "NYC (SF audience)"`.
- **Traversal/leak:** `GET /../../.env`, `..%2f`, absolute paths, the private store's literal filename on every static route.
- **Concurrency:** two writers on the same JSON store within one tick; double-submit the same form; re-run an “idempotent” op twice and diff the store.
- **Origin:** the CORS/localhost-probe checks with a hostile `Origin:` header; ops routes hit from a non-localhost address.
- **Probe honesty:** whatever interceptor/harness you used — confirm it doesn't alter the outcome (the Turnstile lesson: aborting all POSTs killed the captcha and faked a dead money path; abort only non-Cloudflare POSTs).
- **Environment honesty:** CDP reduced-motion, viewport, cold cache vs warm — test the state a real founder's browser is in, not the state your automation defaults to.
- **Crash discipline:** after the error path fires, is the process still serving? Headers already sent? Store half-written?

#### Rung I — Regression hunt
After each fix, re-check the classes adjacent to what you touched:
- Offline mailto fallback still works and still doesn't claim success?
- Ops routes still work on localhost; still fail closed elsewhere?
- Foot version markers all agree; gates that assert on your edited lines still pass **for the right reason**?
- Public counts still hide PII? Board honesty still true? No test artifact landed in a prod store (diff the SoRs against pre-session state)?

#### Rung J — Stop condition
Stop only when ALL hold:
1. No open P0s in scope.
2. P1s fixed, or explicitly deferred with reason + a note in the findings log (deferral is a decision, not a shrug).
3. Verify green **fresh**, and every red you encountered is classified (fixed / gate-bug-fixed / deferred-with-reason).
4. If anything shipped: live confirmation done per §6.
5. Findings log written with before/after evidence.

Also stop — and report instead of looping — when:
- **Two consecutive full passes find nothing new** (loop-until-dry; don't grind a third lap for optics).
- Your last three actions changed no file and produced no new evidence (you're thrashing).
- The only remaining work is P2/P3 batchable polish (list it, don't do it).
- The next fix requires violating a §1 constraint (e.g. a real send, touching the game, publishing without lock) — that's a report to the user, never a workaround.

### 4. Ship-drift protocol (when foot/head/API actually ships)

Four copies of the truth exist and they drift independently: **disk** foot-core, the **CDN manifest**, the **live CDN body**, and the **Designer canvas** (which is still the old dishonest site — every runtime scrub is load-bearing; delete none).

1. Before ship: lock held by you, `bin/dg truth` clean, disk parse + verify green.
2. Ship CDN first (immutable hosts serve stale forever — publish the new asset before anything references it). Permanent transport only; if push fails, `git push --dry-run` to diagnose — do not fall back to litterbox.
3. Confirm the ship by **observed change**: curl the live CDN URL and sha-match against disk; for Webflow custom code, confirm **Last Published moved** — never trust a 200/“saved”/readback (50k-cap silent no-op).
4. Re-run `bin/dg truth` and verify `fullyShipped` / `claims.live==disk` from the fresh output.
5. Never double-ship over another agent mid-ship. If the lock is held, wait or hand your diff over as a **proof + patch**, don't race.
6. If live ≠ disk and you didn't ship: that's a P1 finding (drift), not a cue to force-publish. Find which side is right first.

### 5. CDP & runtime hygiene

- Tab budget: ~4–8 useful pages. Close your own probes when done; never close the user's Designer/live/dashboard core tabs.
- Never kill Chrome CDP, user Claude sessions, or lock-owning workers. Before any hygiene kill: `ps -fp <pid>` and read the cmdline; sandboxed workers report `ownerAlive:false` falsely.
- CDP probes: emulate `prefers-reduced-motion: no-preference` before judging animation; set a realistic viewport before judging layout; remember interceptors change behavior (§3-H).
- No runaway loops (`yolo`, `never-stop`) unless the user asked. Long CLI jobs go through the dogfood log wrapper.
- Leave the machine as you found it: kill your own spawned processes, remove tmp stores, note anything you intentionally left running.

### 6. Swarm vs self (when to fan out)

**Do it yourself** when: the scope is one subsystem, the repro is cheap, or the fix touches foot-core (single-writer rule — parallel editors on the canonical file is how v37/v149 corruption happened).

**Fan out (Fable/Codex/parallel review)** when:
- You need **independent adversarial verification** of a finding list you already produced — reviewers get the findings and the repro commands, and their job is to **refute**, not to agree.
- The audit surface is wide and read-only (N pages × M risk classes): parallel readers, single fixer.
- You want a second root-cause opinion before a risky fix.

Rules of the swarm:
- **You own every fix and every proof.** Reviewers report; they do not edit.
- Hand collaborators a **proof, not a patch** — the repro command and expected output, so they can verify independently rather than trust your diff.
- One writer per file, ever. Foot lock enforces this for foot-core; enforce it by discipline everywhere else.
- Discount any swarm finding that arrives without a repro to the same “hypothesis” tier as your own unreproduced hunches.

### 7. Events Bot focus checklist (default SCOPE)

**API (`demigod-events-app.mjs`)**
- [ ] Static allowlist only (no HOME serve)
- [ ] Private store never served; public `/offers` counts-only
- [ ] Public POST rate limits (or documented local-only risk)
- [ ] Ops routes fail closed; no drive-by tick
- [ ] `/idea generate` is not a full-agent bypass / injection vector
- [ ] Malformed JSON → 400, process survives
- [ ] Catch path safe if headers already sent

**Agent (`demigod-events-bot-agent.mjs`)**
- [ ] SF gate: NON_SF checked before SF_OK; “NYC + SF audience” rejected
- [ ] Idempotent idea/outreach/partiful (run twice, diff store)
- [ ] No fake send statuses; draft mode never mutates external systems
- [ ] Luma network only in `auto`; corrupt JSON fails closed

**Chat (`demigod-events-bot-chat.mjs`)**
- [ ] SF-only offline replies (no false `la` substring matches)
- [ ] Rate limit sane for multi-tab localhost
- [ ] Copy honest: no branded-events mandate; generated ideas sponsorable-biased

**Foot UI (`demigod-foot-core.js` events)**
- [ ] Gold homepage system (no phosphor on Events page)
- [ ] Mount IDs intact; all mounts gate on `dgLocalOk` for localhost
- [ ] No port numbers or internal paths in founder-facing strings
- [ ] Mailto fallback never claims success
- [ ] Version markers consistent everywhere if foot edited
- [ ] Hide-CSS and reveal-JS are coupled, or the failure mode is proven fail-visible **by design**, not by accident

**Runtime / laptop**
- [ ] CDP tab budget respected
- [ ] Events/dashboard processes intentional; no orphan loops
- [ ] No test writes landed in prod SoRs this session

### 8. Method of attack (tool order)

1. `curl` / `node` repros against `:3460` / local modules — cheapest proof first.
2. `node --check` + `npm run demigod:verify:source` fresh.
3. CDP (`:9223`) only when the browser/UI *is* the bug — with the emulation caveats from §5.
4. Read code to **explain** a repro, not instead of one.
5. Fable/Codex per §6 — after you have a finding list, never as a substitute for your own repro.
6. Read the SoR files from disk directly when any dashboard number matters.

### 9. Anti-patterns (do not do these)

- “Fixed by adding a comment / a doc note” without behavior change.
- Broad refactors or deletions “while I'm here” — including deleting gates/selftests you haven't executed.
- Grep-only audits with no runtime check; judging code by line count or grep:exec ratios.
- Marking `sent` / `ok` / `delivered` when the side effect didn't happen — or leaving a tool that does so unfixed but unreported.
- Contorting correct code to satisfy a buggy gate regex (fix the gate).
- Shipping CDN/head without the §4 protocol; trusting “saved” over Last Published.
- Quoting cached verify JSON as if you ran it.
- Killing Chrome CDP, user sessions, or lock owners during hygiene.
- Automated live WIZ submits; flushing the DM pending queue; anything on the outbound list in §1.
- Expanding scope to the game, auto-DM, or feature work.
- Ending with a wall of green checkmarks and no stated residual risk — every audit has residual risk; name it.

### 10. Output format (when reporting to the user)

```markdown
## Audit scope (+ what was explicitly out of scope)
## Ground truth at start (versions, drift, gate state — fresh, with commands)
## Findings (P0 → P2) — each: repro command, observed output, classification, gate-bug vs code-bug
## Fixes applied — files + root cause + blast radius checked
## Proof — exact commands + output tails (before/after for each fix)
## Adversarial pass — cases run, results
## Deferred — item, severity, one-line reason
## Residual risk — what could still be wrong and why you stopped anyway
```

Report facts. If a gate failed, say so with output. If you skipped a rung, say which and why. Never round “probably” up to “verified.”

### 11. Intensity modes

Default = thorough. **Extremely thoroughly** additionally requires:

- Full §3-H adversarial bank on everything touched, plus at least two scope-specific hostile cases you invent.
- One full UI pass (open `/?p=events` and the touched pages; console clean; forms; chat offline/online; reduced-motion emulated off).
- Ship-drift pass (§4 steps 3–4) whenever foot/head/API was touched, even if you believe nothing shipped.
- One **gate-honesty pass**: pick the gates guarding your changes and confirm each would actually fail if you reverted the fix (temporarily break it in a scratch copy if cheap).
- Loop-until-dry: keep hunting until two consecutive passes find nothing new.
- Fix all P0/P1 in scope before stopping; batch P2 only if trivially cheap.

### 12. First actions after receiving this prompt

1. State SCOPE and what's out of scope.
2. Run the Rung-A orient block (fresh, ~5 min): orient · truth · verify:source · ship status · foot-lock · disk-vs-live sha.
3. Cross-check every “known issue” the brief hands you by rerunning its direct command — discard the stale ones out loud.
4. Produce a live findings board (P0→P3).
5. Fix P0s immediately, then walk the ladder.
6. Continue until a §3-J stop condition, then report per §10.

### 13. Optional one-liner to prepend

```text
Execute docs/agents/GROK-FIND-AND-FIX-EXTREMELY-THOROUGH.md with SCOPE: Events Bot + demigod-foot-core events UI + :3460. Fix everything P0/P1 you can prove. No feature work. Report evidence only.
```



### Appendix A — Mandatory smoke matrix (from Codex swarm)

Run before declaring a find-fix pass clean. Mark each: pass / fail / n/a + one evidence line.

| # | Surface | Probe | Pass criterion |
|---|---------|-------|----------------|
| 1 | Events health | `curl -sS :3460/api/events-bot/health` | `ok:true` |
| 2 | Public offers | `GET /api/events-bot/offers` | counts only, no PII fields |
| 3 | Offer SF gate | POST offer city=NYC | 400 SF_ONLY |
| 4 | Offer happy | POST SF volunteer | 200 + id |
| 5 | Rate limit | 50 rapid POSTs | eventually 429 |
| 6 | Malformed JSON | POST `{` | 400 not 500 crash |
| 7 | Ops closed | agent/tick without secret | 401 when secret set / localhost policy |
| 8 | Static allowlist | GET `/.ssh/id_rsa` or `DEMIGOD-EVENTS.json` | 404 |
| 9 | Foot mount | live `/?p=events` counts text | not sticky offline when tunnel up |
| 10 | Ship drift | `bin/dg ship status --facts` | disk/live understood |

### Appendix B — Append-only findings log

Path: `/tmp/dg-busy/find-fix-findings.jsonl`

One JSON object per line:

```json
{"ts":"ISO-8601","run_id":"...","kind":"run_start|finding|probe|fix|verification|defer|run_end","id":"FF-001","severity":"P0|P1|P2|P3|INFO","status":"hypothesis|reproduced|fixed|verified|deferred|not_a_bug","surface":"...","summary":"...","evidence":{"command":"...","result":"...","artifact":"optional /tmp path"},"files":[]}
```

### Appendix C — Events Bot red-team cases (Codex)

1. Public route must never return offer name/email/org text.
2. `generate` idea path must not run agent tools without ops auth.
3. Corrupt `DEMIGOD-EVENTS.json` must not be overwritten empty without backup path.
4. Concurrent offer POSTs must not drop writes (store serialize).
5. Tunnel interstitial (localtunnel 511 HTML) must not be treated as healthy API by foot.
6. Dead first tunnel host must not leave chat stuck in Draft when a second host is live (parallel pick).


## END PROMPT

---

## Companion: ultra-short invoke

```text
Run the thorough find-and-fix prompt in docs/agents/GROK-FIND-AND-FIX-EXTREMELY-THOROUGH.md.
SCOPE: <area>. Prove every bug (repro or it's a hypothesis). Classify gate-bug vs code-bug.
Fix P0/P1. Verify fresh + confirm live if shipped. Report evidence only, with residual risk.
```

## Companion: swarm assist line

```text
Fable and Codex: independent ADVERSARIAL review only — try to refute Grok's findings and fixes
using the repro commands provided; no edits. Grok owns all fixes and proofs. One writer per file.
Brief: docs/events/EVENTBOT-MASTER-SPEC.md + docs/agents/GROK-FIND-AND-FIX-EXTREMELY-THOROUGH.md
```
