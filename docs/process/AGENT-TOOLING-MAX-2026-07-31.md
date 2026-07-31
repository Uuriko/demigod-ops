# Getting the most out of Grok, Claude Code, Codex, and tools

Deep pass 2026-07-31. Research: OpenAI Codex best practices, Claude Code skills/plugins docs, Agent Skills open standard (`skills.sh`), Demigod control plane inventory.

---

## 1. What you already have (strong baseline)

| Layer | Installed | Notes |
|-------|-----------|--------|
| **Grok Build** | 0.2.117 | `permission_mode=always-approve`, compact UI, subagents on |
| **Claude Code** | 2.1.220 | Ponytail, frontend-design, Stripe; Gmail+Calendar MCP connected |
| **Codex CLI** | 0.146.0 | gpt-5.6-sol, ultra effort, danger-full-access, ponytail hooks |
| **Cursor rules** | demigod, ponytail, no-user-homework, … | Always-on project rules |
| **Orca** | App + orca-ide | Worktrees, orchestration, multi-agent |
| **Demigod bin** | 50+ `bin/dg*` | Control plane — **use these before inventing commands** |
| **Grok MCP** | chrome-devtools, webflow, figma, github, gamma, stripe (partial) | Doctor: 6 healthy |
| **Claude MCP** | Gmail ✔, Calendar ✔, Stripe needs auth | Claude.ai managed |
| **Tools registry** | 145 Demigod tools | `bin/dg tools` |

Ponytail is the coding discipline across agents. **Do not disable it.**

---

## 2. How to get more from each agent

### Shared pattern (all agents)

Research consensus (OpenAI Codex learn guide + Claude skills docs):

1. **Goal + context + constraints + done-when** in every non-trivial prompt  
2. **Plan first** on ambiguous work (`/plan`, Plan mode, or ask agent to interview you)  
3. Put durable rules in **AGENTS.md** (not re-pasted prompts)  
4. Put repeatable procedures in **skills** (lazy-loaded; cheaper than bloating AGENTS.md)  
5. **Verify** with the project’s real gates (Demigod: `bin/dg truth`, verify:source, board honesty)  
6. After the agent makes the same mistake twice → update AGENTS.md or a skill  

### Grok (this session / Grok Build)

| Do | Command / habit |
|----|-----------------|
| Orient | `bin/dg home`, `bin/dg truth` |
| MCP | `/mcps` → `i` to reauth (Gmail gateway still revoked here) |
| Plugins | `/plugin` — enable **firecrawl** for free web scrape OAuth |
| Skills | `/skills` — demigod-gates, demigod-orient, ponytail, review, chrome-devtools |
| Workflows | `/create-workflow` for multi-agent fan-out |
| Resume | resume-claude / resume-codex / resume-cursor skills when switching |
| Ship | Only with explicit “publish”; else `bin/dg ship prepare` |

Grok strengths on this machine: long Demigod ops, research digests, parallel tools, GitHub+Webflow MCP.

### Claude Code

| Do | Command / habit |
|----|-----------------|
| Session start | `cd` worktree · `export DEMIGOD_ROOT=$PWD` · read SIMPLE + COMPRESSED |
| Verify | `/demigod-gates` or skill demigod-gates · `/verify` bundled |
| Code review | `/code-review` (plugin) · `/pr-review-toolkit` |
| Commits | `/commit` from commit-commands plugin |
| Security | security-guidance plugin (auto on risky patterns) |
| Skills author | `/skill-creator` |
| Feature work | `/feature-dev` for structured feature delivery |
| Design | frontend-design plugin |
| MCP | `claude mcp list` · Stripe: authenticate when billing work |
| Plugins just enabled | code-review, commit-commands, security-guidance, skill-creator, pr-review-toolkit, feature-dev |

Claude strengths: careful refactors, skill authoring, PR review, plan→implement.

### Codex CLI

| Do | Command / habit |
|----|-----------------|
| Config | `~/.codex/config.toml` (ultra effort already) |
| Project trust | Worktree should be trusted (add if missing) |
| Skills | `~/.agents/skills/` + repo `.agents/skills/` |
| Review | `/review` against base branch |
| Plan | `/plan` or Plan mode before large edits |
| MCP | webflow + openaiDeveloperDocs already; add github if needed |
| Worktrees | Prefer Orca-isolated worktrees for parallel Codex |

Codex strengths: hard reasoning, surgical fixes, PR review, high-effort debugging.

### Orca multi-agent

| Do | Habit |
|----|--------|
| Spawn | Separate worktrees for Claude vs Codex vs Grok |
| Orchestration | `orca-ide orchestration check …` at task boundaries |
| Comms | `AGENT-COMMS.md` — Orca primary; ask-* fallbacks |
| Avoid | Parallel foot-core editors without foot lock |

---

## 3. Free tools & installs

### Installed this pass (no sudo)

- Claude plugins: **code-review, commit-commands, security-guidance, skill-creator, pr-review-toolkit, feature-dev**
- Skills: **web-design-guidelines** (Vercel agent-skills via `npx skills`)
- User-local CLIs (when download finished): shellcheck, yq, delta, tldr → `~/.local/bin`

### Free / freemium worth enabling (you click OAuth once)

| Tool | How | Why |
|------|-----|-----|
| **Firecrawl** (Grok plugin already on disk) | `/plugin` enable firecrawl · first use OAuth | Scrape/search without inventing HTML parsers |
| **Gmail** (Grok gateway) | `/mcps` → gmail → `i` | Agent mail (currently revoked) |
| **Stripe MCP** | OAuth in Claude + Grok | Fee/invoice later — not free product, free MCP auth |
| **GitHub** | Already on Grok + `gh` as Uuriko | CI, PRs, demigod-ops |
| **Webflow** | Already MCP | Designer paste path |
| **Figma** | Already MCP | Design-to-code if you use Figma |
| **Chrome DevTools MCP** | Already · CDP :9223 | Live a11y/LCP/playtest |

### Free CLIs still useful (if not present)

```bash
# User-local (no sudo) — already scripted to ~/.local/bin
shellcheck   # shell scripts in bin/
yq           # YAML (Codex/Claude configs)
delta        # better git diffs
tldr         # quick command help
```

### Do **not** install for Demigod

- Extra “AI coding” CLIs that duplicate Claude/Codex/Grok (noise)
- Paid scrape farms when Firecrawl free OAuth covers research
- Auto-DM / mass-outreach tools (policy-forbidden)

---

## 4. Demigod-specific command cheat sheet

```bash
export DEMIGOD_ROOT=/home/potter/.grok/worktrees/potter/demigod
cd "$DEMIGOD_ROOT"

bin/dg truth                 # release identity
bin/dg home                  # control plane
bin/dg ship prepare          # gates only
bin/dg tools                 # 145 tools
bin/dg-blog sync|status
bin/dg lock status|release
node demigod-work-find.mjs
node demigod-site-health.mjs
npm run demigod:verify:source
node demigod-foot-smoke.mjs  # now prefers DEMIGOD_ROOT / sibling foot
```

Cursor slash-style commands already on machine: `dg-verify`, `dg-test`, `dg-cdp`, `dg-snap`, `dg-gtm`, `dg-pilot`, `dg-implement`.

---

## 5. Multi-agent operating model (recommended)

```
You (intent + publish gates)
    │
    ├─ Orca worktree A → Claude Code   (design, careful foot edits, skills)
    ├─ Orca worktree B → Codex         (hard bugs, PR review, isolated)
    └─ Orca worktree C / main → Grok   (ops loop, research, ship prep, audit)
```

**One foot-core writer at a time** (`bin/dg lock claim`).  
**Verify in the same worktree** that edited files.  
**Ship** only when you say so in the current message.

---

## 6. Skill locations (cross-agent)

| Agent | Personal skills | Project skills |
|-------|-----------------|----------------|
| Claude | `~/.claude/skills/` | `.claude/skills/` |
| Codex | `~/.agents/skills/`, `~/.codex/skills/` | `.agents/skills/` |
| Grok | `~/.grok/skills/` + bundled | project `.grok/skills/` |
| Cursor | commands under `~/.cursor/commands/` | project rules |

New shared skills (this pass):

- `demigod-gates` — verification ladder  
- `demigod-orient` — session start / control plane  

Canonical copies: `docs/skills/demigod-*/SKILL.md` (symlinked into agent homes).

---

## 7. Customizations applied this pass

1. Claude Code plugins enabled (6 free official)  
2. `demigod-foot-smoke.mjs` no longer hard-defaults only to `/home/potter/demigod-foot-core.js`  
3. Shared demigod-gates + demigod-orient skills for Claude/Codex/Grok/agents  
4. Vercel **web-design-guidelines** skill installed for UI audits  
5. This playbook under `docs/process/`  

---

## 8. Your next 10 minutes (human, high leverage)

1. **Grok:** `/mcps` → gmail → `i` (restore agent mail)  
2. **Grok:** `/plugin` → enable **firecrawl** → first scrape triggers free OAuth  
3. **Claude:** open Demigod worktree · `/skills` · confirm demigod-gates listed  
4. **Codex:** `codex` in worktree · confirm skills load · trust project if prompted  
5. **Optional publish:** say “publish” to land v869 blog+map on live  

---

## 9. Prompt templates that work better

**Ops (Grok):**  
> With DEMIGOD_ROOT=worktree: run truth + work-find; do next unblocked P0 that is not publish; report gates.

**Careful edit (Claude):**  
> Plan mode first. Edit only X. Run demigod-gates skill. Ponytail. No publish.

**Hard bug (Codex):**  
> Goal … Constraints: no invented pilots; verify with npm run demigod:verify:source. Done when tests pass and board honesty green.

**Review:**  
> /code-review or /review against snapshot branch; list only real defects + board-honesty risks.

---

*References: OpenAI Codex learn/best-practices; Claude Code skills + plugins docs; skills.sh / Vercel agent-skills; Demigod AGENTS.md + bin/dg control plane.*

## Justfile (2026-07-31)

Root `Justfile` wraps Demigod gates for any agent:

```bash
export PATH="$HOME/.local/bin:$PATH"
cd $DEMIGOD_ROOT
just orient    # truth tail
just gate      # smoke + board + blog
just gate-full # + verify:source + site-health
just prepare   # ship prepare only
just secrets   # gitleaks
just watch-foot
```

Install (once): `curl … just.systems/install.sh | bash -s -- --to ~/.local/bin`
Also: `gitleaks`, `watchexec` in `~/.local/bin`. Config: `.gitleaks.toml`.
