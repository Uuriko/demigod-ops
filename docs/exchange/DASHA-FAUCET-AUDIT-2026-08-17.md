# Dasha faucet audit · 2026-08-17

**Status:** verified against live + disk. Not a ship plan.
**Why this exists:** three different faucet clients and two Worker trees. Agents keep editing the wrong one.

## 0. One-sentence truth

Live faucet is a Worker-served tip jar (`x-dasha-edge: faucet`) whose **client is not on either current tree as-deployed**, whose **treasury is empty**, and whose **homepage `#faucet` and `/faucet` share the same JS**.

## 1. Where it lives

| Surface | What it is | Live 2026-08-17 |
|---|---|---|
| `https://www.getdasha.com/#faucet` | Home section `[07]`, `#dasha-faucet` mount | Same client as `/faucet` |
| `https://www.getdasha.com/faucet` | Dedicated page, Worker HTML | 200, `X-Dasha-Edge: faucet` |
| `https://lobby.getdasha.com/faucet` | Same Worker page | 200 |
| `https://lobby.getdasha.com/client/faucet.js` | The only runtime client | 23498 B, SRI matches page pin |
| `GET /faucet/status` | Public config | `configured:true`, **`funded:false`**, `error:treasury_empty`, 100 $dasha, 30-day cooldown, treasury `DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb` |
| `/airdrop` `/earn` `/claim` | Thin pages titled those words + link to `/faucet` | 200, **in sitemap** |
| Homepage faucet word count | Embed + CSS | 24 hits; widget is real |

`getdasha.com/faucet` 301s to `www`.

## 2. Three clients (this is the confusion)

| Copy | Door | Donate | Empty/buy | Matches live JS? |
|---|---|---|---|---|
| **LIVE** `lobby…/client/faucet.js` | heading **Free $dasha** + **Send** + **Donate** | `POST /faucet/donate` | uses `treasury_empty` | **this is production** |
| **ROOT** `/home/potter/dasha-faucet-client.js` | **free $dasha** + Donate (Grok 2026-08-17 edit of a live snapshot) | yes | dest-miss voice | No. Prepared, not deployed |
| **dasha-2** `.grok/worktrees/potter/dasha-2/dasha-faucet-client.js` | art + **Claim tip** + **Buy $dasha** + pitch-in | no | Buy on empty, Copy treasury | No |

Live JS sha384 `+1A1U/RjDFKFEUFF9llmQ7s94hjr//6I/Z3bSb65PGag4OrHz5cDj1AUb6voU3xg` — **byte-equal to the page integrity pin**.

## 3. Three Workers

| Tree | `handleFaucet` | `DashaFaucet` DO | `/faucet/donate` | Can `wrangler deploy`? |
|---|---|---|---|---|
| **LIVE** | yes (inferred) | v2 live | **yes** (`sig miss` on junk) | — |
| **ROOT** `dasha-lobby-worker.mjs` | **absent** | wrangler only v1 `DashaLobby` | no | **No** — CF 10074 |
| **dasha-2** | yes, no donate route | deploy jsonc has v1+v2 | **no** | Yes, and it would **overwrite live donate + Send/Donate UI** with Claim tip |

dasha-2 `dest-check` requires an X session. **Live `dest-check` does not.**

## 4. Live API (Origin required on POST)

| Call | Result |
|---|---|
| `GET /faucet/status` | configured, unfunded, 100 $dasha |
| `GET /faucet/me` | `{linked:false, claimed:false}` |
| `POST /faucet/dest-check` no Origin | `origin required` |
| `POST /faucet/dest-check` valid treasury addr, no cookie | **`{ok:true,kind:"IS_WALLET"}`** |
| same, mint | `dest_mint` |
| same, telegram / garbage | `dest_not_wallet` |
| `POST /faucet/claim` + Origin | `link X first` |
| `POST /faucet/donate` + Origin, junk sig | `sig miss` |

Claim still needs X. Dest-check labeling any valid address `IS_WALLET` without a signature is the PASTED/`IS_WALLET` mix dasha-2 already documented as a slot-theft bug. Live dest-check is the weaker of the two.

Live client: dest-check error `link X first` is **ignored** and the flow calls `afterWallet()` anyway. Claim is the backstop.

## 5. Money

- Tip size: **100 $dasha** (`amountRaw` 1e8, 6 decimals).
- Cooldown: 30 days.
- Caps in root/dasha-2 helpers: 48/day, 12/hour, min X age 7d (env-overridable). Live status does not echo caps.
- **Treasury empty.** `configured:true` means session secret + treasury address + mint look set; a signer is implied. **Nothing can pay out until the jar is funded** (money decision; not done here).
- Donate is “paste a tx signature, maybe get +simp” — Worker-side verify source is **not in dasha-2 or root**. Claude staged score math on 2026-08-16; “Worker route / client / tx page are not written” on those trees. Live has the route anyway.

## 6. Claims / SEO

- Faucet page lede (root): “Not an airdrop farm.”
- Live title still **`$dasha / picture + send`**.
- **`/airdrop` `/earn` `/claim` are indexed** (sitemap). dasha-2 `RETIRED_SEO_PATHS` would 308 them home; **live does not**. Those titles are farm-shaped.
- C11: buying/holding scores zero. Live donate success paints `+simp` — only honest if the Worker actually verified a public tip-to-treasury tx.

## 7. Tests

| Tree | Tests |
|---|---|
| ROOT | No `dasha-faucet.test.mjs`. `dasha-simp-share-html.test.mjs` now pins `free $dasha` title + client string. |
| dasha-2 | `dasha-faucet.test.mjs` + dry + parity + bundle-smoke. Asserts **Buy $dasha**, pitch-in, Copy treasury — **fails if you drop the live Send/Donate client onto that tree** (reproduced 2026-08-17). |

## 8. Security (short)

- POST Origin gate: good.
- SRI on faucet.js + still PNG: good, pin matches.
- Page CSP is header-only (`frame-ancestors`, `base-uri`, `object-src`) — not a full script CSP; SRI is the script pin.
- Root cannot deploy; dasha-2 deploy is a **product overwrite**, not a no-op.
- Do not add `deleted_classes` to “fix” 10074.

## 9. What a correct next edit is

1. Treat **live JS + live `/faucet/*`** as SoR until one tree absorbs donate + dest-check + DO v2.
2. Do not deploy dasha-2 to “ship free $dasha” — it ships Claim tip and drops donate.
3. Do not deploy root — 10074.
4. Copy change (`Send` → `free $dasha`) is on **root only**, previewed at loopback `:8768`, not live.
5. Funding the treasury is a separate money authorization.

## 10. Probes

```bash
curl -sS https://lobby.getdasha.com/faucet/status
curl -sS https://www.getdasha.com/faucet | grep -o 'x-dasha-edge\|integrity="sha384-[^"]*"'
```
