# Loop iteration BT — diagnose the live `label` violation, and retire the fake domain

## State

```
live page   https://johns-awesome-project-39b1b5.webflow.io/dasha  HTTP 200
axe (live)  88 rules evaluated · 2 serious: html-has-lang(1), label(1)
roadmap     recorded html-has-lang, canonical, og:url — but NOT the label violation
my page     canonical / og:url / og:image all point at https://dashalabs.xyz/,
            a domain I invented because I had not found the real one
```

## Why this, now

`label` is a serious axe violation meaning a form control has no accessible name.
On a page whose entire purpose is a form, that is not cosmetic — a screen-reader
user reaches an input that announces nothing. It is also **not in the roadmap**,
so nobody is tracking it, and it will survive the Phase 0 fixes that are being
tracked.

Diagnosing it costs one run and produces something immediately actionable: the
selector, the element, and what to add. Whoever edits the Webflow page then has a
one-line change rather than a rediscovery.

The domain is the second item and it is now a defect rather than a placeholder. A
canonical pointing at a domain that does not resolve is worse than none: it tells
crawlers the authoritative copy lives somewhere that will never answer, and it aims
the social unfurl at a host that cannot serve the image. I invented `dashalabs.xyz`
in the absence of information; that absence is over.

## Task 1 — pinpoint the live `label` violation

Re-run axe against the live URL and pull the **node detail**, not just the rule id:
the failing selector, its HTML, and axe's own failure summary. Report the element
verbatim.

Then say what would fix it in the smallest way — a `<label for>`, an `aria-label`,
or a `title` — and which is appropriate for that control. Do not guess from the
rule name; axe's failureSummary states which techniques would satisfy it.

Also confirm the violation is attributable to page code rather than to Webflow
chrome or an injected badge. The roadmap already notes an injected Webflow badge
sitting outside a landmark, so a defect owned by the platform is a different
conversation from one owned by the page.

## Task 2 — replace the invented domain with the real one

Set `canonical`, `og:url` and `og:image` on `dasha-landing.html` to the live origin.
All three together — a canonical and an og:url that disagree is its own defect.

Be honest about the uncertainty in the file and the report: `johns-awesome-project-39b1b5.webflow.io`
is a Webflow staging-style host, and a custom domain may be intended. But it is the
only origin that resolves today, and pointing at a live host beats pointing at a
fiction. Note that all three change together if a custom domain arrives.

`og:image` needs the card to actually be reachable at that origin — it is not
deployed there yet. State that plainly rather than implying the unfurl works.

## Task 3 — re-run the gate, and check the drift guard did not trip

`dasha-landing.test.mjs` asserts all three are absolute https URLs, so changing them
must keep it green. The markup/script drift guards compare against the standalone,
which I am not touching, so they should be unaffected — confirm rather than assume,
since I have twice today had a guard fail for a reason unrelated to what I changed.

## Task 4 — write both into the audit doc

The live `label` finding belongs in the audit as a new defect with its selector, and
the domain change belongs there as a resolved item with its caveat. The audit is the
handover artifact; a fix that only exists in a commit message is not handed over.

## Constraints

- Read-only against the live site. No Webflow edits — that page is not mine.
- Do not touch `dasha-conviction-receipt.html`; the drift guards depend on it.
- All three URL tags change together or none do.
- Report the label element verbatim; a paraphrased selector is not actionable.
