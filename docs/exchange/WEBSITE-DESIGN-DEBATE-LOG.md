# Website design debate log

Append-only. Each cycle: scores, kills, promotions.

## Cycle 0 — Kickoff (2026-07-16)

### Consensus entering lab

| Voice | Claim | Status |
|-------|-------|--------|
| Codex | Operator Calm is the drastic baseline; foot-as-page-builder is the bug | Accepted as V1 |
| Grok | Connect stack done; stop meta-connect; use tools to ship look | Accepted |
| Research | Dual path + outcome hero + no fake proof; 5–8 sections | Accepted |
| Live site | Title still “Human-Matched”; dark/gold recruiter read | Problem statement |

### Open debates

1. Light paper (V1) vs night ink without gold (V6) — does dark ever work for Demigod?  
2. Split-screen dual world (V2) vs single calm hero (V1) — equality vs unity?  
3. How much product artifact without becoming fake dashboard?  
4. Lab-only vs live thrash — prefer lab until blur pass.

### Tool dogfood (kickoff)

| Tool | Result | Action |
|------|--------|--------|
| `bin/dg-webflow connect` | useful | keep hot path |
| `bin/dg-webflow status` | ok when dogfooded | prior fail likely timeout/tab noise |
| dash `/api/control` | ok | health 60 watch; tab budget was high → pruned to ~4 |
| `bin/dg hygiene --prune` | ok | keep before CDP heavy work |
| Codex Webflow MCP OAuth | invalid_token in Codex session | Codex config present; re-auth when Designer tools needed from Codex |
| Fable first pass | returned hold-green brief (wrong task) | relaunched redesign-only brief |
| Claude first pass | `--print` argv error | relaunched via stdin |

### Next

Implement design-lab V1, V2, V7 → screenshots → score → this log.

---

## Cycle 1 — Lab variants scored (2026-07-16)

### Built
- `design-lab/V1-operator-calm.html` · V2 · V7  
- Screenshots: `design-lab/out/*-{desktop,mobile}.png` + `LIVE-desktop.png`  
- Scores: `design-lab/out/scores-cycle1.json`  
- Codex protocol: `docs/exchange/CODEX-WEBSITE-EXPERIMENT-PROTOCOL.md` (concepts A–F)  
- Master prompt: `docs/exchange/WEBSITE-REDESIGN-MASTER-PROMPT.md`

### Grok scores (weighted /100)

| Variant | Score | Blur vs live | Verdict |
|---------|-------|--------------|---------|
| **V1 Operator Calm** | **90.5** | PASS | **Promote** |
| V2 Signal Split | 89.5 | PASS | Challenger — best dual-path equality |
| V7 One Screen | 86.5 | PASS | Fast A/B, thin process |
| LIVE baseline | 53.5 | — | Kill dark-gold-as-default |

### Debate notes

**FOR V1:** Complete story (process + pricing + dual path + artifact). Matches Codex Operator Calm + SaaS anatomy. Highest clarity without two-product split risk.

**AGAINST V1 / FOR V2:** V2 makes dual-path identity impossible to miss; V1 still slightly prioritizes hiring via filled cobalt button. Mitigate on promote: equal path card weight (both filled or both outline with equal size).

**Codex A–F queue for cycle 2:** Match Table, Two Doors (≈V2), The Brief, Mutual Yes, SF Signal Map, Anti-Job-Board — implement as lab HTML after V1 live promote, not before.

**Fable:** `bin/df review` keeps injecting hold-green demand brief — **tool not useful for redesign**. Logged dogfood fail. Prefer raw Claude or new `prompts/demigod/website.txt`.

**Claude Code:** slow/stuck on variants brief this cycle; Grok scored screenshots directly. Relaunch scoring later.

**Tool fixes:**
- `design-lab/capture.mjs` → headless Playwright (CDP connect hung)  
- hygiene prune → tabs ~4  
- SEO: homepage title via Webflow MCP (drop Human-Matched)

### Decision
Promote **V1 Operator Calm** to live foot/head (reduce page-builder thrash, paper tokens, dual path, process). Keep V2 as A/B challenger. Cycle 2 = Codex A–F lab after ship.

### Cycle 1 ship result
- **v571 live:** paper bg `rgb(247,244,239)`, ink text, cobalt CTAs, title fixed, TRUTH PASS disk=live=v571  
- **CDN ship OK**; CM6 paste reported flaky (foot SoR is CDN for brandAssets)  
- **Residual:** Designer H1 still “SF STARTUP TALENT.” — needs copy rewrite to “The right people, with signal.” in hero() + Designer static  
- **SEO publish:** page settings updated; site_publish domain-ID format (IDs not hostnames)

### Cycle 1b + never-stop (2026-07-16)
- **v572 live:** H1 **THE RIGHT PEOPLE, WITH SIGNAL.** · Operator Calm sub · three gates process · TRUTH PASS  
- **Never-stop ON:** `max-cycles=9999` · sleep 90s · backlog redesign-first · watchdog restart  
- **Lab:** Codex Two Doors HTML captured  
- **Note:** cycle-work website domain often fails attestation; Grok implements P0s directly while loop rotates domains  

---
