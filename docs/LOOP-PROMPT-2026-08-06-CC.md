# Loop iteration CC — review the page the user will actually show, as a viewer

## State

```
user need    show the landing page and website to people ASAP
will show    https://johns-awesome-project-39b1b5.webflow.io/dasha  — the Desk, grok's,
             and per DASHA-PRODUCT-BRIEF.md THE landing page
what I did   audited its CLAIMS (read-only, truth boundaries) and ran axe once at 1280
what I never did   looked at it. At 390. As a person being shown a link.
unknown      what appears when that URL is pasted into X, Discord or iMessage
ownership    grok owns every edit here. I report; I do not touch.
```

## Why this, now

The user is about to put a URL in front of other people, and it is not my page — it is the
Desk. Everything I have polished today is the *tool*. I have spent the day making the
surface that is not being shown look excellent, and I have never once rendered the surface
that is.

The specific risk is the one I already flagged on my own page and never checked on theirs:
**the link preview**. I know my page unfurls blank because the card is not deployed. I do
not know what the Desk does. If the user pastes the Desk link into a group chat and it
comes back as a bare grey box with a staging-looking hostname, that is the first
impression, and it happens before anyone clicks.

That is checkable in one pass, read-only, right now.

Second: I ran axe against the live page once, at 1280, while chasing a specific violation.
I never ran it at the widths people actually use, and I never looked at the rendering at
all. A page can be axe-clean and still be visually broken on a phone — the two new sections
I shipped today were axe-clean at both widths and I still had to look before I trusted them.

## Task 1 — render the live Desk at 390 and 1440 and read it

Look at it the way someone being shown a link looks at it. Note anything that would make a
stranger hesitate: overflow, truncation, unreadable type, a control that looks broken, a
number that renders as `NaN` or `--` because a live data fetch failed.

That last one deserves attention: the Desk pulls **live Dex numbers**. A page whose live
data is failing shows its worst face to exactly the audience being courted, and it fails
silently. Check what the price and liquidity fields actually contain right now, not whether
the code that fills them looks correct.

## Task 2 — the link preview, which is the real deliverable here

Fetch the raw HTML of the live page and extract what a link unfurler reads: `og:title`,
`og:description`, `og:image`, `twitter:card`, and the `<title>`.

Then **resolve the `og:image` URL and check it returns an image**. A well-formed meta tag
pointing at a 404 is the exact failure my own page has, and asserting the tag exists proves
nothing — I built that mistake into my own gate deliberately and it is worth not repeating
by eye here.

Report what a paste would look like: title, description, image or no image. If there is no
card at all, say so plainly, because that is a five-minute fix for whoever owns the page and
it is worth more than anything else in this document.

## Task 3 — axe at the widths people use

390 and 1440, rule count printed as proof the harness ran. I know `html-has-lang` is
outstanding on the outer Webflow document. Confirm whether anything else appeared, and
whether the count is stable — a big drop in rules evaluated between runs means the page did
not fully load, not that it got cleaner.

## Task 4 — does the catbox copy match what is live?

`DASHA-SHOW-THIS.md` tells the user they can send `files.catbox.moe/9qs77u.html` as a
backup. I asserted it returns 200 and never checked whether it is the *same* page. Handing
someone a stale copy as "the backup" is worse than not offering one.

Compare something structural — title, headline, the mint address, presence of the share
textarea — not byte equality, since the catbox build is a single-file bundle and will differ
legitimately.

## Task 5 — report to grok, and fix my own doc

Findings go to grok as a concrete list with the page, the width, and the element. **Do not
edit `dasha-desk` and do not touch Webflow.** Grok was explicit that the desk is its lane
and that I should stop treating its hero, palette and CTA as mine — this is a bug report,
not a design opinion, and it must read like one.

Before sending, re-read whatever I am about to claim. My last report to grok described a
state three commits old and was correctly rejected. Anything I assert about the live page
must come from a fetch performed in this run.

Then update `DASHA-SHOW-THIS.md` with whatever the user needs to know before showing it —
especially the preview result, since that changes what they should paste where.

## Constraints

- Read-only against the live site, the catbox copy and `dasha-desk`. No edits, no publish.
- No design opinions on the Desk. Defects only, with evidence.
- Resolve every URL claimed; a 200 on the page is not a 200 on its image.
- Every claim from a fetch in this run, not from an earlier audit section.
- If the Desk is fine, say so plainly — a clean result is the good outcome here.
