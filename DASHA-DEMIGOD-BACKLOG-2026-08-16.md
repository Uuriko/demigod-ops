---
status: snapshot
canonical_for: nothing
generated_by: claude
generated_at: 2026-08-16
---

# What needs finishing — Dasha + Demigod

Compiled from a live audit on 2026-08-15/16. **A snapshot, not a source of truth.** Live truth stays
`node dasha-live-verify.mjs` and `bin/dg truth`. Every item says what proves it done.

Nothing in this file authorizes publishing, outbound messages, or money movement.

---

## P0 — broken on live right now

| # | Item | Evidence | Blocked by |
|---|---|---|---|
| 1 | **Simp Board does not mount on the homepage** | Home pins `sha384-3yeE9TB…`; Worker serves `sha384-knpSSXvq…` (54,960 b). Browser refuses the script. | #11 |
| 2 | `www.getdasha.com/simp` → 404 | First-class surface per the 2026-08-15 direction call | Webflow page restore |
| 3 | `www.getdasha.com/bounties` + `/bounties.json` → 404 | Roadmap D5/D9/D13/D14 all assume it exists | Webflow page restore |
| 4 | `lobby.getdasha.com/price` → 404 | Route exists in root's Worker source; deployed build lacks it | #11 |
| 5 | `lobby.getdasha.com/forum` → 404 | Same | #11 |
| 6 | Homepage links to 3 dead URLs | site-hunt P1: `/simp`, `/graph`, `/bounties`. **`/graph` exists nowhere** — not in root's `dasha-landing.html`, not in dasha-2's, and not as a route in either Worker. Live's nav (`simp · chess · graph · how-to-buy`) and footer both link it. It is a Webflow Designer edit pointing at a page that was never built. | Webflow nav edit |

> **Live home is not any tree's landing page.** It carries root's board SRI pin (`3yeE9TB…`,
> dasha-2's landing pins `knpSSXvq…`), so root's paste is underneath — but the nav and footer links
> to `/simp`, `/graph` and `/bounties` appear in no tree's source. They were added in the Webflow
> Designer on top of the paste. That is the hazard the "publish only through `dasha-ship.mjs`" rule
> exists for: Designer edits do not go through the SRI drift guard, and they can add links to pages
> that do not exist.

**Smallest fix for 1, 4, 5:** the `dasha-2` worktree already has migrations Cloudflare accepts. If it
copies root's `dasha-lobby-static-gen.mjs` and deploys, live serves the bytes the published homepage
already pins. One file, no merge, no money code moved, no DO migration change.

---

## P1 — root causes (these regenerate the P0s)

| # | Item | Detail |
|---|---|---|
| 7 | **Two trees deploy one production Worker** | root `/home/potter` vs `.grok/worktrees/potter/dasha-2`. 36 diff hunks, 585 root-only lines, 435 theirs. Disjoint features: root has `/price` + `/forum`; dasha-2 has `/faucet` + `DashaFaucet` DO. Neither is a superset. Whoever deploys last wins. Caused this outage and the 2026-08-11 one. |
| 8 | `wrangler deploy` walks past the publish lock | `dasha-ship.mjs`'s `/tmp/dasha-publish.lock` only guards publishes that go through `dasha-ship.mjs`. 10 raw deploys landed on 2026-08-16 between 03:44 and 05:21. |
| 9 | Root cannot deploy at all | Root's `dasha-lobby-wrangler.jsonc` knows migration `v1` only; live is at `v2` (`new_sqlite_classes: ["DashaFaucet"]`). Deploy fails with CF error 10074. |
| 10 | Two `dasha-desk` checkouts differ by a commit | `/home/potter/dasha-desk` canonical vs `/home/potter/work/dasha-desk` |
| 11 | **Decide which tree owns the Worker** | Everything above collapses into this one decision |

---

## P2 — decisions only the operator can make

| # | Decision | Context |
|---|---|---|
| 12 | **Is the faucet treasury meant to be funded?** | `/faucet/status`: `configured:true`, `signer:true`, `funded:false`, treasury `DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb` empty. 100 $dasha/claim, 30-day cooldown, 48/day, 12/hour, min X age 7d, auto-pause. A signing key is live in production; the jar is empty so nothing can move. Exposure begins on funding. |
| 13 | Retire or keep the old Studio | `dasha-meme.html` is built and tested (9,510 b vs 230,126 b). The 2026-08-15 direction call said Studio stays active, so replacing it reverses that call. |
| 14 | PR #71 disposition | Per rewritten D1: keep the `/simp` work, drop the home remount, drop the `/studio` `/dasha` `/desk` redirects. |
| 15 | Posting-age index: named or aggregate? | Naming Astranis/Figma/Brex/Anthropic/Hightouch with day counts is a different product and invites disputes. |
| 16 | Demigod: paused or active? | `AGENTS.md` says paused; nearly all recent work is Demigod DIE. |

---

## P3 — prepared, waiting on an authorized publish

| # | Item | State |
|---|---|---|
| 17 | Dasha Webflow publish | prep done, fast gate green, preflight green, **halted at the Worker deploy**. `pushed:{} published:false`. |
| 18 | Demigod CDN publish | disk v1103 vs live v1101, ~35h lag, `sibling asset drift NEEDS REVIEW: atlas, mapData` |
| 19 | `dasha-meme.html` | built + tested, not routed, not published |
| 20 | Posting-age index | `demigod-posting-age-index.mjs` emits the fragment; no page hosts it |
| 21 | Demigod `og:*` dedupe | in `demigod-foot-core.js` on disk, needs a CDN foot publish |

---

## P4 — defects with a known fix, not yet done

| # | Item | Note |
|---|---|---|
| 22 | Demigod serves **no canonical tag on any route** | `/`, `/apply`, `/companies`, `/pricing`, `/about`. Canonicals are injected by `openPage()` so they exist only after JS. Durable fix is per-page canonical in Webflow page settings. |
| 23 | Demigod: 3–4 conflicting `og:description` per page | Disk dedupe landed; needs publish (#21) |
| 24 | Demigod: 2 of 3 homepage mailto links 404 | `/cdn-cgi/l/email-protection` with no hash payload; JS-off and crawler path. Currently fails `bin/dg ship prepare` via site-hunt. |
| 25 | Demigod CDN assets load without `integrity=` | `foot-latest.js` (432KB) and `head-latest.css`. Dasha already pins + drift-checks its client. |
| 26 | `/simp` will need its own canonical | It served 200 with no `<link rel="canonical">` before it 404'd |
| 27 | Identify what `/graph` is | Linked from the homepage, 404s, appears in no doc |
| 28 | `DASHA-NOW.md` dirty, generated from an Aug 12 manifest | Reads as current state, is not |

---

## P5 — repo hygiene

| # | Item | Size |
|---|---|---|
| 29 | 63 untracked source files | `DEMIGOD-ROADMAP.md`, `SITE-HUNT.md`, `dasha-lobby-github.mjs` + test, `demigod-bounty-auth.test.mjs`, `docs/die/research/*`, ~30 `docs/exchange/*` |
| 30 | ~45 commits unpushed | Protected from `git clean`, not from disk loss |
| 31 | `dasha-meta.mjs`: **14 → 8** hard fails | Six fixed 2026-08-16. The eight left are triaged below — six of them are the gate asking for files nobody ever wrote. |

**`dasha-meta` triage, 2026-08-16.** Fixed, because the thing being asked for existed and was
simply unwired: `script-audit-live` and `script-meta` (npm aliases for tools already on disk),
`docs-lobby-live` and `metadata-contract` (`DASHA-DOCS.md` now names the `lobby.getdasha.com` host
and the `dasha-webflow-metadata.mjs` contract), `workflow-ship` (`DASHA-WORKFLOW.md` now documents
the one ship path and why publishing around it kills the board), and `legacy-headers` (the five
`dasha-call-webflow-*.mjs` direct publishers now carry quarantine headers — they bypass the gate,
the publish lock and the SRI guard, which is exactly how the board died twice).

Not fixed, deliberately — **the gate is asserting artefacts that do not exist**, and writing stubs
to turn a check green is worse than the red:

| Check | Wants | Reality |
|---|---|---|
| `ship-readback-test` | `dasha-ship-readback.test.mjs` | never written |
| `domain-runbook-current` | `DASHA-DOMAIN-RUNBOOK.md` | never written |
| `context-scripts` | `dasha-peer-ping.mjs` | never written |
| `script-audit-tools` | `dasha:audit:tools` | no `dasha-audit-tools.mjs` to point it at |
| `meta-doc` | `DASHA-META.md` | never written |
| `publish-retired` | `bin/dasha-publish` | never written |

Two are real gaps, not phantoms: `ship-readback` wants `readbackSurface` / `push:readback` in
`dasha-ship.mjs` — a genuine unimplemented feature (read back what Webflow stored and compare to
what was sent, which roadmap S3 also asks for), and `landing-sitemap-link` wants
`dasha-landing.html` to reference `lobby.getdasha.com/sitemap.xml`, which may itself be stale now
that www serves its own sitemap.

Either build the six, or delete the six checks. A gate that has demanded six non-existent files
long enough for everyone to learn to ignore it is not a gate.
| 32 | `dasha-docs-links` failures in mirrors | `demigod-ops-23/` and `work/` stale copies |
| 33 | Bus + truth receipts live in `/tmp` | 454 messages of coordination history, erased by a reboot |
| 34 | 606 `.mjs` files, 165 registered tools | `/ponytail-audit` exists for exactly this |

---

## P6 — follow-ups created by this session's work

| # | Item |
|---|---|
| 35 | Put `/simp` back in `dasha-sitemap.xml` and `SITEMAP_REQUIRED` **the same change that restores the page** |
| 36 | `demigod-foot-core.js` `og:*` dedupe is client-side only — second crawl wave at best |
| 37 | Posting-age index needs a host page; `/startups` already ranks and carries the dataset, but baking numbers into the foot means a sync-and-check step like `demigod-blog-sync` |
| 38 | Neighborhood pages need geocoding first: all 2,754 companies are `locationPrecision:"city"` with **zero coordinates**. It is a project, not a join. |
| 39 | Studio funnel instrument measures a retired, redirected surface |
| 40 | Verify indexing recovers now that `/airdrop` `/earn` `/claim` 308 |

---

## P7 — opportunities (researched 2026-08-16, not started)

| # | Item | Why |
|---|---|---|
| 41 | Publish the posting-age index | Original data tables earn ~4.1x more AI citations; quarterly-refreshed pages ~502% more ChatGPT referral traffic; brands are ~6.5x more likely to be cited via third parties. 85% of recruiting business comes from referral and word of mouth. |
| 42 | Essay pipeline (RSS + OG + JSON-LD) | Demigod's four essays have no blog RSS; Dasha has no blog despite a bible full of publishable writing |
| 43 | Demigod measurement | Zero analytics of any kind on that domain |
| 44 | Consent receipt | `demigod-taste-prior.mjs` consumes an opt-in Dasha receipt that nothing issues |
| 45 | Demigod submit endpoint | WIZ answers go to the Webflow mailer and get re-parsed out of Gmail dumps by `demigod-gmail-forms.mjs` |
| 46 | SRI on Demigod's CDN injections | Port the pattern Dasha already runs |

---

## Done this session

`e02a8ab` Codex's staged DIE slice · `ee20e8a` live-verify stops following redirects, site-hunt
tracked and wired · `c0ba6ad` posting-age index · `7369dcd` D1 reconciled to the direction call ·
`4874028` built clients committed, deploy guard clear · `51eb492` `dasha-meme.html` ·
`0402538` `/faucet` corrected from trap to product, site-hunt moved to post-publish verify.
