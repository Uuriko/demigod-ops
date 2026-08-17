---
status: working
generated_by: claude
generated_at: 2026-08-17
---

# 47 tasks, from what the web says on 2026-08-17

Research-derived, not brainstormed. Each task names the finding that produced it. Where a finding
kills an idea rather than creating one, that is recorded too — a closed direction is worth as much
as an open one and costs nothing to keep closed.

## What the research actually changed

**Four findings reorder the queue.**

1. **HBR published the thesis this month and left the numbers blank.** "What You Can Learn from a
   Competitor's Job Postings" (Aug 2026) argues job postings are "one of the clearest and most
   accessible signals of strategic intent" — and cites no statistics, names no method, gives no
   framework. A top-authority domain just validated the premise and left the evidence slot empty.
   Demigod has 19,355 roles, 2,243 observed closures and a written methodology. That is the gap.

2. **llms.txt is dead and that closes a blocked item.** 10.13% adoption across 300k domains, 39.6%
   of those files plugin stubs; GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot and Google-Extended
   overwhelmingly skip it and crawl HTML directly; Google's Gary Illyes confirmed Google does not
   support it and does not plan to; 8 of 9 sites saw no measurable change. The execution spec lists
   llms.txt as "blocked on hosting — Webflow 404s arbitrary root files". It is not blocked. It is
   not worth doing. **Reclassify, do not build.**

3. **Freshness is the lever we already own.** Perplexity cites content published in the last 30 days
   at an 82% rate and averages 21.87 citations per response — far more citation slots than any other
   engine, so per-slot competition is lower. Demigod's data changes daily and currently says so
   nowhere a crawler can read. Visible, structured dates are the cheapest win available.

4. **The competition for citations is not who we thought.** Reddit, Wikipedia, YouTube, LinkedIn and
   Forbes dominate; journalism is 27% of citations, and UGC dwarfs the top 20 outlets combined.
   Beating Forbes on "SF hiring" is not the play. Being the only source that can answer a specific
   factual question — *how many SF startups actually stopped hiring last month* — is.

Supporting: FAQPage schema shows a 67% citation rate on relevant queries and ~30% lift; JSON-LD is
the format every engine reads; `Dataset` schema is used on only 10K–100K domains, so it is
uncrowded; AI search traffic converts at 14.2% against organic's 2.8%.

## A. Publish-blocked, ready to paste (needs one authorization, not more work)

1. `/startups` says 501 companies; the map holds 471. A false number on the live site.
2. Per-route `<link rel=canonical>` — 9 routes have none until JS runs.
3. Per-route `og:url` — 7 routes unfurl as the homepage; `/companies` has none at all.
4. The 15 staged route fragments: 12,384 → 35,000 crawlable characters.
5. The three staged data pages: posting-age, pay-transparency, methodology.
6. FAQPage JSON-LD — generator wired, round-trip proven, 17 pairs matched, unpublished.
7. Blog JSON-LD (`Article`/`BlogPosting`) with real `datePublished`/`dateModified`.
8. CDN SRI pins and foot v1104.
9. Corrected geography — bare `remote` no longer counted as US.

## B. AI citation surface (research-driven, mostly buildable without publishing)

10. **`Dataset` + `DataCatalog` JSON-LD for the startup map.** Used on only 10K–100K domains; we
    publish an actual dataset. Include `temporalCoverage`, `license`, `creator`, `distribution`.
11. **`dateModified` on every route**, visibly and in JSON-LD — the 82%-within-30-days finding.
12. **A "last updated" line rendered server-side**, not by JS, on every data page.
13. **`Organization` + `sameAs`** so entity resolution has something to bind to.
14. **`BreadcrumbList`** — one of 12 types found on 10M+ domains; its absence is conspicuous.
15. **`StatisticalVariable`-style claim blocks**: one fact, one number, one date, one method link.
16. **A citable-claims page**: every number Demigod will stand behind, each with its command.
17. **Answer-shaped H2s** — the questions people actually type, as headings, with the answer in the
    first sentence beneath.
18. **A crawlable-citation audit**: fetch as each AI UA, assert the headline number is in the bytes.
19. **Track AI-crawler hits** in whatever log surface exists; count GPTBot/ClaudeBot/PerplexityBot.
20. **Do not build llms.txt.** Record the evidence and close it. (Finding 2.)
21. Re-examine the robots policy against the citation goal: training blocked, citation fetchers
    allowed is already correct — confirm no allowed fetcher is accidentally excluded.

## C. The HBR opening

22. **A companion data page to the HBR premise**: the statistics that article does not have.
23. **A method framework** — HBR names none. Ours is written and unpublished.
24. **Worked examples**: three named companies whose posting pattern preceded a known move.
25. **The date-rewrite finding as its own claim.** 129 roles had their posted date rewritten by the
    company. That is a measurable, unreproducible, nobody-else-has-it number.
26. **The closure dataset as a public artifact** — 2,243 observed closures with dates.
27. **A "what job postings cannot tell you" section.** The refusals are the differentiator; HBR's
    piece has no limits section at all.

## D. Data substance (open queue, unblocked)

28. W4-5 surface `insufficient-signal` in the directory rather than hiding it.
29. W4-7 geocode the directory — 2,754 companies at city precision with zero coordinates.
30. The 73 failed board reads: name them, retry them, publish the count.
31. The 135 sites still on http — upgrade path exists (`--upgrade-https`), unrun.
32. The 33 Wikidata disambiguators awaiting the next map rebuild.
33. Posting-age coverage is 28.8% of attributable roles — raise it or state it prominently.
34. Pay matrix: 427 of 471 comparable — publish the denominator, not just the rate.

## E. Supply chain and machine (research-driven)

35. ✅ `demigod-supply-chain-check.mjs` — done this pass. Tree clean; two near misses found.
36. **Pin `cacheable` and `cacheable-request`** — both one patch below a compromised release.
37. **Audit `preinstall`/`postinstall` scripts** across the tree; npm v12 blocks them by default and
    this tree predates it.
38. **Decide on npm v12** and its install-script blocking before it lands under us.
39. **`DEMIGOD-LEADS.json` has no backup** — 152 KB, gitignored, business pipeline, one `rm` away.
40. ✅ Role-ledger archive — done this pass, before the 180-day retention destroyed anything.
41. W9-5 bus and truth receipts live in `/tmp` and die at reboot.
42. W9-2 stale mirrors `demigod-ops-23/` (111 MB) and `demigod-ops-255/`.
43. W9-3 `demigod-site-cdn/` holds 305 files / 105 MB of historical `foot-vNNN.js`.
44. W9-6 commit or delete the four `systemd-user/demigod-die-*.service` units.

## F. Codebase

45. W7-3 split `verify-all` into fast and full — 252 steps is minutes, and slow gates get skipped.
46. W8-1 `demigod-x-hiring.mjs` duplicates ~30 lines of CDP client.
47. The ponytail debt ledger: 118 markers, ~30 unique, none tracked to a trigger.

## Ordering

A is one authorization from live and should go first if it goes at all. B10–B14 are the highest
research-to-effort ratio on the list: schema types that engines demonstrably read, on a site that
has none, built from data already on disk. C is the only item with a closing window — the HBR piece
is current in August 2026 and will not be in November.
