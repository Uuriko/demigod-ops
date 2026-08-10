# Dasha exact product roadmap

Updated: 2026-08-09

## Current product lane — community playground

The active loop is **quiz → tailored Studio seed → make/share → optional recognition**, with Lobby as a separate public third place. The Board reuses the Lobby's X OAuth session but requires a separate explicit join. It recognizes reviewed creative, community and open-source evidence; renders personal score cards; shows earned badges; and preserves frozen season snapshots.

Built and gated (verify live with `npm run dasha:audit:live:fast` / protocol as needed):

- quiz-result → tailored Studio seeds using portable URL state;
- aggregate-only Studio open / first-edit / export / share-intent / native-share counters;
- contribution claims with public evidence and authenticated fixed-tier review;
- browser-rendered personal score cards / badges;
- frozen season snapshots (operator-held; not claimed immutable);
- optional holder proof path with no public wallet display.
- dead anonymous Lobby report protocol removed after its UI was deleted; forged report frames fail closed while operator moderation remains.
- public charts now use the exact GeckoTerminal pool; clickable Dexscreener profile links fail the release gate because that editable profile exposes stale community destinations.
- X OAuth now shows the privacy contract before redirect; Board leave deletes linked state and scrubs retained season rows, while logout separately clears the browser session.
- one asset write now refreshes Worker clients and all three SHA-384 pins before rebuilding the final bundle.
- permanent quiz-result pages now have complete Open Graph/X metadata, crawler HEAD support, and a compliant 1.91:1 share-card asset; live X rendering remains a post-release verification, not a source-only claim.
- Home social-preview readback now requires the public 1200×630 PNG to hash-match the prepared card; the stale negative-copy Webflow asset hard-fails announce readiness.
- one shared rule now rejects negative coin/disclaimer copy across all five live routes; current Home shell metadata, Desk, and `/how-to-buy` remain stale while Studio and Lobby pass.
- one metadata contract now pins concise SEO/Open Graph copy and canonicals across all five routes; every current live route has at least one mismatch, while prepared Lobby and buying-guide HTML now match.

Next evidence gate: measure anonymous Studio open → edit → export/share attrition from the clean **2026-08-08T21:27:20-07:00** baseline and observe whether real linked members voluntarily join and submit useful evidence. The prepared source is published and the joint counters were reset and verified at zero. Do not treat earlier totals or local test events as usage. Do not add referrals, purchase points, social-engagement scraping, token-weighted rank, peer voting or new credential machinery before behavior exists.

Prepared for the next authorized Worker release: a public, read-only funnel summary that suppresses every cell below five and omits identities, content, question detail and traffic-source slices. It makes the evidence gate observable without distributing the moderation secret; raw readout and reset stay authenticated.

## Current order

1. Preserve the clean dated baseline; do not reset it during ordinary audits.
2. Observe result → creation → share → recognition before adding another surface.
3. Diagnose the largest measured transition loss before changing UI.
4. Feature one credited artifact only after at least five genuine submissions exist.
5. Keep Home, Studio, Desk, Lobby and Simp gates green and ship readback fail-closed.
6. Only after a usable Studio baseline, test one rotating prompt inside the existing Studio; keep it only if first-edit → export/share completion improves.
7. Re-rank from Dasha behavior, using [`DASHA-RETENTION-RESEARCH-2026-08-09.md`](DASHA-RETENTION-RESEARCH-2026-08-09.md) as the current external-evidence note.

## Kill and safety rules

Do not add referrals, purchase points, social-engagement scraping, token-weighted rank, financial-performance scoring, peer voting, buy Blinks, Farcaster identity, native mobile work, a PWA share target, C2PA credentials or new credential machinery without observed need.

Do not revive Thesis Card, receipts, Pair, forecasting, rounds, casino positioning, catbox publish or Discord-as-HQ.

## Evidence

Product demand is measured by quiz-to-Studio continuation, Studio editing/export/share, voluntary Lobby participation, Simp opt-in and useful reviewed contributions. Token price, holder growth, impressions and raw chat membership are not product-success evidence.

## Historical roadmap (pre-pivot)

Everything that previously described Thesis Card phases, sealed receipts beta, Discord-first community, North-star forecasting language and casino-era live defects is **superseded**. Do not execute those phases. See `archive/` and dated reviews under `DASHA-*-2026-08-*.md` for history only.
