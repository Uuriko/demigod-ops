# Edge deploy runbook — dasha-lobby + demigod-html

Last measured: 2026-08-27. Account `5a919d6c1785d47e15e10c24450a8ff7`.
Do not run `wrangler deploy` until a live checkpoint exists.

## Map

| Domain | Worker | Wrangler | Live header today | Git branch |
|---|---|---|---|---|
| `www.trydemigod.com/*` | `demigod-html` | `demigod-html-wrangler.jsonc` | `x-demigod-edge: home-motley` (root), `leftover-redirect` (product pages), `sitemap` | `worker-tree/dasha-lobby` |
| `www.getdasha.com/*` and `lobby.getdasha.com/*` | `dasha-lobby` | `dasha-lobby-wrangler.jsonc` | `x-dasha-edge: faucet/chess/lobby-page/compute` plus Webflow-cached `/` | `worker-tree/dasha-lobby` |

Live is **ahead of git** on both Workers. Merging PRs does not change production. Deploying git over live without a checkpoint would replace motley HTML, leftover-redirect lists, and the live lobby-page.

## Why versions, not `wrangler deploy`

Cloudflare splits **version** (uploaded code) from **deployment** (which version serves traffic). `wrangler deploy` creates a version **and** sends 100% of traffic there. That is how we would clobber live.

Current docs (2026-07/08):

1. **Checkpoint live without changing traffic.** Dashboard → Worker → Edit code → down-arrow next to Deploy → **Save**. Or `GET /accounts/{id}/workers/scripts/{name}` with a token. Record the version ID.
2. **Upload git without serving it.** `npx wrangler versions upload --name dasha-lobby --message "…"`. First-ever upload of a brand-new Worker cannot use this; both of these Workers already exist.
3. **Smoke a version without a full cutover.** `Cloudflare-Workers-Version-Overrides: dasha-lobby="<version-id>"` only works if that version is already in the *current* deployment (including a 0% slot). Preview URLs exist on workers.dev; `dasha-lobby` has `workers_dev: true`, `demigod-html` does not.
4. **Gradual cutover.** `npx wrangler versions deploy` and split traffic. Watch error rate, then 100%.
5. **Rollback.** `npx wrangler rollback` (previous 100% deployment) or `npx wrangler versions deploy <old-version-id>@100`. Pin the previous version ID in `fleet log` before any cutover.

Do not enable Cloudflare HTML/JS minify on either zone. SRI hashes the exact bytes; minify is a known SRI-breaker.

## Integrity-Policy-Report-Only (source only until the next deploy)

Git now sets `Integrity-Policy-Report-Only: blocked-destinations=(script)` on Worker HTML, plus `Reporting-Endpoints` to same-origin `/integrity-reports`. Chrome 138+ / Edge 138+ will POST `integrity-violation` reports when a classic script has no `integrity` attribute or is requested no-cors. Firefox 145+ logs those to the console. Safari ignores the header.

This is report-only. Do **not** ship the enforcing `Integrity-Policy` header: live Webflow pages still load CDN scripts without SRI, and enforcement would block them. `/integrity-reports` is POST-only, 32 KiB max, same-origin, and logs a count — it does not persist report bodies. Rollback: drop the two headers and the `/integrity-reports` route.

## Privacy page (source now matches live, plus cookies)

Live `/privacy` is Worker-owned (`x-dasha-edge: privacy`). Git had 308'd it home. Source now serves the 25 August 2026 live text plus a Cookies section dated 28 August 2026 (`__Host-dasha_x`, `__Host-dasha_x_oauth`, Cloudflare `_cfuvid`). `/legal` and `/privacy-policy` 308 to `/privacy`. After deploy, ping claude to re-record `privacy/published-policy.txt` — the watchdog will go red until that happens. Rollback: restore the leftover-privacy 308 to `/`.

## Token

`CLOUDFLARE_API_TOKEN` with Workers Scripts Edit. Never commit it. `npx wrangler auth token` prints whichever credential is already configured (token or OAuth). Creating a new token is credentials work — ask the human.

Until a token exists on this laptop, the only checkpoint path is the dashboard **Save** action, which currently needs Chrome Apple Events JS (View → Developer → Allow JavaScript from Apple Events, then restart Chrome). Chrome 136+ also ignores `--remote-debugging-port` on the default profile.

## Acceptance before any production traffic

`dasha-lobby`:

- `/faucet` `<h1>Fill the jar</h1>` and `x-connect.js` integrity `sha384-P+GWjU8raxzhHMCZ1bUqltsuNcVs17yd3qy7fpQGPl2hKiE1yHGK3s/jQQJoRjD6` (8749 live bytes, re-measured 2026-08-27)
- `/lobby`, `/chess` same `x-connect` pin (today they still pin `sha384-TfilU2+…`)
- `/` Compute door visible; chrome-hide no longer `display:none`s `a[href=/compute]`
- `/dasha-compute-open-alpha.tar.gz` 145953 bytes, sha256 `a164b963…`, plus `.sha256` and `/compute/release.json`

`demigod-html`:

- Root **Start a brief** is `/?wiz=startup` with no company/name/role
- `/compare` `/faq` `/hire` `/how` `/network` `/pilot` `/pricing` `/talent` 200 from origin (not leftover-redirect)
- `/sitemap.xml` lists those nine product locs plus the live 11

Rollback is the pinned previous version ID, not a git revert.
