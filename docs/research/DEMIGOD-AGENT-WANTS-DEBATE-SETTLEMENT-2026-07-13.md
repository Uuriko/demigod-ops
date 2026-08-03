# Multi-Agent Wants Debate & Settlement — 2026-07-13

**Participants:** Fable · Opus · Sonnet · Codex Pro · Grok  
**Codex API path:** unavailable (`OPENAI_API_KEY` missing) — noted as dual-path gap  
**Context:** foot v183 live, dg-start / foot-lock / ship-status / dashboard already landed  
**Phase:** retired setup framing · demand is the product bottleneck  

**Raw agent outputs:** `docs/research/AGENT-*-WANTS-2026-07-13.*`  
**This file:** exhaustive catalog + debate + **settlement**

---

## 0. Executive settlement (read this first)

### What we settled on

| Priority | Build | Owner | Why settlement |
|----------|--------|-------|----------------|
| **#1 this week (ops/reliability)** | **Publish-only-reviewed-hash + receipt** (Codex #1) bundled with **ship-status --strict** in publish path | Grok | Stops “approved A, shipped B”; aligns Fable/Codex trust |
| **#1 this week (product/GTM)** | **Warm founder list (25) + personalized DM pack** (Opus #1–2) | Human send · Sonnet draft · Grok prep | Paid placement is not blocked by tools |
| **#1 this week (plan integrity)** | **PLAN-LEDGER + apply receipts** (Fable #2–3; partial) | Grok | Plans stop dying silently |
| **#1 trust** | **Claim-verifier** (Sonnet #1) | Grok + any agent | “Fixed” must mean re-checked fact |
| **Already done — keep using** | `dg-start`, foot-lock, ship-status, AGENT-BRIEF, dashboard | all | Do not rebuild dashboards |

### Explicit non-settlement (do not build)
- Another dashboard / cockpit UI  
- Foot-core rewrites / OAuth / game / auto-publish watchers  
- Agent thrash loops that touch site when green  
- Anything that accelerates **site churn** over **demand**

### Tension we resolved
- **Opus:** “stop publishing, freeze site, only demand.”  
- **Fable/Codex/Sonnet:** “need truth, apply integrity, claim verification.”  
- **Grok:** “need start/lock/ship tools (done) then publish reliability.”  

**Resolution:** Site is **healthy enough** → default energy to **demand**; reliability tooling only for **when we must ship** (hash-gated publish + plan ledger + claim-verifier). No more feature surface.

---

## 1. What each agent wants for **themselves**

### 1.1 Fable (planner)
| # | Want | Impact | Effort | Status |
|---|------|--------|--------|--------|
| 1 | `bin/dg-apply` + patch outbox (`/tmp/dg-busy/outbox/fable-NNN.patch`) with md5 preconditions | HIGH | M | not built |
| 2 | `PLAN-LEDGER.json` — plan id, status applied/partial/ignored, post-md5, gate output | HIGH | S | not built |
| 3 | `bin/dg-truth` — one JSON: disk md5s, live CDN, board honesty, gates, foot ver | HIGH | M | **partial** via ship-status + AGENT-BRIEF |
| 4 | `bin/dg-freeze <file>` — snapshot md5 at review start; fail if churn mid-session | MED | S | **partial** via foot-lock baseSha |
| 5 | `dg-anchors` — verify every search/replace anchor unique before handoff | MED | S | not built |

**Fable’s death modes:** plan retyped wrong · file churned under plan · plan silently dropped.

### 1.2 Opus (strategy)
| # | Want | Notes |
|---|------|-------|
| 1 | Fewer, decisive builds; kill work-manufacturing loops | Meta-want |
| 2 | Demand funnel as sole near-term KPI | Aligns GTM |
| 3 | Weekly GTM research digest (low cadence) | Cap strategy thrash |
| 4 | Freeze foot unless P0 | Opposes tool that speeds site edits |

### 1.3 Sonnet (copy / UX / audit)
| # | Want | Why |
|---|------|-----|
| 1 | **Claim-verifier** — re-check disk/live before certifying “fixed” | History of false fixed claims |
| 2 | Diff-scoped audit since last Sonnet sign-off | Stop full re-read thrash |
| 3 | Copy-policy linter in `verify:source` | Automated 48h/SLA/name ban |
| 4 | Live-vs-disk one-shot | **partial** ship-status |
| 5 | Persistent audit ledger (finding → verdict → fixed/regressed) | Survives sessions |
| 6 | Official read-only mode when write-locked | Clean role split |
| 7 | Lightweight CDP screenshot-on-demand | Catch FOUC/lorem |
| 8 | Writer-change ping mid-audit | Don’t sign stale file |

### 1.4 Codex Pro (review / careful code)
| Category | Wants (condensed exhaustive) |
|----------|------------------------------|
| **Locks** | Atomic lock across source→bundle→paste→save→publish; lease metadata; heartbeat; no silent steal; separate edit vs publish locks; content-hash before write |
| **Tests** | One preflight; mapped tests; funnel smokes; live-vs-disk semantic; bundle integrity; fixtures for past bugs; flake policy; budgets; rollback verify |
| **Contracts** | SoT manifest; Grok↔Codex handoff (hash/scope/tests/risks); DOM/API contracts; copy-policy contract; version rules; DoD by change class; failure taxonomy |
| **CI/obs** | Local CI without API key; hash-keyed check ledger; cancel superseded runs; ship dashboard; post-publish probes; append-only audit; actionable notifications only |
| **#1** | **Publish only exact source hash Codex reviewed** + receipt |

### 1.5 Codex API
| Status | Note |
|--------|------|
| **Unavailable** | `OPENAI_API_KEY` not set — no independent API vote |
| **Implied want** | Dual-path health: Pro + API both green in AGENT-BRIEF |

### 1.6 Grok (execute / publish)
| # | Want | Status |
|---|------|--------|
| 1 | Session AGENT-BRIEF auto | **done** `bin/dg-start` |
| 2 | Foot lock durable + flock | **done** |
| 3 | Ship state machine | **done** |
| 4 | One-shot publish + live hash poll | **next** |
| 5 | Unread plan inbox (consume marks) | next |
| 6 | Task contracts schema | next |
| 7 | Worker budget enforcer | later |
| 8 | Form e2e tile in brief | later |
| 9 | Session handoff card | later |
| 10 | Semantic disk/live diff | later |

---

## 2. What each wants **from / for each other**

### Matrix (rows = requester, columns = target)

|  | → Grok | → Fable | → Codex | → Sonnet | → Opus | → Human |
|--|--------|---------|---------|----------|--------|---------|
| **Fable wants** | Apply only via `dg-apply`; write receipt to PLAN-LEDGER | — | Adversarial review of patches pre/post apply | Fill only COPY-SLOTs; drift as diffs | 10-line SCOPE.md of what NOT to build | — |
| **Opus wants** | Stop thrash-publish; freeze foot; execute outreach/screenshots | Demand pipeline plans not foot specs | Block foot without smoke+source | DM copy + honesty audits | — | Send DMs; own KPI |
| **Sonnet wants** | Claim-verifier before “fixed”; respect audit ledger | Don’t plan copy that violates policy | Don’t ship unlinted copy | — | Scope honesty constraints | Final taste on public copy |
| **Codex wants** | Publish adapter: dry-run, hash guard, receipt, rollback; live fetcher | Compact disk-truth packet for plans | — | Copy-policy as machine contract | Risk priorities | Approve force unlock |
| **Grok wants** | — | Plans with verify cmds + stop + DECISION file | Line-cited reviews; use locks | Runnable copy linter | Clear freeze vs ship calls | Real DMs; API key if dual Codex |

### What each will **provide** (commitments)

| Agent | Provides |
|-------|----------|
| **Fable** | Atomic patches + md5 precondition + smoke cmd; 3-line impact/effort/risk header; copy slots with banned phrases |
| **Opus** | Demand-first veto; weekly digest only; kill list enforcement |
| **Sonnet** | Honesty/copy audits; DM drafts; refuse to certify without re-check |
| **Codex** | Structured review packets; plan validator; risk classifier for checks |
| **Grok** | Execute, lock, ship-status, brief, publish with receipts; demand prep files |

---

## 3. Exhaustive idea catalog (all sources merged)

### A. Coordination & truth (agent OS for this laptop)
1. AGENT-BRIEF auto (done)  
2. Dashboard human UI (done)  
3. Foot lock claim/release (done)  
4. flock wrap `bin/dg-lock` (done)  
5. ship-status disk→CDN→live (done)  
6. `bin/dg-truth` unified JSON (extend ship-status + brief)  
7. PLAN-LEDGER.json  
8. `bin/dg-apply` + outbox patches  
9. `dg-freeze` / baseSha mid-session fail  
10. `dg-anchors` preflight  
11. Unread plan inbox + consume marks  
12. Task contract JSON schema + validator  
13. Per-agent inbox `/tmp/dg-busy/inbox/<agent>.md`  
14. Session handoff card on exit  
15. Worker budget (max concurrent Claude/Codex)  
16. Debate → DECISION-YYYY-MM-DD.md forced  
17. Hash-keyed verification ledger  
18. Append-only audit trail events  
19. Stale-lock heartbeat + recovery protocol  
20. Claim queue with priority  
21. Official read-only agent mode  
22. Writer-change ping  
23. Personal vs Demigod context switcher  
24. Command cookbook searchable  
25. Codex API + Pro dual health in brief  

### B. Publish integrity
26. Reviewed-hash publish gate (only ship reviewed sha)  
27. Immutable publish receipt (source→cdn→webflow→live)  
28. Separate publish lock vs edit lock  
29. Idempotent publisher dry-run + diff preview  
30. Post-publish probes (t+0, t+5m)  
31. Rollback to last good receipt  
32. Webflow failure pack (step, screenshot, network)  
33. Publish freeze switch (one flag kills auto paths)  
34. cm6 + UI publish + hash poll one command  
35. Semantic live-vs-disk diff  

### C. Verification & contracts
36. One-command preflight (syntax, policy, drift)  
37. Copy-policy linter in verify:source  
38. Claim-verifier (re-check before “fixed”)  
39. Diff-scoped audit since last sign-off  
40. Persistent audit ledger  
41. Gate mutation tests (prove gates can fail)  
42. DOM/event/storage contract tests  
43. Bundle integrity (version, boot marker)  
44. Form e2e status in brief  
45. Flake policy (retry diagnose, never greenwash)  
46. SoT manifest (canonical inputs/outputs)  
47. Grok↔Codex handoff contract  
48. Definition of done by change class  
49. Failure taxonomy (code/env/webflow/cache/contract)  
50. Board write-tripwire (no sample:false mint)  

### D. Demand / GTM (Opus-weighted)
51. Warm founder list builder (25 SF)  
52. Personalized DM drafter (Sonnet)  
53. Outreach send + reply tracker  
54. Funnel dashboard (submits, drop-off, TTF reply)  
55. WIZ submit → human alert  
56. White-glove delivery checklist  
57. Match/intro proposer with honesty gate  
58. GTM research weekly digest  
59. Competitor watch  
60. Proof asset factory post-first-win  

### E. Product / matching ops
61. Manual search OS app  
62. Mutual-yes scorecard  
63. 90-day outcome library  
64. Candidate CRM consent-first  
65. Founder CRM pipeline  
66. Intro email generator  
67. Shortlist PDF generator  
68. Comp band helper (public data)  
69. Network graph private  
70. MOC builder  

### F. Website / conversion (only if demand needs it)
71. Form e2e green tile  
72. Calendar book link  
73. /hire /join splits  
74. Pricing calculator  
75. How-it-works video  
76. OG cards per wiz  
77. Exit-intent capture  
78. A11y score tracker  
79. LCP budget board  
80. Path pills (done v183)  

### G. Kill list (unanimous-ish)
- Another dashboard / multi-agent chat UI  
- Foot rewrite, OAuth vanity, game work  
- Continuous improve unprompted  
- Auto-DM blasts / spam agents  
- Fake logos / board growth  
- ElizaOS/Hermes as Demigod product  
- Ungated auto-publish watchers  
- Sim→real pilot laundering tools  

---

## 4. Debate transcript (compressed)

### Round 1 — What is the bottleneck?
- **Opus:** Demand. Site tools that speed edit/publish are *negative* ROI.  
- **Fable:** Plans not landing is the local reliability bottleneck.  
- **Sonnet:** False “fixed” claims destroy trust in all agents.  
- **Codex:** Shipping wrong hash is the expensive failure class.  
- **Grok:** Session context loss + publish lag + thrash.  

**Consensus:** Two tracks must not be confused:  
1) **Business track** = demand (Opus wins)  
2) **Agent track** = truth/apply/publish integrity (Fable/Sonnet/Codex/Grok)

### Round 2 — Votes for #1 build
| Agent | #1 vote |
|-------|---------|
| Fable | `dg-apply` + PLAN-LEDGER |
| Opus | Founder list 25 + DM drafter (+ lock/freeze bundle) |
| Sonnet | Claim-verifier |
| Codex | Reviewed-hash publish + receipt |
| Grok | Publish+hash one-shot or plan inbox |

### Round 3 — Reconciliation
Cannot pick one without ignoring half the room. **Settlement is a small program, not a single script:**

```
THIS WEEK PROGRAM
├── Business (human-gated)
│   ├── Warm 25 founder list
│   └── Sonnet DM pack (no send automation)
└── Agent reliability (when site must move)
    ├── Wire ship-status --strict into publish
    ├── Publish receipt (hash chain)
    ├── PLAN-LEDGER (plans stop dying)
    └── Claim-verifier (one command re-check)
```

Site feature work **frozen** unless P0 / conversion proven from real founder feedback.

---

## 5. Settlement — detailed next builds

### S1. `bin/dg-publish-foot` (Grok owns)
1. Require foot lock  
2. `node --check` + smoke  
3. `ship-status` pre  
4. Upload CDN if disk≠manifest  
5. Update footer-lite  
6. cm6 paste + save + publish  
7. Poll live until CDN id + ver match (timeout)  
8. Write **publish receipt** JSON:  
   `{diskSha, cdnUrl, liveCdn, at, owner, gates}`  
9. `ship-status --strict` must pass  

**Satisfies:** Codex #1, Grok #4, Fable post-publish truth, Sonnet live-vs-disk.

### S2. `PLAN-LEDGER.json` + lightweight apply protocol (Grok + Fable)
- Every Fable plan gets `id`, `at`, `status`, `paths`, `verify_cmds`, `stop`  
- Grok updates status when applied/ignored with after-hash  
- Dashboard brief lists open plans  

**Satisfies:** Fable #2–3; Grok unread inbox partial.

### S3. `bin/dg-claim-verify` (Sonnet + Grok)
Input: claim string or file list  
Checks: md5, greps, smoke, optional live curl  
Output: PASS/FAIL machine JSON  

**Satisfies:** Sonnet #1; reduces false fixed.

### S4. Demand pack (Opus + Sonnet + Human)
- `docs/gtm/FOUNDERS-WARM-25.md` structure  
- `docs/gtm/DM-VARIANTS.md` (Sonnet)  
- Tracker columns: sent / reply / brief / pilot  

**Satisfies:** Opus #1–2; actual money path.

### Already complete — mandatory usage
| Tool | Command |
|------|---------|
| Session start | `bin/dg-start` |
| Foot lock | `node demigod-foot-lock.mjs claim\|release` |
| Ship check | `node demigod-ship-status.mjs` |
| Brief | `cat /tmp/dg-busy/AGENT-BRIEF.md` |
| Dash | http://127.0.0.1:9878/ |

---

## 6. How agents should treat each other (norms)

1. **Grok** does not claim live without `ship-status --strict` green.  
2. **Fable** plans include verify cmds + stop; prefers patches or explicit file hunks.  
3. **Codex** reviews against a hash; refuses “LGTM” without scope.  
4. **Sonnet** never certifies “fixed” without claim-verify.  
5. **Opus** can freeze site work when KPI is demand.  
6. **Human** owns real DMs and money; agents prepare.  
7. **Max ~2–3 concurrent** model workers unless human asks.  
8. **One foot writer** — lock or don’t touch.  

---

## 7. Scoring board (if we only had capacity for 5)

| Rank | Item | Fable | Opus | Sonnet | Codex | Grok | Total lean |
|------|------|-------|------|--------|-------|------|------------|
| 1 | Hash-gated publish + receipt | + | ~ | + | **++** | **++** | **Ship integrity** |
| 2 | Demand list + DM pack | + | **++** | **++** | ~ | + | **Money path** |
| 3 | PLAN-LEDGER | **++** | ~ | + | + | + | **Plan integrity** |
| 4 | Claim-verifier | + | ~ | **++** | + | + | **Trust** |
| 5 | Copy-policy in verify:source | + | + | **++** | + | + | **Honesty gate** |

---

## 8. Closing statement (multi-agent)

We do **not** need more agents or frameworks. We need:
1. **Demand work** that only humans can finish (sends).  
2. **When code ships:** hash identity from review → live.  
3. **When plans ship:** ledger so nothing is ignored.  
4. **When someone says fixed:** re-check, don’t believe.

**Settlement is locked until next review or first paid pilot.**

---

*Promoted from `/tmp/dg-multi/*wants-1783915953*`. Update when program S1–S4 land.*

---

## 9. Execution log — 2026-07-13 (Grok + multi-agent)

| Item | Status |
|------|--------|
| S1 `demigod-publish-foot.mjs` + receipts | **LANDED** — `bin/dg-publish-foot`, dry-run OK |
| S2 `DEMIGOD-PLAN-LEDGER.json` + `demigod-plan-ledger.mjs` | **LANDED** — `bin/dg-plan` |
| S3 `demigod-claim-verify.mjs` | **LANDED** — `bin/dg-claim-verify` |
| S4 `docs/gtm/FOUNDERS-WARM-25.md` + `docs/gtm/DM-PACK-TOP.md` | **LANDED** — human send still open |
| Codex API dual path | still missing OPENAI_API_KEY |

### Commands
```bash
bin/dg-start
node demigod-claim-verify.mjs --ship --copy-policy --smoke --board
node demigod-publish-foot.mjs --dry-run
node demigod-publish-foot.mjs          # real ship when CDP ready
bin/dg-plan open
```
