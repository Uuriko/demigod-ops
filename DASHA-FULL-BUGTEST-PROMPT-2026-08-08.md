# Dasha complete audit + bug-test run — agent prompt

**Date:** 2026-08-08  
**Scope:** getdasha only (Home, Studio, Desk, Lobby, Simp/Quiz). Demigod out of scope.  
**Goal:** Find real bugs, honesty/copy breaks, live lag, and test gaps. Fix only if trivial and in-scope; otherwise report with severity.

## Surfaces under test

| Surface | Live URL | Canonical source |
|---|---|---|
| Home | https://www.getdasha.com/ | `dasha-landing.html` |
| Studio | https://www.getdasha.com/studio | `dasha-studio-embed.html` / meme studio |
| Desk | https://www.getdasha.com/dasha | `dasha-desk` |
| Lobby | https://www.getdasha.com/lobby · worker https://lobby.getdasha.com | `dasha-lobby-*` |
| Simp/Quiz | Home `#simp` · API `/simp/*` · client `simp-board.js` | `dasha-simp-*` |
| Invite | `/?quiz=1#simp` | client deep link |

## Honesty / product rules (fail if violated)

- Coin claims stay bound to their public source  
- No `t.me/dashacommunity` as HQ  
- No negative coin jokes, warnings, or disclaimers  
- Mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump` exact match on buy/CA surfaces  
- X = identity + share intents; no post-to-earn  

## Phase A — Static / unit gates

Run and record pass/fail for each:

1. `npm run dasha:gate:fast` (or equivalent ship fast gate)  
2. `node dasha-simp-score.test.mjs`  
3. `node dasha-simp-board.test.mjs`  
4. `node dasha-landing.test.mjs` (needs CDP if browser suite)  
5. `node dasha-lobby.test.mjs` + assets check  
6. `node dasha-desk.test.mjs` / desk share if present  
7. `node dasha-growth.test.mjs`  
8. `node dasha-how-to-buy.test.mjs`  
9. `node dasha-culture-seeds.test.mjs`  
10. `node dasha-lobby-assets-build.mjs --check`  
11. `node dasha-crypto-research-docs.test.mjs` if present  
12. `npm run dasha:test:simp` / `dasha:test:lobby` as available  

Capture: command, exit code, first failure line.

## Phase B — Live HTTP / worker

1. `npm run dasha:audit:live:fast` or `node dasha-audit-live.mjs --fast`  
2. `node dasha-lobby-live.test.mjs` if network OK  
3. Curl matrix:

| Check | Expect |
|---|---|
| GET home | 200, mint present, simp mount + client |
| GET studio | 200, mint or studio shell |
| GET desk `/dasha` | 200, mint, buy rails |
| GET lobby health/stats | 200 |
| GET `/client/simp-board.js` | 200, invite + retake strings |
| GET `/client/lobby.js` | 200 |
| GET `/simp/board` | 200, editorial Perry |
| GET `/simp/quiz` | 200, version + total |
| GET `/?quiz=1` home | invite path loadable |
| robots/sitemap lobby | 200 |

## Phase C — Browser functional (Playwright or CDP)

For each surface (mobile 390 + desktop 1280 where useful):

### Home
- [ ] No horizontal overflow  
- [ ] Hero, mint CA exact, Buy opens or falls back to jup.ag  
- [ ] `#simp` mounts board; Take quiz / Copy invite / Share invite visible  
- [ ] `?quiz=1#simp` shows connect invite and can start quiz  
- [ ] No potterlab / personal brand leakage in visible chrome  
- [ ] Skip links work  

### Quiz / Simp
- [ ] Start quiz, answer 2–3 Q, Escape closes focused mode  
- [ ] Progress bar updates  
- [ ] Surprise/feedback does not hang forever  
- [ ] If linked path available: finish → share UI / Post on X path  
- [ ] Retake present after score  
- [ ] Copy invite puts `?quiz=1#simp`  

### Lobby
- [ ] Page loads; client connects or shows offline honestly  
- [ ] No Discord HQ as required  
- [ ] Capacity/status not crash  

### Studio
- [ ] Loads embed; can type line or open seed  
- [ ] Share/X optional not required to edit  

### Desk
- [ ] Mint full string, multi-rail buy links present  

## Phase D — Consistency / drift

- [ ] Quiz length copy: client note matches `QUIZ_PATH_LENGTH`  
- [ ] Landing soft/hard byte budget  
- [ ] Live client hash vs disk static-gen (strings present)  
- [ ] Assets-build `--check`  
- [ ] Scrapped surfaces not re-linked (thesis, telegram community)  

## Phase E — Report format

Write `DASHA-BUGTEST-AUDIT-2026-08-08.md` with:

1. Executive summary (ship-ready / not)  
2. Environment (date, URLs, commit-ish)  
3. Gate results table  
4. Live checks table  
5. Findings list: **P0 / P1 / P2** — repro, evidence, suggested fix  
6. Honesty scan results  
7. What was not tested  

## Constraints

- Do not publish unless audit finds a critical fix and user already authorized ship this session — this prompt is **test/report first**.  
- Prefer fixing only trivial one-line bugs discovered mid-run if tests prove them.  
- No Demigod. No money movement. No outbound X posts.
