<!-- agent-task: 20260808103453061-2169524-uzitnk; role: claude; completed: 2026-08-08T10:35:52.301Z; raw model output, verify before promotion -->
# Dasha Doc Reconciliation — 2026-08-08

## 1. Current product definition

Dasha is live today as **Home + Studio + Desk + Lobby**, with **X OAuth** login and an **opt-in, measured Simp Board**. Users must explicitly join/leave the Board; membership carries reviewed claims, fixed creative/community/OSS scoring points, a downloadable score-card PNG, badges, and immutable season snapshots. A **zero-point signed holder badge** is available via server-side holder proof (see §4). **PerryALPHA** is disclosed as editorial slot #1 — non-measured, explicitly not a scored account. **Thesis, receipt, and forecasting features are permanently retired** — no doc may describe them as present or pending. **Discord is blueprint-only**, not shipped, not "Current." **Transmissions/alibi is one unproven creative experiment**, not the product definition and not the sole current offering. Implementation truth for all of this currently lives in the `.grok/worktrees/potter/dasha` tree; the main-root release manifest still describes an older Transmission-era checkpoint and is known to be drifted — treat main-root as stale until it's reconciled, not as ground truth. Publication of anything — site changes, posts, forms, money movement — requires exact authorization in the current request; no standing doc grants that authority.

## 2. Severity-ranked edit list

**Critical**
1. **Workflow doc + checked-in `AGENTS.md` — standing Dasha publish authority.** This directly contradicts the hard governance rule (publishing requires exact current-request authorization; old autonomy notes grant none). Replace any "Dasha has standing/pre-authorized publish rights" language with: "No standing publish authority exists. Every publish action requires explicit authorization in the request that triggers it. Historical autonomy grants are void."

**High**
2. **Product Brief — "Board prepared/no linked or scored accounts; Transmissions sole current product."** Both clauses are false. Replace with: "Board is live and opt-in-measured (explicit join/leave, reviewed claims, scored creative/community/OSS points, score-card PNG, badges, immutable season snapshots, zero-point signed holder badge). PerryALPHA is disclosed non-measured editorial #1. Transmissions/alibi is a creative experiment, not the product definition."
3. **Simplify — "Board editorial only/no measured identity or score."** False on both counts; Board is measured and scored, PerryALPHA is the editorial-only slot, not the Board. Replace with the same Board description as above, explicitly separating "Board (measured)" from "PerryALPHA (editorial, unmeasured)."
4. **Complete Guide — Transmissions-led definition + broad release drift.** The guide currently defines the product around Transmissions and reflects an outdated release. Replace the lead definition with the §1 product definition above, and add an explicit note that main-root release manifest is drifted vs. the worktree implementation, naming both locations.

**Medium**
5. **Next Product Decision — "Board merely prepared, no review queue."** False; Board has a live review process behind its reviewed-claims mechanic. Replace with: "Board review queue is live; decisions here concern forward roadmap items, not Board's operating status."
6. **Roadmap — "Studio awaits publish" + old Worker hash copied into prose.** Studio returns 200 on Webflow — it is live, not pending. Replace "awaits publish" with "live." Delete the copied Worker hash outright: mutable hashes belong only in receipts, never in prose docs, because they go stale the moment the referenced build changes.
7. **Docs map — long 2026-08-07 drift narrative + "Board prepared/editorial" + "Discord marked Current."** The drift narrative is now itself stale (superseded by this reconciliation) and should be compressed to a single dated pointer, not retold. Fix the Board line to match §1. Change Discord's status from "Current" to "Blueprint only — not shipped."

**Low**
8. **Workflow / AGENTS.md — missing Lobby/Board source map.** Not a falsehood, a gap. Add a short pointer table (doc → implementation path) so future reconciliations don't need a fresh audit to locate truth.

## 3. Minimum owner-doc set

Three docs, no more:

1. **Product Brief** — the single canonical "what Dasha is right now" doc. Everything in §1 lives here, and only here in full prose form.
2. **Docs Map** — pure navigation/index: one line per doc, pointing to Product Brief for the product definition, plus the current implementation-truth location (worktree vs. main-root manifest caveat). No narrative, no drift history beyond a single dated line.
3. **Workflow / AGENTS.md** — governance only: authorization rules (no standing publish authority), gate list, source-map pointer table.

Retire or merge everything else into these three:
- **Simplify** — redundant with Product Brief once fixed; fold in or delete.
- **Complete Guide** — keep only if it serves a genuinely deeper technical audience than the Brief; otherwise merge. If kept, it must defer to Product Brief for the definition, not restate its own.
- **Roadmap** — keep, but strip to forward-looking items only; no current-state claims, no hashes.
- **Next Product Decision** — keep only if it's an active decision log; otherwise fold into Roadmap.

Fewer docs means fewer places for this exact drift to recur.

## 4. Security wording that must remain, unaltered in substance

- Holder proof mechanism: five-minute server HMAC challenge → Ed25519 signature → finalized Solana owner+mint+positive raw balance check.
- 8-second timeout, fail-closed to HTTP 503 (not fail-open).
- Check is dated; badge display expires after 28 days.
- No transaction occurs as part of the check.
- No wallet address or balance is stored or made public.
- Explicit disclaimer required wherever this is described: **this is not proof of continuous holding, and it is not Sybil resistance.**
- Board membership is **opt-in only** — explicit join/leave, never implied or default.
- Mutable hashes (builds, Workers, deploys) belong in receipts only, never copied into prose docs.

Any doc touching holder proof, Board membership, or publish authority must preserve every clause above — these are the load-bearing security/trust claims, not stylistic detail.

## 5. Disagreement / uncertainty

- I have not inspected the repo, so line-level edits above are directional, not diffs — verify exact text before replacing.
- Whether to **merge** Simplify/Complete Guide into Product Brief vs. keep them as separate-but-corrected docs is a scope call, not a fact; I'm recommending consolidation on drift-reduction grounds, but that's a judgment, not a verified requirement.
- The Docs map's 2026-08-07 drift narrative may have audit/historical value — if so, archive it (e.g., dated changelog entry) rather than deleting outright; don't destroy the record while fixing the doc.
- Main-root release manifest vs. worktree implementation: reconciling docs to worktree-truth is correct per the brief, but any doc that gets published should say so explicitly ("implementation currently lives in worktree X; main-root is drifted") rather than silently presenting worktree state as uncontested — until that drift is resolved, the caveat itself is load-bearing.
