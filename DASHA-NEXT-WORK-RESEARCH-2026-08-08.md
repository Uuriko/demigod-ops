# What to work on next — online research brief (Dasha)

**Date:** 2026-08-08  
**Question:** Given audit + product state, what does *external* research say we should prioritize?  
**Prior internal:** Studio re-ship vs quiz quick-path vs full ship parity.

---

## 1. Memecoin / culture product reality (online)

| Finding | Implication for Dasha |
|---|---|
| Meme tokens run on **narrative + community + viral content**, not utility decks | Studio (make/pass memes) and quiz (identity + share) are the growth engines; desk is trust plumbing |
| Survivors emphasize **community engagement that holds through drawdowns**, not only pumps | On-site Lobby + opt-in board + honest CA > FOMO chrome |
| Marketing guides push **meme template libraries** and community remix | Studio seeds + share intents align; thin Studio shell under-serves that job |
| Launchpads own creation/trading discovery | Do **not** rebuild pump/Jupiter; link rails and own culture |

Sources: meme marketing guides (e.g. template/community ambassador patterns), Schwab-style risk framing (social-driven volatility), launchpad landscape (Pump as discovery casino).

---

## 2. Viral quizzes (online)

| Finding | Implication |
|---|---|
| Working envelope: **~8–12 Q**, under ~2 minutes, mobile-first | Live **20Q** is “loyal deep cut,” not invite default |
| Completion is the **gate to sharing** — abandoners never share | Invite traffic should hit a **short** path first |
| Share fuel: flattering/funny **result title + image + one-tap share** | Invest in result hero more than more questions |
| Pre-quiz identity gates **halve** completion | Keep Connect X optional (already correct) |
| Longer quizzes → more loyal players, fewer casual sharers | Dual mode: Quick (viral) + Deep (board) |

Sources: Woobox viral quiz mechanics; Fyrebox/Jotform/Qzzr-style length guidance; BuzzFeed-pattern result design.

---

## 3. Studio / Webflow technical (online)

| Finding | Implication |
|---|---|
| Webflow **Code Embed ~50k character cap** | Heavy Studio must stay external (`studio.js` on lobby host) — correct architecture |
| Page-level / external scripts > stuffing everything site-wide | Keep Studio load on `/studio` only |
| Custom code can kill performance if global | Intent-load Jupiter (done on home); Studio should stay deferred/on-page |

Sources: Webflow Help (embed limits), Broworks/Webflow perf guidance.

**Audit fact:** Live `/studio` is ~7.7KB HTML, mint not in shell, UI almost entirely in JS → crawlers/share previews/first paint look empty. Research + audit agree: **Studio content/ship health is a real gap**, even if architecture (external JS) is right.

---

## 4. Priority matrix (research × Dasha state)

| Candidate | Growth (research) | Trust/audit | Effort | Score |
|---|---|---|---|---|
| **Quiz quick path (8–10Q) + result hero** | Very high | Medium | Medium | **A** |
| **Studio re-ship: mint + readable shell + full ship** | High (culture production) | High (audit P1) | Medium | **A** |
| Full desk/studio/home ship only (no product change) | Low | High parity | Low–med | **B** |
| More quiz questions | Negative for virality | Low | Low | **D** |
| Lobby Discord HQ / post-to-earn | Policy/product no | Bad | — | **F** |

---

## 5. Recommended order (research-backed)

### First: **Quiz quick path for invite traffic** (growth)
Online evidence is strongest here: length + result share drive spread. We already have invite URL and Connect-X soft ask; defaulting `?quiz=1` to **short** path multiplies that investment.

Ship shape:
- `mode=quick|deep` (or `quiz=1` → quick, board CTA → deep)
- Same share/invite UX
- Result screen stays hero

### Second (parallel if capacity): **Studio shell + full ship**
Research says culture needs **templates + easy remix**; audit says Studio is under-presented. Fix mint in chrome, richer first paint, re-ship studio→desk→home.

### Not first
Adding more deep questions, FOMO, or Telegram.

---

## 6. Sources (selected)

- [Woobox — Viral quiz mechanics](https://woobox.com/articles/viral-quiz-mechanics) (8–12 Q, &lt;2 min, pre-quiz gate hurts)  
- [Fyrebox — shareable personality quizzes](https://www.fyrebox.com/blog/how-to-build-personality-quiz) (6–8 sweet spot, completion → share)  
- [Jotform — personality quiz best practices](https://www.jotform.com/blog/how-to-make-a-personality-quiz/) (≤10 Q, memorable results, share buttons)  
- [Webflow — Code Embed limits](https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed) (~50k, external script pattern)  
- [Broworks — custom code without killing performance](https://www.broworks.net/blog/how-to-use-custom-code-in-webflow-without-killing-performance)  
- Meme marketing: community remix templates / narrative over utility (sector guides 2025–26)  
- Internal: [`DASHA-BUGTEST-AUDIT-2026-08-08.md`](DASHA-BUGTEST-AUDIT-2026-08-08.md), [`DASHA-QUIZ-IMPROVE-RESEARCH-2026-08-08.md`](DASHA-QUIZ-IMPROVE-RESEARCH-2026-08-08.md)

---

## 7. Bottom line

**Online research upgrades the prior recommendation slightly:**

1. **Lead with quiz quick path** for `?quiz=1` (virality evidence is clearer and cheaper to ship).  
2. **Then Studio re-ship + full multi-surface ship** (culture production + audit trust).  

Both beat “more features on Desk” or “longer quiz.”
