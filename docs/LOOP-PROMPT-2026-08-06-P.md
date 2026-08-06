# Loop iteration P — finish the target store: a way to record judgement

## State

```
lock     HELD — why: "keep 17 FAQ answers honest and restore mini-page mobile actions"
suite    550/554 in a full run; the extra reds are races against foot-core being
         edited mid-suite (both pass 9/9 in isolation) plus the registry red
store    DEMIGOD-TARGETS.json — 17 companies, all state:"observed", all note:null
```

The lock's `why` overlaps my iteration-M change ("restore mini-page mobile
actions"). Another worker is in that file. Foot-core is off-limits, and I should
not assume my change survives — worth re-checking later, not contesting now.

## The gap I shipped

Last iteration I built a store whose entire justification is that **human
judgement survives a re-run**. The merge preserves `state` and `note`, and a test
proves it does.

But there is no supported way to *enter* a state or a note. A human must hand-edit
`DEMIGOD-TARGETS.json` — a mode-0600 JSON file — and any typo silently corrupts
the store on the next merge, because `loadTargets()` falls back to an empty store
on a parse error and the next `targets` run would rewrite it as if nothing had
been recorded.

That is a real defect in what I built, not a missing nice-to-have. The
preservation property is currently theoretical: there is nothing to preserve
because nothing can be set.

## Task 1 — `targets set`

Add a mutation subcommand. Shape should match the CLI conventions already in this
file (`poll`, `report`, `targets`) and in `demigod-pairs-lib.mjs`, which is the
closest existing example of guarded state transitions — read it first.

```
demigod-role-ledger.mjs targets set <company> --state <s> [--note "..."]
```

Requirements, each of which is a way this goes wrong if skipped:

- **Allow-list the states.** A free-text state makes the store unqueryable and
  lets a typo read as a new category. Something like
  `observed | reviewing | ruled-out | contacted` — and `contacted` is a human
  assertion about something that happened outside this tool, never inferred.
- **Refuse an unknown company.** Setting state on a name not in the store would
  silently create a phantom row with no provenance. Fail closed with the near
  matches.
- **Never invent observation data.** `set` touches `state` and `note` only. If it
  can write `agingRoleCount` or a URL, the store stops being derived-plus-judgement
  and becomes two sources of truth.
- **Bound the note.** It is human free text going into a private file; cap the
  length and reject control characters, matching how `demigod-submissions-lib.mjs`
  handles operator-entered strings.
- **Record when.** `stateSetAt` alongside the state, so a stale `contacted` from
  three weeks ago is visibly stale.

## Task 2 — make a corrupt store fail loudly

`loadTargets()` currently swallows a parse error and returns an empty store. That
is right for "file does not exist yet" and wrong for "file exists and is broken":
the next `targets` run would overwrite a human's work with a fresh derivation and
report success.

Distinguish the two. Missing file → empty store, as now. Present but unparseable →
refuse, and say which file and why. The wipe on 2026-08-02 is the standing
argument for never silently discarding a file that holds human work.

## Task 3 — tests, proven non-vacuous

- `set` on an unknown company refuses and does not write.
- `set` with a state outside the allow-list refuses.
- `set` preserves observation fields and only changes state/note/stateSetAt.
- A subsequent `targets` merge keeps the state that `set` wrote.
- A corrupt store file causes a refusal, not a silent reset — break the JSON
  deliberately and assert the refusal, then restore.

Break each guarded behaviour and watch the test go red before claiming it works.

## Constraints

- **No outbound.** `contacted` is a human recording a fact, not the tool doing
  anything. Nothing in this iteration may send, draft, or queue a message.
- No foot-core; lock held by another worker.
- No publishing.
- `demigod-verify-no-committable-sor.mjs` must pass — this is company working data.
- Read command output; no redirecting anything the next step depends on.
- Run the affected tests in isolation before trusting a full-suite red, since
  another agent is actively editing foot-core and the suite has been racing.
