# Agency-policy detector — what the bug actually exposed

Yesterday's fix made `extractAgencyPolicyEvidence` catch "agencies won’t be paid"
in all three apostrophe encodings. A code fix does not correct data collected
while the code was broken, and I claimed "fixed" while implying "corrected". This
separates them.

## Nothing was acted on

The material fact first: **no company was contacted, queued, or drafted.**

- `bin/dg demand status` — "Queue empty · drafts-only · no pending handles"
- `DEMIGOD-CRM.json`, `DEMIGOD-OUTBOX.json`, `DEMIGOD-DRAFTS.json` — none exist
- `demigod-lead-sourcer` writes a preview to `/tmp` and prints "preview only, CRM
  unchanged"

So the bug existed and nothing downstream of it ever reached a person.

## Where the detector actually runs

It scans real job-description bodies at poll time, per provider:

| Provider | Field scanned |
|---|---|
| Greenhouse | `j.content` via `?content=true` |
| Lever | `descriptionPlain` + `additionalPlain` + list items |
| Ashby | `descriptionPlain \|\| descriptionHtml \|\| description` |

It is called in exactly one other place — `normalizeAgencyPolicyEvidence`, which
re-derives from a previously stored `quote` on load. That matters: a stored quote
containing a curly apostrophe would have **failed re-validation and been silently
dropped to null** on every subsequent load, not just missed at collection.

## The exposure, stated precisely

```
ledger roles                                   16,560
distinct companies                                502
roles with a positive policy                      120   (2 companies)
stored partner leads                              112
leads carrying a detected policy                    0
leads with NO recorded policy                     112
```

**112 is not "companies that asked not to be contacted."** It is the population
within which such a company could not be distinguished. Stating it the other way
would be as dishonest as ignoring it.

The real miss is narrower than that number suggests, and the narrowing is
verifiable: only **one of the ten** policy patterns contains an apostrophe. The
other nine — "do not accept unsolicited agency resumes", "no agencies please",
"agency submissions are not accepted", and so on — are apostrophe-free and were
never affected. A company was missed only if its *sole* agency statement used the
"agencies won't be paid/compensated/accepted" phrasing **and** encoded the
apostrophe as U+2019 or an entity.

Raw JD text is not stored — only the derived evidence object — so the exact count
cannot be recovered without re-fetching every board. That is a real limit, not a
hedge.

## Correction requires no action

`demigod-role-ledger.timer` polls nightly and next fires **2026-08-07 00:12**. The
poll re-runs `extractAgencyPolicyEvidence` against freshly fetched JD bodies, so
the fixed detector applies to every role on that pass. Any policy that was missed
for apostrophe reasons will be recorded then, and the lead sourcer will abstain on
those companies from that point.

No manual re-poll was triggered. It is a large network operation against
third-party boards, the scheduled run does the same work in 17 hours, and forcing
it early buys nothing.

## The design gap worth naming

The detector **fails open**: a miss produces `agencyPolicyEvidence: null`, which is
indistinguishable from a company that never stated a policy. That is why this bug
could not be audited without re-fetching, and why the exposure above has to be
expressed as a population rather than a count.

Recording *which detector version last evaluated a role* would let a future fix
target exactly the affected rows instead of waiting for a blanket re-poll. Proposed
only — `demigod-recruitai-export.mjs` validates rows against exact key sets, and
iteration U's entire defect was a projection carrying a field the validator
rejected. Adding a field here without tracing that contract would repeat it.
