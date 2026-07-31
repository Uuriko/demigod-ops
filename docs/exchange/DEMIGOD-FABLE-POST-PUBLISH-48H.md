Read-only session (Bash denied) — plan delivered as text, grounded in memory + your stated state. Do not treat 115/100 as real; the metric is uncapped and previously grep-gameable.

## Ranked next-48h actions

**1. Kill the proposeIntro board-mint (P0, blocks everything pilot-related).** proposeIntro in demigod-matching-engine.mjs mints a `sample:false` role + receipt via appendPilot+saveBoard on a mere *proposal*, bypassing the honesty gate. Any pilot op you run in the next 48h corrupts the board.
```
grep -n "appendPilot\|saveBoard" demigod-matching-engine.mjs
```
Fix: proposeIntro writes only to a proposals log (new file, not board); board writes happen solely via the gated ingest path. Then `npm run demigod:verify:source && node demigod-board-honesty-gate.mjs` (or your board-honesty npm alias). Grok applies; smoke-pass before anything else.

**2. Follow-up DMs — overdue.** 5 DMs sent 07-06 with follow-up due 07-08; it's 07-12. Send short, no-SLA follow-ups today ("still pre-services, one white-glove slot open, hello@trydemigod.com"), then 5–10 new warm-SF DMs from founders.csv. Verify no "48h"/"John" signature in any draft before sending:
```
grep -rn "48h\|48 hours\|John" outreach/ --include="*.md"
```

**3. Douglas call prep (before the call, ~30 min).** One page: what's live (v179, how-it-works i61ega.html), honest board state (N seeds, 0 real), the white-glove offer, and one concrete ask (intro or pilot commit). No delivery-time promises. Log outcome immediately after via pilot logger **only after item 1 is fixed** — otherwise log to a text note, not the board.

**4. Live smoke on v179.** Confirm foot ver + no console errors + WIZ submits:
```
npm run demigod:verify:live
node demigod-wiz-cdp-playtest.mjs
```

**5. Cap the metrics script.** 115/100 undermines every status report. Clamp `Math.min(100, score)` in dg-site-metrics, exit 0, re-run.

**6. One white-glove delivery motion.** If any DM/Douglas yields a candidate, do the matching manually (spreadsheet + email), not via the engine, until item 1 ships.

Order matters: 1 before 3's logging and 6; 2 is today regardless.
