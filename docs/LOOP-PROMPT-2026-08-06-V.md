# Loop iteration V — audit every blocker I have attributed to the user

## State

```
truth    disk v1030 · live v1019 · lagDebt · prepare clean
site     another worker mid-redesign — data/ops plane only again this iteration
just now Firecrawl credentials removed from the blocked list: never a blocker
```

## Why this, now

Iteration U ended with me telling the user to stop waiting on something I had
told them twice to act on. The pipeline was never credential-blocked. I had
written the diagnosis into a comment, then cited my own comment across six
iterations instead of running the command.

That is not a one-off. It is a *method* failure, and the method produced a list.
Everything on my "blocked on user" list was produced the same way — by me
concluding something was blocked and then repeating it. One item has now been
falsified. The rest have not been tested.

The user has been carrying these for days. Some are genuinely theirs. Some may be
mine. Until each is tested, I do not know which, and every iteration I let a false
blocker sit is an iteration the user thinks they owe me something they do not.

## The list to audit

```
B1  gh auth login → does Uuriko/demigod-ops exist?     4+ days, "blocked on user"
B2  restic install + external storage for backups      "blocked on user"
B3  rotate ~23 tokens (Twitter/Webflow/GitHub/etc)     "blocked on user"
B4  [D1] pricing: 10% vs Paraform's 20–25%             "blocked on user"
B5  publish authorization                              "blocked on user"
B6  repaste CPU (10,441 throttle events)               "blocked on user"
B7  move repo out of $HOME                             "planned, not done"
```

## Task 1 — classify each, by testing, not by remembering

For every item, run the command that decides it. Then place it in exactly one
bucket:

- **Genuinely the user's** — needs an account they hold, money they control, a
  decision only they can make, or hands on hardware. Say what precisely they must
  do, in one line, with the exact command where one exists.
- **Mine** — I can do it now, or I can do most of it and hand back a smaller ask.
- **Not actually a task** — stale, superseded, or already true.

State the test used for each. "I remember it being blocked" is not a test. If an
item cannot be decided without acting outside my authority, that itself is the
finding and it stays with the user.

Predictions before testing, to be checked honestly afterwards: B4, B5, B6 are
genuinely the user's — pricing is a business decision, publishing needs
authorisation in the current request, and thermal paste needs hands. B1, B2, B7 I
expect to be at least partly mine. B3 I expect stays with the user, since I hold
no account credentials.

## Task 2 — B2 is the one that matters; treat it as the main event

The 2026-08-02 wipe destroyed 37 gitignored files, including submissions with PII
and the Firecrawl credentials. Four days later there is still no backup. That is
the largest unresolved risk in the project and I have been deferring it to a
`restic` install and an external drive.

Re-examine that framing from first principles:

1. **What actually destroyed the data?** `git clean -xfd` — a *command*, not a
   disk failure. A same-filesystem copy would have survived it completely.
2. `bin/dg-backup` fails closed when the repo is on the same filesystem. I wrote
   that rule. Against disk failure it is correct; against the failure that
   actually happened it blocks the exact protection that would have worked. A
   policy that refuses the mitigation for the incident that motivated it is worth
   re-deriving, not defending.
3. **Is restic actually required?** Ponytail rungs 3–5: `tar`, `rsync`, `git
   bundle`, and `cp --reflink` are already installed. For "survive a bad command
   in $HOME", a timestamped bundle plus an archive of the gitignored working set
   is most of the value, today, with no install and no purchase.

Deliver working protection this iteration, even if it is not the final design.
Something that runs today beats a better thing that waits on hardware. Be explicit
about what it does NOT protect against — disk failure, theft, encryption — so the
external-drive step stays on the list at its true priority instead of being
quietly considered solved.

**Do not** weaken the existing same-filesystem guard silently. If it should be
relaxed, relax it deliberately, with the reasoning recorded, and keep the refusal
for anything claiming to be an offsite backup.

## Task 3 — safety rules for this specific work

Backups touch the filesystem, and the last filesystem operation in this repo cost
the user their configuration.

- **No deletion. None.** Not even of files I create. Write new paths only.
- Never run `git clean`, `rm -rf`, or anything with `--force` against `$HOME`.
- Verify the destination is not inside the repo before writing, or the backup
  becomes part of what a bad command destroys.
- Prove the archive restores. An unverified backup is a belief, not a backup.
  Extract it to a scratch path and diff a sample of files.
- Bound the size. Do not sweep `node_modules`, caches, or the 2.9 MB map into an
  archive that runs on a timer.

## Task 4 — one honest paragraph on the method

The Firecrawl error was not bad luck. Name the pattern that produced it — writing
a conclusion into a durable artifact, then treating the artifact as evidence — and
state the specific habit that prevents it. Keep it to a paragraph; the value is in
the habit, not the confession.

## Constraints

- Data and ops plane only. No foot-core, no head, no CSS, no site build.
- No publishing. No outbound, no drafts, no money.
- Read all command output. Never redirect a command a later step depends on.
- Test before claiming, for every one of the seven items.
