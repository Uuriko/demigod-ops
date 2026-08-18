# Dasha faucet spec · 2026-08-18

Prepared disk is the spec. Live is a different, older client. Prepared ≠ published. Do not fund the treasury. Do not deploy unless the current request says publish.

## What it is

One mainnet tip of **100 $dasha** (`53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`) from treasury `DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb` to one X-linked person. Not an airdrop farm, not a wallet drain, not a score for buying (C2, C9, C11, C13).

Surfaces: `/faucet` and any `#dasha-faucet` mount. Same JS contract.

## Flow

| Card | Honest first paint | Primary | Secondary |
|---|---|---|---|
| Door, jar empty | **jar empty**. Claim disabled. Hero not a claim click. | Donate | — |
| Door, funded | One tip. Link X, then wallet. Not a farm. | **free $dasha** | Donate |
| Dest | Wallet field **visible even before X**. | Link X / Prove wallet | Paste address |
| Confirm | Last-4 of dest + typo note (not proof). | **tip me** | Back |
| Sending | **confirming** | — | Back |
| Success | **tipped** + Solscan if sig | — | — |
| Already | **already claimed** + Solscan if sig | — | — |
| Donate | Heading **Donate**. Full treasury. Not a purchase. | **Check** | Copy address, Paste |

## Names (one word per action)

- Claim door: `free $dasha`. Fire: `tip me`. Never `Send`.
- Top-up: `Donate`. Never a second product named Pitch in / Fill it.
- Link: `Link X`. Never “verify human.”
- Empty: `jar empty`. Never walk X + wallet to learn the jar was empty.

## Dest / bind

- dest-check is a **shape probe**. Success `{ok:true, dest}` — **no `kind`**.
- Paste default `PASTED`. Only SIWS verify may return `IS_WALLET`.
- Refuse: telegram / garbage → not a wallet; mint → that is the mint; treasury → that is the tip jar; last-4 miss → last 4 miss; SIWS domain miss → wrong sign-in site. Those five strings must not collapse.
- Last-4 is a typo check, not control. Proof of control is SIWS only.

## Donate

- Fail-closed: junk sig → `sig miss`, never `empty`.
- `+simp` only after `ok && (awarded || funded)`.
- COPY writes the **full** treasury and only says Copied if read-back matches.

## Layout (this pass)

Research: WCAG 2.5.8, Material 48px, Apple 44pt / 60pt centers, Nielsen touch-target, Helios/Apple “style not size,” stack on narrow.

- One column. Actions **stack**. Gap **16px**. Card gap **18px**.
- Targets **≥ 52px** (claim **56px**). Full width of the 400px card.
- Primary = acid. Secondary = paper. Do not put two acid chips beside an input.
- Labels above fields, 8px. Treasury on its own block, then Copy.
- Page lede and footer wrap with ≥ 16px between links.

## Live vs disk (user-tested 2026-08-18)

| | Live `/faucet` | Disk |
|---|---|---|
| Title | `$dasha / picture + send` | `$dasha / free $dasha` |
| Door | **Send** + **Donate** in a tight row | **jar empty** + stacked free $dasha / Donate |
| Empty honesty | Send enabled, `funded:false` | Claim disabled |
| Dest | Wallet hidden until X. “Get it” | Field + Paste + Prove wallet always |
| Donate | “Fill it”, last-4 `DwpC…sYgb`, COPY+PASTE in rows | Donate, full CA, stacked Copy / Paste / Check |
| Junk sig | **empty** | **sig miss** |
| dest-check treasury | `{ok:true,kind:IS_WALLET}` | client refuses dest_treasury first |
| Hero alt | empty | Dasha tip faucet |

Live residuals stay until an authorized ship.

## How to test like this

1. **Heuristic pass** (Nielsen + ethereum.org 7 Web3 heuristics) against this spec.
2. **Computer-use walk** of live: door → dest → donate → junk sig, desktop 1280 and mobile 390. Screenshot each card.
3. **Same walk on disk preview** (local client, live `/faucet/status` so empty-jar is real).
4. **Compare** names, enabled/disabled, spacing, full vs truncated treasury.
5. **Unit encode** the checklist: `node dasha-faucet-ux.test.mjs` + `node dasha-faucet.test.mjs`.
6. Do **not** treat a green dest-check as “they control that wallet.”

Visual pixel-diff (Playwright/Backstop) is optional later. The product fail is semantic (Send vs jar empty), not a 2px shift.
