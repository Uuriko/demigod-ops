# Dasha identity and wallet trust audit

**Updated:** 2026-08-09  
**Scope:** X OAuth, browser session, optional Simp Board membership, zero-point holder badge, and deletion.

## Result

No new identity framework or wallet dependency is justified. The current boundary passes its focused adversarial suite and aligns with the relevant OAuth and SIWS mechanisms.

### X identity

- Authorization Code flow with per-request S256 PKCE.
- Random `state` is bound to the initiating browser in a signed, 15-minute, `__Host-`, Secure, HttpOnly, SameSite=Lax cookie.
- Callback requires matching signed state and verifier; callback paths clear the state cookie.
- Exact scopes are `tweet.read users.read`; tests reject `tweet.write`, other write scopes, and `offline.access`.
- The access token is used once for `/2/users/me` and is not retained. No refresh token is requested or stored.
- The resulting 30-day session is an HMAC-signed, expiring, host-only Secure/HttpOnly/SameSite=Lax cookie.
- Mutating logout, join, leave, quiz-share, claim, review, and holder endpoints enforce method and/or allowed product origin as appropriate. Hostile-origin preflight and logout fail closed.
- Linking X does not automatically join the public Board. Leaving deletes the profile, claims, active attempt, current linked result, holder challenge, and rows from retained season snapshots. Logout separately clears the browser session.
- Public Board and signed self-status responses omit X numeric IDs, enrollment timestamps, quiz-completion timestamps, and contribution tie-break timestamps. Ranking still uses those times internally; the client receives only fields it renders. A holder-check date remains public only when the user has opted into that dated badge.

### Wallet holder badge

- Wallet connection is optional and follows an already-linked X identity plus explicit Board join.
- The signed text follows SIWS-shaped fields: exact `www.getdasha.com` domain, exact URI, address, mainnet chain, random nonce, issue time, five-minute expiry, and `simp-holder` request ID.
- The nonce is 128 bits encoded as 32 hexadecimal characters, satisfying SIWS's alphanumeric, minimum-eight-character grammar. OAuth state, PKCE and public result IDs continue using their separate base64url generator.
- The human-readable statement says the action proves a private holder badge, creates no transaction, and publishes no balance.
- The HMAC challenge binds X ID, wallet address, nonce, full message, and expiration.
- Ed25519 verification precedes the RPC query. A valid one-time nonce is deleted before RPC work and cannot be replayed; invalid signatures do not consume it.
- The finalized RPC query checks the connected owner against the exact `$dasha` mint and requires a positive raw token balance.
- Wallet address and balance are not stored or displayed. Only check time and 24-hour badge expiry remain; access begins immediately after verification.
- The badge awards zero points and cannot change rank.
- Challenge and verification requests are independently rate-limited; malformed addresses, substituted wallets, expired challenges, RPC failures, and replays fail closed.

### Wallet reuse and rank integrity

Because the wallet address is deliberately not retained, the same wallet can later prove a badge for another linked X account. That is not a rank exploit in the current model: holder contributes exactly zero points, is absent from every tie-breaker, and only displays a dated badge. Persisting a raw wallet, hash, or keyed fingerprint solely to prevent badge reuse would create linkable identity state without protecting the leaderboard.

If holder points, token-weighted rank, holder-only access, or scarce holder rewards are ever introduced, this privacy tradeoff changes. That feature would require an explicit uniqueness policy, a keyed non-public wallet commitment, deletion/rotation semantics, transfer/recheck rules, and abuse tests before any points ship. A balance snapshot alone still would not prove beneficial ownership or one-person uniqueness. Until then, keep holder recognition non-ranking and private-by-default.

### RPC availability boundary

The Worker accepts one or two private HTTPS endpoints through `SOLANA_RPC_URLS` (comma-separated), with legacy single-endpoint `SOLANA_RPC_URL` support. It retries only transport, HTTP, or malformed-RPC failures; a valid zero-balance response is authoritative and is never retried against another provider. Attempts are capped at two endpoints and four seconds each. Without either setting, the optional badge uses Solana's public mainnet endpoint and `/health` reports `holderRpc: public-fallback`.

Solana states that its public RPC is rate-limited, has no SLA, and is not intended for production applications. Production currently has no dedicated RPC secret, so holder proof is fail-closed but availability-degraded; the rest of Lobby, OAuth, quiz, and Board scoring do not depend on RPC. Configure a private primary endpoint (and a second only when operationally independent) before treating holder proof as production-reliable. Never place an RPC URL containing credentials in Wrangler vars, source, logs, or public health output.

The current code uses Solana's older `api.mainnet-beta.solana.com` hostname while current documentation names `api.mainnet.solana.com`. A live comparison on 2026-08-09 returned the same Triton One service and healthy JSON-RPC response from both, so changing the hostname would not fix the production-availability boundary. The real improvement remains a private endpoint; no cosmetic hostname churn was made.

## Why not upgrade to wallet-native `signIn` now

The current `connect` + `signMessage` compatibility path already implements the SIWS security fields and verifies the exact signed bytes. Wallet Standard `signIn` could improve UX by letting supporting wallets construct the message, but it would require broader provider discovery and a fallback for wallets that do not implement it. There is no observed holder-proof usage establishing that this added path would improve completion.

The 2026-08-09 standards re-audit found no conformance defect to mask with a dependency. The current message satisfies SIWS's ABNF field shapes, Phantom's ten-minute `issuedAt` window, and its address/domain/URI/chain/expiry checks. The mobile fallback also matches Phantom's current Browse deeplink contract: an encoded page URL plus the required encoded `ref` origin. Solana Mobile recommends wallet-native `signIn` for Android Chrome because MWA can combine connection and signing within one trusted user action; MWA is unavailable in iOS browsers. Dasha instead reopens the page in Phantom's signing-capable in-app browser when no injected provider exists. That narrower fallback already covers the optional, zero-point badge without adding a wallet selector or framework to every visitor.

Trigger: consider wallet-native `signIn` only after real holder-proof attempts show a measurable compatibility or completion problem. Preserve the existing message-verification fallback.

## Deferred cookie hardening

The OAuth-state cookie already uses the `__Host-` prefix. The longer browser-session cookie has all required host-only attributes but retains its historical `dasha_x` name. Renaming it to `__Host-dasha_x` would add browser-enforced protection against future Domain/path regressions, but a hard rename would sign current users out and a legacy fallback would temporarily preserve the condition it aims to remove.

Trigger: perform a versioned cookie-name migration only when another session-format change is already warranted or when an untrusted sibling subdomain enters scope. Until then, tests pin the existing no-Domain, Path=/, Secure, HttpOnly, SameSite=Lax contract.

## Residual risks

- A stolen valid session remains usable until its 30-day expiry or secret rotation; there is no server-side session revocation list. Adding one would create identity state and operational complexity. Revisit only after a real account-revocation need.
- The holder badge proves one positive balance at one finalized observation, not continuous ownership, beneficial ownership, uniqueness, or financial commitment.
- X handle/avatar/verification type can change during the 30-day session. X ID remains the durable account key, but the public presentation refreshes only on relink.
- Platform compromise, malicious wallet software, stolen X credentials, and compromised project secrets are outside what a browser message can prove.

## Sources

- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700)
- [X OAuth 2.0 Authorization Code Flow with PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token)
- [X OAuth 2.0 scopes and exact redirect behavior](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
- [Sign In With Solana specification](https://github.com/phantom/sign-in-with-solana)
- [Phantom message signing](https://docs.phantom.com/solana/signing-a-message)
- [Phantom Browse deeplink](https://docs.phantom.com/phantom-deeplinks/other-methods/browse)
- [Solana Mobile — MWA for web apps](https://docs.solanamobile.com/get-started/web/apps)
- [Solana Mobile — web wallet UX](https://docs.solanamobile.com/get-started/web/ux-guidelines)
- [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters)
- [Solana `getTokenAccountsByOwner`](https://solana.com/docs/rpc/http/gettokenaccountsbyowner)

## Verification

```bash
npm run dasha:test:lobby
npm run dasha:test:simp
```

These tests cover scope minimization, PKCE/state cookies, hostile origins, deletion, address validation, message fields, address substitution, Ed25519 verification, replay, RPC call count, rate limits, and zero-point scoring.
