---
status: reference
owner: identity-security
updated: 2026-08-09
canonical_for: identity-security-review-2026-08-09
---

# Dasha identity security review — 2026-08-09

Current-source review of optional X linking and the zero-point signed-wallet holder badge. This is a
bounded application-security review, not a claim that X, wallets, browsers or external RPC providers
are secure.

## Result

The existing flows already satisfy the important protocol properties. One concrete hardening change
was justified and implemented: the 30-day X session cookie now uses the browser-enforced
`__Host-dasha_x` name, and successful linking/logout clear the legacy `dasha_x` cookie.

No OAuth database, refresh-token store, wallet adapter dependency or new identity system was added.

## X OAuth evidence

The Worker uses OAuth 2.0 authorization code with PKCE:

- 32-byte random verifier and SHA-256 challenge;
- 16-byte random state;
- state and verifier inside a signed, 15-minute, HttpOnly/Secure/SameSite=Lax `__Host-` cookie;
- exact callback state comparison before code exchange;
- confidential-client token exchange with the configured callback;
- only `tweet.read users.read`; no write, like, follow, DM, email or offline-access scope;
- `/2/users/me` requests only handle, name, small avatar and verification type;
- access token is used for that single read and is not stored;
- resulting session is HMAC-signed, expires after 30 days and is HttpOnly/Secure/SameSite=Lax;
- popup completion posts only the handle to the two allowed getdasha.com origins;
- linking does not enroll a person on the Board and is not required for anonymous Lobby chat.

X documents PKCE as protection for authorization-code attacks and lists `tweet.read`/`users.read` as
the applicable read scopes. `offline.access` is the scope that keeps access after the normal token
lifetime; Dasha deliberately does not request it.

Sources: [X OAuth 2.0 PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code),
[X users/me](https://docs.x.com/x-api/users/get-my-user),
[X authentication mapping](https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping).

### Residual X risks

- A stolen valid session cookie remains usable until its 30-day expiry; the stateless design has no
  per-session revocation list. Logout removes the browser cookie but cannot revoke a stolen copy.
- Profile name, avatar and verification type are snapshots taken at link time; they can become stale.
- Rotating `LOBBY_SESSION_SECRET` invalidates every session at once.

Per-session server revocation is not justified by current scale. Add it only if account-specific
forced logout, compromised-cookie evidence or a shorter operational TTL becomes necessary.

## Wallet proof evidence

The badge uses a legacy `connect` + `signMessage` interaction, but the message itself follows the
Sign In With Solana structure:

- `www.getdasha.com` domain and exact HTTPS URI;
- connected public key inside the signed message and signed challenge;
- human-readable statement naming the private holder badge and exact mint;
- `Version: 1`, `Chain ID: mainnet`;
- cryptographically random 32-character hexadecimal nonce;
- ISO issued-at and five-minute expiration;
- `Request ID: simp-holder`;
- signed challenge binds the X account ID, public key, nonce, entire message and expiration;
- Durable Object stores one pending nonce per linked X identity;
- verification requires the same signed X session and same public key;
- Ed25519 signature is checked over the exact server-created message;
- pending nonce is deleted before the RPC balance read, preventing replay even after a later RPC
  failure;
- only a positive raw balance is retained as a dated zero-point badge; address and balance are not
  stored or published;
- leaving the Board deletes the holder challenge and badge-bearing profile.

SIWS standardizes domain, address, statement, URI, version, chain ID, nonce, issuance, expiration and
request ID, and recommends server-side verification. Dasha already carries those fields. A native
wallet `signIn` call could reduce clicks for supporting wallets, but implementing adapter discovery
and a second return schema would add compatibility surface without improving the current server
security property. Keep the existing flow until mobile wallet evidence shows a real failure.

Sources: [Sign In With Solana specification](https://github.com/phantom/sign-in-with-solana),
[Solana Mobile SIWS](https://docs.solanamobile.com/android-native/using_mobile_wallet_adapter).

### Residual wallet risks

- Injected wallet discovery covers Phantom/Solflare-style browser globals, not every Wallet Standard
  or mobile-wallet environment.
- The public RPC receives the address during the one-time balance check.
- A positive observation does not establish continuous holding, a person, beneficial ownership or
  Sybil resistance; the badge expires after 28 days and scores zero.

## Implemented cookie hardening

`__Host-` cookies must be Secure, have `Path=/` and omit Domain. Supporting browsers then reject a
cookie with that name if a subdomain tries to broaden or override its scope. Dasha's session helper
already met the attribute requirements, so renaming the cookie was the smallest complete fix.

Migration behavior:

- old `dasha_x` sessions are intentionally not accepted;
- linking writes only `__Host-dasha_x` and clears `dasha_x`;
- logout clears both names;
- OAuth state continues to use `__Host-dasha_x_oauth`.

## Next checks, evidence-gated

1. Measure holder-proof failures by coarse error class without wallet addresses or signatures.
2. Add native SIWS only if supported-wallet users repeatedly fail the legacy signing flow.
3. Shorten the X session or add revocation only if retained-session risk outweighs repeated OAuth
   friction; do not build a session database speculatively.
4. Re-fetch X display fields only after a user-initiated relink; do not request offline access merely
   to keep avatars fresh.
5. Keep wallet proof optional, private, zero-point and transaction-free.
