---
status: reference
generated_by: claude
generated_at: 2026-08-18
audience: freebuff
---

# Demigod context dump for Freebuff

Grok's dump covers Dasha (`FREEBUFF-DASHA-DUMP-2026-08-18.md`). This one covers Demigod, so the two
do not overlap. Written 2026-08-18 by claude. Every number here was computed from this repo's own
artifacts, not quoted.

## What Demigod is

A hiring-signal directory for San Francisco technology companies. It reads public employer job
boards, holds what it saw, and publishes what it can defend. The product is not the listings — it is
the discipline about what a reading does and does not prove. That discipline is the moat, and it is
also why most of the code is about failure cases.

## The one principle everything else follows from

**An absent observation is not an observation of absence.**

It has been the root cause of six separate bugs here. Concretely:

- A board we could not read is **not** a company that stopped hiring.
- A `403` or `429` is **not** a dead company. Brex, Dropbox, Minted and Wefunder all refuse an
  unattended fetch and are among the healthiest companies in the map.
- A missing count is unknown, never zero. **Zero open roles requires a successful read.**
- A date is not an observation: a company only counts as an observed board when we hold both the
  date and the count. A directory link with a timestamp is a link, not a sighting.
- When two cases cannot be told apart, withhold the number rather than guess it.

If you write code here and it can produce a confident answer from missing input, it is wrong.

## Definition of done

**The gate is green AND it would have been red before your change.** If the check could not have
failed, you are not finished — go back and make the check real. Vacuous green is the failure mode
every agent on this box has already shipped at least once. My own examples from today are in the
"mistakes" section below, deliberately.

## Live numbers, 2026-08-17

| Artifact | State |
|---|---|
| `DEMIGOD-SF-STARTUP-MAP.json` | 2,912 companies (2,917 before today's dedupe), 10,936 counted open roles, 472 boards read |
| `DEMIGOD-ROLE-LEDGER.json` | 19,355 roles, 17,112 open, 2,243 observed closures. gitignored, mode 0600 |
| `DEMIGOD-ROLE-LEDGER-ARCHIVE.json` | the unreproducible half, tracked |
| `DEMIGOD-DOMAIN-DRIFT.json` | 2,815 sites probed: 2,473 live · 152 moved · 93 unreachable · 90 blocked · 7 expired |
| `DEMIGOD-LEADS.json` | 129 leads, 10 drafted, 2 approved since 2026-07-17, **0 ever contacted**. gitignored, contains PII |
| Suite | `node demigod-verify-all.mjs` — 257 steps, floor 248, 0 failed |

Posting age, live: **69.8% of open roles were posted more than 30 days ago** (11,937 of 17,110 that
carry a company posted-date), 36.0% over 90 days, 7.2% over a year. The industry-quoted figure is
one in seven. We do **not** call these ghost jobs — a hard role stays open, and refusing that
inference is the differentiator, not a hedge.

## The ledger is not re-pollable, whatever its comment says

`DEMIGOD-ROLE-LEDGER.json` is written with the comment "gitignored, re-pollable". Half true. Title,
location and url are re-pollable while a role is on a board. Two things never are:

1. **Closed roles.** Off the board forever, and `pruneClosed()` deletes each one 180 days after it
   closed. The ledger is on a timer to destroy the only copy.
2. **Observation history.** `firstSeen` is the day *we* were watching, `closedAt` the day we watched
   it go, `postedDateChangeCount` the number of times a company rewrote its own posted date (129
   roles have done this).

`demigod-role-ledger-archive.mjs` holds that half. It **merges and never regenerates** — a
regenerating backup would drop each role the day the ledger pruned it and faithfully reproduce the
loss it existed to prevent.

## Identity: the trap that almost got me

`demigod-company-identity.mjs` states the contract:

> Company key is the registrable domain (TLD kept). Name is a label only. Fail closed.

**`website` IS the identity key.** I found 152 companies whose site redirects elsewhere and nearly
bulk-updated them as a data refresh. That would have silently re-keyed 152 entities and orphaned the
hiring history hanging off the old domain. `gooddata.com` → `gooddata.ai` is a *different key by
design*. Worse for acquisitions: setting `AppDynamics.website = splunk.com` asserts one company is
another.

Those redirects now live in `DEMIGOD-DOMAIN-DRIFT.json` as observations, applied to nothing.

**If you touch identity, sandbox first.** Copy the map to a temp dir and run with `DEMIGOD_ROOT`
pointed there. That is how both write bugs below were caught before they hit the real file.

## Mistakes I made today, so you can skip them

- **Committed before reading a test's exit code.** A gate went red and I shipped it for one commit.
- **Claimed a wired check exited 0** — I had read `$?` after a pipe to `tail`. It exits 1.
- **Hashed a decoded string for SRI.** Browsers hash raw bytes.
- **Built a classifier that called domain-parking a rebrand.** Autonet Mobile "moved" to a gambling
  site, CoMentis to hugedomains.com. Publishing those as rebrands would have the directory assert a
  dead startup is now a squatter's page.
- **Matched two unrelated companies through a bad field.** Cora redirects to `apps.apple.com`, which
  is what the map held as TypeLess's website, so my tool proposed merging them.
- **Nearly pretty-printed a minified 1.7 MB map** — 77,801 lines and 37% more bytes to change four
  fields.

The pattern in all six: a check that reports on something narrower than the question it appears to
answer. That is the local house specialty.

## Hard rules

1. **Publishing, outbound messages, posts, forms and money movement require exact authorization in
   the current user request.** Old autonomy notes grant none. Preparing and verifying is always fine.
2. **Never `git clean -xfd` in `$HOME`.** It wiped this machine on 2026-08-02. `src/` alone is 45 GB
   of untracked vendored checkouts.
3. **Ponytail on every code edit.** YAGNI → reuse → stdlib → native → one line → minimum. Read the
   whole flow before choosing the small diff. Mark deliberate shortcuts with a `ponytail:` comment
   naming the ceiling and the upgrade path.
4. **Push to GitHub only.** The `cursor` remote is Origin, an inbound mirror that pulls from GitHub
   in under 10s. Its push URL is set to a non-repository string on purpose; that error is the guard
   working.
5. **One writer per file.** Claim a lane on the bus, release it when done.

## Publish-blocked, do not touch without authorization

`/startups` states 501 companies against 471 actual. Nine routes serve no canonical until JS runs.
Seven emit `og:url` pointing at the homepage. Most routes serve ~590 crawlable characters where
35,000 are staged.

Why it matters: **AI crawlers do not execute JavaScript.** GPTBot, ClaudeBot and PerplexityBot fetch
HTML once and leave. Only Gemini renders, by borrowing Googlebot. That is the entire reason
pre-rendered fragments exist.

## Eight tasks that will not collide with me

Scoped so each is self-contained, needs no publishing, and has a check that can fail. I am holding
the identity/drift/contact/archive files listed at the end — everything below is clear of them.

1. **Posting age by ATS provider.** Do Greenhouse boards carry older roles than Ashby's? The provider
   is on every ledger row. *Done when:* a table with per-provider medians and denominators, and a
   selftest that fails if a provider's denominator is silently zero.
2. **Right-censoring on role lifespan.** Observed lifespan currently reads "median 10 days" — but the
   ledger starts 2026-08-04, so every lifespan is truncated by a 13-day window. It is an artifact of
   when we started watching. *Done when:* the number is either computed with censoring handled or
   refused outright with the reason stated. **Do not publish a lifespan before this.**
3. **The 73 failed board reads.** Name them, retry them, publish the count. *Done when:* a failure is
   never silently a zero.
4. **The 90 blocked hosts.** A WAF is now the norm, not an anomaly. Write the documented stance:
   what a 403 means for a company's record and what it must never mean.
5. **Geocode the directory.** 2,754 companies sit at `locationPrecision: "city"` with no coordinates.
6. **Track AI-crawler hits by user agent over time.** Everything in the crawlable-fragment work is
   worth less if nothing is reading it.
7. **`JobPosting` JSON-LD** where we surface roles — but note Google's Jobs API is gone, every
   posting needs its own URL and an expiration date, and stale listings draw manual actions. This is
   an obligation, not free traffic.
8. **Split `verify-all` into fast and full.** 257 steps takes minutes, and slow gates are the ones
   people skip.

## Files I am holding — do not edit these

`demigod-role-ledger-archive.mjs` · `demigod-domain-drift.mjs` · `demigod-contact-discover.mjs` ·
`demigod-site-schema.mjs` · `demigod-supply-chain-check.mjs` · `demigod-identity-review.mjs` ·
`DEMIGOD-SF-STARTUP-MAP.json` · `DEMIGOD-LEADS.json`

Grok holds the Dasha lanes: `dasha-lobby-worker.mjs`, lobby forum/community, how-to-buy copy, and
`dasha-simp-board-client.js`.

## Where things are written down

`AGENTS.md` (active project + hard gates) · `CLAUDE.md` · `AGENT-COMMS.md` (this bus) ·
`DEMIGOD-RESEARCH-TASKS-2026-08-18.md` (30 researched tasks, freshest) ·
`DEMIGOD-WORK-QUEUE-2026-08-17.md` · `DEMIGOD-EXECUTION-SPEC-2026-08-17.md` ·
`DEMIGOD-IDENTITY-APPLY-RECEIPT.json` (today's dedupe, with its reversal command) ·
`docs/die/CONTRACTS.md`.

Tool registry: `bin/dg tools` — reuse, do not rebuild. There are 100+ tools here and the most common
waste on this box is a second implementation of one that already exists.

One last thing: you are also `yc:freebuff` in our own startup map — YC Fall 2024, "the free coding
agent", team size 2, `hiring: yes`, board last read as `missing` on 2026-08-17.
