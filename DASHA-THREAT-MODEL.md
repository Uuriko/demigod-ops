---
status: reference
last_verified: 2026-08-08
---

# Dasha threat model

This is the compact security boundary for Home, Studio, Desk, Lobby and the Simp Board. It names credible failures, the existing control and the check that must fail before release. It does not turn an unverified claim into a security guarantee.

| Risk | Prevent or limit | Detect and recover | Runnable check |
|---|---|---|---|
| **T1 — Wrong mint or substituted buy route** | One exact mint in release contracts; external swaps only; no custody | Compare every token-facing surface and fail closed on disagreement | `npm run dasha:test:growth` |
| **T2 — Source, Webflow or live release drift** | Canonical Studio and Desk sources generate public artifacts | Hash local artifacts, read back Webflow and verify live markers; republish only from a current gated run | `npm run dasha:ship:test` |
| **T3 — OAuth login substitution or session theft** | X OAuth state/PKCE, signed short-lived sessions and explicit Board opt-in | Reject mismatched state, invalid signatures and implicit enrollment | `node .grok/worktrees/potter/dasha/dasha-lobby.test.mjs` |
| **T4 — Simp Points manipulation** | Fixed event lanes, one quiz attempt per X, server-held branch state and Worker-only scoring; holder balances score zero | Schema rejects unknown/public-evidence fields; scorer fixtures cover replay, incomplete paths, invalid answers and abuse | `npm run dasha:test:simp` |
| **T5 — Lobby spam, unsafe links or moderation abuse** | Rate limits, bounded messages and server-side link/moderation rules | Moderation log and deterministic worker tests | `node .grok/worktrees/potter/dasha/dasha-lobby.test.mjs` |
| **T6 — Remote Studio media failure or rights overclaim** | Every gallery URL and source is registered; drawn assets and photos have separate rights language | Media contract detects unregistered hosts, duplicates and missing fallback metadata | `npm run dasha:test:studio-media` |
| **T7 — Secret exposure** | OAuth secrets and signing keys stay server-side; browser artifacts contain public identifiers only | Review generated artifacts and repository diffs before release | `npm run dasha:test:all` |
| **T8 — Third-party market or image outage** | Core pages and drawn Studio looks remain useful without remote data | Desk resilience tests and gallery fallbacks keep failure local | `npm run dasha:test:all` |
| **T9 — Misleading authority, endorsement, safety or privacy copy** | [`DASHA-CLAIMS.md`](DASHA-CLAIMS.md) sets the narrowest allowed wording | Coherence gate checks the ledger and high-risk public phrases | `npm run dasha:test:docs` |

## Release rule

A failed control blocks the affected surface. It does not justify weakening the check, silently changing the claim or substituting another mint, account, wallet, media source or deployed artifact.
