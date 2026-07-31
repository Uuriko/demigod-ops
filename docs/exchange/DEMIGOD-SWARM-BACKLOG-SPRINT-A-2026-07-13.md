# Swarm backlog + Sprint A execution — 2026-07-13

## Agents
| Agent | Role | Status |
|-------|------|--------|
| Codex UX | Product sprint A/B | Delivered (`/tmp/dg-busy/swarm/backlog-codex-ux.md`) |
| Codex tech | Control-plane | Slow/empty this run |
| Fable | Strategy cut | Slow/empty this run |
| Claude impl | File list | Slow/empty this run |
| Grok | Execute Sprint A | **Done** |

## Codex UX Sprint A (aligned + shipped)
1. Roadmap tab + `/api/roadmap` — **done**
2. Ship checklist freeze-aware — **done** (`demigod-ship-checklist.mjs`, `/api/ship-checklist`)
3. Events feed — **done** (ring + `/api/events`; SSE full push deferred to B)
4. Job history — **done** (memory + disk job-store merge)
5. Atomic handoff write — **done** (tmp+rename)
6. Doctor — **done** (`demigod-doctor.mjs`, `/api/doctor`)
7. Usertest still green on dash suite

## DO NOT (Codex + standing rules) while freeze ON
- No CDN/Webflow publish, no unfreeze without human
- No game, no GTM spam automation, no live board seed thrash

## How to use
```bash
bin/dg-ship-check
bin/dg-doctor
curl -sS http://127.0.0.1:9878/api/ship-checklist
# UI: Roadmap tab (Simple mode)
bin/dg-usertest --suite dash
```

## Sprint B (next when swarm/human agrees)
- True SSE with heartbeat
- Submission inbox fixtures
- mintBoardEntry
- MCP for dash
- WIZ residual field on disk only until unfreeze
