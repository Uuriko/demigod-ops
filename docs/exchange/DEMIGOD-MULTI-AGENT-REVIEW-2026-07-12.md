# Demigod Multi-Agent Review — 2026-07-12

**Status:** Authoritative decision + synthesis  
**Participants:** Grok (orchestrator), Fable (Claude fable), Claude Opus, Codex  
**Live:** https://www.trydemigod.com  
**Last Published (www):** Fri Jul 10 2026 01:58:08 GMT  

Raw agent outputs: `/tmp/dg-multi/` (`fable-out.txt`, `opus-out.txt`, `codex-review.md`)

---

## 1. Decision: **FIX** (not rewrite, not hybrid rebuild)

| Option | Verdict | Why |
|--------|---------|-----|
| **FIX** | **Chosen** | Live site works; architecture is sound; bottleneck is **demand**, not product surface |
| Hybrid (new stack + keep Webflow) | Rejected for now | Weeks of dual systems; no extra founder intros |
| Scratch (Next/custom host) | Rejected | Rebuild forms, hosting, publish, WIZ, honesty for a GTM-ready UI |

**Unanimous agent consensus:** Fable = FIX · Codex = FIX · Opus = stabilize-then-GTM · Grok = FIX.

**Root cause of past pain:** process (concurrent foot writes, publish lag, CDN hash drift) — **not** Webflow+custom-code as an architecture.

---

## 2. Evidence snapshot (2026-07-12)

### Live (www)
| Check | Result |
|-------|--------|
| HTTP | 200 · ~31KB · ~85ms (curl) |
| Title | Demigod • Human-Matched SF Startup Talent |
| Unhide | `unhide-v5-safe` present |
| Design CSS | `files.catbox.moe/m2f8rp.css` |
| Foot CDN | `files.catbox.moe/8tjw79.js` → **v176** |
| Inline honesty | `dg-v177-honesty-patch` in footer (soft 90-day language) |
| CTAs in static HTML | HIRE TALENT · JOIN NETWORK · FIND TALENT · hello@ |
| Lorem / 48h SLA in static text extract | **No** |
| Playwright full audit | Unreliable (domcontentloaded timeout from headless); use curl + CDP |

### Disk / gates
| Check | Result |
|-------|--------|
| `demigod-foot-core.js` | **v177** · 111653 bytes · sha256 `2a274e8e…4c2622` |
| Live CDN 8tjw79.js | **v176** · 111554 bytes · sha256 `2f9dd073…d2c89f` |
| Head | `unhide-v5-safe` · `demigod-head-minimal.html` |
| Board | 2 sample roles · `realRoles:0` · `realReceipts:0` · CDN `orqkmx.json` |
| `npm run demigod:verify:source` | **pass** (this session) |
| Board honesty | **OK** |
| Loop-state | **OK** (v177 matches disk, dm_freeze OFF) |
| Direct `demigod-foot-smoke.mjs` | pass version 177 |

### Critical drift
**Disk foot = v177; live catbox foot = v176.**  
Footer intentionally ships an **inline v177 honesty patch** (“full-foot reupload pending”). Forms/WIZ behavior may differ slightly until full CDN reupload. Do **not** claim live == v177 until CDN hash matches disk.

---

## 3. What each agent contributed

### Fable (strategy)
- **FIX** only. Site mostly done; demand is the bottleneck.
- Freeze foot-core thrash; single-writer discipline; disable rogue board-mint automation.
- 14-day focus: DMs → one white-glove pilot → proof assets → form e2e.
- OAuth parked until ≥10 real WIZ/week.

### Codex (technical)
- Architecture split (head / footer-lite / foot-core) is correct.
- Monolith foot + overlapping head unhide/scrub = tech debt, not rewrite fuel.
- Top technical work: deterministic boot-smoke in aggregate verifier; release manifest; fold honesty into CDN; modularize foot **behind same delivery**; behavioral tests; risk-namespace npm scripts; CDN provenance/SRI.

### Opus (risk audit)
- Live CDN staleness is the recurring “won’t load / wrong version” class of bug.
- Single JS SPOF (catbox foot) with no SRI.
- CSS catbox link can stall (historical spinner); head override may flash modal internals.
- `dg-simplify` may hide real nav/footer if they live in dropdowns/grids — verify mobile.
- WIZ coupled to hardcoded field names — Designer renames break stepper.
- Honesty OK on disk; most honesty is runtime-JS dependent.

### Grok (this session)
- Multi-agent orchestration, live/disk audit, gate runs, hash compare, shared docs, roadmap/checklist, compressed-state refresh, collab protocol.
- Decision owner under user directive: **no stop-to-ask**.

---

## 4. Ideal multi-agent operating model

See **`docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md`**.

Short form:

| Agent | Mode | Owns |
|-------|------|------|
| **Fable / Claude** | Plan / audit (prefer read-only) | Strategy, single next, plans → `/tmp/fable-*.txt` |
| **Codex / Cursor** | One writer at a time | `demigod-foot-core.js` + supporting `demigod-*.mjs` under lock |
| **Grok** | Execute + verify + tools | Gates, CDP, CDN prep, docs, GTM prep, publish automation when authorized |
| **Heavy** | Strategy only | Demand/GTM priority, anti-list |
| **Human** | Publish gate (default) | Webflow Publish; unless explicit full-autonomy override |

**Hard rules**
1. One canonical JS: `demigod-foot-core.js`
2. After any edit: `verify:source` + board-honesty + loop-state
3. No concurrent writers on foot-core
4. Shared truth: `DEMIGOD-COMPRESSED-STATE.md` + this exchange folder
5. GTM > site polish unless live P0 breakage

---

## 5. Must-do backlog (ranked)

### P0 — This week (ship demand + truth)
1. [ ] **Close GTM volume:** remaining warm SF founder DMs → 15+ total logged  
2. [ ] **Form e2e proof** on live (`node demigod-form-e2e.mjs` via CDP) — one tagged submit lands somewhere readable  
3. [ ] **One white-glove pilot** end-to-end → first non-seed receipt when real  
4. [ ] **CDN truth:** either reupload v177 foot (new catbox hash) + update footer-lite + publish, **or** freeze and document live=v176+patch until pilot justifies ship  
5. [ ] **Daily gates only** — no thrash: source + board + loop-state  

### P1 — Stabilize engineering (no rewrite)
6. [ ] Deterministic boot-smoke capture in `demigod-verify-source.mjs` (Codex #1)  
7. [ ] Release manifest: head / css / footer / core / CDN URLs + hashes  
8. [ ] Fold honesty patch into canonical core → drop permanent inline fork  
9. [ ] Mobile nav/footer survival under `dg-simplify`  
10. [ ] Consolidate docs → compressed state SSOT; archive stale root roadmaps  

### P2 — Later (only if conversion data demands)
11. [ ] Modularize foot-core → still one CDN artifact  
12. [ ] Behavioral contract tests (modal, WIZ, board labels)  
13. [ ] SRI / self-host critical CSS on Webflow assets  
14. [ ] OAuth (trigger: ≥10 WIZ/week)  
15. [ ] Twilio/Stripe live (pending language until then)  

### Anti-list (do not do)
- Full rewrite (Next, custom CMS, new host)
- OAuth/Twilio/Stripe “for polish”
- Board seeds >3 or fake receipts
- Concurrent agent foot-core edits
- Game / Eat the Sounds work
- Continuous improve loops without ask

---

## 6. Architecture keep-list

```
Webflow Designer (canvas/IX human)
  + head custom: demigod-head-minimal.html (unhide-v5-safe)
  + head CSS CDN: m2f8rp.css (+ inline tokens fallback)
  + footer: demigod-footer-lite.html → foot CDN + route redirects
  + foot behavior: demigod-foot-core.js (canonical) → catbox hash URL
  + board: DEMIGOD-BOARD.json ≤2–3 samples, real=0
  + gates: verify:source | board-honesty | loop-state | wiz playtest
```

This is **good enough for GTM**. Improve at the edges; do not replace the middle.

---

## 7. Communication artifacts (shared)

| File | Purpose |
|------|---------|
| `DEMIGOD-COMPRESSED-STATE.md` | Living SSOT (update every ship) |
| `docs/exchange/DEMIGOD-MULTI-AGENT-REVIEW-2026-07-12.md` | This decision |
| `docs/exchange/DEMIGOD-AGENT-COLLAB-PROTOCOL-2026-07-12.md` | How agents work together |
| `docs/exchange/DEMIGOD-14DAY-ROADMAP-CHECKLIST-2026-07-12.md` | Executable checklist |
| `/tmp/dg-multi/*` | Raw multi-agent reviews |

**How agents contribute:** append dated notes under `docs/exchange/`; update compressed state on ship; never invent live version claims — hash first.

---

## 8. Immediate execution plan (Grok continues)

1. Write collab protocol + 14-day checklist (done with this pass)  
2. Refresh `DEMIGOD-COMPRESSED-STATE.md` to v177 / live v176 truth  
3. Run CDP form dry e2e if Chrome up  
4. Fix boot-smoke flake if cheap  
5. Prepare CDN reupload package for v177 **without** thrashing WIZ behavior  
6. GTM checklist + outreach readiness refresh  
7. Keep gates green; stop site churn after readiness  

---

*Synthesized 2026-07-12 by Grok from Fable + Opus + Codex + live/disk evidence.*
