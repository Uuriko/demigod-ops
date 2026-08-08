<!-- agent-task: 20260808103203702-2167928-6w9ik9; role: grok; completed: 2026-08-08T10:32:37.783Z; raw model output, verify before promotion -->
## 1. Current product definition

Dasha is a live multi-surface product: **Home, Studio, Desk, Lobby**, **X OAuth**, and an **opt-in measured Simp Board** (PerryALPHA as non-measured editorial #1; explicit join/leave; reviewed claims; fixed creative/community/OSS points; score-card PNG; badges; immutable season snapshots; zero-point signed holder badge with a point-in-time Solana holder proof—5-minute HMAC challenge, Ed25519 signature, finalized owner+mint+positive-raw-balance check, 8s timeout, dated proof, 28-day display expiry; no transaction, no stored/public wallet or balance; not continuous-holding or Sybil proof). Thesis/receipt/forecasting are permanently retired. Discord is blueprint-only. Transmissions/alibi is an unproven creative experiment, not the product spine. Canonical implementation is under `/home/potter/.grok/worktrees/potter/dasha`; main-root release manifest still describes an older Transmission checkpoint and reports drift. Mutable Worker asset hashes belong in receipts only. Dasha website publication is **current-request-gated**.

## 2. Stale claims — disposition

| Doc claim | Action | Replacement idea |
|-----------|--------|------------------|
| **DASHA-PRODUCT-BRIEF:** Board prepared; no linked/scored accounts; Transmissions sole product | **Replace** | Board is live, opt-in, measured (plus editorial PerryALPHA); join/leave + reviewed claims + fixed point categories + badges/snapshots/holder badge. Product = Home/Studio/Desk/Lobby + X OAuth + Board. Transmissions/alibi = unproven experiment, not sole product. |
| **DASHA-SIMPLIFY:** Board editorial only; no measured identity/score | **Replace** | Board is measured for opt-in joined accounts; PerryALPHA remains non-measured editorial #1; state measured vs editorial explicitly. |
| **DASHA-COMPLETE-GUIDE:** leads with Transmissions; broad release drift | **Replace** (lead); **history-label** (drift narrative) | Lead with live surfaces + Board. Mark Transmissions as experiment. Put “release drift / old Transmission checkpoint on main-root manifest” under history or receipts; implementation truth = worktree path above. |
| **DASHA-ROADMAP:** Studio awaits publication; old Worker hash in prose | **Replace** | Studio is live (Webflow 200). Drop hash from product prose; point to receipt for current Worker asset hash (e.g. was `5fe85557d6b9982f` at verification—receipt-only). |
| **DASHA-WORKFLOW:** standing publish authority; omits Lobby/Board sources | **Replace** | Publication = current-request-gated only. Add Lobby + Board implementation source map (worktree paths / entry modules). Remove standing-publish language. |
| **DASHA-DOCS:** long 2026-08-07 drift narrative; Board prepared/editorial; Discord blueprint “Current” | **History-label** (drift); **Replace** (Board + Discord status) | Collapse drift to dated history appendix. Board = live measured + editorial slot. Discord = blueprint (not Current product). Align sitemap note: Webflow sitemap 404 / robots empty; Lobby robots/sitemap 200. |
| **DASHA-NEXT-PRODUCT-DECISION:** measured Board merely prepared; no formal review queue | **Replace** | Measured Board is live; claims are reviewed (document existing review path as the formal queue). Next decisions should assume live Board, not prep. |

## 3. Smallest owner-doc edit set

1. **DASHA-DOCS.md** — one current-truth block at top (surfaces, Board, retired thesis stack, Discord blueprint, Transmissions experiment, worktree path, publish gate, SEO/sitemap facts); history-label the 2026-08-07 drift essay.  
2. **DASHA-PRODUCT-BRIEF.md** — rewrite product spine + Board status; demote Transmissions.  
3. **DASHA-SIMPLIFY.md** — one Board paragraph: measured opt-in vs editorial #1.  
4. **DASHA-WORKFLOW.md** — publish gate + Lobby/Board sources; delete standing publish.  
5. **DASHA-ROADMAP.md** — Studio live; no Worker hash in prose.  
6. **DASHA-COMPLETE-GUIDE.md** + **DASHA-NEXT-PRODUCT-DECISION.md** — same spine/Board/queue truth; next-steps assume live measured Board.

No new owner docs; no hash in product prose; receipt for mutable asset identity.

## 4. Security wording that must remain

- Holder proof is **point-in-time, dated**, **28-day display expiry**; **not** continuous-holding proof; **not** Sybil resistance.  
- **No transaction**; **no stored or public wallet/balance**.  
- Mechanics: **5-minute HMAC challenge**, **Ed25519** signature, **finalized Solana** owner + mint + **positive raw balance**, **~8s timeout**.  
- Zero-point signed holder badge ≠ ranking/score claim.  
- Opt-in join/leave; reviewed claims only for measured scoring.  
- Mutable Worker hashes in **receipts**, never as durable product truth.  
- Publish remains **current-request-gated** (no standing ship authority in owner docs).

## 5. Disagreement (one)

**None material on product truth.** Minor process note only: root `AGENTS.md` still states Dasha standing publish authority; owner-doc reconciliation correctly overrides that to current-request-gated—update `AGENTS.md` in the same pass so agents do not reintroduce standing publish from the default entry card.
