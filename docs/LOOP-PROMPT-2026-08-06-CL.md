# Loop iteration CL — let the link carry the token, without ever guessing one

## State

```
named        "the tool will not do anything until you paste a Solana mint address, and a
             person being shown this will not have one to hand" — DASHA-WEBAPP-PLAN.md
promise      the page says, one section down: "We never guess an address."
built        examples prefill thesis + invalidation but deliberately NOT the address
blocked      Webflow OAuth, getdasha.com propagation, GitHub auth — all the user's
stale        DASHA-SHOW-THIS.md predates the loop, the manifest, and the catbox correction
```

## Why this, now

This is the single biggest friction in the product and it is entirely mine to fix.

Right now the first thing the tool demands is a 32–44 character base58 string. Nobody being
shown this has one. They will not type it, they will not go find it, and the demo dies at
field one — on a page whose whole argument is that writing the call takes thirty seconds.

The fix has to respect a promise the page makes explicitly: **"We never guess an address."**
That rules out defaulting to the `$dasha` mint, and it is why the worked examples fill the
thesis and invalidation but leave the address alone. That was the right call and it stays.

But there is a version that does not violate it at all. **If the mint arrives in the URL, we
are not guessing — we are using what the link carried.** Someone clicking "write a thesis on
this" from the Desk has already chosen the token; the Desk knows the mint; passing it along
is transmission, not invention.

That turns the worst moment in the product into a single click, and it is the thing that
makes the Desk and the tool one product rather than two pages sharing a name.

## Task 1 — read a mint from the URL and prefill it

Accept a query parameter and put it in the address field. Same architecture as everything
else I have added: **a module outside the drift-guarded tool region**, reading and writing
the DOM the tool already owns. The tool's own validation stays untouched — it is grok's, it
is shared, and it works.

Rules that are not optional:

- **Validate before inserting.** Use the same base58 shape the tool itself requires. A
  parameter is attacker-controlled input; anything that does not look like a mint is ignored
  entirely rather than shown.
- **Set `.value`, never markup.** Assigning to a form field's value is inert; building HTML
  from a URL parameter would be an injection hole in a page that currently has none.
- **Never auto-submit.** Prefilling saves typing; submitting on someone's behalf creates a
  record they did not write. This product is about deliberate claims — generating one for
  them would be the exact opposite of the point.

## Task 2 — make it visible that the link supplied it

A field that silently fills itself is worse than an empty one, because the person cannot tell
where the value came from and has no reason to trust it.

Show a short, plain note when a mint arrives from the URL — that it came from the link, and
that it can be changed. This is the same instinct as the "proves / does not prove" panel:
when the product does something on the user's behalf, say so in normal-sized type.

## Task 3 — keep the promise literally true

"We never guess an address" must remain accurate after this change. It does — a mint in the
URL is supplied, not guessed — but the honesty strip should say so plainly rather than
relying on a distinction the reader has to work out.

Adjust that line so it covers both cases in one sentence, and do not weaken it. If the
clearest wording ends up longer, take the longer wording.

## Task 4 — write the Desk hand-off link down

The point of this is that the Desk can link into the tool with the token already chosen. Spec
the exact URL shape for grok, who owns that page. One line, unambiguous, with the parameter
name and an example — not a description of a URL.

Do not edit `dasha-desk`.

## Task 5 — gate it, and prove it red

Three assertions worth having: a valid mint in the URL lands in the field; **an invalid one is
ignored**; and no card is generated without an explicit submit. The middle one is the security
assertion and it is the one most likely to rot.

Prove each fails before trusting it, and **commit the baseline first** — my last probe run
restored via `git checkout` and destroyed uncommitted work, which made three unrelated
assertions fail and cost a full debugging cycle.

## Task 6 — refresh the handoff doc

`DASHA-SHOW-THIS.md` is now wrong in three ways: it predates the calls loop, it predates the
installable manifest, and it calls the catbox copy a backup when I have since established it
is an older build with a different title. Fix all three.

## Constraints

- Nothing inside the drift-guarded tool region.
- Validate the parameter against the tool's own address shape; ignore anything else.
- `.value` only — never build markup from a URL parameter.
- Never auto-submit.
- "We never guess an address" must stay literally true.
- Commit the baseline before proving assertions red.
