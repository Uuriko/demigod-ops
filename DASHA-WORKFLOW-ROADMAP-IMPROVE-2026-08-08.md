---
status: historical
archived: 2026-08-08
---

# Dasha workflow & roadmap improvements

**Date:** 2026-08-08  
**Inputs:** multi-agent debate · full audit · existing `DASHA-WORKFLOW.md` / `DASHA-ROADMAP.md` / `DASHA-SIMPLIFY.md`

---

## Problems with current workflow

1. **Docs outnumber surfaces** → agents re-litigate strategy.  
2. **Live lag unpriced** → “improve disk” feels productive while users stay on old UX.  
3. **Experiments lack kill clocks** → relay/capsule/howto linger as pseudo-backlog.  
4. **Tests encode campaigns** → every copy tweak becomes a red gate.  
5. **Multi-agent thrash** without a single debate artifact (fixed by this review pack).  
6. **Demigod KEEP_WORKING hooks** collide with Dasha-active sessions.

---

## Workflow improvements (adopt)

### 1. Session start card (30 seconds)

```
Active project: Dasha
Read: DASHA-SIMPLIFY.md + DASHA-DOCS.md (status only)
Live lag? node dasha-live-verify.mjs
Gate: npm run dasha:test:<surface>
Ship? only if current user message authorizes publish
```

### 2. One lane per session

| Lane | Allowed edits |
|------|----------------|
| Home | `dasha-landing.html` + landing test |
| Studio | `dasha-meme-studio.html` + studio test |
| Desk | `dasha-desk/src/*` + build + desk test |
| Docs | `DASHA-*.md` only |
| Ship | publish-ready + auth path (authorized) |

Refuse cross-lane expansion without naming it.

### 3. Doc roles mandatory

Before writing a new `DASHA-*.md`, state status: Current | Experiment | Historical | Scrap.  
Prefer **updating Brief/Roadmap/Simplify** over a new file.

### 4. Experiment protocol

Any new HTML experiment must include:
- kill date or kill metric  
- “not on public nav” line  
- no growth-test promotion until live  

### 5. Multi-agent protocol (this worked)

1. Write shared prompt (`DASHA-FULL-REVIEW-PROMPT-…`)  
2. `ask-claude` + `codex-ask` in parallel (read-only)  
3. Grok synthesizes disagreement into one debate doc  
4. Archive raw replies under `docs/dasha-review-…/`  

### 6. Metric loop (14-day)

Even without analytics entitlement:
- Manual: count Studio exports / remix links seen on X  
- Optional: localStorage counters on Studio (export, share, remix copy) — no wallets  
- Roadmap gates already define pass/fail — **run them**

### 7. Hosting decision tree

```
Webflow auth OK → publish three embeds
else → static three routes on Pages/Cloudflare
never → half-ship howto or FOMO desk
```

### 8. Anti-Demigod

While user says Dasha-active: ignore trydemigod KEEP_WORKING stop-hooks; log once and continue Dasha lane.

---

## Roadmap improvements

### Keep structure of current roadmap

Phase 0 conversion · Phase 1 Studio · Phase 2 one expansion — **good**.

### Amend

| Change | Why |
|--------|-----|
| Add **Phase −1: Ship parity** | Live must match disk Studio/home/desk before new features |
| Add **instrumentation gate** before Phase 2 | No Relay without handoff counts |
| Mark Capsules/Open Objects **gated experiments** | Not “active specification” in docs map |
| Explicit **how-to-buy disposition** | Freeze unlinked / fold / delete — pick one in Brief |
| Desk **conditional survival** | Codex: 14-day use or fold |
| Kill list appendix | FOMO receipts, gamification/settlement specs |

### Proposed near roadmap text (summary)

```
−1 Ship parity (disk → live or static)
 0 Conversion (Jupiter + mint honesty) [mostly built]
 1 Studio demand (export/share/remix metrics)
 2 One of: Relay | (nothing) | Desk fold
never: receipts, fourth route, chat product, fake utility
```

---

## Improvement ideas backlog (prioritized)

| Pri | Idea | Type |
|-----|------|------|
| 1 | Ship Studio formats live | Ship |
| 2 | Studio localStorage funnel counters | Code small |
| 3 | Archive `dasha-desk/receipts` FOMO set | Hygiene |
| 4 | Collapse Webflow scripts to one `dasha-ship.md` path | Ops |
| 5 | Static-host runbook | Ops |
| 6 | Single mint constant module (only if third consumer) | Code |
| 7 | Thin tests (trust only) pass | Code |
| 8 | Quarterly doc archive pass | Docs |

---

## What not to “improve”

- More strategy PDFs  
- Quest/points gamification  
- Wallet connect for culture  
- Auto-DM or raid kits  
- Parallel Demigod work in Dasha sessions  

---

## Success for *this* process

This review pack is successful if agents:

1. Open **SIMPLIFY + DOC-OF-DOCS** first  
2. Argue via **prompt + transcripts** instead of silent drift  
3. Treat **ship lag** as P0  
4. Leave experiments frozen without guilt  

Reusable prompt lives at [`DASHA-FULL-REVIEW-PROMPT-2026-08-08.md`](DASHA-FULL-REVIEW-PROMPT-2026-08-08.md).
