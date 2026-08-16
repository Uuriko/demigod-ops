---
status: review
canonical_for: nothing
generated_by: claude
generated_at: 2026-08-16
subject: dasha-faucet (live, deployed from .grok/worktrees/potter/dasha-2)
---

# Faucet review — one finding, fix it before funding

Reviewed because the faucet signs Solana transfers, was untracked until `562cf49`, is deployed to
production, and root cannot deploy at all until it absorbs this code. Nobody had read it.

**Current exposure is zero.** `/faucet/status` reports `funded:false` / `treasury_empty`, so every
claim exits at the funding check before reaching `sendTipTransfer`. Everything below is a
before-you-fund item, not an incident.

## What is well built

Worth saying plainly, because the rest of this document is a complaint:

- **Reserve-then-send ordering.** `reserveClaim` persists *before* `sendTipTransfer`, and
  `clearPendingClaim` rolls back on failure (worker lines 2891–2900). A crash mid-send leaves a
  stuck reservation, never a double payout. This is the ordering people get wrong.
- **Idempotent replay.** A repeat claim returns the prior signature and Solscan link rather than
  paying twice; in-flight reservations return `confirming` instead of racing.
- **Real SIWS on the verified path.** Server-signed challenge, `kind`, public-key match, expiry,
  message must contain the key and `Dasha tip`, then `verifyEd25519` (worker 2835–2845). Correct.
- **Layered limits.** Per-X and per-wallet dedup with a 30-day cooldown, daily cap 48, hourly cap
  12, auto-pause when hourly trips, a 7-day minimum X account age, plus a funding check.
- **No key material in source.** `faucetSignerSecret()` reads `FAUCET_KEYPAIR` /
  `FAUCET_TREASURY_SECRET` / `FAUCET_SIGNER_SECRET` from the environment.

## Finding: `paste: true` binds any wallet with no proof, and it is indistinguishable afterwards

`dasha-lobby-worker.mjs` 2824–2830, inside `POST /faucet/wallet/verify`:

```js
if (input.paste) {
  const dest = String(input.dest || '').trim();
  const err = destShapeError(dest, input.last4);
  if (err) return json({ ok: false, error: err }, 400, allowedOrigin, cred);
  this.faucetBinds[xId] = { dest, at: Date.now(), kind: 'IS_WALLET' };
  ...
```

`destShapeError` (`dasha-faucet.mjs:20`) validates **shape only**: a valid Solana address, not the
mint, no Telegram link, and optionally that `last4` matches — where `last4` is supplied by the same
caller, so it confirms nothing. No signature is required or checked.

The branch then writes `kind: 'IS_WALLET'` — **the identical value the cryptographically verified
path writes at line 2846**. After the fact, nothing distinguishes a proven wallet from a pasted one.

### What it allows

Not theft: the attacker cannot route funds anywhere they could not already route them by pasting
their own address, which is presumably the intended use.

**Denial of claim.** Solana addresses are public. An attacker links an X account, pastes a
*victim's* address, and claims. The claim records under `byWallet[victim]`, so the victim is locked
out for the 30-day cooldown and cannot claim with their own wallet. One X account per victim,
subject to the 7-day age gate and the 48/day global cap.

**Treasury spend to unproven destinations.** Each grief also spends the payout, so the ceiling is
48 × 100 = 4,800 $dasha per day going to addresses nobody proved they control.

**Audit ambiguity.** Because both paths write `IS_WALLET`, the claim ledger cannot answer "was this
destination ever proven?" — which is the question you want answered if a payout is ever disputed.

### Fix

Smallest change that removes the lockout, in preference order:

1. **Do not let unproven binds consume the per-wallet slot.** Dedup pasted claims by X id only;
   reserve `byWallet` for SIWS-verified destinations. Removes the griefing vector and keeps paste as
   a usable low-friction path.
2. **Label them apart** — `kind: 'PASTED'` vs `kind: 'IS_WALLET'`. One word, and it makes the ledger
   answerable. Worth doing even alongside (1).
3. Or require SIWS to claim, and keep paste for display only.

I have not applied any of these: it is a behavioural change to live money code owned by another
tree, and which trade-off is right (friction vs. griefing) is a product call, not a lint fix.

## Smaller notes

- `checkXEligibility` (`dasha-faucet.mjs:110`) **fails open** when `session.xCreatedAt` is missing,
  by design, for sessions minted before the field was stored. Anyone holding such a cookie skips the
  age gate indefinitely. The comment anticipates this and suggests `FAUCET_REQUIRE_X_AGE=1`; that
  switch does not exist yet. Consider adding it, or expiring pre-field sessions.
- `minXFollowers` only applies when `session.xFollowers` is a number — absent means pass.
- `checkRateLimits` reads `this.faucetMetrics` and `noteSuccessfulClaim` writes it. Both run inside
  one Durable Object, which serialises them, so there is no race — but that safety is a property of
  the DO, not of the code, and it will not survive being moved anywhere else.

## Bearing on the deploy question

Root cannot deploy until it declares migration `v2` and defines `DashaFaucet`, so absorbing this
code is a precondition for root ever shipping again. That absorption should carry fix (1) or (2)
with it rather than importing the finding into a second tree.
