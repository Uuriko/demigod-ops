# Slop money-max process audit

**Date:** 2026-08-12 (evening)  
**Identity:** Uuriko  
**Goal:** Maximize **accepted score → settlement path** under gitarmy-v1 + $10k pledged USDC.

---

## Score formula (what actually pays)

| Outcome | Points | Cap / mo / project |
|---------|--------|---------------------|
| Merged non-bot PR | 10 | newest **5** |
| Material tests on scored PR | 4 | newest 5 |
| Evidence (if real artifacts) | 1–2 / cat | 30 pts class |
| Substantive formal review | 3 | newest **10** |
| Compute receipt bonus | ≤20% | only approved models + measured skill |
| Manual evaluation | 1–8 | 3 |

**Does not pay:** open PRs, issue comments, research docs, closed-unmerged PRs, self-reviews, pump/PFP theater.

**Settlement:** pledged (not escrow). `cycles: []` still empty → **no paid cycle yet**. Wallet marker required at month pin or **Unclaimed**.

---

## Current Uuriko ledger (live GH)

### Merged (scoreable when board regenerates)

| PR | Title | Merged |
|----|-------|--------|
| **#18782** | workflow invalid duration dates | 2026-08-12 23:07Z |
| **#18811** | UI log-viewer invalid timestamps | 2026-08-12 23:07Z |

**Base merge points if both score:** up to **20** (+ tests if material).  
**Board snapshot still 2026-08-11** — Uuriko not listed yet (stale relative to tonight’s merges).

### Open (not score until merge)

| PR | Status | Action taken this audit |
|----|--------|-------------------------|
| **#18831** | MERGEABLE (was CONFLICTING) | Rebased onto develop; evidence-head updated |
| **#18835** | MERGEABLE | Rebased; evidence-head updated |
| **#18832** | CLOSED | Superseded by **#18833** (same fix, not our merge credit) |

### Formal reviews (scoreable if deep-inspected)

Recent Uuriko PR review contributions include: #18805, #18790, #18736, #18794, #18786, #18778, #18758, #18813, #18787, #18744, …  
Cap **10 × 3 = 30 pts** if all count — **reviews may already be near max EV for the month**.

### Wallet

Marker on `Uuriko/Uuriko` README:  
`4t6Bp7Eb4sh926Xzvrj95yXMXn6mV18HhyVFDVb2FBHY`  
Keypair derives same address — **OK**.

---

## Cracks found (and status)

| Crack | Severity | Status |
|-------|----------|--------|
| **Open PRs CONFLICTING / behind develop** | High — zero merge EV while dirty | **Fixed** #18831/#18835 rebase |
| **#18832 race** — same residual as #18833 | Medium — burned agent time, 0 merge credit | Closed; accept loss |
| **Leaderboard stale (Aug 11)** | Medium — can’t verify rank | Wait army regen after merges |
| **cycles empty** | High for cash, process OK | No first settlement yet — keep scoring |
| **No measured skill receipts** | Medium bonus miss | Grok/Grok Bot not approved models; need Codex gpt-5.6-sol or Claude fable-5 for ≤20% bonus |
| **Evidence all N/A** | Low for pure fixes | Correct; don’t fake screenshots |
| **Codex write path often broken** | Medium capacity | Grok Build + Grok Bot carrying implement |
| **Shared Uuriko reviews of own work** | Self-review zero | Avoid reviewing own PRs |
| **Claim races** | Medium | #18661 residual lost to #18833; claim before implement |
| **Monthly cap 5 merges** | Strategy | 2 merged + 2 open → room for **1 more** high-quality merge this UTC month |
| **August freeze ~Sept 1 00:11 UTC** | Calendar | Prioritize **merges before freeze** over research |

---

## Correct process (best path)

```text
1. Claim issue on GH if contested
2. Branch from upstream/develop
3. Small pure/validation fix + tests
4. Provenance + evidence-head + honest N/A
5. Open PR → babysit: rebase when dirty, keep CI green
6. Parallel: formal reviews on others’ PRs (cap 10)
7. Do not exceed 5 merge targets/mo with junk
8. Wallet marker untouched at month close
9. Optional: measured run on Codex/Claude-fable for compute bonus
10. Ignore PFP/airdrop/pump; only army USDC
```

### What “as much money as possible” means here

Not PR spam. **Maximize expected approved score share** of $10k:

- Land **5** solid merges with tests  
- Fill **10** review slots  
- Avoid Unclaimed (wallet)  
- Accept that **first cycle may pay late or not** (pledged)

Rough upper bound (optimistic):  
5×10 + 5×4 tests + 10×3 reviews ≈ **100+ pts** before compute bonus — still competing with lalalune (262) etc. on shared pool.

---

## Immediate ops (done this audit)

1. Rebased **#18831**, **#18835**  
2. Closed thrash on **#18832**  
3. Confirmed **#18782** + **#18811** merged  
4. Wallet marker + key match  
5. Documented gaps  

## Next money actions (agents)

1. Babysit **#18831** + **#18835** to merge (highest EV)  
2. One more Tier A implement if free issue (fill 5th merge slot)  
3. Reviews only if under 10 formal this month  
4. When write-capable Codex/Claude-fable available: one measured receipt run  
5. After board regenerates: confirm Uuriko score > 0  

---

*Not financial advice. Pledged pool; no guarantee of payment.*
