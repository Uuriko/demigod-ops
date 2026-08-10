# Self-prompt: generate **all** getdasha.com tasks (with web search)

**Purpose:** A reusable, standalone prompt any agent can re-run to produce a full, honest task inventory for [getdasha.com](https://www.getdasha.com) — not a vague backlog dump, not a generic memecoin checklist.

**Date template:** 2026-08-09  
**Workspace:** `/home/potter/.grok/worktrees/potter/dasha`  
**Product brief (canonical):** [`DASHA-PRODUCT-BRIEF.md`](DASHA-PRODUCT-BRIEF.md)  
**Live spine:** [`DASHA-LIVE-CONTEXT.md`](DASHA-LIVE-CONTEXT.md)

---

## 0. Your job

1. **Web-search** (required) for current external patterns: memecoin culture products, viral quiz/share UX, mobile creative tools, Solana trust UX (CA / Jupiter / chart path), Web Share API, community-without-Telegram-HQ patterns.
2. **Inventory disk + live** getdasha surfaces honestly (meta + audit + key sources).
3. **Emit a complete task list** covering: ship lag, trust, Home, Studio, Desk, Lobby, Quiz/Simp, SEO/ops, OSS, research-gated “do not build yet,” and explicit **kill list**.
4. **Rank** every task: P0 / P1 / P2 / P3 / PARK / KILL with owner-type (agent-local / Webflow-token / human-culture / observe-first).
5. **Do not** invent FOMO, TG HQ, airdrop theater, roadmap utility, post-to-earn, or revive Thesis/receipts.

When this prompt is “done,” the deliverable is one markdown inventory file (or an update in place of `DASHA-TASKS-FULL-*.md`) plus a short status note in LIVE-CONTEXT if useful.

---

## 1. Product north star (hard constraints)

### What Dasha is

| Surface | Job |
|---------|-----|
| **Home** | Culture landing, mint/CA trust, entry to Studio / Desk / Lobby / Quiz |
| **Studio** | Make/remix posts, stories, banners → share outward |
| **Desk** | Bounded mint + Jupiter (and alternate rails) trust surface |
| **Lobby** | On-site public chat (not Discord HQ) |
| **Quiz / Simp Board** | Lore identity → shareable result → optional opt-in recognition |

**Loop:** Know the lore → make an artifact → receive recognition → share outward.

### What Dasha is not

Casino, signals room, safety oracle, P&L board, forecasting, conviction receipts/Thesis, Telegram-as-HQ, FOMO countdowns, “official/safe/verified mint” theater.

### Trust constants

- Mint: `53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump`
- Association ≠ endorsement / legal control / celebrity authorization
- No `t.me/dashacommunity` in product
- Simp points are opt-in / editorial; holder badge is zero-point, non-Sybil

### Agent rules

- Ponytail on code (lazy senior, smallest diff).
- Publish / outbound / money only with current-request authority.
- Webflow push needs valid token; if invalid, **list ship tasks as blocked**, still list local prep as ready.
- Prefer evidence (tests, live audit IDs, file paths) over vibes.

---

## 2. Required research (web_search)

Run **at least** these query themes (adapt wording; cite results in the task doc):

1. **Memecoin culture 2025–2026** — narrative + community + remix content vs utility decks; launchpad reality; survivor traits.
2. **Viral quizzes** — length 6–12, result-as-product, share image, no pre-identity gate.
3. **Web Share API / file share** — `canShare({files})`, user activation, AbortError, progressive enhancement.
4. **Solana buy UX** — CA verification, Jupiter lock-to-mint, chart/discovery path (Dexscreener etc. as outbound).
5. **Creative tool mobile UX** — sticky primary action, empty states, one-tap remix, draft recovery.
6. **What NOT to copy** — FOMO templates, TG-first community, airdrop farming, InfoFi pay-to-post (often hostile post-policy).

Synthesize into a short table: **External finding → Dasha implication → candidate tasks**.

Do **not** treat agency marketing blogs as product requirements. Extract patterns; filter through honesty constraints.

---

## 3. Required local inventory

### Commands (run, capture hard fails)

```bash
cd /home/potter/.grok/worktrees/potter/dasha
npm run dasha:meta
npm run dasha:audit:live:fast
# optional deeper:
# npm run dasha:audit:live
# npm run dasha:onchain:check   # if present
```

### Surfaces to curl/skim

| URL | Check |
|-----|--------|
| https://www.getdasha.com/ | mint, buy venue, negative-coin copy, studio/lobby CTAs |
| https://www.getdasha.com/studio | shell mint?, studio.js load |
| https://www.getdasha.com/dasha | desk rails, NFA |
| https://lobby.getdasha.com/ | health, pin NFA, clients hash |
| https://www.getdasha.com/?quiz=1#simp | quiz invite / quick path if live client |

### Disk sources (canonical)

| Area | Files |
|------|--------|
| Home | `dasha-landing.html` |
| Studio | `dasha-meme-studio.html` → embed build → lobby static |
| Desk | `dasha-desk/` |
| Lobby | `dasha-lobby-*.mjs`, `dasha-lobby-client.js` |
| Quiz/Simp | `dasha-simp-score.mjs`, `dasha-simp-board-client.js` |
| Ship | `dasha-ship.mjs` |
| How-to | `dasha-how-to-buy.html` (may 404 route if unpublished) |

### Already-shipped / in-flight (do not re-list as greenfield)

Read LIVE-CONTEXT “Just shipped.” Examples that may already exist: dual quiz modes, Studio PNG warm cache / new take / share-in-caption, quiz result sticky, lobby empty CTAs, metrics baseline, holder rate limits, creative evidence X-only, etc. **Mark those DONE or VERIFY-LIVE**, not “build from scratch.”

---

## 4. Output schema (every task)

For **each** task, use:

```markdown
### T-### · <short title>
- **Priority:** P0 | P1 | P2 | P3 | PARK | KILL
- **Surface:** Home | Studio | Desk | Lobby | Quiz | Ops | Trust | OSS | Cross
- **Owner:** agent-local | webflow-token | human-culture | observe-first
- **Why (research or audit):** …
- **Done when:** …
- **Depends on:** …
- **Do not:** …
```

### Priority definitions

| Pri | Meaning |
|-----|---------|
| **P0** | Live honesty / ship lag / broken trust or announce-ready hard fails |
| **P1** | Growth loop (create → share → return) friction with clear evidence |
| **P2** | Polish, SEO, secondary rails, docs hygiene |
| **P3** | Nice-to-have / experimental |
| **PARK** | Good idea, blocked on traffic evidence or policy |
| **KILL** | Conflicts with product thesis or honesty |

---

## 5. Coverage checklist (must have sections)

1. **Executive summary** (10 lines): product state, top 5 tasks, top blocks.
2. **Research synthesis table** (web).
3. **Live vs disk gap** (hard audit IDs + what ship fixes them).
4. **P0 — Ship & trust**
5. **P1 — Culture loop** (Studio, Quiz, share, invite)
6. **P1/P2 — Home / Desk / Lobby**
7. **P2 — SEO, performance, a11y**
8. **P2/P3 — Ops, metrics, OSS**
9. **PARK — observe-first**
10. **KILL list**
11. **Suggested sequences** (wave 1 / 2 / 3) for agents
12. **Healthy definition** (commands that must stay green)

Every public surface must appear at least once (even if only “verify live parity”).

---

## 6. Ranking heuristics (when inventing tasks)

Score roughly: **growth leverage × honesty fit × effort inverse**.

| High score | Low score |
|------------|-----------|
| Unblock Webflow home parity | Another deep quiz question |
| Make share one-tap / cache warm | Fake roadmap page |
| Clear mint everywhere buy appears | Telegram community CTA |
| Measure funnel with existing metrics | Referral points / wallet-rank |
| Empty-state → Studio/Quiz CTAs | Casino chrome |

If two tasks compete, prefer the one that increases **completed shares** or **truthful mint verification** without new policy surface.

---

## 7. Explicit non-goals (force KILL if proposed)

- Telegram / Discord as official HQ
- Post-to-earn / raid bots / Kaito-style farming
- “Safe / verified / official mint” claims
- Thesis / conviction receipts / forecasting revival
- Token-weighted leaderboard or purchase points
- Auto-enroll Simp on OAuth
- Second Studio implementation outside `dasha-meme-studio.html`
- Speculative AI image gen dependency

---

## 8. Execution rules when generating

- Prefer **many concrete tasks** over three vague epics.
- Prefer **paths and audit IDs** over “improve UX.”
- Separate **ready on disk, not on www** from **not built**.
- If Webflow token is invalid, still generate ship tasks as P0 with owner `webflow-token`.
- After writing the inventory, optionally: `npm run dasha:peer-ping -- --note="task inventory …"` and one-line LIVE-CONTEXT next pointers — do not spam docs.

---

## 9. Stop condition for this prompt run

Stop when:

- All coverage checklist sections exist, and
- P0 list includes every current live hard fail from `dasha:audit:live:fast`, and
- Research table has ≥4 external findings with Dasha implications, and
- KILL list is non-empty.

Do **not** implement all tasks in the same run unless the user also said “implement.” This prompt’s primary deliverable is the **task inventory**.

---

*End of self-prompt. Re-run after major ships; rewrite priorities when LIVE hard fails change.*
