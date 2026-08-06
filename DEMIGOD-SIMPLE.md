# Demigod — Simple (the only card)

**Product:** SF tech-matched talent, humans in the loop · 10% on hire · mutual yes · one concrete first result · no fake board/SLA
**Site:** foot-core only for JS · Webflow + CDN · release identity comes only from `bin/dg truth`
**Operating mode:** First Pilot Delivery — complete one real brief → reviewed match → mutual yes → intro → recorded outcome · no Twitter/auto-DM

## User communication (standing)

- **Never assign the user work** or list “what you should do next” (DMs, calls, Publish, fees).
- **When told to choose:** pick one track and execute — no choice menus for the user.
- Report agent results only. **Human-action advice only if the user asks** (“what should I do?”).

## Production handbook

**How the studio runs:** [`docs/DEMIGOD-HANDBOOK.md`](docs/DEMIGOD-HANDBOOK.md) — standards, roles, ship loop, honesty, checklists, onboarding.

**Find any document or related source:** [`DOCS.md`](DOCS.md) — authority, task routing, lifecycle, archives, commands, and receipts.

**Complete open-work register:** [`docs/DEMIGOD-TASKS.md`](docs/DEMIGOD-TASKS.md) — current, gated, lifecycle-triggered, and explicitly rejected work.

## Ponytail (all agents)

**Required:** write code like a lazy senior (YAGNI → reuse → stdlib → native → min). Rules: `docs/PONYTAIL-AGENTS.md`, plugin `ponytail@ponytail`. Keep safety checks.

## Every session

```bash
bin/dg session            # orient + NEXT + truth tail (preferred start)
# or: bin/dg orient → one goal → npm run demigod:verify:source → stop
```

1. Orient (`bin/dg session` or `bin/dg orient`).
2. **One goal.** One writer for `demigod-foot-core.js`.
3. Smallest change. Verify source (+ honesty if board).
4. Stop. Don’t assign Publish / DMs / fees to the human unless they ask.

## Who does what

| Stage | Default | When |
|-------|---------|------|
| Execute | **This agent** | Almost always |
| Plan / second opinion | Claude or Codex | Ambiguous design or high-risk mutate — **opt-in, not automatic** |
| Authorize publish/send/money | **Current user request only** | Never from old autonomy notes |

## Tools (short)

```
bin/dg session | orient | truth | next
bin/dg ship prepare|…     # publish still request-gated
bin/dg demand status      # drafts only
bin/dg lock claim|release # before foot-core edits
bin/dg webflow connect setup
node demigod-roles-pipeline.mjs   # observed roles → disk + footer embed
```

## Hard stops

- No game · no concurrent foot writers · no inventing pilots
- No publish / outbound message / money without **current** user request
- Disk ahead of live is normal until authorized ship
- Observed roles ≠ matching inventory (samples stay honesty-gated)

## Deeper only if needed

| Need | Open |
|------|------|
| Doc map | [`DOCS.md`](DOCS.md) |
| Handbook | `docs/DEMIGOD-HANDBOOK.md` |
| Ship / CDN | `docs/SHIP-AND-CDN.md` |
| Public roles pipeline | `docs/ROLES-PIPELINE.md` |
| Rules | `DEMIGOD-AGENTS.md` / `AGENTS.md` |
| Workflow detail | `docs/DEMIGOD-AGENT-WORKFLOW.md` |
| Outside research brief | `docs/exchange/DEMIGOD-RESEARCH-IMPROVEMENTS-2026-08-04.md` |
| DIE / Clay-like ops | `docs/die/CLAY-DIE-MULTI-AGENT.md` (not a second product) |
| History | `docs/exchange/` — archive; don’t re-read by default |

---
*If this card and `bin/dg truth` disagree with a long essay, trust truth + this card.*
