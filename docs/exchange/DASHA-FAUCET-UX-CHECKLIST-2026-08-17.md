# Faucet UX / bug checklist · 2026-08-17

Run this before calling the faucet “clear.” Automated encoding: `node dasha-faucet-ux.test.mjs` plus `node dasha-faucet.test.mjs`. Browser walk is §I. Live residuals are §J — they are **not** disk fails.

Hard gates: no deploy, no fund, no SEO 308. Root client is the homepage-shaped SoR. dasha-2 keeps Claim tip / Buy $dasha.

---

## A. Surfaces (same product, same meaning)

| Surface | Must show |
|---|---|
| Homepage `#dasha-faucet` | Same widget as `/faucet` (same JS contract) |
| `/faucet` page | Lede: one tip, not a farm. Widget below |
| Door | Art + `free $dasha` + `Donate`. Never `Send` |
| Donate card | Heading **Donate** (same word as the button). Full treasury, not last-4 |
| Dest card | Note: Link X, then wallet. Wallet field visible even before X |
| Confirm | Last-4 of dest + `tip me` |
| Sending | `confirming` |
| Success | `tipped` + Solscan if sig |
| Already claimed | `already claimed` |
| Empty jar | `jar empty` + Donate enabled, `free $dasha` disabled |

## B. One name per action

| Action | Word | Forbidden |
|---|---|---|
| Claim a tip | `free $dasha` on the door, `tip me` to fire | `Send` |
| Top up the jar | `Donate` | Mixing Donate / Pitch in as two products |
| Buy on Jupiter | page header `Buy $dasha` | “earn”, “guaranteed”, “airdrop” |
| Link account | `Link X` | “verify human” |

## C. Errors must be distinguishable

These five must **not** share a string:

| Code | Voice |
|---|---|
| `dest_not_wallet` | not a wallet |
| `dest_mint` | that is the mint |
| `dest_treasury` | that is the tip jar |
| `last-4 does not match` | last 4 miss |
| `siws_domain` | wrong sign-in site |

Also: `link X` stays `link X`. `sig miss` stays `sig miss` (not “empty”). `treasury_empty` → `jar empty`. Never map a phishing domain miss to dest miss.

## D. Empty / funded honesty

- `status.funded !== true` → door headline `jar empty`, claim button disabled, hero not a claim click.
- Donate stays available (refill).
- Do not walk X + wallet + tip me only to learn the jar was empty.

## E. Dest safety (still true)

- Telegram / garbage → not a wallet
- Mint → that is the mint
- Treasury → that is the tip jar
- Last-4 mismatch → last 4 miss
- Paste default `PASTED`, never `IS_WALLET`
- dest-check `link X first` is shown, not swallowed

## F. A11y / design basics

- Hero `alt` is not empty
- Claim / Donate / dest / last-4 / sig have accessible names
- Buttons ≥ 48px (existing CSS)
- `role=status` live region for errors
- Reduced-motion rule present
- No unlabeled “COPY” of last-4 only — copy the **full** treasury

## G. Claims

- “Not a farm” on door / dest / page lede
- “Not a purchase” on Donate
- `+simp` only after `ok && (awarded \|\| funded)` — never promised on the donate card
- No guaranteed / earn free / airdrop farm voice in page or client

## H. Trees

| Tree | Door | Donate | Empty |
|---|---|---|---|
| Root (this checklist) | free $dasha + Donate | yes, fail-closed | jar empty |
| dasha-2 | Claim tip + Buy $dasha + pitch-in | fail-closed stub on Worker | Treasury empty + Buy |
| Live | Send + Donate until ship | live donate | funded:false |

Do not copy root onto dasha-2 (breaks Buy-path tests). Do not deploy either tree in this pass.

## I. Browser walk (loopback preview)

1. Load prepared client against live status (jar is empty today).
2. See **jar empty** + disabled **free $dasha** + enabled **Donate**.
3. Open Donate: heading Donate, **full** treasury visible, paste junk sig → **sig miss**.
4. Mock `funded:true`, remount: door note + enabled free $dasha.
5. Open dest unlinked: Link X **and** wallet field both visible.
6. Paste treasury → **that is the tip jar** (no dest-check needed).
7. Paste mint → **that is the mint**.
8. Paste telegram → **not a wallet**.
9. Desktop 1280 and mobile 390.

## J. Live residual (observe, do not “fix” by deploying)

- Door still **Send**
- dest-check still `{ok:true,kind:IS_WALLET}` on treasury
- Title still `$dasha / picture + send`
- `funded:false`

These stay until an authorized ship.

## Commands

```bash
node dasha-faucet-ux.test.mjs
node dasha-faucet.test.mjs
node dasha-simp-share-html.test.mjs
# dasha-2 (do not break Buy $dasha)
node .grok/worktrees/potter/dasha-2/dasha-faucet.test.mjs
```
