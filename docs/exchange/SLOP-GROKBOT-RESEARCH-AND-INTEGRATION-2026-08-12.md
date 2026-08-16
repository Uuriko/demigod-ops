# Grok Bot — research + multi-agent integration (slop.cash)

**Date:** 2026-08-12  
**Local install:** user-local v0.16.0 (`sand` package) — see `~/.local/share/grok-bot-logs/SETUP.md`  
**Not financial advice. No secrets in this file.**

---

## 1. What Grok Bot is (public + local evidence)

| Fact | Source |
|------|--------|
| **Product** | SpaceXAI “AI teammates” / workplace agent; beta Aug 2026 |
| **Codename** | **Sand** (Debian package `sand`, binary `sand`, protocol `sand://`) |
| **Stack** | Cursor/Anysphere Electron shell + **cloud Linux VM** (“box”) + local-exec bridge |
| **Rivals** | Anthropic Claude Cowork; OpenAI Codex-in-ChatGPT; OpenClaw (local OSS) |
| **Access** | SuperGrok Heavy / Cursor Ultra / Cursor Teams Premium (reported) |
| **Platforms** | Desktop (macOS/Windows/Linux) + iOS; Android later |
| **Brand** | First joint SpaceXAI×Cursor product; Cursor name expected to phase off new products |

### Product promises (press)

- Hand work in chat like a colleague; agents finish end-to-end; interrupt only for approval  
- **Own computer in the cloud** — keeps working when laptop closed  
- Multi-bot / chief-of-staff coordination, shared threads  
- Learn-by-watching routines + long-term memory  
- Connectors (Notion/Slack/GitHub, etc.) inherited from Cursor when configured  
- Works across apps/inbox/web where APIs are missing (browser-style)  

### Architecture (local reverse-engineering, this machine)

```text
Desktop app (Electron "sand")
    ├── UI chat / multi-agent
    ├── Auth: Cursor tokens in ~/.config/Grok Bot/sand-secrets.json
    ├── Gateway descriptor (encrypted) → cloud pod
    └── Local-exec daemon (~/.grokbot/)
            └── serves *local* shell/exec *to* the cloud box over gateway

Cloud box (cursorvm.com pod)
    ├── Gateway API (remote, not 127.0.0.1:1340 on host)
    ├── VNC surface (~:6080) for watching the box desktop
    └── /home/box sand-data — agent home in cloud
```

**Critical implication:** Local-exec is **cloud → laptop**, not “agents script Grok Bot UI.” There is **no stable public local task-enqueue API** on 127.0.0.1 for us to `POST` prompts into the open window. Automation of the chat surface is GUI-level (Wayland/COSMIC here; xdotool mostly blind).

**Logged-in state (this laptop):** session alive, Cursor access+refresh tokens present, local-exec daemon running, cloud pod URL present. Do not commit or print those credentials.

### Contrast with tools already on this machine

| Tool | Role |
|------|------|
| **Grok Bot (sand)** | Cloud general agent + local-exec; GUI product |
| **Grok Build (`grok` CLI / this chat)** | Coding TUI/agent in repo; `~/.grok/` |
| **Claude Code / Codex** | Coding agents via `ask-claude` / `codex-ask` + `dg-bus` |
| **OpenClaw** | Not installed; local OSS alternative in press comparisons |

---

## 2. How we use it for slop.cash (multi-agent)

### Principle

- **Money path unchanged:** Uuriko GH → accepted outcomes on `elizaOS/eliza` `develop` → gitarmy score → USDC settlement.  
- **Grok Bot is a fourth worker**, not a second wallet.  
- Prefer **small mergeable PRs + substantive reviews**; no spam.  
- Grok Bot **cloud autonomy** is good for long research, babysit, multi-step implement *when* instructed via its chat.  
- **File inbox** is the shared coordination surface every agent (including Grok Bot with local-exec) can read/write.

### Shared inbox (canonical)

```text
/home/potter/slop-agent-inbox/
  README.md                 # how to pick work
  STANDING.md               # rules for all agents
  ACTIVE_TASK.md            # single current Grok Bot focus (or empty)
  QUEUE.md                  # backlog
  results/                  # agent writebacks
  archive/                  # done tasks
```

### Lane map

| Agent | Lane | Score style |
|-------|------|-------------|
| **Grok Build (this)** | Implement + rebase babysit + coord + research | Grok model — base score only (not skill-approved model) |
| **Claude** | Formal reviews + optional implement on fable-5 | Review points + measured if skill used |
| **Codex** | Implement/review when write-capable + gpt-5.6-sol | Measured preferred |
| **Grok Bot** | Long-running: babysit CI, pick next issues via live GH, dual-lane implement *or* review when free; use local-exec for laptop git/gh | Same Uuriko identity; coordinate via inbox |

### Identity

- GitHub: **Uuriko** only  
- Wallet marker already on `Uuriko/Uuriko` README  
- Provenance on PRs: name the actual client (`grok-bot` / `claude-code` / `codex` / `grok-build`)  
- No self-reviews; no double-claim of the same issue/files (claim in `QUEUE.md` + GH)

### What Grok Bot should **not** do

- Publish, pay, wallet move, or CT spam  
- Fair-launch / pump tokens  
- Force-push `develop` or other people’s branches  
- Overwrite other agents’ in-progress branches without reclaim note  

---

## 3. Bootstrap prompt (paste into Grok Bot chat once)

File: `/home/potter/slop-agent-inbox/GROKBOT_BOOTSTRAP_PROMPT.md`  
Standing rules: `/home/potter/slop-agent-inbox/STANDING.md`  
First task: `/home/potter/slop-agent-inbox/ACTIVE_TASK.md`

---

## 4. Parallel bus roles (dg-bus)

- Claude: review small open PRs; optional measured implement  
- Codex: write-capable implement or post static reviews  
- Grok Build: merge-quality PRs + ledger + inbox maintenance  

---

## 5. Open questions (product)

1. Official CLI/API to create Sand tasks without UI? (undocumented; createTask symbols exist in bundle)  
2. MCP box servers: empty today — worth GitHub MCP for Grok Bot later  
3. Whether compute receipts from Grok Bot count for gitarmy (approved models only: gpt-5.6-sol / claude-fable-5 — **Grok models likely not measured**)  

---

## 6. Source index

- Trending Topics / Bloomberg-linked coverage of Grok Bot Aug 2026  
- Local: package `sand` 0.16.0, `~/.config/Grok Bot`, `~/.grokbot`, local-exec daemon logs  
- Prior slop: `SLOP-CASH-COMPLETE-GUIDE`, `SLOP-SHAW-X-DEEP-RESEARCH`, contribution ledger  
