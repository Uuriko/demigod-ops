# Loop iteration BI — a copy scrub is mangling a sentence on the live pricing page

## State

```
source     "We do not promise fill days or a replacement guarantee."   (foot-core)
live       "We do not promise fill days or a Human-reviewed matching."
found by   inventorying /pricing for the copy-trim pass; the sentence did not parse
severity   live, user-facing, on the page where money is explained
```

## Why this, now

This is the highest-severity live defect found this week. The other two were
visual — a chip's text outside its pill, a missing chevron. This is **broken
English on the pricing page**, and worse, it is the product's own honesty
machinery breaking its own copy.

The source sentence is a **refusal**: *we do not promise a replacement guarantee.*
That is exactly the kind of claim this codebase exists to make truthfully. A scrub
exists because "replacement guarantee" is a banned phrase — it is on the
`demigod-live-honesty-audit` BANNED list as an unbacked claim. But the scrub
rewrites the phrase wherever it appears, without noticing it is inside a negation,
so an honest refusal becomes a grammatical error.

The irony matters for the fix: the gate is doing its job and the copy is honest.
The bug is that a blanket find-and-replace cannot tell "we promise X" from "we do
not promise X".

## Task 1 — find the scrub that actually fires

The obvious candidate in `demigod-head-minimal.html` is
`[/90-?\s*day replacement guarantee/gi,'Human-reviewed matching']`, and it does
**not** match "a replacement guarantee" — verified, no 90-day prefix present. So
something else is doing it.

Search both `demigod-head-minimal.html` and `demigod-foot-core.js` for every
rewrite pair producing "Human-reviewed matching", and determine which one matches
the live source string. **Prove it** by running the candidate patterns against the
exact source sentence rather than reading them and deciding.

## Task 2 — choose the fix that keeps both the refusal and the gate

Three options, and the choice matters:

- **Narrow the scrub** so it does not fire inside a negation. Fragile: regex
  negation detection is a classic source of new bugs, and this scrub protects a
  live honesty claim.
- **Reword the source** so the refusal does not contain the banned phrase. Keeps
  the gate blunt and simple, keeps the meaning, costs nothing.
- **Exempt the phrase from the ban.** Wrong — the ban exists because the claim is
  unbacked, and a refusal is not a reason to allow the claim elsewhere.

Prefer rewording the source. The refusal must survive in meaning: the page still
has to say the product does not promise a replacement guarantee, without using the
banned words. Check the reworded sentence against the BANNED list before writing
it — replacing one banned phrase with another would be worse than the bug.

## Task 3 — verify against the scrub, not just the source

- Render `/pricing` with the disk build and read the **rendered** sentence. The
  whole point is that source and rendered differ here.
- Confirm the refusal survives in meaning and reads as English.
- Confirm the honesty audit still passes — the scrub must remain able to catch the
  banned phrase if it appears somewhere it should not.
- `bin/dg ship prepare`, board-honesty and verify-source.

## Task 4 — check for siblings

A blanket scrub that mangled one negation may be mangling others. Take every
rewrite pair and test it against the source copy for all mini-pages: does any other
rendered sentence differ from its source in a way that breaks grammar or reverses
meaning? Report the count, including zero.

## Constraints

- Foot lock for the foot-core edit; re-check mtime after claiming; release after.
- Do not weaken or remove any banned-phrase rule.
- No commit of contested files, no publish.
- Prove which scrub fires before changing anything.
