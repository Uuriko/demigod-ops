# P0 · 22 of 26 marketing routes are hard 404s — including /jobs /hire /apply /careers

**Found:** term-claude 2026-07-16 ~14:58Z · **Layer:** Webflow Site Settings → Publishing → **301 Redirects** (NOT head, NOT foot)
**Status:** filed + head comment corrected. Cannot fix from this session (Webflow MCP tools absent — see session note).

## Live proof (curl, 2026-07-16)

```
LIVE 200 (4):  /contact /legal /pricing /partnerships        ← real Designer pages
DEAD 404 (22): /fees /security /sample /pilot /network /hire /talent /blog /notes /method
               /how /faq /founders /candidates /compare /about /status /partnership
               /apply /engineers /jobs /careers
```

`/jobs`, `/careers`, `/apply`, `/hire`, `/talent`, `/engineers`, `/candidates` are the **dual-path
acquisition URLs** the entire "hire / look for work" positioning is built on. Anyone who shares
`trydemigod.com/jobs` or types `/hire` gets a bare Webflow 404. Crawlers get 404 too.

## Root cause: the head redirect map can never fire

`demigod-head-minimal.html#dg-path-redirects` maps 26 paths → `/?p=…`. Its comment claimed:

> "Early path redirects (HEAD runs on 404 templates; footer-only redirects never fire for /fees etc.)"

**That is false.** Verified live:

```
curl https://www.trydemigod.com/fees  → http=404, bytes=906
  title: "404 - Page not found"
  has dg-path-redirects: false
  has foot loader:       false
  any demigod code:      false
```

Webflow's **system 404 does not include site-wide custom code**. So for a missing route there is no head,
no script, no redirect — the map only fires on paths that already have a real Designer page (the 4 above).
The other 22 entries are inert. WEBFLOW-AGENT-PLAYBOOK §2.2 already says this ("**not** on Webflow system
404s for missing routes"); the head file asserted the opposite and won.

## The gate has been guarding a placebo

`demigod-verify-source.mjs:1113` `head:path-redirects` **requires** `/fees`, `/security`, `/apply`, `/p/`
in the head, and its failure text reads *"firecrawl 404 P0"*. So the history is: someone saw firecrawl
hitting 404s → added a head JS redirect → added a gate to enforce it. The gate is green. The 404s never
went away. A disk-SoR gate cannot observe live routing, so it certified a fix that never executed.

## Fix — native platform feature, not more JS (Ponytail rung 4)

Webflow has built-in **301 redirects**: Site Settings → Publishing → Redirects. Server-side, works with
JS off, and is a real 301 for SEO (a JS `location.replace` is not). This is strictly better than the
custom-code hack that doesn't run.

Add (old path → new):

| From | To |
|------|-----|
| `/fees` | `/?p=pricing` |
| `/security` | `/?p=legal` |
| `/sample` | `/?p=sample` |
| `/pilot` | `/?p=pilot` |
| `/network`, `/talent` | `/?p=talent` |
| `/hire` | `/?p=hire` |
| `/blog`, `/notes` | `/?p=blog` |
| `/method` | `/?p=method` |
| `/how` | `/?p=how` |
| `/faq` | `/?p=faq` |
| `/founders` | `/?p=founders` |
| `/candidates`, `/engineers` | `/?p=candidates` |
| `/compare` | `/?p=compare` |
| `/about` | `/?p=about` |
| `/status` | `/?p=status` |
| `/partnership` | `/?p=partners` |
| `/apply` | `/?wiz=startup` |
| `/jobs`, `/careers` | `/?wiz=engineer` |
| `/p/*` | `/?p=*` (wildcard if supported) |

Webflow redirects support `/old/*` → `/new/*` wildcards — `/blog/:slug` → `/?p=blog#note-:slug` may not
express cleanly; keep the head JS for the in-page hash cases only.

**Verify after:** `curl -o /dev/null -w "%{http_code}"` each path expects **301**, then re-run the loop above.

## Then (Ponytail cleanup)

Once native 301s exist, most of the 26-entry head map is redundant — delete the inert entries and
narrow `head:path-redirects` to what actually still needs JS (the `/blog/:slug` → hash case), or drop
the gate. Do **not** leave both layers claiming to own routing.

## Session note

term-claude has no Webflow MCP tools (session registry predates the OAuth; `ToolSearch` returns 0 even
selecting `mcp__webflow__*` by exact name). Grok has 31 tools live and can add the redirects, or a human
can do it in Site Settings in ~5 minutes.

---

## CORRECTION (term-claude, ~15:05Z) — MCP probably CANNOT do this. Human needed.

My earlier line "Grok has 31 tools and can add the redirects" is **likely wrong**. Two independent checks:

- `https://developers.webflow.com/data/docs` → no redirect endpoints; redirects are not among the listed
  workflows (CMS, custom code, forms, localization, assets, **SEO settings**, ecommerce).
- `https://developers.webflow.com/llms.txt` (full docs index) → **no** entries for URL redirects / 301
  redirects / site redirect management anywhere.

Webflow MCP bridges the **Data + Designer APIs**. If the Data API exposes no redirect endpoint, MCP has
nothing to call. EXPERT-GUIDE §3's MCP capability list is consistent with this — it names "Pages, SEO meta,
**sitemap flags**" but never redirects.

**⇒ Site Settings → Publishing → 301 Redirects is dashboard/human-only** (or fragile CDP UI automation,
which the guide rates last-resort). This is the same class as §3's "No IX3 create/apply" — a real MCP gap,
not an auth problem. Do not burn cycles trying to script it.

**Action: a human adds the 22 redirects in Site Settings → Publishing → Redirects (~5 min), then publish.**

### Unverified alternative worth ONE test (do not assume)

Webflow supports a designed **404 utility page**. *Hypothesis:* if a real 404 page existed, it would be a
normal Designer page and would therefore carry site-wide custom code — which would make the existing
26-entry head map finally fire, i.e. what the original author assumed all along. Evidence it does **not**
exist today: our live 404 is Webflow's bare **906-byte system default** ("404 - Page not found") with zero
Demigod code. I could not confirm the behaviour from Webflow docs (help pages 403/404 to WebFetch) — so
treat this as a hypothesis to test, not a fact.

Even if it works, it is **second-best**: a JS hop off a 404 page still returns **HTTP 404** to crawlers
(soft-404). A native 301 is the real fix for SEO and for no-JS clients. Use the 404 page only as a
stopgap if the redirects are blocked.

## Verification caveat — do NOT confirm this fix with a `/?p=` curl

`/?p=faq` returns **200**. So does `/?p=totalgarbage`. Query strings do not affect Webflow routing at all —
every `/?p=…` serves the same `index.html`, and foot JS renders the mini-page client-side. **An HTTP 200 on
a `/?p=` URL proves nothing** and will produce a false green.

The only meaningful check is the status of the **old path**:

```bash
for p in /fees /jobs /careers /apply /hire /talent /engineers /candidates /blog /faq /about /status; do
  printf "%-14s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://www.trydemigod.com$p")"
done
# want: 301 (currently: 404)
```

**Targets confirmed valid** (term-claude): all 17 `?p=` keys — pricing faq blog about talent hire status
sample pilot method how founders candidates compare legal contact partners — are genuinely defined in
foot-core, so the redirect table above lands on real rendered content.

## Tick14 gates status (2026-07-16)
**Mitigation shipped:** created 22 Designer shell pages for the dead slugs + site publish. Live curl now **200** with site head (`dg-path-redirects` present) so client map can fire to `/?p=` / `?wiz=`. Native Enterprise 301 API unavailable (plan). CDP redirect POST 412. Home SEO title/desc updated to Tech-Matched + no hello@ in page-settings SEO.

---

## RESOLVED-ish 2026-07-16 15:06Z — stub pages landed, but read the gaps

Re-verified live: **all 22 formerly-dead paths now return 200** and carry the site head, so the
`#dg-path-redirects` map finally fires (`/jobs` → `/?wiz=engineer` confirmed in the map).
Someone created real Designer stub pages. The P0 (hard 404 on every acquisition URL) is **gone**.

**But it is 200, not 301** — so this is a soft/JS redirect, not the native fix:

```
curl -I https://www.trydemigod.com/jobs → HTTP/2 200   (not 301)
title: "Jobs · Demigod" · canonical: https://www.trydemigod.com/
has dg-path-redirects: true · has foot loader: true
```

### Gap 1 — the stubs are completely empty

```
/jobs visible body text length: 0     ← no h1, no copy, nothing
```

A JS-on visitor never notices (head JS bounces them to `/?wiz=engineer`). A **JS-off visitor gets a blank
white page** — arguably worse UX than the old 404, which at least said "page not found". Crawlers that
don't execute JS see 22 empty 200s; the `canonical → /` consolidates them, which mitigates the thin-content
risk, and Google does render JS, so this is likely tolerable — but it is not *good*.

### Gap 2 — 301 is still the right answer

Native 301s remain correct: server-side, no JS, real 301 for SEO, no empty pages in the index.
They are **human-only** (Site Settings → Publishing → Redirects; no Data API/MCP endpoint — see the
CORRECTION section above). If the 22 stubs are kept instead, at minimum give them real content or a
`<noscript>` link to the target so no-JS lands somewhere.

**Verification rule (unchanged):** check the OLD path's status. Do not "confirm" with a `/?p=` curl —
`/?p=totalgarbage` also returns 200.
