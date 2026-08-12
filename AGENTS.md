# Agent entry (machine-wide)

Short door only. Project runbooks live elsewhere — do not restate them here.

## Active project

| State | Project | Open first |
|-------|---------|------------|
| **Current** | **Dasha** (getdasha.com) | [`DASHA-RULES.md`](DASHA-RULES.md) · [`DASHA-DOCS.md`](DASHA-DOCS.md) |
| Paused | Demigod (trydemigod.com + startup ops) | [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) when the user reopens Demigod |
| Hard-stop | Eat the Sounds game | Only if the user says reopen or names a game file |

- Until the user explicitly switches projects, do **Dasha** work. Do not pull Demigod useful-loop / foot / board chores into a Dasha session.
- Dasha scrap (do not revive): Thesis Card, receipts, Pair, forecasting/rounds. Old files are archived evidence only.
- Demigod day card when active: [`DEMIGOD-SIMPLE.md`](DEMIGOD-SIMPLE.md) (`AGENT-SIMPLE.md` is a pointer). Expanded: [`DEMIGOD-AGENTS.md`](DEMIGOD-AGENTS.md) · workflow [`DEMIGOD-WORKFLOW.md`](DEMIGOD-WORKFLOW.md).
- Doc map: [`DOCS.md`](DOCS.md). State orientation: [`DEMIGOD-COMPRESSED-STATE.md`](DEMIGOD-COMPRESSED-STATE.md) (no release versions copied into cards).

## Hard gates (all projects)

- **Publish / outbound / money / wallet / forms / posts / community-server changes:** only when the **current** user request explicitly authorizes that action. Prior “publish periodically” or old autonomy notes grant nothing. Prepare and verify by default.
- Never publish a broken, misleading, security-sensitive, or partially migrated state.
- **Prepared ≠ published.** Dirty disk and drifted manifests are normal until an authorized ship.
- **Verify PASS ≠ product OK.** Gates must cover user-visible embeds (e.g. SRI pin vs asset hash). If users see an empty board/widget, do not stop at green markers alone.
- **Truth by project** — never invent live state; never copy release versions into this file:

  | Project | Truth / verify |
  |---------|----------------|
  | Dasha | `npm run dasha:check` · `dasha:gate:fast` · `dasha:ship` (only with publish auth); product SRI via `dasha-live-verify` · `dasha:where` for SoR paths · see `DASHA-WORKFLOW.md` |
  | Demigod | `bin/dg truth` (+ `npm run demigod:verify:source` / targeted) |

- **Workspace SoR for ship-bound sources:** `/home/potter`. Worktrees are for isolated edits; promote before ship.
- Local research, audits, screenshots, verification, and scoped code edits are fine without mid-cycle questions. Fable/Claude/Codex opinions are advisory; verify against disk.

## User communication

- **Do not assign the user work** (DMs, calls, Publish clicks, “your turn”, human checklists, “recommended next for you”).
- **Do agent work** and report what *you* did or blocked on.
- Human-action advice only if the user **explicitly** asks (e.g. “what should I do?”).
- Omit “you can still…”, “you need to…”, “human next:” framing unless asked.

## Multi-agent (Claude ⇄ Grok ⇄ Codex)

Protocol: [`AGENT-COMMS.md`](AGENT-COMMS.md). Bus: `bin/dg-bus`.

- Always pass **`--from <claude|codex|grok>`** on `send` and `task` (required; no default).
- **One writer per file.** Claim via `dg-bus send` before editing shared sources when other agents may be live.
- Interactive TUIs do **not** auto-read the bus — use `dg-bus task` / `send`, or a durable handoff file path.
- `/tmp/dg-busy/**` is operational, not product truth; promote conclusions into project docs.
- Prefer read-only research/review tasks; grant write scope narrowly. Verify worker claims before accepting them.
- No agent is authority equal to the user.

## Code defaults

- **Ponytail (required):** YAGNI → reuse → stdlib → native → dep → one line → minimum. Keep security, a11y, validation, data-loss handling. Rules: [`docs/PONYTAIL-AGENTS.md`](docs/PONYTAIL-AGENTS.md).
- **Reasoning:** weakest sufficient hypothesis (least restrictive that fits evidence + hard constraints). Use `$maximize-weakness` for nontrivial planning, diagnosis, research synthesis, ambiguous requirements.
- **Keep working** only **inside the active project**. Do not stop after reporting if unblocked Dasha (or Demigod, when active) work remains. Stop when blocked on user auth, true ambiguity, or a safety gate — not by inventing out-of-scope chores. Procedure when Demigod is active: [`DEMIGOD-KEEP-WORKING-PROMPT.md`](DEMIGOD-KEEP-WORKING-PROMPT.md).
- **Dogfood** ship gates and new/flaky tools (`demigod-tool-dogfood.mjs`); not every trivial command.
- Do **not** put agent-owned sources only under `.local/` or `.config/` (tool-blocked). Prefer `bin/`, `demigod-*.mjs`, project `*.md`, `systemd-user/`. Broad `DEMIGOD-*` gitignore is forbidden.
- Do **not** auto-spawn cloud agents, `continuous-improve-loop.mjs`, or `demigod:continuous` unless the user asks.

## Game hard stop

Unless the user says “reopen the game” or names a specific game file, do not edit, verify, playtest, or discuss:

- `ninjawhee-eat-the-sounds.html`, `overworld.js`, `vinyl-*.js`, `game-progress.js`, `pause-journal.js`, `pixel-gfx.js`
- `npm run verify:all` / `verify` (game), game HTTP `:8765`, game P0 backlog, playtest MCP on game URLs, `eat-the-sounds/` mirror sync

Sources stay on disk; archived from agent work, not deleted.

## Where to go next

| Need | Open |
|------|------|
| Dasha work | `DASHA-RULES.md` → `DASHA-DOCS.md` → `DASHA-WORKFLOW.md` |
| Demigod work (when reopened) | `DEMIGOD-SIMPLE.md` → `DEMIGOD-AGENTS.md` |
| Cross-agent bus | `AGENT-COMMS.md` · `bin/dg-bus status` |
| Doc map | `DOCS.md` |
| Ponytail | `docs/PONYTAIL-AGENTS.md` |
