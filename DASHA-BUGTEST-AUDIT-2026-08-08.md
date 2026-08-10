# Dasha complete bug-test audit — 2026-08-08

**Prompt used:** [`DASHA-FULL-BUGTEST-PROMPT-2026-08-08.md`](DASHA-FULL-BUGTEST-PROMPT-2026-08-08.md)  
**Ran:** static unit suite + live HTTP matrix + Playwright functional pass + `dasha:audit:live:fast`  
**Verdict:** **Ship-usable for Home / Desk / Lobby / Simp.** Studio shell is thin (JS-driven). A few **P1 copy/product** issues remain; no honesty P0s found.

---

## 1. Executive summary

| Area | Result |
|---|---|
| Unit / static gates | **17/17 PASS** |
| Live audit fast | **announce-ready** (`hard: []`) |
| Home / Desk / Lobby / Quiz API | Healthy |
| Simp client (invite, retake, share) | Live markers present |
| Studio | Loads via `lobby…/client/studio.js`; little HTML text; **mint not in shell HTML** |
| Honesty scan (public) | No TG HQ, no “safe mint”, NFA present on home |

**Fixed mid-audit:** unlinked quiz note said “16 questions” while path length is **20** → corrected on disk; lobby redeployed with assets.

---

## 2. Environment

- Date: 2026-08-08  
- Live: `https://www.getdasha.com/` · `/studio` · `/dasha` · `/lobby` · `https://lobby.getdasha.com`  
- Mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`  
- Quiz live: `dasha-simp-quiz/v5`, **total 20**, maxPoints 60  
- Logs: `/tmp/grok-goal-c3905fae82ef/implementer/dasha-audit/` (phase-a/b/c)

---

## 3. Phase A — static / unit

| Gate | Result |
|---|---|
| `dasha-lobby-assets-build --check` | PASS |
| `dasha-simp-score.test.mjs` | PASS |
| `dasha-simp-board.test.mjs` | PASS |
| `dasha-simp-actions.test.mjs` | PASS |
| `dasha-lobby.test.mjs` | PASS |
| `dasha-lobby-mod.test.mjs` | PASS |
| `dasha-lobby-x.test.mjs` | PASS |
| `dasha-desk.test.mjs` | PASS |
| `dasha-growth.test.mjs` | PASS |
| `dasha-how-to-buy.test.mjs` | PASS |
| `dasha-culture-seeds.test.mjs` | PASS |
| `dasha-ship-readback.test.mjs` | PASS |
| `dasha-audit-tools.test.mjs` | PASS |
| `dasha-crypto-research-docs.test.mjs` | PASS |
| `dasha-landing-mint-check.test.mjs` | PASS |
| `dasha-studio-image.test.mjs` | PASS |
| `npm run dasha:gate:fast` | PASS |

**Not run in this pass:** full CDP `dasha-landing.test.mjs` browser suite (CDP-heavy; Playwright used instead).

---

## 4. Phase B — live HTTP

| Check | Result |
|---|---|
| Home 200 + mint + simp mount + client + invite | PASS |
| Home buy rails (jup/pump/phantom/raydium) | PASS |
| Home NFA / no TG HQ / no safe mint | PASS |
| Desk mint + multi-rail | PASS |
| Lobby page + worker clients | PASS |
| `/simp/board` editorial perryalpha | PASS |
| `/simp/quiz` v5 total 20 | PASS |
| `simp-board.js` invite/retake/share strings | PASS |
| Studio 200 | PASS (shell ~7.7KB) |
| Studio mint in raw HTML | **FAIL** (mint may live only in JS app) |
| Lobby robots/sitemap | PASS |
| `dasha:audit:live:fast` | **announce-ready** |

Note: bare Python `urllib` got **403** on some Webflow URLs; browser UA + curl succeeded.

---

## 5. Phase C — Playwright

| Check | Result |
|---|---|
| Home no H-overflow (desktop + mobile) | PASS |
| Home simp mount + invite buttons | PASS |
| Home mint element | PASS |
| Home no pageerror | PASS |
| `?quiz=1#simp` board + connect gate/bar | PASS |
| Desk mint + Jupiter text | PASS |
| Lobby text + no TG HQ | PASS |
| Studio body text length | **FAIL** (len≈21 — almost all UI in `studio.js`) |

---

## 6. Findings

### P1 — should fix soon

| ID | Finding | Evidence | Suggested fix |
|---|---|---|---|
| **Q-COPY** | Quiz length copy mixed **16 vs 20** | Disk had one string still “16 questions”; API/path = 20 | **Fixed** unlinked note → “20 questions”; redeploy lobby |
| **STUDIO-SHELL** | Studio shell has **no mint** in HTML; very little crawlable text | curl studio ~7.7KB, mint_hits=0; Playwright text len 21 | Ensure studio embed/client paints mint + shareable title; re-ship studio if embed stale |
| **SHIP-DESK-STUDIO** | Recent home-only ships report hard fails for desk-pump / studio-current | Ship logs | Full `dasha-ship.mjs --ship` (all surfaces) when ready to re-sync desk/studio live |

### P2 — polish / product

| ID | Finding | Notes |
|---|---|---|
| **QUIZ-LENGTH** | Research says 20Q hurts viral completion | See `DASHA-QUIZ-IMPROVE-RESEARCH-2026-08-08.md` — dual quick/deep path |
| **WEBFONT** | Exo webfont still loaded on Webflow pages | Perf cost; product uses Arial in embed CSS |
| **UA-403** | Bot-ish clients get Cloudflare 403 | Use browser UA for automation; not user-facing |
| **RESULT-UX** | Result share strong; still not a dedicated “hero result page” | Research P0 |

### P0 — honesty / break product

| ID | Finding |
|---|---|
| *(none found)* | No TG community HQ, no safe/official mint claims, mint correct on home/desk, NFA present |

---

## 7. Honesty scan (public HTML)

| Rule | Home | Desk | Lobby |
|---|---|---|---|
| No `t.me/dashacommunity` | PASS | PASS | PASS |
| No “safe mint” | PASS | — | — |
| Can go to zero / NFA | PASS | — | — |
| Association language | PASS (home) | — | — |
| Exact mint on buy surfaces | PASS | PASS | PASS (lobby chrome) |

---

## 8. What was not tested

- Full 20-question end-to-end finish with real X OAuth popup  
- Wallet holder proof (Phantom)  
- WS lobby chat under load  
- Studio canvas export / share on real mobile devices  
- How-to-buy Webflow route (still intentionally unlinked / 404 risk)  
- Full CDP axe suite via `dasha-landing.test.mjs`  

---

## 9. Recommended next actions

1. **Re-ship Studio** with mint + richer shell if SEO/share previews matter  
2. **Full ship** (studio+desk+home) to clear desk-pump / studio-current drift  
3. Quiz product: implement **quick 8–10Q path** per improve research  
4. Keep invite link `https://www.getdasha.com/?quiz=1#simp` as growth default  

---

## 10. Gate scorecard

| Phase | Pass | Fail |
|---|---:|---:|
| A unit/static | 17 | 0 |
| B live content (curl UA) | ~30 | 1 (studio mint HTML) |
| C browser | 17 | 1 (studio text thin) |
| Live-fast announce | yes | — |

**Overall:** Core culture loop (home mint + quiz + invite + desk rails + lobby worker) is **green**. Studio needs a focused content/ship pass; quiz length strategy is product, not a crash bug.
