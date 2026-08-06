# Loop iteration BG — cut the directory caveat the badge already states, and nothing else

## State

```
user asked  "remove most of the text from the sf startup directory description at
            the very top, less is more"
above it    a badge: SAN FRANCISCO · OPEN DATA · CITY-LEVEL · CURRENT STATUS NOT VERIFIED
intro now   1. City-level only — a listed Bay Area location, not a verified office.
            2. Open-role counts come from each company's own public job board,
               point-in-time — an observation, not a hiring verdict.
            3. Listed companies are not engaged Demigod clients; use "Hiring here?
               Start a brief" to work with us.
mobile      heading + badge + this + 6 filter controls + a stats line all sit above
            the first company
```

## Why this, now

The instruction is explicit and the page is the one it named. But the last two
copy iterations taught the same lesson twice: **the prose usually turns out to be
load-bearing, and the real duplication is somewhere I did not expect.** On `/how`
it was a line I had added myself. Here the candidate is sentence 1, because the
badge directly above already states both of its claims.

Sentence 3 is the newest and least cuttable. Another worker added it since the
live build, and it is a refusal — *these companies are not our clients* — which is
exactly the class of claim this product exists to make truthfully. It stays.

## Task 1 — inventory against the badge, not against taste

For each of the three sentences, ask one question: **does the badge or another
visible element already state this?**

- Sentence 1 claims city-level granularity and unverified status. The badge says
  `CITY-LEVEL` and `CURRENT STATUS NOT VERIFIED`. If that is genuinely the same
  claim, it is duplication and it is the cut.
- Sentence 2 explains where counts come from and what they are not. The badge says
  `OPEN DATA` but not the provenance or the disclaimer. Likely unique. Check.
- Sentence 3 is a refusal about relationship. Nothing else on the page says it.
  Keep regardless.

Write the inventory before editing. On `/how` this step is what stopped me cutting
three honesty claims that looked like padding.

## Task 2 — cut whole sentences only, and only proven duplicates

- Remove entire sentences. No clause surgery, no rewriting what stays.
- If the badge only *partially* covers a sentence, keep the sentence. Partial
  coverage is not coverage — "not a verified office" is more specific than
  "CURRENT STATUS NOT VERIFIED" and losing the specificity is a real loss.
- Do not touch the badge, the filters, or the stats line. The filter density is a
  layout question and the other worker is mid-redesign there.

## Task 3 — prove the claims survive, in the rendered page

- Render `/startups` at 390×844 with the disk build and read the served text.
- Assert every retained claim is still present: the provenance of counts, the
  "not a hiring verdict" disclaimer, and the not-clients refusal.
- Confirm the badge still carries the claims the cut sentence used to make. If the
  badge is hidden at some width, the cut removes the claim entirely — check at
  mobile, not just desktop.
- `bin/dg ship prepare` for board-honesty and verify-source.

Report characters before and after, and how much closer the first company row is
to the top.

## Task 4 — contested file, so no commit

`demigod-startup-atlas-web.js` carries the other worker's changes. Apply in the
working tree, do not `git add` it, and say so. No publish.

If the inventory finds nothing safely cuttable, cut nothing and say the page is
already as tight as its claims allow. That is the outcome on `/how` and it was the
right one.

## Constraints

- No claim removed unless a visible element already makes it in full.
- No rewriting of retained copy, no touching badge/filters/stats.
- Verify at mobile width; the badge is where the retained claim has to live.
- No commit of contested files, no publish, no outbound.
