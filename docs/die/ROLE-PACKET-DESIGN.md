# RolePacket design (Ashby / Greenhouse-shaped, Demigod-owned)

**Status:** **shipped technical product** — `demigod-role-packet.mjs`  
**Vertical:** structured hiring OS (`research/VERTICAL-MECHANISM-DEEP-DIVE.md` §1)  
**Matrix:** `research/VERTICAL-IMPLEMENTATION-MATRIX.md` rank 3

---

## 1. Problem

Match review without a scorecard becomes vibes. Greenhouse/Ashby win by forcing **criteria before candidates** and **evidence-required ratings**. Demigod already requires a 90-day outcome in product language but board seeds do not enforce structure.

## 2. Principles

1. One **real** role at a time (SIMPLE).  
2. **Human-authored** attributes — no AI-invented must-haves.  
3. Rating without free-text evidence is **invalid** (Ashby-style).  
4. Company research / hiring ledger are **side evidence**, never auto-ratings (D-002).  
5. Sample roles **cannot** host a RolePacket.

## 3. Data shapes

### RolePacket

```json
{
  "schema": "demigod.role-packet/1",
  "roleId": "role-…",
  "sample": false,
  "companyId": "yc:…",
  "title": "…",
  "outcome90d": "required free text — what success looks like in 90 days",
  "mustHaves": [
    { "id": "mh1", "label": "Shipped multi-tenant SaaS", "kind": "skill" }
  ],
  "dealBreakers": [
    { "id": "db1", "label": "Requires full remote outside US" }
  ],
  "compBand": {
    "text": "$180–220k + equity",
    "source": "founder_stated",
    "evidence": null
  },
  "stages": ["brief_ready", "reviewing", "mutual_pending", "intro", "outcome"],
  "stage": "brief_ready",
  "interviewPlan": [
    { "mustHaveId": "mh1", "moment": "screen|tech|founder|debrief", "owner": null }
  ],
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

`interviewPlan` is optional (Ashby interview-plan shaped): maps each must-have to a moment. No scheduling product — plan only. Default via `node demigod-role-packet.mjs set-plan --role=…`.

Constraints:

- `mustHaves.length` ∈ [3, 7]  
- `outcome90d` min length 20  
- `sample === false` and role passes `demigod-accepted-role` classify  

### ReviewNote (per candidate × role)

```json
{
  "schema": "demigod.review-note/1",
  "roleId": "…",
  "candId": "…",
  "pairId": "…",
  "ratings": [
    {
      "mustHaveId": "mh1",
      "rating": "strong_no|no|yes|strong_yes",
      "evidence": "required free text — what was observed"
    }
  ],
  "decisionAid": "changed_by_context|missing_question|error_prevented|none",
  "companyContextUsed": ["productSummary", "openReqCount"],
  "reviewedAt": "ISO",
  "reviewedBy": "human-id"
}
```

Invalid if any rating has empty `evidence`.  
`decisionAid` supports Phase 2 exit logging (roadmap).

## 4. File layout (when implementing)

| Path | Role |
|------|------|
| `DEMIGOD-ROLE-PACKETS.json` or per-role under busy | SoR for packets (prefer repo JSON if small) |
| `demigod-role-packet.mjs` | load/validate/save pure + CLI |
| `demigod-match-review.mjs` | project packet + notes into review card |
| `demigod-role-packet.test.mjs` | hermetic fixtures |

Do **not** put packets only under `.local/`.

## 5. Validation (pure)

```text
assertPacket(p):
  !p.sample
  outcome90d length ≥ 20
  mustHaves 3..7 unique ids
  stage ∈ stages
assertNote(n, packet):
  every mustHaveId ∈ packet.mustHaves
  every evidence trimmed length ≥ 8
  rating ∈ enum
```

## 6. Integration with DIE

| Input | Use |
|-------|-----|
| `projectCompanyResearch(companyId)` | display only if green |
| role ledger / export row | hiring snapshot side panel |
| pair state | still owns consent / intro |

Research **never** writes `ratings[]`.

## 7. CLI (shipped)

```bash
node demigod-role-packet.mjs list|show|init|add-must|note|project|stage|set-comp|set-plan|kit|debrief
node demigod-role-packet.mjs --selftest
# compose
node demigod-structured-hiring.mjs status|desk|shortlist|pack|audit
node demigod-public-comp.mjs extract|apply [--fetch-url=https://…]
```

Stage transitions: `STAGE_TRANSITIONS` forward graph only.  
`public_job_post` requires https URL + quote (8–280 chars).  
Demo fixtures allowed; real packets still gate on accepted-for-delivery product policy.

## 8. Gate / kill

| | |
|--|--|
| **Implement code** | `acceptedForDelivery ≥ 1` **or** hermetic-only fixtures behind `--selftest` |
| **Kill** | 3 real reviews with empty notes → delete UI, keep free-text pair notes |
| **Non-goal** | Interview scheduling, multi-stage ATS, AI auto-score |

## 10. Relation to PilotBatch (rank 4)

`PilotBatch` caps candidates at 2–3 for a RolePacket’s `roleId`. Implement batch **after** packet exists for that role.
