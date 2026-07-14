# Agent collaboration method (honest critique)

**Question:** Is “pretend we have a full startup team (hats)” a good way to run Demigod agents?  
**Answer (Fable + Codex + Grok consensus):** **Partially.** Keep process/RACI for *humans and checklists*. **Do not** use job titles as agent authority. Prefer **stage + capability contracts**.

Sources: Anthropic *Building Effective Agents* · *Multi-agent research system* · Fable/Codex swarm 2026-07-14  
Raw: `docs/exchange/DEMIGOD-FABLE-AGENT-METHOD.md` · `DEMIGOD-CODEX-AGENT-METHOD.md`

---

## 1. Verdict on “startup roles”

| Aspect | Good? | Why |
|--------|-------|-----|
| **Checklist catalog** (INT-01, WEB-01…) | **Yes** | Encodes *stage evidence*, not cosplay |
| **RACI for blast-radius actions** (freeze, DM, fee, publish) | **Yes** | Human is always A for irreversible acts |
| **“Wear the GTM / CFO / boss hat” in agent prompts** | **No** | Invites fake authority, scope creep, concurrent “owners” |
| **Org chart as agent identity** | **No** | Agents are stateless workers; titles aren’t locks |

**Modify, don’t scrap:**  
- Human-facing docs may list “hats” as *which process applies*.  
- Agent-facing prompts use **PLAN / EXECUTE / REVIEW** + **touch list + forbid + verify**.

Demigod history supports this: concurrent foot writers, freeze thrash, “agents = equal to user” claims, false drift — all **role/authority theater**, not missing job titles.

---

## 2. What research says (multi-agent)

From Anthropic and practice:

1. **Start simple** — one capable agent is default; multi-agent costs tokens (~15× chat) and coordination.  
2. **Orchestrator → workers** when work is open-ended / parallelizable — *not* for every foot edit.  
3. **Delegation needs contracts:** objective, output format, tools/sources, **boundaries** (vague “research X” → duplicate work).  
4. **Scale effort to complexity** — embed small/medium/large rules in prompts.  
5. **Tool/ACI quality > persona prose** — clear tools beat “you are the CTO.”  
6. **Eval from failures** — observe trajectories; fix narrowest control (prompt, tool, gate); keep regression fixtures.  
7. **Teammates don’t inherit lead history** — each spawn gets full task context.  
8. **Artifacts beat telephone** — workers write files; lead/reviewer reads paths, not summaries only.

---

## 3. Demigod model: stages, not org chart

| Stage | Owner | May | Must not |
|-------|-------|-----|----------|
| **PLAN** | Fable/Claude | Decompose, touch list, verify cmds, risks | Edit product; claim “ran gates” without output |
| **EXECUTE** | Grok/Cursor | Patch only `touch[]`; run named gates | Unfreeze/publish/DM unless contract allows; dual-write foot |
| **REVIEW** | Codex (or second plan pass) | Adversarial check vs **original contract** | Silently “fix while reviewing” without new EXECUTE |
| **AUTHORIZE** | **Human only** | Freeze, Publish, real DM, fee, honesty sign-off | — |

**Optional lens:** “review as product” is fine. **Authority:** never from a lens.

**Precedence (when instructions conflict):**  
1. Explicit human task authorization  
2. Freeze + session contract  
3. Canonical disk truth (`bin/dg live`, sources)  
4. Model suggestion / hat narrative  

---

## 4. When to use 1 / 2 / 3 agents

| # | When |
|---|------|
| **1** | Bounded, known, one file, reversible — **default** |
| **2** | Ambiguous diagnosis *or* meaningful mutate risk → plan+exec or exec+review |
| **3** | Cross-domain / flaky / high-impact → PLAN → EXECUTE → REVIEW sequential |

Never parallel writers on `demigod-foot-core.js`.  
Don’t swarm one-line fixes or status reads.

---

## 5. Session contract (minimum fields)

Extend `demigod-session-contract.mjs` (don’t invent parallel formats):

```
goal · stage · owner · fresh_state (from bin/dg live)
touch[] · forbid[] · invariants · verify[] · stop
deliverable · budget · claims (PROVEN|INFERRED|UNKNOWN) · handoff
```

---

## 6. Prompt skeletons (copy)

### PLAN (Fable)
```
Demigod … STAGE: PLAN · touch=[] · do not claim gates ran
FRESH: run/read bin/dg live → LIVE= DISK= FREEZE=
GOAL / NON-GOALS · INVARIANTS · INPUTS
TASK: smallest reversible sequence · one owner/step
RETURN: steps · touch · tests · fast/full gates · risks · EXECUTE handoff
Label PROVEN / INFERRED / UNKNOWN
```

### EXECUTE (Grok)
```
STAGE: EXECUTE · contract path · plan path
PRECHECK: fresh bin/dg live · freeze · single-writer lock if foot
IMPLEMENT: only touch[] · no drive-by tools
VERIFY: named commands · paste raw tails
RETURN: files · results · artifacts · REVIEW handoff
Never ship/unfreeze/DM unless contract + human allow
```

### REVIEW (Codex)
```
STAGE: REVIEW · read-only
REFRESH: live-doctor + real diff + gate artifacts
CHECK vs contract: scope · freeze · honesty · false-positive risk
RETURN: PASS | BLOCK | PASS-WITH-RISK · evidence · minimal fix · no silent rewrite
```

---

## 7. Handoff protocol

1. Fable writes plan + contract (paths under `/tmp/dg-busy/`).  
2. Grok executes; pastes **raw** verify output.  
3. Codex reviews **contract + diff + artifacts** (not a summary alone).  
4. Human authorizes freeze/publish/DM/fee.  
5. Terminal agent phrase: **“ready for your decision”**, not **“done/shipped.”**

---

## 8. Anti-patterns (ban)

1. Agent = “boss / equal to user”  
2. Concurrent foot writers  
3. Stale versions baked into prompts  
4. “PASS” without pasted command output  
5. Gate-after-write for honesty (prefer block at mint)  
6. Mandatory 3-agent ceremony for trivial work  
7. GTM nag / SLA / founder names  
8. Agent-to-agent telephone without artifact paths  

---

## 9. Prompt improvement loop

1. Log contract · agents · tools · outcome  
2. Classify first bad step (stale context, bad decomp, authority breach, false gate, lossy handoff…)  
3. Minimal fixture + negative test if smoke lied  
4. Patch **narrowest** surface (tool desc, contract field, gate — not more essay)  
5. Replay tiny eval set; promote only if better  

---

## 10. Relation to `docs/process/` checklists

| Keep | How used |
|------|----------|
| INT-01, WEB-01, INC-01… | **Stage ownership for the business** — who/when/evidence |
| Hats table in README | Human filing: “this is a talent-ops problem” |
| AGENT-TASK + this doc | **How agents are prompted and sequenced** |

Business process ≠ agent persona. Both matter; only the first needs “team” language.

---

*Default session: `bin/dg live` → contract → 1 agent unless risk says 2/3 → raw verify → human for authority actions.*
