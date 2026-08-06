# Loop iteration R — make the target list workable without leaving the terminal

## State

```
truth    disk v1025 · live v1019 · +6 ver · 0.8h · lagTracked (debt at +8 or 6h)
lock     FREE
store    DEMIGOD-TARGETS.json — 17 companies, 1 triaged (Hightouch ruled-out)
```

## The gap

`targets` prints company, aging-role count, oldest-role age, and state. That is
enough to *rank* the list and nothing like enough to *work* it. To decide whether
to approach a company a person needs to know what it does, how big it is, what
stage it is at, and where its board lives.

All of that is already on disk. Verified: **all 17 targets** have a
`DEMIGOD-SF-STARTUP-MAP.json` row, and those rows carry:

```
description · website · teamSize · stage · tags · jobsUrl · roleMix
inceptionYear · source · sourceUrl · sourceLicense · retrievedAt
```

So today a human ranks in the terminal and then goes hunting in a 2,902-row JSON
for the context. That is the friction worth removing, and it needs no network, no
new data source, and no new file.

## Task 1 — Ponytail check, seventh consecutive iteration

Six iterations running, the thing already existed. Before writing a join:

1. Does `demigod-recruitai-export.mjs` already produce exactly this shape? Its
   header says "read-only join of DEMIGOD-SF-STARTUP-MAP.json +
   DEMIGOD-ROLE-LEDGER.json into a provenance-backed pack". That is *this join*.
   Read it. If it fits, use it rather than writing a second one — even though its
   `--top` path is capped at 40 by the empty research catalog (iteration K), the
   join logic itself may be reusable.
2. Is there an existing company-context helper (`demigod-startup-atlas.mjs`,
   `demigod-enrichment.mjs`) that already resolves a name to a map row?
3. Does `bin/dg` already have a "tell me about this company" surface?

If any of these covers it, the answer is a one-line change or a documented
command, not new code.

## Task 2 — enrich the target output

If nothing covers it, join in the CLI display only. **Do not persist map fields
into `DEMIGOD-TARGETS.json`.** The store's design rule from iteration O is that
observation stays derived and the store holds judgement plus the ledger's own
observations; copying map columns in would create a third source of truth that
goes stale silently.

Show, per company: what it does (truncated), team size and stage when known,
website, and its jobs board. Keep the existing ranking and state.

Honesty requirements, all inherited:

- **Carry provenance.** Map rows are CC0 / YC-public with `sourceLicense` and
  `retrievedAt`. If a description is shown, its source must be attributable —
  either shown inline or stated once in the output header. Do not silently present
  third-party data as Demigod's own.
- **Never invent.** A company with no `description` shows nothing, not a guess.
  A missing `teamSize` shows nothing, not an estimate.
- **No contact.** Still no person, still no email. `jobsUrl` and `website` are the
  company's own public URLs.
- **Do not imply a relationship.** These are companies observed hiring on their
  own boards. Nothing in the output may read as though Demigod represents them.

## Task 3 — keep the terminal output readable

17 companies with descriptions will not fit the one-line-per-row format. Either:

- a compact default (current one-liner) plus `--detail` for the enriched view, or
- a two-line-per-company layout with the description wrapped and truncated.

Prefer the flag. The one-line view is what makes the ranking scannable, and
replacing it wholesale trades one friction for another.

## Task 4 — verify

- New behaviour covered by a test that is **proven non-vacuous** — break the join
  and watch it fail.
- A company present in the store but absent from the map must render cleanly, not
  crash. Construct that case; it will happen the moment the map is regenerated
  without a company the ledger still sees.
- `node demigod-role-ledger.mjs --selftest`
- `demigod-verify-no-committable-sor.mjs` — company working data.
- Run affected tests in isolation before trusting a full-suite red; another worker
  is active and the suite has raced repeatedly today.

## Constraints

- No outbound, no drafts, no queues.
- No publishing without authorisation in the current request. Report the delta
  (now +6 versions) rather than acting on it.
- Foot lock only if foot-core is touched; this should not touch it.
- Read all command output.
