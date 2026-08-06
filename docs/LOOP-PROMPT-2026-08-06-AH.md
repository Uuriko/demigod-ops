# Loop iteration AH — can a submission actually reach the inbox?

## State

```
funnel     0 real pairs · 0 real submissions · every board record a seed
inbox      DEMIGOD-SUBMISSIONS-INBOX.json — items: 0, and it is a documented
           2026-08-02 wipe casualty
wipe       destroyed gitignored data including credentials (Firecrawl confirmed);
           ~23 tokens flagged for rotation and never rotated
elapsed    four days since the wipe, zero submissions
```

## Why this, now

Yesterday established the most important business fact available: the funnel is
completely empty. The obvious readings are "no demand yet" or "not enough
traffic" — and I should not accept either until the mechanical question is
answered.

**Four days, zero submissions, immediately following an incident that destroyed
credentials.** That is a coincidence worth taking seriously. If the intake path
broke on 2026-08-02, every conclusion drawn from an empty funnel is wrong, the
pricing analysis is answering the wrong question, and the fix outranks everything
else in the backlog.

The failure mode to fear is the silent one: a form that renders, accepts input,
shows a success state, and drops the payload because a webhook secret no longer
validates. That looks identical to "no demand" from the outside, and nothing in
this codebase's audits would distinguish them — the honesty audit reads served
HTML, axe reads the DOM, the conversion audit reads CTAs. None of them submits.

## Task 1 — Ponytail first: the harnesses already exist

Do not write a new form tester. Read these before anything:

```
demigod-form-e2e.mjs            demigod-form-submit-test.mjs
demigod-forms-full-audit.mjs    demigod-intake-from-wiz.mjs
demigod-intake-smoke-isolation.test.mjs
```

Establish for each: what does it actually exercise? Does it submit to the REAL
endpoint or a stub? Does it verify the payload ARRIVES, or only that the form
posts? A test that asserts a 200 from the form host proves nothing about whether
the inbox received anything — that is the exact gap this iteration is looking for.

If one of them already does end-to-end arrival verification, run it. That is the
answer with no new code.

## Task 2 — trace the path on paper before touching it

Map the intake chain concretely, file by file: form → host (Tally/Webflow) →
webhook → handler → `DEMIGOD-SUBMISSIONS-INBOX.json`. For each hop, identify:

- what credential or secret it needs
- whether that credential exists on disk right now
- what happens on failure — does it retry, log, or drop silently?

`.config/demigod/webflow.env` exists. Check whether the values in it are present
and non-placeholder, without printing them. **Never echo a secret.** Report
present/absent and shape only.

A hop that fails closed with a log is recoverable. A hop that drops silently is
the defect, whether or not it has fired.

## Task 3 — verify arrival, without polluting the pipeline

If a safe path exists, prove a payload can arrive end to end. Requirements:

- Use an existing test harness and its existing test-scope mechanism. The codebase
  has `DEMIGOD_TEST_SCOPE` and busy-dir isolation precisely so tests do not write
  to real state — `demigod-intake-smoke-isolation.test.mjs` exists for this.
- **Do not put a fake submission into the real inbox.** A synthetic lead in a
  store the user reads is worse than an unanswered question, and the whole product
  is built on not confusing seeds with real records.
- If arrival can only be proven by writing to real state, DO NOT DO IT. Report
  exactly what is unverifiable and what the user would have to do — submitting a
  real test entry through the live form is their call, not mine.

## Task 4 — say which of the two worlds we are in

End with one of these, stated plainly:

- "Intake works; the empty funnel is a demand or traffic question." Then the
  pricing and positioning work stands.
- "Intake is broken at hop X since date Y." Then that is the top of the backlog
  and everything else waits.
- "Intake cannot be verified without an action only the user can take." Then say
  precisely what that action is, in one sentence.

Do not hedge across two of them. If the evidence is partial, say which hop is
proven and which is not.

## Constraints

- No outbound messages, no drafts, no posts, no money.
- No writes to `DEMIGOD-SUBMISSIONS-INBOX.json` or any real store.
- Never print a secret; presence and shape only.
- No foot-core, no head, no CSS — held.
- Read all command output. Verify with the harnesses, not by assuming.
