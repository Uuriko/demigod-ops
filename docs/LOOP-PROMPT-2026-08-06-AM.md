# Loop iteration AM — ASCII punctuation assumptions in patterns that read the real world

## State

```
found      HIRING_RE was /we'?re hiring/ with a STRAIGHT apostrophe. X renders
           U+2019, so every smart-quoted hiring post was dropped — never staged,
           never missed, because an absent lead leaves no trace.
fixed      apostrophe made a character class across three patterns in x-hiring
class      a regex over EXTERNAL text that assumes ASCII punctuation loses data
           silently. x-hiring is one instance; I have not looked for others.
```

## Why this, now

The smart-quote bug was found by accident — a fix of mine had zero effect and I
checked why instead of moving on. It had been losing real leads indefinitely and
nothing would ever have surfaced it.

That failure has a shape, and the shape is not specific to X:

- **Real-world text is not ASCII.** Scraped posts, ATS job titles, company names,
  and form submissions carry curly quotes (U+2018/2019/201C/201D), en and em
  dashes (U+2013/2014), non-breaking spaces (U+00A0), and ellipsis (U+2026).
- **A regex that assumes `'`, `-`, or ` ` silently under-matches.** No error, no
  log, no failed test — just fewer rows than there should be.
- **Under-matching is invisible.** Over-matching produces junk someone notices.
  Under-matching produces a shorter list that looks correct.

Every collector and parser in this repo reads text somebody else wrote. If one had
this bug, others plausibly do, and none of them would tell me.

## Task 1 — enumerate patterns that match EXTERNAL text

The scope is deliberately narrow: regexes applied to text that came from outside
this machine. Scraped posts, fetched job boards, HN threads, form submissions,
map/company descriptions.

**Not in scope:** patterns over internal identifiers, file paths, our own schema
keys, version strings, or config. Those are ASCII by construction, and widening
them adds risk for no benefit.

Likely places: `demigod-hn-hiring.mjs`, the ATS/board parsers, role title
normalisation, company-name matching, `demigod-roles-feed.mjs`, and anything
feeding the role ledger.

For each pattern, ask: could the text it matches plausibly contain a curly quote,
a long dash, a non-breaking space, or an ellipsis where this expects the ASCII
form? Read the pattern, do not pattern-match on the pattern.

## Task 2 — prove each candidate with a failing input before changing it

For every suspect, construct the Unicode variant and show it fails today. **No
speculative widening.** A change with no demonstrated failing case is a guess, and
this session has enough examples of me acting on a plausible-sounding claim I had
not tested — the Firecrawl block, the backup timer, yesterday's "present-but-empty"
fix that turned out unnecessary.

If a pattern is fine, say so and move on. Zero findings is a legitimate result and
much better than four speculative edits.

## Task 3 — fix by widening, never by swapping

Where a real failure exists:

- Add the Unicode variant **alongside** the ASCII form. Never replace it. The
  x-hiring fix kept straight quotes working and asserted it, because a swap trades
  one silent loss for another.
- Prefer a shared, named constant over sprinkling character classes. If several
  patterns need the same widening, one exported constant is the smaller diff and
  the thing a future reader can find.
- Do not normalise the stored text. The row keeps what the source actually wrote;
  only the MATCH is widened. Rewriting a person's post into ASCII before storing
  it would be inventing content, and provenance is the point of these stores.

## Task 4 — one guard, proven, that covers the class

A single test asserting the Unicode variants match wherever the ASCII ones do.
Prove it by narrowing one pattern back and watching it go red naming that pattern.

Then check the degenerate shapes this session keeps producing: does every
assertion still fail when the subject is reverted, and does the fixture depend on
a constant another module could move?

## Task 5 — report the count, including zero, and the exposure

Say how many patterns were checked, how many were genuinely broken, and — for each
real one — what data it was losing and for how long if that is knowable.

Do not report a widened pattern as a bug fixed unless a failing input was
demonstrated first.

## Constraints

- No foot-core, no head, no CSS — the copy-scrub patterns live there and it is
  still held.
- No network calls; construct inputs locally.
- No publishing, no outbound.
- No stored text is rewritten — matching widens, content does not change.
- Read all command output.
