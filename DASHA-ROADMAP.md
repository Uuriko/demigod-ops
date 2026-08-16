---
status: canonical
canonical_for: roadmap
last_verified: 2026-08-13
---

# Dasha product roadmap

Updated: 2026-08-13

Site + automation (this week / 30d / 90d / later) is the section immediately below.
The product spine after it — north star, Simp Board rules, Studio, exclusions — is still in force.
Desk-repo copy of the site slice: `dasha-desk/docs/SITE-ROADMAP.md` (do not clobber `dasha-desk/docs/ROADMAP.md` product history).
Mix twin: [`DEMIGOD-ROADMAP.md`](DEMIGOD-ROADMAP.md).

# 2026-08-13 — site + automation

This section is the durable, task-level plan for **getdasha.com**, **lobby.getdasha.com**, and **dasha-desk**. It does not replace the product spine below (Studio, Simp Board rules, culture-object horizon). It is the work that makes those surfaces honest, crawlable, and shippable without a human babysitting every paste.

**Rule of this file:** every task has a done-when, an automation plan, and named edge cases — even if we never auto-send the outbound. Agents execute the plan; they do not invent a sixth colour, a Telegram, an endorsement, or a lavender Desk.

**Do not** dispatch Claude, TUI, or eliza from this file. Laptop `.mjs` + lobby Worker + Webflow paste + wrangler secrets are the spine.

Surfaces in scope:

| Surface | Job after this plan | Must not become |
|---|---|---|
| Home `/` | One buy path, live acid ticker, Simp + Studio + Board as doors | Simp Board host, font zoo, Demigod status theater |
| Simp `/simp` | The board and the quiz, with its own canonical | A handle list; a second home |
| Chess `/chess` | Anonymous play that works, rated play when linked | A route that only answers on lobby |
| Studio `/studio` | Thin loader + Worker `studio.js` with a pin that cannot go stale | Self-contained paste that drifts from lobby |
| Lobby `lobby.getdasha.com` | Identity + GitHub/X OAuth + `/privacy` + branded 404 | Demigod black-hole, fake Connect when OAuth is dark |
| Desk `/dasha` | Mint desk on five tokens | Lavender glass, `/desk` as a second product |
| Board `/bounties` | Native mount, `payTo` required, Solana Pay with `reference` | GitHub Pages iframe, empty-payTo Pay button |

`/faucet`, `/airdrop`, `/earn` and `/claim` are **not** surfaces. They are live, indexed, and serve
a heading plus a Buy button — four of the seven URLs Google has for this domain. Thin pages
discount the whole domain's quality signal, not just themselves, so they are a tax on Home and
`/simp` too. D8 governs them: branded 404 so crawlers drop them, and out of the sitemap.

---

## Shared with Demigod (run on both, fail closed on mix)

These are not "nice to have." They are how two brands on one laptop stop contaminating each other.

### S1. `site-hunt` in CI

**Done when:** `node /home/potter/site-hunt.mjs` is a required check on Dasha ship (`dasha-ship.mjs` / `dasha:test:all` or the Pages/lobby deploy workflow) and on Demigod `bin/dg ship prepare`. A P0/P1 fails the run. Schema `site-hunt/3`. Output lands in `slop-agent-inbox/mission-control/site-hunt-latest.json`.

**Automation plan:**

1. Keep `/home/potter/site-hunt.mjs` as source of truth; `/workspace/site-hunt.mjs` is a twin, not a fork.
2. Add a non-mutating CI job: fetch live HTML for `{www.getdasha.com, lobby.getdasha.com, www.trydemigod.com}` (and the bounties iframe target only while it still exists).
3. Fail on: Dasha acid `#dfff00` / hot `#ff3b81` / violet `#7c4dff` / cherries-as-mark on a Demigod surface; Demigod phosphor `#a6ffcb` / signal `#10c674` / gold `#D4AF37` / `.dgnav` / Cinzel / statue on a Dasha surface.
4. Fail on: `hello@trydemigod.com`, Telegram community URLs on Dasha, `t.me/dashacommunity`, "official coin", "endorsed", Instant Offers copy, two-way star widgets.
5. Dedup one finding per `(site, kind, msg)` with `n` + `urls[]`. Do not fail the run on jsDelivr `@main` lag when raw GitHub is clean (that is P3).

**Edge cases:**

- Demigod is an SPA — pretty paths share one HTML shell. Count unique findings, not path × copy.
- Honesty ignores copy-scrub JS (`dg-early-copy-scrub`). JSON-LD still counts.
- Palette hex-in-HTML is P3 unless it is a brand-mix hex (those are P0).
- Bounty copy-budget follows the iframe until native mount ships, then counts `#bb-app` / `#dg-bounty-live` after stripping nav/footer.

**Tests:** `node site-hunt.mjs` exit 0 on a clean mix; a fixture HTML with `#dfff00` inside `trydemigod.com` markup fails; a fixture with `#10c674` inside `getdasha.com` markup fails. Do not hit live Webflow as the only proof — keep a disk fixture.

### S2. SRI hash in the deploy pipeline

**Done when:** no public Dasha or Demigod page loads a first-party script without `integrity` + `crossorigin="anonymous"`, and the deploy that writes the bytes also writes the pin. A Worker/CDN publish that changes bytes without updating the pin is a failed deploy, not a "eventual consistency" note.

**Automation plan (Dasha Studio — the researched failure):**

The 2026-08-10 incident: lobby Worker deploy succeeded, `/studio` returned 200, every content assertion passed, browsers refused `studio.js` for a day, and the page sat on "Loading studio…". The pin and the client were one atomic unit split across two systems.

Pick **one** of these and delete the other. Do not run both.

- **Versioned client (preferred):** deploy `https://lobby.getdasha.com/client/studio.<hash>.js` (or `/client/studio.js?v=<hash>` only if the Worker ignores the query for bytes — it must not). The thin loader in `dasha-studio-embed.html` / Webflow paste is generated from the same hash. Old hashes stay reachable for one ship so in-flight tabs do not 404.
- **Hash writeback:** `dasha-lobby-assets-build.mjs --write` computes `STUDIO_CLIENT_SRI`, patches the embed + any Webflow head snippet, and the lobby wrangler publish is gated on `dasha-discovery.test.mjs` recomputing the live digest. If live bytes ≠ pin, **do not announce**, **do not paste**, roll the Worker or the pin in the same change.

Demigod already wants one CDN SHA on `Uuriko/demigod-site-cdn` for css/foot/map/art. Same rule: pin in `demigod-footer-lite.html` / `demigod-head-minimal.html` is written by `demigod-foot-cdn-publish.mjs`, never by hand.

**Edge cases (SRI stale):**

- Algorithm must be read from the pin (`sha256` vs `sha384` vs `sha512`). Assuming sha384 made the first sweep report every jQuery pin as dead while the site was healthy. A crying-wolf check is worse than no check.
- Require a pin **only when an external client is actually loaded**. A self-contained inline embed is the safer arrangement; failing it for "missing SRI" punishes the safe path.
- Hostile-host Studio tests must serve the **minified Worker client the SRI was computed from**, not whatever production still serves. Live may lag disk; the proof is about bytes, not DNS.
- Webflow custom-code `set_site_freeform_code` replaces the entire head block. A pin writeback that forgets the favicon / `@view-transition` is a new outage. Read, patch, write back. See [`DASHA-WEBFLOW-SITE-CODE.md`](DASHA-WEBFLOW-SITE-CODE.md).
- jsDelivr `@main` can lag GitHub raw. Pin a commit SHA, not `@main`.

**Tests:** `dasha-studio-embed.test.mjs` (SRI matches `dasha-lobby-static-gen.mjs`); `dasha-discovery.test.mjs` live digest vs pin; `dasha-lobby-page.test.mjs` lobby.js integrity; Demigod `footer:cdn-matches-manifest`. Add a ship-gate step that fetches the live script and hashes it before any X post or Webflow publish.

### S3. Webflow paste runbook (automation, not folklore)

**Done when:** a single command prepares exact head + footer (or Dasha page embed) bytes, pastes them only under current-request publish auth, queue-publishes, then curl-verifies the live origin. Partial pastes are refused.

**Automation plan:**

| Product | Prepare | Paste | Verify |
|---|---|---|---|
| Dasha home / studio / desk / bounties / how-to-buy | `dasha-ship.mjs` + generated `dasha-*-embed` / `src/app.html` | existing Webflow MCP / CDP paste (`dasha-call-webflow-*.mjs`) | `dasha-audit-live.mjs`, `dasha-live-verify.mjs`, `site-hunt.mjs` |
| Demigod | `bin/dg ship prepare` | `demigod-cm6-paste-publish.mjs` (CDP `:9223`) | `bin/dg ship verify` → `truth --require-match` |

Never paste from a buffer an agent typed. Paste from disk. Refuse if head and footer (Demigod) or embed and SRI (Dasha) disagree.

**Edge cases:**

- Site-level custom code is **not in git**. Destroying the favicon block is easy and silent. Always GET before SET.
- Queue-publish `taskStatus: finished` is the gate, not "I clicked Publish."
- `DEMIGOD_CURRENT_REQUEST_PUBLISH=1` / Dasha current-request re-auth is required. A green prepare is not a ship.
- `/bounties.json` on www is Webflow's page JSON export, not the listings feed. Do not paste a feed there.

**Tests:** paste dry-run compares clipboard/MCP payload to disk SHA; live GET after publish matches the same SHA for the embed region (allow Webflow chrome around it).

### S4. Product-mix tests

**Done when:** a dedicated test file (or site-hunt P0 class) fails if Dasha acid, cherries mark, Arial Black display stack, Simp Board, or `$dasha` mint CTA appear on Demigod, and if Demigod phosphor, Hire card, `potter@trydemigod.com` as a Dasha support path, `.dgnav`, gold `#D4AF37`, statue, or "10% of first-year base" appear on Dasha.

Dasha board may **link** "also on trydemigod.com/bounties". It may not restyle as Demigod. Demigod bounties may **not** seed `dasha-desk` listings to look alive.

**Tests:** `dasha-brand.test.mjs` stays Dasha-only; `demigod-hero-brand-guard.test.mjs` / copy-denylist stay Demigod-only; site-hunt mix class; fixture that merges `bounties/board.css` tokens into a Demigod page fails.

---

## NOW (this week — ship before anything optional)

Each item is a closeable task. Do not start 30d work while these are red on live.

### D1. Simp Board lives at `/simp`, not mounted on home

> **Revised 2026-08-15 by user direction.** This item used to read "kill Simp Board on home — move
> it to `/lobby`", written when `/simp` did not exist. It does now, live serves it, and the user's
> call is that `/simp` is a first-class surface and Studio/Desk stay active. The original reasoning
> survives the change; only the destination moved. Do not re-derive the old version from git.

**Done when:** `https://www.getdasha.com/` has no Simp Board mount, no quiz stage, no Join/Leave, no Perry row, and `https://www.getdasha.com/simp` has all of them. Home keeps a **door**: one acid CTA / text link "Simp Board" pointing at `/simp`. Home `#simp` redirects to `/simp` rather than mounting a board on the conversion surface.

**Why:** Home's job is verify mint + one buy + Studio + Board-as-bounties door. A Simp Board *on home* competes with Buy, loads OAuth chrome onto the conversion surface, and makes the ticker fight a quiz. That was the real argument, and it is unchanged — the board needed its own room, not specifically the lobby's room. `/simp` is that room, on the domain that already has the authority, which is why it beats the original `/lobby` destination.

**Automation plan:**

1. Remove the Simp mount from `dasha-landing.html` / Webflow home. `/simp` is the only `simp-board-root` on www; lobby keeps its own copy at `lobby.getdasha.com/`.
2. Update `dasha-identity-matrix.mjs`, `dasha-audit-live.mjs`, `dasha-buy-path.test.mjs`, `dasha-brand.test.mjs`: home must **not** contain `simp-board-root`, quiz invite bar, or `Join board`. `/simp` must contain them.
3. Redirect map: `/#simp`, `/?quiz=1`, `/?challenge=` → `/simp` with the same query.
4. Quiz invite URLs in `dasha-lobby-static-gen.mjs` (`QUIZ_INVITE_URL`) must point at `/simp`, not www `/?quiz=1#simp`.
5. `/simp` must declare its own canonical — it serves 200 with no `<link rel="canonical">` today.
6. Ship: regenerate landing → Webflow paste home + `/simp` → live audit.

**Edge cases:**

- In-flight invite links (`getdasha.com/?quiz=1#simp`) must still start the quiz. A hard delete without redirect strands connectors.
- PerryALPHA founding #1 belongs on `/simp`, not home. Do not put an editorial row on home to "keep the bit."
- OAuth popup `continue` URLs must land on `/simp`, not a home with no board to join.
- Do not move bounties. Bounties stay `/bounties` on www.

**Bearing on PR #71:** the PR makes `/simp` first-class (correct under this item) *and* remounts Simp on home (still wrong, for the reason above) *and* redirects `/studio`, `/dasha`, `/desk` to home (wrong under the same direction call — those surfaces stay active). Split it: keep the `/simp` work, drop the home remount and the three redirects.

**Tests:** live home HTML (JS-off) has no `simp-board-root`; live `/simp` does; `/?quiz=1` on www ends on `/simp`; buy-path test still finds exactly one Buy CTA; `dasha-live-verify` reports `/simp` served with a canonical.

### D2. One Buy CTA

**Done when:** home, studio, desk, how-to-buy, and bounties each expose **at most one** primary Buy control, all pointing at the same exact-mint Jupiter URL (SOL in, `$dasha` mint out). Sticky buy bars, duplicate "Buy on Jupiter" + "Open Jupiter" + plugin modal counts as more than one if they are simultaneous primary actions.

**Automation plan:**

1. Inventory live CTAs with site-hunt + `dasha-buy-path.test.mjs` (already exists — extend it to count visible primary buy buttons per route, JS-on and JS-off).
2. Kill extras. Plugin/modal is allowed only as a progressive enhancement of that one CTA, not a second label.
3. Mint string adjacent to the CTA; verify-it-yourself language stays. No "safe", "verified mint", "official."

**Edge cases:**

- Footer text links to Dexscreener/Jupiter for verification are not Buy CTAs if they are not styled as the acid action.
- Sticky mobile bar that **is** the same CTA (same href, same label) may exist once. Two stickies fail.
- How-to-buy ladder may list steps; only one step is the Buy action.

**Tests:** `dasha-buy-path.test.mjs` asserts `document.querySelectorAll` of the primary buy selector `.length === 1` per route; mint consistency gate still holds.

### D3. Acid ticker on home

**Done when:** home has a full-bleed acid band with repeating uppercase text, actually animating under `prefers-reduced-motion: no-preference`, and `animation: none` under `reduce`. Empty markup plus `animation: none` as the default is a fail (bible §8).

**Automation plan:**

1. Markup in the Webflow home / `dasha-landing.html` — not only in a JS painter. JS-off must still show the band and the words.
2. Gate: `dasha-audit-live.mjs` + a brand test that the band's computed background is `#dfff00` (or `var(--acid)`) and text is ink.
3. Content: culture lines from the bible (casino / "It's time $dasha"), not price, not "SAFE", not Telegram.

**Edge cases:**

- Reduced-motion users get a static band, not a hidden band.
- Ticker must not cover the Buy CTA or trap focus.
- Do not implement the ticker as a `<marquee>` without an accessible alternative; `aria-hidden` on the duplicate loop + a single readable sentence is fine.

**Tests:** JS-off snapshot contains the band text; computed style test; reduced-motion pauses.

### D4. Drop Exo / Bangers / Raleway

**Done when:** no Dasha surface requests those families. Webflow font loads, Google Fonts `<link>`, `WebFont.load`, and CSS `font-family` stacks are clean. Display face is Arial Black / Helvetica 900. Body is the same family at normal weight. Mono only for machine output.

**Automation plan:**

1. GET Webflow site-level + page custom code; strip `WebFont.load` / font `<link>` for those three.
2. `site-hunt` + `dasha-brand.test.mjs` fail on `Exo`, `Bangers`, `Raleway`, `fonts.googleapis.com` families other than none (we do not need a webfont at all).
3. Desk `src/styles.css` rewrite is a 90d item (lavender); this NOW item is the **load**. A loaded unused font still costs and still leaks Demigod/Webflow history.

**Edge cases:**

- Webflow project settings can inject fonts even when page CSS does not mention them. Check site font settings, not only CSS.
- Published CSS may cache. Verify live response, not Designer canvas.

**Tests:** live HTML + CSS of `/`, `/studio`, `/dasha`, `/bounties`, `/how-to-buy` do not contain those family names; no Google Fonts URL for them.

### D5. Native bounties — no iframe as the product

**Done when:** `https://www.getdasha.com/bounties` is a first-class page whose listings render in-page (`#bb-app` or equivalent), JS-off still shows an H1 and a lede ("USDC on Solana. We don't hold it."), and there is no `<iframe src="…uuriko.github.io/dasha-desk/bounties">` as the body. GitHub Pages may remain a **mirror** for the feed, not the www product.

**Why (iframe SEO — researched):** crawlers and OG unfurlers see the Webflow shell, not the iframe document. Webflow already occupies `https://www.getdasha.com/bounties.json` as **page JSON export** (gzip body, `pageId` matches `/bounties`) — it is not the listings feed. `https://www.getdasha.com/bounties/feed.json` 404s. The live sitemap worker omits `/bounties`. Result: a product that exists for humans with JS and does not exist for search, cards, or agents that GET the URL. Native mount + sitemap + a real feed URL is the fix. Do not invent a Cloudflare Worker inside `dasha-desk` to paper over Webflow paths (DEPLOY.md).

**Automation plan:**

1. Build `/bounties` as a Webflow page with inlined or SRI-pinned `board.css` + `board.js` from dasha-desk (same generate-then-paste path as Desk), **or** a same-origin include from lobby if that is the one host that can set cookies — prefer www so the URL stays canonical.
2. Feed: keep `uuriko.github.io/dasha-desk/bounties/feed.json` and raw GitHub as the JSON sources board.js already fetches. Do not require www `/bounties.json` to be the feed (Webflow owns that path).
3. site-hunt copy-budget: after native mount, count `#bb-app` after stripping nav/footer; stop following the iframe.
4. Remove the iframe from the Webflow page in the same publish as the native mount so we do not double-render.

**Edge cases:**

- Cookie identity: GitHub/X sessions are on `lobby.getdasha.com`. Cross-site `fetch(..., credentials: 'include')` to `/simp/me` already exists. Native www mount must keep that CORS + cookie model; do not move Set-Cookie onto www without a cookie domain plan.
- GitHub Pages mirror must not diverge visually (five tokens, Arial Black). Pages is a fallback for contributors, not a second brand.
- Empty feed is honest. Do not seed Demigod listings onto Dasha to fill the page. The extra seed URLs in `board.js` (`demigod-site-cdn` bounties-feed) are a **mix risk** — 90d/Later should stop importing Demigod into Dasha chrome. NOW: native mount first; do not expand the merge.

**Tests:** live `/bounties` HTML contains `#bb-app` or listings markup; no bounties iframe; JS-off H1 present; `dasha-desk/bounties/bounties.test.mjs` still passes against disk.

### D6. Studio SRI in the lobby deploy pipeline

**Done when:** `wrangler deploy` of lobby and the Studio thin-loader pin are one pipeline. Versioned `studio.js` **or** hash writeback (see S2). A lobby deploy that changes `STUDIO_CLIENT_JS` without updating `dasha-studio-embed.html` / Webflow `/studio` fails CI.

**Automation plan:**

1. `dasha-lobby-assets-build.mjs --write` is a required pre-step of lobby deploy.
2. `dasha-studio-embed-build.mjs --check` + SRI match against `dasha-lobby-static-gen.mjs` in the same job.
3. After wrangler: `dasha-discovery.test.mjs` against live origin recomputes digest. Mismatch → job red, no "we'll paste later."
4. If Webflow `/studio` still has a stale pin, the job opens a paste step (MCP/CDP) or refuses announce.

**Edge cases:** see S2 (SRI stale). Additional: two Studio copies (`dasha-desk/studio/` and laptop `dasha-meme-studio.html` / embed builders) — one builder must own the pin. Hand-editing `embed.html` is already a test failure; keep it that way.

**Tests:** existing embed + discovery tests; add a pipeline test that a mutated `STUDIO_CLIENT_JS` without `--write` fails `--check`.

### D7. `/privacy` + `/desk` → `/dasha`

**Done when:**

- `https://www.getdasha.com/privacy` and/or `https://lobby.getdasha.com/privacy` serve a real Privacy page (lobby Worker already has `PRIVACY_HTML` + `GET /privacy`). www should 200 or 301 to lobby, not a Webflow 404 with no brand.
- `https://www.getdasha.com/desk` is **not** a true 404 and **not** a second desk. It 301s to `/dasha`. DEPLOY.md currently records `/desk` as a true HTTP 404 — that was accurate and is now the bug. Desk is `/dasha`. A `/desk` URL is what people type.

**Automation plan:**

1. Webflow 301 `/desk` → `/dasha`. Do not publish a second Desk page.
2. Privacy: publish a www `/privacy` that either embeds the same copy or 301s to lobby `/privacy`. Link it from footers.
3. `dasha-audit-live.mjs`: `/desk` must be 3xx to `/dasha` (today a 404 is "soft" in some checks — stop treating it as acceptable). `/privacy` 200 with an H1.
4. Branded 404 (D8) covers unknown paths; `/desk` is known and must not use the 404.

**Edge cases:**

- Relative links `href="/desk"` in old posts/README. Keep the 301 forever.
- Privacy copy: C7 in [`DASHA-CLAIMS.md`](DASHA-CLAIMS.md) — uploads stay in the browser; gallery fetches registered remotes. Do not claim "nothing leaves the browser."
- Lobby `/privacy` is the implementation that already exists — do not fork a third copy in Webflow HTML.

**Tests:** curl `-I` `/desk` → 301 Location `/dasha`; `/privacy` 200 + `<h1>`; docs-links still resolve.

### D8. Branded 404

**Done when:** unknown paths on www and lobby return 404 with Dasha chrome (ink ground, paper type, acid CTA home, cherries favicon), a clear "not found", and **no** Webflow default, **no** Cloudflare generic, **no** Demigod phosphor. `noindex` on the 404 body. Retired routes (`/checkout`, thesis, etc.) stay 404 so crawlers drop them (lobby robots already prefers 404 over Disallow for retirement — keep that).

**Automation plan:**

1. Webflow 404 page: paste Dasha tokens, one Home CTA, mint is optional (do not put Buy on a 404).
2. Lobby Worker: replace plaintext `Not found` with the same branded HTML for document requests; keep JSON 404s as JSON for API paths.
3. Audit: `dasha-audit-live.mjs` fetches a nonce path, asserts 404 + acid/ink + cherries, asserts no `#10c674`, no gold.

**Edge cases:**

- API 404s must remain machine-readable. Do not HTML-wrap `/simp/me` misses.
- 404 must not 200 with a "soft" not-found (that re-indexes junk).
- `howto-404` is currently a **soft** allowlisted lag in `dasha-audit-live.mjs`. How-to-buy should 200; if it 404s that is a ship bug, not a branded-404 success.

**Tests:** nonce path 404 + brand tokens; `/api`-style paths stay JSON; site-hunt does not count 404 chrome as homepage copy-budget.

### D9. `payTo` required

**Done when:** a listing cannot be created, rendered as payable, or accepted into the feed without a valid Solana address in `payTo`. Empty string, missing field, `solana:` with no address, or a non-base58 blob all fail closed. UI: no Pay button (`bb-pay-na` is fine). List CTA disabled until `payTo` validates.

Disk already has part of this: `solanaPayUrl(25, '', 'docs') === ''`; `renderRow` with `payTo: ''` has no `>Pay<`. **List** still needs the same gate (issue template + `listingFromIssue` + local form). Fenced JSON with `"payTo": ""` must not become a live row.

**Automation plan:**

1. `board.js` `normalizeListing` / form submit / issue parser: reject empty `payTo`.
2. Issue template: `payTo` required.
3. `bounties.test.mjs`: extend the existing empty-`payTo` row test to List/submit and to feed ingest.
4. Do not silently substitute the lister's identity wallet. Ask again.

**Edge cases:**

- `normalizePayTo('solana:' + SYS + '?amount=1')` already extracts SYS. Keep that. Do not extract from a URL that is not a Solana Pay URL.
- System program `11111111111111111111111111111111` is a **test fixture**, not a valid bounty destination. Reject known burn/system addresses on List.
- Changing `payTo` after claims exist is a new listing, not an edit-in-place (avoids bait-and-switch).

**Tests:** existing `bounties.test.mjs` empty payTo; new tests for List disabled, issue ingest skip, system-program reject.

### D10. GitHub OAuth app + wrangler secrets

**Done when:** lobby GitHub OAuth is a real GitHub App or OAuth app (callback `https://lobby.getdasha.com/oauth/github/callback` or the start URL board.js already uses), client id/secret and session signing keys are **wrangler secrets** (not in git, not in `dasha-studio-embed.js`), and the Board CTA is honest when unconfigured: **GitHub soon**, not a dead Connect button (bible §4 / §8).

**Automation plan:**

1. Create the GitHub OAuth app (human-in-the-loop at github.com — agents prepare the callback URL list and the wrangler secret names, they do not screenshot secrets).
2. `wrangler secret put` for `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, cookie signing, and the existing X OAuth secrets if not already there. Document names in lobby DEPLOY, not values.
3. `/oauth/github/status` returns `{ configured: false }` when secrets are missing. `githubCtaLabel(false) === 'GitHub soon'` already — wire the live CTA to status, not to hope.
4. Start URL `https://lobby.getdasha.com/oauth/github/start` must 200 with a real redirect when configured, and 200 with an honest HTML ("GitHub linking is not on yet") when not — never a 500 stack, never a blank popup.

**Edge cases (OAuth unconfigured — honest):**

- A Connect button that pops a GitHub 404 / `redirect_uri_mismatch` trains people to distrust the board. **GitHub soon** is the product.
- X is optional on the board; GitHub is required to list/claim. If GitHub is dark, List/Claim stay disabled **and** the label explains why.
- Popup blockers: existing `dasha_gh` / `dasha_x` window names. If `window.open` fails, status text "Allow popups" — do not silently fail.
- T3 threat model: state/PKCE, `__Host-` cookie, no offline token. GitHub gets the same class of control as X. Do not add `offline_access`.
- Secrets in the Worker bundle: scan `wrangler deploy` artifacts in CI for `ghp_`, `gho_`, client secrets. Fail the job.

**Tests:** `bounties.test.mjs` already asserts `GitHub soon` and the start href; add lobby worker tests for unconfigured start (honest HTML) vs configured (302 to github.com); deploy scan for secrets.

---

## 30 days

Do not start these while D1–D10 are red on live, except where a 30d item unblocks a NOW item (sitemap can ship with native bounties).

### D11. X optional perks wired

**Done when:** GitHub is enough to List/Claim/Pay. X is optional. If X is linked (same lobby session as Simp Board), the board may show handle + avatar and any **declared** optional perk (e.g. invite copy, quiz badge) that does not gate money. Unlinked X never looks like a failed Connect. No points for follows, likes, buys, or bag size (Simp Board rules still apply; they do not leak onto bounties).

**Automation plan:** reuse `identityFromLobbyMe`; perk flags from `/simp/me` only. Feature-flag perks off until a named perk exists. Tests: `canAct` true with GitHub and null X; CTA "X" not "Connect X or you cannot pay."

**Edge cases:** X OAuth unconfigured should hide the X button or label it soon — same honesty as GitHub, but X being dark must **not** block List. Do not store X tokens in `localStorage` identity beyond handle.

### D12. Solana Pay `reference=ticketId` + `findReference` paid-state

**Done when:** every Pay URL includes `reference=<ticketId>` (unique per listing×claim or per listing, documented). A watcher (Worker cron or Pages-safe poller) calls `findReference` (Solana Pay spec) for unpaid tickets, and on seeing a matching USDC transfer to `payTo` for `amount` on mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, flips the listing/claim to **paid** in the feed. The board **does not hold funds**. Paid-state is an observation, not escrow.

**Automation plan:**

1. Extend `solanaPayUrl(amount, payTo, label)` to require `reference`. Empty reference → no URL (same as empty payTo).
2. Persist `ticketId` in the listing JSON / issue body.
3. Small Worker: `getSignaturesForAddress` / `findReference` with finalized commitment. Idempotent writes. No private keys.
4. UI: unpaid / paid / amount-mismatch. Mismatch does not auto-complete.

**Edge cases:**

- Reference reuse: never recycle `ticketId`. A second payment with the same reference is ambiguous.
- Partial amount or wrong mint: observe, do not mark paid.
- We do not construct payout transactions (Desk PRODUCT.md non-goal). `findReference` is read-only.
- RPC failure: leave unpaid, show "status unknown", do not invent paid.
- Empty `payTo` cannot get a reference URL (D9 ∩ D12).

**Tests:** URL contains `reference=`; fixture signature marks paid; wrong mint does not; missing reference fails `solanaPayUrl`.

### D13. Empty `payTo` cannot List

Stricter than D9's render gate: the List control is disabled, the issue template fails GitHub's required field, and feed ingest **drops** the row (does not show it as unpaid-unpayable, which still looks like inventory). Automation: one function `canList(listing)` used by form, issue parser, and feed merge. Test the fenced `"payTo": ""` issue body in `bounties.test.mjs` (already started — finish it).

### D14. Sitemap includes `/bounties`

**Done when:** live `https://www.getdasha.com/sitemap.xml` (Cloudflare edge worker, `x-dasha-edge: sitemap`) lists `/`, `/studio`, `/dasha`, `/bounties`, `/how-to-buy`, `/privacy` as appropriate. Adding a file in dasha-desk does **not** update www — patch the edge worker. robots.txt is non-empty and points at the sitemap.

**Automation plan:** change the sitemap worker in the same change as native bounties. `dasha-audit-live.mjs` currently allowlists `sitemap-404` as soft — **stop**. Missing sitemap is a P1.

**Edge cases:** do not list 404s, `/desk` (canonical is `/dasha`), retired checkout paths, or lobby OAuth start URLs. Lastmod should be real or omitted, not a fake fresh date.

### D15. JS-off H1 present

**Done when:** every public Dasha route has exactly one visible H1 in the first HTML (Webflow canvas / Worker HTML), stating the product honestly. Home H1 is not "Loading…". Studio light-DOM shell already exists for this reason — keep it. Bounties native page gets an H1 in markup, not only after `board.js`. Lobby Simp page too.

**Automation plan:** JS-off crawler in site-hunt + `dasha-discovery.test.mjs`: disable script, assert `h1` text. Fail on empty H1, on `Loading studio`, on missing H1.

**Edge cases:** shadow-root H1 does not count for JS-off. Webflow can wrap an extra H1 — product-mix and a11y: one H1, not three.

---

## 90 days

### D16. Agent-eligible bounty API (Superteam-style; human claims; KYC)

**Done when:** a documented HTTP API can list open bounties (public JSON already close) **and** accept an agent-submitted claim packet that still requires a **human GitHub identity** to finalize. No agent can mark paid, no agent can move USDC, no agent skips GitHub. If a jurisdiction requires KYC for the **human** claimant above a threshold, the API returns `kyc_required` and a human path — we still do not hold funds.

**Automation plan:** versioned `/bounties/feed.json` remains the read API. Write API is GitHub issues + optional Worker validate. Agent schema: `dasha-bounties-claim/v0` with proof URL, GitHub login, ticketId. Human must click Claim. Superteam-style = structured bounty objects, not "an LLM with a wallet."

**Edge cases:** agent spam → rate limit by GitHub login, not IP alone. No Telegram bot as the agent channel (D17). Empty payTo listings never appear in the agent API. Do not KYC inside Dasha for fun — only if a real payout rail later requires it; until then "we don't hold it" means we also don't KYC theater.

**Tests:** schema fixtures; unauthenticated write 401; claim without GitHub 403; feed omits empty payTo.

### D17. No Telegram

**Done when:** no Dasha surface, sitemap, OG card, or lobby footer links `t.me/`, `telegram.me`, or "official Telegram." Claims ledger already forbids it. Keep the gate forever.

**Automation:** site-hunt P0 + `dasha-docs-links` / claims tests. Edge: third-party tape that *mentions* Telegram in a screenshot alt is still a fail if we hotlink it as a CTA.

### D18. No sixth colour

**Done when:** live CSS for all Dasha surfaces uses only ink / paper / acid / hot / violet (plus transparent/rgba of those). Desk included.

**Automation:** art-direction hex table is the allowlist; site-hunt + a computed-style sample of `/dasha`. Edge: browser default blue links — set `a { color: var(--acid) }` or paper; do not "fix" by adding cobalt.

### D19. Desk never lavender glass

**Done when:** `dasha-desk/src/styles.css` is rewritten to landing/studio/board tokens. Forbidden: `#c4a5ff`, `#f6f1ff`, `0 8px 24px`, `backdrop-filter` as the look, `system-ui` as display, gradient CTA `#7c3aed`. Acid CTA, 4px hot offset, Arial Black uppercase.

**Automation plan:** copy `:root` from `bounties/board.css`; replace components; `dasha-desk` visual tests + site-hunt on `/dasha`. This is the art-direction overhaul. Do not "harmonise" landing toward lavender.

**Edge cases:** generated `src/app.html` / `index.html` must be rebuilt (`node build.mjs --write`). Hand-editing generated files is a fail. Contrast: acid on paper fails at small sizes — acid belongs on ink.

---

## Later (permanent)

### D20. Never auto-endorse

No agent, cron, or board outcome auto-posts "Dasha loves this", verification badges on third-party mints, or implied Nekrasova approval. Remix attribution `getdasha.com` is not an endorsement mark (already in Studio rules).

**Automation plan we may never auto-send:** if a social poster is ever built, it requires current-request auth, a claims-ledger scan, and a kill switch. Default is off. Test: a fixture post containing "endorsed" / "official" / "Dasha confirmed" fails the gate. **Do not build the poster to have something to gate.**

### D21. Association ≠ endorsement stays

Bible hard rule. Public posts ≠ brand deal, safety, or legal control of any mint. C5 in the claims ledger. Site-hunt + `dasha:test:docs` forever. Optional tape still needs "not endorsement" caption.

**Edge:** Perry tape is third-party. Hotlinking a still is not a co-sign. Simp Board editorial row is disclosed as editorial, not measured, not an endorsement of Perry's bags.

---

## Automation matrix (even the "never auto-send" rows)

| ID | Human still required | Agent may run unattended | Never auto-send |
|---|---|---|---|
| D1–D8 site chrome | Webflow publish auth | generate, test, audit, draft paste | live publish without current-request |
| D9–D13 bounties | GitHub OAuth app create | parsers, tests, findReference reads | constructing payout txs, seeding feed |
| D10 secrets | `wrangler secret put` | configured? probe, honest CTA | printing secret values |
| D16 agent API | human Claim click, any KYC | read feed, validate schema | paying, endorsing, Telegram |
| D20–D21 | any public association sentence | deny-list scan | the sentence itself |
| S3 paste | current-request flag | prepare + verify | paste when flag off |

---

## Pointers

- Visual: [`DASHA-ART-DIRECTION.md`](DASHA-ART-DIRECTION.md)
- Culture + claims: [`DASHA-BIBLE.md`](DASHA-BIBLE.md), [`DASHA-CLAIMS.md`](DASHA-CLAIMS.md)
- Threats: [`DASHA-THREAT-MODEL.md`](DASHA-THREAT-MODEL.md)
- Desk product (do not clobber): `dasha-desk/docs/ROADMAP.md` and `dasha-desk/docs/SITE-ROADMAP.md`
- Hunt: [`SITE-HUNT.md`](SITE-HUNT.md)
- Webflow head: [`DASHA-WEBFLOW-SITE-CODE.md`](DASHA-WEBFLOW-SITE-CODE.md)
- Mix twin: [`DEMIGOD-ROADMAP.md`](DEMIGOD-ROADMAP.md)


---

## Product spine (still in force)

The following was the 2026-08-11 product roadmap. It is not archived. Site work above must not violate it.

## North star

Ship a fast, coherent and trustworthy place to understand `$dasha`, verify the mint, create media and reach the community.

Real-visitor conversion, participation, retention and elapsed-time experiments are optional product
research. They are not release, completion or feature-unlock requirements.

## Permanent exclusions

The Thesis Card and every receipt/forecasting descendant are scrapped. Do not test, deploy, integrate or rename them. Archived code is evidence of abandoned work, not backlog.

## Current evidence

- The live homepage already offers the verified mint, Jupiter, chart, source links, X discovery and `/dasha` desk.
- A plain exact-mint Jupiter link hands the buy flow to Jupiter without executing wallet-capable code on Dasha's origin.
- Meme Studio is live and creates/exports square posts, vertical stories and wide banners. Remix URLs preserve the exact editable look, format and line.
- The live homepage includes an opt-in Simp Board with PerryALPHA's disclosed editorial founding
  spot. X-linked members can separately join or leave, save a personal score card and view supported
  badges. The public evidence-URL form is retired; new awards require automatic project events or
  maintainer-derived public GitHub records.
- Current memecoin research consistently describes narrative, social diffusion and participatory culture as primary behavior, alongside severe volatility and concentration risk.
- Zora makes creation and trading one loop; Guild combines community identity and campaigns; quest products reward participation. Dasha should learn from the loop, not copy their infrastructure.
- Grok's independent 30-track review converged with the academic evidence: first-contribution acknowledgement, bounded prompts and remix continuity are better-supported next tests than ranks, accounts, token gates or another feature suite. Raw receipt: [`DASHA-GROK-DEEP-RESEARCH-2026-08-08.md`](archive/dasha-docs/DASHA-GROK-DEEP-RESEARCH-2026-08-08.md).

## Simp Board boundary

The live Board combines one editorial row with measured opt-in rows. PerryALPHA's founding #1 remains explicitly non-measured. OAuth or Lobby use alone never enrolls anyone; join and leave are explicit, and leave removes the public profile and its claims.

Linking earns a fixed 10-point eligibility credit. The existing creative/community award schema is
retained for compatibility, but the removed public evidence form is not an award path. OSS points
accept only `dasha-simp-oss/v0` records derived from merged, reviewed public work. Followers,
verification, likes, reposts, replies, chat volume, raw referral clicks/joins, purchases, balances, bag size and
payments score zero. Holder proof signs a short-lived message, checks the associated mint at
finalized commitment, stores only the check time plus expiry, publishes no wallet or balance, sends
no transaction and scores zero. It proves a positive balance at that check, not continuous holding.

Mutable Worker identities and live endpoint inventories belong in deployment receipts and
`dasha-audit-live.mjs` output, not this roadmap. Real participation and demand remain unproven.

Prepared connector pilot: an opaque personal invite records first attribution for seven days. Clicks,
links and joins score zero. A not-currently-enrolled X-linked member must finish the quiz and make an
authenticated visit at least 24 hours later before both people receive two connector points; a first reviewed creative,
community or OSS contribution adds eight points to each. One inviter can score at most five activated
referrals per rolling 28 days. Leaving removes the referral identity and recomputes both scores. The
pilot is prepared locally, not published, and is retained only if referred members return at least as
often as organic members without material abuse. Leaving removes referral identity, so the system
deliberately keeps no hidden prior-enrollment tombstone.

Prepared OSS lane: `dasha-simp-oss/v0` scores only merged, reviewed pull requests to allowlisted public Dasha repos. Exactly one impact label maps to 5/15/40/100/200 points, capped at 300 points, eight merges per 28-day season and three merges per rolling seven days. Operators and bots score zero; direct commits are not backfilled. `dasha-simp-oss-scorer.mjs` recomputes the lane from public GitHub evidence, and its current authoritative result is empty because `Uuriko/dasha-desk` has no merged PRs. Activate only after the impact labels, season timestamps and first non-operator reviewed PR exist.

## Phase 0 — coherent conversion path

Goal: let a qualified visitor verify and begin buying with less context switching.

Build:

- direct `jup.ag` links on every buy surface with SOL input and the exact `$dasha` output mint;
- the mint adjacent to every buy path, and the guidance to verify it;
- an aggregate outbound-buy intent marker only if it becomes decision-relevant without adding cross-site analytics.

Gate:

- modal loads on desktop and mobile without page errors;
- wallet and swap execution remain entirely inside Jupiter;
- direct fallback works when the plugin is blocked;
- no material Core Web Vitals regression from loading the plugin before intent.

Falsification: repeated support evidence shows the exact external route is materially harder to complete than an embedded flow, and a maintained, integrity-controlled embed becomes available.

## Phase 1 — Dasha Meme Studio instrument

Goal: provide a reliable creation and editable-handoff tool.

Status: live instrument **and lead product bet**. Full factory + growth + social ambition:
[`DASHA-CULTURE-STUDIO-PRODUCT.md`](DASHA-CULTURE-STUDIO-PRODUCT.md). Phase A adds first-export
checklist, copy-remix-link, material-change note on lineage; core remix/URL/kit/share already live.
Exact deployed features and artifact identity belong in the release contract and live verifier.

Prototype:

- five original procedural layouts with no third-party image dependency;
- editable one-line caption and live preview;
- PNG export first; GIF/video only after PNG demand;
- optional X share intent and optional verified-mint caption;
- portable remix URLs carrying the editable look, format and line without an account or upload;
- small removable `getdasha.com` attribution, never a fake endorsement mark.

Gate:

- mobile and desktop edit, export, remix and share-fallback checks pass;
- accessibility, security, claims and release-integrity checks pass;
- the live Studio matches its verified release artifact.

## Optional experiment — Transmission 001

Transmission 001 is a prepared research option, not a roadmap phase or completion requirement.

Run one bounded experiment titled **make me an alibi**:

- one concise instruction: `make me an alibi.`;
- one original, deliberately incomplete Studio starter carrying `transmission-001`;
- one task designed to take minutes;
- the existing PNG-plus-editable-link share path and one manually reviewed submission path;
- acknowledgement for every distinct person's first valid submission by the end of the next calendar day;
- a seven-day contribution window;
- one small, explicitly curated closing record only if real contributions exist;
- a second Transmission only if participation pulls it into existence.

Optional evaluation criteria, if it is ever run:

- at least five distinct non-operator submissions;
- at least three materially changed artifacts;
- at least one repeat, remix or explicit request for the next prompt;
- every valid first submission receives acknowledgement;
- at least one valid submission preserves an editable link; treat a cross-person second-generation remix as stronger evidence, not a required first-test threshold;
- source, permission and non-endorsement boundaries remain intact.

Measure the path from view → material edit → export → submission → acknowledgement → return/remix. Keep operator examples separate. Token price, market cap, trade volume, follower count and raw reactions do not count toward the gate.

Adapt once if credible participants consistently fail at the same shared step. Stop if fewer than two credible non-operator artifacts appear after real distribution, or if people consistently view/save without editing. Do not add points, token rewards, accounts or automated ingestion to rescue a failed creative loop.

Research and full boundary: [`DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md`](archive/dasha-docs/DASHA-PARTICIPATORY-CULTURE-RESEARCH-2026-08-08.md). Academic map: [`DASHA-ACADEMIC-EVIDENCE.md`](archive/dasha-docs/DASHA-ACADEMIC-EVIDENCE.md).

## Optional future expansions

These are ideas, not requirements or automatic unlocks. Build one only after an explicit product
decision authorizes it; no visitor count, seven-day window or participation threshold is required to
finish the current Dasha product.

### A. Remix Relay

Trigger: at least ten non-operator chains reach a second remix generation. Add the smallest portable artifact format and optional parent lineage. Do not add accounts, a token or social graph just to label this a network.

Immediate experiment: [`dasha-relay-lab.html`](dasha-relay-lab.html) gives five matched image-only and editable-fragment starters using the existing Studio, then locally compares parent and returned Studio links for changes to look, format or line. A valid comparison renders a machine-readable `dasha-relay-observation/v0` record containing only the experiment arm, material-change result, changed fields and the two supplied URLs; it is neither submitted nor stored. Its separately implemented parser also validates and semantically reconstructs the bounded Studio recipe without importing Studio code; this is a dual-implementation grammar smoke test, not pixel-renderer conformance, cultural portability or demand evidence. Over seven days, count materially changed second-generation remixes—not clicks, parser results, compliments or operator examples. Kill further editor work if fewer than two of at least ten real handoffs produce a non-operator second-generation edit, or if recipients consistently keep the PNG and discard editability. Do not publish the Wall, gallery or lineage layer to rescue a failed relay.

### B. Moment Capsules

Trigger: recurring group moments produce more participation than solitary creation. Open a bounded contribution window and export the result as a static collage or zine; no attendance token or permanent identity.

Prepared experiment: **Culture Capsule** ([`dasha-remix-pack.html`](dasha-remix-pack.html)) accepts a bounded moment title, one validated public context URL and 2–9 existing Studio remix links with optional contributor labels, then exports one local 1080×1080 group zine. Native share keeps that PNG and its editable Capsule link together; the X fallback saves the PNG and opens a post containing the same link. The link carries the title, context, every entry, format and label in the URL fragment, so another person can reopen, add, replace or remove remixes without sending state in the HTTP request. Each rendered slot exposes its exact Studio source and a remove control; the PNG is an export, not the editable source. Context and contributor labels are maker-supplied and explicitly unverified. It has no backend or public collection surface. Publish only as an experiment; kill it after three distributed capsules if no non-operator contributes or reopens and changes one.

Trust boundary: contributor names are unverified labels entered by the wall maker. They are not proof of authorship, consent, licensing or permission. Do not add onchain attribution or ownership claims without a real approval workflow.

### C. Portable Culture Kits

Trigger: an outside community publishes with a Dasha-derived kit and reuses it without agent help. Extract only the proven renderer and format boundary; do not build a marketplace or SDK first.

### D. Live Remix Rooms

Trigger: scheduled prompts draw repeat attendance. Run the first room with the existing Studio and manual collation; add real-time state only after repeated sessions justify it.

### E. Transaction Preflight pivot

Trigger: the cultural loop fails and active Solana users repeatedly bring real unsigned requests they can obtain without assistance. Treat this as a product pivot, not an adjacent feature, because its trust/security identity conflicts with the current cultural surface.

### F. Generic Living Objects — rejected

Rezona, Sekai, Variant and Pops already offer interactive/playable content with creation, remixing and sharing. Do not build tap-reveal toys, AI games, levels, a runtime marketplace or an app store under a new name. Reconsider only if Dasha discovers a materially different interaction job that those products do not serve.

### G. Agent products — deferred or rejected

The existing Studio fragment is already a deterministic, free machine interface. Defer a static agent skill until human Remix Relay works or an external agent consumer asks for a stable grammar. Reject autonomous Dasha posting bots: they are crowded, make engagement evidence less trustworthy, and create endorsement/moderation risk. Reject a paid x402 Culture Compiler while the same output can be constructed locally for free; reconsider only when a proven server-side capability and independent demand both exist.

Current decision detail: [`DASHA-AGENTIC-CRYPTO-INTERFACES-2026-08-09.md`](archive/dasha-docs/DASHA-AGENTIC-CRYPTO-INTERFACES-2026-08-09.md).
The first allowed artifact is one static schema only after a named external consumer and a reproducible
construction failure; MCP additionally requires a genuinely remote operation and two independent
clients, while x402 requires a scarce paid resource and independent buyers.

### H. In-feed Dasha — distribution option, not a pivot

[Farcaster Mini Apps](https://miniapps.farcaster.xyz/) provide feed discovery, signed-in social context, notifications and wallet rails for ordinary web apps. A later Dasha Mini App could open an exact remix, edit it and pass the result on without leaving the feed. Do not build the wrapper before Relay proves that people pass editable state: the SDK can improve distribution, but it cannot create the underlying behavior. Trigger: repeated non-operator chains plus identifiable Farcaster demand. First version reuses the existing Studio and adds only the required manifest/SDK boundary—no feed, token gate or separate editor.

### I. Open Creative Briefs — earned market branch

Trigger: Relay proves editable artifacts survive real handoffs and one community brings a real creative request, a legitimate starter and a budget. Run the first cycle manually: brief, reuse terms, starter object, editable fork submissions and external payment. Productize only if at least three forks are usable, one is adopted without re-briefing, rights stay clear and the buyer requests a second cycle without operator coaching. Otherwise drop the branch. Do not build escrow, voting, profiles, reputation, a marketplace or `$dasha` payment rails.

### J. Lore Vault — bounded fallback, not CultureGraph

Trigger: Studio/Relay sharing fails and real users repeatedly ask for sourced contract, origin or disputed-claim context. Use the existing Dasha evidence ledger plus two unrelated tokens to test three static pages manually under the time and return-use gates in [`DASHA-PRODUCT-OPTIONS-2026-08-07.md`](archive/dasha-docs/DASHA-PRODUCT-OPTIONS-2026-08-07.md). Do not build a multi-token graph, scraper, crowdsourced wiki, sentiment feed, safety score or price layer. If the static test fails, archive the direction.

## Ambitious platform horizon

If real cross-person remix chains recur, Dasha can become the first living world built from **open culture objects**: portable editable artifacts with explicit reuse terms and bounded source context. The ambition is an open media format and renderer, not another captive feed.

Graduation order:

1. one exported object;
2. one cross-person material remix;
3. one useful, consented lineage;
4. one independent renderer passing shared fixtures;
5. one outside community reusing the format without operator help.

Only then consider discovery, federation, profiles, collaborative canvases, commissioning or provenance standards such as C2PA. `$dasha` may remain the cultural sponsor and discovery asset; utility, gating and financial rewards are not assumed and require separate legal, technical and demand evidence.

## Growth and safety metrics

Primary:

- verified buy-flow starts per qualified landing visitor;
- Meme Studio start → export → voluntary share-intent conversion;
- returning creators and distinct remixers;
- inbound visits carrying a studio/remix attribution.

Guardrails:

- zero invented association or endorsement claims;
- zero unofficial Telegram/Discord links;
- zero wallet custody or custom swap execution;
- anti-scam guidance kept prominent (check the mint; never trust a mint from DMs). Risk boilerplate
  was removed from every surface on 2026-08-08: it is not a guardrail, it is a reflex nobody reads.
  The CC0 likeness carve-out stays, because it states licence scope rather than hedging;
- no rewards for deceptive promotion or coordinated spam.
- no points, rank, access, prizes or status for buying, balances, payments, raw referral traffic, favorable token posts, likes, reposts or reviews; the bounded connector pilot scores delayed independent participation, and optional sharing stays score-neutral.

Raw price movement is not proof that the website or product caused demand.
