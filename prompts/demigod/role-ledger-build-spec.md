# Build spec — Demigod role first-seen ledger (self-prompt)

Build `demigod-role-ledger.mjs`: a daily poller over the SF startup directory's ATS boards that tracks
each open role's lifetime (first seen → last seen → closed), so we can honestly say "this role has been
open ≥ N days." It's item #1 in `DEMIGOD-BUILDABLE-WORK.md` — the foundation the role-truth tool (#2) and
sharper Pulse findings (#5) consume. Read that file and this whole spec before writing code.

**The whole point of Demigod is honesty. A job-age ledger has two honesty traps; getting them right IS
the task:** (1) never present a *first-observed* date as a *posting* date, and (2) never mark a role
"closed" because a fetch *failed*. Everything below protects those two invariants.

---

## What exists — reuse, don't reinvent (retro: reuse patterns)
- **Input:** `DEMIGOD-SF-STARTUP-MAP.json` → `companies[]`; the 399 with `atsSource` + `jobsUrl` are the
  boards to poll. `atsSource` ∈ {Greenhouse, Lever, Ashby}; `jobsUrl` carries the slug
  (`boards.greenhouse.io/<slug>`, `jobs.lever.co/<slug>`, `jobs.ashbyhq.com/<slug>`).
- **Board fetchers:** mirror the shapes in `demigod-startup-jobs-enrich.mjs` (`greenhouse/lever/ashby`
  via `tryFetch`), but return **raw per-role rows**, not counts. Reuse `categorizeRole(title)` and
  `isUsPostedLocation(blob)` (both exported there) — do NOT re-implement.
- **Storage:** `readJson`, `atomicWrite`, `withFileLock` from `demigod-agent-tools-lib.mjs`. Atomic
  writes only; hold a `.lock` for the read-modify-write (retro P7: never truncate shared state).

## Standalone, not bolted onto enrich
Keep it a separate file with its own board fetch. Double-fetching 399 boards once/day is cheap, and
coupling to the enrich's count path risks the enrich's map-write clobbering the ledger. The ledger is a
**stateful SoR** (firstSeen accumulates — it is NOT reproducible from scratch), so it must be tracked in
git, written atomically, and never rebuilt-from-zero. Store at `DEMIGOD-ROLE-LEDGER.json`.

---

## Data model
Role identity = `provider|slug|jobId` (stable across polls; a repost usually gets a NEW jobId → new role).
Ledger = `{ schema:'demigod.role-ledger/1', updatedAt, roles: { <roleKey>: RoleRow } }`.

```
RoleRow {
  provider, slug, jobId,            // identity
  company, title, location, url,    // display (public posting data only — NO PII, ever)
  fn,                               // categorizeRole(title): engineering|ai/data|sales|...
  usPosted,                         // isUsPostedLocation(location) — for SF/US relevance filtering in reports
  firstSeen,                        // ISO date of OUR first observation. MONOTONIC — set once, never moves earlier.
  lastSeen,                         // ISO date of the most recent successful fetch that INCLUDED this role.
  closedAt,                         // ISO date we first saw the board WITHOUT it (successful fetch). null while open.
  reopenCount,                      // # times a same-key role reappeared after a closedAt.
  nativePostedAt,                   // ISO date from the board, or null. See per-provider table.
  nativeDateField                   // 'first_published' | 'createdAt' | 'publishedAt' | null — provenance label.
}
```

### The two honest age numbers (never conflate them)
- `observedOpenDays = today - firstSeen` — always safe, never overclaims. This is what "open ≥ N days"
  MUST use. Conservative: a role that predates our tracking looks *younger*, never older, than reality.
- `postedDaysAgo = today - nativePostedAt` — only where `nativeDateField` is a real POSTING date
  (Greenhouse `first_published`). Present it ONLY as attributed ("posted N days ago, per the company's
  Greenhouse board"), NEVER merged into observedOpenDays. For Ashby `publishedAt` (resets on repost) and
  Lever `createdAt` (reliability unverified), store it but DO NOT surface it as posting age until verified
  — label it and keep it out of headline claims.

## Per-provider extraction (verified 2026-07-26)
| Provider | endpoint | jobId | title | location | url | nativeDate field |
|----------|----------|-------|-------|----------|-----|------------------|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=false` | `job.id` | `job.title` | `job.location.name` | `job.absolute_url` | `first_published` (REAL posting date) |
| Lever | `api.lever.co/v0/postings/<slug>?mode=json` | `posting.id` | `posting.text` | `posting.categories.location` | `posting.hostedUrl` | `createdAt` (epoch ms; treat as provisional) |
| Ashby | `api.ashbyhq.com/posting-api/job-board/<slug>` | `job.id` | `job.title` | `job.location` | `job.jobUrl` | `publishedAt` (LAST published — provisional, resets on repost) |

Normalize each provider's rows to a common `{ jobId, title, location, url, nativePostedAt, nativeDateField }`.

---

## The core pure function (this is where all the honesty lives — poison-test it hard)

```
upsertLedger(prevLedger, polledBoards, today) -> newLedger
```
- `polledBoards`: `[{ provider, slug, ok:boolean, roles:[normalizedRow] }]`. `ok` = the board fetch
  SUCCEEDED (HTTP 200 + parseable). A failed/timed-out board has `ok:false, roles:[]`.
- Logic, per board:
  - **If `ok:false` → touch nothing** for that board's roles. (Trap #2: a failed fetch must NEVER close a
    role. Leave lastSeen/closedAt exactly as they were.) This is the single most important rule.
  - **If `ok:true`:**
    - For each polled role: upsert by `roleKey`.
      - New key → create RoleRow: `firstSeen = today`, `lastSeen = today`, `closedAt = null`,
        `reopenCount = 0`, capture display fields + `nativePostedAt`/`nativeDateField`.
      - Existing key, currently open → `lastSeen = today`; **never change firstSeen** (monotonic); refresh
        title/location if changed.
      - Existing key that had `closedAt` set → it REOPENED: `closedAt = null`, `reopenCount += 1`,
        `lastSeen = today`, keep original `firstSeen`.
    - For each ledger role belonging to THIS board (same provider+slug) that is currently open
      (`closedAt == null`) and was NOT in this successful poll → `closedAt = today`.
- Never delete rows (history). Optionally prune rows whose `closedAt` is older than a retention window
  (e.g. 180d) at write time, logging the count pruned (retro: no silent caps).
- Pure + deterministic given `today`; no clock calls inside (pass `today`). No network. Fully unit-testable.

## CLI + I/O wrapper
- `node demigod-role-ledger.mjs poll` — load map → derive boards → fetch all (pooled, ~12 concurrency,
  8s timeout, mirror the enrich) → `upsertLedger` → atomic write under lock → print a one-line summary
  `{boards, ok, failed, open, closedToday, reopened, aging30}`.
- `node demigod-role-ledger.mjs report [--days 30] [--fn engineering] [--json]` — from the ledger, list
  currently-open roles with `observedOpenDays >= days`, ranked desc; totals: open count, aging-≥30/60/90
  counts, ghost-rate (share open ≥60d), by-function. US-posted filter on by default.
- `--selftest` — the poison-tests below.
- Guard `import` with `isMain` (retro: import must not poll/network/write — see the enrich's isMain guard).

## Honesty invariants → poison-tests (each MUST fail if the rule breaks — retro: prove the verifier fails)
1. **Failed fetch never closes:** ledger has open role R on board B; poll B with `ok:false` → R stays
   open, `closedAt` unchanged, `lastSeen` unchanged. (Assert; then flip `ok:true` with R absent → R
   closes. The control proves the test can fail.)
2. **firstSeen monotonic:** re-poll an existing open role on a later `today` → `firstSeen` unchanged.
3. **Close only on successful absence:** `ok:true` board without R → `R.closedAt = today`.
4. **Reopen:** closed role reappears on `ok:true` → `closedAt=null`, `reopenCount` incremented, firstSeen
   preserved.
5. **observedOpenDays uses firstSeen, never nativePostedAt:** a role with `firstSeen` today but
   `nativePostedAt` 300d ago reports `observedOpenDays≈0`; `postedDaysAgo` is separate + attributed.
6. **No PII / no fabrication:** RoleRow has no applicant/candidate fields; every role traces to a
   (provider,slug,jobId) that came from a real fetch. Assert the row shape excludes forbidden keys.
7. **Empty/degenerate:** empty map → empty ledger, no crash; all-boards-failed poll → ledger unchanged
   (vacuous-green guard: the test must fail if a no-op poll silently wipes state).
Wire `--selftest` into `demigod-verify-all.mjs` alongside the other pipeline selftests.

## What it produces (the payoff, no GTM claims)
- `report` → the aging-roles list + ghost-rate + by-function distribution (per company and directory-wide).
- Feeds #2 (role-truth tool: "observed open N days", ghost flags) and #5 (Pulse: aging-role share,
  ghost-job rate). Those are separate builds; the ledger just makes their data exist and be honest.

## Scope — v1 vs later (ponytail: build the smallest honest thing)
- **v1:** exact (provider,slug,jobId) identity, the upsert honesty logic, poll+report CLIs, poison-tests,
  git-tracked atomic store, Greenhouse `first_published` seeding of `nativePostedAt`.
- **Later, only if needed:** repost detection across changing jobIds (same company+title, new id →
  "reposted ×N"); verifying Lever `createdAt`/Ashby `publishedAt` reliability before surfacing them as
  posting age; a history JSONL of daily open-counts for trend charts.

## Verification plan (retro P8: test against the real artifact)
1. `--selftest` green (and each poison-test proven to fail on a deliberately broken control).
2. One real `poll` against the live 399 boards; sanity-check the summary (open count in the low
   thousands, failed count small, closedToday≈0 on first run since nothing was open-then-gone yet).
3. `report --days 30` shows real aging roles with real URLs; spot-check 2–3 against the live board
   (does that Greenhouse role's `first_published` match what the ledger stored?).
4. Commit the code + the first `DEMIGOD-ROLE-LEDGER.json` snapshot (surgical, explicit paths).

## Guardrails (carry every retro lesson)
- Atomic writes + file lock; the ledger is a stateful SoR — never truncate, never rebuild-from-zero,
  keep it git-tracked (untracked = no safety net).
- Only a *successful* fetch may close a role. Repeat it in a code comment at the close-logic site.
- Two age numbers, never conflated; native dates attributed + provenance-labeled.
- No autonomous outbound, no publish (this is a headless data build). No GTM prescriptions in outputs.
- Prove the verifier can fail before trusting green.
```
