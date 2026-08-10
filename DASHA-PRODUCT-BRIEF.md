# Dasha product brief

Updated: 2026-08-10

## What Dasha is

Dasha is a small culture arcade around six connected public surfaces:

1. **Home** — culture landing, CA, entry points, and the opt-in **Simp Board**.
2. **Studio** — make and remix portable culture artifacts (posts, stories, banners).
3. **Desk** — the bounded mint and Jupiter trust surface.
4. **Lobby** — a separate, intentionally clean public chat page.
5. **Quiz** — Dasha-only lore that produces a shareable identity/result.
6. **Chess** — public brackets and replays; holder-only rated Dasha-versus-Anna games, direct challenges, and mutual rematches.

Lobby is the public chat (not Discord HQ). Optional X linking provides identity perks; joining the Simp Board is a separate explicit action. PerryALPHA is the Board's editorial #1; measured rows are joined accounts with reviewed creative, community or open-source contributions. Season IDs cannot be overwritten, but only the newest 24 frozen snapshots are retained.

Optional holder recognition is a zero-point badge based on a dated, finalized owner-and-mint balance check. The signed challenge creates no transaction, and wallet addresses and balances are neither stored nor shown publicly. It does not prove continuous holding or Sybil resistance.

X linking now passes through a concise privacy notice. Dasha stores no OAuth token. Leaving the Board deletes linked profile/claim/attempt/current-result state and scrubs retained season rows; unlinking X separately clears the 30-day signed browser session. Public privacy contract: `https://lobby.getdasha.com/privacy`.

## Immediate product loop

**Enter through lore or a public object → make or play → share outward → return.**

Quiz results seed Studio creations. Studio exports become portable posts. Chess challenges recruit
one opponent; mutual rematches swap Dasha/Anna sides; tournaments become public brackets and decisive replays. Lobby and the opt-in Board give people a place and identity to
return to. Holding opens play but never changes Board points, rating weight, financial claims, or
public wallet visibility.

Quiz results now open tailored Studio seeds. Quiz starts, reaches, answers, completions and results are counted from server-validated attempt transitions; only share intent remains client-reported. Studio records aggregate-only open, first-edit, export, share-intent and Web Share API resolution counts. A resolution is a browser handoff signal, not proof that a post was published. Both funnels share an authenticated dated baseline reset so pre-release tests cannot contaminate the first public cohort. Failed Studio aggregate delivery remains retryable within the page; successful stages are still reported once, and hidden cells remain unknown rather than zero. The next evidence question begins only after those changes are published and receive real traffic. Do not add referrals, purchase points, social-engagement scraping, token-weighted rank, peer voting, a Remix Wall, PWA machinery or content credentials before that behavior exists.

Chess uses the same aggregate-only discipline. Thresholded page, buy, game, replay, challenge and
tournament counters expose no identity or wallet data. Rematch offers and acceptances measure mutual
repeat-play demand without identifying either player. Replay opens and Play intents distinguish a
portable game's reach from its ability to recruit another player; they are events, not unique users.
Once Chess page opens disclosed at six while every downstream cell remained hidden, the access path
gained four fixed aggregate intent stages: X link, enrollment, holder proof and queue. They are
session-deduplicated event counts, never identities or a per-person funnel. Change the first stage that
discloses a real drop; do not guess by adding another game format.
Rated games use server-authoritative legal moves, clocks and online draw adjudication, including a
draw on timeout when checkmate is impossible.
Completed games offer exact-position image/URL sharing and portable PGN. The share path preserves
native text/URL sharing when image files are unsupported and uses an exact X intent only when native
sharing is absent or fails. A thresholded handoff event records only native resolution or an opened X
destination; it is not proof of a published post, impression, person, or conversion. Challenge links
use the same device-first principle. Dasha never reads the person's contacts or chosen destination.
At the current below-five Chess baseline, a queued holder receives one contextual Invite someone
escape hatch. It reuses the direct-challenge object instead of assuming enough simultaneous users for
global matchmaking; after creation the primary action becomes Share challenge. This is distribution
inside utility, not a referral reward or trading incentive.

The first clean public baseline began at **2026-08-08T21:27:20-07:00** after the verified release. Studio and Quiz counters were reset together and read back at zero with the same persisted timestamp. Earlier unbounded totals are test-contaminated and must not be used as demand evidence. Research and the exact experiment order are in [`DASHA-RETENTION-RESEARCH-2026-08-09.md`](DASHA-RETENTION-RESEARCH-2026-08-09.md).

Studio has no contribution-claim button. An editable Studio URL is not evidence of publication or authorship. Future creator discovery, if enabled, must happen behind the scenes from X's authenticated post stream, match immutable X author IDs to opt-in Board profiles, and enter editorial review rather than awarding points automatically.

Portable artifact state and one-hop remix lineage live in the URL fragment. This is intentionally editable and non-authoritative. It is not a cryptographic provenance claim.

Portable artifacts are not separate financial instruments. Dasha does not create a new coin for each
Studio export, quiz result, Chess replay, X identity or contribution. One exact mint keeps the product
legible; artifacts carry culture and utility without requiring a transaction.

## What it is not

Dasha is not a casino, trading terminal, signals room, safety oracle, P&L leaderboard, forecasting product or receipt service. Discord is not the community HQ.

Thesis Card, conviction receipts, Pair, forecasting and rounds are **permanently scrapped**. Files may remain as historical evidence but must not be tested, deployed or revived.

## Trust boundaries

- Mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`.
- Mint association does not establish legal control, celebrity authorization, safety or endorsement.
- Use “official,” “safe,” “verified,” “immutable” or “proof” only when the exact claim is established.
- Simp recognition is editorial and opt-in; it is not financial performance, influence rank or Sybil resistance.
- `t.me/dashacommunity` and similar unofficial community links must not appear in product artifacts.

## Product test

Will people finish the Dasha quiz, make something in Studio or complete a Chess game, share the
resulting object, return to the separate Lobby, and voluntarily opt into recognition—without
financializing every action?

Live truth and gates: [`DASHA-DOCS.md`](DASHA-DOCS.md) · [`DASHA-META.md`](DASHA-META.md) · [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md). Ship: `node dasha-ship.mjs` (not catbox, not thesis publish scripts).
