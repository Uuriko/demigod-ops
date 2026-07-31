# Deep research results — workflows, stack, free best tools

**Run:** 2026-07-31 · executed from Demigod worktree  
**Sources:** live disk inventory + web research (agent orchestrators, CLI, MCP, ATS free tier, gitleaks, just/watchexec)  
**Baseline docs:** `AGENT-TOOLING-MAX-2026-07-31.md`, `FULL-AUDIT-2026-07-31.md`

---

## 1. Executive brief

**This week (≤30 min total):** (1) first Firecrawl OAuth scrape, (2) install `just` + thin `justfile` for gate recipes, (3) install `gitleaks` user-local and run once on demigod-ops.  
**This month:** optional `claude-squad`/`amux` only if Orca friction is real; wire gitleaks into CI; dogfood `demigod-gates` skill every foot edit.  
**Ignore:** second coding agent (Cline/Aider/Warp AI), free SaaS ATS (Dover etc.) as core CRM, dual blog SoR, paid AI SDR.

**Biggest free leverage left:** finish OAuth connectors you already installed (Firecrawl, Gmail if not done), stop inventing tools—**use `bin/dg*`**, and add **secret scanning + one-command gate recipes**. Live product lag (v869) is a **publish** decision, not a tools gap.

---

## 2. Current stack gap map

| Area | Have today | Pain | Free fix direction |
|------|------------|------|--------------------|
| Agents | Grok 0.2.117, Claude 2.1.220, Codex 0.146, Orca | Context switch cost | Skills + role split (already started); no 4th agent |
| Skills | demigod-gates/orient, ponytail, web-design-guidelines | Skills unused if not invoked | Session start: always demigod-orient |
| MCP | GH, Webflow, Figma, CDP, Gamma; Stripe fail; Firecrawl enabled | Auth holes | OAuth once; skip paid MCP sprawl |
| Demigod gates | 145 tools, useful-loop + role-ledger timers active | Agents forget gates | `just gate` / demigod-gates skill |
| Release | Disk v869 / live v868, blog 9 vs 1 | Public lag | Human: authorize publish |
| Research seals | reseal fail-fresh thrash | Noise | Don’t thrash; fix fixture later |
| CLI | shellcheck, yq, delta, tldr, rg, fd, fzf, bat, gh | No `just`, no gitleaks | Install both user-local |
| Security | Manual | Agent commits risk secrets | gitleaks pre-commit / CI |
| Orchestration | Orca worktrees | Lock thrash dead PIDs | Release-force hygiene; skip Conductor (Mac) |
| SF intel | HN, map 3706 cos, roles feed | Map enrich lag | Public ATS URLs only; no paid LinkedIn |
| Writing | Blog JSON SoR + quality gate | Live thin until ship | Don’t rebuild CMS |
| Memory | `/tmp/dg-busy` receipts, docs/receipts | Scattered | One “session receipt” habit |

---

## 3. Top 15 free recommendations (ranked)

Scores: Leverage / Fit / CostRisk(0 free–5 paid) / Complexity (1 easy–5 hard). Prefer high L×F, low cost risk.

### 1. Firecrawl first OAuth (already plugin-enabled)
- **What:** Hosted scrape/search MCP free OAuth.  
- **Why free-best:** Replaces brittle curl+cheerio for research; JS render.  
- **10 min:** Ask Grok “scrape https://docs.firecrawl.dev and summarize”; complete browser OAuth.  
- **Plug-in:** Market research, competitor pages, public career pages.  
- **Kill if:** Credit wall hits before value; then fall back to CDP + curl.  
- Scores: L5 F5 cost1 C1

### 2. `just` + Demigod Justfile (gate recipes)
- **What:** Free command runner (CC0).  
- **Why free-best:** One-word recipes beat retyping gate ladders; better than inventing more bin wrappers.  
- **10 min:**  
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to "$HOME/.local/bin"
  ```  
  Add recipes: `truth`, `gate`, `blog`, `prepare` calling existing `bin/dg` / node scripts.  
- **Plug-in:** Every agent docs say `just gate` after foot edits.  
- **Kill if:** Nobody runs it (keep bin/dg only).  
- Scores: L4 F5 cost0 C1

### 3. Gitleaks user-local + one full scan
- **What:** OSS secret scanner (MIT).  
- **Why free-best:** Agents write tokens into trees; personal GH repos free.  
- **10 min:**  
  ```bash
  curl -sSL -o /tmp/gl.tgz https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_8.30.0_linux_x64.tar.gz
  # (check latest tag) tar + mv to ~/.local/bin
  gitleaks detect -s "$DEMIGOD_ROOT" --no-git -v
  ```  
- **Plug-in:** Pre-push / CI on demigod-ops; agent rule “run after adding env samples”.  
- **Kill if:** Zero findings forever and friction high (keep occasional).  
- Scores: L4 F5 cost0 C2

### 4. Dogfood demigod-gates / demigod-orient every session
- **What:** Skills already installed.  
- **Why free-best:** Zero install; highest ROI process.  
- **10 min:** Start Claude/Grok with “run demigod-orient then demigod-gates ladder for my last edit”.  
- **Plug-in:** All agents.  
- **Kill if:** Never—only refine.  
- Scores: L5 F5 cost0 C0

### 5. Chrome DevTools MCP a11y skill on /pricing + /startups
- **What:** Already installed chrome-devtools + a11y-debugging skill.  
- **Why free-best:** Live truth beats static guess.  
- **10 min:** “Use a11y-debugging on https://www.trydemigod.com/pricing via CDP :9223”.  
- **Plug-in:** Pre-ship checklist.  
- **Kill if:** CDP flaky—fall back to axe-core in existing audits.  
- Scores: L3 F5 cost0 C2

### 6. watchexec for local foot gate loop
- **What:** Free file watcher (Rust).  
- **Why free-best:** Auto re-run foot-smoke on save without editor plugins.  
- **10 min:** Download binary to `~/.local/bin`;  
  `watchexec -e js -w demigod-foot-core.js -- node demigod-foot-smoke.mjs`  
- **Plug-in:** Local foot editing sessions only.  
- **Kill if:** CPU noise / agents fight lock.  
- Scores: L3 F4 cost0 C2

### 7. Wikidata SPARQL + YC OSS dump (public intel)
- **What:** Free public datasets (already partially used in map pipeline).  
- **Why free-best:** No LinkedIn $; honest licensing (CC0 / YC-public).  
- **10 min:** Re-run existing map builders; don’t add scrapers.  
- **Plug-in:** directory-refresh / map-data.  
- **Kill if:** Rate limits—cache longer.  
- Scores: L3 F5 cost0 C2

### 8. HN Who’s Hiring cache path only
- **What:** Already `demigod-hn-hiring` + quality filters.  
- **Why free-best:** Best free SF hiring signal.  
- **10 min:** `node demigod-hn-hiring.mjs` when monthly refresh due—not thrash.  
- **Plug-in:** map + roles.  
- **Kill if:** Never core—only cadence.  
- Scores: L3 F5 cost0 C1

### 9. GitHub Actions gitleaks on push (personal free)
- **What:** Free Actions minutes on private demigod-ops.  
- **Why free-best:** Catches agent secret leaks CI-side.  
- **10 min:** Add workflow step `gitleaks/gitleaks-action` (personal account: no org license).  
- **Plug-in:** demigod-ops verify workflow sibling.  
- **Kill if:** Noisy false positives—tune .gitleaks.toml.  
- Scores: L3 F4 cost0 C2

### 10. Claude `/code-review` + `/commit` on every non-trivial PR
- **What:** Plugins already enabled.  
- **Why free-best:** Uses subscription you already pay; no new SaaS.  
- **10 min:** After Codex/Grok edit: Claude `/code-review`.  
- **Plug-in:** Multi-agent handoff.  
- **Kill if:** Never.  
- Scores: L4 F5 cost0 C0

### 11. tmux + existing `bin/dg-tmux-cockpit` / `bin/dg-cockpit`
- **What:** Free mux you already have scripts for.  
- **Why free-best:** Better than buying Warp.  
- **10 min:** `bin/dg-tmux-cockpit` once; keep 1 pane truth, 1 agent.  
- **Plug-in:** Human operator.  
- **Kill if:** You live in Orca UI only.  
- Scores: L2 F4 cost0 C1

### 12. Excalidraw (web free) for match/flow diagrams
- **What:** Free whiteboard.  
- **Why free-best:** No Figma seat needed for internal ops diagrams.  
- **10 min:** sketch mutual-yes flow once; store PNG under docs if useful.  
- **Plug-in:** GTM explainers, not public site.  
- **Kill if:** Unused.  
- Scores: L2 F3 cost0 C1

### 13. archive.org + public company pages for research receipts
- **What:** Free historical pages.  
- **Why free-best:** Stable citations when sites change.  
- **10 min:** For any research claim, save Wayback URL in research md.  
- **Plug-in:** docs/research.  
- **Kill if:** Never.  
- Scores: L2 F4 cost0 C0

### 14. skills.sh / `npx skills add` only for proven packages
- **What:** Free skill install hub (Vercel).  
- **Why free-best:** Cross-agent skills without reinventing.  
- **10 min:** Only add skills you’ll invoke weekly (already have web-design-guidelines).  
- **Plug-in:** Claude/Codex/Grok.  
- **Kill if:** Skill bloat—`npx skills list` and prune.  
- Scores: L2 F4 cost0 C1

### 15. systemd user timers you already run — audit, don’t multiply
- **What:** useful-loop + role-ledger timers active.  
- **Why free-best:** Best free automation is the one that already passes.  
- **10 min:** `systemctl --user list-timers --all | rg demigod`  
- **Plug-in:** Ops.  
- **Kill if:** Adding more reseal thrash timers—don’t.  
- Scores: L3 F5 cost0 C0

---

## 4. Workflow redesigns (playbooks)

### A. Morning session start (any agent)
1. `export DEMIGOD_ROOT=…worktree… && cd $DEMIGOD_ROOT`  
2. Invoke **demigod-orient** (or read SIMPLE + `bin/dg truth` tail)  
3. `node demigod-work-find.mjs --json`  
4. Pick one unblocked task that is **not** publish unless authorized  
5. Foot lock check: dead PID → release --force  

### B. Change → gate → commit → push
1. Edit (Ponytail)  
2. `just gate` or demigod-gates ladder  
3. `git status` / secret scan if env-like files touched  
4. Commit with real message; push demigod-ops  
5. Watch `gh run list -R Uuriko/demigod-ops --limit 1`  

### C. Research → receipt
1. Question → Firecrawl or public data only  
2. Write `docs/research/TOPIC-YYYY-MM-DD.md` with sources  
3. No CRM PII in git  
4. Optional blog draft in `demigod-blog-posts.json` with `published:false` until quality gate  

### D. Multi-agent ownership
| Owner | Owns | Never |
|-------|------|-------|
| Grok | Ops loop, research digests, ship prepare, audits | Stealing live foot lock from Codex mid-edit |
| Claude | Careful foot/CSS, skills, code-review | Unauthorized publish |
| Codex | Hard bugs, isolated worktree, /review | Parallel foot without lock |
| Orca | Worktrees + threads | Replacing `bin/dg truth` |

### E. Publish checklist (authorization only)
Human says publish → lock claim → ship prepare green → ship run with `DEMIGOD_CURRENT_REQUEST_PUBLISH=1` → truth require-match → freeze policy as configured. Agents do not invent the authorize words.

---

## 5. Creative cross-domain insights

1. **Aviation CRM (crew resource management)** → Every agent handoff needs readback: “disk v869 live v868 lock free” spoken once at start—reduces wrong-root edits.  
2. **Kitchen mise en place** → Session start is mise: DEMIGOD_ROOT, truth, work-find, lock—before “cooking” code.  
3. **Hospital SBAR handoff** → Situation/Background/Assessment/Recommendation in agent messages when switching Claude↔Grok.  
4. **Library cataloging** → Research lives in `docs/research/` with dates; receipts in `/tmp/dg-busy` are circ desk, not stacks—don’t treat busy as long-term memory.  
5. **Jazz constraints** → Ponytail + publish gate are the chord changes; freestyle only inside the form.  
6. **SRE error budgets** → Research reseal thrash is burning error budget; freeze reseal retries until fixture fixed (don’t “heal” forever).  

---

## 6. Free tool shortlists by job

| Job | Best free picks | Skip |
|-----|-----------------|------|
| **Research** | Firecrawl OAuth, Wayback, Wikidata, HN, YC public dump | Paid LinkedIn scrapers |
| **Code** | Claude/Codex/Grok you have + ponytail | Cline/Aider as 4th agent |
| **Verify** | demigod gates, CI verify.yml, gitleaks, CDP a11y | New SaaS QA |
| **Design** | web-design-guidelines skill, Excalidraw free, Figma MCP if already used | Another design AI sub |
| **Ops** | just, watchexec, systemd timers, tmux cockpit | Warp paid AI terminal |
| **Writing** | blog JSON SoR + quality, archive.org cites | Dual Webflow CMS SoR |
| **Security** | gitleaks, shellcheck, owner-only mcp_credentials 0600 | Enterprise secret SaaS |
| **SF intel** | Map pipeline sources already; public ATS host lists | Free SaaS ATS as SoR (Dover etc.) |

---

## 7. Do not buy / do not install

| Item | Why |
|------|-----|
| Another coding agent (Cline, Aider, Warp AI) | Duplicates Claude/Codex/Grok; more split-brain |
| Conductor / Crystal for multi-agent | Mac-first or UI you don’t need—Orca already owns worktrees on Linux |
| CrewAI/LangGraph “platform” | Framework tax for one founder; you need ops not agent-framework product |
| Free SaaS ATS (Dover/Workable free) as Demigod core | Wrong product shape; privacy + matching is yours |
| Paid AI SDR / auto-DM | Policy forbidden + brand risk |
| Webflow CMS dual blog SoR | Already decided JSON+foot path |
| k8s / ELK / full observability suite | One laptop company overkill |
| Skills marketplace bloat | Only weekly-used skills |

---

## 8. Implementation backlog (agent-ready, no publish)

- [ ] Install `just` to `~/.local/bin`; add Justfile: `truth`, `gate`, `blog-check`, `prepare`  
- [ ] Install `gitleaks`; run detect; add ignore for known false positives  
- [ ] Optional: gitleaks job in `.github/workflows/verify.yml`  
- [ ] Firecrawl: one real scrape OAuth in Grok session  
- [ ] watchexec binary for foot-smoke watch recipe  
- [ ] Document SBAR handoff one-liner in AGENT-COMMS.md (short)  
- [ ] After human authorize: ship v869 (separate request)  
- [ ] Stop reseal thrash: document known fail-fresh; don’t loop useful-loop reseal  

---

## 9. Open questions for the human

1. Is Firecrawl OAuth acceptable for competitor/public page research?  
2. Prefer `just` recipes or keep only `bin/dg` (both fine; just is sugar)?  
3. When ready: single word **publish** to close v869/blog/map lag?  

---

## Appendix — inventory snapshot (this run)

- Agents: Claude 2.1.220 · Grok 0.2.117 · Codex 0.146  
- Claude plugins: code-review, commit-commands, feature-dev, frontend-design, ponytail, pr-review-toolkit, security-guidance, skill-creator, stripe  
- Free bins present: shellcheck, yq, tldr, delta, jq, rg, fd, fzf, bat, gh  
- Demigod: tools ~145 · work-find empty · useful-loop + role-ledger **active**  
- Truth: PASS prepare-only · disk **v869** · live **v868** · lock free  
- MCP doctor: ~6 healthy, Stripe (and possibly Firecrawl cold) needing auth  

---

*End of research run.*
