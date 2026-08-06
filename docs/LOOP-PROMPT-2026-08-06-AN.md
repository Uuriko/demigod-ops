# Loop iteration AN — did the broken detector already put a "no agencies" company on a lead list?

## State

```
fixed      extractAgencyPolicyEvidence now catches "agencies won’t be paid" in all
           three apostrophe encodings. Before today it missed all three.
unanswered the detector was broken WHEN THE CURRENT DATA WAS COLLECTED. The
           role ledger holds thousands of polled roles; the partner lead list I
           generated earlier had 100 companies.
consequence a missed policy leaves noAgencyEvidenceReqCount at 0, so
           demigod-lead-sourcer does not abstain and surfaces that company.
```

## Why this, now

Yesterday I fixed the detector and wrote that its cost "lands on someone outside
this codebase." Then I stopped. The obvious next question — *has it already
happened?* — is the one that matters, and leaving a fix un-followed-up is the
pattern I have spent this session finding everywhere else.

A code fix does not retroactively correct data that was collected while the code
was broken. If the ledger's stored `agencyPolicyEvidence` was computed by the old
detector, then every downstream consumer is still working from the wrong answer,
and the fix will not take effect until the affected roles are polled again.

This is the difference between "fixed" and "corrected", and I claimed the first
while implying the second.

## Task 1 — establish whether stored evidence can be recomputed at all

Read what the ledger actually persists per role. Specifically:

- Does it store the raw JD HTML/text, or only the derived
  `agencyPolicyEvidence` object?
- If only the derived value, recomputation requires re-fetching each board, which
  is network work and not something to trigger casually.
- Is there a stored `null` that is indistinguishable from "checked and found
  nothing"? A field that is null both when absent and when never-computed cannot
  be audited without re-fetching, and that itself is the finding.

Do not guess from field names. Read a real row.

## Task 2 — quantify the exposure honestly

Answer, with numbers:

- How many roles in the ledger carry a positive `agencyPolicyEvidence` today?
- How many companies does that represent?
- Of the partner leads the sourcer currently produces, how many companies have NO
  recorded policy — i.e. how many are in the population where a missed smart-quote
  policy could be hiding?

That last number is the exposure. It is not "companies that asked not to be
contacted" — it is the set within which such companies cannot currently be
distinguished. **State it that way.** Overstating it would be as dishonest as
ignoring it.

## Task 3 — do not send anything, and check nothing was sent

The lead list is a preview. `demigod-lead-sourcer` prints "preview only, CRM
unchanged". Verify that is actually true for the runs I did earlier today:

- Did any run write to a CRM, queue, or outbound store?
- Is there any draft, queue, or pending-send artifact holding these companies?

If a company that asked not to be contacted is sitting in an outbound queue, that
outranks everything else in this prompt. If nothing was ever queued — which I
expect, since every run was `--type=partners` preview — say so plainly, because
"the bug existed but nothing acted on it" is the material fact.

## Task 4 — state the correction path without triggering it

If correction needs a re-poll, say exactly what command, what it would cost in
network terms, and what it would change. **Do not run a full re-poll to fix data
on my own initiative** — it is a large network operation against third-party
boards, and the honest move is to state the requirement.

If a cheap partial correction exists — recomputing from anything already stored —
identify it, and only do it if it is genuinely read-only and local.

## Task 5 — the guard that should have existed

The deeper issue is that a detector like this fails open: when it misses, the
result is "no policy found", which is indistinguishable from a company that never
stated one. Consider whether the stored evidence should record *that the check
ran and with which detector version*, so a future fix can identify exactly which
rows need recomputation instead of forcing a blanket re-poll.

Only propose it. Do not add a schema field to a store the export validates
against exact key sets — iteration U's entire defect was a projection carrying a
field the validator rejected.

## Constraints

- No network re-polling. No outbound. No CRM writes. No sends.
- Read-only against the ledger and every store.
- No foot-core, no head, no CSS.
- Numbers must come from the stores, not from estimates.
