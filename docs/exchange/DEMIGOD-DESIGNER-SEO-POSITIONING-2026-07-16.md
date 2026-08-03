# P1 · Designer page-SEO still ships the retired positioning + banned contact (live proof)

**Found:** term-claude 2026-07-16 ~14:45Z · **Layer:** Designer page settings → SEO (NOT head, NOT foot)
**Status:** filed, **mostly fixed** — see the 07-17 re-verification below. One field remains.
**Corroborated by our own tooling:** `bin/dg-webflow doctor` → `✗ live SEO meta unique — description=2 og:title=2`

## ⚠ RE-VERIFIED 2026-07-17 (term-claude, tick 3) — 2 of the 3 SEO defects are ALREADY FIXED

Measured against live `https://www.trydemigod.com/` raw HTML (no JS), byte offsets confirm which layer emits what
(Designer page-settings tags land <5000; our head paste lands >22000):

| Tag | Offset | Live value 07-17 | vs this doc |
|-----|--------|------------------|-------------|
| `<title>` (Designer) | **415** | `Demigod · SF startup talent matching` | **FIXED** — doc says `Human-Matched SF Startup Talent`; no "Human-Matched" in any meta/title |
| `og:title` (Designer) | **641** | `Demigod · SF startup talent matching` | **FIXED** — doc says `Human-Matched SF Startup Talent` |
| `description` (Designer) | **466** | `…10% on hire. Free for talent. **hello@trydemigod.com**` | **STILL REAL** — the sole residual |

**Scope of the remaining Webflow write is now ONE field**, not three: Home → Page Settings → SEO **description** only.
Do not spend the write on `<title>`/`og:title` — they are already canonical.

**Runtime honesty is intact (CDP, live, reduced-motion normalized):** all six retired categories render **0**
— Human-Matched, pre-vetted, guarantee, dedicated partner, Live roles/hiring now, hello@. Live h1 renders
`Many startups. / One matched reality.` The scrubs work; only the no-JS crawler view carries the residual.

**The PERFORMANCE case is also retired (re-measured live v639, tick 9).** This doc's L146/L198/L242 cite
**CLS 0.735** and a **154px hero collapse** as reasons for the canvas repair. Both are stale (they were
real on v584):

| Metric | This doc (v584) | Re-measured (v639) |
|---|---|---|
| Desktop CLS | bimodal 0.041 / **0.735**, ~half of loads | **0 or 0.108** — the 0.735 arm in **0/11 runs** |
| Hero collapse | **−154 px** | **−3 px** |
| Mobile CLS (4G) | 0.254 | **0** (3/3) |

Method matched the source note's (1440x900, cache disabled, PerformanceObserver; mobile 390x844 on ~4G).
The canvas repair is still justified by **no-JS honesty + the SEO description** — but **not** by CLS.
Residual: desktop 0.108, a hair over the 0.1 "good" line, from a 3px hero height change at
`demigod-foot-core.js:1325`. Deliberately unfixed — marginal harm, fragile fix. Full data:
`/tmp/dg-busy/coord/quality-notes/cls-bimodal-finding.md`.

**Two claims in this doc do not survive checking:**
- L142/L197 say foot rewrites the h1 to `"The right people, with signal."` — that string is **0×** in
  `demigod-foot-core.js`. Actual replacement is `Many startups.<br><em>One matched reality.</em>` (`:1326`).
- Canvas h1 is `SF Startup Talent. Human Matched.` split across `<span>`s, so it never greps as one string.
  It carries `class="hero-title"`, so `hero():1325` does cover it — but **only by selector**: the sole
  positioning regex (`:1369 /HUMAN-MATCHED/i`) requires the hyphen and would miss the unhyphenated h1.
  Reclassing that h1 in Designer would silently reship the retired positioning. Not a present defect; a fragility.

## What's wrong

foot v569 + the head paste are **live and correct** (`og:title` = "Demigod • Tech-Matched SF Startup Talent",
desc = "…Demigod tech matches curated talent, humans in the loop…", Org LD aligned, `dg-pc-reveal` shipped).
But Webflow **page-settings SEO** emits its own tags *first*, and they still carry the retired positioning:

| Tag | Byte offset | Value |
|-----|-------------|-------|
| `<title>` | ~600 | `Demigod • Human-Matched SF Startup Talent` ← **the only `<title>` on the page** |
| `og:title` (Designer) | **624** | `Demigod • Human-Matched SF Startup Talent` |
| `description` (Designer) | ~700 | `Demigod matches SF startups with curated talent. Human-reviewed profiles. 10% fee on hire only. **hello@trydemigod.com**` |
| `og:title` (our head paste) | **21774** | `Demigod • Tech-Matched SF Startup Talent` |

Live counts: `og:title` ×4, `description` ×2, `hello@trydemigod.com` ×6.

## Why the runtime dedupe does not save it

`demigod-head-minimal.html#dg-contact-scrub` implements **meta keep-last** (verify-source:1135 — "Webflow
page-settings may emit stale description/og/twitter before our canonical tags; scrub must drop all-but-last").
That fixes **JS-on humans only**.

- **og: scrapers (Slack / LinkedIn / Twitter / Facebook) do not run JS** → they read the **first** `og:title`
  = Designer's "Human-Matched", and the first `description` = the one containing `hello@`.
- **`<title>`**: our head paste emits **no `<title>` at all** (grep: `Tech-Matched` ×2 in head = og+twitter only;
  ×0 in foot-core; foot never sets `document.title` for the home page). So the browser tab and the SERP title
  are Designer's, JS or no JS. Keep-last cannot pick ours because ours does not exist.

Net: **every share card and crawler still says "Human-Matched" and advertises `hello@`** — the positioning
work and the potter@ contact policy both stop at the JS boundary.

## Why this is not fixable in our lane

Adding a second `<title>` to head custom code doesn't help (browsers/scrapers take the first).
Per WEBFLOW-EXPERT-GUIDE §4.5 + §7 ("SEO duplicates | Head + Designer both set meta | Deduplicate") and
§5's decision tree, permanent static/meta honesty is a **Designer** change.

## Fix (Designer page settings → SEO, home page)

1. **Title** → `Demigod • Tech-Matched SF Startup Talent`
2. **Meta description** → `SF startups submit a brief. Talent uploads once. Demigod tech matches curated talent, humans in the loop. 10% of first-year cash on hire. Free for talent.` (154 chars; matches head/foot exactly so keep-last is a no-op)
3. **Open Graph title/description** → same as above (Webflow OG fields default to the SEO fields — confirm the "same as SEO" toggles).
4. Remove `hello@trydemigod.com` from the SEO description → policy contact is `potter@trydemigod.com`.
5. Publish → re-run `bin/dg-webflow doctor` (expect `live SEO meta unique` to go green) → re-scrape a share card.

**Then (Ponytail, per guide §10 "permanent excellence path"):** once Designer is honest, the keep-last meta
dedupe and the `hello@`→`potter@` contact scrub lose most of their reason to exist — delete the runtime
rewrites rather than carrying both forever.

## Gate gap worth noting

`head:public-contact-potter` asserts the **head paste file** has no `hello@`. It passes green while live
serves `hello@` ×6 from Designer. Gates on disk SoR cannot see the canvas — only the live doctor can.
Same blind spot as `head:heavy-meta`, which hardcoded `Human-Matched` until it was updated today.

---

## MCP path (unblocked 2026-07-16 ~14:50Z — `claude mcp list` → `webflow ✔ Connected`)

Webflow MCP is now OAuth'd for the workspace, so this **no longer needs a human in Designer**.
Per EXPERT-GUIDE §3, MCP *can* do "Pages, SEO meta" — this is squarely in scope (no IX3 involved).

**Sequence** (whoever holds live webflow MCP tools):

1. `sites_list` → confirm `talentlink-sf` siteId.
2. `pages_list` → find the **home** page id (`/`).
3. `pages_update` (page settings → SEO) on home:
   - `title` → `Demigod • Tech-Matched SF Startup Talent`
   - `description` → `SF startups submit a brief. Talent uploads once. Demigod tech matches curated talent, humans in the loop. 10% of first-year cash on hire. Free for talent.`
   - OG title/description → same (or leave the "same as SEO" toggle on).
   - Ensure `hello@trydemigod.com` is gone from the description.
4. **Publish** to production (`www.trydemigod.com`) — MCP page edits are staged until publish.
5. Verify: `bin/dg-webflow doctor` → `live SEO meta unique` should go green
   (currently `✗ description=2 og:title=2`), and re-scrape a share card.

**Do not** hand-edit these in head custom code — a second `<title>` loses to Designer's (first wins),
which is the whole reason this bug survived the v569 fix.

**Then (Ponytail §10):** once the canvas is honest, delete the keep-last meta dedupe and the
`hello@`→`potter@` contact scrub instead of carrying both layers forever.

**Session note:** term-claude's session predates the OAuth — `ToolSearch` returns **0** webflow tools even
by exact name, so this session cannot execute it. Needs `/mcp` refresh or a session restart. Grok reports
31 tools live now and can run it immediately.


---

## PARTIAL RESOLUTION 2026-07-16 ~18:05Z (term-claude, re-verified on the RAW CANVAS with JS off)

**The share-card layer is FIXED.** Someone landed the Designer page-SEO change. What scrapers now read:

```
<title>        "Demigod · SF startup talent matching"        (was "Demigod • Human-Matched SF Startup Talent")
1st og:title   "Demigod · SF startup talent matching"
1st description "Demigod ranks fit with tech, reviews with people, introduces only with mutual interest. 10% on…"
```

Both meta duplicates now AGREE (Designer's + our head paste) — neither says Human-Matched, so
`dg-webflow doctor`'s `description=2 og:title=2` is now **cosmetic dedup**, not an honesty defect.

**STILL OPEN — the canvas BODY:**

| what | count (raw canvas, JS off) | who sees it |
|------|---------------------------|-------------|
| `<h2 class="heading_tertiary">HUMAN-MATCHED STARTUP TALENT</h2>` | 1 | no-JS + og: scrapers |
| `<p class="footer-tagline">Human-matched SF startup talent…</p>` | 1 | no-JS + scrapers (foot rewrites it for JS users as of v586) |
| `hello@trydemigod` | 6 (incl. **3 live `mailto:hello@` links**) | no-JS + scrapers |

With JS on all of these are scrubbed (verified: `visibleHumanMatchedAnywhere: []`, 0 hello@ / 6 potter@).

**Consequences that remain, and they are one fix:**
1. no-JS visitors + og: scrapers still get the retired hero copy and the banned contact address;
2. the ~500ms hero flash on ~half of loads (paint beats foot);
3. **CLS 0.735** — the 154px hero collapse when foot rewrites that copy (quality-notes/cls-bimodal-finding.md).

**Do NOT delete the scrubs yet** — proven load-bearing: the canvas still has 3 live `mailto:hello@`
links. Per EXPERT-GUIDE §10, delete the runtime rewrites only *after* the canvas body is honest.

**BLOCKER CHANGED:** `claude mcp list` now reports `webflow … ! Needs authentication` — it was
`✔ Connected` at ~14:50Z. **The OAuth lapsed mid-session**, so this is no longer "term-claude has no
tools"; it likely affects every MCP client including grok's 31 tools. No site token or config file
exists as a fallback. **Someone must re-auth the Webflow MCP connector** before the canvas body can be
fixed via MCP; otherwise it is a human in Designer.


---

## ESCALATION 2026-07-16 ~18:10Z (term-claude) — the canvas is still the OLD DISHONEST SITE

Measured the raw canvas (JS off = og: scrapers / no-JS clients / any foot failure) against the
rendered page (JS on). Full claim inventory:

| claim in the canvas | JS off | JS on | note |
|---------------------|--------|-------|------|
| **"Live SF startup roles hiring now"** | **1** | 0 | **FALSE CLAIM** — `signal.realRoles = 0`. foot rewrites it to the honest "Example roles — labeled samples" |
| retired positioning (Human-Matched) | 3 | 0 | incl. the **`<h1>`**: canvas h1 = "SF Startup Talent. Human Matched." → foot rewrites to "The right people, with signal." |
| banned contact (`hello@`) | 2 | 0 | plus 3 live `mailto:hello@` links |
| **"90-day replacement guarantee"** | **1** | 0 | banned by copy policy |
| **"pre-vetted"** | **2** | 0 | banned |
| **"Dedicated talent partner"** | **1** | 0 | banned |

**This is bigger than stale positioning.** The Designer canvas is essentially the *old, dishonest
site*, and foot rewrites it into the honest one on every load. Six categories of banned/false claims
are suppressed **only by JavaScript**.

> ## ⚠ MEASURED 2026-07-17 (term-claude, tick 38) — "only by JavaScript" is FALSE. Screenshot, not grep.
>
> Loaded home with **JavaScript fully disabled** (no head script, no foot — CSS still applies) and
> **looked at the rendered page**. The head's static CSS hides almost all of it. What a JS-off visitor
> actually SEES:
>
> | claim | this doc says | JS OFF, rendered |
> |---|---|---|
> | 90-day guarantee | exposed | **not visible** |
> | pre-vetted | exposed | **not visible** |
> | dedicated talent partner | exposed | **not visible** |
> | live roles (`realRoles=0`) | exposed | **not visible** |
> | `hello@` | exposed | **not visible** — fallback shows **potter@** |
> | **retired "Human-Matched"** | — | **VISIBLE ×2** — h1 `SF STARTUP TALENT. HUMAN MATCHED.` + marquee |
>
> The JS-off fallback is in fact well built: a "Continue on Demigod (no JavaScript)" banner with real
> links (Home / I'm hiring / Find a job / Pricing / How it works / Blog / FAQ) + potter@, and honest body
> copy ("SF Bay Area startups submit a role brief. Candidates upload a profile once. Humans review every
> match."). Only the positioning drifts.
>
> **Why this doc (and my own tick-3 receipt) got it wrong: we grepped the raw HTML.** DOM presence is
> not visibility — the strings ARE in the served markup (preVetted ×3, guarantee ×2, …) but the head's
> CSS never paints them. Grep counts markup; only a render tells you what a human sees.
>
> **Independently corroborated:** tick 37 blocked ONLY the foot (head JS running) and reached the same
> verdict — 5/6 categories absent, retired positioning the sole leak. Two different failure modes, one
> answer. Fix remains the Webflow **canvas h1**, not more head JS (head is 48,264/50,000 and its cap
> fails silently).

### The risk this creates

**The site's honesty depends on foot loading.** If the CDN blips, foot 404s, or a JS error fires
before the scrubs run, the live site claims a 90-day replacement guarantee, pre-vetted talent, a
dedicated talent partner, and live roles that do not exist (`realRoles = 0`). That is not a
hypothetical failure mode here — the 07-08 head SyntaxError blanked the site for days, and foot has
had parse breaks as recently as today (v566, caught by `footer:boot-smoke` before ship).

> ## ⚠ MEASURED 2026-07-17 (term-claude, tick 37) — this paragraph is OVERSTATED. Tested, don't assume.
>
> Nobody had actually blocked foot and looked. I did (CDP, foot script aborted, head + Webflow load
> normally, v662). **The dangerous claims do NOT appear** — the head keeps the page hidden and only
> paints a minimal fallback hero (body text drops 1592 → 318 chars):
>
> | claim | this doc says | foot BLOCKED, measured |
> |---|---|---|
> | 90-day replacement guarantee | exposed | **0** |
> | pre-vetted | exposed | **0** |
> | dedicated talent partner | exposed | **0** |
> | live roles (`realRoles=0`) | exposed | **0** |
> | `hello@` / `mailto:hello@` | exposed | **0** — fallback shows **potter@**, correct |
> | **retired "Human-Matched" positioning** | — | **LEAKS** (h1 + marquee) |
>
> **The real, narrow exposure:** the fallback renders the canvas h1 `SF STARTUP TALENT. HUMAN MATCHED.`
> and a `HUMAN-MATCHED SF STARTUP TALENT` marquee — while its own eyebrow says the current
> `TECH-MATCHED`. The fallback contradicts itself. That is positioning drift, **not** a false promise:
> severity is far below what this paragraph implies. Full fallback text is honest otherwise
> ("SF Bay Area startups submit a role brief. Candidates upload a profile once. Humans review every
> match." + potter@).
>
> **Correct fix is the Webflow CANVAS h1 — the same blocked write as the SEO description**, not more
> head JS: the head sits at 48,264/50,000 with ~1,797 chars headroom and the cap fails SILENTLY (a >50k
> paste keeps the OLD head while reporting success). Spending scarce head budget to paper over a canvas
> string would risk a catastrophic silent failure to fix low-severity drift. This is a second concrete
> reason to get that Webflow token.

For JS-on visitors this is currently fine: the FOUC guards hold and **no banned copy is ever visibly
rendered** (verified tick 42: 3 cold runs, DOM sampled every 40 ms, zero flashes).

### Who is exposed today

- **og: scrapers** (Slack/LinkedIn/Twitter/Facebook) — never run JS.
- **no-JS visitors** and non-rendering crawlers.
- **every visitor, if foot ever fails to load.**

### Why the canvas fix is one fix for everything

Fixing the canvas body closes: the false live-roles claim, the banned pricing copy, the banned
contact, the retired h1/positioning, the ~500 ms hero flash, and **CLS 0.735** (the 154 px hero
collapse is foot rewriting that very copy). Then — and only then — the scrubs can be deleted
(EXPERT-GUIDE §10). Until the canvas is honest, **every scrub is load-bearing**.


---

## CORRECTION 2026-07-16 ~18:15Z (term-claude) — I OVERSTATED THE FOOT-FAILURE RISK

The section above says: *"If the CDN blips, foot 404s, or a JS error fires before the scrubs run, the
live site claims a 90-day replacement guarantee, pre-vetted talent, a dedicated talent partner, and
live roles that do not exist."*

**That is FALSE. I tested it instead of leaving the claim standing.** Blocked `foot-latest.js` at the
network layer (simulating a CDN failure) with JS otherwise ON, then measured only *visibly rendered*
text:

| claim | foot BLOCKED | foot loads |
|-------|--------------|-----------|
| "Live SF startup roles hiring now" | **0** | 0 |
| "90-day replacement guarantee" | **0** | 0 |
| "pre-vetted" | **0** | 0 |
| "Dedicated talent partner" | **0** | 0 |
| `hello@` | **0** | 0 |
| retired positioning | **1** | 0 |
| `<h1>` | **"SF Startup Talent. Human Matched."** | "The right people, with signal." |

**The head's inline scrubs already cover 5 of the 6 categories**, and they are inline in the head paste
— **no CDN dependency**. The architecture is materially more robust than I claimed.

### The corrected picture

| audience | exposure |
|----------|----------|
| **JS-on visitors (normal)** | none — verified clean |
| **JS-on, foot CDN fails** | **only the `<h1>`** retains "Human Matched" — retired positioning, *not* a false claim |
| **no-JS visitors + og: scrapers** | **all six categories** — the head scrubs need JS too. This exposure is REAL and unchanged. |

So the honesty-depends-on-JS problem is real, but it is **depends-on-JS**, not **depends-on-the-CDN**.
The scraper/no-JS case is the whole argument; the CDN-failure scenario is nearly a non-issue.

### What this does NOT change

The canvas fix is still one fix for: no-JS/scraper honesty (all six), the ~500 ms hero flash, and
**CLS 0.735**. And every scrub is still load-bearing — the canvas still carries every banned claim.

### One residual, if the canvas stays blocked

The `<h1>` is the only thing foot alone owns. The head could scrub it too (it already scrubs the
pricing bullets, contact, CTA labels and volume step), which would close the CDN-failure gap. Low
value on its own — it does nothing for scrapers, and it duplicates copy across head+foot (drift risk).
**Not worth doing unless the canvas fix stalls indefinitely.**


---

## 2026-07-16 ~18:20Z — SERP description still ships the RETIRED contact (term-claude)

The share-card layer is genuinely fixed — `og:title`, `og:description`, `twitter:*` and `og:image:alt`
are all clean (verified with a Slackbot UA fetch). **But `<meta name="description">` is not**, and that
is what Google's SERP snippet reads:

```
description[0]  (Designer page-SEO, FIRST — SERP reads this)   138 chars
  "Demigod ranks fit with tech, reviews with people, introduces only with mutual interest.
   10% on hire. Free for talent. hello@trydemigod.com"          ← RETIRED CONTACT

description[1]  (our head paste)                                154 chars
  "SF startups submit a brief. Talent uploads once. Demigod tech matches curated talent,
   humans in the loop. 10% of first-year cash on hire. Free for talent."   ← clean
```

Live raw HTML: `potter@` ×12, `hello@` ×6.

### Policy ambiguity — RESOLVED by potter 2026-07-16

This looked like a contradiction between two authoritative sources:

- `CLAUDE.md` copy policy: *"No … founder names on live site. Use "hello@trydemigod.com will follow up"."*
- gate `head:public-contact-potter`: requires `potter@trydemigod.com`, **bans** `hello@trydemigod.com`

The gate enforces exactly what the policy banned (`potter@` **is** a founder name), so the site
violated one rule either way. **potter confirmed: `potter@` is current; the CLAUDE.md line was stale.**
CLAUDE.md has been corrected (that line is auto-loaded into every agent session, so a stale
instruction there is worse than a stale code comment).

### The fix (Designer page settings → SEO, home)

Change the meta description's tail from `hello@trydemigod.com` → `potter@trydemigod.com`, or drop the
address entirely (our head-paste description carries no address and reads fine).

Everything else on this page is now consistent — this is the last `hello@` in the *meta* layer.
The canvas **body** still has `hello@` ×2 plus 3 live `mailto:hello@` links (scrubbed for JS-on
visitors, exposed to no-JS clients) — same canvas fix, same MCP blocker.

**Blocker unchanged:** `claude mcp list` → `webflow … ! Needs authentication` (was `✔ Connected` at
~14:50Z). OAuth lapsed; no site token fallback.
