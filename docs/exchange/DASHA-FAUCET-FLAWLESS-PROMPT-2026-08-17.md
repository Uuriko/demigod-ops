# Faucet flawless-fix prompt · 2026-08-17

**You are executing this prompt now. Do not summarize it and stop. Do not deploy or fund.**

This is a Dasha product task. Hard gates from `AGENTS.md` / `DASHA-RULES.md` still apply:

- Ponytail: smallest change that actually closes the holes.
- No publish, no Worker deploy, no treasury funding, no money movement.
- Prepared ≠ published. Live stays empty and Send-labelled until a later authorized ship.
- One writer per file. SoR for ship-bound sources is `/home/potter`. dasha-2 is the only tree that *can* deploy the faucet Durable Object later; do not leave it weaker than root helpers.
- Do not add `deleted_classes` or rewrite DO migrations.
- Eat the Sounds stays untouched. Demigod stays out.

---

## 0. Why this prompt exists

A 2026-08-17 audit (`docs/exchange/DASHA-FAUCET-AUDIT-2026-08-17.md`) proved three different faucet clients and two Worker trees. Live getdasha.com (`#faucet` and `/faucet`) runs a Worker client that is **not identical to root or dasha-2**. Live dest-check returns `{ok:true, kind:"IS_WALLET"}` for any valid address **including the treasury**, with **no X session**. dasha-2 already isolated unproven pastes in the ledger (`PASTED` vs `IS_WALLET`) after `DASHA-FAUCET-REVIEW-2026-08-16.md`. Live dest-check undoes that label. The homepage embed and `/faucet` share `lobby.getdasha.com/client/faucet.js` (SRI pin matches live bytes).

The product is one mainnet tip of associated $dasha (`53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`) to a real human. It is not an airdrop farm, not a wallet-drain page, not “free money,” not a score for buying. Claims: `DASHA-CLAIMS.md` C2, C9, C11. Treasury is empty (`funded:false`). That emptiness is the only reason a dest-check lie cannot currently pay an attacker. The code must be correct **before** anyone funds the jar.

---

## 1. Crypto research that binds the design

Read these as constraints, not as a blog.

### 1.1 What a Solana tip faucet actually is

A faucet is a **hot signer** plus a **public destination**. Anyone can learn any address. Anyone can paste a stranger’s address. Anyone can paste the treasury. Anyone can paste the mint. Anyone can paste a token account or a PDA that cannot hold the owner-side ATA the transfer builder expects. Official Solana devnet faucets rate-limit (2 / 8h) and still get farmed; they are for **devnet SOL**, not a listed meme mint. Dasha’s faucet pays **mainnet $dasha** from a project treasury. The threat is not “someone gets 100 tokens.” The threat is:

1. **Treasury drain** via Sybil X accounts once funded.
2. **Wallet-slot lockout**: attacker pastes victim’s address, claims, occupies `byWallet[victim]` for 30 days, victim cannot claim, payout went to an address the attacker does not control (grief) or does (if they also control it).
3. **Label lie**: UI or API says `IS_WALLET` when nobody signed. Downstream `claimAllowed(..., proven:true)` then treats a paste as a proven bind.
4. **Phishing / SIWS domain mismatch**: user signs `evil.example` thinking it is getdasha. Wallets warn; the Worker must still reject the wrong domain.
5. **Airdrop-phishing adjacency**: pages titled Airdrop / Earn / Claim train users to click “free token” flows. Drainers use that habit. Dasha’s copy must stay “one tip / not a farm,” and dest must never look like a connect-and-approve drain.
6. **Donate-for-points**: if `POST /faucet/donate` awards Simp points on an unverified signature string, that is a free score farm (C11). Live returns `sig miss` on junk. dasha-2 has no donate route. Do **not** invent on-chain donate verify in this pass. If you add a donate stub so a future dasha-2 deploy does not 404, it must be **fail-closed**: validate shape, never award.

### 1.2 SIWS (Sign-In with Solana)

Phantom / MetaMask SIWS: domain binding is the phishing control. The signed message must contain the expected domain (`lobby.getdasha.com` today), the public key, a server nonce, issued-at, expiry. Verify:

- challenge HMAC (or equivalent) issued by us, unexpired, bound to that publicKey
- ed25519 over the exact message
- message contains publicKey and the Dasha tip statement
- domain is ours

A paste is **not** SIWS. `paste:true` on `/faucet/wallet/verify` writes `kind: 'PASTED'` only.

### 1.3 Public keys are not secrets

Solana addresses are public. Last-4 retype is a **typo check**, not proof of control. Proof of control is **only** SIWS. Therefore:

- `dest-check` is a **shape probe**. It must not persist binds. It must not return `kind: 'IS_WALLET'`.
- Only `/faucet/wallet/verify` without `paste` may return `IS_WALLET`.
- `claimAllowed` / `recordClaim` / `reserveClaim` take `proven === (bind.kind === 'IS_WALLET')`. Unproven claims dedup by X id only.

### 1.4 Addresses that must never be a tip destination

| Dest | Why | Code |
|---|---|---|
| Telegram / `t.me` | Common paste miss | `dest_not_wallet` |
| Not base58 32–44 | Garbage | `dest_not_wallet` |
| Associated mint | Would try to tip the mint | `dest_mint` |
| Faucet treasury | Self-send / confuse donate with claim | `dest_treasury` |
| Last-4 mismatch | Typo | `last-4 does not match` |

PDA / token-account rejection (`dest_pda`, `dest_token`) already exists in the error map; keep those codes if a later check can prove them. Do not pretend a shape check knows ATA vs owner unless the helper already does.

### 1.5 What “flawless” does **not** mean in this pass

- Not funding the treasury.
- Not deploying the Worker (root 10074; dasha-2 deploy overwrites live donate + Send/Donate UI).
- Not merging the entire lobby Worker into root.
- Not building full on-chain donate verification.
- Not 308ing `/airdrop` `/earn` `/claim` on live (that is a publish).
- Not inventing Sybil-proof “one human.” X OAuth is C13: account control, not unique human.

Flawless **here** means: every dest/claim/bind path on disk matches the proven/unproven ledger, dest-check cannot lie, clients cannot default a paste to `IS_WALLET`, treasury cannot be a claim dest, tests fail if any of that regresses.

---

## 2. Trees and files you will touch

**Root `/home/potter` (SoR):**

- `dasha-faucet.mjs` — `destShapeError`, `humanError`
- `dasha-faucet-client.js` — door, dest-check, paste kind default
- `dasha-faucet.test.mjs` — **create** if missing: dest/treasury/kind contract
- `dasha-simp-share-html.test.mjs` — already pins `free $dasha` (keep)

**dasha-2** `.grok/worktrees/potter/dasha-2` (deployable later):

- `dasha-faucet.mjs` — same helper contract as root
- `dasha-faucet-client.js` — paste default `PASTED`; dest-check fail-closed; optional door label `free $dasha` **without** deleting Buy-on-empty (tests require `Buy $dasha`)
- `dasha-lobby-worker.mjs` — dest-check never returns `IS_WALLET`; reject treasury; optional fail-closed donate stub
- `dasha-faucet.test.mjs` — add dest_treasury + dest-check kind contract

Do **not** overwrite dasha-2’s Claim-tip empty-state tests. Do **not** copy the entire live 23k client onto dasha-2.

---

## 3. Implementation contract (exact)

### 3.1 `destShapeError(dest, four, opts?)`

After mint check, if `dest === treasury` (default `FAUCET_TREASURY_DEFAULT`, overridable via opts/env-less default), return `'dest_treasury'`.

Keep telegram, invalid, mint, last-4 behavior.

`humanError('dest_treasury')` must be a stable string (helper may echo the code; client maps to `dest miss` if that is the live miss voice).

### 3.2 dest-check (Worker)

```
POST /faucet/dest-check
1. Origin required (already).
2. destShapeError(dest, last4) → { ok:false, error }  (include dest_treasury).
3. session.xId required → { ok:false, error: 'link X first' }.
4. Success → { ok:true, dest }  // NO kind field
5. Must not write faucetBinds.
```

### 3.3 wallet/verify

- `paste:true` → bind `{ kind: 'PASTED' }` after destShapeError (treasury rejected).
- SIWS path → bind `{ kind: 'IS_WALLET' }` only after signature verifies.
- Never write `IS_WALLET` on paste.

### 3.4 claim

- Require X + bind.dest.
- `proven = bind.kind === 'IS_WALLET'`.
- destShapeError(bind.dest) again (treasury cannot slip through an old bind).
- Existing rate limits, X age, reserve/record/clear remain.

### 3.5 Clients

- Door on **root** (homepage-shaped): button text `free $dasha`, not `Send`.
- Paste verify: `takeDest(dest, kind || 'PASTED')` — **never** `|| 'IS_WALLET'`.
- dest-check: if `error === 'link X first'`, **show that error** (do not swallow and continue). afterWallet may still run only when dest-check `ok === true`.
- Client-side `destShapeError` must reject the same treasury and mint as the helper.

### 3.6 Donate (only if you touch the Worker)

If you add `/faucet/donate` so a future dasha-2 deploy does not 404:

- Origin required.
- Missing/short/non-base58 sig → `{ error: 'sig miss' }` (live-compatible).
- Do **not** set `ok:true` / `awarded` / `funded`.
- Do **not** write simp scores.

Prefer **not** adding it if you are not also adding tests. Live already has the route; this pass is dest/claim integrity.

---

## 4. Tests you must add and run

**Helpers (root + dasha-2):**

1. telegram → `dest_not_wallet`
2. mint → `dest_mint`
3. treasury → `dest_treasury`
4. last-4 mismatch → `last-4 does not match`
5. last-4 match on a normal owner address → `''`
6. `claimAllowed` unproven does not occupy `byWallet` (already on dasha-2 — keep)
7. `recordClaim(..., proven:false)` does not lock owner (already — keep)

**Client source (string contract, no jsdom required):**

8. root client contains `'free $dasha'`
9. root client does **not** contain `faucet-send', 'Send'`
10. both clients: paste path uses `'PASTED'` default, not `'IS_WALLET'`
11. dest-check handler does not treat `link X first` as success

**dasha-2 Worker source:**

12. dest-check success JSON in source does not include `kind: 'IS_WALLET'`
13. dest-check still requires `link X first`

**Commands:**

```bash
node dasha-faucet.test.mjs          # create on root; run on both trees
node dasha-simp-share-html.test.mjs
# dasha-2:
node dasha-faucet.test.mjs
node dasha-faucet-bundle-smoke.mjs  # only if you did not break their client contract
```

If dasha-2 bundle-smoke or buy-path asserts fail, you edited the wrong client.

---

## 5. Verification you must perform

1. Re-read `destShapeError` in **both** `dasha-faucet.mjs` files and **both** clients. All four must reject treasury and mint.
2. Grep all faucet JS/MJS for `kind || 'IS_WALLET'` on paste/dest-check. Zero hits on paste.
3. Grep dest-check handler for `IS_WALLET`. Zero hits.
4. `curl -sS https://lobby.getdasha.com/faucet/status` — still `funded:false`. Do not treat that as a code fail.
5. Do not start Orca. Do not wrangler deploy. Do not write `die-tunnel-ready`. Do not fund.

---

## 6. Report format when done

A short report in the conversation:

- What you changed (files).
- Test commands and PASS/FAIL.
- What is still live (Send, empty treasury, dest-check lie) because you did not deploy.
- Residual: donate verify, SEO aliases, Worker merge, funding.

---

## 7. Execute now

Implement §3, test §4, verify §5, report §6. Keep working until the tests are green. Do not stop after writing this file.

---

## 8. Extra holes found while combing (also in this pass)

These were not in the original §3 list. Close them anyway; they are dest/claim integrity.

### 8.1 Root `clearPendingClaim` was weaker than dasha-2

Root deleted `byWallet[wallet]` on any pending row, even when the caller was a different X id or an unproven paste. After unproven isolation, two reservations can exist for one address. A stranger's failed send must not delete the owner's in-flight slot. Promote dasha-2's ownership + `proven` guards to root SoR.

### 8.2 SIWS message was only a substring check

`wallet/verify` required the signed text to contain the public key and `"Dasha tip"`. It did not require our domain or the issued nonce. HMAC still binds the challenge we issued, but the signed bytes could be a different SIWS-shaped message. Add `siwsMessageError` (domain + nonce + statement). Reject mint/treasury as a SIWS dest via `destShapeError`. Domain constant: `lobby.getdasha.com`.

### 8.3 dest-check origin on the DO

Product edge already returns `origin required` for POST `/faucet/*`. Mirror that at the top of `handleFaucet` so a direct DO fetch cannot skip it.

### 8.4 Transfer last gate + fail-closed donate

`buildSignedTipTx` used to accept any 32-byte address. It must run `destShapeError` (mint/treasury) before signing, and refuse `dest === payer` as `dest_treasury`.

dasha-2 had no `/faucet/donate`. A later deploy would 404 live Donate. Add `donateFailClosed`: always `{ error: 'sig miss' }`, never `ok`/`awarded`/`funded`. Live already returns `sig miss` for junk and unverified sigs. Do not invent on-chain verify here.
