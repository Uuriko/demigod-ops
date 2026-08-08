# Loop iteration CN — make the landing page shorter, sharper, and cleaner underneath

## The instruction

"focus on landing page itself make it more concise and better design and better everything
and better code"

## Honest assessment of what I have built

The page has grown by accretion all day. Every addition was justified on its own and nobody
ever went back and cut. Current shape:

```
hero + example card artwork
Write one now            (the tool)
Your calls               (hidden when empty)
Three examples           (three cards + prefill buttons)
Three fields             (01/02/03 + the research note)
What the card proves / does not prove   (two columns, six claims)
What this is not         (six bullets)
footer
```

**Three of those sections say overlapping things about honesty.** "What the card proves /
does not prove", "What this is not", and the note under the tool output all cover the same
ground: no wallet, no safety score, timestamp unverified, not advice. I wrote in an earlier
prompt that three overlapping honesty blocks "read as anxiety, not candour" — then shipped
exactly that.

Underneath, the code has the same problem: **four separate `<script>` blocks** appended one
at a time across the day, and a stylesheet that grew a section per feature.

## Task 1 — cut, before improving anything

Concision is the explicit ask and it is also the biggest quality win available. Merge the
honesty content into **one** section rather than three.

The rule for what survives: keep every *claim*, drop every *repetition*. "No wallet
connection" does not need to appear three times. The strongest lines — that the timestamp is
local and unverified, that the checksum proves only that the text is unchanged, that nobody
is obliged to honour it — must all still be on the page, at full size, not softened.

Deleting an honest disclosure to save space would be the one unacceptable outcome here. Say
each thing once, plainly.

Then look at the rest with the same eye. "Three examples" and "Three fields" both teach the
same three fields. Consider whether the examples can carry that job alone, or whether the
01/02/03 cards can absorb the examples. Two sections teaching one idea is one too many.

## Task 2 — the code, which nobody has looked at as a whole

Four `<script>` blocks accreted independently: the tool's, the example prefill, the calls
module, the mint-from-link reader. Three of those are mine and do related work on the same
DOM.

Merge my three into one block. Constraints that are not negotiable:

- **Do not touch the tool's script.** It is grok's, it is drift-guarded, and it must stay
  byte-identical to the standalone.
- **The merged block must not contain the string `receipt-form`** — the drift guard finds the
  tool script with `find(x => /receipt-form/.test(x))`, which returns the *first* match, so a
  merged block mentioning it earlier in the document would be silently compared instead.
- Merged code must stay ordered after the tool's script.

Same for the stylesheet: it has a block per feature with repeated patterns. Consolidate what
genuinely repeats; do not invent an abstraction for two uses.

## Task 3 — design, meaning rhythm rather than restyling

The palette, type scale and component set were settled with grok and codex earlier and are
working. This is not a redesign.

What to look at: vertical rhythm between sections now that some are gone, whether the page
still leads with the tool quickly enough, and whether anything looks stranded once its
neighbour is cut. Render at 390 and 1440 and read it as a stranger.

Measure the result. Shorter should be *measurably* shorter — record indexable character
count and total page height before and after, so "more concise" is a fact rather than a
feeling.

## Task 4 — keep every guarantee

After cutting, all of these must still hold, and each has a test or a check:

- both suites pass, including the calls loop and mint-link assertions
- drift guards green — form markup and tool script identical to the standalone
- zero off-origin requests; still works from `file://`
- axe clean at 390 and 1440 with the rule count proving it ran
- **indexable content still above 2000 chars** — this task moves that number *down*, and it
  is the assertion most likely to break. If cutting takes it near the line, that is a signal
  the page lost substance, not that the threshold is wrong.

## Task 5 — note the test-infra debt, do not fix it here

Two real problems surfaced while restarting Chrome and they should not be silently forgotten:
the standalone suite now times out under headless, and the injected-auto-submit probe still
produces no assertion failure. Write them down. Do not chase them inside a design task.

## Constraints

- Never delete an honest disclosure to save space. Deduplicate wording, keep every claim.
- Do not touch the drift-guarded tool region or the tool's script.
- Merged script must not contain `receipt-form` and must stay after the tool's script.
- No new dependency, no external fetch, no build step.
- Measure before and after; "more concise" must be a number.
