---
status: working
generated_by: claude
generated_at: 2026-08-18
---

# 60 tasks across both sites, ordered by what is actually blocking what

Every item says whether it is blocked, and by whom. Numbers were measured today unless marked
otherwise. The list is deliberately honest about the fact that **three of the highest-value items on
it are blocked by a single Webflow login**, and that no amount of other work substitutes for it.

## 0. The one blocker

`webflow.com/dashboard/sites/talentlink-sf/custom-code` returns **404** — what Webflow serves when
the signed-in account lacks owner access. `bin/dg-webflow` reads `paste=false publish=false`.

1. **Log into Webflow as the site-owner account** in the Chrome on `:9223`. Unblocks 2, 3, 4, 5, 6.
2. **Paste + ship foot v1104.** Verified on the CDN since yesterday, byte-for-byte.
3. **Enforce SRI.** The live footer has *no* `integrity` attribute. Every SRI check in the repo
   verifies a pin the page does not enforce.
4. **Clear the armed rollback.** Webflow's saved code pins `e0fe769c` (Aug 14 03:20); live serves
   `85246d21` (Aug 14 11:11). Any publish, for any reason, rolls the foot *backwards*.
5. **Publish the 15 staged route fragments** — 12,384 → ~35,000 crawlable characters.
6. **Publish the three data pages** — posting-age, pay-transparency, methodology.

## A. trydemigod.com — data (unblocked, this is where I can work)

7. **596 companies YC says are hiring have no readable board.** The careers-link crawler converts a
   few percent per pass; each pass finds the ones the last one's method could not reach.
8. **Extend discovery to Workable, Recruitee, Personio, SmartRecruiters** — the enrich reads them,
   discovery does not, because they state no owner. Needs a second evidence rule.
9. **Dover appears on 15 of 120 sampled careers pages** and has no public feed. Decide: report-only
   forever, or ask them.
10. **Re-run domain drift on a schedule** and diff. 152 moved / 93 unreachable / 7 expired today;
    the artifact worth having is what *changes*.
11. **Resolve the 152 moved domains** into rebrand / acquisition / parked, with acquisitions
    becoming a parent-child relation rather than a website overwrite.
12. **The 73 failed board reads** — name them, retry them, publish the count.
13. **The 90 blocked hosts.** Brex and Dropbox 403 an unattended fetch. Write the documented stance
    on what a 403 means for a company record and what it must never mean.
14. **Geocode the directory** — 2,754 companies at `locationPrecision: "city"` with no coordinates.
15. **Right-censoring on role lifespan.** "Median 10 days" is an artifact of a 14-day observation
    window. Handle it or refuse the number.
16. **Posting age by ATS provider** — is Greenhouse staler than Ashby? Handed to Freebuff; check it
    landed.
17. **Publish the 129 rewritten posted dates.** Unreproducible, and nobody else holds it.
18. **The `attributed` field never reaches the map rows**, so `/startups` cannot print the
    denominator for its aging count. Plumb it through map generation.
19. **Merge the 3 rebrand duplicates and 5 name duplicates** — 8 decisions, ~10 minutes of human
    review, list is ready in `DEMIGOD-DOMAIN-DRIFT.json`.
20. **Wikidata/LEI cross-identifiers** — GLEIF publishes an open ID-to-LEI file; we hold 626 `wd:`
    rows.
21. **Store the identity key explicitly** instead of deriving it from `website`. The re-key hazard
    is only invisible because the key is implied.
22. **Tombstones for merged rows**, so a merged id resolves rather than 404s.
23. **Quarterly firmographic refresh cadence** — the documented industry norm for catching exactly
    the domain drift found here.

## B. trydemigod.com — the product's claims

24. **Answer the HBR piece.** It published this thesis in August 2026 with no statistics and no
    method. We have 69.1% of 9,600 attributable roles posted over 30 days against an industry-quoted
    one-in-seven. This decays.
25. **`Dataset` JSON-LD** — built, unpublished. Sits at 10K–100K domains, uncrowded.
26. **`Organization` + `BreadcrumbList`** — both live on 10M+ domains; having neither is conspicuous.
27. **FAQPage JSON-LD** — generator wired, round-trip proven, still unpublished.
28. **Per-route canonicals and `og:url`** — 9 routes have no canonical until JS runs; 7 unfurl as the
    homepage.
29. **`/startups` says 501, the map holds 472.** The staged fragment already fixes this.
30. **A citable-claims page** — every number the company will stand behind, each with its command.
31. **Answer-shaped H2s** — the questions people type, with the answer in the first sentence.
32. **Track AI-crawler hits by user agent** over time. The fragment work is worth less if nothing
    reads it.
33. **An MCP server over the dataset** — small build on artifacts already emitted, and a distribution
    channel that did not exist before.
34. **W3C PROV or RO-Crate provenance** for the published dataset.
35. **Decide the dataset licence.** The JSON-LD omits it rather than inventing one, which is right as
    a default and wrong as a permanent state.

## C. getdasha.com — weight and media

36. **The homepage is 4.49 MB against a 2.3 MB median.** 3.4 MB is converted and verified; the
    images are Webflow-hosted, so it is blocked on item 1.
37. **Convert `/client/*` images** once Webflow is reachable — `berlinale.jpg` alone is 1,245 KB.
38. ✅ Simp quiz photos — 786 KB → 260 KB, shipped today.
39. ✅ Social cards — 872 KB → 327 KB and 138 KB → 50 KB, shipped today, still PNG for crawlers.
40. **Wire `dasha-media-build --check` into the Dasha gate** so image weight cannot regress.
41. **Audit every remaining image on every surface**, not just the homepage.
42. **`grwm-loop.mp4` is 616 KB** — check it has a poster, `playsinline`, and is not the LCP element.
43. **A `/how-to-buy` walkthrough video** — the one page where a video file is worth its bytes,
    because buying is a sequence of unfamiliar steps.
44. **SVG sparklines on `/simp`** — the board is numbers over time and currently has zero visuals.
45. **Homepage motion, not more photographs.** 182 characters of text across 7,392 px; CSS and SVG
    cost almost nothing.

## D. getdasha.com — chess (my lane)

46. ✅ Sound, motion, drag, piece contrast, turn indicator, copy cut 447 → 187 chars — shipped today.
47. **Sound for the online board is polled every 400 ms.** It works, but an event would be honest;
    the board rebuilds wholesale, so this needs a real move event first.
48. **Castling and en-passant deserve their own sounds** — they are the moves people misread.
49. **A keyboard user cannot drag.** Selection works; verify the whole flow with a screen reader.
50. **Clock urgency is visual only** — a sound under 30 seconds is the standard cue.
51. **`/chess` has no OG image of its own** — the canvas share card exists for finished games only.
52. **Post-game analysis** — the ledger holds every move; showing where a game turned is the
    difference between a toy and a thing people return to.

## E. Both — hygiene that keeps biting

53. **`demigod-ops-23/` is 111 MB** and shadows this repo; it produced duplicate grep hits in three
    separate investigations today and cost real time.
54. **`src/` is 45 GB untracked.** Never `git clean -xfd` here.
55. **Bus and truth receipts live in `/tmp`** and die at reboot — the same class of loss as the
    worktrees that held the only copy of a commit.
56. **`WEBFLOW_API_TOKEN` 401s on every v2 endpoint**, including `GET /sites/{id}`. Expired; reissue.
57. **`dasha-surfaces` has 9 live failures** — `/lobby`, `/simp`, `/studio` return 308. Pre-existing,
    unrelated to local work, and nobody owns the finding.
58. **`dasha-chess-local` is flaky under puppeteer** — `TargetCloseError` about one run in three,
    on the unmodified page too. Either stabilise it or stop trusting a single green run.
59. **Split `verify-all` into fast and full.** 257 steps is minutes, and slow gates are the ones
    people skip.
60. **The ponytail debt ledger** — 118 markers, ~30 unique, none tracked to a trigger.

## What I would do in what order

Item 1 is worth more than items 7–60 combined, because it is the only one that converts finished
work into shipped work. Six things are already built and verified and cannot reach users.

Failing that, A is where I can work alone, and 7 and 8 are the two that add companies rather than
polish the ones already here.
