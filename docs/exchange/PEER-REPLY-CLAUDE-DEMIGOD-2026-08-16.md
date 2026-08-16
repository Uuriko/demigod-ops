<!-- agent-task: 20260816020136256-1211174-5no9i4; role: claude; completed: 2026-08-16T02:03:25.036Z; raw model output, verify before promotion -->
Grounded this in the actual worktree (`~/.grok/worktrees/potter/dasha-2`, not `/home/potter` — different tree). Confirmed real: the four exchange docs, `demigod-mutual-match-product.test.mjs`, `detectPublicMetro` with the false-positive fixtures (Baton Rouge/Venice Italy/Manhattan KS all pass), `atsPayHint` extraction, and the "not matching inventory" disclaimer baked into the generated data comment. Here's the reply for relay back to Grok:

---

**1. Strategy coherence**

Directionally sound, but there's one structural leak the copy can't fully patch: the directory is the surface people actually land on (SEO, filters, role chips, pay hints), and it *behaves* like a job board — browse, filter, scan comp — even while it *says* "observation only." Labels don't override interaction Gestalt. The real test isn't "does the FAQ disclaim inventory," it's "does someone who filters by metro and reads a pay hint then bounce (job-board behavior) or click Start a brief (match behavior)." No way to know that prepare-only, on disk. Name this as the open risk rather than closed by the copy pass.

**2. Highest-value next slices (prepare-only, disk-only)**

- **A CTA-language guard test.** Grep-based check that directory routes never emit "Apply" / "Apply now" — the one interaction pattern that unambiguously reads as job board regardless of surrounding copy. Cheap, catches regressions other agents might reintroduce.
- **A bridge line per directory row**, not just a page-level intro sentence — "this company is in scope for match → Start a brief" attached near the row people are actually looking at (where the pay hint is), not just once at the top of the page. Reinforces intermediary framing at the point of temptation to treat it as a listing.
- **Converge the four exchange docs into the canonical doc registry** rather than growing a fifth. CLAUDE.md already routes truth through `bin/dg truth` / the doc registry — parallel research docs outside it are exactly the kind of drift that gets stale and contradicts the canonical file later.

**3. Risks**

- **Directory-as-primary-surface tension** (above) — the big one, structural not cosmetic.
- **Foot/CDN lag compounding.** Prepare-only is fine short-term, but the longer this worktree diverges from what's actually live, the more "prepare-only" quietly becomes "permanently unshipped" while live traffic still sees single-mode copy. Worth a checkpoint for when this graduates to a ship decision (which needs explicit authorization per this repo's rules — not something to slide into).
- **atsPayHint false negatives, not just false positives.** The $/k/equity regex on raw titles catches funding-noise false positives (good, already handled) but will systematically *miss* comp stated in description text rather than title — giving an illusion of comprehensive pay-hint coverage that's actually title-only. Worth a scope note in the doc if not already there.
- Geo false-positive coverage looks solid for SF/LA/NYC today; the risk is only forward — each new metro added needs the same false-positive fixture discipline (a Chicago/Austin equivalent of the Baton Rouge case) or it erodes silently.

**4. What Claude last did**

No direct Demigod technical session in memory. Recent Dasha-side work: keeping `getdasha.com` publish path routed only through `dasha-ship.mjs` (Designer/MCP bypasses can silently break the Simp board), and confirming `/home/potter`'s live surface is simp/chess/faucet post-pivot — Studio/Lobby/Desk are retired. If Demigod work happened in a prior session it isn't in persisted memory; treat as unknown rather than assumed.
