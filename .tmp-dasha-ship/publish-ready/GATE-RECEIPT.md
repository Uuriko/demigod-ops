# Pre-publish gate receipt

Observed 2026-08-08 (disk SoR `/home/potter`):

| Gate | Result |
|------|--------|
| `dasha-desk/build.mjs --check` | PASS |
| `dasha-desk/dasha-share.test.mjs` | PASS (trust-reset) |
| `dasha-growth.test.mjs` | PASS |
| `dasha-how-to-buy.test.mjs` | PASS [cdp] |
| `dasha-studio-embed-build.mjs --check` | PASS |
| `dasha-studio-embed.test.mjs` | PASS |
| `dasha-landing.test.mjs` | PASS |
| `dasha-desk.test.mjs` | PASS |
| `dasha-meme-studio.test.mjs` | PASS |

Live: `/`, `/dasha`, `/studio` = 200; `/how-to-buy` = 404.

Home/desk intentionally do **not** link `/how-to-buy` until that route is live.
`config/dasha.json` records `howToBuy` URL for publish prep only.

Demigod work deferred per user order.
