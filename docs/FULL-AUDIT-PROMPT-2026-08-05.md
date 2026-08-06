# Demigod full audit — self-prompt

## Objective

One consolidated, evidence-backed task list across every dimension of Demigod:
code, tests, design, copy, product, infrastructure, business, and process. Output
is four ranked lists — **REMOVE**, **BUILD**, **FINISH**, **DECIDE** — where every
entry cites the evidence that produced it and states what it costs.

## Standing rules

- **No feasibility verdicts.** Never conclude something is too big, too expensive,
  or out of reach. State what it requires — engineers, months, capital,
  integrations — and stop. Resources are not visible to me.
- Every task must cite evidence: a file, a line, a gate output, a measurement, a
  competitor, or a research finding. A task with no citation is an opinion and
  gets cut from the list.
- Distinguish **verified** (I ran it), **inferred** (follows from evidence), and
  **unknown** (needs a check I have not run).
- Reuse this session's completed work rather than re-deriving it. Cite the doc.
- Prefer deleting to adding wherever both would work — Ponytail applies to the
  task list itself.

## Dimension 1 — Code

Gather, do not guess:
- Repo shape: file count, LOC, largest files, language mix.
- Test suite: pass/fail counts, failing files, and for each failure whether it is
  a real defect, an environment casualty, or a **stale oracle** (a test asserting
  copy or structure that has legitimately changed). This session already found two
  stale oracles; assume more.
- Dead code: modules with no importer, npm scripts pointing at missing files,
  tools in the registry that no longer run.
- Duplication: near-identical files, copy-pasted helpers, the `heavy-send-*`
  family, the `cursor-*` family.
- Deliberate debt: every `ponytail:`, `TODO`, `FIXME`, `XXX`, `HACK` marker,
  harvested into the list rather than left in the source.
- Vacuous tests: assertions that pass on empty input, absent files, or slices that
  cannot fail. One was already found and fixed (`demigod-sprint-selftest.mjs`
  sliced between two markers that no longer existed and asserted on `''`). Search
  for the same shape elsewhere — it is a class, not an incident.
- Concurrency hazards: files with more than one writer. `demigod-foot-core.js` was
  clobbered mid-session by another agent; `DEMIGOD-SIMPLE.md` says one writer.

## Dimension 2 — Tests and gates

- Which gates run in `bin/dg check full` vs `verify:all` vs nothing? A test nobody
  runs is not a gate.
- Which controls on the board are failing, and is each failing because the product
  lacks something or because the control is stale?
- Where is a gate protecting a claim that no longer exists?
- What is untested that matters: consent boundary, privacy boundary, fee
  arithmetic, publish authorisation.

## Dimension 3 — Design and front-end

- Rendered-DOM audits, not served HTML: conversion, a11y, buttons, forms.
- Copy: measure repetition per view, not total length. The homepage is 1,555
  rendered chars — not padded — yet states the same mechanic three times and the
  consent gate six times. Over-explanation here is repetition and defensive
  qualification, not long sentences.
- Cross-page duplication: `/hire` restates the entire `/how` process.
- Information architecture: 33 sitemap URLs render 15 distinct pages.
- Missing elements the code expects: `#dg-site-nav` is referenced by tests and
  described by `dg-nav-jsonld`, but does not exist in the DOM.
- Timing-class bugs: scrubs that run before the DOM is final. One found and fixed;
  the nav and footer injections are the same shape and need checking.

## Dimension 4 — Product and business

Draw on completed research rather than repeating it:
- `DEMIGOD-STRATEGY-RESEARCH-2026-08-04.md` — market, regulatory, academic
- `DEMIGOD-FIRST-PRINCIPLES-2026-08-04.md` — the reassessment after reading the site
- `COMPETITOR-ANALYSIS-2026-08-05.md` — adopt / cut / wedge, three build plans

Open items to fold in: pricing position vs Paraform's 20–25%; the missing
replacement guarantee; employer-visible pipeline; the Mercor signal about who
actually pays.

## Dimension 5 — Infrastructure and operations

- What is running vs what should be: systemd units, timers, the dashboard.
- Backups: `bin/dg-backup` exists, restic is not installed, no repo target set.
- The wipe's unrecovered residue: 37 gitignored data files, the X session cookies,
  `~/.config/demigod` secrets, the unverified `demigod-ops` remote.
- Publish lag: `truth` reports disk v939 vs live v903, +36 versions, 63h, flagged
  as debt.
- Toolchain: node 24.17.0 under nvm but a bare shell resolves node 18.

## Dimension 6 — Process

- The one-writer rule is being violated on the canonical runtime.
- 14 failing tests have been normalised; a suite with standing reds stops being
  read. Two of those reds are now known to be stale oracles, which is how the
  normalisation happens.
- Git hygiene: a commit in this session swept 14 files from another agent's staged
  index under an unrelated message.

## Output format

Four lists. Each entry:

```
[ID] Title
  Evidence:   what proves this is real (file:line, gate output, measurement, doc)
  Costs:      what it takes — hours/days/engineers/integrations/capital
  Blocks on:  dependencies, authorisations, or unknowns
  Risk:       what breaks if done, or what breaks if not done
```

- **REMOVE** — delete, with the Pass-B verdict for each: genuine wedge,
  invisible-but-load-bearing, or work that produced no buyer value.
- **BUILD** — new features. Full plans, sized to the feature, no hedging on scale.
- **FINISH** — started and incomplete. Anything half-done is worse than either
  state; this list should be shortest and should get done first.
- **DECIDE** — needs a human call: pricing, positioning, publish authorisation,
  what to do about the second writer.

Rank within each list by (evidence strength) × (consequence), not by ease.

## What would make this audit bad

- Tasks with no citation.
- A REMOVE list that spares things because they were hard to build.
- A BUILD list that hedges on size.
- Re-deriving research already completed and filed this session.
- Declaring anything green that I did not personally run.
