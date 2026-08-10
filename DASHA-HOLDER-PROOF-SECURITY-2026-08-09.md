---
status: reference
updated: 2026-08-09
---

# Dasha holder-proof security

## Decision

Keep the current bounded `connect` + `signMessage` holder-badge flow. Do not turn it into wallet
authentication, token gating, transaction construction or a dependency-heavy wallet adapter stack.
It establishes only wallet control plus a positive raw `$dasha` token balance at one finalized RPC
observation. The badge expires after 28 days, scores zero, and publishes neither address nor balance.

## Verified flow

1. An already X-linked and Board-enrolled account supplies a 32-byte Solana public key.
2. The Worker rate-limits requests and generates 16 random bytes, a five-minute expiry and a
   server-signed challenge bound to X ID, public key, nonce and exact message.
3. The message follows the Sign In With Solana textual shape: domain, address, human-readable
   statement, URI, version, mainnet chain ID, nonce, issued time, expiry and request ID.
4. The wallet signs message bytes only. The statement says the purpose, mint, no transaction and no
   public balance.
5. The Worker binds the returned key to the challenge, verifies Ed25519, checks unexpired one-time
   state and consumes the nonce before making an RPC request.
6. Up to two HTTPS RPC endpoints are tried for four seconds each. The request uses
   `getTokenAccountsByOwner`, the exact mint, `jsonParsed` and `finalized` commitment.
7. A badge is issued only when a returned token account repeats the expected owner and mint and its
   raw integer amount is greater than zero. Missing, malformed, zero, wrong-owner and wrong-mint
   records fail closed.

The RPC provider learns the queried public address and mint. The project does not retain or publish
that address, balance or signature after the check; the Durable Object retains only the dated badge
state. This is private from the public Board, not private from the wallet or RPC provider.

## Standards comparison

- [Phantom's Sign In With Solana specification](https://github.com/phantom/sign-in-with-solana)
  defines the message fields, domain binding, minimum eight-character nonce and server-side output
  verification. It prefers the wallet-standard `signIn` feature where available, with legacy
  `connect` + `signMessage` as fallback.
- [Solana `getTokenAccountsByOwner`](https://solana.com/docs/rpc/http/gettokenaccountsbyowner)
  supports mint filtering, `jsonParsed` output and commitment selection; the current request uses
  all three.

Migrating solely to wallet-standard `signIn` would improve some compatible-wallet prompts but is
not a safe universal replacement: current browser providers and mobile wallet handoffs still need
the legacy path. Adding an adapter framework only for optional feature detection would expand the
runtime supply chain without changing the server's proof. Reconsider only when observed wallet
failure data shows a meaningful compatibility problem.

## Hard boundaries

- A holder badge is not identity, continuous holding, provenance, wealth or endorsement.
- The same wallet may badge more than one X account; this is not Sybil resistance.
- Never request `signTransaction`, `signAndSendTransaction`, token approval or custody for this
  badge.
- Never award points, access, prizes or economic rights from the raw balance.
- If any scarce holder right is proposed later, design that authorization separately and re-audit
  replay, freshness, account uniqueness, transfers during the proof window and revocation.
