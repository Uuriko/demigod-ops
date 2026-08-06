# Loop iteration BM — get the lead's decision, then execute it

## State

```
lead        grok, per the user
instruction "Only that disclaimer patch + test green. Stop there. Do not start
            favicon/wordmark, copy pass, or domain wiring until this is green and
            you report back."
status      green, committed, reported
reply       preamble only — grok is verifying read-only and will return
            VERDICT / EVIDENCE / FINDINGS / HANDOFF. replylen=310, no decision yet
```

## Why this, now

The user wants continuous work; the lead has explicitly gated further work on a
decision that has not arrived. Starting favicon or copy or domain now would
contradict the lead in the exact way I was told not to. Idling contradicts the
user. The resolution is to go get the decision.

There is also a real risk in waiting passively: grok is verifying my claims, and if
its verification finds one of them wrong, that is the most important thing on this
project and I should have it in hand rather than building on top of it.

## Task 1 — ask small

The last two calls were slow because I sent 1.5KB of context. Grok already has the
full picture from the report — it is actively reading the files. So the ask must be
tiny: a menu and a request for one letter.

Options already on the table:
```
(a) card title dedupe — "DASHA THESIS CARD" prints twice, header + first body line
(b) favicon / wordmark
(c) copy pass on the landing page
(d) domain wiring — canonical, og:url, og:image are all placeholder dashalabs.xyz
```

Ask for the letter and one line of reasoning. Nothing else. If grok returns a
verdict on my disclaimer work at the same time, that takes priority over the menu.

## Task 2 — if the verdict contradicts something I claimed, fix that first

I asserted several things: 266/280 at max field lengths, canvas still 1200×675, the
band is painted, zero innerHTML untouched, iframe contract untouched. If grok's
read-only check disputes any of them, that is a defect in my work and it outranks
every menu item. Re-verify the disputed claim myself before agreeing or disagreeing
— grok reading source is a different check from me driving the page, and today has
several examples of source-reading and rendering disagreeing, with rendering right.

## Task 3 — execute whatever comes back, exactly

Not a broader interpretation of it. The whole value of a lead is that scope is
decided once. If the answer is (a), do the one-line filter and nothing else. If it
is (d), wire the domain and do not also "improve" the meta tags while I am in
there.

## Task 4 — if grok does not answer

Two failed attempts is enough; a third long wait is not work. In that case pick the
item with the clearest cost of delay and say plainly that I chose it in the lead's
absence. Between the four, (a) is the smallest, is fully specified, was found by me
and confirmed visually, and cannot conflict with anything grok is mid-edit on —
whereas (d) needs a real domain nobody has given me.

## Constraints

- Do not start two items. One.
- Do not touch the iframe contract, form IDs, or the zero-innerHTML rule.
- Verify by rendering, not by reading source.
- Report back to grok after, as the lead asked.
