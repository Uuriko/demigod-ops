# Loop iteration BN — read the lead's work on disk instead of waiting on its chat

## State

```
lead        grok. Three grok-ask calls returned only the preamble
            ("I'll inspect … then return VERDICT/EVIDENCE/FINDINGS/HANDOFF"),
            replylen 310 / 3852 / 310, no decision in any
done        landing page, OG card, tool embed, disclaimer on 3 surfaces, title
            dedupe — all committed
open        (b) favicon/wordmark  (c) landing copy pass  (d) domain wiring
```

## Why this, now

Asking a fourth time is not work. But grok is not idle — it told me it was
inspecting the files read-only, and it has been editing Dasha files on disk all
session (it renamed the card, added a short share-text disclaimer, and wrote
`dasha-conviction-receipt.test.mjs` while I was mid-audit).

So the lead's actual direction may already exist as **artifacts** rather than as a
chat reply: an updated brief, a new test assertion, a TODO in a file, or a change
that implicitly answers the menu. Reading that is faster and more reliable than a
fourth round trip, and it is the same discipline I applied all day on Demigod —
when a channel is unreliable, go and measure the thing itself.

## Task 1 — diff the Dasha surface for anything grok changed since my last read

Check modification times and content on every Dasha file:
`DASHA-PRODUCT-BRIEF.md`, `dasha-conviction-receipt.html`,
`dasha-conviction-receipt.test.mjs`, plus anything new matching dasha/coin.

For each: has it changed since I last touched it, and does the change say anything
about what to do next? A new acceptance check in the test is a direction. A new
line in the brief is a direction. A rename is not.

**Be careful about my own edits.** I changed the receipt and the test myself, so a
recent mtime is not evidence grok did anything. Compare content, and attribute
honestly — three times today I have mistaken my own footprint for someone else's.

## Task 2 — re-read the brief's own next-step list

The brief already contains an ordered expansion plan and an explicit gate:
*"Next only after usage: permanent server-stamped receipts, outcome snapshots at
the chosen horizon, public profiles, opt-in leaderboards scored for calibration
rather than raw return."* And: *"Avoid wallet connection, trading, paid promotion,
or token launch mechanics until identity, legal, security, and moderation
requirements are settled."*

That is the lead's written direction, and it predates the chat outage. If the brief
answers the menu, follow the brief rather than inventing a fifth option.

## Task 3 — pick the item the brief supports, and do only that

Of the three open items:

- **(d) domain wiring** cannot be done: no real domain exists anywhere in the repo,
  and guessing an absolute URL is worse than a placeholder because it aims the
  social unfurl at a host that will not serve the image. This needs the user.
- **(b) favicon/wordmark** is a genuine gap — the page has no icon at all, so a
  browser tab shows a blank sheet, and it is fully in my control with no external
  dependency.
- **(c) copy pass** is the riskiest without a lead: the landing copy is mine, and
  rewriting my own prose uninstructed is the least verifiable kind of change.

Unless the disk says otherwise, (b) is the honest pick: smallest, self-contained,
no dependency on anyone, and a real defect rather than a preference.

## Task 4 — if I build the icon, hold it to the same bar as the rest

- Original artwork. Inline SVG favicon plus a PNG fallback for platforms that
  ignore SVG icons.
- Palette from the page, so a tab, a bookmark and the OG card read as one product.
- No ticker, no coin glyph, nothing that implies a market or a price.
- Verify by rendering at 16px and 32px and **looking at it** — an icon that is
  legible at 512 and mud at 16 is the normal failure, and I have made the
  scaled-down-type mistake three times today.

## Constraints

- One item. Do not also do the copy pass while I am in the file.
- Do not invent a domain.
- Verify by rendering, not by reading markup.
- Report to grok after, as the lead asked, even if the channel is one-way.
