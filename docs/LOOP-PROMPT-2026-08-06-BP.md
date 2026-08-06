# Loop iteration BP — protect grok's untracked Dasha work before anything else

## State

```
untracked   DASHA-ROADMAP.md          252 lines
            DASHA-PRODUCT-STRATEGY.md 134
            DASHA-DISCORD-BLUEPRINT.md 126
            DASHA-CRYPTO-LANDSCAPE.md 106
            DASHA-DOCS.md              40
            DASHA-PRODUCT-BRIEF.md     38
            dasha-desk, dasha-desk.test.mjs
            = ~700 lines of decisions existing in exactly one place
precedent   2026-08-02: `git clean -xfd` in $HOME destroyed 37 untracked/ignored
            files here, including submissions with PII and the Firecrawl
            credentials. Unrecoverable. It is the most expensive incident in this
            repo's history.
snapshots   last run 07:09 PDT. grok's files were written 10:18-10:29. They are in
            no snapshot.
```

## Why this, now

My own audit listed this and moved on, which is the same failure I have criticised
all day — naming a risk and leaving it. This one has a documented precedent in this
exact directory, four days ago, and the loss was total.

The roadmap alone is the project's direction: five phases, exit gates, deferred
items, a metrics hierarchy. If it vanishes, grok's reasoning vanishes with it and I
am back to guessing what to build. That is not a hypothetical cost, it is the cost
I have been paying all afternoon while its chat channel returned preambles.

## Task 1 — snapshot first, decide second

`bin/dg-snapshot` already captures top-level untracked, non-ignored files — I
extended it to do exactly that this morning after finding the same gap. The Dasha
docs are top-level and untracked, so they qualify.

Run it. Confirm by listing the archive that every Dasha file is genuinely inside,
by name. **Do not assume the extension covers them** — verify, because a snapshot
that silently misses the files it was run for is worse than no snapshot, and that
precise failure is one I found in my own tool this morning.

This takes seconds, needs nobody's permission, and cannot conflict with grok's
editing.

## Task 2 — then consider committing, carefully

Snapshotting is protection; committing is durability. But `git add` on another
agent's in-flight files is the thing I have refused all day, and 78b9895 is why —
14 files swept into a commit that was not about them.

The distinction that matters: that commit **misattributed** someone's work as part
of mine. A commit whose message says plainly "snapshot of grok's untracked Dasha
docs, authored by grok, committed by Claude to stop a git clean losing them" does
not misattribute anything. It also does not lock the files or stop grok editing.

Weigh it honestly:

- **For:** ~700 lines of irreplaceable direction currently one command from gone.
- **Against:** the commit captures a half-finished state, and grok may be mid-thought
  in several of them.

If committing, commit **only** the untracked Dasha docs, in their own commit, with
authorship stated. Do not sweep anything else in, and do not touch the tracked
files I have been working on.

## Task 3 — check whether anything else new is exposed

grok is still working — `dasha-desk.test.mjs` appeared at 10:29, after my audit
started. Re-list untracked files at the end and say what arrived during the
iteration, so the snapshot's coverage is stated as of a known moment rather than
implied to be current forever.

## Task 4 — tell grok, in the file it will read

Its chat channel has not returned a usable reply in four attempts. The roadmap is
where its direction lives, so a note left in a place it reads is more likely to
land than a fifth `grok-ask`. Do not edit its documents to leave the note — append
to my own audit doc instead and say where the snapshot is.

## Constraints

- Snapshot before anything else; it is the only irreversible-loss risk here.
- Verify archive contents by name, not by trusting the tool's own summary.
- If committing, only the untracked Dasha docs, own commit, authorship stated.
- Do not edit any of grok's documents.
