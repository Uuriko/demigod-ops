# Demigod + website status — 2026-07-15

**Synthesized by:** Grok (execute) + Codex (session summary + code/design review) + Claude Sonnet (architecture/hard stops).  
**Fable (`bin/df`):** timed out empty this pass — re-run if plan authority needed.  
**Phase:** **Website + startup only.** No Twitter / no auto-DM outreach.

---

## Product (one sentence)

Demigod matches **SF startups ↔ talent** with a **human** in the loop: brief/profile → review → **mutual yes** → intro. Fee **10% on hire**. Candidates free. SMS/Stripe **pending** (honest copy only).

---

## Architecture (what agents edit)

| Layer | File(s) | Role |
|-------|---------|------|
| **Behavior SoR** | `demigod-foot-core.js` | Only site JS: COPY, WIZ, CTAs, pages, honesty, boot |
| **Head** | `demigod-head-minimal.html` + CDN CSS | Unhide, tokens, meta, favicon, FOUC |
| **Head design CSS** | `demigod-head-styles.css` → catbox `.css` | Brand/layout overrides |
| **Footer loader** | `demigod-footer-lite.html` / `demigod-footer-loader.html` | Path → `/?p=` redirects + foot CDN script |
| **Ship** | `demigod-foot-cdn-publish.mjs`, `demigod-cm6-paste-publish.mjs`, `bin/dg ship` | Catbox upload + Webflow CM6 paste |
| **Shell** | Webflow Designer (`talentlink-sf`) | DOM/shell; runtime **hides** legacy sections |
| **Gates** | `npm run demigod:verify:source`, foot-smoke, board honesty | Must pass after foot/head edits |

**Live stack (checked 2026-07-15):**

| Asset | URL / version |
|-------|----------------|
| Foot | **v207** · `https://files.catbox.moe/jrm4vt.js` |
| Head CSS | `https://files.catbox.moe/cycbs6.css` |
| Favicon | geometric D SVG · `bvp5uy.svg` (+ data-URI in head) |
| Loader | `demigod-foot-cdn-loader v27` + multi-path redirects |

---

## Chronological website ships (recent)

| Ver | Commit / note | What changed |
|-----|---------------|--------------|
| **v200** | `ebec75d` | Dual-path CTAs: **I'm hiring** / **Find a job**; honesty scrubs |
| **v201** | `8c1ffe6` | Safer FOUC unhide; WIZ keyboard; trust polish |
| **v202** | `b55e0a6` + CDN `40138ae` `leqhep.js` | One-question WIZ ownership; review step; 90-day outcome; live dual CTAs |
| **v203** | disk mid-ship | Unified 12px button system; path-pills removed |
| **v204** | transitional | Home-minimal CSS hide of process/pricing/roles essays |
| **v205** | `8f6f838` | Decision-screen home; restored `cta()` (labels + mobile bar); geometric favicon |
| **v206** | transitional CDN `9liv5o.js` | **Simple pages** `DG_PAGES` + `?p=` router; footer How/Pricing/FAQ/… |
| **v207** | **live** `jrm4vt.js` (disk uncommitted delta remains) | Route redirects in CDN publish template; page Escape/popstate; idle JSON-LD; hide bar when page open |

**Git tip still:** `8f6f838` (v205). **Working tree** has v206–v207 site changes not fully committed.

---

## What the website does now (user-facing)

### Home (decision screen)
- H1: *SF startup talent, human-matched.*
- One subline; **no** process/pricing/roles essay walls
- CTAs: **I'm hiring** → WIZ startup · **Find a job** → WIZ engineer  
- Mobile: sticky dual bar (hero CTAs hidden ≤767px)
- Footer: How · Pricing · FAQ · Compare · Legal · email  
- Body text ~**350** characters (was ~1900+)

### Secondary content (`/?p=` overlays — short, not blogs)
Implemented: `how` · `pricing` · `faq` · `hire` · `talent` · `contact` · `legal` · `partners` · `compare` · `pilot`  

Clean paths redirected by footer-lite: `/how`, `/pricing`, `/faq`, `/hire`, `/talent`, `/network`, `/contact`, `/legal`, `/partners`, `/compare`, `/pilot` → `/?p=…`  
`/events` → existing Catbox events page  

Live-tested CDP: home, `?p=how`, `?p=pricing`, `?p=faq`.

### WIZ (forms)
- Startup + engineer steppers; **one question** at a time  
- Startup: **90-day outcome** required; **review** before submit  
- Pending-honest success copy; no SLA clocks  

### Honesty policy (unchanged)
- No fake 48h/SLA · no founder names on live  
- SMS / payments **pending**  
- Sample board only when shown; real pilots/receipts only when real  

---

## Non-website work in same era (context)

| Area | Status |
|------|--------|
| **Tools OS / Control Plane** | `bin/dg orient|truth|ship|demand|next-canon|unify`; dash :9878 |
| **Demand / GTM** | Drafts + logging exist; **auto-DM STOPPED** (`DEMIGOD_ALLOW_AUTO_DM` opt-in only) |
| **User focus** | Explicit: **break from Twitter/DMs** — website + startup only |
| **Game** | Archived — do not touch |
| **Freeze** | Currently **OFF** (file); was ON after v205 green; re-freeze recommended when quiet |

---

## Known issues / residual (honest)

1. **Disk slightly ahead of CDN** on one polish: `__dgPagePrevTitle` restore in open/close page is on disk; **not** in live `jrm4vt.js` (minor). Re-CDN + paste when shipping next.  
2. **Foot lock** may show abandoned `grok-pages` claim — release `--force` or refresh with `DG_LOCK_TOKEN` before foot edits.  
3. **queue-publish API 412** — UI Save+Publish path still works; refresh Webflow session when API fails.  
4. **Foot ~138KB** monolithic; triple boot (0/400/1500ms) for Webflow late paint.  
5. **Designer DOM** still has hidden sections — delete later.  
6. **SEO**: mini-pages change `document.title` only; no per-route canonical/sitemap yet.  
7. **v206–v207 not fully committed** — commit when human wants provenance clean.  
8. **Internet outage mid-retry** interrupted one paste verify; live already on v207 after prior successful UI publish.

---

## Agent operating rules (current)

- **Plan:** Fable/Claude · **Execute:** Grok/Cursor · **Review:** Codex · **Authorize money/Publish/real DMs:** Human  
- Edit **one** foot writer at a time (`bin/dg lock claim` + `DG_LOCK_TOKEN`)  
- After foot/head: `npm run demigod:verify:source` + foot-smoke  
- Ship: freeze off → `foot-cdn-publish` → CM6 paste → confirm live CDN hash → freeze on  
- **Do not** auto-DM, invent pilots, or reopen the game  

---

## Doc map (start here)

| Doc | Purpose |
|-----|---------|
| `DEMIGOD-SIMPLE.md` | Session card |
| `DEMIGOD-COMPRESSED-STATE.md` | Living truth (this date prepended) |
| `docs/process/WEBSITE-BACKLOG-MEGA.md` | Long backlog, simple-first |
| `docs/process/WEBSITE-REVIEW-2026-07-15-V207.md` | Code/design review |
| **This file** | Full session + architecture snapshot |
| `docs/exchange/` | History archive — don’t re-read entire set every session |

---

## Next (when someone asks “what next”)

1. Commit uncommitted v206–v207 site files  
2. Optional micro-ship: closePage title restore → CDN  
3. Freeze ON while green  
4. Startup ops: pilot log / white-glove (not outreach spam)  
5. Later: Designer delete dead sections · WIZ shorter welcome · real PNG apple-touch  

*If this file disagrees with live curl of foot CDN version, trust live.*

## Update: v208 live (same day)

- CDN: `https://files.catbox.moe/ixb392.js`
- Shorter WIZ welcome/thanks copy
- Mini-pages: **About**, **Status** (+ footer links)
- Focus-visible gold rings; soft Tab trap on mini-pages
- Pilot log: website-first / no auto-DM phase note
- Commit: `9d12301` · freeze ON

## Update: cycle 324 implementation audit (2026-07-15)

- Canonical website source is foot v423; foot smoke and WIZ ownership selftest pass.
- Head/foot CM6 separation, unhide-v5, single-loader, release-identity, demand/inbound honesty, dashboard/control, canonical NEXT, and truth/lock contracts pass their relevant selftests.
- Auto-DM remains disabled; no pilot or send evidence was synthesized.
- Release is intentionally blocked before CM6: staged manifest v213 does not match core v423 (SHA and byte count also differ).
- Guarded CDN staging attempted all configured transports and preserved canonical artifacts after none were available (`release-transport-unavailable`; GitHub CLI unauthenticated, external DNS unavailable, CDP offline).
- Truth remains fail-closed until an attested CDN asset matches the canonical v423 source; no publish mutation was attempted from the stale manifest.
