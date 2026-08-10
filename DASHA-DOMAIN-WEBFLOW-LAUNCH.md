# Dasha — domain + Webflow site launch

**Started:** 2026-08-06  
**Goal:** Own a first-party domain and a dedicated Webflow site (not Demigod, not “John’s Awesome Project” as the public name).

> **Current override — 2026-08-09:** `getdasha.com`, `www`, TLS, robots, sitemap, Home, Studio, Desk, Lobby, and `/how-to-buy` are live. Historical domain-registration and thesis-era sections below are retained only as incident history. Current routes, source ownership, and ship procedure live in [`DASHA-DOCS.md`](DASHA-DOCS.md) and [`DASHA-WORKFLOW.md`](DASHA-WORKFLOW.md). Do not create a disclaimer route or reuse any NFA, “culture coin,” zero-risk joke, thesis-card, old-coin, or non-endorsement metadata from this history.

### STATUS — 2026-08-07 08:26Z

**`getdasha.com` is registered at Cloudflare.** RDAP handle `3129581890_DOMAIN_COM-VRSN`,
registered `2026-08-07T05:49:13Z`, expires `2027-08-07`, nameservers `troy`/`vera.ns.cloudflare.com`
(both resolving). This replaced the failed IONOS order described below.

| Item | State |
|---|---|
| Domain registered | **Done** (Cloudflare Registrar) |
| DNS A / CNAME records | **Not added** — apex returns NODATA; `www` returns NXDOMAIN |
| Webflow `customDomains` | **`[]`** — domain not attached |
| Home page `/` | **Rebuilt as Dasha Labs**, published, byte-exact vs source |
| Cross-links Home ↔ desk | **Added** (sticky bar, both directions) |
| Desk share image | **Moved to Webflow CDN** (was `files.catbox.moe`) |
| `dasha-landing.test.mjs` | **PASS** |

### Handoff — what unblocks this, and what is already done

**Blocker: browser tools.** Attaching a custom domain cannot be done from this environment.
Verified, not assumed:

| Avenue | Evidence |
|---|---|
| Webflow MCP tools | `get_more_tools` → *"we have shown you the full tool list"* |
| Webflow Data API v2 | Custom domains is **GET-only** — no POST/PUT/PATCH exists (docs) |
| Cloudflare credentials | Absent from env, `~/.wrangler`, `~/.config`, all `*.toml/json/env/sh` |
| CDP Chrome (`:9223`) | Live, but `webflow.com/dashboard` is **logged out**; both it and `dash.cloudflare.com` serve bot challenges. Not circumvented — deliberately. |
| Chrome extension | Connected by the user, but this session predates it, so its tools were never registered |

**Next session: run `/chrome` first.** Then the whole sequence is executable in one pass —
attach apex + `www`, read the exact records Webflow returns, enter them in Cloudflare as
**DNS-only**, wait for Connected + SSL, set the default host, publish to both, then canonical +
`og:url` + `config/dasha.json`. Fallback if the extension stalls: `dasha-domain-finish.sh`
(validated) does the entire Cloudflare half from an API token, leaving one Webflow click.

**Done and verified live** (none of it gated on the domain): home rebuilt byte-exact vs source ·
cross-links both directions (there were previously **zero** links between home and desk in either
direction) · 1200×630 share card replacing a square that X would centre-crop through the branding ·
favicon overriding the inherited `inkuPop` template mark · JSON-LD · `h1` restored on the desk
(rendered with **zero** headings) · tap targets ≥44px on the nav · catbox image dependency removed ·
RC page excluded from sitemap · `dasha-landing.test.mjs` **PASS** · zero console errors on both pages.

**Verified against live sources:** Dexscreener pair `9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7`
has `baseToken` == the config mint (symbol `dasha`, SOL-quoted, Raydium); `priceUsd 0.00006062`
reconciles with the `$60.62K` the desk displays; all 17 configured links resolve (Dexscreener's 403
is bot protection, not a dead link).

### FIXED — contract address was unreachable on mobile (desk)

**Root cause.** `.dd-sticky.dd-kit` is `position: fixed; bottom: 0`, intended as a viewport-pinned
action bar. Its ancestor `.dd-card.dd-section` carries `backdrop-filter: blur(12px)`, and a
non-`none` backdrop-filter makes an element the **containing block for fixed-position
descendants**. So `bottom: 0` resolved to the bottom of that card rather than the viewport, and
the panel landed mid-page directly over `.dd-mint-box`. `document.elementFromPoint()` on the mint
address returned the overlay: the one string a buyer must copy could not be read or selected on
a phone.

**Fix, two parts** — part one alone was measured to be insufficient, so both are required:

1. Re-parent the kit to `<body>` so `bottom: 0` resolves against the viewport. Moving a node
   preserves its listeners and changes no CSS.
2. Give `#dasha-desk > div` bottom padding equal to the kit's measured height, so the last
   screenful can scroll clear of the now-correctly-pinned bar (the page had only 615px of
   scroll, leaving the mint underneath).

**Verified after publish**, scrolled to the bottom at three viewports — `elementFromPoint` over
the address returns `CODE.dd-ca` and the Copy CA button hit-tests to itself in all three:

| Viewport | mint reachable | Copy CA reachable | kit pinned to viewport |
|---|---|---|---|
| 390×844 | yes | yes | yes |
| 360×740 | yes | yes | yes |
| 1280×900 | yes | yes | n/a (not fixed at this width) |

A first attempt that added bottom padding *without* the re-parent was reverted — it moved the
bug's coordinates rather than fixing it, because the panel was not viewport-anchored.

Upgrade path is recorded in a `ponytail:` comment on the fix: in the desk's own CSS, either drop
`backdrop-filter` from that ancestor or move the kit's markup out of it, set the padding there,
and delete the runtime block.

### Template bleed — the recurring defect class

This site is Dasha markup living inside the 2020 portfolio template's shell, and the template's
stylesheet keeps winning wherever the Dasha markup sets no colour of its own. Five instances found
and fixed, all verified against the rendered DOM:

| Where | Was | Now |
|---|---|---|
| Favicon (both pages) | inherited `inkuPop P logo` | Dasha SVG mark |
| Home `h1` | `rgb(79,112,223)` royal blue | `#F2EDE7` |
| Home `h2` | `#FAF5F5` | `#F2EDE7` |
| Home form labels | `rgb(38,25,43)` on `rgb(21,19,23)` — **1.1:1** | **15.86:1** |
| Desk sticky stat row | `#333` — **1.57:1** | **8.28:1** |

Every repair is scoped (`#dasha-home …` on home, class-scoped on desk) and colour-only, so none of
them can reflow a component or reach the hidden template sections. The durable fix is a clean site
rather than more overrides — worth doing once the domain is attached and the shape is settled.

**Not fixed, deliberately:** the desk sticky stat row has no separators between its inline spans,
so it reads as one run-together string (`$6.00e-524h -4.06%1h -1.03%53uxQt…nCpump`). Adding gaps
changes layout on a component being actively iterated on in the Designer, so it is left to whoever
holds that intent. An earlier claim that these spans *overlapped* was wrong — they are sequential
(`left: 1, 56, 128, 192`); a ghosted layer behind them caused the misreading.

**A note on automated a11y numbers:** a first contrast sweep flagged 22 failures; most were the
audit's own error, not defects. SVG text is painted by `fill`, not CSS `color`, and gradient
buttons have a transparent `backgroundColor` so a naive parent-walk resolves the wrong backdrop.
Only findings confirmed against rendered pixels are recorded above.

**Open, not actioned:** confirm Site settings → SEO carries no custom `Disallow: /` — the current
`robots.txt` block is Webflow's automatic staging rule, but a custom rule would launch the domain
deindexed. `sitemap.xml` 404s. `/labs` duplicates `/` and would split ranking signal if published.
`config/dasha.json` → `links.standalone` still depends on `files.catbox.moe`.

**This is configuration absence, not DNS propagation.** Verisign confirms the registration
and Cloudflare nameservers, but the authoritative zone has no apex address and no `www`
record. Webflow also has no custom domain attached, so it has nothing to verify or issue SSL
for. No domain mutation was made: Webflow's Data API exposes no custom-domain attachment
operation, and no Cloudflare API credential is available in the workspace. The eventual
sequence remains attach apex + `www` in Webflow, copy the exact records Webflow returns into
Cloudflare as DNS-only records, wait for Connected + SSL, choose the default host, then use
the guarded publication path. Remembered IP addresses are not treated as source of truth.

**Deferred, with reason:** the live page emits no `canonical`. That is only a problem once
two hostnames serve the same content, and pointing canonical at `getdasha.com` before it
resolves would advertise a dead URL — so it lands with the domain, not before.

**Third-party image dependency: fixed.** All five desk images (avatar, banner, three
gallery shots) are mirrored to the Webflow CDN and repointed by a small inline block
appended after the desk embed. All seven `<img>` tags carry `loading="lazy"` and the swap
runs during parse, ahead of the lazy-load pass, so `files.catbox.moe` is never contacted.
The desk embed itself was left byte-identical — it holds the mint address and swap links,
and hand-rewriting 45,617 characters to change seven URLs risked corrupting a financial
string. Upgrade path is recorded in a `ponytail:` comment on the swap block.

**Concurrent editing — be aware.** Between two of this session's publishes the desk embed
grew a social-proof line (`Live on Dex · numbers every 30s · NFA`), a **Copy buy link**
button, a **Copy live pack** button, and supporting CSS. Those edits were made in the
Designer by someone other than this agent and went live on the next publish. Publishing
pushes whatever is currently in the Designer, so coordinate before publishing if someone
is mid-edit. The claim in that new line checks out: the desk does run
`setInterval(loadMarket, 30000)`.

---

### Why the first attempt failed (historical)

**The IONOS order failed. `getdasha.com` was never registered by IONOS.**

| Check (2026-08-07 05:40Z) | Result |
|---|---|
| IONOS email 2026-08-06 **20:41Z** | **"Your IONOS Order Could Not Be Completed"** — *"Unfortunately, your order could not be completed successfully."* Ref ID 316710768, support 1-484-424-7392 |
| Verisign RDAP | **404** — still no registry object; the name is **available** |
| Public DNS apex + www | **NXDOMAIN** (Cloudflare DoH Status=3) |
| Webflow site `customDomains` | **[]** |
| Webflow MCP OAuth | **Working** — the earlier `invalid_grant` is resolved |
| Webflow site plan | **Paid** ($39, Visa …3256) — still valid, still needed |
| Live desk / home | **200** on `johns-awesome-project-39b1b5.webflow.io` |

The 20:41Z failure arrived **61 minutes after** the 18:40Z "order is being reviewed"
confirmation. Waiting up to 48 hours is therefore pointless — the review already ran
and rejected the order. There is also no double-purchase risk any more: buying
`getdasha.com` elsewhere cannot collide with a dead IONOS order.

**Only remaining blocker: the domain must be bought again, at a different registrar.**
This needs payment credentials, so it is a human step — an agent cannot do it.

1. Register `getdasha.com` at **Cloudflare Registrar** or **Porkbun** (at-cost `.com`,
   instant, no "under review" queue). Avoid retrying the Webflow→Entri→IONOS path that
   just declined.
2. Check the Visa …3256 statement for a stray IONOS authorization and dispute it if it
   posted — a failed order should not settle.
3. Then Webflow → Publishing → Custom domains → add apex + `www`. **No Data API or MCP
   action exists for attaching a domain; this step is UI-only regardless of automation.**
4. Copy the exact A / CNAME values Webflow displays, wait for Connected + SSL, publish.

**Blocking issue found while verifying:** `/` still serves the 2020 template
(`<title>John's Awesome Project</title>`, `<h1>Sewer games</h1>`). Pointing the apex at
this site today would put a stranger's old portfolio on the Dasha brand domain. Fix the
home page before attaching the domain, or set the desk as the default landing path.

**Done on the Webflow side (no domain required):** `dasha-og-card.png` uploaded and
verified at
`https://cdn.prod.website-files.com/5f1458122ba25e70a3ff2bd0/6a756fc6df669a15a1d122df_dasha-og-card.png`
(asset `6a756fc6df669a15a1d122df`). Home SEO/OG deliberately left unset — labelling the
"Sewer games" page as "Dasha Labs" would ship misleading metadata. Desk OG still points
at `files.catbox.moe/gpjyb0.jpg`; that art looks deliberate, so it was not overwritten,
but catbox is a weak host for a production preview.

---

### Latest check — 2026-08-06 12:29 PDT (superseded — assumed the order was still pending)

- Firefox is on Webflow **Publishing → Domains** for `johns-awesome-project-39b1b5`.
- Browser history shows IONOS checkout reached `paymentSuccess` and `thankYou`; the order was accepted.
- Verisign RDAP returns **404** for `GETDASHA.COM`; apex and `www` are **NXDOMAIN**.
- IONOS says a new registration can rarely take up to 48 hours. Until Verisign lists the domain, this is registrar provisioning rather than ordinary DNS propagation, and Webflow cannot verify it.
- IONOS sends an ICANN contact-verification email immediately after a new `.com` order. The account can resend it from **Domain Settings** if its status says **Waiting for email verification**.
- Webflow MCP cannot inspect or modify the site because its OAuth refresh currently fails with `invalid_grant`; the logged-in Firefox session remains the usable setup surface.

Required sequence:

1. Wait for IONOS registration provisioning; confirm the ICANN verification email if IONOS marks it pending.
2. Complete a paid Webflow **Site plan** for `johns-awesome-project-39b1b5` if checkout is still pending.
3. Once Verisign lists the domain, add `getdasha.com` in Webflow **Publishing → Production**.
4. Use Webflow/Entri's automatic IONOS connection when offered. If using manual DNS, copy the exact A/CNAME values Webflow displays; do not rely on remembered Webflow IPs.
5. Add both apex and `www`, choose one default, wait for **Connected/Verified**, enable SSL, then publish to that custom domain.
6. Only after the public domain responds, update canonical, `og:url`, OG image and `config/dasha.json` away from staging.

### Status check — 2026-08-06T19:20Z (hard re-verify + Gmail + Firefox)

| Check | Result |
|-------|--------|
| Purchase path | **Webflow Entri → IONOS** (not a random registrar cart) |
| Timeline (Firefox places, UTC) | 18:33 Webflow **Site plan $39** checkout for `johns-awesome-project-39b1b5` (`ref=custom_domain`) → 18:37 Entri/IONOS domain-order search `getdasha.com` → **18:40 paymentSuccess + thankYou** → 18:40 Entri `domainpurchase?domainNames=getdasha.com` → 18:49 Publishing → Domains |
| Gmail IONOS | **“Your Order Confirmation”** (20:40 CEST / ~18:40 UTC): order **currently being reviewed**; *“In rare cases, it can take up to 48 hours”* · Customer ID **316710768** |
| Gmail Webflow | **“Your Webflow receipt”** $39.00 · *Subscription creation* · 08/06/2026 · Visa …3256 — **site plan paid** (custom domains unlocked on plan) |
| IONOS login after | 19:06–19:09 login codes; URL hit `pageMessage=no-contracts~~error` — domain **not yet a live contract** in the account |
| Public DNS | **NXDOMAIN** (Google + Cloudflare DoH Status=3) apex + www |
| Verisign RDAP | **404** — registry has **no** `getdasha.com` object yet |
| Webflow API `customDomains` on Dasha shell | **[]** — not attached / not verified |
| Live desk | **200** `https://johns-awesome-project-39b1b5.webflow.io/dasha` |

**Correct diagnosis (not “DNS propagation”):**

1. Webflow **billing is done** for this site (can use custom domains once DNS exists).
2. Domain was bought through **Webflow’s Entri/IONOS partner shop**.
3. IONOS has the **order under review** and has **not** submitted (or completed) registration at Verisign yet → RDAP 404 + NXDOMAIN is expected.
4. Until the domain appears in RDAP (or IONOS My Domains), Webflow cannot green-check SSL or serve getdasha.com. Entri auto-DNS only works after the domain is a real registration.

**ASAP options ranked**

| # | Path | Time | Notes |
|---|------|------|--------|
| 0 | **Show people now** on webflow.io | *now* | Desk already live; no domain needed |
| 1 | **IONOS push review** (chat/phone, cust 316710768) | minutes–hours | Order email is the lever; “under review” is the only hard gate for *this* name |
| 2 | **Wait for IONOS** then Entri reconnect | up to ~48h (often faster) | Stay in Webflow Publishing → Domains; Entri may finish DNS once contract exists |
| 3 | **Do not** double-buy getdasha.com elsewhere while IONOS order is open | — | Risk: two charges, or IONOS finishes and collides; domain is still free in registry (404) so a sniper could take it, but rebuying doesn’t cancel IONOS |
| 4 | **Cancel IONOS order + buy Cloudflare Registrar** only if IONOS support says cancelled/failed | 15–30m after cancel | Cleanest “instant .com” if review stalls past patience |
| 5 | **Different free name** (dashadesk.com / dashalabs.io still RDAP 404) on CF/Porkbun | 15–30m | Only if brand renames OK |
| 6 | GitHub Pages / CF Pages + new domain | 20–40m | Bypasses Webflow custom domain; product already on webflow.io so lower value |

**Agent work that does not wait on IONOS:** rename site display name, Labs on `/`, desk path polish, keep polling RDAP until `getdasha.com` exists, then attach + publish.

---

## What already exists (inventory)

| Asset | ID / URL | Role |
|-------|----------|------|
| Webflow site (idle shell) | `5f1458122ba25e70a3ff2bd0` · shortName `johns-awesome-project-39b1b5` | Current home of `/dasha` coin desk |
| **Home page** | id `5f1458136c15aa41639b8538` · `/` | Still old template home — convert to Labs |
| **Coin desk page** | id `6a74b59530c70741b1c574c4` · `/dasha` | Live mint desk HtmlEmbed |
| Designer | talentlink-sf / workspace sites | Open site “John’s Awesome Project” |
| Staging | https://johns-awesome-project-39b1b5.webflow.io/dasha | Live desk today |
| Demigod site | `6a34c484dcedc18a17408187` · trydemigod.com | **Do not use for Dasha** |
| Product files | `/home/potter/dasha-landing.html`, `/home/potter/dasha-desk/` | Labs tool + mint desk sources |
| OG asset | `/home/potter/dasha-og-card.png` | Upload to Webflow Assets |
| Workspace | `6393441fe9af94314fa87103` | Same as Demigod account |

**MCP note:** The Webflow Site plan is paid, but the MCP OAuth refresh currently fails with `invalid_grant`. The logged-in Webflow UI is the available domain-attachment surface until OAuth is reconnected.

---

## Product that the domain should represent

Per brief: **one Dasha property** with two surfaces (don’t split domains yet):

| Path | Surface |
|------|---------|
| `/` | Product home — Dasha Labs thesis card (or short explainer → tool) |
| `/desk` or `/coin` | `$dasha` mint desk (current desk embed) |
| `/tool` or `#tool` | Inlined conviction receipt |
| Later `/docs`, `/discord` | After Discord exists |

One domain. Two products under one brand is OK; two domains now is premature.

---

## Domain decision

`getdasha.com` is the selected and paid name. The earlier shortlist and purchase checklist were removed so nobody mistakes Verisign's temporary 404 during IONOS review for permission to place a second order. Association and endorsement boundaries still apply: the domain must never imply official Dasha Nekrasova control without evidence and permission.

---

## Chosen site path — rename the existing shell

Use site `5f1458122ba25e70a3ff2bd0` (already has `/dasha`).

1. Webflow Dashboard → site → **Settings → General**  
   - Display name: **Dasha** or **Dasha Labs**  
2. **Settings → Publishing** → change subdomain if allowed (e.g. `dasha.webflow.io`)  
3. **Settings → Publishing → Custom domains** → Add domain after purchase  
4. Keep page slug `/` for home; move coin desk to `/desk` or keep `/dasha`

Creating another blank site would duplicate the paid shell and split the existing `/dasha` work, so it is no longer the active path.

---

## Webflow custom domain (after IONOS provisioning)

Webflow’s usual DNS (confirm in Site settings → the panel shows exact values):

| Type | Host | Value (typical) |
|------|------|-----------------|
| A | `@` | Webflow IP shown in UI (often `75.2.70.75` — **use what Webflow displays**) |
| CNAME | `www` | `proxy-ssl.webflow.com` |
| Optional | `cdn` / assets | only if Webflow shows extra |

Then in Webflow:

1. Add domain + `www`  
2. Set **default** domain (prefer `www` or apex, not both as primary)  
3. Enable SSL (automatic)  
4. Publish to custom domains  

TTL: 5–30 min with Cloudflare; up to 48h elsewhere.

---

## Site information architecture (v1)

| Page | Slug | Content source |
|------|------|----------------|
| Home | `/` | Current culture landing from `dasha-landing.html` |
| Studio | `/studio` | Current Studio loader/embed |
| Desk | `/dasha` | Current mint desk built from `dasha-desk/body.html` + `src/*` |
| Lobby | `/lobby` | Separate public chat page |
| Buying guide | `/how-to-buy` | Concise mint and route guide |

**Do not** put Demigod chrome, Telegram claims, or “official Dasha Nekrasova” language on any page.

### SEO / social defaults (set in Webflow page settings)

| Field | Home | Desk |
|-------|------|------|
| Title | $dasha — make the timeline stranger | $dasha desk — verify, chart, buy |
| Description | $dasha. Mint, Studio, quiz, and lobby. | $dasha mint, chart, and source links. |
| OG image | Upload current `dasha-og-card.png`, then set `openGraphImage`; live hash must match | Use current reviewed Dasha card only |

Upload OG card: Webflow Assets → then set Open Graph on Home.

---

## Hosting decision (Webflow vs Vercel)

| | **Webflow** (chosen direction) | **Vercel / Pages** |
|--|--------------------------------|--------------------|
| Marketing + Designer | Strong | Weak |
| Static tool HTML | HtmlEmbed or host tool on subdomain | Excellent |
| Custom domain + SSL | Built-in | Built-in |
| Agent edit path | Webflow MCP already connected | Git deploy |
| Coin desk OSS | Keep on GitHub; embed or reverse-proxy | Can host desk at `desk.getdasha.com` |

**Practical hybrid (recommended):**

- **Apex/www → Webflow** (brand, home, tool embed)  
- **Optional `desk.` or path `/desk` →** same site with HtmlEmbed from built `app.html`  
- **GitHub** remains source of truth for desk + DIE (`dasha-die.mjs`); Webflow is the public shell  

Vercel alone is fine for pure static Labs HTML, but you already asked for Webflow and have MCP + Designer on this account — so **Webflow primary**.

---

## Agent-executable sequence (status)

| Step | Owner | Status |
|------|--------|--------|
| Inventory sites + pages | Agent | Done (this doc) |
| Domain shortlist + DNS notes | Agent | Done |
| Buy `getdasha.com` | Completed in IONOS checkout | **Done; registrar provisioning pending** |
| Create new site / rename site | Logged-in Webflow UI | Path A remains the shortest route |
| Add domain in Webflow | Logged-in Webflow UI | Wait until Verisign lists the domain |
| Upload OG asset | Agent once site open | File ready: `/home/potter/dasha-og-card.png` |
| Wire home + desk pages | Agent | After Designer open on target site |
| Publish | Agent can call publish API | After domain attached |
| Point config `links.webflow` + canonical | Agent | After final URL known |
| Deploy receipt beta | Cloudflare Worker + D1 | Locally verified; Cloudflare credentials/bindings absent |

---

## After the registry lists `getdasha.com`

The remaining launch path is:

1. Open Designer on Dasha site  
2. Set Home SEO + OG  
3. Ensure `/` = Labs, `/desk` = mint desk  
4. Add the exact custom-domain records Webflow displays  
5. Publish to custom domains  
6. Update `dasha-desk/config/dasha.json` `links.webflow` and Labs `canonical`  
7. Run `dasha-landing.test.mjs` + desk smoke  

## Receipt-service deployment and recovery gate

The verified beta service lives in `dasha-receipts-worker.mjs`; `dasha-receipts-wrangler.jsonc.example` contains only non-secret bindings. Before deployment:

1. Create one D1 database and copy its ID into a non-example Wrangler configuration.
2. Apply `dasha-receipts-schema.sql` remotely.
3. Set `BETA_INVITE_HASH` and `MODERATOR_TOKEN_HASH` as Worker secrets, never plain configuration values.
4. Bind the authentication, creation, outcome and report rate limiters.
5. Set `ALLOWED_ORIGIN` and `PUBLIC_ORIGIN` to the actual receipt origin.
6. Deploy first to its generated `workers.dev` URL; run the complete Worker test and live create/read/outcome/tombstone smoke before assigning a custom subdomain.
7. Export the full remote D1 database to SQL, import it into a disposable D1 database, and compare receipt/outcome/report/tombstone counts plus representative hashes before calling backups verified.
8. Record a Time Travel bookmark. D1 retains point-in-time restore history for seven days on Free and thirty days on Paid; export remains the longer-lived recovery artifact.

Cloudflare documents full SQL export/import and Time Travel recovery in its official [D1 import/export guide](https://developers.cloudflare.com/d1/best-practices/import-export-data/) and [D1 overview](https://developers.cloudflare.com/d1/).

---

## Webflow plan note

Custom domain on Webflow requires a **paid site plan** (not free static hosting alone). Confirm workspace billing before purchase if the idle site is still on free tier.

---

## Related local files

- Labs: `/home/potter/dasha-landing.html`, `dasha-og-card.png`  
- Desk: `/home/potter/dasha-desk/`  
- DIE (observe): `/home/potter/dasha-desk/dasha-die.mjs`  
- Brief: `/home/potter/DASHA-PRODUCT-BRIEF.md`  
