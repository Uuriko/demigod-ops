# Loop iteration AE — remove bloat, with evidence rather than instinct

## State

```
suite     574 tests · 1 real defect fixed · 3 red, all gated on the other
          worker's uncommitted redesign — not mine to resolve
goal      "add features, improve existing things, remove bloat and fix bugs"
history   73 dead files removed earlier (186K, 4,701 lines)
blocked   publish auth · pricing · ADS disclosure · directory-SVG · forms
```

## Why this, now

Everything high-value is either done or waiting on someone else. Bloat removal is
named directly in the standing goal, is entirely unblocked, and last iteration's
Task 3 never ran because the suite was not green when I got to it.

There is also a specific reason to be careful this time. My previous deletion
audit reported three `cursor-*` scripts as having three references each. Every one
of those "references" was **my own deletion-candidate document citing itself.** I
nearly deleted files on the strength of evidence I had manufactured, and I
recommended removing three npm scripts three times before reading `AGENTS.md:30`,
which says never touch the game scripts unless the user says "reopen the game."

So this iteration is as much about the method as the deletions.

## Task 1 — build the candidate list mechanically

A module is a candidate only if ALL of these are false:

1. imported by any `.mjs`/`.js` in the repo
2. named in any `npm` script in `package.json`
3. referenced by any systemd unit in `systemd-user/`
4. reachable as a `bin/dg` subcommand
5. spawned by any pipeline (`demigod-directory-refresh`, `demigod-roles-pipeline`,
   and anything else using `spawnSync` with a script name)
6. listed in `demigod-tools-registry.mjs`
7. mentioned in `AGENTS.md`, `DEMIGOD-AGENTS.md`, `CLAUDE.md`, or `DEMIGOD-COMPRESSED-STATE.md`

**Documentation I wrote proposing a deletion does not count as a reference.**
When counting references, exclude `docs/` written by me this session — otherwise
the audit cites itself, which is exactly the error that nearly cost real files.
Count references from `docs/` separately and say so.

## Task 2 — read the fences before proposing anything

Before the list becomes a plan:

- `AGENTS.md` and `DEMIGOD-AGENTS.md` are canonical. Read them for explicit
  "do not touch" statements. The game scripts are fenced. Find any others.
- **Anything the other worker is holding is off limits.** `git status` shows
  which files are modified or untracked right now; an untracked `.mjs` is almost
  certainly someone's work in progress, not dead code. `demigod-navigation-audit.mjs`
  is exactly that shape — brand new, untracked, and it would look "unreferenced"
  to a naive scan.
- Test files are not bloat. A `.test.mjs` with no importer is doing its job.

## Task 3 — delete only what survives both filters, and verify after

For each deletion: state the evidence that it is unreferenced, delete it, and run
the suite. If the suite goes red, restore it — that is the reference the scan
missed, and it is a finding worth more than the deletion.

Prefer a small number of certain deletions over a large speculative sweep. Zero
deletions with a correct method is a better outcome than twenty with a method
that has already failed once.

## Task 4 — report the count honestly, including zero

If nothing is safely removable, say that plainly. The previous sweep already took
73 files; the remaining set being clean is a perfectly good answer and much better
than manufacturing a deletion to make the iteration look productive.

Report separately: candidates found, candidates fenced, candidates held by another
worker, and candidates actually deleted.

## Constraints

- **No deletion of anything untracked or modified in `git status`.**
- No foot-core, no head, no CSS.
- No publishing, no outbound, no money.
- Suite must be green (modulo the 3 known in-flight reds) before and after.
- Verify unreferenced by search, never by memory.
