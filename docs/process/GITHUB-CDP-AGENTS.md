# GitHub tab + CDP + multi-agent (Grok · Claude · Codex)

**Purpose:** how agents use (1) an open Chrome GitHub tab via CDP `:9223` and (2) GitHub API (`gh` / GitHub MCP) together—without treating the browser as the shared bus.

**CDP:** `http://127.0.0.1:9223` · start: `~/agent-dev.sh up`  
**Helper:** `node demigod-github-agent.mjs` · `bin/dg-github`

---

## Two pipes

| Pipe | Use |
|------|-----|
| **API** (`gh`, GitHub MCP) | PRs, checks, diffs, comments, notifications — **default multi-agent truth** |
| **CDP tab** | What a human sees right now (UI, Checks paint, merge box) — **optional confirm** |

Do **not** use CDP for password reset, 2FA, or typing secrets.  
Do **not** merge / force-push / change org billing without **current-request** auth.

---

## Pin the tab (human, once per session)

Keep **one** GitHub page in the CDP Chrome (tab budget ~4–8 total):

- Preferred: `https://github.com/Uuriko/<repo>/pull/<N>` or `…/actions`  
- CDN ship work: `https://github.com/Uuriko/demigod-site-cdn`  
- Avoid leaving only `https://github.com/` (no work unit)

Then agents can say “the open GitHub tab” and mean a real PR/repo.

---

## Agent roles

| Agent | GitHub job |
|-------|------------|
| **Grok** | Implement; `gh` + local gates; optional CDP screenshot; write `/tmp/dg-busy/*` brief |
| **Claude** | Integrity / path audit on PR brief; receipt under `/tmp/dg-busy/claude-…` |
| **Codex** | PASS/BLOCK gates on same brief; receipt under `/tmp/dg-busy/codex-…` |

Shared IDs: **owner/repo#N** (or full PR URL), plus receipt paths. Not “look at my Chrome.”

---

## Standard loop

```text
1. Human opens PR tab (or agent: node demigod-github-agent.mjs focus --pr=N --repo=…)
2. node demigod-github-agent.mjs brief --pr=N --repo=owner/repo
   → /tmp/dg-busy/github-pr-brief.json + .md
3. bin/dg-bus send claude --subject "PR N integrity" --body "brief path + URL"
4. bin/dg-bus send codex  --subject "PR N PASS/BLOCK" --body "same"
5. Grok implements from brief + peer receipts
6. gh pr checks / GitHub MCP check runs
7. Optional: CDP snapshot of Checks tab for human
```

### PR body template (paste when opening PR)

```markdown
## Goal
…

## Touch
- …

## Forbidden
- no publish / no invent roles / no outbound (unless current request says so)

## Verify
```bash
node demigod-control-board.mjs --selftest
# + task-specific selftest
```

## Receipts
- `/tmp/dg-busy/…`
```

---

## Commands

```bash
# CDP + API snapshot for agents
node demigod-github-agent.mjs status          # tabs + auth + notif sample
node demigod-github-agent.mjs tabs            # GitHub pages on :9223
node demigod-github-agent.mjs brief --repo=Uuriko/demigod-site-cdn --pr=1
node demigod-github-agent.mjs notif           # actionable notifications
bin/dg-github status                          # same via bin

# API only (any agent with gh)
gh pr list -R Uuriko/demigod-site-cdn
gh pr checks <N> -R Uuriko/demigod-site-cdn
gh pr view <N> -R Uuriko/… --comments
```

Bus (Orca):

```bash
bin/dg-bus send claude --subject "GitHub brief" --body "See /tmp/dg-busy/github-pr-brief.md"
bin/dg-bus send codex  --subject "GitHub PASS/BLOCK" --body "Same brief; no invent pilots"
```

---

## Hygiene

- Close extra GitHub/mail/Meet iframes; keep **one** GitHub work tab.  
- Prefer API for bulk; CDP only when UI-specific.  
- Writes (comment, review, merge): current-request gated.  
- Local Demigod product truth remains disk + `bin/dg truth`, not GitHub.

---

## Related

- CDP site audits: `~/.cursor/commands/dg-cdp.md`  
- Peer bus: `docs/process/AGENT-PEER-BUS.md`, root `AGENT-COMMS.md`  
- Control board: `docs/die/CONTROL-BOARD-DESIGN.md`
