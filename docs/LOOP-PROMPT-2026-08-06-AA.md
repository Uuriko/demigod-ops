# Loop iteration AA — did I actually do what was asked?

## State

```
live       v1019 · audited clean on honesty (14 routes) and axe (16 routes)
disk       v1038 · +19 ver · lagDebt · publish needs current-request auth
held       foot-core, actively edited by another worker
last iter  found "Recently observed roles" still live — a direct instruction,
           never carried out, shipped-adjacent work done around it
```

## Why this, now

Last iteration found that an explicit user instruction — *"don't say 'recently
observed roles'"* — was never done, while the neighbouring half of the same
request (cut the intro copy) shipped. I found it **by accident**, auditing the live
site for something else.

That is the worrying part. I have audited my tests, my blocked list, my reasoning,
and the live site. I have never audited **the user's requests against what was
actually delivered.** One miss found by accident implies others found by nobody.

This is the highest-value audit available: the user cannot see my task list, and
they have no way to know which of their instructions quietly became a partial.
Every one that sits undone is something they think is handled.

## Task 1 — enumerate the explicit instructions, then verify each against the repo

Go through this session's requests. For each, the question is not "did I work on
it" but **"is the thing the user asked for actually true now?"**

Verify from the repo and the live site. Not from memory, and not from my own
commit messages — a commit saying "done" is my claim, not evidence. The Firecrawl
and backup-timer errors both came from citing my own written conclusions.

The instructions to check, at minimum:

```
1  "close extra tabs"
2  "change the tech directory so startup roles are featured, not Anthropic/OpenAI"
3  "remove most of the text from the sf startup directory description ... then
    publish all changes"
4  "don't say 'recently observed roles'" + "find MORE needless text to remove,
    stop overexplaining everything, less is more"
5  "add more features to the forms and research every competitor to see exactly
    what questions they ask and how"
6  "you and codex can generate new images and other assets not just text. do a
    design review and figure out what things you both should create and add and
    where"
7  "build a tool that regularly scours twitter for fresh posts about startups
    hiring and then puts them on trydemigod.com somehow"
8  "audit all of demigod, design review, code review ... list of tasks"
```

For each, one of exactly three verdicts, with the evidence that decided it:

- **Done** — the asked-for state is true now. Name where I checked.
- **Partial** — some shipped, some did not. Say precisely which part is missing.
- **Not done** — say so plainly.

Where something is done on disk but not live, that is **not "done"** — the user
asked for a change to their website, and v1019 is the website. Mark it
`done-on-disk, blocked on publish` and count it separately.

## Task 2 — expect item 6 to be the worst, and check it hardest

The image/asset request is the one I am least confident about. It asked for
something I do not do by reflex — generating visual assets rather than text — and
it is the easiest kind of request to satisfy with a document *about* assets
instead of assets.

Check whether any actual image, icon, OG image, diagram, or generated asset file
exists and is referenced by the site. A design-review markdown file is not an
asset. If the deliverable was a document where the user asked for artwork, say
that directly.

## Task 3 — do the cheapest genuine miss, now

Having produced the list, pick the missed item with the best value-to-effort that
does **not** require foot-core, and do it properly. Prefer a real, small,
verifiable completion over starting something large.

Do not fix everything at once. A truthful list plus one real completion is worth
more than four half-finished repairs, and this session already has enough
half-finished things in it.

## Task 4 — hand the rest back cleanly

The remaining misses go to the user as a short list: what was asked, what is
missing, whether it is blocked, and what it would take. No excuses attached — the
list is more useful than an explanation of it.

If an instruction turns out to be genuinely satisfied, say so without hedging. The
goal is an accurate ledger, not a confession; overstating misses is as useless as
hiding them.

## Constraints

- No foot-core, no head, no CSS — still held.
- No publishing, no outbound, no drafts, no money, no contact data.
- Verify against the repo and live, never against my own commit messages.
- Read all command output.
