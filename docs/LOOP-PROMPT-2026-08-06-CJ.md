# Loop iteration CJ — review the page the user actually shows, as a viewer

## State

```
blocked      getdasha.com propagating at IONOS (up to 48h); Webflow OAuth needs the user
mine         landing page + tool: gated, loop shipped, cold read fixed, both suites PASS
the Desk     https://johns-awesome-project-39b1b5.webflow.io/dasha — THE landing page per
             DASHA-PRODUCT-BRIEF.md, grok's, live, and the URL the user will paste
never done   rendered it at 390 or 1440 and looked at it
never done   checked what appears when that link is pasted into X, Discord, iMessage
partial      axe run once, at 1280, while chasing one specific violation
```

## Why this, now

I have spent the day polishing the surface that is **not** the landing page, and I have
never once looked at the one that is. Everything I know about the Desk comes from grepping
its claims and reading its markup. That is an audit of honesty, not of whether it is
presentable.

The user is about to put that URL in front of people. Two things decide the first
impression and neither has been checked:

**The link preview.** I already know my own page unfurls blank because the OG card is not
deployed. I do not know what the Desk does. Its `og:image` points at
`cdn.dexscreener.com/token-images/og/solana/53uxQ…` — a third-party CDN, for a token image.
If that 404s, every paste of the Desk link produces a bare grey box, and that happens before
anyone clicks. A well-formed meta tag pointing at nothing is exactly the defect I built into
my own gate deliberately; asserting the tag exists proves nothing.

**Live data failing silently.** The Desk pulls live Dex numbers. I saw real values earlier —
`$5.36e-5`, `Mcap $53.56K` — but a feed that is fine at one moment can render `NaN`, `--` or
an empty cell later, and it fails quietly. A page whose numbers are broken shows its worst
face to exactly the audience being courted.

## Task 1 — render it at 390 and 1440 and read it as a stranger

Look for what only shows up visually: overflow, truncation, unreadable type, controls that
look broken, and above all **whether the live numbers actually contain numbers right now**.
Check the values, not whether the code that fills them looks correct.

390 matters most. A link someone is sent gets opened on a phone.

## Task 2 — the link preview, which is the real deliverable

Pull `og:title`, `og:description`, `og:image`, `twitter:card` and `<title>` from the live
HTML. Then **resolve the og:image URL and confirm it returns an actual image** — status code
and content-type, not just that the tag is present.

Report what a paste would look like: the title, the description, and whether there is an
image or a grey box. If it is broken, that is a small fix for whoever owns the page and
worth more than anything else in this iteration.

## Task 3 — axe at the widths people use

390 and 1440, with the rule count printed as proof the harness ran. I know `html-has-lang`
is outstanding on the outer Webflow document. Establish whether anything else is there and
whether the rule count is stable — a large drop between runs means the page did not fully
load, not that it got cleaner.

## Task 4 — does the catbox backup match what is live?

`DASHA-SHOW-THIS.md` tells the user they can send `files.catbox.moe/9qs77u.html` as a backup.
I asserted it returns 200 and never checked it is the *same page*. Handing someone a stale
copy labelled "backup" is worse than offering none.

Compare something structural — title, headline, the mint address, the presence of the share
box — not byte equality, since the catbox build is a single-file bundle and will legitimately
differ.

## Task 5 — check the domain once, cheaply

`getdasha.com` was registered ~an hour ago and IONOS said up to 48 hours. One RDAP check
costs nothing. If nameservers have appeared, say so — it unblocks the whole domain chain.
Do not poll repeatedly; once per iteration is enough.

## Task 6 — report, do not edit

Findings go to grok as a concrete list: page, width, element, evidence. **No edits to
`dasha-desk`, no Webflow changes.** Grok was explicit that the Desk is its lane and that I
should stop treating its hero, palette and CTA as mine. This is a defect report, not a design
opinion, and it must read like one.

Re-read anything I am about to claim before claiming it. My last report to grok described a
state three commits old and was correctly rejected.

Then update `DASHA-SHOW-THIS.md` with whatever changes what the user should paste where.

## Constraints

- Read-only against the live site, catbox and `dasha-desk`. No edits, no publish.
- Defects only, with evidence. No design opinions on the Desk.
- Resolve every URL claimed — a 200 on the page is not a 200 on its image.
- Every claim from a fetch made in this run.
- If the Desk is fine, say so plainly. A clean result is the good outcome.
