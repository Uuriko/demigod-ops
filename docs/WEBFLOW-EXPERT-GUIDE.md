# Webflow Expert Guide for Agents

**Audience:** Grok, Claude Code, Codex, Cursor — anyone mutating Demigod (`talentlink-sf` → `www.trydemigod.com`).  
**Goal:** Operate Webflow like a senior Webflow engineer + automation specialist, not a paste thrash bot.  
**Companions:**  
- Short ops rules → `docs/WEBFLOW-AGENT-PLAYBOOK.md`  
- Demigod failures → `docs/exchange/DEMIGOD-WEBSITE-WEBFLOW-TROUBLESHOOTING-2026-07-13.md`  
- Inspo craft → `docs/exchange/WEBFLOW-INSPO-DEEP-DIVE.md`  
**Research:** Webflow Developer `llms.txt` index, MCP overview, Data/Designer/Custom Code docs, Demigod ship stack (2026-07-16).

---

## 0. Mental model in one page

Webflow is **four products glued together**:

| Product | What it is | Agent access |
|---------|------------|--------------|
| **Designer** | Visual DOM/CSS/components/IX canvas | MCP Designer tools, Designer API/Bridge, CDP UI |
| **Dashboard / Site settings** | Hosting, Custom Code, domains, forms data | MCP/Data API partial; **CM6 Custom Code** via CDP for big blobs |
| **CMS** | Collections, items, staged vs live | Data API + MCP (strong) |
| **Hosting / Publish** | Static+CDN HTML to staging/production | Site publish API / queue-publish / MCP publish skills |

**Demigod-specific fifth layer:** external **CDN foot JS** (`demigod-foot-core.js`) loaded by site footer custom code. Most *product* behavior is **not** in Designer.

```
Designer canvas  ──publish──►  Hosted HTML shell + IX + forms
Site Head code   ──publish──►  Early CSS/JS (FOUC, SEO, redirects)
Site Footer code ──publish──►  path stubs + <script src=CDN foot>
CDN foot-core    ──fetch────►  Runtime product (WIZ, honesty, chrome)
```

If you edit the wrong layer, “ship” can PASS while the user sees no change (or the reverse).

---

## 1. Surfaces agents touch

### 1.1 Designer canvas

**Contains:** structure, classes, combo classes, components, variables, symbols, static text, form fields, IX timelines, assets on canvas.

**Does not contain:** site-wide Custom Code blobs (those are dashboard), external CDN JS body.

**Agent best use:**

| Task | Prefer |
|------|--------|
| New static page, layout section | MCP Designer / Designer API when auth works |
| Permanent static honesty (no-JS copy) | Designer edit + publish — then delete foot scrubs |
| IX animations | **Human/MCP-limited** — MCP cannot create/apply IX3 yet |
| Form field schema | Designer (sync foot `forms()`/`WIZ_CFG`) |

**Anti-pattern:** Using Designer for WIZ logic / honesty rewrites / redesign chrome that already lives in foot-core.

### 1.2 Site Custom Code (dashboard)

**Head:** before `</head>`, every template page (and often 404 templates).  
**Footer:** before `</body>`.  
**Page Custom Code:** page-only, after site-wide — wrong place for Demigod foot loader.

Demigod SoR files:

| Paste target | Disk file |
|--------------|-----------|
| Head | `demigod-head-minimal.html` |
| Footer | `demigod-footer-lite.html` (tiny loader only) |
| Behavior | `demigod-foot-core.js` → CDN, **not** pasted into Webflow |

**Paste method (Demigod):** CodeMirror 6 via `cmTile.view.dispatch` in `demigod-cm6-paste-publish.mjs`.  
**Never:** `keyboard.type` megabytes; paste head without footer or vice versa (dual-loader corruption class).

### 1.3 Hosted live HTML

After publish, inspect:

- HTML comment `Last Published: …`  
- Single `#demigod-foot-cdn-loader`  
- Head unhide / CSS URL  
- `bin/dg truth` (version + sha)  
- CDP JS-on **and** JS-off (truth ≠ look)

### 1.4 External CDN

- Foot: jsDelivr pin `@commit/foot-latest.js` preferred for immutable cache.  
- CSS: catbox (or approved host) linked from head.  
- Long CDN `Cache-Control` → **change pin URL** to bust, don’t hope `@latest` refreshes.

---

## 2. Official Webflow platform map (agent-facing APIs)

From [developers.webflow.com/llms.txt](https://developers.webflow.com/llms.txt):

| Product | Purpose for agents |
|---------|-------------------|
| **Data API v2** | CMS, sites, assets, forms, SEO, **registered scripts**, publish |
| **Designer API** | Control open Designer (elements, styles, components) |
| **Browser API** | Visitor consent / tracking helpers on live sites |
| **Code Components** | React components inside/outside Webflow |
| **Webflow Cloud** | Full-stack apps beside marketing sites |
| **DevLink** | Export/import components to external codebases |
| **Flowkit** | Design-system CSS framework |
| **Apps** | Data clients + Designer extensions |
| **MCP Server** | Natural-language bridge to Data + Designer APIs |
| **Webflow CLI** | Auth, config, deploy workflows |
| **Agent Skills** | Packaged workflows (CMS audit, safe publish, assets…) |

**Markdown trick:** any docs URL + `.md` for clean agent reading.

### 2.1 Auth

| Token type | Use |
|------------|-----|
| **Site token** | Single-site automation, server-side only |
| **Workspace token** | Multi-site / workspace ops |
| **OAuth app** | User-granted multi-site integrations |
| **MCP OAuth** | Agent session (one workspace per auth) |

**Never** put tokens in foot-core or Custom Code client JS.

### 2.2 CMS (Data API strength)

- Collections, fields, items.  
- **Staged vs live** content — publish is explicit.  
- 2025+ publish flexibility: can publish items when staging/production out of sync (fewer 409s).  
- Good for: Notes/blog, changelog, landing content.  
- Bad for: WIZ runtime, honesty scrubs, dual-path CTAs (those are foot/Designer).

### 2.3 Custom Code API (registered scripts)

- Register hosted/inline scripts (cap ~**800** registered scripts/site).  
- Apply to site or pages → **publish**.  
- Good for: analytics tags, small managed scripts.  
- **Not a replacement** for Demigod’s 40k+ head paste + CDN foot architecture unless you redesign the delivery model.

MCP can also **read/write freeform site/page custom code** — evaluate carefully before switching off CM6; huge blobs + auth + review still need discipline.

### 2.4 Site publish

- Marketing site publish pushes Designer + Custom Code to selected domains.  
- Staging (`*.webflow.io`) ≠ production custom domain — **select both** when needed.  
- Demigod automation: session cookie `POST /api/sites/talentlink-sf/queue-publish` from CDP page context.  
- **412 Unauthorized** → re-auth automation Chrome, not “write another publish script.”

---

## 3. Webflow MCP — what agents can and cannot do

**Docs:** https://developers.webflow.com/mcp/reference/overview  
**Install:** Claude Code / Cursor / Claude Desktop / Codex connectors  
**Skills:** https://github.com/webflow/webflow-skills  

### Can do (high value)

- Create/modify **layouts, elements, styles, components, variables**  
- CMS collections/items bulk, publish/unpublish  
- Pages, SEO meta, sitemap flags  
- Assets list/organize/compress  
- Forms read + submissions  
- Site/page **custom code** + registered scripts  
- Content audits (broken links, alt, meta)  
- Analyze traffic (if Analyze add-on)  
- **Agent Instructions** per site (rules that travel with Shared Libraries)  
- Activity log of agent changes  

### Cannot / limited (know these cold)

| Limitation | Implication |
|------------|-------------|
| **No IX3 create/apply** | Animations still Designer-manual |
| Fonts: upload only via MCP; Google/Adobe remote fonts stay in settings | Don’t assume MCP can rewire all fonts |
| No new localized CMS items (can read/update existing) | Locale workflows partial |
| No workspace access settings / invite users | Humans manage access |
| One workspace per OAuth grant | Re-auth to switch workspace |
| Snapshots / selection / breakpoint context need **Designer open + Bridge App** | Background CMS OK without Designer; visual ops need Designer |

### MCP operational issues (community)

- Stale auth → reinstall/re-auth connector  
- Permission prompts for write tools — don’t disable safety for publish  
- On this machine (2026-07-16): Webflow MCP **re-authed** (Grok/Claude/Cursor/Codex) · Designer Bridge smokes · `bin/dg-webflow connect` for spine status. Fall back CDP only when Bridge/MCP down.  

---

## 4. Designer mechanics agents must understand

### 4.1 Classes, combos, variables

- Webflow generates CSS from classes; **Designer styles ≠** foot `brandAssets()` injected CSS.  
- Prefer design tokens/variables when using MCP for visual system work.  
- Foot `!important` fights Designer/IX — use sparingly for product honesty, prefer permanent Designer fixes for static claims.

### 4.2 Interactions (IX)

- Designer interactions can inject early hide CSS and GSAP/IX payloads. Demigod keeps those interactions absent instead of carrying a custom unhide stack.  
- The live raw-asset gate bans GSAP, SplitText, ScrollTrigger, and generated IX hide rules.  
- Agents cannot fully automate IX via MCP yet.

### 4.3 Components & Code Components

- Symbols/components: update once, reuse.  
- Code Components / DevLink: React bridges for advanced apps — separate from Demigod foot CDN pattern.

### 4.4 Forms

- Native forms → Webflow Forms backend / integrations.  
- Client JS **cannot** safely write CMS with secret tokens.  
- Designer form changes break WIZ selectors — always `demigod:verify:source` + wiz playtest after form edits.

### 4.5 SEO

- Page settings (title, meta, OG) + site Custom Code head.  
- Demigod head carries heavy SEO/social; Designer page SEO must not **duplicate** conflicting tags (live doctor flags duplicate description/og:title).

---

## 5. Demigod change classifier (expert decision tree)

Use before any edit (`classifyChange` in `demigod-webflow-lib.mjs` is the code form):

```
User wants change
│
├─ Runtime UX / WIZ / honesty / redesign chrome / dual CTA
│    → demigod-foot-core.js → lock → CDN → CM6 footer loader → publish → truth + CDP
│
├─ Early FOUC / path redirects / head SEO / head CSS link
│    → demigod-head-minimal.html (+ head-styles.css) → CM6 head → publish → truth
│
├─ Permanent static canvas copy / layout / new real pages
│    → Designer (MCP preferred) → publish → JS-off verify → reduce foot scrubs
│
├─ Blog/Notes CMS content
│    → Data API / MCP CMS → publish items → verify URLs
│
├─ Analytics / small third-party tags
│    → Registered scripts API or site head (prefer managed scripts)
│
└─ Dash/tools only
     → Codex lane; never touch foot
```

---

## 6. Demigod ship spine (canonical, memorize)

```bash
# 1) Orient
bin/dg-webflow status
bin/dg-webflow doctor

# 2) Edit disk SoR (one lock owner)
node demigod-foot-lock.mjs claim --owner "$AGENT" --ttl 900
# edit demigod-foot-core.js / head / footer-lite

# 3) Gates
node --check demigod-foot-core.js   # if foot
node demigod-foot-smoke.mjs
npm run demigod:verify:source

# 4) Ship
bin/dg-webflow open custom-code     # signed-in CDP :9223
bin/dg ship run                     # CDN → CM6 head+footer → truth

# 5) Prove it LANDED (Last Published), then prove the foot, then prove the look
curl -s https://www.trydemigod.com/ | grep -o "Last Published:[^-]*"   # MUST have moved. truth cannot tell you this.
bin/dg truth --require-match                                            # foot CDN ver + sha only
# CDP evaluate H1/CTAs JS-on + JS-off

# 6) Release
node demigod-foot-lock.mjs release --owner "$AGENT"
```

Playbooks: `bin/dg-webflow playbook list` → `ship-all`, `prep-footer-paste`, `post-publish-confirm`, `status-only`, `tab-hygiene`.

---

## 7. Expert failure catalog

| Symptom | Layer | Fix |
|---------|-------|-----|
| Truth PASS, “looks same” | Product only in foot microcopy / canvas unchanged | CDP probe; intentional visual change |
| Truth FAIL ver drift | CDN or paste not run | `bin/dg ship run` |
| CM6 paste fail | No custom-code / login wall | `open custom-code`; re-auth |
| queue-publish 412 | Session dead | Re-login CDP Chrome as site owner |
| **Paste + Save succeed but NOTHING publishes; `Last Published` frozen** | **HEAD OVER THE 50,000-CHAR CAP — Webflow returns 200 and SILENTLY keeps the OLD head** | Check `max(head.length, UTF-8 bytes)` vs 50,000 (gate `head:webflow-char-cap`); trim. **Not auth** — see §7.1 |
| Dual foot loaders | Bad paste | Assert single loader id |
| Head/foot swapped | Wrong CM editor | Assert `dg-path-redirects` + `dg-base-tokens` vs foot-loader strings |
| Routes 404 blank | No Designer page + no head redirect | Head redirects or create pages |
| IX forever hidden | Unintended Designer interaction | Remove it at the source; keep the raw GSAP/IX gate green |
| MCP tools missing | OAuth | Re-auth; use CDP spine |
| Forms broken after Designer | Schema drift | Align WIZ_CFG + playtest |
| SEO duplicates | Head + Designer both set meta | Deduplicate |

---

### 7.1 The silent head-cap failure (2026-07-16, cost 83 min)

**Site-wide HEAD custom code caps at ~50,000 characters. Over the cap Webflow fails SILENTLY.**

It returns **200**, Save reports `saved`, and the CM6 editor readback verifies **exactly** — while the
server keeps the **previous** head. Every subsequent publish no-ops and `Last Published` simply stops
moving. Nothing errors anywhere.

Measured on 2026-07-16: sent head **50,411** → `/api/sites/talentlink-sf/code` persisted **49,366** (the
old head); footer 2,639 persisted fine; `status 200 ok:true`. `Last Published` froze at 17:52:41 for 83
minutes across 4+ ship attempts by two agents.

**Do not misread this as auth.** The catalog rows above ("CM6 paste fail → login wall", "queue-publish
412 → session dead") are the obvious suspects and they are WRONG here — they sent the first responder
down a session-expiry path for an hour. **The tell: the FOOTER persists while the HEAD does not.** Auth
failures do not persist one and drop the other.

**Diagnose:** fetch `/api/sites/{slug}/code` from the dashboard tab and compare
`meta.head.length` against what you sent. Truncation/rollback ⇒ cap, not auth.

**Prevent:** `head:webflow-char-cap` in `demigod-verify-source.mjs` fails on disk before the paste
(neg-tested). Gate uses `max(JS .length, UTF-8 byteLength)` so neither metric can sneak over the
cap; detail prints both + headroom (e.g. `48028chars/48118B max=48118/50000 (1882 headroom)`).
Headroom is thin — check that gate (or `wc -c demigod-head-minimal.html`) before adding anything, and
keep long rationale in `docs/`, **never** in the head paste. That is what caused the overflow: comment
prose accumulating in a size-capped field.

**Verify a ship by `Last Published` moving — never by `truth`.** truth only proves the foot CDN sha; it
reported PASS disk=live=v586 throughout the outage.

## 8. How a senior agent works Webflow daily

### 8.1 Morning orientation (2 min)

```bash
bin/dg-webflow status
bin/dg truth
bin/dg-lock status
```

Know: freeze, paste readiness, disk vs live ver, lock owner.

### 8.2 Choosing automation channel

| Channel | When |
|---------|------|
| **Disk SoR + ship spine** | Default Demigod product (foot/head) |
| **MCP** | CMS, SEO bulk, Designer structure (when auth green) |
| **Data API scripts** | Server automation with tokens in env |
| **CDP Designer click** | Last resort; fragile |
| **Human** | IX art direction, brand photography, access control |

### 8.3 Proof standards

Never claim “shipped better UX” from version alone:

0. **`Last Published` on live HTML has MOVED.** Do this FIRST — it is the only proof a publish
   landed. `truth` cannot see the head: on 2026-07-16 truth said PASS disk=live=v586 for 83 min
   while the head was silently rejected and nothing shipped (see §7.1).
1. `truth` fullyShipped — proves the **foot CDN ver + sha only**
2. Live loader pin matches manifest  
3. CDP JS-on: H1, CTAs, trust line  
4. Optional JS-off: static canvas honesty (this is what og: scrapers and no-JS visitors get)  

### 8.4 Team lanes

| Agent | Webflow role |
|-------|----------------|
| Claude | Website SoR (foot/head/blog), Designer MCP when useful |
| Grok | Gates, ship, CDP proof, research, light product |
| Codex | Dash/tools only — **no foot-core** |

### 8.5 Tab budget

CDP Chrome: Custom Code + Designer + live + ops ≤ ~8 pages. Prune aggressively.

---

## 9. Learning curriculum (become expert)

### Week map for agents

1. **Hosting path:** Save vs Publish vs domain selection  
2. **Custom Code:** head vs footer vs page; CM6 paste reality  
3. **IX FOUC:** keep unintended Designer interactions and generated hide rules absent  
4. **Data API:** CMS staged/live, publish items  
5. **Registered scripts** vs freeform Custom Code  
6. **MCP:** install, Agent Instructions, limitations (IX)  
7. **Demigod spine:** lock, CDN pin, truth, dual-domain publish  
8. **Proof:** JS-on/off, Last Published, loader count  

### Canonical docs (bookmark)

| Topic | URL |
|-------|-----|
| Agent docs index | https://developers.webflow.com/llms.txt |
| Data API | https://developers.webflow.com/data/docs |
| MCP overview | https://developers.webflow.com/mcp/reference/overview |
| Custom code help | https://help.webflow.com/hc/en-us/articles/33961357265299 |
| Working with custom code (API) | https://developers.webflow.com/data/docs/working-with-custom-code |
| Agent skills | https://github.com/webflow/webflow-skills |
| MCP server | https://github.com/webflow/mcp-server |
| University APIs | https://university.webflow.com/videos/understanding-webflows-apis |
| MCP install Claude Code | https://developers.webflow.com/mcp/installing/claude-code.md |

### Local code to read

| File | Why |
|------|-----|
| `demigod-webflow-lib.mjs` | Tab roles, change classifier, playbooks |
| `demigod-cm6-paste-publish.mjs` | Real paste + queue-publish |
| `demigod-ship.mjs` | Full ship orchestrator |
| `demigod-truth.mjs` | What “shipped” means |
| `demigod-foot-cdn-publish.mjs` | CDN pin reality |
| `docs/WEBFLOW-AGENT-PLAYBOOK.md` | Short rules |

---

## 10. Demigod architecture (expert diagram)

```
┌──────────────────── Designer ────────────────────┐
│ Static hero/process/pricing/forms (often stale) │
│ IX hide/show                                     │
└──────────────────────┬───────────────────────────┘
                       │ Publish
┌──────────────────────▼───────────────────────────┐
│ Hosted HTML                                      │
│  HEAD: demigod-head-minimal (unhide, SEO, CSS)   │
│  BODY: canvas + Webflow JS                       │
│  FOOT: footer-lite → CDN foot-core vNNN          │
└──────────────────────┬───────────────────────────┘
                       │ Runtime
┌──────────────────────▼───────────────────────────┐
│ foot-core: COPY, hero, WIZ, honesty, dual CTA    │
│ Positioning: Demigod tech + humans in the loop   │
└──────────────────────────────────────────────────┘
```

**Permanent excellence path:** move honesty into Designer canvas → delete runtime rewrites → keep foot for WIZ/product only (Ponytail).

---

## 11. Expert checklist before saying “I’m done”

- [ ] Named the layer(s) changed  
- [ ] Used lock if foot/CDN/paste  
- [ ] `verify:source` green if head/foot  
- [ ] Publish reached **production** domain  
- [ ] `truth` fullyShipped  
- [ ] CDP JS-on matches intent  
- [ ] JS-off residual known (not surprised)  
- [ ] No dual loaders / no thrash ship  
- [ ] Receipt in coord `*-last.json`  

---

## 12. Open improvements (platform + Demigod)

1. **Re-auth Webflow MCP** on this machine → Designer structure without CDP thrash.  
2. Evaluate MCP freeform Custom Code vs CM6 for head (risk: size, review, rollback).  
3. CMS Notes via Data API for content ops (separate from foot blog SoR if dual).  
4. Designer permanent copy pass for honesty (reduce foot scrub surface).  
5. Site Agent Instructions in Webflow for Claude/Cursor: point at this guide + positioning.

---

*This document is the long-form expertise layer. Ops one-pagers stay in `WEBFLOW-AGENT-PLAYBOOK.md`. Update when MCP capabilities or Demigod ship spine change.*
