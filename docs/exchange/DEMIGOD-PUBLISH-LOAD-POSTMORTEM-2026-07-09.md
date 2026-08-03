# Demigod publish + load postmortem (2026-07-09)

**Audience:** Grok, Fable/Claude, Cursor, human.  
**Sites:** production `https://www.trydemigod.com` · staging `https://talentlink-sf.webflow.io` · Designer `talentlink-sf.design.webflow.com`  
**Not a test domain.** Apex `trydemigod.com` → 301 → `www.trydemigod.com` (Webflow + Cloudflare).

## User symptoms

1. “I published and nothing happened.”
2. “Site not loading / endless spinner / blank.”
3. Agents/Claude “working for days” with little live proof.

## Root causes (ranked)

### P0 — Main-thread freeze (endless loading)

Live HEAD custom code (`unhide-v4`) ran a `MutationObserver` on `style`/`class` while the same script **wrote styles** on every tick. That is an infinite mutation loop → browser spinner never finishes.

Worse: HEAD was **double-pasted** (`dg-early-unhide` ×2, supabase ×2, xngres ×2) so thrash ran twice.

**Disk fix:** `demigod-head-minimal.html` → **`unhide-v5-safe`**  
- CSS-first unhide  
- Finite `setInterval` (~20 ticks)  
- **No** attribute MutationObserver  
- Guard `window.__dgUnhideV5`  
- Supabase `async defer` (non-blocking)

### P0 — Publish updates staging only

Webflow “Publish to selected domains” can leave **www.trydemigod.com** unchecked.  
Truth: HTML comment `<!-- Last Published: ... -->`  
- Staging can show today’s publish while production stays on yesterday.

### P1 — Blank hero (historical)

Webflow IX starts nodes at `opacity:0` / `visibility:hidden`. Broken/truncated unhide (brace imbalance) left hero invisible even when HTML existed.

### P1 — Agent process gap

Disk gates green (`verify:source`, board honest, foot v150 on CDN) **≠** live custom code. CDP paste automation is flaky (CM6 virtualizes readback, puppeteer `Network.enable` timeouts, `keyboard.type` mangler). Prefer single verified paste + production curl.

### P2 — Design CSS side effects

`files.catbox.moe/m2f8rp.css` can hide `h1` until `.title-accent-gold` or a 2.5s fallback animation — brief “blank title.”

### P2 — Foot observers

`demigod-foot-core.js` uses childList MOs with a `busy` flag (acceptable). Do **not** reintroduce style-attribute observers in HEAD.

## Confirmation commands (always)

```bash
# Production bake time
curl -sL "https://www.trydemigod.com/?v=$(date +%s)" | grep -o 'Last Published: [^<]*'

# Must be ≥1 after v5 ship; MO must be 0 in <head>
H=$(curl -sL "https://www.trydemigod.com/?v=$(date +%s)")
echo "$H" | tr '\n' ' ' | sed 's/<\/head>.*/<\/head>/' | grep -c unhide-v5-safe
echo "$H" | tr '\n' ' ' | sed 's/<\/head>.*/<\/head>/' | grep -c MutationObserver   # expect 0

# Staging vs prod same Last Published
curl -sL "https://talentlink-sf.webflow.io/?v=$(date +%s)" | grep -o 'Last Published: [^<]*'
```

## Human publish checklist (2 minutes)

1. https://webflow.com/dashboard/sites/talentlink-sf/custom-code  
2. **HEAD:** clear → paste **once** full `demigod-head-minimal.html` (must contain `unhide-v5-safe`)  
3. **FOOTER:** clear → paste **once** `demigod-footer-lite.html` (must contain `xngres.js`)  
4. Save  
5. Publish → check **both** `talentlink-sf.webflow.io` **and** `www.trydemigod.com`  
6. “Publish to selected domains”  
7. Hard refresh https://www.trydemigod.com/?v=5 — page should paint in seconds, no endless spinner  

Paste mirrors: `/tmp/PASTE-HEAD-ONLY.txt`, `/tmp/PASTE-FOOTER-ONLY.txt`

## Session context dump for Fable

Full Grok dump: `/tmp/demigod-fable-full-context-20260709-0707.txt`  
Joint audit output: `/tmp/fable-joint-audit-*.txt`

## What is healthy (do not thrash)

| Asset | Status |
|--------|--------|
| `demigod-foot-core.js` v150 | Canonical; CDN `xngres.js` |
| Board honesty | 2 sample roles, realRoles 0 |
| Domain DNS/SSL | OK; not a parking/test host |
| Forms copy | hello@trydemigod.com follow-up |

## After load is green

Minimal GTM: warm SF founder DMs, one white-glove pilot, real board receipts only. No more head thrash unless load regresses.

## Confirmed fixed + UI follow-on (2026-07-09)

| Time (UTC) | Event |
|------------|--------|
| ~14:12–14:16 | unhide-v5-safe on www; MO gone; single early-unhide |
| ~14:18 | UI fix: `dg-base-tokens` + normal catbox CSS; stop hiding `.w-nav-menu` |

**Living master doc:** `DEMIGOD-COMPRESSED-STATE.md` (timeline, features, agent roles, GTM next).
