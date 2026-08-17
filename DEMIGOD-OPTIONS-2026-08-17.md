---
status: working
generated_by: claude
generated_at: 2026-08-17
---

# What to do next — research finding and 106 options

## The finding

**AI crawlers do not execute JavaScript.** GPTBot, ClaudeBot, PerplexityBot, CCBot, OAI-SearchBot,
Bytespider and Meta-ExternalAgent issue one HTTP request, read whatever HTML comes back, and move on.
GPTBot fetched JS files in ~11.5% of requests and executed none; ClaudeBot fetched them in ~23.8% and
executed none. The only exception is Google Gemini, which borrows Googlebot's rendering service.
Googlebot and Bingbot do render, but on a queue that can lag from seconds to over a week for
low-priority sites.

Demigod's entire product surface is rendered by `demigod-foot-core.js` after page load. `site-health`
measured the consequence without naming it: **24 routes serve the same 576 characters** of crawlable
text. To every AI crawler, trydemigod.com is one nearly-empty page.

Measured directly, fetching as `GPTBot/1.0` and stripping script, style and markup:

| route | crawlable characters |
|---|---:|
| `/startups` | **15,036** |
| `/pricing` | 3,255 |
| `/blog` | 591 |
| `/how` | 590 |
| `/faq` | 590 |

`/how`, `/faq` and `/blog` return a page title and one boilerplate sentence. The route with a
pre-rendered fragment carries twenty-five times the content of the ones without.

**The fix already exists in this codebase and was built for exactly one route.**
`demigod-directory-static.mjs` pre-renders a bounded, crawlable fragment for `/startups` — 14,978
characters of real company content in the served HTML, with a byte ceiling, a truncation disclosure
and a selftest. It has never been pointed at anything else.

**And the content that earns citations is the content Demigod already has.** 52.2% of passages cited
by AI search contain original or owned data. Demigod holds three original datasets nobody else
publishes: 472 verified SF ATS boards with 10,936 open roles, a posting-age index (28.8% of
attributable roles listed 90–365 days), and a pay-transparency matrix (427 of 471 boards comparable,
Lever's 44 structurally unable to carry pay). Two of the three are in no crawlable page.

Three more numbers that shape the list below: 44.2% of LLM citations come from the first 30% of a
page. "Versus" comparison pages are the strongest single predictor of AI referral traffic for B2B.
And 89% of citations for unbranded B2B questions come from third-party sources rather than the
brand's own site.

`llms.txt` is not the answer: 5–15% adoption, 1 of 94,614 cited URLs referenced one, Google states
it is not needed, and one model found it added noise rather than signal. Cheap enough to add, not a
substitute for the structural work.

Sources: [Do AI crawlers render JavaScript](https://searchoptimo.com/blog/do-ai-crawlers-render-javascript) ·
[AI crawlers do not render JavaScript](https://www.asklantern.com/blogs/ai-crawlers-do-not-render-javascript) ·
[JavaScript SEO in 2026](https://www.rewatikhare.com/post/javascript-seo-in-2026-what-google-actually-handles-vs-what-still-bites-you) ·
[JavaScript SEO for Webflow](https://webyansh.com/post/javascript-seo-webflow-guide) ·
[AI search statistics for B2B](https://madx.digital/learn/ai-search-statistics-2026) ·
[State of llms.txt in 2026](https://ai.aeo.press/the-state-of-llms-txt-in-2026) ·
[Client recruitment blueprint](https://recruitbpm.com/blog/client-recruitment-blueprint)

---

## A — Make the site readable without JavaScript (18)

1. Extend `demigod-directory-static.mjs`'s pattern to `/how` — pre-render the method as real HTML.
2. Same for `/pricing`: the 10%-on-hire terms in the served HTML, not injected.
3. Same for `/faq`: FAQ text is the single most quotable page type and is currently invisible.
4. Same for `/about`.
5. Same for `/hire` (the founder-facing pitch).
6. Same for `/talent` (the candidate-facing pitch).
7. Pre-render `/blog` post bodies — the one published essay's 4,448 characters reach no AI crawler.
8. Build the generic version once: one module that takes a route + content source and emits a
   bounded crawlable fragment, instead of six copies of the directory generator.
9. Add a gate that fails when two routes serve identical crawlable text — the 24-route collision
   would have been caught the day it appeared.
10. Add a gate asserting each canonical route serves a minimum of crawlable characters.
11. Measure crawlable text per route as a tracked number over time, the way version lag is tracked.
12. Fetch each route as GPTBot's user agent and record what it actually sees; keep the receipt.
13. Decide whether the foot should stop rendering content that a static fragment now carries, or
    render over it — double-rendering risks a flash and duplicate text.
14. Check whether Webflow's per-page custom code has a byte ceiling lower than the footer's 50KB.
15. `/startups` is at **31 bytes** of headroom. Decide pagination or a second page before it silently
    lists fewer companies.
16. **Correction, measured 2026-08-17.** The robots policy is already deliberate and it is not a
    blanket block. `Content-Signal: search=yes, ai-train=no, use=reference` sits on `User-agent: *`
    with `Allow: /`, and nine **training** crawlers are disallowed — GPTBot, ClaudeBot, CCBot,
    Google-Extended, Bytespider, meta-externalagent, Amazonbot, Applebot-Extended and Cloudflare's
    renderer. The **citation** fetchers are all allowed: OAI-SearchBot, PerplexityBot, ChatGPT-User,
    Claude-User, Claude-SearchBot, Bingbot, Googlebot.
    That is a coherent position — index and cite us, do not train on us — and it does not need
    fixing. It also does not soften Track A one bit: the allowed search fetchers do not execute
    JavaScript either, so what they are permitted to read is the same 590 characters of nav.
17. `llms.txt` is **blocked by hosting, not by choice**: `/llms.txt` and `/ads.txt` both 404, so
    Webflow is not serving arbitrary root files. It would need a Cloudflare Worker or a redirect
    before the 30 minutes of writing it is worth spending.
18. Re-run `site-health` after each route lands and watch the duplicate-text list shrink.

## B — Publish the original data that AI actually cites (12)

19. Give the posting-age index a host page. The aggregate needs no naming decision and is ready now.
20. Put the headline number in the first 30% of that page, where 44.2% of citations come from.
21. Publish the pay-transparency matrix: 427 of 471 boards comparable, 83.8% publish rate, and the
    reason Lever's 44 cannot answer.
22. Publish the ATS-capability matrix itself — which readers can carry pay, location, posting date.
23. Publish the SF hiring pulse as a dated page rather than only a fragment.
24. Write the "what an unread board looks like" methodology page — the honesty machinery is a
    differentiator nobody else documents.
25. Date-stamp every data page; AI-cited content is 25.7% fresher than comparable organic results.
26. Commit to a refresh cadence and state it on the page.
27. Build one "versus" page — the strongest single predictor of B2B AI referral traffic.
28. Consider a second: Demigod's model versus contingency recruiting, priced honestly.
29. Publish the 90–365 day posting-age finding as a short essay with the data table inline.
30. Decide the named-companies question for the posting-age index — separate, contentious, later.

## C — The publish backlog already prepared (10)

31. Authorize a publish. Nine checks are green and eight fixes are waiting on it.
32. `/startups` says 501 companies; the data says 471. Three days stale, corrected on disk.
33. Per-page canonicals in Webflow page settings — all five routes serve none until JS runs.
34. Per-page `og:url` — every route currently unfurls as the homepage in Slack, X and LinkedIn.
35. `/companies` serves no `og:url` and no description at all.
36. Ship the CDN SRI pins — 432KB of JS executing on every page with no integrity attribute.
37. Ship foot v1104 (the `/tryout` route that 404'd is removed).
38. Ship the corrected public-roles geography — the rail was showing London under an SF claim.
39. Ship the blog JSON-LD fix (`/?p=blog` → `/blog`).
40. Decide `/graph`: build the page or strip the nav link. It has 404'd since at least 08-16.

## D — Third-party presence, where 89% of unbranded citations come from (8)

41. Decide whether Demigod should have a G2 or Capterra-style profile at all, given it is not SaaS.
42. Find the recruiting-directory equivalents that AI answers actually cite for "SF technical
    recruiter" and measure which ones appear.
43. Ask the three ATS vendors whether a partner or integrations listing is available.
44. Get the YC-adjacent directories to list Demigod, since the corpus is YC-heavy.
45. Publish the directory data somewhere with its own citation gravity (a dataset host).
46. Answer real questions in public where the answer is a number Demigod owns.
47. Measure whether trydemigod.com appears in any AI answer today — baseline before acting.
48. Re-measure monthly; treat citation presence as the metric, not rankings.

## E — Measurement, because there is none (6)

49. Add Cloudflare Web Analytics — free, cookieless, no consent banner needed.
50. Name it in `/legal` first; it processes IP and user agent, which is personal data under GDPR.
51. Decide what the one number is that says the site is working.
52. Instrument the startup form's completion rate, not just its submissions.
53. Log which route a form submission came from — attribution exists but is unmeasured.
54. Record AI-crawler hits by user agent so the effect of Track A is visible.

## F — The DIE webapp (12)

55. Write the H2/H3 receipt the plan is missing — a whole gated-public mode is running and
    undocumented.
56. Decide whether the shared-password gate is the permanent answer or a bridge to Cloudflare Access.
57. If it stays: bind a human actor to each mutation. The audit records the action, not who.
58. Replace the shared password with per-operator credentials before a second person gets access.
59. Add an explicit Origin/Referer check on the mutation route rather than relying on `SameSite=Lax`.
60. Decide whether the quick tunnel should be running at all when the named tunnel exists.
61. Rotate the gate secret and record when it was last rotated.
62. Add rate limiting to the mutation route, not only to login.
63. Work through §6.2's list properly now that mutations are live.
64. Decide the retention policy for the SQLite mission store and enforce it.
65. Add a correction and deletion path for candidate data.
66. Prove incident shutdown works: stop the tunnel, revoke the gate, confirm the desk is unreachable.

## G — The first client (10)

67. Warm network first. It is the strategy every source agrees on and the queue has one overdue
    warm lead sitting at four days.
68. Triage the two quarantined demand rows.
69. Define the niche narrowly enough that outbound has a reason — "SF technical" is not a niche.
70. Offer a pilot placement at reduced risk, then document it. One pilot becomes the case study that
    opens outbound.
71. Decide the fee position publicly; the pricing page already says 10% on hire.
72. Publish salary benchmarks from the corpus — the market intelligence play that shortens the sales
    cycle before you ever reach out.
73. Use the directory as the outbound reason: you already know who is hiring and for what.
74. Write the first-result promise down as a contract, not a claim.
75. Decide whether EventsBot is still part of the motion or a distraction.
76. Set a target: one accepted brief. Everything else is instrumentation for that.

## H — Data quality and the pipeline (12)

77. Run a map rebuild so the 33 Wikidata disambiguators drop (`GigaGen (United States)` → `GigaGen`).
78. Re-probe the 135 sites still on `http://` — they refused once, sites change.
79. Investigate the 73 boards that failed to read; they have no ATS source and may need slugs.
80. Find out why `boardsVerifiedEmpty` was 0 across 472 boards — the feature may be unreachable.
81. Get CDP Chrome up; `demigod-x-hiring` is the one failing pipeline stage.
82. Decide whether x-hiring is worth keeping if it needs a browser to run.
83. Geocode the 2,754 companies — every one is `locationPrecision: city` with no coordinates.
84. Wire the aging step into the enrich so the directory line cannot silently disappear again.
85. Schedule the enrich as its own job; at polite concurrency it takes about 38 minutes.
86. Decide the enrich cadence — daily, and how the history file grows.
87. Add the ATS capability matrix as a data artifact rather than a CLI output.
88. Read the terms for SmartRecruiters, Workable, Recruitee and Personio before their first live
    board lands.

## I — Security, privacy, legal (8)

89. Publish the opt-out path so a company can find it. The mechanism exists; nothing advertises it.
90. Decide whether "stop listing our roles" should also mean "remove us from the directory".
91. Get a lawyer's read on aggregating public ATS data — no vendor authorizes it and none forbids it.
92. Write the data-retention policy for the role ledger's 19,307 rows.
93. Move `DEMIGOD-ROLE-LEDGER.json` (12.8MB, mode 0600, untracked) somewhere durable.
94. Get the bus and truth receipts out of `/tmp`; a reboot erases the coordination history.
95. Decide who else may hold the gate secret.
96. Review what the directory publishes about companies that never asked to be listed.

## J — Repo and machine hygiene (10)

97. Decide what `src/` is — 45 GB untracked in `$HOME`.
98. Delete or archive `demigod-ops-23/` (111 MB) and `demigod-ops-255/`.
99. Prune `demigod-site-cdn/` — 305 files, 105 MB of historical foot builds.
100. Resolve `work/`, the third copy of `foot-*.js` and a second `dasha-desk`.
101. Push. Seventy-plus commits from today exist only on this disk.
102. Commit or discard the 97 still-modified tracked files.
103. Track or ignore the 65 untracked paths.
104. Run `/ponytail-audit` over 606 `.mjs` files and act on the top of the list.
105. Decide whether Dasha and Demigod should share one repo at all.
106. Write the runbook for what to do when a publish is authorized — the steps are currently in
     several heads and one work queue.
