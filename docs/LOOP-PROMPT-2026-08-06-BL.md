# Loop iteration BL — the disclaimer the brief requires, on the artifact that leaves the site

## State

```
brief       "Every generated receipt includes thesis, invalidation, horizon, UTC
            timestamp, fingerprint, Solscan link, risk disclaimer, and downloadable
            social card."
verified    receipt body carries: title, Created, Token, Confidence, Horizon,
            Thesis, "Invalid if" — and NO disclaimer
verified    the 1200x675 canvas card has exactly three fillText calls: the title,
            the wrapped thesis lines, and the fingerprint — NO disclaimer
found       by functionally driving the tool, not by reading it
not fixed   it is grok's file; I flagged it and moved on
```

## Why this, now

Everything else open on Dasha needs the user (the real domain) or is cosmetic. This
is a stated acceptance check that fails, on the single artifact designed to leave
the site and be posted publicly.

The share card is a 1200×675 PNG carrying a token address, a thesis and a
cryptographic fingerprint. It is built to be screenshotted into a timeline where
none of the page's context travels with it. Of everything in this product, it is
the one surface where "not financial advice" is not boilerplate — it is the only
thing standing between a personal note and something that reads like a call with
an official-looking receipt attached.

The tool is otherwise careful: no wallet, no innerHTML, correct base58 validation,
local rejection of bad input. This gap is inconsistent with the rest of it, which
is usually a sign it was an oversight rather than a decision.

## Task 1 — establish it is safe to edit the file

`dasha-conviction-receipt.html` is grok's. Check `git status` for it:

- **Clean/committed** — normal collaboration, edit it.
- **Uncommitted** — grok may be mid-edit. Do NOT edit; write the patch to a doc and
  say so. All session I have refused to `git add` contested files for exactly this
  reason, and the rule does not change because the project changed.

Also re-read the current file before patching. It may have moved since I audited it.

## Task 2 — put the disclaimer in all three places, not one

There are three distinct artifacts and they need it independently:

1. **The receipt body** — the text shown on the page and copied to clipboard.
2. **The share text** — what is pre-filled into the X intent URL.
3. **The canvas card** — the downloadable PNG. This one matters most and is the
   one most likely to be skipped, because it needs a `fillText` rather than a
   string append.

Keep it short. "Not financial advice · Own research required" or similar. It has to
survive at thumbnail scale on the card, so it needs a real font size, not 12px in a
1200px canvas — a mistake I made twice today with SVG type and caught by measuring.

## Task 3 — do not break what already passes

The tool currently satisfies acceptance checks I verified by driving it. Re-verify
every one after the edit, not just the new behaviour:

- Every user-facing write still uses `textContent`, zero `innerHTML`.
- Invalid address still rejected locally, output still hidden.
- Valid input still produces timestamp, token, confidence, horizon, thesis,
  "Invalid if", fingerprint, and an `encodeURIComponent`'d Solscan link.
- All controls still ≥48px, no horizontal overflow, no page errors.
- The canvas still renders and downloads.

The fingerprint is a SHA-256 of the receipt body. **Adding a line to the body
changes every fingerprint.** That is correct — the fingerprint should cover the
disclaimer too — but confirm the hash is still computed over the final text and not
over a stale variable.

## Task 4 — verify by rendering, and look at the card

Drive the form, generate a receipt, and read the actual output. Then render the
canvas to a PNG and **look at it** at thumbnail size. Both visual defects found
today were invisible in the DOM and obvious in a picture.

## Constraints

- Do not edit the file if it is uncommitted; write the patch out instead.
- No new dependencies, no network calls, no wallet anything.
- Keep the disclaimer short enough not to crowd the card's thesis area.
- Verify every prior acceptance check, not only the new one.
