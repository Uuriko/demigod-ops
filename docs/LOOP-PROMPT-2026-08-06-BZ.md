# Loop iteration BZ — test the deploy that has never been tested, and reconcile the two surfaces

## State

```
tested        dasha-landing.html served at the ROOT of a local server, every time
never tested  the same page served from a SUBPATH — which is where it may actually land
never done    the two Dasha surfaces checked AGAINST EACH OTHER rather than each alone
pending you   which of the two pages is "the" landing page
blocked       deploy, git push
```

## Why this, now

Two things here are decision-independent — they need doing whichever page you pick — and
one of them is a live defect class I have never once exercised.

**Every test run has served the page at `/`.** `dasha-landing.test.mjs` spins up a server
whose only route returns the landing page, so the document is always at the origin root.
That is not necessarily where it deploys. The live origin already serves the desk at
`/dasha`, so a subpath is the *likely* case, not the exotic one.

Three things break differently at a subpath and none are covered:

- `./dasha-conviction-receipt.html` — the fallback link, and the only route to the tool if
  the inlined copy fails. At `/dasha/` it resolves to `/dasha/dasha-conviction-receipt.html`,
  which only works if the file is deployed alongside. Nobody has said it will be.
- `og:image` is absolute and points at **origin root** `/dasha-og-card.png`. If the page
  deploys to a subpath and the card deploys next to it, the meta tag points at a 404 and
  the unfurl is blank — while the gate stays green, because the gate asserts the tag is a
  well-formed https URL, not that anything is there.
- `#tool` and `#how` are same-document fragments and are fine — worth confirming rather
  than asserting from memory.

**The two surfaces have never been checked against each other.** I audited the landing
page and I audited `dasha-desk`, separately, against the brief. I never asked whether they
*contradict*. If both ship — which is the most likely outcome regardless of which one is
called "the" landing page — then contradictions between them are the defect, and neither
single-surface audit could have found one.

## Task 1 — serve the landing page from a subpath and see what breaks

Serve it at something like `/dasha/` with the sibling files present, and separately with
them absent. Check, by loading rather than by reasoning:

- does the fallback link resolve, or 404
- does `dasha-og-card.png` resolve at the URL the meta tag actually names
- do the in-page fragments still work
- does the favicon still render (it is a data URI, so it should be immune — confirm)

Report what breaks and at which of the two layouts. Do not fix by guessing a base href;
the correct fix depends on where the user deploys, which is not yet known.

## Task 2 — write the deploy requirement down as a checklist, not prose

Whoever deploys needs to know exactly which files must sit where for the page to be
correct rather than merely to render. At minimum: the landing page, the standalone, the
OG PNG, and what `canonical`/`og:url`/`og:image` must be changed to for each candidate
location. Three tags that must change together, as established.

Make it a table someone can execute without reading the rest of the audit.

## Task 3 — reconcile the two surfaces against each other

Put the desk and the landing page side by side and look for contradictions a reader moving
between them would notice:

- **Naming.** "Dasha Labs" vs "dasha desk" vs whatever the desk calls itself. Two names for
  one project reads as two projects.
- **Disclaimers.** Both carry risk language. Do they say the *same* thing? A weaker
  disclaimer on one surface undermines the stronger one on the other — a reader who sees
  both learns the strong one is optional.
- **Token claims.** The landing page says "no safety score", "we never guess an address",
  "no price prediction and no signal". The desk shows live Dex numbers and a candidate
  mint. Are those consistent? They can be — showing evidence is not scoring — but the
  wording has to actually hold, and "no price prediction" sitting next to a live price
  needs to be read carefully rather than assumed fine.
- **Endorsement boundary.** The brief is explicit that control and authorization are not
  established. Both surfaces must hold that line identically.

Quote exact wording for anything flagged. Paraphrase is not an audit — the exact words are
what a reader sees.

**Read-only on `dasha-desk`.** It is grok's, it has uncommitted work, and my last report
into that repo was stale because I did not re-check before sending. Re-read the current
files before claiming anything about them.

## Task 4 — do not let a finding go stale again

The `#dd-share` report went out describing a state three commits old. Before reporting
anything from Task 3, re-read the file at its current commit and quote from that read, not
from an earlier audit section. If a claim comes from an earlier pass, re-verify it or drop
it.

## Constraints

- Read-only against `dasha-desk`; no edits, no commits in that repo.
- Do not change `canonical`/`og:url`/`og:image` — the correct values depend on a decision
  that has not been made. Document what they must become; change nothing.
- Do not add a `<base>` tag or rewrite links to absolute on a guess about the deploy path.
- Quote exact wording for every contradiction claimed.
- Zero contradictions is a legitimate result and must be stated plainly if that is what I find.
