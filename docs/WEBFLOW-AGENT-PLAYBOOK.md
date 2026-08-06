# Webflow · Agent Playbook (Grok + Claude + Codex)

**Audience:** coding agents operating Demigod (`talentlink-sf` → `www.trydemigod.com`).  
**Why this exists:** Agents thrash Designer, Custom Code, CDN, and publish. This is the shared model of *how Webflow works* and *how we should interact with it*.  
**Related:** `docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md`, `demigod-webflow-lib.mjs`, `demigod-cm6-paste-publish.mjs`, `demigod-ship.mjs`.

**Deep expertise:** `docs/WEBFLOW-EXPERT-GUIDE.md` (platform map, MCP limits, decision tree, curriculum).
**This machine setup:** `docs/WEBFLOW-MCP-SETUP.md` · `bin/dg-webflow connect setup`
**Research date:** 2026-07-16 · Sources: Webflow Help/University, developers.webflow.com Data API docs, Demigod postmortems + ship tooling.

---

## 1. Mental model: three layers (never confuse them)

```
┌─────────────────────────────────────────────────────────────┐
│  A. DESIGNER CANVAS (visual SoR for layout/static content)   │
│     talentlink-sf.design.webflow.com                         │
│     HTML structure · classes · IX (interactions) · forms     │
└───────────────────────────┬─────────────────────────────────┘
                            │ Publish
┌───────────────────────────▼─────────────────────────────────┐
│  B. SITE CUSTOM CODE (dashboard SoR for head/footer inject)  │
│     webflow.com/dashboard/sites/{slug}/custom-code           │
│     Site-wide Head + Footer · CodeMirror 6 editors           │
└───────────────────────────┬─────────────────────────────────┘
                            │ Publish (queue-publish)
┌───────────────────────────▼─────────────────────────────────┐
│  C. LIVE HOSTED HTML (what users get)                        │
│     www.trydemigod.com · CF/Webflow CDN · Last Published     │
│     Designer shell + IX + Custom Code + external CDN JS/CSS  │
└─────────────────────────────────────────────────────────────┘
```

**Demigod reality:** Product behavior (WIZ, honesty scrubs, redesign chrome, mini-pages) lives mostly in **external foot JS** loaded from footer custom code — not in Designer. Designer can look “old” while live JS rewrites the DOM. Gates that only check foot version can PASS while the page *looks* unchanged if only microcopy changed.

| Layer | What agents can change | What users see without JS |
|-------|------------------------|---------------------------|
| Designer canvas | Structure, static copy, forms | Everything static |
| Site Custom Code head | FOUC unhide, early redirects, SEO meta, CSS link | Critical early CSS/JS |
| Site Custom Code footer | Foot CDN loader (`footer-lite`) | Script tag only |
| External CDN (jsDelivr/catbox) | `demigod-foot-core.js`, head CSS file | Runtime product |

---

## 2. How Webflow works (product)

### 2.1 Designer vs Dashboard vs Live

| Surface | URL pattern | Purpose |
|---------|-------------|---------|
| **Designer** | `*.design.webflow.com` | Visual build; symbols; IX; forms on canvas |
| **Dashboard** | `webflow.com/dashboard/sites/{slug}/…` | Site settings, **Custom Code**, hosting, forms data |
| **Staging** | `{slug}.webflow.io` | Publish target for testing |
| **Production** | custom domain | Must be **selected** in publish dialog (easy miss) |

Publish is not “save.” Save Custom Code or Designer ≠ live until **Publish** succeeds to the domain you care about. Always confirm **Last Published** on live HTML and that `www.trydemigod.com` was in the domain list.

### 2.2 Custom Code (site-wide vs page)

From Webflow Help (2026):

- **Site settings → Custom Code → Head** — injected before `</head>` on **every page** that uses the site template.  
- **Site settings → Custom Code → Footer** — before `</body>` site-wide.  
- **Page settings → Custom Code** — page-only; appears **after** site-wide code.

**Implications for agents:**

1. Site-wide footer loader runs on all Designer pages that ship the site template — **not** on Webflow system 404s for missing routes.  
2. Early head scripts (path redirects, FOUC hide) run on 404 templates too if they’re site-wide head — useful for `/fees` → `/?p=pricing`.  
3. Page-level code is the wrong place for Demigod foot-core (would fragment SoR).

### 2.3 Head vs footer for JS/CSS

Classic rule (Webflow blog/University):

- **CSS** → prefer head (or external stylesheet linked from head).  
- **JS that needs DOM** → prefer footer / end of body so nodes exist.  
- **JS that must run early** (path redirect, meta) → head, carefully, non-blocking.

Demigod splits:

- `demigod-head-minimal.html` → site Head (redirects, CSS CDN, FOUC honesty).  
- `demigod-footer-lite.html` → site Footer (path replace + **one** foot CDN script).  
- `demigod-foot-core.js` → **not** pasted into Webflow; hosted on CDN; footer only loads it.

### 2.4 Interactions (IX) and FOUC

Webflow can inject early hide CSS and GSAP plugins when Designer interactions exist. Demigod intentionally has no Designer GSAP/IX interactions:

1. Do not add a custom unhide workaround; remove the unintended interaction at its source.  
2. Keep the raw production gate green for GSAP, SplitText, ScrollTrigger, and IX hide rules.  
3. Test **with JS on** and **JS off** — different products.

### 2.5 Forms

- Native Webflow forms submit to Webflow Forms / integrations.  
- Frontend JS **cannot** write CMS from the browser with a secret token (token must stay server-side).  
- Demigod WIZ wraps native forms; don’t replace with raw `mailto:` actions.  
- Form DOM changes in Designer can break WIZ selectors — verify after Designer edits.

### 2.6 CMS vs static

- CMS items: Data API + Editor.  
- Designer static text: canvas only — **not** updated by foot CDN.  
- Runtime scrubs (honesty) rewrite static canvas claims after load; crawlers/no-JS still see canvas.

### 2.7 Hosting / cache

- Live HTML: Cloudflare + Webflow; `Last-Modified` / `Last Published` comment in HTML.  
- External JS on jsDelivr: long `Cache-Control` (immutable pins preferred: `@commit` not `@latest` alone for ship proof).  
- Changing footer `src` hash is the real cache-bust for foot; same URL = sticky CDN cache.

---

## 3. Webflow surfaces agents can use (2026)

### 3.1 Data API (REST)

**Docs:** https://developers.webflow.com/data/docs · MCP index: https://developers.webflow.com/llms.txt

Capable of:

- CMS CRUD + publish workflows  
- **Registered scripts** (hosted/inline) → apply to pages → publish site  
- Forms export, assets, SEO meta bulk, ecommerce, localization  

**Auth:** site token or OAuth app. Tokens must **not** go in client foot JS.

**Critical limitation:** Data API **registered scripts** are a structured script registry, **not** a full dump/replace of the giant site Head/Footer Custom Code blobs agents paste via CM6. Demigod’s 40k+ head + footer-lite loader path is historically CM6/CDP, not Register Script API. Do not assume “Data API custom code” replaces `demigod-cm6-paste-publish.mjs` without a dedicated migration.

**Publish:** After API content/script changes, still **publish** the site for production.

### 3.2 Designer API / MCP (connected stack · 2026-07-16)

**Official MCP** at `https://mcp.webflow.com/mcp` is configured for **Grok, Claude Code, Cursor, Codex**. OAuth tokens live in agent credential stores (not foot/Custom Code).

| Layer | Needs | Use for |
|-------|-------|---------|
| **Data MCP** | OAuth only | CMS, SEO, pages, assets, webhooks, publish, Analyze, **agent instructions** |
| **Designer MCP** | OAuth + **Bridge App open** in Designer | Canvas structure, styles, selection, breakpoints |
| **CDP ship** | Chrome `:9223` signed-in | CM6 head/footer paste, queue-publish |
| **chrome-devtools MCP** | same CDP | Live proof on trydemigod.com |
| **REST site token** (optional) | `~/.config/demigod/webflow.env` | Node scripts (`webhook-setup`, CMS CLI) when MCP not used |

**Connect doctor:** `bin/dg-webflow connect` · open Bridge: `bin/dg-webflow connect bridge`  
**Bridge deep-link:** `https://talentlink-sf.design.webflow.com/?app=dc8209c65e3ec02254d15275ca056539c89f6d15741893a0adf29ad6f381eb99`  
**Site agent rules:** Webflow `rules/demigod-agent.md` · mirror `docs/WEBFLOW-AGENT-INSTRUCTIONS.md`

Prefer:

1. **MCP Data** for CMS/SEO/publish/instructions when auth green.  
2. **MCP Designer** when Bridge panel is connected (Designer tab foreground).  
3. Fall back to CDP + `bin/dg-webflow` for CM6 paste / stuck UI.

Designer MCP is best for: create/rename pages, set SEO fields, light layout — **not** megabyte Custom Code paste.

### 3.3 Browser automation (CDP / Playwright)

What actually works for Demigod ship:

| Step | Tool | Notes |
|------|------|-------|
| Open Custom Code | `bin/dg-webflow open custom-code` | Need signed-in CDP Chrome `:9223` |
| Paste head+footer | `demigod-cm6-paste-publish.mjs` | **CodeMirror 6** via `cmTile.view.dispatch` — **never** `keyboard.type` megabytes |
| Publish | same script → `POST /api/sites/talentlink-sf/queue-publish` with session cookies | UI click is backup |
| Prove | `bin/dg truth --require-match` | disk ver + CDN sha + live loader |

**Auth failure modes:** login wall, 404 custom-code (wrong workspace), **412 Unauthorized** on queue-publish (stale session) → re-auth automation Chrome, don’t thrash paste.

### 3.4 What API still can’t do well (industry + us)

Even with MCP/Data API (2026), agents still hit gaps:

- Rich Text / complex canvas widgets often need Designer UI (or browser robot).  
- Giant site Custom Code editors remain CM6 UI-shaped.  
- “Looks different” requires either Designer model changes or intentional visual CSS/JS — not just version bumps.

---

## 4. Demigod ship spine (canonical)

```
disk demigod-foot-core.js  ──► foot CDN publish (jsDelivr pin)
         │                              │
         │                              ▼
         │                    demigod-footer-lite.html (loader URL)
         │                              │
demigod-head-minimal.html  ──► CM6 paste head + footer
         │                              │
         └──────────────► queue-publish ──► live HTML
                                │
                                ▼
                         bin/dg truth (require match)
```

**CLI front doors:**

| Intent | Command |
|--------|---------|
| Orient Webflow | `bin/dg-webflow status\|doctor` |
| MCP/Bridge/token spine | `bin/dg-webflow connect` · `connect bridge` |
| Open surfaces | `bin/dg-webflow open designer\|custom-code\|live` |
| Full ship | `bin/dg ship run` (request authorization + lock + freeze-aware) |
| Site bundle CDN | `node demigod-foot-cdn-publish.mjs` |
| Paste only | `node demigod-cm6-paste-publish.mjs [--no-publish]` |
| Proof | `bin/dg truth` / `bin/dg truth --require-match` |

**Locks:** `node demigod-foot-lock.mjs claim --owner …` before foot mutate/CDN/paste.  
**Freeze:** mutations blocked if freeze ON (currently often disabled — still check).

---

## 5. Agent rules of engagement

### 5.1 Choose the right tool for the change

| Change type | Correct surface | Wrong surface |
|-------------|-----------------|---------------|
| WIZ / honesty / redesign JS | `demigod-foot-core.js` → CDN → footer loader | Designer only |
| FOUC / early redirect / SEO head | `demigod-head-minimal.html` → CM6 head | Foot core |
| Head CSS tokens | `demigod-head-styles.css` → catbox URL in head | Inline thrash |
| Static canvas copy / layout | Designer (+ publish) | Foot version only (users still see old no-JS) |
| New URL as real page | Designer page **or** head redirect to `/?p=` | Assume footer runs on 404 |
| CMS blog posts | Data API / CMS Editor | Foot string hacks for bulk content |
| Form field structure | Designer form + foot `forms()`/`wizBuild` sync | API custom code |

### 5.2 Publish discipline

1. **One writer** on foot (lock).  
2. **Pin CDN** by commit hash in footer loader (not floating `@latest` for truth).  
3. **Paste pair** head+footer together (split = dual-footer corruption class bugs).  
4. **Publish both domains** if staging + production exist.  
5. **Truth, not exit code — but truth is NOT proof of a ship.** CM6 may exit non-zero on flaky
   taskComplete while `PUBLISH_FINISHED` + truth PASS. **However `truth` only proves the foot CDN
   ver + sha — it says NOTHING about the head paste.** On 2026-07-16 CM6 exited 4 (head silently
   rejected, over the 50k cap), truth reported PASS disk=live=v586 for 83 minutes, and no ship
   landed. **Confirm a ship by `Last Published` moving on live HTML**, then truth for the foot.  
6. **No thrash** — don’t ship for meta-tool wins; ship for product.

### 5.3 Verification that matches user reality

| Check | Proves | Misses |
|-------|--------|--------|
| `verify:source` | Disk SoR invariants | Live look |
| `foot-smoke` | Markers / decision paths in source | Browser UX |
| `bin/dg truth` | Live loader ver + CDN body sha | Visual redesign; **the HEAD paste entirely** (head can be stale/rejected while truth is green) |
| CDP JS-on probe | Runtime DOM after foot | No-JS / SEO static |
| CDP JS-off probe | Static canvas honesty | Runtime product |

**Always pair** truth with a short CDP read of H1/CTAs when claiming “site looks different.”

### 5.4 Tab budget (CDP)

Keep ~4–8 pages: Custom Code, Designer, live, ops dash.  
`bin/dg-webflow` / `bin/dg hygiene --prune`. Login walls don’t count as paste-ready.

### 5.5 Lanes

| Agent | Webflow role |
|-------|----------------|
| **Claude** | Website SoR: foot/head/blog; claim `coord-claude` for foot |
| **Grok** | Gates, ship assist, CDP proof, light product |
| **Codex** | Dash/tools; **never** edit foot-core |

---

## 6. Failure catalog (agent-relevant)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| “Published” but same look | Only foot microchange; canvas same; cache | CDP probe; hard refresh; intentional visual CSS/JS |
| Truth FAIL version drift | CDN or paste not run | `bin/dg ship run` |
| Truth PASS, user sees old | Browser/CDN cache of HTML or old pin | Confirm live HTML loader hash; purge/wait |
| CM6 paste fails | No custom-code tab / login | `bin/dg-webflow open custom-code`; re-auth |
| queue-publish 412 | Session cookie dead | Re-login CDP Chrome site owner |
| Paste+Save OK but nothing publishes; `Last Published` frozen | **Head over the ~50,000-char cap — Webflow returns 200 and silently keeps the OLD head** | Check `max(chars, UTF-8 bytes)` vs 50k (gate `head:webflow-char-cap`); trim. **Not auth** — the footer persists while the head does not |
| Head/foot swapped | Wrong CM6 pane | Assert `dg-path-redirects` + `dg-base-tokens` vs foot-loader strings |
| Routes 404 with no JS | No Designer page + redirects deleted | Site head redirects or create pages |
| IX hides content forever | Unintended Designer interaction | Remove the interaction; keep the raw GSAP/IX gate green |
| Dual foot loaders | Bad paste | Single `#demigod-foot-cdn-loader` |
| MCP tools missing | Webflow MCP auth | Re-auth; fall back CDP |

---

## 7. Recommended agent workflows

### 7.1 Product JS change (default Demigod)

```bash
node demigod-foot-lock.mjs claim --owner "$AGENT" --ttl 900
# edit demigod-foot-core.js → bump version markers
node --check demigod-foot-core.js
node demigod-foot-smoke.mjs
npm run demigod:verify:source
bin/dg-webflow open custom-code
node demigod-ship.mjs run   # CDN + CM6 + publish
bin/dg truth --require-match
# CDP probe H1/CTAs
node demigod-foot-lock.mjs release --owner "$AGENT"
```

### 7.2 Head-only change

Edit `demigod-head-minimal.html` / CSS → verify:source → CM6 paste (ship path) → truth + live curl head markers.

### 7.3 Designer structure / permanent static honesty

1. Plan change (no thrash).  
2. MCP Designer **or** human/Designer CDP.  
3. Publish.  
4. Confirm **JS-off** snapshot matches intent.  
5. Reduce foot scrubs only after canvas is honest (Ponytail: delete runtime rewrites that are no longer needed).

### 7.4 Research / CMS

Use Data API + site token server-side; don’t put tokens in foot.

---

## 8. What “good agent interaction” looks like

1. **Name the layer** before editing (Designer / Custom Code / CDN / live).  
2. **Prefer disk SoR** files over live reverse-engineering.  
3. **Ship is a product action**, not a habit.  
4. **Prove with truth + one browser evaluation**, not version comments alone.  
5. **Don’t invent parallel publish paths** — extend `demigod-ship` / `dg-webflow` / `cm6-paste`.  
6. **Session auth is infrastructure** — 412 means re-auth, not “write more paste code.”  
7. **Positioning & copy** live in foot `COPY` / hero; Designer still owns first paint without JS.

---

## 9. Official links (bookmark)

| Topic | URL |
|-------|-----|
| Custom code head/footer | https://help.webflow.com/hc/en-us/articles/33961357265299-Custom-code-in-head-and-body-tags |
| Page vs site code (University) | https://university.webflow.com/videos/page-site-level-code |
| Data API | https://developers.webflow.com/data/docs |
| Custom Code API guide | https://developers.webflow.com/data/docs/working-with-custom-code |
| LLM docs index | https://developers.webflow.com/llms.txt |
| Webflow MCP | https://developers.webflow.com/_mcp/server |
| Advanced publish / CSS | https://help.webflow.com/hc/en-us/articles/33961287288339-Advanced-publishing-options |

---

## 10. One-page Demigod cheat

```
Site: talentlink-sf
Live: https://www.trydemigod.com
Designer: https://talentlink-sf.design.webflow.com/
Custom Code: https://webflow.com/dashboard/sites/talentlink-sf/custom-code
CDP: http://127.0.0.1:9223

SoR:
  foot behavior → demigod-foot-core.js (CDN)
  footer embed  → demigod-footer-lite.html
  head paste    → demigod-head-minimal.html
  head CSS      → demigod-head-styles.css → catbox URL in head

Ship: lock → CDN → CM6 head+foot → queue-publish → truth
Never: dual loaders · keyboard.type into CM6 · publish without domain check · foot without lock
```

---

*Maintainer note (2026-07-16): MCP re-authed · Bridge smokes green · agent instructions live · connect CLI added. Prefer MCP Designer vs CDP per §3.2. Keep product-first — no new meta-tools without deleting an old path.*
