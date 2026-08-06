# Loop iteration BV — the copy pass, grounded in the research instead of in taste

## State

```
research    DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md, committed 9ddcb76
open item   §7 row 3 "add one research-backed line to landing copy — the mechanism
            claim is currently unstated"
open item   §7 row 5 "target the post-burn cohort explicitly — the only cohort with
            a felt need"
open item   §7 row 2 "get the CHI 2026 KOL paper full text" — ACM 403'd
menu        "landing copy pass" was on the list I put to grok; grok never picked it
gated       dasha-landing.test.mjs PASS, favicon + OG card + hero diagram all done
blocked     deployment, git push — both need the user
```

## Why this, now

The copy pass has been on the menu since the design overhaul and I kept deferring it
because I had no basis for the rewrite beyond preference. Rewriting copy on taste is
how a page gets churned without getting better. That objection is now gone: §1–§3 of
the research give a specific audience and a specific mechanism, both sourced.

Concretely, two things the page does not currently say and should:

- **Who it is for.** The page addresses a generic reader. The research says the
  cohort with a felt need is the one that already got burned — ~97% of memecoins
  dead, $110B gone since the 2024 peak, the celebrity-coin supercycle behind them.
  That cohort is unreachable by hype and reachable by this.
- **Why it works.** The page asserts that writing the call first is better. It never
  says why. There is a real mechanism — overload → heuristic → herd, interrupted by
  one structured decision made before the position — and a literature behind it.

This is also the last piece of Dasha work that is entirely inside my own files. Every
other open item is grok's repo or waiting on a deploy.

## Task 1 — one time-boxed attempt at the CHI paper, then move on

ACM returned 403. Before giving up, try the routes that usually work for a CHI
paper: an author preprint, an arXiv version, a lab or personal page, or the ACM
"authorizer" free-access link that CHI authors often post. Two or three searches, no
more.

If it is genuinely paywalled, say so and stop — do **not** cite specifics I have only
seen in a search-result snippet as though I read the paper. The four trust markers
came from an indexed abstract; that provenance must stay attached to them wherever
they appear. This matters more than usual on a project whose entire pitch is not
overclaiming.

## Task 2 — rewrite the hero for the post-burn reader

The hero currently opens on the mechanic. Open instead on the reader's own
experience: the call they cannot defend, the thesis quietly rewritten after the
chart moved. Anticipated regret is a documented mediator here — but the honest
application is naming regret the reader **already has**, not manufacturing regret
about a pump they missed. That distinction is the whole difference between this page
and every other page in the category, and it should be visible in the words.

Keep it short. The failure mode is a hero that explains the research instead of
speaking to the person. If a line reads like a citation, cut it.

## Task 3 — state the mechanism once, without promising an outcome

Add the "why it works" claim. Then constrain it hard, because this is where I could
do real damage:

**The Tetlock result is about forecasting tasks under lab conditions. It is not
evidence that writing a thesis card makes anyone money, and it is not evidence about
crypto calls specifically.** The page may say that stating a position and its
invalidation *before* committing is a documented way to think more carefully. The
page may **not** say or imply it improves returns, accuracy on token calls, or
outcomes of any kind.

Write the strongest true sentence, then check it against that boundary and weaken it
until it passes. A page that overclaims research is worse than one that cites none —
it hands a critic the exact contradiction the product is built to oppose.

If no sentence survives the boundary, add none and say so. That is a legitimate
outcome.

## Task 4 — do not break the two-copy contract

The drift guards compare the tool's form markup and script between the landing page
and the standalone. Hero, sections and footer are outside that region and are mine to
change; anything inside it is not.

Before editing, re-read where the tool region starts and ends rather than working
from memory — I have twice had a guard fail for a reason unrelated to what I changed,
both times because I assumed the boundary rather than looking.

If a copy change genuinely belongs inside the tool region, it must land in both files
identically or not at all.

## Task 5 — verify by looking, and re-run the gate

Render at 390 and 1440 and read the page as a stranger would. Every copy failure I
have caught today was caught by looking at the render, not by reading the diff.

Then run `dasha-landing.test.mjs` and confirm PASS, including the >2000 indexable
chars assertion — a copy pass that cuts text could plausibly cross that line, and it
is the one assertion this task could break by accident.

## Task 6 — record it

Append to the audit doc: what changed, the boundary in Task 3, and the CHI paper's
provenance status from Task 1. The audit is the handover artifact.

## Constraints

- Do not touch the tool region in either file.
- No outcome, return, or accuracy claim, explicit or implied.
- Keep the "what this is not" strip; it is the page's honesty anchor.
- No new dependency, no external fetch, no change to the mint/endorsement boundaries.
- If the strongest true sentence still overclaims, ship no sentence.
