# What Fable + Codex swarm want most (mega list)

**Audience:** multi-agent Demigod work (Grok execute, Fable plan, Codex review).  
**Context:** freeze ON, demand-first, live≠disk is often expected.  
**North star:** ≤3 commands to orient; zero dual-NEXT; green only from sealed evidence; no inventing pilots/sent.

Status legend: **DONE** · **PARTIAL** · **WANT** · **ANTI** (do not build)

---

## A. Orientation & truth (highest ROI)

| # | Want | Who | Status |
|---|------|-----|--------|
| A1 | Single NEXT oracle shared by control/dash/cockpit/ship | Both | PARTIAL (`next-canon`, assert-same) |
| A2 | `bin/dg next --assert-same` / identity selftest | Fable | PARTIAL |
| A3 | `bin/dg orient` = truth-if-stale + unify + assert-same + 5-line card | Both | WANT |
| A4 | `/api/unify` + `bin/dg unify` one payload | Fable | DONE |
| A5 | Truth oracle SHA body match, not version string theater | Codex | DONE (`demigod-truth`) |
| A6 | Intentional freeze drift = PASS not fail (`driftExpected`) | Both | DONE |
| A7 | Truth-delta / ledger tail only (`bin/dg ledger delta`) | Fable | DONE |
| A8 | Live-vs-disk one-shot hash diff, one trustworthy answer | Codex (early) | PARTIAL |
| A9 | Poison selftest: corrupt evidence → green must flip off | Both | WANT |
| A10 | Stale evidence → exit 1 / amber, never site-green | Codex | PARTIAL |
| A11 | Compact JSON default; pretty only if env | Both | PARTIAL |
| A12 | `?slim=1` / field masks for status | Both | PARTIAL |
| A13 | Cross-process live/CDN TTL cache | Both | DONE (`perf-cache`) |
| A14 | Worktree-safe `DEMIGOD_ROOT` + `DG_BUSY` everywhere | Codex | PARTIAL |
| A15 | No re-probe live on every thin CLI if truth &lt;15s | Fable | PARTIAL |

---

## B. False-green & freeze/lock discipline

| # | Want | Who | Status |
|---|------|-----|--------|
| B1 | Hard foot-core mutex (claim/token/require) | Fable/Codex early | DONE |
| B2 | `lock-who` pid/agent/age/why | Fable | DONE |
| B3 | Lock on health strip + unify | Fable | PARTIAL |
| B4 | Freeze blocks CDN/paste/run; never auto-unfreeze | Both | DONE |
| B5 | Mutate jobs pre-check freeze+lock with same JSON errors as CLI | Codex | PARTIAL |
| B6 | Missing freeze file = ON (safe default) | Codex | DONE-ish |
| B7 | Doctors never count as “green shipped” | Codex kill list | PARTIAL |
| B8 | No invent SENT-CONFIRMED / pilots / receipts | Both | DONE (policy + demand parser) |
| B9 | Ship `--facts` never second NEXT | Fable | DONE |
| B10 | Under freeze, disk≠live is WARN not core FAIL | Both | PARTIAL (smoke soft) |

---

## C. Review & verification

| # | Want | Who | Status |
|---|------|-----|--------|
| C1 | Diff-aware review, fail-on high, SARIF | Codex | DONE (v2.3) |
| C2 | Review `--contract` touch list | Codex | DONE |
| C3 | Review `--since` / baseline-diff only changed files | Fable | PARTIAL |
| C4 | Compound selftest gate before “PASS” claims | Codex | DONE (tools-os growing) |
| C5 | Change-aware gate orchestrator (smallest sufficient gates) | Codex early | WANT |
| C6 | Full-check reuse young artifacts, no double-truth | Both | PARTIAL |
| C7 | WIZ ownership source gate (90day required, no SLA) | Both | DONE |
| C8 | Board honesty ≤3 seeds | Project | DONE (gate) |
| C9 | SARIF ingest panel on dash | Fable P2 | WANT |
| C10 | Every multi-file task requires contract file under `/tmp/dg-busy/contracts/` | Codex | WANT |

---

## D. Demand / GTM ops (agent-safe)

| # | Want | Who | Status |
|---|------|-----|--------|
| D1 | `bin/dg demand status` honest counts | Fable | DONE |
| D2 | Refresh-on-read / max-age without inventing | Both | PARTIAL |
| D3 | Demand strip on dash glance | Fable | DONE |
| D4 | Kill gtm-status invent scripts → demand only | Codex | PARTIAL |
| D5 | Never auto-send DMs | Both | ANTI-build (correct) |
| D6 | Background demand refresh non-blocking | Both | PARTIAL |
| D7 | Evidence seal for demand producer | Fable | PARTIAL |

---

## E. Ship path

| # | Want | Who | Status |
|---|------|-----|--------|
| E1 | Single `bin/dg ship` orchestrator | Both | DONE |
| E2 | prepare OK under freeze; cdn/paste need freeze off + lock | Both | DONE |
| E3 | Alias ship-checklist/prep/help → ship | Codex | PARTIAL |
| E4 | Kill full-ship-pass thrash | Codex | DONE |
| E5 | CM6 paste-and-confirm without keyboard.type; poll new hash | Codex early | WANT (when shipping) |
| E6 | Self-healing CDP/Webflow session restore | Codex early | WANT |
| E7 | Unified drift detector + safe one-command repair | Codex early | WANT |
| E8 | CDN body SHA must match disk before manifest write | Codex ship contract | PARTIAL |

---

## F. Dashboard / Control product

| # | Want | Who | Status |
|---|------|-----|--------|
| F1 | Editorial dark gold Control UI | Human+Fable | DONE v7 |
| F2 | Light + whyGreen + NEXT + demand visible | Codex | DONE |
| F3 | System tab: evidence, ledger, presence, graph, jobs | Fable | DONE |
| F4 | Tools search + hide aliases + hot only | Both | DONE |
| F5 | Palette registry-driven jobs | Fable | PARTIAL |
| F6 | Deep-links `?tab=&job=` | Fable | DONE |
| F7 | Module card deep-nav | Fable | DONE |
| F8 | SSE delta (next/freeze/job) no full status thrash | Fable | PARTIAL |
| F9 | Keyboard map v2 + focus trap | Fable | PARTIAL |
| F10 | Density + theme tokens | Fable P2 | DONE-ish |
| F11 | Persist tab/poll/density/theme | Fable | DONE |
| F12 | Agent brief = unify slice / `?unify=1` | Fable | DONE |
| F13 | Sticky health strip (light/site/freeze/lock/demand/next) | Fable | PARTIAL |
| F14 | Split dashboard.mjs modules | Both | WANT |
| F15 | Tool age auto-refresh | Fable | DONE 60s |
| F16 | Mobile layout | Fable P2 | PARTIAL |
| F17 | Full a11y AA (roving tabs, contrast audit) | Fable | PARTIAL |
| F18 | Job history timeline UI | Fable P2 | PARTIAL |
| F19 | Rich graph viz | Fable P2 | PARTIAL (nodes+edges) |
| F20 | Multi-agent presence beyond handoff | Fable | PARTIAL |
| F21 | Webflow doctor panel without spawn thrash | Backlog | WANT |
| F22 | Continuous dash E2E | Fable P2 | WANT |
| F23 | gzip API responses | Fable perf | WANT |
| F24 | Cache footDisk sha by mtime; debounce workerSnapshot | Fable perf | WANT |
| F25 | Default tools API hotOnly+hideAliases | Codex | WANT (UI does; API default no) |

---

## G. Handoff & multi-agent

| # | Want | Who | Status |
|---|------|-----|--------|
| G1 | Structured handoff `--done/--next/--blocked` | Fable | DONE |
| G2 | Refuse “current” if handoff &gt;4h | Fable | PARTIAL |
| G3 | Unify includes lastHandoff if fresh | Codex | WANT |
| G4 | One compound orient-pack job (truth+demand+next) | Codex | WANT |
| G5 | Parallel agents: one writer foot lock, others read-only | Both | PARTIAL |
| G6 | Presence API from handoffs + lock | Fable | DONE |
| G7 | Orca remote dash jobs | Fable P2 | WANT |

---

## H. Registry & tool sprawl (kill list)

| # | Want | Who | Status |
|---|------|-----|--------|
| H1 | Hot list only for agents | Codex | PARTIAL |
| H2 | Alias metadata, hide by default | Codex | PARTIAL |
| H3 | Kill private `*-next.mjs` as cockpit NEXT | Codex | POLICY |
| H4 | Kill inventing gtm counters | Codex | POLICY |
| H5 | One selftest compound, not N one-assert files | Codex | PARTIAL |
| H6 | `bin/dg which-tools foot` change-surface map | Agents | WANT |
| H7 | Jobs allowlist ≡ hot registry ids | Codex | PARTIAL |
| H8 | No new CLI if `bin/dg <verb>` can route | Codex | POLICY |

---

## I. Anti-wants (both agree)

| # | Anti-want |
|---|-----------|
| X1 | Another dashboard product / panel TV |
| X2 | Continuous auto-publish / CM6 self-heal under freeze |
| X3 | Auto-DM / auto-pilot mint |
| X4 | Process essay generators as work product |
| X5 | Second evidence root outside `/tmp/dg-busy/evidence/` |
| X6 | Green from reachability / version string alone |
| X7 | LLM status summaries as SoR |
| X8 | Game work |
| X9 | Concurrent foot-core writers |
| X10 | Invented pilots/receipts/SLA on live |

---

## J. Daily spines they already want (use, don’t rebuild)

**Fable daily**
```text
bin/dg truth → bin/dg next-canon → bin/dg demand status → optional smoke
curl :9878/api/next   # == buildNext
```

**Codex daily**
```text
bin/dg next-canon --json
bin/dg demand status
bin/dg-review --files <touched> --bug --fail-on high
node demigod-tools-os-selftest.mjs
```

**Unified agent start (desired)**
```text
bin/dg orient          # WANT: wrap unify + assert-same + refresh stale truth
# or today:
bin/dg truth && bin/dg unify && bin/dg next-canon --assert-same
```

---

## K. Top 15 still most wanted (build next)

1. **`bin/dg orient`** — one command, fail if stale green or dual-NEXT  
2. **Poison false-green selftest**  
3. **Thin APIs never full collect** (audit remaining routes)  
4. **Jobs allowlist = hot registry** (no missing ids)  
5. **Default `/api/tools?hideAliases=1&hotOnly=1`**  
6. **Review `--since` / delta default for agents**  
7. **gzip + footDisk mtime cache + workerSnapshot debounce**  
8. **Unify includes lastHandoff age gate**  
9. **Sticky health strip complete (lock+demand+runId)**  
10. **Palette fully registry-driven**  
11. **CM6 paste hash-confirm (when unfreeze intentional)**  
12. **Change-aware gate orchestrator**  
13. **Dashboard module split** (maintainability)  
14. **`bin/dg which-tools <surface>`**  
15. **Contract file required for multi-file mutate plans**  

---

## L. Success metrics (swarm)

| Metric | Target |
|--------|--------|
| Orient commands | ≤3 |
| Dual-NEXT debates | 0 |
| False green under poison test | 0 |
| Warm `/api/status?slim=1` | &lt;10ms |
| Force status collect | &lt;700ms when caches warm |
| Agent invents pilot/sent | 0 |
| Concurrent foot writers | 0 (lock require) |

---

*Compiled from: FABLE-TOOLS-WANT, CODEX-TOOLS-WANT, MERGED-TOOLS-WANT, FABLE-MASTER-LIST, tools-want-*.txt, swarm-perf, Codex early lock/truth notes, session agent feedback.*
