# Work order — test the promises, not the happy path

Everything cheap is done. What remains untested is the set of claims this project makes about
itself, under the conditions where they would actually matter. Each task below verifies a promise
the project has already made in public — not a feature we might add.

Order is by consequence to a real person, highest first.

## Task 1 — the Desk when its data sources fail

The Desk's own README promises: *"Third-party links and data can fail; the mint and source paths
should remain usable when they do."* Nobody has ever tested that. The Desk pulls live market data
from third parties, and third parties go down, rate-limit, and return garbage.

Simulate each failure independently, with the page actually rendering:

- the market data endpoint returns 500;
- it times out entirely;
- it returns 200 with malformed JSON;
- it returns 200 with plausible but wrong shapes (null fields, strings where numbers go).

For each: does the **mint stay visible and copyable**, do the **independent source links still
work**, and does the page say something honest rather than showing a stuck spinner or a silent
zero? A price that renders as `0` or `NaN` during an outage is worse than no price — it is a false
statement.

Fix what breaks. If nothing breaks, say so plainly and add the case to a gate so it stays true.

## Task 2 — accessibility on what is actually served

Every axe run so far has been against local files. The live pages are assembled differently: the
host page's stylesheet, the Studio inside a shadow root, a third-party swap plugin. That is a
different document, and it is the one people use.

Run axe against all three live routes at 390px and desktop. Report serious and critical only, and
separate what we own from what the embedded third-party plugin brings — we can fix ours, and we
should know which is which rather than reporting a number nobody can act on.

## Task 3 — is everything on the live pages true

An honesty audit of live copy, read as a hostile stranger would read it. For every factual claim
on the three routes, ask: can this be checked, and is it still true today?

Particular attention to claims that decay: counts, "verified", "official", anything about who is
involved, anything asserting what a link will do. The project's whole differentiator is not
overclaiming, which means a stale true-when-written claim is a bigger problem here than elsewhere.

Two known live items to resolve, not to re-litigate: the missing CC0 dedication, and the footer
disclaimer written when the project was believed unaffiliated.

## Task 4 — the docs contradict each other

There are now over forty `DASHA-*.md` files. Find the places where two of them state incompatible
things as current, and fix by making one the owner and having the other link to it. Do not create a
new document to resolve a documentation problem.

Report the contradictions found even where the fix is somebody else's call.

## Constraints

- Publishing, outbound posts and money movement stay out of scope; propose them, do not do them.
- Every fix leaves a runnable check behind, or it is not finished.
- Prefer deleting to adding. If a promise is not worth keeping, the honest fix may be to stop
  making it rather than to build machinery that keeps it.
- Report what you could not test and why.
