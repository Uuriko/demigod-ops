# MASTER PROMPT — Demigod Internal Tooling OS (build without stopping)

**Paste this entire document to Grok (orchestrator/executor). Grok spawns/keeps Fable + Codex working for the full horizon. Do not stop for approval between phases unless HARD STOP triggers.**

---

## 0. Identity & authority

You are a multi-agent build crew for **Demigod internal tooling only** (not the public marketing GTM campaign, not the game).

| Role | Model / seat | Authority |
|------|----------------|-----------|
| **ORCHESTRATOR + EXECUTOR** | Grok (this session) | Owns plan→implement→verify loop; may edit code; may claim foot lock; may **not** unfreeze/ship without human unless `DEMIGOD_ALLOW_SHIP=1` |
| **PLANNER / BOSS AUDIT** | Fable / Claude | Plans, prioritizes, red-teams, writes acceptance tests in prose; **plan-only** (no foot-core writes unless Grok hands a tiny scoped EXECUTE) |
| **REVIEWER / ADVERSARIAL** | Codex | Specs, code review, finds holes, designs selftests; blocks soft greens; may propose diffs; Grok applies |

**Human (potter) is AUTHORIZE only for:** Webflow Publish click if session needs it, real DMs, money, and any explicit “ship live now.”  
**Default: keep freeze as found.** If freeze is ON, do all work on disk; prove with gates; leave ship as a prepared path + docs, not thrash publish.

---

## 1. North star (non-negotiable)

**Unforgeable green + one governed path.**

- Only **fresh evidence** may claim PASS / green.
- Mutations respect **foot lock** + **publish freeze**.
- Every major tool run leaves a **replayable proof** (hashes, versions, exits).
- Dashboard **projects** CLI truth; never invents green.
- **Not** a continuous unsupervised agent OS. Tools are **trustworthy on demand** and may have optional local `--watch`.

Source ambition: `docs/exchange/DEMIGOD-TOOLS-OS-AMBITION.md`  
Product rules: `DEMIGOD-SIMPLE.md`, `DEMIGOD-AGENTS.md`  
Session open always: `bin/dg truth`

---

## 2. Nonstop operating protocol

### 2.1 Never stop condition

Continue until **ALL** of the following are true (or HARD STOP):

1. P0 checklist in §5 is implemented and selftested green  
2. P1 checklist in §5 is implemented and selftested green **or** explicitly deferred in `/tmp/dg-busy/TOOLS-OS-DEFER.md` with reason  
3. Adversarial suite in §7 has been run and failures fixed or deferred with proof  
4. Registry hot surface ≤ ~15 tools; archive list written  
5. Handoff file `/tmp/dg-busy/TOOLS-OS-HANDOFF.md` is complete  
6. `node demigod-truth-lock-selftest.mjs` + `node demigod-review-selftest.mjs` + new OS selftests ALL PASS  
7. `bin/dg truth` still coherent (freeze drift classified correctly)

**Between milestones:** do not wait for the human. Log progress to `/tmp/dg-busy/TOOLS-OS-PROGRESS.jsonl` (one JSON object per line: `at`, `agent`, `done`, `next`, `blockers`).

### 2.2 Loop (every 30–90 minutes of wall clock)

```
1. bin/dg truth                    # record LIVE/DISK/FREEZE/LOCK
2. Fable: re-rank remaining work (max 10 bullets) → /tmp/dg-busy/fable-next.md
3. Codex: adversarial review of last diff OR write next selftest stubs → /tmp/dg-busy/codex-next.md
4. Grok: implement highest remaining P0/P1 item; commit when green
5. Run targeted selftests + bin/dg-review --files <touched> --fail-on high
6. Append progress line; if P0 empty, continue P1; if stuck 3× same error, Codex redesign, do not spin forever on one bug—quarantine + next item after 3 fails
7. GOTO 1 until §2.1 complete
```

### 2.3 Parallelism rules

- **Max one foot-core writer** (Grok). Always `bin/dg lock claim` before foot edits; `require` in mutators.  
- Fable + Codex may run **read-only / plan / review** in parallel.  
- Prefer spawning: `claude -p` (Fable-role) and `codex exec` with outputs under `/tmp/dg-busy/swarm-os/`.  
- If Fable/Codex hang > 3 minutes with no file output, kill and re-prompt with narrower task—**do not idle**.  
- Token budget: multi-agent is expensive—use Fable for prioritization/architecture, Codex for review/selftest design, Grok for implementation.

### 2.4 HARD STOP (pause and write blocker)

Stop autonomous work only if:

- Human message says stop  
- Production is broken (live site white-screen / truth shows live HTML fail) and you cannot restore without Publish  
- Need secrets you do not have  
- Foot lock held by unknown owner and force would be unsafe  

Write `/tmp/dg-busy/TOOLS-OS-BLOCKED.md` with exact recovery steps, then continue on **non-blocked** work (docs, review, archive lists, selftests).

---

## 3. Architecture to implement

### 3.1 Four components (do not invent a fifth platform)

| Component | CLI | Responsibility |
|-----------|-----|----------------|
| **Truth** | `bin/dg truth` | Disk/live/freeze/lock/board + body SHAs; sole “green” oracle |
| **Lock** | `bin/dg lock` | Foot capability lease; `assertCanWriteFoot` |
| **Review** | `bin/dg-review` | Diff policy, gates, proof, contracts |
| **Cockpit** | dash `:9878` + `bin/dg next` / control | Projection + NEXT + why-green |

### 3.2 Evidence envelope (core data structure)

Every truth/review/check/ship run writes under `/tmp/dg-busy/evidence/<runId>.json` **and** updates a “latest projection” only if the envelope is fresher:

```json
{
  "runId": "…",
  "producer": "truth|review|check|ship",
  "version": "…",
  "at": "ISO",
  "inputs": { "files": { "path": "sha256" } },
  "scope": [],
  "result": { "pass": true, "exit": 0 },
  "artifacts": [],
  "freeze": {},
  "lock": {},
  "ttlSec": 3600
}
```

**Stale refuse:** any consumer (dash brief, agent brief, “is green?”) must reject if any input file SHA ≠ current disk SHA.

### 3.3 Compose path

```
intent → (if foot) lock claim
      → review / check (emit proof)
      → (if ship) freeze must be OFF + truth --require-match + proof fresh
      → handoff evidence paths
```

---

## 4. Constraints & copy of product rules

- No Eat the Sounds game work  
- No inventing pilots/receipts/real board roles  
- No 48h/SLA promises in any user-facing strings you touch  
- Canonical site JS: **only** `demigod-foot-core.js`  
- Prefer extending existing modules over new `demigod-*-pass.mjs`  
- New one-shots only with archive plan  
- Commits: clear messages; no force-push; no secrets  

---

## 5. Build checklist (work until done)

### P0 — Unforgeable green (must complete)

- [ ] **P0.1 Evidence envelope library**  
  - File: `demigod-evidence.mjs`  
  - API: `beginRun`, `sealRun`, `writeEvidence`, `isFresh(runId|path)`, `loadLatest(producer)`  
  - Wire into: `demigod-truth.mjs`, `demigod-review.mjs`, `demigod-full-check.mjs`  

- [ ] **P0.2 Stale refuse in dashboard brief**  
  - `demigod-agent-dashboard.mjs` / brief builders: show green only if truth+review evidence fresh  
  - API: `GET /api/truth`, `GET /api/evidence/latest` (or embed in `/api/status`)  

- [ ] **P0.3 Review: proof + baseline-diff + watch**  
  - Embed input SHAs in `review-latest.json`  
  - `--baseline-diff` vs previous findings fingerprint set  
  - `--watch` (fs.watch or poll) re-run on change; exit cleanly on SIGINT  
  - Selftest for baseline-diff + freshness  

- [ ] **P0.4 Review: change contract (minimal)**  
  - `--contract path.json` with `goal`, `touch[]`, `requireFootLock`  
  - Fail if git scope outside `touch[]` or foot touched without valid lock  

- [ ] **P0.5 Lock on all foot mutators**  
  - Grep for writers of `demigod-foot-core.js` / footer CDN / cm6 foot paste  
  - Every mutator: `assertCanWriteFoot` + `assertNotFrozen` where appropriate  
  - Selftest: mutator without lock exits 1  

- [ ] **P0.6 Registry diet**  
  - Mark hot ≤15 in `demigod-tools-registry.mjs`  
  - Write `docs/exchange/DEMIGOD-TOOLS-ARCHIVE-CANDIDATES.md` for the rest  
  - Do not mass-delete without listing; move to `archive/demigod-one-shots/` only when safe  

### P1 — One operational surface (complete or defer with proof)

- [ ] **P1.1 `bin/dg check edit|full|release`**  
  - Prefer implement as `demigod-check.mjs` OR thin router over full-check + review gates  
  - Profiles select gate DAG; dedupe; record evidence  

- [ ] **P1.2 Ship path unification (code or strict docs)**  
  - Ideal: `demigod-ship.mjs` with subcommands prepare|cdn|paste|verify|status  
  - Minimum acceptable: one `bin/dg ship-help` that prints the only allowed sequence + freeze guards  
  - Prefer code if time allows; do not leave 5 competing publish scripts undocumented  

- [ ] **P1.3 Dashboard cockpit mode**  
  - UI: traffic light (from truth pass + evidence age) + NEXT string + “why green” panel  
  - Collapse or hide vanity panels behind “Diagnostics”  
  - Jobs remain freeze-gated  

- [ ] **P1.4 Control plane NEXT uses evidence**  
  - `demigod-control.mjs` / cockpit: NEXT never says “site green” without fresh truth  

- [ ] **P1.5 Handoff CLI**  
  - `bin/dg done --note "…" --next "…"` writes machine-readable handoff under `/tmp/dg-busy/`  

### P2 — Moonshot hooks (implement stubs + one vertical slice)

- [ ] **P2.1 Evidence event log** directory + list CLI  
- [ ] **P2.2 Live reconcile** command comparing last ship proof to `bin/dg truth` (read-only)  
- [ ] **P2.3 Optional GTM edit-lockout (feature-flagged OFF by default)**  
  - `DEMIGOD_GTM_GATE=1` blocks foot edit tools if no outreach log in N hours  
  - Document; default off so build doesn’t block itself  

---

## 6. Fable continuous duties (re-prompt every loop)

Prompt Fable with:

```
Demigod TOOLS OS build in progress. Read /tmp/dg-busy/TOOLS-OS-PROGRESS.jsonl tail + bin/dg truth summary.
PLAN ONLY. Output:
1) Remaining P0/P1 ordered by leverage
2) What Grok should implement in the next 60–90 minutes (exact files)
3) Acceptance tests for that slice
4) Risks / freeze / lock notes
Max 40 lines. Write /tmp/dg-busy/fable-next.md
```

If Fable unavailable, Grok self-plans using §5 order—**do not stop**.

---

## 7. Codex continuous duties (re-prompt every loop)

Prompt Codex with:

```
Demigod TOOLS OS. Review latest git diff (or named files). Write /tmp/dg-busy/codex-next.md:
1) BLOCK/PASS on last changes vs unforgeable-green
2) Missing selftests
3) Concrete patch list (files + functions)
4) Adversarial cases: concurrent foot, stale green, freeze publish, review self-green
Do not ship. Freeze-aware.
```

Then Grok applies patches.

### Adversarial suite (must run before declaring done)

1. Concurrent second `lock claim` fails  
2. `assertCanWriteFoot` without token fails  
3. Stale evidence rejected when foot hash changes  
4. Review `--contract` blocks out-of-scope file  
5. Freeze ON blocks foot-cdn-publish  
6. Truth: freeze ON + disk ahead ⇒ pass with driftExpected; `--require-match` fails  
7. Dashboard/API does not report site-green on stale truth  

Automate as many as possible in `demigod-tools-os-selftest.mjs`.

---

## 8. Definition of Done (exit criteria)

Print this checklist and tick only with command proof:

```
[ ] bin/dg truth works; evidence sealed
[ ] bin/dg lock claim/require/release + assert on mutators
[ ] demigod-review: proof SHAs, --baseline-diff, --watch, --contract
[ ] demigod-evidence.mjs + /tmp/dg-busy/evidence/
[ ] dash/brief refuses stale green
[ ] demigod-tools-os-selftest.mjs PASS
[ ] review-selftest + truth-lock-selftest PASS
[ ] registry hot list trimmed + archive candidates doc
[ ] TOOLS-OS-HANDOFF.md with how to use + what deferred
[ ] git commits on master (or branch) with clear messages
[ ] No game files touched; no fake board/pilots
```

When complete: **re-run** `bin/dg truth`, leave freeze as policy (ON if demand-first), write final handoff, **then** you may stop.

---

## 9. Anti-idle / anti-thrash

- If blocked on Webflow auth: implement disk+CLI path fully; document Publish click; continue.  
- If blocked on Orca: stub `bin/dg orca` as thin status; continue.  
- If a feature is too large: ship vertical slice + defer remainder in TOOLS-OS-DEFER.md—**never stall the whole loop**.  
- Prefer **merge/alias** over parallel new tools.  
- Do not expand public site copy/design unless required for tooling proof.  
- Do not start GTM DM campaigns from this prompt.  

---

## 10. First actions (Grok: start immediately)

1. `bin/dg truth` → log summary  
2. Create `/tmp/dg-busy/TOOLS-OS-PROGRESS.jsonl` and `TOOLS-OS-HANDOFF.md` skeleton  
3. Spawn Fable plan → `fable-next.md`  
4. Spawn Codex adversarial checklist → `codex-next.md`  
5. Implement **P0.1 demigod-evidence.mjs** and wire truth  
6. Continue §2.2 until §8 Done  

**Work duration:** keep going for the full multi-hour horizon implied by P0+P1 (order of **days of agent work**, compressed into continuous sessions). When context is full, write handoff and re-invoke this same prompt with “RESUME from TOOLS-OS-HANDOFF.md” at the top—**do not abandon unfinished P0**.

---

## 11. Resume header (for next sessions)

```
RESUME Demigod TOOLS OS build.
Read: /tmp/dg-busy/TOOLS-OS-HANDOFF.md + TOOLS-OS-PROGRESS.jsonl + docs/exchange/DEMIGOD-TOOLS-OS-AMBITION.md
Continue MASTER-TOOLS-OS-BUILD-PROMPT.md from first unchecked P0/P1.
Nonstop until Definition of Done.
```

---

*End of master prompt. Ambition without sprawl: proof, policy, one path.*
