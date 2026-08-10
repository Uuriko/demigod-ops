---
status: reference
owner: crypto-research
updated: 2026-08-09
canonical_for: crypto-research-delta-2026-08-09
---

# Dasha crypto research delta — 2026-08-09

This note records what changed after a fresh primary-source scan and a finalized onchain/discovery
probe. It informs the roadmap; it does not replace [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md)
or authorize submissions, spending, posting or publication.

## Executive result

Do not add a mobile app, Blink, wallet gate, automated X leaderboard or another trading surface yet.
The current evidence supports a narrower next crypto lane: make the exact mint's public identity
consistent across discovery surfaces, while continuing to test whether people voluntarily create,
export and return to the existing culture loop.

This is the weakest sufficient conclusion because it remains useful whether Dasha later becomes a
creative platform, a small culture site or only a well-run community project. A new platform wrapper
would assume repeat demand that has not been observed.

## Direct evidence

`node .grok/worktrees/potter/dasha/dasha-onchain-check.mjs` completed against finalized state at slot
`438210725` on 2026-08-09 and reported no probe failures.

### What is coherent

- exact mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`;
- classic SPL Token program, six decimals;
- mint and freeze authorities are disabled;
- Metaplex metadata is immutable and its metadata/image bytes agree through two IPFS gateways;
- the public `@dash_eats` mint-source post contains the complete mint;
- the Raydium pool, Jupiter route, Phantom route and Solflare route preserve the exact mint;
- Jupiter Swap V2 returned a route for an exact SOL → `$dasha` probe.

These observations establish identity continuity at the contract and route level. They are not
claims about safety, endorsement, future liquidity or price.

### What is fragmented

- DexScreener still links `https://dasha.cam` and `https://t.me/dashacommunity`;
- Jupiter metadata has no website and links a historical post instead of the canonical X profile;
- Jupiter does not positively report verification;
- the current exact-mint VRFD endpoints expose the same pending Standard submission as core ID
  `15201` and audit-event ID `23806`; it uses
  `Dashaonsol`, was submitted by `radbrilio` and makes an unproven official-token claim;
- Jupiter name search returns nine competing `dash_eats` / `dasha` mints besides the canonical one;
- Phantom and Solflare do not positively report verification;
- Solflare displays mutable metadata although finalized Metaplex and Rugcheck report immutable;
- Solana Explorer search does not surface the exact mint or name.

The practical problem is therefore discovery ambiguity, not missing token utility.

## Fresh market evidence

### Mobile distribution is real but crowded

Solana Mobile reports more than 1,000 live dApps, over 100,000 active Seeker users, Spotlight
curation, ratings/reviews and publisher feedback analytics. This proves that mobile distribution and
feedback infrastructure exist; it also means a wrapper competes in a crowded store and must earn a
repeat-use job. Dasha currently has no evidence that a native package would outperform its web loop.

Sources: [1,000+ dApps and the retention problem](https://solanamobile.com/blog/1-000-dapps-smarter-discovery-and-a-bigger-seeker-season),
[review analytics](https://solanamobile.com/blog/app-review-summaries-and-replies-are-now-live-in-the-solana-dapp-store-publishing-portal),
[Spotlight discovery](https://solanamobile.com/blog/introducing-dapp-spotlight-in-the-solana-dapp-store).

### Portable transactions are infrastructure, not the current product

Solana Actions can expose a signable transaction through a URL, but production requires public
GET/POST endpoints, CORS, transaction construction, wallet handling and client support. Automatic
social unfurling can additionally depend on registry review. Dasha's fixed-mint Jupiter link already
hands execution to the specialist venue without custody or transaction-building code.

Sources: [Solana Actions and Blinks specification](https://solana.com/developers/guides/advanced/actions),
[Dialect registry and security states](https://docs.dialect.to/blinks/blinks-provider/blink-registry).

### Automated social scoring remains a review aid

X exposes OAuth-scoped likes, mentions, reposts and post lookup with endpoint-specific rate limits,
but those events do not prove originality or contribution quality. X's developer rules also prohibit
automated/bulk liking and require user initiation for likes. API access can find candidate evidence;
it should not silently mint Simp points.

Sources: [X API rate limits](https://docs.x.com/x-api/fundamentals/rate-limits),
[OAuth 2.0 scopes](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code),
[X developer guidelines](https://docs.x.com/developer-guidelines).

### One canonical identity page is a durable pattern

Tokens.xyz organizes discovery around one asset page, exposes comparable identity/liquidity context
and routes execution to specialist venues. Dasha should borrow the abstraction, not its feature set:
Desk is the canonical identity page; the site should not grow separate explorer, portfolio or swap
systems.

Source: [Tokens.xyz asset-level design](https://solana.com/news/inside-tokens-xyz).

## Live hypotheses and decision

| Hypothesis | Evidence it explains | Unsupported commitment | Decision |
| --- | --- | --- | --- |
| Build another distribution wrapper now | Mobile and in-feed surfaces are growing | Assumes repeat use and a wrapper-specific acquisition advantage | Reject now |
| Automate social/holder rewards | OAuth and onchain reads exist | Treats measurable activity as authentic contribution and creates abuse operations | Reject now |
| Build a richer trading/asset terminal | Discovery is fragmented | Duplicates mature asset, chart, wallet and swap products | Reject |
| Repair external identity, retain one Desk and test the existing culture loop | Exact mint is coherent; public listings are inconsistent; repeat creative demand remains unproven | No new product promise | Select |

## Ranked task lane

These are ordered by information value, not excitement.

1. **Prepare one identity submission pack.** Exact mint, getdasha.com, canonical `@dash_eats`, public
   mint-source post, square marks and short descriptions. Reuse it; do not create provider-specific
   stories.
2. **Correct DexScreener presentation.** Replace `dasha.cam` and the unrelated Telegram. This is an
   outbound submission and remains current-request-gated.
3. **Correct the active VRFD identity conflict before another request.** The live exact-mint swap now
   renders a `Not Verified` JupShield warning. Jupiter's current Standard verification path is free
   with no guaranteed timeline; Express and the separate metadata-update path each involve a 1,000
   JUP option/fee. Core submission `15201` / audit event `23806` is pending with zero evaluations and contains the
   conflicting handles and claim; ask support to correct, reject or permit takeover rather than
   stacking a second contradictory submission. Resolve
   the V4 social criterion first: Jupiter says the linked X account must be project-exclusive rather
   than personal/KOL, while Dasha's truthful canonical profile is also her personal public identity.
   Do not fabricate a token-only account to satisfy the form.
4. **Request metadata corrections from wallet/index surfaces where supported.** Prioritize incorrect
   facts over badges. Keep immutable onchain metadata as the authority.
5. **Add a read-only identity-drift gate.** Fail when a provider newly changes the website, social,
   mint, mutability or exact-route identity. Do not fail merely because verification remains absent.
6. **Keep Desk as the single asset identity page.** Link out to Jupiter and one chart; do not embed
   execution, portfolio tracking or an explorer clone.
7. **Re-evaluate mobile/Blinks only after repeat-use evidence.** Trigger: multiple distinct
   non-operator participants return or pass editable artifacts, plus evidence that the target surface
   is where they want to act.

## Falsification and residual uncertainty

This decision should change if either of these occurs:

- repeat participants explicitly need an in-feed or mobile-native handoff that the web path cannot
  provide; or
- discovery probes show external identity has converged while acquisition still fails at the exact
  same handoff.

Unknowns remain: provider correction processes and costs can change; wallet/index caches may disagree
temporarily; X events cannot establish contribution quality; mobile-store scale does not reveal
Dasha-specific demand. Re-run primary-source and provider probes before any gated submission.
