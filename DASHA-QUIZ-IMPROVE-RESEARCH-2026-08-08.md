# How to make the Dasha simp quiz better — research

**Compiled:** 2026-08-08  
**Status:** Research for product (not a ship plan)  
**Companion:** X identity [`DASHA-X-IDENTITY-RESEARCH-2026-08-08.md`](DASHA-X-IDENTITY-RESEARCH-2026-08-08.md) · culture stack [`DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md`](DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md)

---

## 0. What we have today (disk snapshot)

| Dimension | Current (approx.) |
|---|---|
| Version | `dasha-simp-quiz/v5` |
| Scored length | **20** questions |
| Max points | 60 from accuracy; soft **vibe ±8** is cosmetic |
| Structure | Lane pick → deep lane → shared finale |
| Results | 5 titles (Scholar → Curious) + lane flavor + result card + X intent |
| Media | ~11 image-backed questions; worker-hosted `/simp/photo/*` |
| Share | Post result on X, copy invite `?quiz=1#simp`, retakes scored |
| X | Optional link to save score / join board; finalize after anon play |

Honesty constraints still apply: association ≠ endorsement, no FOMO, no post-to-earn farming.

---

## 1. What the research says works

### 1.1 Length & completion

Industry consensus (quiz marketing / Outgrow / Qzzr / ProProfs-style guides, 2025–2026):

- **Highest completion:** roughly **3–7** questions (often 65–85% cited).
- **Practical sweet spot for “meaningful” personality:** **6–10**.
- **Drop-off rises hard after ~12** in many reports.

**Implication for Dasha:** At **20** scored questions we are in “deep lore exam” territory, not viral snack. That can be a feature for superfans, but it fights share-rate. Research says split the product:

| Mode | Length | Job |
|---|---|---|
| **Viral core** | 7–10 | Share result + invite |
| **Deep cut** | 16–20 | Board points + retake prestige |

Do not only keep one long path.

### 1.2 Result is the product

BuzzFeed-pattern research is consistent:

- People share **the result identity**, not the questions.
- Best results are: **short title, flattering-or-funny, image, one-tap share**.
- Result names should be **memorable and quotable** (“I got Confirmed simp”).
- 3–5 outcome buckets is enough for personality; more only if differentiated.

**Dasha already has:** titles + card + X intent + invite link.  
**Gaps vs research:** result page is easy to leave; vibe note is internal; challenge “you vs me” is weak if card fails; no explicit “tag a friend” or dual outcome (score + personality).

### 1.3 Personality vs trivia (hybrid is rare and powerful)

| Type | Strength | Risk |
|---|---|---|
| Personality | Shareability, identity | Feels fake if no flavor |
| Trivia | Skill / status / “I was online” | Shame on wrong answers → drop |
| Hybrid | CT loves “prove it” + “who are you” | Long if both full |

**Dasha is hybrid** (lane personality + scored lore). Research suggests:

- Make **first third** feel personality (vibe, images, no punishment).
- Make **middle** trivia with fun feedback (already partly there).
- Make **last third** identity lock-in (result reveal, share, challenge).

Wrong answers should **never feel like school**; deadpan roast is brand-correct if short.

### 1.4 Visual & mobile UX

- Image answers and mid-quiz media raise engagement; mobile-first large taps.
- Progress bar + step count reduce abandonment.
- Feedback dwell time: too long kills flow; too short kills delight.
- **Streaks / variable rewards** work when they mean something (Duolingo-style), not fake daily login for a one-shot culture quiz.

**Dasha:** progress bar + surprises + photos good. Gaps: image-as-choice (tap a still), mid-quiz “boss” moments, mobile sticky CTAs during result, reduced-motion already partially handled.

### 1.5 Social / CT distribution

CT viral quizzes / trivia posts (observed pattern):

- Short, commentable, **one clear ask** (answer / link).
- Result must fit a **screenshot or single image**.
- “Beat this” needs a **stable URL** that restarts the experience (we have invite + `/simp/r/`).
- Crypto giveaway trivia is common but **off-brand** for Dasha (money bait). Skip prize farming.

Post-Yaps policy: **no points for posting on X**. Share intents only (already correct).

### 1.6 Trust & conversion

- Optional identity > hard wall mid-quiz.
- Reveal result before heavy asks; link X to **save / board**, not to **see**.
- We already allow play then link; keep that.
- Research on lead-gen quizzes: ask after result. Same pattern for Connect X.

---

## 2. Gap analysis: research vs Dasha

| Research best practice | Dasha now | Gap |
|---|---|---|
| 6–10 Q for viral completion | 20 scored | High drop-off risk |
| Result-first share identity | Good titles + card | Card reliability / always-on hero result screen |
| Flattering/funny outcomes | Mostly good | More lanes × score matrix flavor |
| One-tap share everywhere | X + copy invite | Native share sheet for invite; Stories size |
| Visual every few Q | ~11/63 bank images | More image choices, not only illustration |
| Challenge graph | resultUrl + invite | Explicit “challenge @friend” composer |
| Short path + deep path | One path | Missing “Quick vibe (8Q)” mode |
| Feedback as entertainment | Roasts + surprises | Variable timing, rare jackpot moments |
| Metrics: complete / share / invite | Partial funnel events | Instrument drop-off by question id more clearly |
| Honesty / no FOMO | Strong | Keep |

---

## 3. Ranked improvements (what to build)

### P0 — Highest ROI (completion + share)

1. **Dual-length modes**  
   - **Quick:** 8–10 Q, lighter points (or same max scaled).  
   - **Deep:** current 20 Q for board max.  
   Default deep-link `?quiz=1` → Quick for virality; board CTA → Deep.

2. **Harder result screen (the product)**  
   Full-bleed result: big score, title, lane, vibe one-liner, image, primary **Post on X**, secondary **Copy invite**, tertiary **Challenge friend**.  
   Don’t auto-dismiss or bury under board refresh.

3. **Shorter default feedback hold**  
   700–900ms default; 1.4s only on surprise. Respect reduced motion (skip hold).

4. **Question drop-off instrumentation**  
   Already have reach/answer metrics — dashboard which of 20 kills people; cut or move those.

### P1 — Delight & CT native

5. **Image-choice questions**  
   Tap photo A/B/C for a few beats (stills we already host).

6. **Boss / intermission beats**  
   At Q7 and Q14: full-bleed still + one line (“Timeline check”) then continue — not more scoring load.

7. **Richer outcome matrix**  
   Title × lane blurb unique (20 combos max copy, ship 8–12). Share text uses the blurb.

8. **Challenge friend**  
   Prefill intent: “I got X/Y · Beat me” + invite URL + optional their resultUrl.

9. **Seasonal question packs**  
   Rotate 3–5 questions monthly (same length) so retakes feel fresh without rewriting bank.

### P2 — Nice / later

10. **Daily micro-quiz (1–3 Q)** for lobby chip only — careful of streak toxicity; optional.  
11. **Audio / clip** for one podcast lane question (optional, weighty).  
12. **Leaderboard of titles** (“most Scholars this week”) not raw scores only.  
13. **GIF result** for Stories (9:16) in addition to 1200×675.

### Explicit no

- Pay-to-win quiz boosts  
- Points for tweeting  
- 40-question marathon  
- Shame screens (“you’re broke lore”) that insult without brand voice  
- Requiring X before question 1  

---

## 4. Content quality checklist (writing)

For every new question:

- [ ] Prompt ≤ ~80 chars, spoken CT voice  
- [ ] 3–4 choices, one clearly right *or* clearly funny wrong  
- [ ] Source URL real (letterboxd / interview / X / site)  
- [ ] Correct answer position not always A  
- [ ] Note on feedback is one deadpan sentence  
- [ ] Image if visual beat  
- [ ] No “official / endorsed / safe mint”  

Result titles should stay **share-first**: short, uppercase-friendly, slightly mean-affectionate.

---

## 5. Metrics to watch (prove better)

| Metric | Why |
|---|---|
| Start → complete % | Length experiment |
| Complete by mode (quick/deep) | Validate dual path |
| Complete → share intent open | Result screen quality |
| Share → invite copy | Secondary distribution |
| Drop-off by question id | Kill bad items |
| Linked % among completers | Connect ask timing |
| Retake rate | Freshness / vibe |

---

## 6. Suggested experiment order

1. **A/B length:** randomize invite traffic to 10Q vs 20Q for 1 week; measure complete + share.  
2. **Result screen v2** for everyone (no A/B needed if clear win).  
3. **Challenge friend** button.  
4. **Image-choice** 2–3 questions.  
5. **Seasonal pack** once metrics stabilize.

---

## 7. Source index

| Topic | Sources |
|---|---|
| Completion vs length | [Qzzr / Riddle-style 2026 guides](https://qzzr.com/blog/product-comparision/best-free-personality-quiz-maker-platforms-honest-comparison/) · [Jotform personality best practices](https://www.jotform.com/blog/how-to-make-a-personality-quiz/) · [Outgrow engagement benchmarks](https://outgrow.co/blog/quiz-engagement-benchmarks-completion-rates) |
| BuzzFeed result/share | [Opinion Stage BF-style](https://www.opinionstage.com/quiz/buzzfeed-quiz-maker/) · [ProProfs BF guide](https://www.proprofs.com/quiz-school/blog/make-buzzfeed-style-quiz/) · [involve.me BF guide](https://www.involve.me/blog/how-to-make-a-buzzfeed-style-personality-quiz) |
| Gamification / streaks | [Digia gamification](https://www.digia.tech/post/gamification-mobile-apps-streaks-rewards-retention) · Duolingo streak literature (via secondary) |
| CT trivia pattern | Observed X threads (short Q, comment answers, optional prize — prize off-brand for us) |
| Dasha identity/share policy | [`DASHA-X-IDENTITY-RESEARCH-2026-08-08.md`](DASHA-X-IDENTITY-RESEARCH-2026-08-08.md) |

---

## 8. Bottom line

The quiz is already strong on **brand voice, hybrid lore, share intents, invite link, retakes, and cosmetic vibe**. Vibe no longer affects Board points because unlimited retakes made fresh random deltas rerollable. Research says the main upgrade is not “more questions” — it is:

1. **Shorter default path for virality**,  
2. **Result screen as the hero product**,  
3. **Challenge / invite as first-class CT loops**,  
4. **Visual choices + tighter feedback pacing**.

Depth (20Q + board points) should stay available; it should not be the only door.

*Research only — implement when product prioritizes P0.*
