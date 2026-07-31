# Top-5 vertical implementation matrix

**Purpose:** one page from mechanism research → files, gates, smallest check.  
**Source:** `VERTICAL-MECHANISM-DEEP-DIVE.md`  
**Date:** 2026-07-30

| Rank | Mechanism (steal from) | Demigod owned shape | Primary files (existing → new) | Gate | Smallest check | Status |
|-----:|------------------------|---------------------|--------------------------------|------|----------------|--------|
| 1 | Continuous evidence controls (**Vanta**) | Control board: named invariants → pass/fail + receipt | existing: `demigod-evidence.mjs`, `demigod-accepted-role.mjs`, `bin/dg truth` → `demigod-control-board.mjs`, design `docs/die/CONTROL-BOARD-DESIGN.md` | none (internal) | `node demigod-control-board.mjs --selftest` · `… status` | **BUILT** |
| 2 | Daily observation / change clock (**Firecrawl monitor + job intent**) | Poll cadence; aging without reseal thrash | existing: `demigod-role-ledger.mjs`, `demigod-directory-aging.mjs` → `systemd-user/demigod-role-ledger.{service,timer}` | none (internal) | `node --test demigod-role-ledger-timer.test.mjs`; live cycle 338/339 boards | **BUILT + ENABLED** |
| 3 | Structured role + scorecard (**Ashby / Greenhouse**) | `RolePacket` + `ReviewNote` (evidence-required) | `demigod-role-packet.mjs`, `DEMIGOD-ROLE-PACKETS.json`, `DEMIGOD-REVIEW-NOTES.json` | none (technical product) | `node demigod-role-packet.mjs --selftest` | **shipped** |
| 4 | Batch cap (**Underdog / Wellfound Autopilot**) | `PilotBatch` max 2–3; terminal before add | `demigod-pilot-batch.mjs`, `DEMIGOD-PILOT-BATCHES.json` | none | `node demigod-pilot-batch.mjs --selftest` | **shipped** |
| 5 | Touch rediscovery (**Gem**) | `CandidateTouch` append-only + rediscover | `demigod-candidate-touch.mjs`, `DEMIGOD-CANDIDATE-TOUCHES.json` | none | `node demigod-candidate-touch.mjs --selftest` | **shipped** |
| 4b | Intro path memory (**Affinity** phase-0) | Manual `IntroPath` strength+evidence; warm rank | `demigod-intro-path.mjs`, `DEMIGOD-INTRO-PATHS.json` | none (no connectors) | `node demigod-intro-path.mjs --selftest` | **shipped (manual)** |

## Explicitly not in top 5 (still researched)

Affinity **connectors** (Gmail/calendar) · Harmonic-scale DB · Metaview bot · Levels product · Paraform marketplace software.

## Agent policy when implementing

- Rank 1–2: allowed without inventing pilots.  
- Rank 3–5: design + hermetic fixtures only until gate receipts exist.  
- No publish / outbound / people enrichment.
