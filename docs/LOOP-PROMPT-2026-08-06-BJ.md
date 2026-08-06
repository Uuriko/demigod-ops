# Loop iteration BJ — every place a scrub rewrites the page, not just the one I tripped over

## State

```
found      source: "We do not promise fill days or a replacement guarantee."
           rendered: "…or a Human-reviewed matching."   — broken English, live
cause      a scrub rewrites a banned phrase wherever it appears, negation or not
promised   BI Task 4: "check for siblings… does any other rendered sentence differ
           from its source in a way that breaks grammar or reverses meaning?"
not done   I fixed the one and stopped
```

## Why this, now

I found that defect because a sentence did not parse while I was reading `/pricing`
for a different reason. That is luck, not method, and luck does not scale to
fourteen routes.

The mechanism generalises: `DG_PAGES` holds source copy, scrubs rewrite it at
render time, and **nobody compares the two**. Every gate here reads one side or the
other. The honesty audit reads the rendered page and asks "is a banned phrase
present" — it would report green on "we do not promise a Human-reviewed matching",
because the banned phrase is gone. The broken grammar is invisible to it by design.

A scrub that fires inside a negation is the specific harm, and there is no reason
to think it happened exactly once.

## Task 1 — build the source-vs-rendered diff

For each mini-page in `DG_PAGES`:

1. Extract the page's source `html` string from `demigod-foot-core.js` and strip
   tags to plain sentences.
2. Render the same route with the disk build injected and read `#dg-page` innerText.
3. Diff sentence by sentence. Report every sentence where source ≠ rendered.

A difference is not automatically a bug — scrubs exist for good reasons and some
rewrites are correct. The output of this task is a **list of rewrites**, not a list
of defects.

Do not use my scrub-pair parser to predict which fire. It reported zero firing on a
sentence that demonstrably gets rewritten; the regex could not parse the real
pattern. **Render, then compare.** The page is the authority.

## Task 2 — classify each rewrite

For every source≠rendered pair:

- **Correct** — the scrub replaced an overclaim with an honest phrase and the
  result reads properly. Leave it.
- **Mangled** — the result is ungrammatical, like the pricing one. Fix by rewording
  the source so the scrub does not need to fire.
- **Meaning reversed or weakened** — the worst case. A scrub that turns a refusal
  into a claim, or vice versa. This outranks everything else in this prompt; report
  it immediately and fix it first.

Read each rewritten sentence out loud in your head. The pricing bug was obvious the
moment it was read as English and invisible in every automated check.

## Task 3 — fix by rewording the source, never by weakening a scrub

Same reasoning as the pricing fix, restated so it is not re-litigated per sentence:
regex negation-detection is fragile, the scrubs protect live honesty claims, and a
banned phrase is banned because the claim is unbacked — a refusal is not a licence
to allow it elsewhere.

For each reworded sentence: test it against **every** BANNED pattern before
writing, so the fix does not swap one banned phrase for another. Verify in the
RENDERED page, not the source.

## Task 4 — report the count, and say if it is one

If the pricing sentence turns out to be the only mangled one, say so plainly. "One
defect, now fixed, and the other N rewrites are correct" is a good result and means
the scrub set is in better shape than the single bug suggested. Do not inflate the
finding.

## Constraints

- Foot lock for any foot-core edit; re-check mtime after claiming; release after.
- Do not weaken, narrow, or remove any scrub or banned-phrase rule.
- Compare rendered text, not parsed patterns.
- No commit of contested files, no publish, no outbound.
