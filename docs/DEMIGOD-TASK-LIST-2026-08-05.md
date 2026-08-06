# Demigod task list — compatibility pointer

The living, reconciled task register is [`DEMIGOD-TASKS.md`](DEMIGOD-TASKS.md).

This dated audit is retained below as historical evidence. Its versions, counts,
rankings, and user-decision framing are not current task authority.

---

# Historical consolidated task list (2026-08-05)

Executed against `FULL-AUDIT-PROMPT-2026-08-05.md`. Every entry cites evidence.
Verified = I ran it. Inferred = follows from evidence. Unknown = needs a check I
have not run.

**Repo shape (verified):** 566 `.mjs`/`.js` files · 142 test files · 1,267 tracked
· 182,593 LOC · largest source file is a *selftest* at 19,516 lines.

---

# FINISH — started and incomplete

Half-done is worse than either state. Shortest list, highest priority.

**[F1] Wizard playtest is broken and its result is not trustworthy**
- Evidence (verified): `demigod-wizard-playtest.mjs` reported `startupDesktop:false`,
  `startupMobile:false`. Root cause found: `passWizard` bails at
  `!s[0]?.welcome`, and `isWelcome` matched on headline copy
  (`/hire sf startup talent|get matched to sf startups/i`) that the copy passes
  renamed — live `.dg-wiz-q` now reads **"Hiring brief"**. The startup wizard works;
  the oracle was stale. I replaced the detector with a structural one (start button
  + 0% bar), but the test now errors inside `wizState` and has not gone green.
- Costs: hours.
- Blocks on: nothing.
- Risk: the revenue-side wizard currently has **no working test**. A real break
  would be invisible.

**[F2] Backups are written but non-functional**
- Evidence (verified): `bin/dg-backup` + `systemd-user/demigod-backup.{service,timer}`
  committed in `2e0acd9`. `restic` not installed; `DG_BACKUP_REPO` and
  `RESTIC_PASSWORD_FILE` unset; timer never linked. `--check` fails closed.
- Costs: ~1 hour + an external disk or object store.
- Blocks on: you choosing a repo target.
- Risk: this is the unfinished item that the 2026-08-02 wipe was an argument for.
  37 gitignored files were lost permanently; nothing prevents a repeat.

**[F3] Publish lag is now flagged as debt**
- Evidence (verified): `bin/dg truth` → `disk=v939 live=v903 · +36 ver · 63h ·
  DEBT — needs current-request publish auth · prepareOnly`.
- Costs: minutes, once authorised.
- Blocks on: **your explicit publish authorisation.**
- Risk: 36 versions of unshipped work, including today's copy-scrub fix. The
  longer the lag, the larger the untested-in-production delta.

**[F4] Webflow MCP configured but never authenticated**
- Evidence (verified): `demigod-webflow-connect.mjs status` →
  `{"grok":true,"claude":true,"codex":true}`; `MCP OAuth (Grok credentials)` still
  unchecked.
- Costs: minutes per agent.
- Blocks on: a browser OAuth round.

**[F5] `demigod-x-hiring.mjs` runs but captures nothing**
- Evidence (verified): selftest 3/3, import-guard clean, live run `captured=0`.
  CDP Chrome redirects to `x.com/i/jf/onboarding/web` — not logged in. Session
  cookies died with the `~/.grok/chrome-heavy` profile in the wipe.
- Costs: minutes (log in), then re-run.
- Risk: currently a tool that reports zero and looks like a working pipeline.

**[F6] Site copy draft written, not published, with two placeholders**
- Evidence: `docs/SITE-COPY-DRAFT-2026-08-04.md`. Pricing and the operator bio
  deliberately left blank — both are yours to fill.

---

# REMOVE

**[R1] `heavy-send-*.mjs` — 70 files**
- Evidence (verified): 70 files. Agent-to-agent message plumbing superseded by
  `bin/grok-ask`, `bin/codex-ask`, and Orca orchestration.
- Pass-B verdict: **work that produced no buyer value.**
- Costs: hours, plus a caller check first.
- Risk: some may still be referenced by scripts or units. Grep before deleting.

**[R2] `cursor-*.mjs` — 14 files, 3 definitively dead**
- Evidence (verified): `cursor-enable-webflow-mcp.mjs`,
  `cursor-webflow-mcp-toggle.mjs`, `cursor-webflow-enable-deep.mjs` (~18KB) drive
  Puppeteer through Cursor's UI to click an MCP toggle — replaced entirely by the
  single `claude mcp add` line already run this session.
- Pass-B verdict: **no buyer value.**

**[R3] Three broken npm scripts**
- Evidence (verified): `verify`, `verify:store`, `verify:loops` all point at
  `eat-the-sounds/verify-*.mjs`, which does not exist. `npm run verify` fails.
- Costs: minutes.
- Risk of not doing it: the canonical-sounding `npm run verify` is broken, so
  anyone reaching for it gets a false failure.

**[R4] Eat the Sounds still in the tree and the test suite**
- Evidence: `CLAUDE.md` says archived and out of scope; the files and their tests
  are still present and still run.

**[R5] 18 alias routes**
- Evidence (verified): 33 sitemap URLs render 15 distinct pages. `/how` alone is
  reached by `/how-it-works`, `/blog`, `/method`, `/notes`. Canonicals are correct,
  so this is maintenance and crawl budget, not an SEO defect.
- Costs: hours; sitemap + route table.
- Risk: `/blog` resolving to "How it works" is a bad search result if indexed.

**[R6] Cross-page copy duplication**
- Evidence (verified, rendered DOM): `/hire` restates the entire `/how` process as
  4 steps. On the homepage the compare/decide mechanic appears **3×** and the
  consent gate **6×** (eyebrow, hero, chips, sub-CTA, subhead, step 03).
- Costs: hours, but see the constraint in `COPY-REDUCTION-PROMPT-2026-08-05.md` —
  the honesty guarantees *are* the prose, so cuts must preserve every consent,
  provenance, and non-automation qualifier.

**[R7] The "First result, not a guarantee" paragraph**
- Evidence (verified, `/how`): three sentences explaining what a first result is
  *not* — "not an unpaid trial or a promise that performance can be known by day
  90." Defensive qualification answering an objection the reader has not raised.
- Note: this is exactly the copy a real **replacement guarantee** [B1] would let
  you delete, because the guarantee answers the question the disclaimer is dodging.

---

# BUILD

**[B1] Replacement guarantee — highest value**
- Evidence: 60/90/120-day replacement clauses are the 2026 standard; Jack & Jill
  refunds in full at 3 months; Toptal runs a 2-week trial; Demigod offers nothing.
  Causal support: referred hires quit 10–30% less (Burks et al. 2015, QJE).
- Full plan: `COMPETITOR-ANALYSIS-2026-08-05.md` §Build 1 — data model, files,
  gates, rollout, failure modes.
- Costs: terms + copy is days; tracking is ~1 week; claim workflow can wait for a
  placement. Needs legal review of the window and exclusions before publishing.
- Why first: it answers "why trust someone with zero placements" *without* a track
  record, and it lets you delete [R7].

**[B2] Employer-visible pipeline**
- Evidence: Paraform ships a candidate CRM with per-submission interview stage,
  active-role view, and in-dashboard chat. Demigod's employer sees nothing; the
  `:9878` dashboard is localhost-only and explicitly a projection.
- Full plan: §Build 2. Tokenised per-engagement read-only projection.
- Costs: ~2 weeks.
- Risk: the privacy boundary. A leak of a name before mutual yes destroys [W1].
  That test gates the feature.

**[B3] Interview scheduling**
- Evidence: Wellfound has Instant Scheduling; **Paraform explicitly cannot
  schedule** — a documented hole in the nearest competitor.
- Full plan: §Build 3. Propose-times-by-link first, calendar write second.
- Costs: ~1 week for phase one.

**[B4] `#dg-site-nav` — the element the code expects and the DOM lacks**
- Evidence (verified): `demigod-wizard-playtest.mjs:198` queries `#dg-site-nav`;
  `dg-nav-jsonld` publishes nav structured data; the element **does not exist** in
  the rendered DOM. 30 other `dg-*` ids are present.
- Costs: hours once the intent is known.
- Unknown: whether the nav was deliberately removed in a design pass (making the
  JSON-LD and the test both stale) or the injection silently broke. **Resolve
  before building.**

**[B5] Harden the marker-slice test pattern**
- Evidence (verified): `foot.slice(foot.indexOf(A), foot.indexOf(B))` appears in
  `demigod-startup-atlas-web.test.mjs:198` and
  `demigod-dashboard-events-native-invite.test.mjs:9,10,11,159`. When a marker
  disappears the slice is `''` and assertions pass on nothing. This already
  produced one live vacuous green in `demigod-sprint-selftest.mjs`, fixed in
  `b09beec`. I checked all four remaining: **currently non-empty**, so the class is
  fragile but not presently lying.
- Costs: hours. One shared helper that throws when a marker is missing.

---

# DECIDE — needs your call

**[D1] Pricing.** 10% matches Jack & Jill's *automated* price while Paraform — the
structural analogue, human recruiters plus software — charges 20–25%. At $180k
roles: 10% needs ~11 placements for $200k; 22% needs ~5. Options: reprice; hold 10%
as a deliberate wedge paired with [B1]; or move to fixed fee or retainer.

**[D2] The second writer on `demigod-foot-core.js`.** Evidence (verified): the file
moved v935 → v937 → v939 during this session and **silently clobbered my first
copy-scrub fix**. `DEMIGOD-SIMPLE.md` says one writer. Either stand the other agent
down, formalise a lock, or split the file.

**[D3] Publish authorisation** — unblocks [F3], 36 versions.

**[D4] `gh auth login`** — still unresolved after four days. 3 commits, no `main`,
`Uuriko/demigod-ops` unverified. If that remote is empty, this laptop is the only
copy of everything above.

**[D5] The Mercor question.** Mercor is at $10B on ~$2B annualised, with **90%+ of
revenue from AI labs** buying expert contract hours for RLHF and evaluation — not
permanent placement. You are in SF, adjacent to those labs, with an events channel
into that population. Whether to pursue that buyer is a strategy decision, not an
engineering one.

---

## Ranking, across all lists

1. **[D4]** verify the remote — everything else is at risk until this is known
2. **[F2]** backups working
3. **[F1]** wizard test green — the revenue flow currently has no oracle
4. **[B1]** replacement guarantee — best value per unit of work, and deletes [R7]
5. **[D1]** pricing
6. **[R1]–[R3]** the dead-weight deletions — fast, and they shrink everything after
7. **[F3]/[D3]** publish
8. **[B2]**, **[B3]**, **[B4]**, **[B5]**

## Unknowns I did not resolve

- Whether the `heavy-send-*` family has live callers (blocks [R1]).
- Whether `#dg-site-nav` was removed deliberately (blocks [B4]).
- Why `wizState` errors after my oracle fix (blocks [F1]).
- Whether any of the remaining 12 non-stale test failures are real defects — the
  earlier audit classified 3 as environment and 11 as real, but "real" there meant
  "not explained by the wipe," and two have since turned out to be stale oracles.
  That reclassification has not been redone.
