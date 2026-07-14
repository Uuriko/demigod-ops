```markdown
# Docs Sprawl: Verdict

## 1. Yes — badly overcomplicated
1 founder, freeze ON, pre-revenue, single canonical JS file. You have ~110+ markdown
files (14 process + 60 exchange + 18 prompts + 28 root DEMIGOD-*.md) describing a
process that should fit on an index card. The docs now cost more agent-context and
more chance-of-contradiction than the actual product. Every session burns tokens
re-deriving "which file is truth" — that's the real P0, not any code bug.

## 2. The 5 living files (everything else is archive)

| File | Purpose | Max lines |
|---|---|---|
| `CLAUDE.md` | Auto-loaded rules: canonical file, verify gate, publish gate, copy policy, phase | 60 |
| `DEMIGOD-COMPRESSED-STATE.md` | Current truth: live ver, freeze status, open P0s, last-verified timestamp | 40 |
| `AGENTS.md` | Who does what: Fable=plan/audit, Grok=execute/verify, human=Publish click | 40 |
| `docs/process/DAILY-PROTOCOL.md` | The 10-step loop (see §4) — replaces all 14 process/ files | 30 |
| `DEMIGOD-BOARD.json` | Not markdown — the actual honesty ledger, machine-checked | n/a |

That's 4 markdown files agents ever open, ~170 lines total. `board.json` is data, not
process, but it's the 5th thing that matters and it's already load-bearing.

## 3. Merge / kill
- **Kill outright**: `AI-HYBRID-COLLABORATION-PLAYBOOK.md`, `DEMIGOD-AGENT-COLLABORATION-PLAYBOOK-V2.md`,
  `DEMIGOD-WORKFLOW.md`, all `docs/process/*` except the new `DAILY-PROTOCOL.md`, every
  `ROUND*`/`MASTER*` prompt doc — these are 5+ competing versions of the same paragraph.
- **Archive, don't delete**: all 60 `docs/exchange/*.md` → `docs/archive/exchange/`. They're
  session logs, not process. Nobody should open them to learn "how do we work." Memory
  (this system) already carries the load-bearing history — the files are redundant with it.
- **Collapse prompts/demigod (18 files)**: keep 2-3 templates actually used by `bin/df`
  (review, plan, execute). Archive the rest — if a prompt hasn't been invoked in 2 weeks
  it's dead weight, not "coverage."
- **Root DEMIGOD-*.md (28 files)**: 90% are one-time postmortems/specs already superseded.
  Move all to `docs/archive/root/` with a single `docs/archive/INDEX.md` (one line each,
  date + one-line outcome) so they're greppable but never opened by default.
- **DEMIGOD-AGENTS.md vs AGENTS.md**: these are the same doc twice. Merge into `AGENTS.md`,
  delete the other.

## 4. One-page daily protocol (≤10 steps)
1. Read `DEMIGOD-COMPRESSED-STATE.md` — is freeze ON or OFF?
2. If freeze ON: read-only. Report findings, don't edit.
3. Edit only `demigod-foot-core.js` (or the one `.mjs` the task names).
4. `npm run demigod:verify:source` (or `:all`) after every edit.
5. Check board honesty (≤3 seeds, real=0 until real).
6. Check `loop-state` for drift vs live.
7. If all green: write a diff/paste for human, do NOT publish.
8. Human clicks Publish in Webflow (freeze permitting).
9. Re-verify live == disk after publish.
10. Update `DEMIGOD-COMPRESSED-STATE.md` with new ver + timestamp. Nothing else.

No ceremony doc, no RACI, no "hats." One founder doesn't need a matrix.

## 5. Complexity that's actually load-bearing — keep it
- **Verify gate** (`demigod-verify-source.mjs` + smoke + honesty check) — this has caught
  real corruption (wizBuild undefined, SyntaxErrors, board laundering) multiple times.
  This is the one thing that's earned its keep.
- **Human-Publish gate** — every incident where autonomy tried to bypass this made things
  worse. Keep it hard-blocking.
- **Board honesty cap (≤3 seeds, real=0)** — cheap, machine-checked, prevents the single
  most recurring failure mode (fake pilots laundered into "real" data).
- **`bin/df` fresh-context pattern** — genuinely solves context poisoning between sessions.
  Keep the mechanism; kill the 18-file prompt library feeding it down to 3.
- **This memory system** — it already does what the 60 exchange docs try to do, per-session,
  with better recall. Let it replace the exchange-doc habit going forward, not supplement it.
```
