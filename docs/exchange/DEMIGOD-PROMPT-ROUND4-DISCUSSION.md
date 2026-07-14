# Prompt Round-4 — Deep History, Annotation, Tools Debate

**Date:** 2026-07-14  
**Inputs:** Fable (Claude sonnet) + Codex full-history synths · Atlas · live ground truth  
**Sources:** `DEMIGOD-FABLE-HISTORY-ROUND4.md` · `DEMIGOD-CODEX-HISTORY-ROUND4.md` · this session Grok exec

## Structured header (required every agent turn)

```
LIVE=v198(ksbrmy.js) DISK=v199 FREEZE=on GATES=source+honesty+live-doctor
```

Always refresh with `bin/dg live` — never reuse a prior session's belief about versions.

## Swarm consensus (Fable ∩ Codex ∩ Grok)

| Decision | Why |
|----------|-----|
| **Not** line-by-line comment spam | Noise; use file headers + section banners + JSDoc exports + atlas |
| live-doctor is **only** drift oracle | Ends false-drift from regex/stale tabs/JSON |
| Freeze drift (disk ahead, freeze ON) = **warning**, not fail | Intentional ship lag |
| `--release` / `--require-match` makes drift **fatal** | Ship gate |
| full-check owns composition | local gates → live-doctor → route-mime → smoke |
| MIME gate = same-origin `/?p=` | Catbox raw HTML probes are diagnostic only |
| No new `*-pass.mjs` without archive plan | Surface-area explosion |
| Attribution: git proves files; prompts suggest roles | Don't invent byte authorship |

## What each agent built (evidence-based)

| Phase | Who | What |
|-------|-----|------|
| 0 corruption | Concurrent Grok sessions | Foot/board thrash → "one writer + verify" rule |
| 1 site core | Grok + Fable specs | WIZ, 90day, dual CTA, honesty scrub, CDN |
| 2 ops OS | Grok | Control plane, dash :9878, pairs, review, hygiene |
| 3 cohesion | Grok + design ships | Freeze, Orca, full-check, v196–v198 live |
| Docs/prompts | Claude/Fable + Codex + Grok | Atlas, MASTER prompts, multi-agent packs |
| Round-4 tools | Grok (+swarm design) | live-doctor, route-mime, full-check composition, annotations |

**Git does not encode agent identity** (author = potter). Roles are operational contracts, not commit metadata.

## Documentation gaps closed this round

1. live-doctor drift policy documented + implemented  
2. full-check embeds live-doctor + route-mime  
3. Foot-core section banners on critical paths  
4. One-shot archive *classification* (not file moves under freeze)  
5. Round-4 prompt deltas applied to MASTER website + ops  

## Still open (next software work)

| Item | Owner | Notes |
|------|-------|-------|
| Ship v199 when intentional | Grok | freeze off → CDN → CM6 → live-doctor --require-match |
| WIZ ownership harden | Codex/Grok | forceMobileDesktopWIZ + reopen tests |
| Smoke soft disk-ver assert | Grok | report disk vs live foot in smoke JSON |
| Archive one-shots | ops | after freeze window; `archive/demigod-one-shots/` |
| Version ledger | ops | `VERSION-LEDGER.md` append-only |
| Dashboard API section banners | ops | demigod-agent-dashboard.mjs routes |

## Annotation policy (locked)

1. File header: purpose, SoR, commands, freeze behavior  
2. Section banners at subsystem boundaries  
3. JSDoc on multi-consumer exports  
4. Atlas/module index for discovery  
5. **Forbidden:** comment every line / narrate syntax  

## Round-4 protocol (how to run next swarm)

1. Open with structured header from fresh `bin/dg live`  
2. Single foot-core writer; others plan-only until handoff  
3. Freeze-guard before any mutate job  
4. P0 claims need fresh-tab timestamped repro  
5. Annotate before extending a file  
6. Close with compressed-state + ledger note  
7. Prefer extending registry tools over new one-shots  

## Prompt patch list (applied)

See bottom of `prompts/demigod/MASTER-WEBSITE-IMPROVEMENT-PROMPT.md` and `MASTER-OPS-TOOLS-PROMPT.md` for **Round-4 addendum**.

## Tools: build vs archive

**Built / hot:** live-doctor, route-mime, full-check (composed), bin/dg live|mime|full-check  

**Build next:** version-ledger; smoke disk/live soft assert; optional wiz visual regression  

**Archive candidates (classify only; freeze):**  
candidate-copy, cms-legal, legal-page, nav-forms, nav-master, partnerships-page, partnerships-rename, route-pages, seo-nav-forms, source-truth (already deprecated in package.json)  

**Keep while package scripts call them:** full-ship, resume-field, master-only, final-publish, drift-fix, forms-rename, heavy-website-audit, partnerships-publish  

---
*Round-4 ends when: docs updated, annotations on P0 files, prompts patched, full-check includes doctors, gates green under freeze.*
