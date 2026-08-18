# Faucet hunt — 2026-08-18

Research then tests. Prepared ≠ published. Do not fund. Do not deploy.

## How faucets work (live web)

| Pattern | Who | Protection |
|---|---|---|
| CAPTCHA / Turnstile / hCaptcha | Gavin 2010 BTC faucet → 2026 no-captcha farms | Human vs bot. Tokens single-use, short TTL. |
| Identity gate | Solana faucet.solana.com GitHub; Dasha **Link X** | Sybil cost. New/empty GitHub accounts rejected. |
| Per-address + cooldown | QuickNode 1/12h; Alchemy daily/address | Stops one wallet draining the jar. |
| Per-IP / hourly + daily cap | Almost every paid faucet | Stops burst scripts. |
| Wallet proof (SIWS / sign message) | Serious mainnet faucets | Stops “paste a stranger’s address to lock them out” *and* “I control this dest.” |
| Dest allowlist / shape | Never tip mint, treasury, PDAs, t.me | Stops self-deposits and phishing paste. |
| Fail-closed donate | Dasha | Junk sig is `sig miss`, never “empty” / award. |

ethereum.org Web3 heuristics used as the UX bar: feedback follows action, security and trust, most important info obvious, short actions, network visible.

Address-poisoning research (arXiv 2501.16681, MetaMask, Chainalysis, Ledger): **first+last-4 is not identity.** A lookalike treasury/mint with the same last 4 is the classic steal. Last-4 retype is a typo check only.

Drainer research (2025 Solana): “claim / verify wallet” pages that request seed, unlimited approval, or a spend tx. Dasha SIWS statement must stay **not a transaction / does not spend / does not approve**.

## Dasha product (disk)

One mainnet tip of 100 $dasha. X-linked person. Optional SIWS. Paste is unproven. Treasury `DwpC…sYgb`. Mint `53ux…pump`. Caps: 12/hour, 48/day, 7-day X age (fail-open if `xCreatedAt` missing). 30-day cooldown.

## Hunt matrix → test

Driver: `node dasha-faucet-hunt.test.mjs` (this file). Each row is a real shipped function.

| # | Class | Shipped entry | Must hold |
|---|---|---|---|
| H1 | Dest shape | `destShapeError` + `DashaFaucet.destShapeError` | mint, treasury, t.me, 0x, seed words, empty, off-length, non-32-byte base58 all refuse. Client = server on the corpus. |
| H2 | Last-4 ≠ proof | `destShapeError(addr, four)` | last-4 miss fails; last-4 match is **not** ownership. Lookalike last-4 of treasury is still not treasury (exact match only) — named poisoning hole. |
| H3 | Voices | `humanError` (server + client) | dest_mint / dest_treasury / dest_not_wallet / last-4 / siws_domain do not collapse. |
| H4 | Empty jar | `buildStatus` | no signer or bal < tip → `funded:false`. RPC fail + signer → empty, not a claim CTA. |
| H5 | Sybil / age | `checkXEligibility` | no xId → link X; new X → x_too_new; missing createdAt → **x_reauth** (fail closed). |
| H6 | Burst | `checkRateLimits` / `noteSuccessfulClaim` | hourly then daily trip; pause until `autoPausedUntil`. |
| H7 | One tip / grief | `claimAllowed` `recordClaim` | unproven → **prove wallet** (no tip). Proven wallet slot locks. Unproven does **not** occupy byWallet (grief). |
| H8 | Rollback | `clearPendingClaim` | stranger cannot delete owner’s in-flight byWallet. |
| H9 | SIWS | `siwsMessageError` / `faucetSiwsInput` | wrong domain → siws_domain; no spend/approve language; nonce bind. |
| H10 | Donate | `donateFailClosed` `inspectDonateTx` | junk/dust/old/self-tip/err → sig miss. Never award from client amount. |
| H11 | Replay UI | client claim handler | `replay` or `already claimed` + sig must not paint **tipped**. |
| H12 | Live vs disk | GET `/faucet/status` POST dest-check | live treasury dest-check still `IS_WALLET` (ship lag). Disk refuses. Observation, not a disk fail. |
| H13 | Stale pending | `claimAllowed` | reserve older than `FAUCET_PENDING_MS` (2m) is a crashed send, not a lock. |
| H14 | Amount obvious | client door + confirm | speaks `amountUi` $dasha (ethereum.org: most important info obvious). |
| H15 | Cooldown visible | already-claimed card | `nextAt` date shown. |
| H16 | ATA rent | `buildSignedTipTx` | create-ATA refused below 0.0025 SOL (`treasury_rent`). |
| H17 | dest-check kind | dasha-2 dest-check | never writes `IS_WALLET` (shape probe only). |

## Out of this hunt

Funding the treasury. Worker deploy. Webflow publish. Adding Turnstile/CAPTCHA (product already uses X). Discord/Telegram.
