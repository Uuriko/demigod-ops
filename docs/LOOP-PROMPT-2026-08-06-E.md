# Loop iteration E — remove bloat

## State

```
suite         537 / 537 green
truth         disk=v1015 live=v1015 shipped=true
foot lock     HELD by codex-remove-dead-hiring-filter
uncommitted   163 files (other agents very active)
heavy-send-*  70 files · 296K · all tracked · all clean · ZERO cross-references
cursor-*      14 files ·  88K · all tracked · all clean
npm scripts   verify / verify:store / verify:loops → eat-the-sounds/* (deleted)
```

## Why bloat removal, now

The standing goal names "remove bloat" explicitly, and I have deferred it twice —
once as "needs a live-caller grep first," once as "deleting 84 files while 163 are
uncommitted is how work gets lost." Both objections are now answerable rather than
reasons to defer again:

- **The caller grep is done.** All 70 `heavy-send-*.mjs` were searched against
  every `.mjs`, `.sh`, `.json`, and `.md` in the tree. **Zero cross-references.**
  Nothing imports, spawns, or documents them.
- **The uncommitted-files risk does not apply.** All 84 files are *tracked and
  unmodified*. Deleting a clean tracked file is fully recoverable with
  `git checkout HEAD -- <path>` and touches none of the 163 dirty files.

The foot lock is held, so foot-core work is off-limits this iteration anyway.
Deletion in unrelated files is exactly the work that fits.

## Task 1 — the three broken npm scripts

`npm run verify`, `verify:store`, `verify:loops` all point at
`eat-the-sounds/verify-*.mjs`, which does not exist. `CLAUDE.md` says Eat the
Sounds is archived and out of scope.

`npm run verify` is the most canonical-sounding command in the project and it
fails outright. Anyone reaching for it gets a false failure that looks like a
broken build.

I have deferred this three times across iterations while calling it "minutes of
work." Do it. Remove the three entries — they reference an archived project, so
there is nothing to repair, only to remove.

**Check first** whether anything invokes them (`bin/`, systemd units, docs, other
scripts). If something does, that caller is also broken and needs the same
treatment.

## Task 2 — delete `heavy-send-*.mjs` (70 files, 296K)

Agent-to-agent message plumbing, superseded by `bin/grok-ask`, `bin/codex-ask`,
and Orca orchestration. Verified zero cross-references.

**Before deleting, do one more check the grep could miss:** a dynamic reference
built at runtime (`'heavy-send-' + name`, a glob, a directory scan). Search for
the prefix as a string fragment, not just whole filenames. If any dynamic loader
exists, stop and report rather than delete.

Delete with `git rm` so the removal is staged as a deletion rather than leaving
the index confused.

## Task 3 — delete the dead `cursor-*` scripts

14 files, 88K. Three are definitively dead: `cursor-enable-webflow-mcp.mjs`,
`cursor-webflow-mcp-toggle.mjs`, `cursor-webflow-enable-deep.mjs` — Puppeteer
driving Cursor's UI to click an MCP toggle, entirely replaced by the single
`claude mcp add` line already run this session.

**The other 11 are not automatically dead.** Check each for cross-references the
same way. Delete only the ones with none. A file being unused *by me* is not
evidence it is unused — Cursor is a tool the user drives directly.

## Verification

- `npm run demigod:verify:source`
- Full suite: `node --test *.test.mjs` — must stay 537/537
- `node demigod-tools-registry.mjs --md` or `bin/dg tools` — confirm no registry
  entry points at a deleted file
- `bin/dg truth` — must stay PASS

If the registry references a deleted tool, that reference is now broken and must
be removed in the same commit. A registry pointing at a missing file is worse
than the file existing.

## Constraints

- **Do not touch `demigod-foot-core.js`** — lock held by another owner.
- **Scope the commit to deleted paths explicitly.** 163 files are dirty from other
  agents; a bare `git commit -a` would sweep them.
- **Report the byte count actually removed**, not the estimate.
- If any check surfaces a live caller, stop and report rather than deleting. The
  point is removing dead weight, not removing weight.
