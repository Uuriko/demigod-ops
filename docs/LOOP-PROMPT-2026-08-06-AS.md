# Loop iteration AS — one brief the user can act on, instead of eighteen documents

## State

```
today       ~20 commits, ~18 docs written, findings spread across all of them
last two    "no action needed" and "I retracted my own alarm" — the bug-hunting
            vein is thinning, and three times the system was already correct
blocked     intake, publish, pricing, ADS disclosure, images, forms, 7 units
site        held all day by another worker; 180 uncommitted files
```

## Why this, now

The user has been sending the same one-line prompt all day. Whatever they are
doing, they have not been reading along. When they next look, they face eighteen
documents and twenty commit messages, and the things that actually need *them* are
buried inside findings that do not.

That is a real failure mode of this session, not a cosmetic one. The Webflow token
being empty blocks intake, which blocks the entire funnel — and it is currently
recorded in the middle of a commit message about last-mile handoffs. If they never
find it, none of today's work matters.

Two consecutive iterations produced no product change. That is the honest signal to
stop hunting and start consolidating.

## Task 1 — re-verify every blocked item before writing it down

**Do not compile this from my own commit messages.** That is exactly the habit that
produced the Firecrawl error, the backup-timer error, and the "nightly export was
failing" error — a written conclusion cited later as evidence.

For each item destined for the brief, run the command that confirms it is still
true right now:

- Webflow API token still empty? (`bin/dg doctor`, the check I added)
- Webhook secret and public URL still absent?
- Publish lag — what is the delta now?
- Funnel still empty, still no payment path?
- Site still held, or has the other worker committed?
- The three suite reds — still red, still theirs?

Anything that has changed gets written as it is now, not as it was this morning.

## Task 2 — write the brief, ordered by consequence

One document. Ordered by what it costs to leave undone, not by when I found it or
how interesting it was.

For each item: **what is true, what it blocks, what exactly they must do, and how
long it takes.** One line of evidence, not a retelling. A link to the deeper doc
for anyone who wants it.

Separate cleanly:

- **Needs them** — an account, a credential, money, or a decision only they can
  make. This is the section that matters.
- **Needs a decision, then me** — pricing, ADS disclosure, the directory SVG, the
  forms and images work. State the options and what each implies; do not
  recommend, since plans and resources are not visible to me.
- **Done today, no action** — brief. They should be able to skip it entirely.

## Task 3 — include what I got wrong

Three claims I made today were wrong and I corrected them: the nightly export was
not failing, the credential readers did not need fixing, the static directory has
no four-byte cliff. A brief that lists only findings and omits retractions
overstates its own reliability.

Keep it short and factual. The point is calibration — if they know three of my
alarms were false, they can weight the rest correctly.

## Task 4 — make the top item impossible to miss

If one thing gates everything else, say so in the first line. Right now that is the
Webflow API token: without it the webhook cannot be registered, without that the
inbox stays disconnected, without that the funnel cannot fill, and every downstream
question about demand and pricing is unanswerable.

Do not bury it under a summary of the day.

## Constraints

- Verify before writing. No item goes in on the strength of an earlier commit.
- No publishing, no outbound, no secrets in the document.
- No foot-core, no head, no CSS.
- The brief is for them, not a record of my activity. If a line does not change
  what they do, cut it.
