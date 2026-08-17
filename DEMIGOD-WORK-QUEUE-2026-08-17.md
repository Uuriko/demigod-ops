---
status: working
generated_by: claude
generated_at: 2026-08-17
---

# Demigod standing work queue — written by me, for me

This is my own prompt. I wrote it so that a session that gets compacted, interrupted, or handed to
another agent can resume without re-deriving anything. Read the protocol, take the first task whose
gate is not already green, and do it. Do not ask which one. Do not re-plan.

**Goal in force:** never stop working on trydemigod.com, Demigod the startup, and DIE — fix bugs,
add features, improve, research online where research actually decides something.

---

## Operating protocol

1. **One task at a time, top of the first unfinished wave.** Waves are ordered by what makes the
   next wave possible, not by how interesting the work is.
2. **Every task names its gate.** A task is not done until its gate is green *and* the gate would
   have been red before the change. If the gate could not have failed, the task was not finished —
   go back and make the check real.
3. **Root cause, not symptom.** Before editing a function, grep every caller. Two copies of a rule
   is the bug; one shared function is the fix. The `hiringStatusOf` extraction on 2026-08-17 is the
   pattern: two surfaces had to be told the same truth separately, and one of them was never told.
4. **Ponytail.** YAGNI → reuse → stdlib → native → one line → minimum that works. Mark deliberate
   ceilings with a `ponytail:` comment naming the upgrade path.
5. **Never publish, send, post, or move money** without explicit authorization in the *current* user
   request. Preparing and verifying is always allowed. `bin/dg ship prepare` is allowed; the publish
   step is not.
6. **Commit each finished task** with the repo's message style: a title that states the finding, a
   body that says what was measured and why the fix is shaped that way, and the Co-Authored-By
   trailer. Never bundle unrelated work into one commit.
7. **Update this file** as tasks close: strike the line, add what was learned. This file is the
   handoff. If it disagrees with a gate, the gate is right.
8. **Re-verify before trusting anything here.** Other agents write this tree. Paths, counts, and
   states in this document were true at 2026-08-17T08:00Z and are snapshots, not truth.

**Truth commands.** `bin/dg truth` · `bin/dg session` · `npm run demigod:verify:source` ·
`node demigod-verify-all.mjs` · `node demigod-die-contracts-check.mjs`.

---

## Wave 1 — make the checker able to fail (in flight)

- [x] **W1-1 Poison the §29 board-observed rule.** `demigod-die-contracts-check.poison.test.mjs`
  proves the checker's red path is reachable. The new `board-observed` fence line has no poison
  case, so nothing proves it can fail.
  *Do:* add a test that stubs a kernel whose `hiringStatusOf` returns `board_observed` for a date
  with no count, and asserts §29 reports a violation.
  *Done when:* the poison suite fails if the executor's new branch is deleted.
  *Gate:* `node --test demigod-die-contracts-check.poison.test.mjs`

- [x] **W1-2 Wire the poison suite into `demigod-verify-all.mjs`.** It is referenced by no runner.
  A poison suite nobody runs proves nothing.
  *Gate:* `node demigod-verify-all.mjs` names it in the run list.

- [x] **W1-3 Full `verify-all` run after the kernel/packet/enrich changes.** The two new entries
  (`demigod-role-mission-kernel.test.mjs`, `demigod-hiring-shape.mjs --selftest`) have never run
  inside it.
  *Done when:* the whole suite is green, or every failure is triaged into a task below.

- [x] **W1-4 Gate-integrity check for `verify-all`.** `verify-source` asserts its checks actually
  ran (`checks.length > 0`); `verify-all` does not. A suite that silently runs zero entries reports
  success.
  *Gate:* deleting the run list makes `verify-all` fail, not pass.

---

## Wave 2 — the map producer tells the truth about its own reads

The 2026-08-17 finding: `openRolesAt` was stamped on rows nobody read a board for, and the packet
called them `board_observed`. Producer and consumer are both fixed; the *data* is not.

- [x] **W2-1 Count the damage in the live map.** How many rows in `DEMIGOD-STARTUP-MAP.json` carry
  `openRolesAt` with no integer `openRoles`? How many carry no `lastAttempt`?
  *Do:* a one-shot read-only script or `node -e`; write the numbers into this file. No repair yet.
  *Done when:* the two counts are recorded here with the map's `generatedAt`.

- [x] **W2-2 Repair mode for the bad stamps.** `--repair-denied` is the precedent: a surgical pass
  that fixes rows without hammering 2,754 ATS boards.
  *Do:* `--repair-stamps` that drops `openRolesAt` from any row with no integer count, leaves every
  other field alone, and reports what it touched.
  *Done when:* rerunning it is a no-op, and the selftest covers both the touched and untouched row.
  *Gate:* `node demigod-startup-jobs-enrich.mjs --selftest`

- [x] **W2-3 Backfill `lastAttempt` where it is recoverable.** A row with a count and a date had a
  successful read; that is `ok` with `lastAttemptAt = openRolesAt`. A row with neither had no read
  at all and must stay null — never invent `ok`.
  *Done when:* the packet's inference path (`projectLastAttempt`) becomes dead weight for live rows
  because the producer records it, and the inference is documented as legacy-only.

- [x] **W2-4 Assert the invariant at the map level.** Add to `demigod-startup-map-data.mjs --selftest`
  (or the map integrity gate): no row may carry `openRolesAt` without an integer `openRoles`.
  *Done when:* injecting one such row fails the gate.

- [x] **W2-5 Re-run the enrich for real and diff the coverage numbers.** Expect
  `companiesWithOpenRoles` to be unchanged and the YC-link rows to lose their dates. Any other
  movement is a second bug — find it before publishing anything.

---

## Wave 3 — the 22 unwired DIE contracts

**Closed 2026-08-17: 30 enforced, 0 violated, 0 unwired of 30.** Started the day at 8 enforced,
22 unwired. Every section now has an executor and the enforced count is ratcheted at 30, so a
section falling back to prose fails the run.

Originally: `node demigod-die-contracts-check.mjs` reported 8 enforced, 22 unwired of 30. Unwired means the
section is prose no executor answers for. Wire them in dependency order; each one is its own task
and its own commit. A section whose rules cannot be expressed as a fence gets its prose rewritten
until they can — that rewrite is the work, not a detour.

- [x] **W3-1 §13 Company packet** — the packet is the most-read artifact in DIE and has the most
  recent bugs. Fence: quarantine nulls, `board_observed` needs a count, roles bound to 25, journal
  window 14 days, `shape` never a score.
- [x] **W3-2 §4 Company row** — the map row shape every producer writes and every consumer reads.
- [x] **W3-3 §1 Company identity** — one identity per company; the 10-of-14 wrong-pair finding from
  2026-08-16 belongs here as enforced rules.
- [x] **W3-4 §14 Company table** · **W3-5 §15 Company waterfall** · **W3-6 §17 Writeback preview** —
  the three surfaces that turn a packet into something a human acts on.
- [x] **W3-7 §12 Research projection entry point** · **W3-8 §16 Private memo** — private evidence
  must not leak into a shared surface; that is a fail-closed rule, so it is checkable.
- [x] **W3-9 §20 Role Mission** · **W3-10 §21 Evidence bill** · **W3-11 §22 Mutual projection** ·
  **W3-12 §23 Mission scenario**.
- [x] **W3-13 §24 / §25 / §27 / §28 candidate evidence** — assertion, correction and withdrawal,
  review-note references, workbench. Withdrawal is the one with a real-world cost if it is wrong.
- [x] **W3-14 §2 Benchmark document** · **W3-15 §3 Operational catalog** · **W3-16 §6 Frozen fields**
  · **W3-17 §7 Accepted-field policy** · **W3-18 §18 Supported command surface** ·
  **W3-19 §19 Decision rehearsal**.
- [x] **W3-20 Make the unwired count a gate.** Today it can grow silently. Pin the current number as
  a floor that may only go down; a new prose-only section fails until it is wired or the floor is
  deliberately raised in the same commit.

---

## Wave 4 — hiring data quality (the product's actual substance)

- [x] **W4-1 Audit every ATS parser for HTML entities.** Greenhouse hid half a pay range behind
  `&mdash;` and recorded the floor as the whole band. Check Lever, Ashby, Workable, Personio,
  Recruitee, SmartRecruiters for the same class of bug: entity-encoded bodies, escaped JSON, and
  currency symbols outside USD.
  *Done when:* each provider has one fixture proving a decoded read, or is documented as unable to
  carry the field at all.
- [x] **W4-2 Per-ATS capability matrix.** 166 of 471 boards are structurally silent about pay. That
  number is currently prose in a commit message. Emit it as data: provider → can carry pay, can
  carry location, can carry posting date, can carry department, with the count of live boards.
  *Done when:* one command prints the matrix and the board-pay module reads its capabilities from
  it instead of hardcoding them.
- [x] **W4-3 Posting-age honesty.** `observedLifetimeUsable` is false everywhere. Say why, once,
  where a reader sees it — a posting we first observed 40 days ago may be 400 days old.
- [x] **W4-4 Board read failures are not market cooling.** `boardsUnreadableCarriedStale` is printed
  per run and stored nowhere. Persist a small run history so a drop in open roles can be checked
  against read failures before anyone reads it as a signal.
- [ ] **W4-5 Surface `insufficient-signal` in the directory.** A company with no classified role mix
  now abstains instead of reading as a counted zero. The UI still shows nothing where it should say
  "we have not classified this board".
- [x] **W4-6 Dedupe survivorship.** `dedupeByBoard` takes `Math.max` of the group's counts. Two
  companies sharing a board is either an identity bug or a real shared ATS tenant — measure which,
  because max-of-group silently inflates one of them.
- [ ] **W4-7 Geocode the directory.** 2,754 companies at `locationPrecision:"city"` with zero
  coordinates. This blocks neighborhood pages and any map surface. Research the licensing before the
  code: which geocoder's terms allow storing coordinates for a public directory.

---

## Wave 5 — trydemigod.com defects that are live right now

Every one of these needs `bin/dg ship prepare` and an authorized publish to reach live. Prepare
them, verify them, and stop at the publish line.

- [x] **W5-1 No canonical tag on any route.** `/`, `/apply`, `/companies`, `/pricing`, `/about`.
  Canonicals are injected by `openPage()`, so they exist only after JS — crawlers on the first pass
  see none. Durable fix is per-page canonical in Webflow page settings, which is a Designer edit.
  Prepare the exact values and the verification command; do not publish.
- [ ] **W5-2 3–4 conflicting `og:description` per page.** Disk dedupe landed and needs a foot
  publish. Verify the disk state actually dedupes before queuing it.
- [x] **W5-3 Two of three homepage mailto links 404** via `/cdn-cgi/l/email-protection` with no hash
  payload. This currently fails `bin/dg ship prepare` through site-hunt, so it blocks the queue.
- [x] **W5-4 CDN assets load without `integrity=`.** `foot-latest.js` (432KB) and `head-latest.css`.
  Dasha already pins and drift-checks its client; port the pattern, including the drift gate, not
  just the attribute.
- [x] **W5-5 Zero analytics on the domain.** No measurement of any kind. Decide the smallest honest
  thing: server-side counts of route hits, not a third-party script that needs a consent banner.
  Research what a privacy-preserving first-party count costs on this stack.
- [ ] **W5-6 Publish lag.** Disk v1103 vs live v1101, 64h and growing, with `sibling asset drift
  NEEDS REVIEW: atlas, mapData`. Resolve the drift review so the queue is publishable the moment
  authorization exists.
- [ ] **W5-7 The Lighthouse mobile budget.** Last controlled run was 87; the enforced budget is 80.
  One run, no score-shopping, and never on a busy host — the harness refuses above 2× load per CPU
  for a reason.

---

## Wave 6 — the startup, not the site

- [ ] **W6-1 Posting-age index needs a host page.** `demigod-posting-age-index.mjs` emits a fragment
  nothing renders. `/startups` already ranks and carries the dataset. Decide named vs aggregate
  first — naming companies with day counts is a different product and invites disputes.
- [x] **W6-2 Essay pipeline.** Four essays, no RSS, no JSON-LD, no OG per essay. Original data tables
  and quarterly-refreshed pages are the two formats that actually get cited; this is the cheapest
  distribution the company has.
- [ ] **W6-3 A real submit endpoint.** WIZ answers go to the Webflow mailer and get re-parsed out of
  Gmail dumps by `demigod-gmail-forms.mjs`. That is a data pipeline held together by an inbox.
- [ ] **W6-4 Consent receipt issuer.** `demigod-taste-prior.mjs` consumes an opt-in receipt that
  nothing issues. Either issue it or delete the consumer.
- [x] **W6-5 Demand queue triage.** 1 warm lead overdue by 4 days, 2 quarantined,
  `drafts.hygiene=unknown`. Make hygiene report a real value; triage the three without sending
  anything.
- [ ] **W6-6 Research: what does an SF hiring-signal directory compete with in 2026?** Not a survey —
  the question that decides work is which of our observations nobody else publishes. Write the
  finding as evidence with sources, and let it kill or confirm W6-1.
- [x] **W6-7 Research: ATS API terms.** We read seven public board APIs. Confirm for each that
  storing and republishing counts is permitted, and write the citation next to the reader. A
  directory built on a terms violation is not a directory.

---

## Wave 7 — the test estate

- [x] **W7-1 The 112 unreferenced tests.** 112 of 221 `*.test.mjs` are run by no main runner. Go file
  by file, in alphabetical order, and for each: wire it, or delete it, or record why it is
  deliberately manual. A test nobody runs is a comment that costs CI nothing and proves nothing.
- [x] **W7-2 Kill duplicate coverage as you go.** Some of the 112 will duplicate a selftest already
  in `verify-all`. Deleting those is the point of the pass, not a failure of it.
- [ ] **W7-3 Runtime budget.** If `verify-all` crosses a few minutes, split it into `fast` and
  `full` rather than letting people stop running it. Measure before splitting.

---

## Wave 8 — ponytail debt (118 markers, ~30 unique)

Each of these was a deliberate shortcut with a named ceiling. Take them only when the ceiling is
actually reached — that is what the marker is for. Check the ceiling before doing the work.

- [ ] **W8-1** `demigod-x-hiring.mjs` — CDP client duplicated ~30 lines from
  `demigod-conversion-audit.mjs`. Two copies is already the ceiling.
- [ ] **W8-2** `demigod-startup-jobs-enrich.mjs` — naive registrable-label parsing. Ceiling is a
  multi-label public suffix (`.co.uk`); check whether any live board host has one before acting.
- [ ] **W8-3** `demigod-ats-providers.mjs` — Personio XML by regex. Ceiling is a nested or
  CDATA-wrapped field.
- [ ] **W8-4** `demigod-lead-collect.mjs` — hand-maintained denylist, whack-a-mole by construction.
- [ ] **W8-5** `demigod-evidence.mjs` — unsigned chain capped at 1,000. Ceiling is 10k; measure the
  current length before writing checkpoint code.
- [ ] **W8-6** `demigod-directory-static.mjs` — 50KB Webflow footer ceiling. Measure the current
  payload against it.
- [ ] **W8-7** `demigod-matching-engine.mjs` — linear scan at 13.6k rows. Ceiling is visible review
  latency; measure before indexing.
- [ ] **W8-8** `demigod-events-app.mjs` — flat private-store list. Ceiling is submission volume.
- [ ] **W8-9** `demigod-submissions-lib.mjs` — regex PII scrub, not NER. Ceiling is a real free-text
  leak; this one is worth checking proactively because the cost of being wrong is a person's data.

---

## Wave 9 — repo and machine hygiene (do between the hard tasks)

- [ ] **W9-1** `src/` is 45 GB untracked in `$HOME`. Never `git clean -xfd` here — that wiped this
  machine on 2026-08-02. Decide keep/move/delete deliberately.
- [ ] **W9-2** `demigod-ops-23/` 111 MB and `demigod-ops-255/` — stale mirrors of this repo.
- [ ] **W9-3** `demigod-site-cdn/` — 305 files, 105 MB of historical `foot-vNNN.js`. Keep a window.
- [ ] **W9-4** `DEMIGOD-ROLE-LEDGER.json` — 12.8 MB, mode 0600, untracked, one `rm` from gone.
- [ ] **W9-5** Bus and truth receipts live in `/tmp` and die at reboot.
- [ ] **W9-6** Commit the four `systemd-user/demigod-die-*.service` units, or delete them.
- [ ] **W9-7** Untracked shipping code: `demigod-company-liveness.mjs`, `demigod-corpus-defects.mjs`,
  `demigod-die-web.mjs` + test + UI, `demigod-die-mission-store.mjs`.
- [ ] **W9-8** Push. Commits survive `git clean`; they do not survive disk loss.

---

## Closed 2026-08-17

- **W1-1** — done cf5a935 — hiringStatusComplaints takes the status function so the poison suite can hand it a broken one
- **W1-2** — done c58664e — poison suite + die-activity-shape now in verify-all
- **W1-3** — done c58664e — 95 ran, 0 failed
- **W1-4** — done c58664e — MIN_STEPS floor at 90, reports {ran, floor}
- **W2-1** — done cf5a935 — 2,917 companies; 1,068 dated; 597 dated with no count (all YC links); 0 rows carried lastAttempt, because the map was written 08-16 22:03 and the feature landed 23:52
- **W2-2** — done 04ea6a9 — --repair-stamps, 597 rows, one key each, nothing else moved
- **W2-4** — done 04ea6a9 — assertMapFloors refuses any dated row with no count; fail-capability asserted
- **W3-1** — done cd73c8a — §13 wired, 5 rules
- **W3-2** — done 5d0a77e — §4 wired, 4 rules, plus the ENFORCED_FLOOR ratchet (W3-20)
- **W3-20** — done 5d0a77e — floor at 10, only applies to our own CONTRACTS.md, proven fail-capable

**W2-3 / W2-5 closed the same evening.** The gentle enrich completed in ~38 minutes at concurrency 4
and validated the whole chain end to end:

| | before | after |
|---|---|---|
| rows | 2,917 | 2,917 |
| counted boards | 471 | 472 |
| rows dated with no count | 0 | **0** |
| rows carrying `lastAttempt` | **0** | **2,844** |
| boards carried stale (rate-limited) | — | **0** |

`lastAttempt` distribution: `ok` 472, `missing` 2,299, `error` 73. Concurrency 4 cost nothing in
lost boards, against 90 lost at 12 on 2026-08-16 — the polite value was worth the wall clock.

The kernel's live-map assertion, which read `yc:10x board_observed lastAttempt missing current
false` this morning, now reads `wd:Q16153666 board_observed lastAttempt ok current true`.

## Closed later on 2026-08-17

- **W3 entire wave** — 30 of 30 contracts enforced, 0 unwired, ratcheted at 30 (bf0b686).
- **W4-1** 691a584 — no entity bug siblings: 0 encoded titles/locations/companies in 19,307 ledger
  rows, and all pay extraction shares one decoding path. Locked with a provider x field loop.
- **W4-2** 4bedc1c — `demigod-board-pay.mjs --matrix`: Ashby 305/5,037, Greenhouse 122/5,467,
  Lever 44/419 unsupported. 427 of 471 comparable, derived rather than quoted from a commit message.
- **W4-4** cd643b1 — the Pulse published every unread board as a company that paused hiring.
  `boardsUnread` is now split out and the published sentence says so.
- **W4-6** — measured, no work needed: 0 boards are shared by more than one company in the live map
  (1,068 boards), so `dedupeByBoard`'s max-of-group never fires today. Re-measure before changing it.
- **W5-1** 04624b8 — all five routes serve no canonical until JS runs; reported at medium on every
  verify-live run with the exact route list. The fix needs a publish.
- **W5-3** — stale: `bin/dg ship prepare` is fully green including site-hunt, so the mailto 404 no
  longer blocks the queue (fixed in 6f46042).
- **Ledger silence** 90c784d — an empty role ledger reported 0 open roles instead of "not crawled".

## Closed in the evening pass, 2026-08-17

- **W7-1 / W7-2** 867a404 — all 101 unreferenced Demigod tests measured (100 passed, 19s total),
  wired; verify-all now runs 197 steps. The one failure was real: clay-website asserted foot
  bindings (`employerDepartment`, `boardUpdatedAt`) that had silently disappeared.
- **W6-7** adb2407 — primary-source ATS terms read and cited in `docs/die/ATS-SOURCE-TERMS.md`.
  Every vendor documents its API for the employer's own careers page; none authorizes third-party
  aggregation and none forbids it.
- **Opt-out** 71abc50 — the gap that research found. `DEMIGOD-DIRECTORY-OPTOUT.json`, honoured
  before any probe, deliberately separate from the misattribution denylists.
- **W5-4** 73d5817, 186f193 — SRI on both CDN assets, hashed from the bytes the CDN serves, with
  the republish-stale-pin trap closed on the stylesheet rewriter.
- **og:url** a941a94 — every route unfurls as the homepage; now a standing verify-live finding.
  Blog JSON-LD pointed at `/?p=blog`; fixed on disk for the next publish.
- **W6-2** — measured and deliberately not built: one essay is published, three are drafts. An RSS
  feed with a single item is not the cheapest distribution this company has. Revisit at three.
- **W6-5** — measured, no defect: `drafts.hygiene` reports `checked: 0, ok: null` because the queue
  is empty, which is the correct refusal to claim health from an empty set. The overdue warm inbound
  is a human judgment about a named person and is not agent work.
- **W4-6** — 0 boards shared by more than one company in the live map; the dedupe survivorship
  question does not arise today.

## The Pulse's other direction, found by running the morning's fix on real data

The paused-hiring fix stopped a failed board read publishing as a company that stopped hiring. The
mirror image is larger and was live: a board we failed to read yesterday and read today reappears in
the counts, and `startedHiring` claims a decision the company never made.

Against real history tonight the delta read **133 started**, comparing to a snapshot taken after the
rate-limited run — 340 boards then, 472 now. Almost all of that is our crawler recovering.

Fixed by recording each day's unread ids in the snapshot (the evidence exists only on the day), and
withholding the started count with a printed reason when the earlier snapshot predates the field.
What it publishes today: *"Since 2026-08-16: 1 paused, net +2,508 open roles. A started-hiring count
is withheld for this comparison."* Tomorrow's snapshot carries the field; the day after, the number
can be published honestly.

Only that one number is withheld — `paused`, the unread exclusion and the net are computed from
today's map and hold regardless. Withholding all three was the first attempt and the existing test
caught it.

## The one published essay is invisible without JavaScript

Measured on live `/blog`: the title and the one-line summary appear in the served HTML (they ride in
the JSON-LD), and **none of the 4,448 characters of body do** — zero occurrences of any phrase from
it. The blog is entirely foot-rendered: posts live in `demigod-blog-posts.json`, fan out into
`demigod-foot-core.js` as `DG_BLOG_POSTS`, and there is no CMS page per post. A crawler that does not
run scripts sees a headline and a sentence.

Deliberately not fixed by building a second static-fragment generator. The pattern that solves it
already exists — `demigod-directory-static.mjs` pre-renders a bounded, crawlable fragment for
`/startups` with a byte ceiling and a truncation disclosure — and pointing it at the blog is
mechanical. But it is a new module's worth of machinery for **one** published post, and it cannot
take effect without a publish either way.

Build it when there is more than one essay to make readable. The other three are drafts; see the
RSS note above, which reaches the same conclusion from the other direction.

## The enrich strips aging, and only one other command puts it back

Running `demigod-startup-jobs-enrich.mjs` on its own left the map with **zero** companies carrying
`agingRoles`, down from 99. Not a defect in the fix — `withoutJobEvidence` drops the aging
annotations along with the rest of the job evidence by design, and `demigod-directory-aging.mjs
--enrich-map` is what puts them back. Running the enrich outside the pipeline skips that.

The cost was silent: the public directory simply stops carrying its *"N roles across M companies were
posted 90–365 days ago (Greenhouse board date)"* line. It was caught only because
`demigod-directory-static.mjs --selftest` asserts that sentence exists — one of the 46 selftests
wired an hour earlier, which is a fair advertisement for wiring them.

Restored: 466 companies with ledger open roles, 98 with 90–365d aging. The enrich's run summary now
prints the follow-up command, because the next step is part of the result.

A reseal was enqueued by the aging run and is **left pending on purpose**: it reports
`research.green: false · no-evidence`, and forcing a reseal that its own gate says is unbacked is
the opposite of the point.

## The second sweep: 46 selftests nobody called

After the 101 orphan `*.test.mjs` files, the same question asked of `--selftest` modes found 46 more
modules whose selftest was in no runner. Measured before wiring: the whole set costs **under five
seconds**. Two were failing while nobody looked.

- **`demigod-public-comp.mjs`** — "OTE $200k–$250k" was extracted twice, once as the range and once
  as a `$200k` point band, because the dedupe key is `unit|min|max` and those are two different
  keys. The floor of a published band presented as the band — the same defect as the morning's
  Greenhouse entity bug, from the other side. `board-pay` was safe only because it takes `[0]` and
  the range happened to sort first.
- **`demigod-navigation-audit.mjs`** — needs `--selftest --local`; it had simply never been called
  correctly.
- `demigod-agent-dashboard.mjs` has no selftest at all (the flag string matched something else) and
  `demigod-verify-all.mjs` is the suite itself. Both excluded.

`demigod-foot-cdn-publish.mjs` is in the wired set deliberately: it guards the publish path, it was
changed twice tonight, and its selftest was outside the suite.

Also wired: `docs/exchange/demigod-recruiting-research-pack.test.mjs`, the one Demigod test living
outside the repo root and therefore outside every glob anyone has written to find these.

## W6-1 sharpened: the aggregate form needs no decision

`node demigod-posting-age-index.mjs --json`, run 2026-08-17, already produces a defensible original
data table: 333 SF companies with a verified public ATS board, 8,277 open roles, 4,724 with a date
attributable to the company's own ATS, **1,304 of those posted 90–365 days — 27.6%** — plus 276
evergreen roles counted separately and never folded in.

It carries its own limits, including the uncomfortable one: *"Demigod independently observed 0 of
these roles open for 90 days or more; the rest of the window rests on those ATS dates."*

This means P2 decision #15 (named companies vs aggregate) **does not block it**. The aggregate names
nobody and invites no dispute. What is left is a host page and a publish — and it cannot go in the
`/startups` footer payload, which has 31 bytes of headroom. Naming companies with day counts stays a
separate, later, and much more contentious product.

## W6-4 measured: the consent receipt has neither end

`demigod-taste-prior.mjs` is a complete, tested, fail-closed module — adversarial cases for a forged
hold and a string `proven` included — wired to nothing at either end:

- **No producer.** Nothing in the repo writes `taste-receipts.json`; the Dasha opt-in receipt it
  expects is not issued by anything.
- **No consumer.** It appears in no runner, no tools registry entry, no package script, and neither
  the matching engine nor the dashboard imports it. The only file mentioning it is itself.

It is harmless as it stands — a missing receipt projects `unknown`, never a score — but it is exactly
what §12 of CONTRACTS.md calls out: an unused, unexercised export is a second contract nobody is
verifying. Its selftest now runs in verify-all so the fail-closed property is locked while the
decision waits, and the decision is a real one: **issue the receipt from the Dasha side, or delete
the module.** Not mine to take — it spans two projects.

## What a polite enrich actually costs

Run 2026-08-17 at `DEMIGOD_ENRICH_CONCURRENCY=4` — a quarter of the default 12, chosen because one
run at 12 cost 90 Ashby boards to rate limiting on 2026-08-16 and `ATS-SOURCE-TERMS.md` argues the
absence of a published rate limit is not permission.

**Still running at 30 minutes**, which is the honest figure — an earlier draft of this note claimed
it had passed 90 and that was a misread clock, not a measurement. What is established: politeness
against ~2,900 companies over seven providers is a long job, not something to slip in beside a
verification pass, and it loads the machine enough that unrelated greps time out. The map is only
written at the end, so a killed run leaves the committed map untouched — a safe failure, and the
reason it was run this way rather than in-place.

Consequences worth keeping:
- Schedule it as its own long-running job, not alongside gates. It loads the machine enough that
  unrelated greps time out.
- `lastAttempt` therefore still does not exist on any live row (W2-3 / W2-5 stay open). The producer
  writes it correctly; no complete run has happened since the code landed.
- If a faster run is ever needed, raise concurrency deliberately and expect to pay in lost boards,
  not silently.

## Corpus defects, measured 2026-08-17

`node demigod-corpus-defects.mjs report` over 2,917 companies: **547 findings across 517 rows**,
in two kinds.

- **486 companies store an `http://` website** (239 from Wikidata, 247 from YC). Not our bug: both
  upstream sources carry the scheme that way and `safeUrl` preserves whatever it is handed rather
  than inventing one. The cost is real anyway — a public directory linking `http://` sends every
  visitor's first hop unencrypted, and it reads as a quality signal.
  **Done 2026-08-17 with evidence, not a rewrite.** `--upgrade-https` probes each site and upgrades
  only what answers on https at the same registrable host: **351 of 486 upgraded**, zero other
  fields touched on any row, 135 left as they were. Corpus findings fell 547 → 196.
  The 135 refusals each have a recorded reason — 60 answered on a genuinely different host, 32 did
  not answer, 15 timed out, 26 failed, 2 answered on http. They stay `http://` because nobody
  verified otherwise.
  The first pass refused 195 rows for `different-host` that were only `www.` canonicalisation. The
  comparison now uses `websiteHostKey`, the same one identity uses, so `www.acme.com` answering at
  `acme.com` counts as the same site while `app.acme.com` still does not.
- **34 name-disambiguator findings**, unexamined.

Not done tonight because it is 486 outbound requests and an enrich was already running; queueing
hundreds more against the same hosts is exactly the impoliteness `ATS-SOURCE-TERMS.md` argues
against.

## Live findings from site-health, 2026-08-17

`demigod-site-health.mjs` was wired by selftest only, so its actual audit ran by hand or never. Two
real things it was reporting to nobody:

- **`/startups` over-claims by 30 companies.** Live says *"Browse 501 companies with verified open
  roles in this 2026-08-14 snapshot"* and lists 322. The sealed artifact on disk says *"Browse 471
  companies with public ATS open roles in this 2026-08-16 snapshot"* and lists 365. The live page is
  three days stale and claims 30 companies the current data cannot support. This is publish lag with
  a user-visible cost, and it clears the moment an authorized publish happens — the corrected count
  and the corrected wording are both already on disk.
- **24 routes serve identical crawlable text** — /about, /apply, /blog, /candidates, /careers,
  /compare, /engineers, /faq, /fees, /founders, /how, /how-it-works, /jobs, /legal, /method,
  /network, /notes, /partnership, /partnerships, /pilot, /press, /refer, /sample, /security, /status
  all serve the same 576 characters to a crawler that does not run JavaScript. That is not a code
  defect; it needs page copy, which is a human writing task. It pairs with the canonical and og:url
  findings: to a non-JS reader this site is largely one page.

## Two more measured 2026-08-17

- **W4-3 posting-age honesty** — already done on the public surface. The static directory says in
  plain words: *"observed is Demigod's timestamp, not the employer's posting date."* No work.
- **W5-5 analytics** — confirmed zero: no gtag, GTM, GA, Plausible, Fathom, Umami, PostHog, Mixpanel
  or Cloudflare beacon anywhere in the served homepage. **Decision is ready, not taken** (adding one
  is a publish):
  - **Cloudflare Web Analytics** is the smallest honest option. Free on every plan, no DNS proxying
    required, sets no cookies and does no fingerprinting — so the ePrivacy cookie-consent rule does
    not apply and no banner is needed for it.
  - It is still not free of obligations: it processes IP and user agent, which is personal data under
    GDPR, so **`/legal` must name it** before it ships. That is the whole cost, and it is one
    paragraph.
  - It needs a beacon script in the site head, which means a Webflow publish. Nothing here is
    authorized to do that.
  - Sources: [Cloudflare Web Analytics overview](https://spilnoagency.com.ua/en/instructions-us/cloudflare-web-analytics-2026),
    [consent analysis](https://ethicaldatahub.com/cloudflare-analytics-cookie-banner/).

## Ponytail ceilings, measured 2026-08-17

The rule is to check the ceiling before doing the work. Three checked, one acted on.

- **W8-1 CDP client** — ceiling said "a third caller"; there are **five** (webflow-lib, redirects,
  x-hiring, conversion-audit, user-test), three of which also PUT `/json/new`. Marker updated with
  the count and the precondition. Not refactored: CDP Chrome is down and two callers are on the
  Webflow paste path, so a shared client could not be exercised. Do it with Chrome up.
- **W8-2 registrable label** — ceiling reached and it does not bite. Two live hosts have multi-label
  suffixes (`bravegroup.co.jp`, `zendesk.co.jp`) and the naive parser already refuses to split them:
  it emits the full host only, never `co`. Conservative is the safe direction here. No work.
- **W8-6 50KB footer** — ceiling effectively reached: **31 bytes** of headroom on real data. The
  generator already trims, says "Listing the N of these M companies" in the served markup, keeps
  whole-corpus totals honest, and asserts all of that in its selftest. Pagination is the upgrade
  when the listing must be complete; nothing to fix today.

## Two live rows list a jobs page where the directory promises a company

`careers.chime.com` and `careers.snowflake.com` are stored as company websites. Wrong for a reader,
and wrong for identity: §1 keys on the registrable domain, so `chime.com` is Chime and
`careers.chime.com` is a room inside it. If a YC or Wikidata row for chime.com ever arrives the two
stay split — correctly, since they are different domains — and the directory lists one company twice.

**Admission is fixed** (`companyWebsiteFromHiringHost`): careers/jobs/apply/hiring subdomains
normalise to the parent at HN admission, path dropped. Deliberately only those four prefixes —
`app.`, `www.` and product subdomains are untouched, because guessing which subdomain is "the real
site" is how a normaliser starts inventing identities. `app.acme.io` staying put is in the test.

**The two existing rows are not repaired, and that is an operator decision.** Their ids encode the
bad host (`hn:careers.chime.com`), so fixing them changes an identity key for a live directory row
carrying 57 open roles. That is a migration, not a cleanup, and it should be chosen rather than
slipped in. The next map rebuild will admit them correctly; the old rows need a deliberate call.

## The robots policy is deliberate, and it does not save us

Measured 2026-08-17, correcting a looser statement I made earlier in the day. `robots.txt` is not a
blanket AI block and not an accident:

- `User-agent: *` carries `Content-Signal: search=yes, ai-train=no, use=reference` with `Allow: /`.
- Nine **training** crawlers are disallowed: GPTBot, ClaudeBot, CCBot, Google-Extended, Bytespider,
  meta-externalagent, Amazonbot, Applebot-Extended, CloudflareBrowserRenderingCrawler.
- Every **citation** fetcher is allowed: OAI-SearchBot, PerplexityBot, ChatGPT-User, Claude-User,
  Claude-SearchBot, Bingbot, Googlebot.

That is a defensible position stated in the right vocabulary — index and cite us, do not train on
us — and it needs no fixing. It also changes nothing about the pre-rendering work: the fetchers that
are *allowed* do not execute JavaScript either, so what they are permitted to read is 590 characters
of navigation. The door is open and the room is empty.

`llms.txt` is blocked by hosting rather than by policy: `/llms.txt` and `/ads.txt` both 404, so
Webflow is not serving arbitrary root files. It needs a Worker or a redirect first.

## Where things stand at the end of 2026-08-17

- `node demigod-verify-all.mjs` — **248 steps, 0 failed**, floor 239.
- `node demigod-die-contracts-check.mjs` — **30 enforced, 0 violated, 0 unwired of 30**, ratcheted.
- `npm run demigod:verify:source` — pass. `bin/dg ship prepare` — nine checks, all green.
- `bin/dg truth` — PASS, disk v1104 / live v1101, prepare-only, publish unauthorized.

`lastAttempt` immediately earned its place: the 73 rows now marked `error` all have no verified ATS
board, so the failure happened while probing candidate slugs rather than on a known board. Before
tonight that was unanswerable — those rows were indistinguishable from companies with no roles.

**Still needing an authorized publish, and nothing else:** the /startups over-claim (501 vs 471),
per-route canonicals and og:url, the CDN SRI pins, the blog JSON-LD URL, the `/graph`-style nav
audit, foot v1104, and the corrected public-roles geography.

## Learned (append, never rewrite)

- **2026-08-17** `openRolesAt` was doing double duty as a date and as a claim. Any field that is
  both a value and an implied status will eventually be written by a path that earned only one of
  them. The fix that stuck was making the status a function of two fields, not one.
- **2026-08-17** Two copies of the same ladder (packet, matching engine) meant one of them was
  always behind. The shared function is `hiringStatusOf` in the kernel, which already owned the
  enum — put the derivation where the vocabulary lives.
- **2026-08-17** A check that lives inside `if (isMain)` is unreachable by tests, and that is where
  the bug was hiding. Extracting `projectJobRow` was the whole fix; the assertion was five lines.
