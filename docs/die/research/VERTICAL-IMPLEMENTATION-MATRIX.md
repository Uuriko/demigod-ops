# Top-5 vertical implementation matrix

**Purpose:** one page from mechanism research → files, gates, smallest check.  
**Source:** `VERTICAL-MECHANISM-DEEP-DIVE.md`  
**Date:** 2026-07-30

| Rank | Mechanism (steal from) | Demigod owned shape | Primary files (existing → new) | Gate | Smallest check | Status |
|-----:|------------------------|---------------------|--------------------------------|------|----------------|--------|
| 1 | Continuous evidence controls (**Vanta**) | Control board + history JSONL + SH/export/reseal controls | `demigod-control-board.mjs`, design `docs/die/CONTROL-BOARD-DESIGN.md` | none (internal) | `node demigod-control-board.mjs --selftest` · `history` · `/api/control-board` | **BUILT** |
| 2 | Daily observation / change clock (**Firecrawl monitor + job intent**) | Poll cadence; aging without reseal thrash | existing: `demigod-role-ledger.mjs`, `demigod-directory-aging.mjs` → `systemd-user/demigod-role-ledger.{service,timer}` | none (internal) | `node --test demigod-role-ledger-timer.test.mjs`; live cycle 338/339 boards | **BUILT + ENABLED** |
| 3 | Structured role + scorecard (**Ashby / Greenhouse**) | `RolePacket` + `ReviewNote` (evidence-required) | `demigod-role-packet.mjs`, `DEMIGOD-ROLE-PACKETS.json`, `DEMIGOD-REVIEW-NOTES.json` | none (technical product) | `node demigod-role-packet.mjs --selftest` | **shipped** |
| 4 | Batch cap (**Underdog / Wellfound Autopilot**) | `PilotBatch` max 2–3; terminal before add | `demigod-pilot-batch.mjs`, `DEMIGOD-PILOT-BATCHES.json` | none | `node demigod-pilot-batch.mjs --selftest` | **shipped** |
| 5 | Touch rediscovery (**Gem**) | `CandidateTouch` append-only + rediscover | `demigod-candidate-touch.mjs`, `DEMIGOD-CANDIDATE-TOUCHES.json` | none | `node demigod-candidate-touch.mjs --selftest` | **shipped** |
| 4b | Intro path memory (**Affinity** phase-0) | Manual `IntroPath` strength+evidence; warm rank | `demigod-intro-path.mjs`, `DEMIGOD-INTRO-PATHS.json` | none (no connectors) | `node demigod-intro-path.mjs --selftest` | **shipped (manual)** |
| 7b | Call notes (**Metaview** thin, no bot) | Manual `CallNote` summary ≥20; no score/auto-pair | `demigod-call-note.mjs`, `DEMIGOD-CALL-NOTES.json` | after real screens | `node demigod-call-note.mjs --selftest` | **shipped (manual)** |
| 9b | Public job-post comp (**Levels** thin) | Extract quote → `public_job_post` band; SSRF-safe fetch-url | `demigod-public-comp.mjs` → `setCompBand` | https + safeResearchUrl + parseable quote | `node demigod-public-comp.mjs --selftest` | **shipped (extract/apply/fetch)** |
| 3b | Debrief roundup (**Ashby**) | Aggregate notes per must-have; disagree flags; no score | `debriefRoundup` in role-packet + SH desk/pack/match-review | none | `node demigod-role-packet.mjs debrief --role=…` | **shipped** |
| ops | Enrich work-find discovery | Reseal/control-board/SH plan/comp/aging tasks | `demigod-work-find.mjs` | none | `node demigod-work-find.mjs --json` | **BUILT** |

## Explicitly not in top 5 (still researched)

Affinity **connectors** (Gmail/calendar) · Harmonic-scale DB · Metaview **bot-joiner** · Levels crowd DB · Paraform marketplace software.

## Agent policy when implementing

- Rank 1–2: allowed without inventing pilots.  
- Rank 3–5: design + hermetic fixtures only until gate receipts exist.  
- No publish / outbound / people enrichment.
