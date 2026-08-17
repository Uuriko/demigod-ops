---
status: working
generated_by: claude
generated_at: 2026-08-16
reverified_at: 2026-08-17
---

# What needs finishing — Dasha + Demigod

Compiled from a live audit on 2026-08-15/16, **re-verified against live on 2026-08-17**. A snapshot,
not a source of truth. Live truth stays `node dasha-live-verify.mjs` and `bin/dg truth`. Every item
says what proves it done.

Nothing in this file authorizes publishing, outbound messages, or money movement.

Items marked ✅ were confirmed fixed on 2026-08-17. Items marked ⚠︎ were re-confirmed still broken
with fresh evidence. Everything unmarked is carried forward from 08-16 and was **not** re-verified.

---

## P0 — broken on live right now

| # | Item | Evidence | Blocked by |
|---|---|---|---|
| 1 | ⚠︎ **Simp Board does not mount on the homepage** | Still broken, new hashes: home pins `sha384-knpSSXvq…`, the Worker serves `sha384-8rhmxg+ko…` (55,676 b). The browser refuses the script. `dasha-live-verify` now reports this as `board-sri-pin-mismatch` instead of nobody noticing. | #11 |
| 2 | ✅ `www.getdasha.com/simp` → **200** | Restored. | — |
| 3 | ⚠︎ `/bounties` + `/bounties.json` → 404 | Both confirmed 404. `bounties-feed.json` is on disk, untracked. | Webflow page restore |
| 4 | ⚠︎ `lobby.getdasha.com/price` → 404 | Route is in root's Worker source; the deployed build lacks it. | #11 |
| 5 | ⚠︎ `lobby.getdasha.com/forum` → 404 | Same. | #11 |
| 6 | ⚠︎ Homepage links to **1** dead URL, not 3 | `/simp` and `/bounties` are gone from live nav; **`/graph` remains and 404s**. It exists in no tree's source, no Worker route, and no doc — a Designer edit pointing at a page that was never built. `dasha-live-verify` now fails on it (`home-links-dead-routes`). | Webflow nav edit + publish auth |

> **Live home is not any tree's landing page.** It now carries dasha-2's board pin (`knpSSXvq…`) and
> a nav link to `/graph` that appears in no tree's source. Designer edits do not pass through
> `dasha-ship.mjs`, its SRI drift guard, or any file-hash gate — which is why both defects above
> survived every green check until 2026-08-17, when the two checks that catch them were added to
> `dasha-live-verify.mjs`.

**Smallest fix for 1, 4, 5:** the `dasha-2` worktree already has migrations Cloudflare accepts. If it
copies root's `dasha-lobby-static-gen.mjs` and deploys, live serves bytes matching the published pin.
One file, no merge, no money code moved, no DO migration change.

---

## P1 — root causes (these regenerate the P0s)

| # | Item | Detail |
|---|---|---|
| 7 | **Two trees deploy one production Worker** | root `/home/potter` vs `.grok/worktrees/potter/dasha-2`. Disjoint features: root has `/price` + `/forum`; dasha-2 has `/faucet` + `DashaFaucet` DO. Neither is a superset. Whoever deploys last wins. Caused this outage and the 2026-08-11 one. |
| 8 | `wrangler deploy` walks past the publish lock | `/tmp/dasha-publish.lock` only guards publishes routed through `dasha-ship.mjs`. |
| 9 | Root cannot deploy at all | Root's `dasha-lobby-wrangler.jsonc` knows migration `v1`; live is at `v2` (`new_sqlite_classes: ["DashaFaucet"]`). CF error 10074. |
| 10 | Two `dasha-desk` checkouts differ by a commit | `/home/potter/dasha-desk` canonical vs `/home/potter/work/dasha-desk` |
| 11 | **Decide which tree owns the Worker** | Everything above collapses into this one decision |
| 47 | Delete the losing worktree once #11 lands | Two deployers is the defect; one decision plus one deletion ends it |

---

## P2 — decisions only the operator can make

| # | Decision | Context |
|---|---|---|
| 12 | **Is the faucet treasury meant to be funded?** | `/faucet/status` still 200: `configured:true`, `signer:true`, `funded:false`. A signing key is live in production; the jar is empty so nothing can move. Exposure begins on funding. |
| 13 | Retire or keep the old Studio | `dasha-meme.html` is built and tested (9,510 b vs 230,126 b). The 08-15 direction call said Studio stays active. |
| 14 | PR #71 disposition | Keep the `/simp` work, drop the home remount, drop the `/studio` `/dasha` `/desk` redirects. |
| 15 | Posting-age index: named or aggregate? | Naming Astranis/Figma/Brex/Anthropic/Hightouch with day counts is a different product and invites disputes. |
| 16 | Demigod: paused or active? | `AGENTS.md` says paused; nearly every commit for days is Demigod DIE work. |
| 48 | What is `/graph` supposed to be? | Either build the page or strip the nav link — both need a Webflow edit and publish auth. Until then #6 fails the gate, correctly. |

---

## P3 — prepared, waiting on an authorized publish

| # | Item | State |
|---|---|---|
| 17 | Dasha Webflow publish | `dasha:check` green 2026-08-17; six surfaces pending (`home`, `studio`, `lobby`, `deskShell`, `desk`, `deskRetiredRepair`). Halted at the Worker deploy. |
| 18 | Demigod CDN publish | disk v1103 vs live v1101, **64.1h** lag, `sibling asset drift NEEDS REVIEW: atlas, mapData` |
| 19 | `dasha-meme.html` | built + tested, not routed, not published |
| 20 | Posting-age index | `demigod-posting-age-index.mjs` emits the fragment; no page hosts it |
| 21 | Demigod `og:*` dedupe | on disk in `demigod-foot-core.js`, needs a CDN foot publish |

---

## P4 — defects with a known fix, not yet done

| # | Item | Note |
|---|---|---|
| 22 | Demigod serves **no canonical tag on any route** | `/`, `/apply`, `/companies`, `/pricing`, `/about`. Injected by `openPage()`, so they exist only after JS. Durable fix is per-page canonical in Webflow page settings. |
| 23 | Demigod: 3–4 conflicting `og:description` per page | Disk dedupe landed; needs publish (#21) |
| 24 | Demigod: 2 of 3 homepage mailto links 404 | `/cdn-cgi/l/email-protection` with no hash payload |
| 25 | Demigod CDN assets load without `integrity=` | `foot-latest.js` (432KB) and `head-latest.css` |
| 26 | `/simp` has no canonical tag | Now that it serves 200 again, this is live and unfixed |
| 27 | → merged into #48 | |
| 28 | ⚠︎ `DASHA-NOW.md` still generated from an Aug 12 manifest | Reads as current state, is not — and still tables studio/desk/lobby, which the pivot retired |
| 49 | ⚠︎ `/simp` and `/chess` missing from `dasha-sitemap.xml` | `sitemapMissing` on every live-verify run |
| 50 | ⚠︎ `canonicalMetadata:false` on live | Prepared canonical + `og:url` are not published |
| 51 | ⚠︎ `studioThinOk:false` | Studio is not the thin Worker loader; or retire it per #13 |

---

## P5 — repo hygiene

| # | Item | Size |
|---|---|---|
| 29 | ⚠︎ **74** untracked paths | Includes shipping code: `dasha-listings-identity.mjs`, `dasha-simp-share-html.mjs`, `demigod-company-liveness.mjs`, `demigod-corpus-defects.mjs`, four `systemd-user/*.service` units |
| 30 | ✅ Unpushed commits: **2**, not ~45 | Stale claim corrected |
| 31 | ✅ `dasha-meta`: **8 → 3** hard fails | `ship-readback-test`, `domain-runbook-current`, `publish-retired` and `landing-sitemap-link` all resolved — `dasha-ship-readback.test.mjs` exists and is tracked. Remaining three below. |
| 32 | `dasha-docs-links` failures in mirrors | `demigod-ops-23/` and `work/` stale copies |
| 33 | Bus + truth receipts live in `/tmp` | Coordination history erased by a reboot |
| 34 | 606 `.mjs` files, 165 registered tools | `/ponytail-audit` exists for exactly this |
| 52 | ⚠︎ `src/` is **45 GB** untracked in `$HOME` | Largest single thing on disk. Keep / move / delete — and note `git clean -xfd` here is what wiped this machine on 2026-08-02 |
| 53 | ⚠︎ `demigod-ops-23/` 111 MB, `demigod-ops-255/` 432 KB | Stale mirrors; also the cause of #32 |
| 54 | ⚠︎ `demigod-site-cdn/` — 305 files, 105 MB | Historical `foot-vNNN.js`. Keep a window, drop the rest |
| 55 | ⚠︎ `work/` 4.9 MB | Third copy of `foot-*.js`, second `dasha-desk` |
| 56 | ⚠︎ `DEMIGOD-ROLE-LEDGER.json` — 12.8 MB, mode 0600, untracked | One `rm` from gone; decide durable storage |
| 57 | Three stale backups | `dasha-ship.mjs.worker-tree-backup`, `dasha-studio-embed-build.mjs.pre-migration`, `dasha-studio-embed-build.mjs.worker-loader-backup` |
| 58 | `slop-agent-inbox/` 2 MB, `tmp-die-c/`, `terminals/`, `.tmp-agent-bus/`, `.grokbot/` | Track or ignore; currently neither |
| 59 | ⚠︎ 98 modified tracked files, dirty across sessions | Real drift hides in the noise |

**`dasha-meta` — three hard fails left**, all the same shape: the gate asserts artefacts that do not
exist. Writing stubs to turn a check green is worse than the red. **Build the three or delete the
three checks.**

| Check | Wants | Reality |
|---|---|---|
| `meta-doc` | `DASHA-META.md` | never written |
| `context-scripts` | `dasha-peer-ping.mjs` | never written |
| `script-audit-tools` | `dasha:audit:tools` | no `dasha-audit-tools.mjs` to point it at |

---

## P6 — follow-ups created by session work

| # | Item |
|---|---|
| 35 | Put `/simp` back in `dasha-sitemap.xml` and `SITEMAP_REQUIRED` — see #49, now measured |
| 36 | `demigod-foot-core.js` `og:*` dedupe is client-side only — second crawl wave at best |
| 37 | Posting-age index needs a host page; `/startups` already ranks and carries the dataset |
| 38 | Neighborhood pages need geocoding first: all 2,754 companies are `locationPrecision:"city"` with **zero coordinates**. A project, not a join. |
| 39 | Studio funnel instrument measures a retired, redirected surface |
| 40 | Verify indexing recovers now that `/airdrop` `/earn` `/claim` 308 |

---

## P7 — opportunities (researched 2026-08-16, not started)

| # | Item | Why |
|---|---|---|
| 41 | Publish the posting-age index | Original data tables earn ~4.1x more AI citations; quarterly-refreshed pages ~502% more ChatGPT referral traffic |
| 42 | Essay pipeline (RSS + OG + JSON-LD) | Demigod's four essays have no feed; Dasha has none despite a bible full of publishable writing |
| 43 | Demigod measurement | Zero analytics of any kind on that domain |
| 44 | Consent receipt | `demigod-taste-prior.mjs` consumes an opt-in Dasha receipt that nothing issues |
| 45 | Demigod submit endpoint | WIZ answers go to the Webflow mailer and get re-parsed out of Gmail dumps |
| 46 | SRI on Demigod's CDN injections | Port the pattern Dasha already runs |

---

## P8 — Demigod DIE contracts, tests, and hiring data (added 2026-08-17)

`node demigod-die-contracts-check.mjs`: **8 enforced, 0 violated, 22 unwired of 30.** Each unwired
section is prose in `docs/die/CONTRACTS.md` that no executor answers for.

| # | Item |
|---|---|
| 60 | Wire §1 Company identity · §2 Benchmark document · §3 Operational catalog · §4 Company row |
| 61 | Wire §6 Frozen fields · §7 Accepted-field policy |
| 62 | Wire §12 Research projection entry point · §13 Company packet · §14 Company table · §15 Company waterfall |
| 63 | Wire §16 Private memo · §17 Writeback preview · §18 Supported command surface · §19 Decision rehearsal |
| 64 | Wire §20 Role Mission · §21 Evidence bill · §22 Mutual projection · §23 Mission scenario |
| 65 | Wire §24 Candidate evidence assertion · §25 Correction and withdrawal · §27 Review-note references · §28 Workbench |
| 66 | Make the unwired count itself a gate — it can currently grow without failing anything |
| 67 | **112 of 221 `*.test.mjs` are referenced by no main runner.** Wire or delete, per file |
| 68 | `demigod-verify-all.mjs` does not run `demigod-role-mission-kernel.test.mjs` — the test that caught the 08-17 regression |
| 69 | `demigod-verify-all.mjs` does not run `demigod-hiring-shape.mjs --selftest` |
| 70 | Wire `demigod-die-contracts-check.poison.test.mjs` and `demigod-die-activity-shape.test.mjs` |
| 71 | Extend the "assert checks actually ran" guard from `verify-source` to `verify-all` |
| 72 | Live map row `yc:10x` projects `lastAttempt:"missing"` — the producer records `openRolesAt` without recording whether the read succeeded. Fix at the producer, not the projector. |
| 73 | Backfill `lastAttempt` across existing rows instead of inferring it forever in the packet |
| 74 | Audit every ATS parser for the HTML-entity bug just fixed in Greenhouse |
| 75 | Build a per-ATS pay-support matrix — 166 of 471 boards are structurally silent, and that number belongs in one place |
| 76 | Surface `hiring: insufficient-signal` distinctly in the directory UI, now that a missing mix no longer reads as a counted zero |

---

## P9 — ponytail debt (118 markers on disk, ~30 unique)

| # | Item |
|---|---|
| 77 | `demigod-x-hiring.mjs` — CDP client duplicated ~30 lines from `demigod-conversion-audit.mjs` |
| 78 | `demigod-lead-collect.mjs` — hand-maintained denylist, whack-a-mole by construction |
| 79 | `demigod-startup-jobs-enrich.mjs` — naive registrable-label parsing; use the public suffix list |
| 80 | `demigod-ats-providers.mjs` — Personio XML by regex |
| 81 | `demigod-matching-engine.mjs` — linear scan at 13.6k rows |
| 82 | `demigod-evidence.mjs` — unsigned chain capped at 1,000; checkpoints before 10k |
| 83 | `demigod-directory-static.mjs` — 50KB footer ceiling needs pagination |
| 84 | `demigod-events-app.mjs` — flat private-store list, no index |
| 85 | `demigod-company-research-benchmark.mjs` — one retry, fixed gap, no backoff |
| 86 | `demigod-submissions-lib.mjs` — regex PII scrub, not NER |
| 87 | `demigod-pairs-lib.mjs` — `roleId` is one immutable search; needs a version id |
| 88 | `dasha-simp-actions.mjs` — linear code scan, fine until the Board reaches thousands |

---

## P10 — Dasha faucet and gates (added 2026-08-17)

| # | Item |
|---|---|
| 89 | Wire `dasha-faucet.test.mjs` + `dasha-faucet-ux.test.mjs` into `dasha:check` — both untracked, run by nobody |
| 90 | Test the 30-day cooldown boundary |
| 91 | Test the 48/day and 12/hour caps |
| 92 | Test the min-X-account-age-7d rejection |
| 93 | Test the auto-pause trigger and its recovery path |
| 94 | Close out `docs/exchange/DASHA-FAUCET-AUDIT-2026-08-17.md` and the UX checklist — task or kill each finding |
| 95 | Wire the orphan Dasha tests: `dasha-meme`, `dasha-simp-score`, `dasha-simp-share`, `dasha-simp-donate`, `dasha-listings-identity` |
| 96 | Decide on `dasha-og-23-keep.py` and `site-hunt.py` — track or delete the one-offs |
| 97 | CDP Chrome is down (`~/agent-dev.sh up`); every browser-evidence gate is blocked until it is up |
| 98 | Demand queue: 1 warm lead overdue 4 days, 2 quarantined, `drafts.hygiene=unknown` |

---

## Done 2026-08-17

- `dasha-live-verify.mjs` gained two checks for the class of defect nothing was catching: every
  internal link on live home must resolve (`home-links-dead-routes`, currently `/graph→404`), and
  home's board SRI pin must equal the bytes the Worker serves (`board-sri-pin-mismatch`, currently
  `knpSSXvq…` vs `8rhmxg+ko…`). Both are Designer-introduced and pass every file-hash gate. A parse
  failure on the pin warns rather than reading as "no mismatch found".
- `demigod-role-mission-kernel.test.mjs`: fixed a fixture that asserted a zero count is stripped,
  which stopped being true once the packet started projecting `lastAttempt`. It now pins both halves
  — a zero without a finished read is stripped, a zero with one survives.
- Verified green afterwards: `npm run dasha:check`, `npm run demigod:verify:source`, `bin/dg truth`,
  `node demigod-die-contracts-check.mjs`.

## Done 2026-08-16

`e02a8ab` Codex's staged DIE slice · `ee20e8a` live-verify stops following redirects, site-hunt
tracked and wired · `c0ba6ad` posting-age index · `7369dcd` D1 reconciled to the direction call ·
`4874028` built clients committed, deploy guard clear · `51eb492` `dasha-meme.html` ·
`0402538` `/faucet` corrected from trap to product, site-hunt moved to post-publish verify.
