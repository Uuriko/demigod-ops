# Demigod Website — Strategy, Tactics & Execution Plan (post-MCP 2.0)

*Written 2026-07-24, after: expanding the SF startup directory to 2,735 companies with live job
data, building the Hiring Pulse, publishing via the Webflow MCP API (no more browser paste), and
fixing the first source-level SEO bugs. This plan assumes full programmatic control of the site.*

> **CORRECTION (2026-07-26):** the *strategic bets* in this doc — especially framing "open data" as a
> pillar/wedge — were Claude's proposed framing, NOT positioning the user committed to. The user made no
> "open-data promise." Treat the strategy sections here as one agent's proposal, superseded by the deeper
> research in `DEMIGOD-STRATEGY-OPTIONS-0726.md` (options to weigh, not commitments). Honesty is a value
> the user has stated; using only redistributable data is a legal/sourcing constraint, not a brand.

A note on the two words, because they are **distinctly different and the user asked that they stay that way:**

- **Strategy** = *where we play and how we win.* Choices and bets. A POV. It is falsifiable and it
  says NO to things. Strategy does not contain verbs like "edit the footer."
- **Tactics** = *the concrete moves that execute the strategy.* Specific, sequenced, tool-level.
  Tactics do not contain bets or positioning — those belong upstairs. If a tactic can't be traced
  to a strategic pillar, it is busywork and gets cut.

---

# Part I — STRATEGY (the why and the what)

## 1. The one-sentence strategy
**Become the one hiring-adjacent product in SF that provably never lies, and converts that trust into honest human-reviewed matches.**
"Come for the honest hiring data, stay for the honest matching."

## 2. The binding constraint (name it, or every plan is fiction)
Demand, not the site. As of now there are ~2 real matches ever and inbound is ~0. The site is
heavily built. **Therefore: work on the site is only strategic where the site actively *creates
demand* or actively *destroys trust*.** Polishing anything else is motion, not progress. This single
sentence should kill ~half of any tempting to-do list.

## 3. The competitive truth (why we cannot play the incumbents' game)
The AI-recruiting category is crowded and well-funded — Jack & Jill ($20M, and it already owns the
"trust / anti-fake-résumé" line), Mercor ($450M ARR), Micro1 ($100M ARR), Paraform ($84M). The
pattern among winners: they **pivoted to a narrow, urgent, paying wedge** (expert data for AI labs)
and grew organically off one desperate buyer. Demigod has no capital edge and no urgent-buyer wedge
yet. **Conclusion: we cannot win "AI matches talent to jobs" head-on.** Anything that frames Demigod
as a better version of that is strategically dead.

## 4. The wedge (the only defensible ground)
Three things the funded, closed incumbents *structurally cannot copy*, intersected:
- **Radical honesty** — verifiable, open, no overclaiming. Their products are black boxes; ours is
  glass. In an industry defined by spam, ghosting, and fake AI résumés, "we can prove everything we
  say" is a real, ownable position — *if the site actually lives it.*
- **Hyperlocal SF depth** — go absurdly narrow. Be the definitive source for *San Francisco*
  specifically. Liquidity in a niche needs hundreds of the right people, not tens of thousands
  (Roth: thickness in a thin market beats presence in a broad one).
- **Open public data** — the directory/Pulse are built from sources anyone can audit. That is both
  the trust proof *and* the free, self-distributing top-of-funnel.

The wedge is the intersection, not any one alone. A directory alone is a commodity; an *honest,
hyperlocal, open* directory that feeds an *honest* matching network is a position.

## 5. The theory of the site (what the site is *for*, this phase)
Not "convert visitors" — there are none yet. The site's job is **tools-first demand generation with
zero trust leakage**: give SF talent and founders genuine single-player value (the directory, the
Pulse) that pulls them in *and* is so obviously honest that it earns the right to later ask for the
harder thing (a brief, a profile). Every page is either (a) a magnet, (b) a trust proof, or (c) a
conversion step. A page that is none of those is dead weight.

## 6. What winning looks like (the one metric)
Not traffic, not pageviews — those are vanity in a marketplace. **Liquidity:** when a founder
searches, is there a *real, relevant, reachable* candidate — and vice versa. The near-term proxy is
**the first 10–20 real, human-verified matches.** Everything tactical should ladder to that. Traffic
only matters as the raw material for liquidity.

## 7. Strategic anti-goals (the NOs — a strategy with no NOs is a wish)
- **No** competing on "our AI is better" — we lose that fight.
- **No** manufactured demand, fake signal, padded numbers, or copy we can't defend — the entire
  thesis is honesty; one lie voids the moat.
- **No** broadening past SF for "more coverage" — niche depth is the point.
- **No** site polish that doesn't create demand or remove a trust leak.
- **No** paid data sources that would replace open, auditable data with a black box — that trades
  away the moat for coverage.
- **No** autonomous outbound (posting as the brand, DMs) — trust is the asset; a human owns those.

---

# Part II — TACTICS (the how — every one traces to a pillar above)

## Workstream A — Make honesty *native* (kill the runtime-scrub layer) → serves Pillar: Honesty
**Why it's tactical-critical:** the site currently ships dishonest authored copy (`hello@` ×10,
"pre-vetted" ×5, "3–5 candidates" volume claims, "replacement guarantee", "FIND TALENT",
"Human-Matched", a stray duplicate `<title>Untitled</title>`) and *patches it at runtime with ~15
scrub scripts.* Crawlers and no-JS clients index the **un-scrubbed, dishonest** version. This is a
live trust leak in search results — the opposite of the moat.

Tactics (all via Webflow MCP, on a **branch** for safety — the site is `canBranch:true`):
1. `create_branch` from the homepage; do all edits there, `publish_branch` to staging, verify, then
   `merge_branch` + `publish_site`.
2. Fix source copy element-by-element with `data_element_tool` (query → update text): emails →
   `potter@trydemigod.com`; delete volume claims; CTAs → "Hire talent" / "Join the talent network";
   drop "pre-vetted" → "human-reviewed"; "replacement guarantee" → "90-day outcome focus".
3. Remove the duplicate `<title>Untitled</title>` at source (find its origin — embed or page head).
4. **Then delete the now-redundant scrub scripts** from the site head via `set_site_freeform_code` —
   they become dead weight and a page-speed tax once the source is honest.
5. **Lock it:** add a poison-test that fetches the live homepage (Googlebot UA) and fails red if any
   banned phrase reappears in served HTML. Wire into `verify-all`. (A scrub that no gate guards, and
   now a *cleanliness* no gate guards, locks nothing.)

## Workstream B — Crawlability & findability → serves: crawlability / demand front door
**Why:** the directory and Pulse are client-rendered JS — search engines and social scrapers see
nothing. A magnet nobody can find generates no demand.
1. Ship a **crawlable `/startups`** with real company/job content in *served* HTML. Decide the host:
   (a) Webflow CMS-sync the top companies (native crawlable, item limits apply), or (b) external
   static host (Cloudflare Pages) at a subdomain, or (c) prerender. The static generator already
   exists (`demigod-directory-static.mjs`); the decision is *where it lives.*
2. Stand up **`/pulse`** the same way — the data-media issue at a real, shareable trydemigod URL
   (more credible than a claude.ai link).
3. Native per-page SEO/OG/JSON-LD via the pages API (done for `/startups`, `/legal`, `/partnerships`)
   — replace the runtime `dg-blog-canonical` scripts with real page settings so crawlers see it
   without running JS.
4. Sitemap + robots hygiene via `data_sitemap_tool`; kill remaining soft-404s (the `/untitled`
   pattern) via draft + true 404.

## Workstream C — The demand engine (directory + Pulse) → serves Pillar: tools-first demand
1. Keep it fresh: `demigod-directory-refresh.mjs` on a monthly cadence (HN → rebuild → enrich →
   pulse → static). Wire to a timer.
2. Pulse cadence: weekly once the history snapshots give week-over-week deltas (the part that
   actually travels). The deltas are the product; levels are the backdrop.
3. Distribution *enablement* (not autonomous posting): keep polished Show HN / tweet drafts current;
   the human posts. Content that's genuinely interesting distributes itself — that's the whole point
   of choosing data-media over a bare directory.
4. Source growth by quality, not quantity: HN monthly is proven; only add a source that clears the
   website + SF-location + open-license bar (see the sources scorecard — DataSF/Form D/VC-portfolios
   already failed it). Do **not** chase raw count.

## Workstream D — Conversion readiness (for when demand arrives) → serves Pillar: honest matching
1. The honest funnel: directory/Pulse → talent WIZ / founder brief, framed truthfully about what
   Demigod does *today* (no "we'll get you hired"). Route `/startups` visitors to the right next step.
2. Fresh-eyes audit of the actual talent + founder paths so the trickle converts (mostly Codex's
   lane — coordinate, don't collide).
3. Real measurement: `__dgWebhookUrl` is unset live, so form analytics are a silent no-op — there is
   currently *no* instrumentation of the funnel. Fix real measurement before optimizing blind.

## Workstream E — The site as a programmable, gated, honest-by-construction system → serves all pillars
1. MCP-native publish is now standard (`foot-cdn-publish` → `set_site_freeform_code` → `publish_site`)
   — documented; retire the browser/CM6 path.
2. Branch-based change discipline for anything touching live content (Workstream A/B).
3. Everything reproducible + gated: SEO/JSON-LD generated by committed scripts with `--selftest`,
   wired to `verify-all` — the site's honesty is enforced by tests, not vigilance.

## Workstream F — Measurement & the honesty gate → serves Pillar: the one metric
1. Instrument the funnel honestly (fix the webhook/analytics no-op) and track **liquidity signals**
   (real submissions, real matches), never vanity traffic.
2. The honesty gate (Workstream A.5) is the standing guarantee: the live site cannot regress into
   overclaiming without a red test.

---

# Part III — Operating principles (the discipline that keeps tactics honest)
- **Verify the artifact the user *and the crawler* get** — served HTML ≠ rendered DOM ≠ disk. Test
  all three; the crawler's view is now a first-class artifact.
- **Every claim provable, every gate fail-capable** — assert the gate goes red on a bad subject, not
  just green on a good one.
- **Branch before touching live content; MCP-native for everything.**
- **Stay in lane** — Claude: website/directory/SEO; Grok: gates/tunnel/events-bot; Codex: product/
  match (offline until 07-28). Claim shared files; coordinate.
- **Small, reversible, verified increments** — one publish per coherent change, truth-checked.

---

# Part IV — Sequencing (what first, and why)
1. **Workstream A (honesty-native)** — highest strategic urgency: it's a *live* trust leak in search
   results, and trust is the entire moat. Do it on a branch, this week.
2. **Workstream B (crawlability)** — the demand front door; without it the magnets are invisible.
3. **Workstream F.1 (measurement)** — you cannot steer C/D blind; fix the webhook no-op early.
4. **Workstream C (Pulse cadence + distribution) + D (conversion)** — once findable and measured.
5. **Workstream E** runs *through* all of them as the discipline, not as a separate phase.

---

# Part V — THE EXECUTION PROMPT (self-contained; hand to an agent to run a phase)

> You are Claude on the Demigod **website lane**, with Webflow MCP 2.0 authenticated (site_id
> `6a34c484dcedc18a17408187`; domain IDs `6a3c6494a3294571dc5e6ae8` /
> `6a3c6494176efddaf45beb8e`; call `webflow_guide_tool` once first). Read this plan's Part I before
> acting — **every action must trace to a strategic pillar or you don't do it.** The binding
> constraint is demand; the moat is verifiable honesty; the metric is real matches, not traffic.
>
> Execute **one workstream at a time**, in the Part IV order. For each:
> 1. State which pillar it serves and the one metric it moves. If you can't, stop and ask.
> 2. For any change to **live content**, work on a Webflow **branch** (`create_branch` →
>    `publish_branch` to staging → verify the served HTML as Googlebot → `merge_branch` →
>    `publish_site`). Never bulk-edit the live homepage directly.
> 3. **Verify the crawler's artifact**, not just the rendered DOM: `curl -A Googlebot` the live URL
>    and assert the honest/expected content is in *served* HTML.
> 4. Leave a **fail-capable gate** behind (e.g., a poison-test that fetches live HTML and goes red on
>    any banned phrase / missing SEO tag), wired into `verify-all`.
> 5. Publish MCP-native (`foot-cdn-publish` → `set_site_freeform_code` footer → `publish_site`);
>    confirm with `bin/dg truth` (live == disk).
> 6. Record a coord receipt; update memory; report what shipped and which metric it should move.
>
> **Start with Workstream A (honesty-native).** Concretely: create a branch; enumerate every element
> containing a banned phrase (`hello@`, "pre-vetted", "3–5"/volume, "replacement guarantee", "FIND
> TALENT", "Human-Matched", duplicate "Untitled" title) by querying the homepage elements; fix each
> at source; remove the now-redundant scrub scripts; add the live-HTML honesty poison-test; verify as
> Googlebot; merge + publish. Do **not** touch outbound (no posting/DMs) and do **not** broaden past
> SF. When a workstream is done, verify green, then move to the next in order.
>
> Anti-goals are load-bearing: if a task is site polish that neither creates demand nor removes a
> trust leak, **skip it and say so.**
