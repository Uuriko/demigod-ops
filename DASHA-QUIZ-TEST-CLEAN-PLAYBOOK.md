# Dasha quiz — test, bugtest, optimize, clean

**Updated:** 2026-08-09  
**Scope:** Simp quiz only (score engine + Worker API + board client + live).  
**Live API:** `https://lobby.getdasha.com/simp/quiz`  
**Live client:** `https://lobby.getdasha.com/client/simp-board.js`  
**Entry:** Home `#simp` · invite `https://www.getdasha.com/?quiz=1#simp`  
**Version (disk/live):** `dasha-simp-quiz/v7` · deep **20Q** · quick **10Q**

---

## 0. Architecture (what you are testing)

```text
dasha-simp-score.mjs     pure path / scoring / titles / vibe / public sanitize
        ↑
dasha-lobby-worker.mjs   /simp/quiz start|answer|finalize + metrics + results
        ↑
dasha-simp-board-client.js   UI, modes, share, invite, sticky, X optional
        ↑
landing embed            loads client from lobby (Webflow size cap)
```

| Mode | Length | Who uses it |
|------|--------|-------------|
| **quick** | 10 (route + 4 lane + 5 shared) | `?quiz=1`, invite gate, “Quick 10Q” |
| **deep** | 20 (route + 9 lane + 10 shared) | Board Take / Retake |

Lane jump: quick forces `shared-0` after `cinema|podcast|lore-3`; deep after `*-8`.

---

## 1. Automated test pyramid (run these)

### Always (seconds)

```bash
cd /home/potter/.grok/worktrees/potter/dasha

# Full Simp/Quiz unit + static board contract
npm run dasha:test:simp
# = score.test + actions.test + board-embed --check + board.test
```

| File | What it proves |
|------|----------------|
| `dasha-simp-score.test.mjs` | Full deep run, retakes, vibe bounds, **quick path 10Q all lanes**, no answer leak in `quizPublic`, prompt uniqueness, sources https, title buckets |
| `dasha-simp-board.test.mjs` | Client strings: invite, dual mode, share, retake, no bare `startQuiz()`, finalize OAuth-at-reveal, metrics not keyed by X id |
| `dasha-simp-actions.test.mjs` | Claims/seasons/holder (board adjacency, not path engine) |
| `dasha-simp-board-embed-build.mjs --check` | Landing loads permanent `lobby…/simp-board.js` |

### API smoke (no browser)

```bash
node dasha-quiz-smoke.mjs              # disk pure + live HTTP
node dasha-quiz-smoke.mjs --disk-only  # offline CI
node dasha-quiz-smoke.mjs --live-only  # prod Worker only
```

Smoke covers: public GET, start quick/deep progress totals, walk perfect quick path via answer API if exposed (else disk-only path integrity), honesty (no answers in public JSON).

### Live gates (site + client presence)

```bash
npm run dasha:meta
npm run dasha:audit:live:fast
# Expect home-simp-mount, home-simp-client, client-simp, simp-board among site checks
```

### After any client change

```bash
node dasha-lobby-assets-build.mjs --write
node dasha-simp-board-embed-build.mjs --check
npx wrangler deploy -c dasha-lobby-wrangler.jsonc
# Confirm live strings:
curl -sS 'https://lobby.getdasha.com/client/simp-board.js' | grep -o "startQuiz('quick')" | wc -l
curl -sS -X POST 'https://lobby.getdasha.com/simp/quiz' \
  -H 'Content-Type: application/json' -H 'Origin: https://www.getdasha.com' \
  -d '{"action":"start","mode":"quick"}'   # progress.total must be 10
```

### Full product suite (slower)

```bash
npm run dasha:test:all
```

---

## 2. Manual / browser bugtest matrix

Use phone (390) + desktop. Prefer real device for Web Share.

### 2.1 Entry paths

| # | Steps | Expect |
|---|--------|--------|
| E1 | Open `/#simp` | Board mounts; Take quiz + Copy invite + Share invite |
| E2 | Open `/?quiz=1#simp` | Scroll to quiz; status quick path; if unlinked, soft gate + connect bar; Start = **quick** |
| E3 | Linked user + invite | Auto-start or one tap → progress **1 OF 10** |
| E4 | Board “Take quiz” / deep CTA | Progress **1 OF 20** |
| E5 | Board “Quick 10Q” if present | Progress **1 OF 10** |

### 2.2 In-quiz UX

| # | Steps | Expect |
|---|--------|--------|
| Q1 | Answer 3 Q | Progress bar advances; feedback note + optional Source ↗ |
| Q2 | Tap source link | Opens external; does not skip feedback wrongly |
| Q3 | Keys 1–4 | Select choice (focus on question) |
| Q4 | Escape | Closes focused quiz; focus restored to start CTA |
| Q5 | Wrong answer | Deadpan fail copy; not school shame; can continue |
| Q6 | Streak / surprise cards | Appear sometimes; don’t block forever (~850–1400ms advance) |
| Q7 | Quick finish | Ends at 10; result title + share |
| Q8 | Deep finish | Ends at 20 |

### 2.3 Share / identity

| # | Steps | Expect |
|---|--------|--------|
| S1 | Finish without X | Can play; save score needs link at reveal/finalize |
| S2 | Connect X at gate (optional) | Never required to answer |
| S3 | Share result | Native share with PNG when `canShare({files})`; else X intent + card |
| S4 | Copy invite | Clipboard has `?quiz=1#simp` |
| S5 | Retake after deep | Updates score; mode deep unless last was quick |
| S6 | Result sticky (mobile) | Share + Make one; buy-sticky not covering |

### 2.4 Honesty / anti-bugs

| # | Check | Fail if |
|---|--------|---------|
| H1 | Public GET `/simp/quiz` | Body contains `"answer"` or correct indices |
| H2 | Question prompts | `$dasha` mint spam, FOMO, TG HQ, “safe mint” |
| H3 | Board public rows | X numeric ids, tokens, wallets |
| H4 | Metrics | Per-user identity keys in aggregate metrics |

---

## 3. Optimize checklist (product, not premature micro)

Order by research + current code:

| Priority | Optimization | How to verify |
|----------|--------------|---------------|
| **A** | Invite always quick; board deep | E2/E4 + score tests |
| **B** | Result = hero (card + one-tap share) | S3; no auto X that steals activation |
| **C** | Fast feedback (no long pause) | Q6 timing |
| **D** | Progress honesty (10 vs 20) | progress.total matches mode |
| **E** | Copy length match | No “16 questions” if bank is 20 |
| **F** | Image questions load | `/simp/photo/*` 200, CORS for canvas cards |
| **G** | Metrics integrity | Completions from server transitions, not client spam |
| **H** | Don’t lengthen deep path for virality | Quick absorbs growth; deep stays prestige |

**Do not “optimize” by:** more questions, forced OAuth, FOMO, post-to-earn.

---

## 4. Clean-up targets (code hygiene)

When cleaning, prefer these files only:

1. **`dasha-simp-score.mjs`** — path lengths, jumps, titles, bank quality  
2. **`dasha-lobby-worker.mjs`** — `/simp/quiz` actions, finalize, metrics  
3. **`dasha-simp-board-client.js`** — modes, share, invite, stickies  
4. **Tests** — score + board contracts  
5. Rebuild: `dasha-lobby-assets-build.mjs --write` → wrangler deploy  

### Cleanup smells to delete or fix

- Bare `startQuiz()` without `'quick'|'deep'`  
- Client-trusted completion counts  
- Duplicate length copy (16 vs 20, etc.)  
- Auto-open X compose on every result if it breaks mobile share  
- Dead helpers (`sendQuizCard` unused)  
- Practice mode in product UI (keep for tests only if unused live)  
- Questions without `https` sources  
- Prompts that mention mint/coin product (score tests ban)  

### Bank quality pass

```bash
# Unique prompts, choice counts, source URLs — already in score.test
node dasha-simp-score.test.mjs
```

Manually flag: outdated lore, ambiguous answers, too many “gotcha” items in first 3 of quick path (hurts completion).

---

## 5. Bug-test day protocol (90 minutes)

```text
0:00  npm run dasha:test:simp && node dasha-quiz-smoke.mjs
0:10  npm run dasha:audit:live:fast  (note hard fails — may be home ship, not quiz)
0:15  Curl start quick + deep (totals 10 / 20)
0:20  Phone: ?quiz=1 full quick + share
0:40  Phone: deep retake + invite copy
0:55  Desktop: keyboard + escape + share fallback
1:10  Log bugs with severity:
      P0 path wrong / answers leaked / score stuck
      P1 share broken / mode wrong / progress lie
      P2 copy / sticky / polish
1:25  Fix P0/P1 only; re-run dasha:test:simp + smoke; deploy lobby
```

Use [`DASHA-FULL-BUGTEST-PROMPT-2026-08-08.md`](DASHA-FULL-BUGTEST-PROMPT-2026-08-08.md) Phase C quiz section for expanded browser checklist.

---

## 6. Live curl cheat sheet

```bash
# Public quiz meta
curl -sS 'https://lobby.getdasha.com/simp/quiz' \
  -H 'Origin: https://www.getdasha.com'

# Start quick (anon)
curl -sS -X POST 'https://lobby.getdasha.com/simp/quiz' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://www.getdasha.com' \
  -d '{"action":"start","mode":"quick"}'

# Start deep
curl -sS -X POST 'https://lobby.getdasha.com/simp/quiz' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://www.getdasha.com' \
  -d '{"action":"start","mode":"deep"}'

# Board (public)
curl -sS 'https://lobby.getdasha.com/simp/board' | head -c 400

# Client present
curl -sSI 'https://lobby.getdasha.com/client/simp-board.js' | head -15
```

Healthy start quick snippet: `"mode":"quick"` and `"progress":{"current":1,"total":10}`.

---

## 7. Metrics (optimize with data, not vibes)

```bash
# If authenticated review CLI available:
npm run dasha:studio:metrics   # or dasha-simp-review metrics — see package.json
```

Care about: starts, reaches, answers, completions, lanes, tiers, elapsed, share-intent.  
Quiz completions should be **server-validated** (LIVE-CONTEXT: client event endpoint share-intent-only).

After a cleanup ship: reset baseline only when intentional (don’t mix pre-release noise).

---

## 8. Definition of “quiz clean”

- [ ] `npm run dasha:test:simp` PASS  
- [ ] `node dasha-quiz-smoke.mjs` PASS  
- [ ] Live start quick total=10, deep total=20, version v7+  
- [ ] No answers in public quiz JSON  
- [ ] Invite → quick, board Take → deep  
- [ ] Share path works on one real mobile browser  
- [ ] Retake updates score; optional X never blocks play  
- [ ] Client deployed; landing still points at `lobby…/simp-board.js`  
- [ ] No FOMO/TG/safe-mint copy in quiz UI  

---

## 9. Related docs

| Doc | Role |
|-----|------|
| `DASHA-QUIZ-IMPROVE-RESEARCH-2026-08-08.md` | Product research (length, share) |
| `DASHA-FULL-BUGTEST-PROMPT-2026-08-08.md` | Whole-site bugtest incl. quiz |
| `DASHA-PRODUCT-BRIEF.md` | Loop + honesty |
| `DASHA-TASKS-FULL-2026-08-09.md` | T-020–T-025 quiz tasks |

---

*Playbook only. Implementation = fix P0/P1 from bug day, then re-run §8.*
