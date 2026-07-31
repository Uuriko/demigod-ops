# Control Board design (Vanta-shaped, Demigod-owned)

**Status:** design + v0 implementation (`demigod-control-board.mjs`)  
**Vertical:** continuous evidence / control monitoring (see `research/VERTICAL-MECHANISM-DEEP-DIVE.md` §8)  
**Non-goal:** GRC SaaS for third parties; public Trust Center with private data

---

## 1. Problem

Agents and operators see many green checkmarks (selftests, inventory %BUILT, reseals) that do not mean the **delivery loop** or **evidence integrity** is healthy. Vanta’s product insight: name **controls**, attach **automated evidence**, make red **visible and continuous**.

Demigod already has the tests. It lacked a single control catalog with fail-closed evaluation.

## 2. Principles

1. **Controls are invariants**, not tasks.  
2. **Evidence is a receipt path or live probe**, not prose.  
3. **Red is useful** — do not auto-remediate product gates (e.g. do not invent roles to green `phase2`).  
4. **Honest semantics** — if `phase2Ready` is hardcoded false, the board must say so (Codex adversarial note).  
5. **No score** — binary or ternary (pass / fail / n/a), never 0–100 “trust score.”

## 3. Control catalog (v0)

| id | Invariant | Evidence probe | Severity |
|----|-----------|----------------|----------|
| `truth_seal` | Website truth seal green/fresh | `refuseIfStale('truth')` | high |
| `research_seal` | Company research seal green/fresh | `refuseIfStale('company-research-benchmark')` | high |
| `research_export_honest` | Export does not claim CR>0 when research not green | read export + research fresh | high |
| `phase2_gate_policy` | Phase 2 product flag is false until product opens it | `accepted-role` JSON `phase2Ready===false` | high |
| `phase2_has_accepted_role` | ≥1 accepted-for-delivery role (med red = gap) | `acceptedForDelivery` | med |
| `board_has_real_role` | ≥1 non-sample board role (med red = samples only) | board + accepted-role | med |
| `pairs_store_readable` | Existing private pair ledger parses with the canonical object shape | pairs JSON | high |
| `pairs_has_real` | ≥1 non-sample pair (med red = delivery empty) | pairs JSON | med |
| `demand_drafts_only` | Both auto-DM disabled and agent-never-sends flags are explicit | demand-status honesty flags | high |
| `role_poll_timer_healthy` | Daily role observation is armed and its last run is successful/fresh | systemd timer + oneshot properties | med |
| `map_prepare_only` | Live map-data not falsely claimed shipped when prepare-only | truth.json prepareOnly / sibling drift | low |

Severities: `high` red fails the board summary; `med`/`low` warn.

## 4. Output shape

```json
{
  "schema": "demigod.control-board/1",
  "at": "ISO-8601",
  "ok": false,
  "summary": "2 high failing · 3 pass · 1 n/a",
  "controls": [
    {
      "id": "research_seal",
      "ok": false,
      "severity": "high",
      "reason": "input-hash-mismatch",
      "evidence": { "runId": "…", "fresh": false, "green": false }
    }
  ],
  "policy": "Internal trust board. Red research is correct when map drifted. Do not invent roles to green phase2."
}
```

Path: `/tmp/dg-busy/control-board.json`

## 5. CLI

```bash
node demigod-control-board.mjs              # evaluate + write receipt
node demigod-control-board.mjs status       # human lines
node demigod-control-board.mjs --json       # full JSON
node demigod-control-board.mjs --selftest
```

Exit code: `0` if no **high** severity failures; `1` if any high fails (med/low do not fail exit — delivery emptiness is informative red, not a broken laptop).

**v0 exit policy:** only integrity highs fail exit (`truth_seal`, `research_export_honest`, `demand_drafts_only`, `phase2_gate_policy`).  
`research_seal` red is **reported** but does **not** fail exit by default (map-stamp thrash is expected); use `--strict` to fail on research red too.

## 6. Integration

| Surface | How |
|---------|-----|
| Tools registry | `control-board` safe tool |
| Orient | evaluates the board at session start; compact status in line 5 + structured receipt link in JSON |
| Dash (later) | `/api/control-board` if useful — YAGNI until used |

## 7. Remediation (human/agent playbook)

| Control red | Allowed fix | Forbidden |
|-------------|-------------|-----------|
| `truth_seal` | re-run truth / fix live | fake PASS |
| `research_seal` | reseal after map stable, or stop map stamps | weaken pin |
| `research_export_honest` | re-export after reseal or leave CR=0 | force CR>0 while red |
| `phase2_has_accepted_role` / `board_has_real_role` | obtain real role + product gate change | invent board role |
| `pairs_has_real` | run real review | seed more sample pairs as “progress” |
| `demand_drafts_only` | keep drafts-only | enable auto-DM |
| `role_poll_timer_healthy` | repair/enable the timer or its poll failure | auto-start from the board or hide a failed run |

## 8. Kill conditions

- If board is never read at session start for 14 days → demote from hot tools.  
- If agents greenwash by disabling controls → restore from git + poison test.  
- Never add a “trust score” aggregate 0–100.

## 9. v1 backlog (not v0)

- Control history JSONL (pass/fail over time).  
