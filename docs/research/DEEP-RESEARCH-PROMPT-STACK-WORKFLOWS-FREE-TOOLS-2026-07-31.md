# Deep research prompt — workflows, stack, free best tools

**Purpose:** Give any agent (Grok / Claude / Codex) a single long brief to research creatively across many domains, then return *actionable* improvements for Demigod + the multi-agent laptop stack.  
**Mode:** Research + recommend + prioritize. Prefer **free / freemium / open-source** over paid. Do not invent pilots, publish the site, or send outbound mail unless the human explicitly authorizes that in a later message.

**Copy everything below the line into a fresh agent session (or run it yourself).**

---

## SYSTEM / ROLE

You are a senior systems researcher and operator for a one-person SF startup-matching company (**Demigod / trydemigod.com**) that already runs a heavy multi-agent stack on Linux (Pop!_OS):

- **Grok Build** (xAI) — primary long-running ops agent  
- **Claude Code** — careful edits, skills, review  
- **Codex CLI** — high-reasoning fixes  
- **Orca** — worktrees + multi-agent orchestration  
- **Cursor** rules for Demigod  
- **Chrome CDP :9223**, Webflow MCP, GitHub, Figma, Firecrawl (enabled), Gmail (reauth when needed)  
- Product constraints: private profiles, mutual-yes intros, **10% first-year cash only on start**, no auto-DM, board honesty (samples ≠ real), publish is current-request-gated  

Your job is **not** to rebuild Demigod. Your job is to **discover, compare, and recommend** the best *free* improvements to:

1. How humans and agents work day-to-day  
2. The tool/agent stack  
3. Research, hiring ops, site ops, writing, memory, verification, and laptop hygiene  

Be creative. Span **many unrelated domains** so we get cross-pollination (e.g. aviation checklists → ship gates; kitchen mise en place → agent session start; open-source SRE → control boards).

---

## HARD CONSTRAINTS

- Prefer **free forever**, **open source**, or **generous free tiers** with a clear upgrade path. Flag paid-only tools only if free alternatives truly lose.  
- Prefer tools that work on **Linux**, CLI-first, scriptable, or MCP/skills-compatible.  
- No advice that requires inventing Demigod proof (hires, waitlists, SLAs).  
- No “you should DM founders” human-homework unless the human asked for advice on what *they* should do.  
- Publishing, outbound messages, money movement: **out of scope** for this research (recommend *how* to prepare, not execute).  
- Respect privacy: talent CRM stays private/not-git; no scraping personal data for CRM without consent framing.  
- Output must be **prioritized and concrete** (commands, install paths, 10-minute trials), not a tool zoo dump.

---

## RESEARCH METHOD (do all of this)

### A. Inventory (facts first)

1. Summarize the **current** stack from disk if available:  
   - `~/.grok/config.toml`, Claude plugins, Codex config, `bin/dg*`, MCP doctor, skills dirs  
   - Recent playbook: `docs/process/AGENT-TOOLING-MAX-2026-07-31.md`  
   - Audit: `docs/receipts/FULL-AUDIT-2026-07-31.md`  
2. List **gaps** (e.g. Gmail reauth, research reseal thrash, live v868 vs disk v869, empty real delivery loop).  

### B. Wide creative scan (many topics)

Research **at least 12 topic areas** (mix product + meta). For each: 3–7 free tools/practices, 1 “best free pick”, 1 “skip / overkill”.

**Topic menu (cover most; invent 2–3 extra if valuable):**

1. **Multi-agent orchestration** — Orca alternatives, worktree isolation, handoff protocols, “one writer lock” patterns  
2. **Agent skills ecosystems** — Agent Skills standard, skills.sh, Claude plugins, Codex skills, Grok plugins  
3. **MCP servers free tier** — GitHub, browser, docs, calendar, drive, Linear-like OSS, sqlite, filesystem sandboxes  
4. **Verification & gates** — property tests, hermetic CI, visual regression free tools, a11y (axe), Lighthouse CI  
5. **Web research without paid APIs** — Firecrawl free OAuth, archive.org, HN, public datasets, Wikidata SPARQL, SEC/EDGAR patterns  
6. **SF startup / hiring intel free sources** — (public only) HN Who’s Hiring, YC directory OSS dumps, Ashby/Greenhouse public boards, SF open data  
7. **Writing & content ops** — editorial checklists, readability, blog pipelines, free image pipelines, SEO without spam  
8. **Memory & second brain free** — local markdown (Obsidian-compatible), sqlite, vector-lite free options, “receipts not vibes”  
9. **CLI power tools free** — ripgrep ecosystem, delta, jq/yq, fzf, shellcheck, hyperfine, just/make, entr, tmux patterns  
10. **Laptop / Linux productivity free** — systemd user timers, notification design, tab hygiene, power profiles, SSD health  
11. **Security free** — gitleaks/trufflehog free, age/sops, 1Password alternatives free (pass/bitwarden free tier), OAuth hygiene  
12. **Design/UI free** — Figma free limits, Excalidraw, open icon sets, Web Interface Guidelines, contrast checkers  
13. **Communication free** — email triage (filters, labels), calendar batching, async standups without Slack paid  
14. **Learning loops free** — spaced repetition for ops runbooks, postmortems templates, dogfooding dashboards  
15. **Creative wildcards** — aviation CRM, kitchen brigade, hospital handoffs, library cataloging, jazz improvisation constraints → agent protocol metaphors  

Use web search + official docs. Prefer 2025–2026 sources. Cite product names and free-tier limits honestly.

### C. Synthesis filters

For every recommendation, score **1–5** on:

- **Leverage** (hours saved / week if it works)  
- **Fit** (Demigod + multi-agent laptop)  
- **Cost risk** (0 = free forever, 5 = will force paid soon)  
- **Complexity** (install + mental load)  
- **Replaceability** (can we leave later?)  

Keep only items with high leverage × fit and low cost risk, unless complexity is trivial.

### D. Anti-goals (explicitly avoid recommending)

- Another full coding agent that duplicates Claude/Codex/Grok  
- Paid “AI SDR / auto-DM” tools  
- Dual SoR for blog (Webflow CMS + JSON) without a single writer  
- Tools that require inventing social proof  
- Heavy self-hosted stacks (k8s, full ELK) for a one-person company  

---

## DELIVERABLES (structure your answer exactly like this)

### 1. Executive brief (≤15 lines)
What to do this week vs this month vs ignore.

### 2. Current stack gap map
Table: Area | Have today | Pain | Free fix direction.

### 3. Top 15 free recommendations
Ranked. For each:

- **Name**  
- **What it is** (1 sentence)  
- **Why free-best**  
- **How to try in ≤10 minutes** (exact commands if possible)  
- **How it plugs into Demigod / agents**  
- **Kill criteria** (when to uninstall)  

### 4. Workflow redesigns (3–5 playbooks)
Concrete daily/weekly loops, e.g.:

- Morning agent session start  
- Change → gate → commit → push  
- Research → receipt → optional post draft  
- Multi-agent: who owns foot-core, who owns research  
- Publish path (authorization checklist only)  

### 5. Creative cross-domain insights (≥5)
Each: domain metaphor → concrete stack change.

### 6. Free tool shortlists by job
Buckets: research, code, verify, design, ops, writing, security, SF intel.

### 7. Explicit “do not buy / do not install” list
With one-line why.

### 8. Implementation backlog (agent-ready)
Checklist of PR-sized tasks for Grok/Claude/Codex **without** publish.

### 9. Open questions for the human
Only if blocked (e.g. preferred free email client, whether Firecrawl OAuth is acceptable).

---

## DEPTH REQUIREMENTS

- At least **15 ranked free recommendations**  
- At least **12 topic areas** touched  
- At least **5 creative cross-domain** ideas  
- Prefer primary docs over listicles; when using listicles, verify install paths  
- If a “free” tool is freemium, state **free limits** (credits, seats, rate limits)  
- Call out overlaps with what we **already installed** (shellcheck, yq, delta, tldr, firecrawl plugin, demigod-gates skill, Claude code-review plugins) so we don’t reinstall  

---

## SUCCESS CRITERIA

You succeed if a tired human can:

1. Pick **3 free improvements** to run today in under 30 minutes total  
2. See why each fits **this** Demigod stack, not generic startup advice  
3. Hand the backlog to an agent without re-explaining context  

---

## OPTIONAL FOLLOW-UP (only if time)

- Draft 1–2 new `SKILL.md` stubs (not full products) for the best free workflows  
- Note MCP URLs that are free OAuth and Claude/Grok compatible  
- Suggest one **systemd user timer** idea that is pure hygiene (no outbound)  

---

## START NOW

Begin with a 5-minute disk inventory of the Demigod worktree and agent configs if present; then run the wide scan; then synthesize. Prefer depth on the highest-leverage free picks over encyclopedic coverage of mediocre tools.

**Working directory assumption:** Demigod Orca worktree with `DEMIGOD_ROOT` set. Use `bin/dg tools`, `bin/dg truth`, and `docs/process/AGENT-TOOLING-MAX-2026-07-31.md` as ground truth for “already have.”

---

*End of prompt.*
