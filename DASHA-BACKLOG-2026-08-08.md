# Dasha task backlog

Status: working backlog · Owner: operator · Updated: 2026-08-08

One list of everything that could be worked on next, with the evidence for why it is on the list.
Not a plan — a menu. [`DASHA-ROADMAP.md`](DASHA-ROADMAP.md) still owns what is *tested* and in what
order; this owns what is *available*.

Effort marks: **S** under an hour · **M** a session · **L** multi-session · **?** unknown until scoped.
Items marked **AUTH** need explicit authorization in the moment (publishing, outbound posts, forms,
money). Nothing here grants it.

---

## Blocked on the operator — two things, both Webflow UI toggles

Everything else in the P-list is done. `node dasha-discovery.test.mjs` is down from nine live
failures to these two, and neither is reachable from the Webflow Data API.

| # | Action | Where |
| --- | --- | --- |
| **P3** | Paste the robots.txt | Webflow → Site settings → SEO → robots.txt. Exact text: [`dasha-robots.txt`](dasha-robots.txt). Live file is 200 with an empty body. |
| **P4** | Turn on the sitemap | Webflow → Site settings → SEO. `/sitemap.xml` is a 404 today. All three real pages are already flagged `includeInSitemap: true` and both retired drafts are correctly excluded, so this is one toggle. Use [`dasha-sitemap.xml`](dasha-sitemap.xml) if you prefer a custom one. |

Still needing a decision rather than a keystroke:

| # | Action | Why it waits |
| --- | --- | --- |
| **P8** | DexScreener / CoinGecko / CMC / Jupiter submissions | Section C. Money and outbound forms. Jupiter Express burns 1,000 JUP. |
| **P9** | Run Transmission 001 | Section F56. A public prompt and a promise to acknowledge every first submission by the next day. |

Done this session: **P1** site published and verified on all nine surfaces · **P2** share card
re-uploaded and byte-matched, plus the Webflow SEO/OG descriptions that still carried the removed
disclaimer copy · **P5** Desk repo pushed · **P6** five new starter issues with file pointers and
verify commands · **P7** the Studio is in the public repo, generated and drift-gated, with CI
running its checks on every pull request.

---

## A. Contradictions and stale rules — cheapest, do first

These are places where the repo currently tells the next person to do something we no longer do.

1. ✅ **done** `DASHA-ROADMAP.md` guardrail required "prominent loss-risk disclosure". Contradicts the
   2026-08-08 no-disclaimers decision. Same file, "Phase 0 → adjacent mint and risk disclosure".
2. ✅ **done** the generated embed header said "the risk disclaimers are inside this
   fragment and must not be removed" — the generated embed repeats it into every pasted copy.
3. ✅ **done** `dasha-live.test.mjs` header listed "total-loss risk" among the promises it protects.
4. **S** `DASHA-DEX-SUBMISSION.md` team/description copy predates the official-project decision; re-read
   end to end for other unaffiliated-era phrasing.
5. **S** `docs/LOOP-PROMPT-2026-08-06-*.md` and `DASHA-CODE-DESIGN-REVIEW-2026-08-08.md` still quote the
   removed lines. Harmless as history — but only if they are labelled history (see D2).
6. **M** Sweep every doc for "unofficial", "not affiliated", "association is not endorsement" and decide
   each one: history (label it) or instruction (fix it).
7. **S** `DASHA-CHARACTER.md` Zeroed expression rationale rewritten; check the rest of the file for other
   references to copy that no longer exists.

## B. Discoverability — the site is invisible to machines

Measured live on 2026-08-08.

8. 🔒 **P4** `https://www.getdasha.com/sitemap.xml` returns **404**. `dasha-sitemap.xml` exists in the repo
   and is not served. Webflow can generate one, or upload ours.
9. 🔒 **P3** `robots.txt` returns 200 with an **empty body**. Exact text ready in `dasha-robots.txt`. No `Sitemap:` line, no rules.
10. ✅ **done, pending publish** structured data on all three routes; the Studio's sits in the light DOM because its shadow root is invisible to crawlers. Was: Add `WebSite` + `SoftwareApplication` (Studio) +
    `Organization`. Cheap, and it is what AI search surfaces read.
11. ✅ **done** — and it found the live card is a stale upload (**P2**). Was: — cards exist on all three routes but nothing
    checks the image resolves and is 1200×630 at the CDN.
12. ✅ **done** `dasha-discovery.test.mjs` fetches each card, checks 200/PNG/1200×630 **and** byte-compares it against `dasha-social-card.png`. Was: The card
    silently 404-ing is invisible until someone posts a link.
13. **M** Per-route OG images. All three currently share one card; a Studio-specific and Desk-specific
    card would make shared links legible.
14. **S** No `<meta name="description">` audit — check length (150–160) and uniqueness per route.
15. **M** Google Search Console + Bing Webmaster: submit the sitemap, watch coverage. **AUTH** (account
    linking).
16. **M** Nothing measures whether pages are indexed at all. A weekly check of `site:getdasha.com`
    result count would catch a deindex.
17. **?** Investigate whether Webflow is serving correct `Cache-Control` and `Last-Modified` — the ship
    tool sees 304s, so caching is on, but nobody has checked the TTLs.

## C. Aggregator and exchange presence — the discovery gap already diagnosed

From [`DASHA-DISCOVERY-2026-08-07.md`](DASHA-DISCOVERY-2026-08-07.md); still open.

18. **M** DexScreener **Enhanced Token Info** — logo, description, socials, website. This is the single
    highest-leverage listing because it is what every chart visitor sees. **AUTH** (paid + outbound).
19. **M** CoinGecko listing request. Requires website, socials, contract, logo. **AUTH**.
20. **M** CoinMarketCap listing request. Same. **AUTH**.
21. **L** Jupiter verification. Research (2026): submit at `verified.jup.ag/tokens`; criteria are a high
    **organic score** (non-bot trading) and **social support** measured by smart followers on the
    project's X. Free standard review has no timeline; Express costs **1,000 JUP burned** for a
    guaranteed 24h review with 3 reconsideration cycles. Verification is explicitly *not* an
    endorsement. **AUTH** (money + outbound).
22. **S** Prepare the submission pack once so all four go out together: 256×256 and 512×512 logo,
    one-line and paragraph descriptions, socials, contract, website. Zero-cost, unblocks all of C.
23. **S** Solana token metadata: confirm the on-chain metadata URI resolves and carries the current
    mark. If it points at a dead host, every wallet shows a blank token.
24. **M** Birdeye / Solscan token info submission — same pack, more surfaces.
25. **?** Check whether the mint's metadata is mutable and who holds update authority. Affects 23.

## D. Documentation system — the sprawl is now the problem

`DASHA-DOCS-SYSTEM-BACKLOG.md` has ~30 unchecked P0/P1 items. The highest-value subset:

26. **M** Add `Status / Owner / Updated / Supersedes / Superseded by` headers to every strategic doc.
27. **M** Label every dated file as evidence, decision record, review or history — never "current".
28. **M** Reduce to one brief, one roadmap, one possibility map, one evidence index. There are currently
    40+ `DASHA-*.md` files at repo root.
29. **S** Make `DASHA-DOCS.md` the only entry page; `DASHA-DOC-OF-DOCS-2026-08-08.md` the registry.
30. **M** Resolve the contradictory claims about Discord (current vs gated vs nonexistent).
31. **M** Resolve contradictory claims about whether Simp Board is live, prepared, or specified.
32. **S** Visible warning banner on scrapped docs, or move them under `archive/`.
33. ✅ **done** `dasha-docs-links.test.mjs` — 499 local links across 423 files, all resolving. Was: Link rot is already present.
34. **M** A gate that fails when two "current" docs disagree on a fact in a controlled list (mint,
    official status, live routes).

## E. The open-source project — the funnel is empty

Live state: 0 stars, 0 forks, 3 open issues, 0 merged non-operator PRs. Topics and license are set.

35. 🔒 **P6** More `good first issue` items. Three is not a funnel. Research is consistent that structured
    starter issues plus responsive review are what convert first-timers.
36. **M** Each starter issue needs: the file, the exact change, how to verify, and how long it takes.
    "docs: improve README" is not actionable enough to convert a stranger.
37. **M** A `CONTRIBUTING.md` path that works entirely in the GitHub web UI — no clone, no toolchain.
    Already an open issue (#8); the screenshot is the blocker.
38. **M** A visible "first contribution" acknowledgement ritual. The roadmap already identifies
    first-contribution acknowledgement as better-supported than ranks or points.
39. **S** Repo description + topics are good; add `memecoin`, `meme-generator`, `canvas`, `cc0`.
40. **M** A `good-first-issue` aggregator presence (goodfirstissue.dev, up-for-grabs.net) — free
    inbound. **AUTH** (outbound submission).
41. 🔒 **P7** Move the **Studio** into the public repo. It is the interesting artifact and it is currently
    private; the public repo only has the Desk. This is the single biggest change to what the project
    *is* to an outsider.
42. ✅ **done (pending P5 push)** `dasha-desk/docs/ARCHITECTURE.md`. Was:: how build.mjs works, why the embed is generated, what
    the gates protect. Contributors cannot help with what they cannot see the shape of.
43. **S** Pin an issue explaining what the project is and what help is wanted.
44. **M** Enable and seed Discussions with 3–4 real threads (Discussions is on, and empty).
45. **?** `bash .github/seed-issues.sh` is staged and has never been run. Decide: run, rewrite, or
    delete. Leaving a loaded script staged indefinitely is its own hazard.
46. **M** CI on the public repo: run the Desk gates on every PR so a first-timer gets green/red without
    asking. Check whether Actions is configured at all.
47. **S** `CODEOWNERS` so review requests route automatically.
48. **M** Issue and PR templates that ask for the one thing review actually needs.

## F. Studio and product — roadmap-aligned

49. **M** **Speed to first export.** 2026 research is blunt: meme cycles peak and die within hours, and
    the tools that win let someone create and share in seconds. Measure the real time from landing on
    `/studio` to first PNG, then cut it.
50. **M** Preset one-tap lines. Typing is the slowest step; a row of ready captions removes it.
51. **M** Paste-an-image support, so a user's own photo can carry a Dasha look. Biggest single expansion
    of what the tool can make — needs a decision on rights and on keeping it fully local.
52. **S** Keyboard shortcuts in the Studio (`1..6` looks, `s` save, `g` GIF).
53. **M** A "surprise me" button — random look + format + line from the pack. Removes the blank-canvas
    problem entirely.
54. **M** Undo/redo, or at minimum a back-to-previous-look control.
55. **M** Studio deep-link presets from the homepage tiles already exist; extend to a shareable
    "starter pack" URL that opens with three variants side by side.
56. **L** Transmission 001 (`make me an alibi`) is specified in the roadmap and not run. Running it is
    the actual next experiment. **AUTH** (public prompt + acknowledgement replies).
57. **M** Relay Lab (`dasha-relay-lab.html`) exists and has never been used against real handoffs.
58. **M** Culture Capsule (`dasha-remix-pack.html`) is built and unpublished. Decide: publish as an
    experiment or archive.
59. **?** GIF export exists; nothing measures whether anyone uses it over PNG.
60. **M** Video/MP4 export. Heavier than GIF, but MP4 is what X actually wants.
61. **M** A `/studio` embed others can paste on their own site — already generated and gated; nobody has
    been offered it. Write the three-line "paste this" page.
62. **L** Farcaster Mini App wrapper. Research (2026): feed discovery puts users one click away, and
    several onchain products got their first real distribution from a Frame in a high-engagement
    channel rather than a campaign. The roadmap correctly gates this behind Relay proving that people
    pass editable state — listed here so the option is visible, not to jump the gate.

## G. Trust and verification surfaces

63. **M** The Desk shows live pair data; nothing shows *staleness*. "Last checked 4 minutes ago" is
    honest in a way a bare number is not.
64. **M** Mint/freeze authority and LP-lock status displayed directly on the Desk, read live rather than
    asserted in copy.
65. **M** A "how to spot a fake $dasha" page. The anti-scam guidance is the copy we kept; it deserves
    more than one line.
66. **S** Add the mint to the page as a copyable + QR form — QR is what people use across devices.
67. **M** Holder-count and top-holder concentration, read live, presented without spin.
68. **?** Whether any of 63–67 belongs on the Desk at all, or fragments its single job.

## H. Design

69. **M** A dark/light decision. Everything is dark; a light variant of the Studio would look different
    in a feed full of dark crypto sites.
70. **M** Motion pass: the site has a ticker and hover transforms and little else. Entry motion on the
    poster tiles would cost ~10 lines.
71. **M** The 🍒 mark is used at one size in one place. A proper usage sheet (favicon, avatar, sticker,
    watermark, loading state) is a half-session and makes the brand feel intentional.
72. **S** `prefers-reduced-motion` is handled; `prefers-contrast: more` is handled for `.stroke` only.
    Audit the rest.
73. **M** Typography: one weight (950) does almost all the work. A second, quieter weight would give the
    long-form copy somewhere to live.
74. **M** Mobile nav hides links below 800px with no replacement. There is no menu — the links are just
    gone.
75. **S** Focus-visible styling exists; tab through all three routes once and confirm order is sane.
76. **M** Empty and error states in the Studio (unsupported browser, canvas blocked, share cancelled).

## I. Engineering quality

77. **M** Home ships **888 KB / 16 requests** on mobile (Studio 44 KB, Desk 297 KB). LCP is fine at
    220ms, so this is not urgent — but the weight is almost entirely Webflow + jQuery + the Jupiter
    plugin, and the Jupiter plugin loads before intent. Defer it to first interaction.
78. **M** Nothing gates page weight. A budget test that fails over N KB would keep it honest.
79. **M** `dasha-contrast.test.mjs` is not in `dasha:test:all` (it is ~4 minutes). Decide where it runs —
    pre-publish hook is the natural home.
80. **M** The Studio's oversized ticker cannot be contrast-measured. A narrower wrapper would make it
    measurable rather than skipped.
81. **M** No visual regression testing. Given how often a republish has silently changed the Studio,
    screenshot diffing the three routes would have caught it four times.
82. ✅ **done** receipts now expire after 30 minutes; verified both paths. Was:: a failed run's receipt made a later `--ship`
    skip publishing and report success-shaped output. `--fresh` works around it; the resume logic
    should expire instead.
83. **M** A scheduled live check. `dasha-live.test.mjs` only runs when someone runs it — and the CC0
    regression lived for hours precisely because nothing was watching.
84. **S** `dasha-desk/dist/` is generated and committed. Confirm that is intentional (Pages needs it) and
    documented, or it will drift.
85. **M** Dependency and secret scanning on the public repo (Dependabot, secret scanning, CodeQL).
86. **?** The divergent Grok worktree is still unresolved and will conflict eventually.
87. **M** `.tmp-dasha-ship/` is gitignored now; check nothing else generated is tracked.

## J. Operations

88. **M** A single `npm run dasha:ship` path documented end to end, so the verified path is the easy one.
    Every CC0 regression came from someone taking a different route.
89. **S** Document the Webflow staged-draft hazard where an operator will see it — a site publish carries
    *anyone's* staged draft, which is what broke /studio a fourth time today.
90. **M** Rotate/verify the Webflow token handling (`/tmp/dasha-wf-token.txt` is world-readable-ish by
    convention; confirm mode).
91. **?** Backup: if Webflow vanished tomorrow, `dasha-landing.html` + the embeds are the site. Confirm
    the static fallback actually stands up on its own.

## K. Explicitly not doing

Kept so they stop being re-proposed. Full reasoning in the roadmap.

- Thesis Card, conviction receipts, forecasting — permanently scrapped.
- Autonomous posting bots — crowded, and they make engagement evidence untrustworthy.
- Paid x402 Culture Compiler — the same output is free locally.
- Generic living objects / tap-reveal toys / runtime marketplace.
- Points, token rewards, accounts or automated ingestion added to rescue a failed creative loop.
- Onchain attribution on unverified contributor labels.

---

## If you want one recommendation

**A (contradictions) + B (sitemap/robots/structured data) in one session.** A is ~30 minutes and stops
the repo arguing with itself. B is the only category where the work is small, entirely in our control,
needs no authorization, and the current state is measurably broken — a 404 sitemap and an empty
robots.txt mean the site is partly invisible to exactly the systems that would send it strangers.

Then **E41** — moving the Studio into the public repo — because it changes what the open-source project
*is* to someone who arrives, and everything else in E is downstream of having something worth
contributing to.
