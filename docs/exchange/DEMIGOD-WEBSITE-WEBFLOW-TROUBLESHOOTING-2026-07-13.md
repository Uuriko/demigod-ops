# Demigod Website + Webflow — Exhaustive Troubleshooting

**Date:** 2026-07-13  
**Status:** Root blank-page cause identified and fixed in **foot v188** (`3ozk21.js`) + head unhide + footer **v36**.  
**Live check after fix:** `body.display=block`, h1 height ~786px, hero CTAs visible, WIZ opens.  
**Do not start from scratch** unless v188 hard-refresh still blanks on real devices after CF cache clear.

---

## 0. Executive summary (what “broken / not loading / blank” actually was)

| Symptom users report | Actual mechanism | Fix |
|---------------------|------------------|-----|
| Site “won’t load” | HTTP often **200**; page paints black | Not always downtime |
| **Blank black page** (only top nav) | **`document.body { display: none !important }`** set by JS | **v188** `hideCard` must never hide `body` |
| Infinite hang / freeze | MutationObserver thrash in foot (form style MO, full-doc MO) | **v187** capped/removed thrash MOs |
| Product pages “source code” | Catbox serves `.html` as **`text/plain` + nosniff** | Product **JS loaders** (`document.write`) v35+ |
| `/hire` dead | Webflow **301s deleted**; no Designer page → **404** without custom code | Use `/?p=hire` until real WF pages exist |
| Agents say green, user sees blank | HTTP + DOM text present while **body display:none** → zero layout box | Measure **bounding rect + body display**, not only `innerText` |
| Flaky agent tests | Headless Chromium often fails CF/lifecycle; CDP tabs wedge | Prefer automation Chrome profile on `:9223` |

**Root cause of blank homepage (confirmed 2026-07-13 live CDP):**

```text
document.body inline style included:
  display: none !important; visibility: visible; opacity: 1
→ getBoundingClientRect() width/height = 0 for body and all content
→ screenshot: black field with only fixed/out-of-flow nav chrome
```

**Why body was set to `display:none`:**

`hideCard(el)` in `demigod-foot-core.js` walked **up the parent chain** until it found a node containing `a,button`.  
`document.body` always matches → **`body.style.setProperty('display','none','important')`**.  
Called from pricing scrub / subscription card hide paths → **entire site blank**.

---

## 1. Architecture map (what can break)

```
Browser
  → Cloudflare (cache, CF challenge, edge)
  → Webflow hosting (HTML page shell)
      HEAD custom code (unhide CSS/JS, design CSS from catbox)
      BODY Webflow Designer content + IX (Interactions) CSS
      FOOTER custom code (path router + product loaders + foot-core CDN)
  → files.catbox.moe
      foot-core.js (behavior: WIZ, CTAs, scrub, hideCard, …)
      product-*.js (document.write full product HTML)
      m2f8rp.css (design tokens)
```

**Single points of failure**

1. Webflow custom code not Saved/Published  
2. Catbox 0-byte or wrong file  
3. Foot JS exception before unhide / after setting body none  
4. Webflow IX `visibility:hidden` without `w-mod-ix3`  
5. Product path 404 (no WF page)  
6. Catbox HTML MIME (text/plain)  
7. CORS if using `fetch()` of HTML cross-origin  
8. Agent publish freeze / 412 Unauthorized on Webflow APIs  

---

## 2. Symptom → diagnostic decision tree

### 2.1 Completely unreachable

```bash
curl -sS -o /dev/null -w "%{http_code} ttfb=%{time_starttransfer}\n" https://www.trydemigod.com/
```

| Result | Meaning | Action |
|--------|---------|--------|
| 000 / timeout | DNS, network, CF outage | Check DNS, CF status, try mobile data |
| 5xx | Webflow/CF origin error | Webflow status; republish |
| 200 | **Not downtime** | Go to blank-page checks |

### 2.2 HTTP 200 but blank / black

**A. Body display none (THIS WAS THE BUG)**

```js
// DevTools Console on https://www.trydemigod.com/
getComputedStyle(document.body).display
// "none" → blank site
document.body.getAttribute('style')
// look for display: none !important
document.body.getBoundingClientRect()
// height 0
```

**Immediate user unblock (until fixed foot loads):**

```js
document.body.style.setProperty('display','block','important');
```

**B. Webflow IX hide (visibility hidden)**

```js
document.documentElement.className
// need w-mod-js AND w-mod-ix3
```

Webflow injects early:

```css
html.w-mod-js:not(.w-mod-ix3) :is(h1,h2,.nav_container,...) {
  visibility: hidden !important;
}
```

If head unhide script fails, content stays invisible (nav may still show if forced).

**C. Foot CDN empty or blocked**

```bash
# extract foot URL from homepage HTML
curl -sS https://www.trydemigod.com/ | grep -oE 'https://files.catbox.moe/[a-z0-9]+\.js'
curl -sS -D- -o /tmp/foot.js -w "%{http_code} %{size_download}\n" <FOOT_URL>
# size must be ~100k+ for foot-core; 0 bytes = dead CDN
head -c 120 /tmp/foot.js   # expect /*dg-foot-v188-core*/
```

Adblockers / corporate filters sometimes block `files.catbox.moe`.

**D. JS error before boot**

DevTools → Console: red errors in `3ozk21.js` / unhide script.  
Any SyntaxError aborts rest of foot → partial UI / stuck IX hide.

### 2.3 “Loads then freezes / unresponsive”

Historical causes:

| Cause | Version | Fix |
|-------|---------|-----|
| Full-document MutationObserver + `run()` DOM mutations | pre-v187 | OBS disabled / capped |
| Form `style` attribute MO calling `setProperty` on same form | pre-v187 | Only re-force if `display===none` |
| Footer honesty MO walking text + thrash | footer v28–29 | v30 timed passes only |
| `setInterval(forceFormVisible, 400)` forever | pre-v186 | Removed |

### 2.4 Product pages broken

| URL | Expected | Failure mode |
|-----|----------|--------------|
| `/?p=hire` | Product HTML via JS loader | Loader missing/wrong URL; CORS if fetch |
| `/hire` | Should 200 WF page **or** 301 | **Currently 404** (redirects deleted, no Designer page) |
| `files.catbox.moe/*.html` | Rendered page | **text/plain** → source code in browser |
| `files.catbox.moe/*product*.js` | `document.write` HTML | Works as `application/javascript` |

### 2.5 Forms / WIZ not opening

```js
window.dgFootVersion          // need v188+
document.querySelector('.hero-actions a.premium-btn.is-talent')
  ?.getAttribute('data-demigod-modal')  // "startup"
getComputedStyle(document.querySelector('#startup-modal')).display  // "flex" when open
```

Historical: `nav()` hid **all** `HIRE TALENT` links including hero (fixed v184).  
Deep link: `/?wiz=startup` or `/?wiz=engineer`.

### 2.6 Agent / automation says broken, human OK (or reverse)

| Harness | Known issue |
|---------|-------------|
| Playwright/Puppeteer headless | CF / `networkidle` hangs; not proof of downtime |
| CDP on wedged tab | `Runtime.enable` timeout |
| curl-only | Misses blank body (still 200 + HTML) |
| `innerText.length` only | Can be large while `body.display=none` |

**Required green definition:**

1. `body` computed `display !== 'none'` and height > 100  
2. `h1` getBoundingClientRect().height > 20  
3. `window.dgFootVersion` matches intended  
4. Screenshot shows hero text  
5. WIZ opens on click or `?wiz=startup`  

---

## 3. Live inventory (2026-07-13 post-mortem measurements)

### 3.1 Before v188 blank fix

```
body.display = "none"
body inline = "visibility: visible !important; opacity: 1 !important; display: none !important;"
body rect = { w:0, h:0 }
h1 rect = { w:0, h:0 }
screenshot = black + nav only
```

### 3.2 After v188

```
dg = v188
body.display = block
body height ≈ 5885
h1 height ≈ 786
hire CTA height ≈ 64
WIZ open = true on ?wiz=startup
screenshot = hero + copy visible
```

### 3.3 Routes

| Path | HTTP | Notes |
|------|------|-------|
| `/` | 200 | Homepage |
| `/?p=hire` | 200 | Product via JS loader |
| `/hire` | **404** | No WF page; system 404 has **no** site custom code |
| `/pricing` | 200 | Legacy WF pricing page exists |
| Foot CDN `3ozk21.js` | 200 ~118KB | v188 |
| Catbox `.html` product | 200 **text/plain** | Do not deep-link |

---

## 4. Webflow-specific troubleshooting

### 4.1 Custom Code pipeline

1. Dashboard → Site → **Custom code**  
2. **Head** = `demigod-head-minimal.html` (unhide + tokens + CSS)  
3. **Footer** = `demigod-footer-lite.html` (router + foot CDN + honesty)  
4. **Save** then **Publish** to `trydemigod.com`  

**Failures seen**

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Save without Publish | Staging OK, live stale | UI Publish to selected domains |
| API `queue-publish` **412** | Auth cookie stale | UI Publish; re-login automation Chrome |
| Publish freeze file | Agents skip publish | `node demigod-publish-freeze.mjs off` when shipping critically |
| CM6 paste wrong pane | Head/foot swapped | Verify preview strings (`dg-unhide` vs `foot-cdn-loader`) |
| Aggressive regex on footer | **Product CDN map all rewritten to foot URL** | Never bulk-replace all catbox `.js` URLs |

### 4.2 301 redirects

- Product 301s previously pointed at catbox HTML (broken MIME).  
- **Deleted via UI “Delete all”** 2026-07-13.  
- Live now: `/hire` → **404** (not ideal, but avoids text/plain trap).  
- Re-adding 301s: only to hosts with `Content-Type: text/html`, **or** keep `/?p=…` JS loaders.  
- Mutating redirects API often **412** without fresh login.

### 4.3 Designer vs Custom Code

- Designer visual content can be healthy while custom foot blanks `body`.  
- Interactions (IX) hide content until JS; custom unhide must run **after** Webflow’s `w-mod-js` class inject.  
- Order in live HTML: Webflow IX hide CSS → our unhide CSS → early unhide script → … → footer foot.

### 4.4 Assets / CDN

| Asset | Host | MIME | Risk |
|-------|------|------|------|
| Foot core | catbox `.js` | `application/javascript` | Empty upload |
| Product HTML | catbox `.html` | **text/plain** | Source view |
| Product loaders | catbox `.js` | `application/javascript` | Preferred |
| Design CSS | catbox `.css` | css | FOUC if blocked |
| Webflow shared CSS | website-files.com | css | Integrity hash |

### 4.5 Publishing auth (automation)

```
POST /api/sites/talentlink-sf/queue-publish → 412 Unauthorized
GET  /api/sites/talentlink-sf/redirects     → 200 (read often works)
```

**Playbook:** open Publishing UI in automation profile → click **Publish** → confirm domain `trydemigod.com` → wait “Published a few seconds ago”.

---

## 5. Code-level failure catalog (foot / head / footer)

### 5.1 `hideCard` body climb — **P0 blank** (fixed v188)

```js
// BAD (pre-v188): walks to body, body has buttons → hide body
function hideCard(el){
  var c = el;
  for (...) {
    if (c.querySelector('a,button')) {
      c.style.setProperty('display','none','important'); // body!
      return;
    }
    c = c.parentElement;
  }
}
```

**Fix:** refuse to hide `body, html, main, .hero-section, header, footer, modals`.

### 5.2 MutationObserver thrash — **P0 freeze** (fixed v187)

- Form attribute MO + `style.setProperty` → infinite sync loop  
- Full-document MO scheduling `run()` after every mutation  

### 5.3 Hero CTA hide — **P1** (fixed v184)

`nav()` hid every `HIRE TALENT` link including `.hero-actions`.

### 5.4 Product `visibility:hidden` flash — **P1 blank** (fixed v36)

`loadProduct` set `documentElement.visibility='hidden'` before async load; failure left page blank.

### 5.5 Catbox HTML MIME — **P1**

Do not `location.replace` to catbox HTML. Use JS loaders or same-origin HTML host.

### 5.6 `/hire` 404 — **P2**

Create real Webflow pages **or** only link `/?p=hire`. System 404 has **zero** site footer code.

---

## 6. Fix verification checklist (do this every ship)

```bash
# 1) Source
npm run demigod:verify:source
node demigod-verify-loop-state.mjs
node demigod-verify-board-honesty.mjs

# 2) CDN
curl -sS https://www.trydemigod.com/ | grep -oE 'files.catbox.moe/[a-z0-9.]+' | sort -u
curl -sS <FOOT_URL> | head -c 80   # v188 marker
wc -c <<< "$(curl -sS <FOOT_URL>)"  # ~118000

# 3) Browser (automation Chrome :9223 preferred)
# In page:
#   getComputedStyle(document.body).display === 'block'
#   document.querySelector('h1').getBoundingClientRect().height > 20
#   window.dgFootVersion === 'v188'
#   click Hire → #startup-modal display flex
#   /?p=hire → title Hire · Demigod, a.cta present

# 4) Screenshot both home and ?p=hire (visual mandatory)
```

---

## 7. Should we start from scratch?

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Continue patch (current)** | Root blank cause known; v188 fixes it; WIZ/product machinery exists | Complexity debt; catbox dependency; no `/hire` pages | **Default — hard refresh + verify v188** |
| **Simplify custom code** | Smaller attack surface | Rebuild cost; risk new blank | After 48h stable, strip thrash paths further |
| **Full Webflow rebuild** | Clean Designer | Weeks; loses foot/WIZ investment | Only if v188 fails after cache purge on real phones |
| **Move off Webflow** | Control hosting MIME | Migration cost | Long-term if catbox/WF auth keep failing |

**Verdict:** Do **not** start from scratch solely because of blank page — that was a one-line class of bug (`hideCard` → body). Rebuild only if:

1. Hard refresh on phone + desktop still blanks **with** `dgFootVersion=v188` and `body.display=block`, or  
2. Foot CDN is systematically blocked for users, or  
3. Webflow publish auth remains unusable for >1 week of ops.

---

## 8. Immediate ops playbook (human or agent)

1. **Hard refresh** `https://www.trydemigod.com/` (bypass CF cache).  
2. Console: confirm `window.dgFootVersion === 'v188'`.  
3. Console: `getComputedStyle(document.body).display` → must be `block`.  
4. If `none`: run  
   `document.body.style.setProperty('display','block','important')`  
   and report still on old foot.  
5. Open `/?wiz=startup` — modal must open.  
6. Open `/?p=hire` — product page title **Hire · Demigod**.  
7. If still broken: DevTools Network → is `3ozk21.js` 200 non-empty?  
8. Webflow Custom Code footer must contain `v36` / `3ozk21` / product map with **distinct** hire/talent/… IDs (not all foot URL).

---

## 9. Multi-agent / tooling notes

| Resource | Role in troubleshooting |
|----------|-------------------------|
| **Grok (this agent)** | Live CDP, curl multiprobe, foot/head edits, paste publish |
| **Fable / Claude (`bin/df`)** | Architecture reviews; ask for hideCard/MO audits before big foot edits |
| **Codex / Cursor** | Precise multi-file patches; Plan mode on foot-core |
| **Chrome DevTools MCP** | a11y/screenshots when CDP not wedged |
| **Playwright headless** | Unreliable for live CF; use for local mini fixtures only |
| **Automation Chrome :9223** | Source of truth for “real browser” |

Suggested Fable prompt for next deep audit:

```text
Demigod (Webflow talent matching). Use current disk truth and task-specific context.
Audit demigod-foot-core.js v188 for any path that can set body/html/main display:none
or visibility:hidden on page shells. List every hideCard/price/rmSubCard/roles junk call.
Propose minimal guards only. Do not redesign WIZ.
```

---

## 10. Version timeline (relevant)

| Ver | Change |
|-----|--------|
| v183 | Baseline “healthy” claim before thrash rediscovery |
| v184 | Stop hiding hero CTAs in `nav()` |
| v186–187 | Kill MO thrash / perpetual intervals |
| v35 | Product JS loaders (catbox HTML text/plain) |
| **v188 / footer v36** | **hideCard body blank fix + body display:block force** |

---

## 11. Open follow-ups (ordered)

1. **Confirm product `/?p=hire`** loads **Hire · Demigod** after footer re-paste (not homepage).  
2. Create real Webflow pages for `/hire` `/talent` … (or restore 301s only to HTML-correct hosts).  
3. Host design CSS + foot on Webflow Assets if catbox blocks any users.  
4. Add automated gate: `body.display==='block' && h1.height>20` in CDP smoke.  
5. Re-auth Webflow automation profile to clear 412 publish/redirect API.  
6. Soften foot further: ban any `setProperty('display','none')` without denylist of page shells (lint rule).

---

## 12. One-line root cause (for the record)

> The homepage “loaded but blank” because foot-core’s `hideCard()` walked up to `document.body` and set `display:none !important`, collapsing the entire layout to zero size while HTTP stayed 200 and DOM text still existed.

**Fixed in v188. Hard-refresh the live site.**
