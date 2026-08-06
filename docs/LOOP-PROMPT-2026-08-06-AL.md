# Loop iteration AL — the classifier says "hiring" when someone announces a new job

## State

```
site       held — foot-core still moving, uncommitted tree grown to 177 files
external   fully mapped; everything remaining needs the user's accounts
open       X classifier false positive — found, named, deferred with the words
           "deserves its own fixture", not yet done
staging    13 rows kept today; --review now makes them readable
```

## Why this, now

When I added `--review` to the X collector it immediately exposed two problems. I
fixed one (near-duplicate reposts inflating one opening into three leads) and
explicitly left the other, writing that it "deserves its own fixture."

That is a named, unfixed defect with a stated reason for deferral, and deferrals
like that are exactly what I have spent this session finding un-actioned elsewhere
— the heading rename that stayed live for days, the backup timer that was never
installed, the fix named in yesterday's audit. The rule I keep applying to past
work applies to my own open item.

The defect, concretely: a post reading roughly *"after nine years at Amazon I've
joined @somecompany as founding engineer"* is classified `hiring: yes`. That is
someone **announcing they took a job**, not a company hiring. The classifier sees
"founding engineer" plus an SF signal and fires.

This is a precision problem in a tool whose entire value is surfacing a short,
triageable list. Every false positive costs a human read, and a list that is
mostly noise stops being read at all — which is how the tool becomes decorative.

## Task 1 — read `classifyPost` before changing anything

Establish exactly how `hiring` is decided today: which patterns set it to `yes`,
what `needsReview` means, and whether there is already any negative signal.

Then characterise the failure honestly. Is it that the hiring patterns are too
broad, or that there is no "someone is announcing their own move" signal at all?
Those need different fixes and guessing between them produces the wrong one.

Check the real staged rows for how common each shape is — with 13 rows there is
enough to see whether this is one odd post or a systematic class.

## Task 2 — fix precision without destroying recall

The tempting fix is a keyword blocklist. Be careful: "joined", "excited to
announce", "I'm now" also appear in legitimate company posts ("excited to announce
we're hiring"). A naive block will silently drop real leads, and dropped leads are
invisible — nobody notices the post that never appeared.

Requirements:

- **First person about the author's own move** is the signal to catch: "I joined",
  "I'm joining", "I've joined", "my new role", "starting at". Not "we're hiring",
  "join our team", "we just added".
- Recall matters more than precision here, because this is a human triage queue,
  not an automated action. When genuinely ambiguous, keep the row and let
  `needsReview` carry it — dropping is worse than surfacing.
- Consider whether the right outcome is `hiring: no` or a distinct classification.
  A person who just joined a startup as a founding engineer is arguably a *signal
  about that company*, just not a hiring signal. Do not invent a feature — but if
  the honest classification is "not hiring" rather than "discard", say so.

## Task 3 — the fixture, built without committing scraped personal posts

The staged rows are real posts by real people. **Do not commit them.** Write
fixtures that reproduce the linguistic shapes — first-person announcement, company
hiring post, ambiguous case — in synthesized text. No real handles, no real names,
no copied post bodies.

That is not only a privacy matter: a fixture built from today's scrape rots the
moment the scrape changes, and a test pinned to one person's phrasing tests that
phrasing rather than the rule.

Cover at minimum: the announcement false positive, a genuine company hiring post
that must still pass, "excited to announce we're hiring" (the trap the blocklist
would break), and an ambiguous case that should survive as `needsReview`.

## Task 4 — prove it non-vacuously, and check for the degenerate shape

Break the new logic and watch it go red with a message naming the case. Then check
the fixture the way iteration S taught: would every assertion still fail if the
subject were reverted? Three fixtures this session passed while proving nothing —
single-word company keys, a moved constant, a non-hex secret.

Run `demigod-x-hiring.mjs --selftest` and re-run `--review` against the real
staging file to see whether the count changes and in which direction. Report the
before/after numbers, including any legitimate row that got dropped.

## Constraints

- No network calls. `--selftest` and `--queries` are offline; the collector's
  network path must not run.
- No real post text, handles, or names in any committed file.
- No foot-core, no head, no CSS. No publishing, no outbound.
- Read all command output.
