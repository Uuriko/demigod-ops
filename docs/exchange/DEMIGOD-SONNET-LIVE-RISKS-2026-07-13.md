**Top 5 product risks — Demigod v179 (el26dg)**

1. **Dynamic board content isn't escaped or re-tagged.** `renderBoard()`/`ledgerHtml()` inject `BOARD_CDN` JSON via `innerHTML` after fetch, but the "Sample" badge stamping only runs on `.role-card` DOM present at `run()` time — roles rendered later via `fetchBoard()` can skip the sample tag and are unescaped, so a compromised/malformed catbox JSON both mis-renders honesty labeling and is an XSS vector.

2. **Deep-link regex is too narrow, fails silently.** `deepLink()` only matches `wiz|hire|founder` / `engineer|talent|join` exactly; anything else (typo, campaign param, case variant not caught) just no-ops with no fallback or logged signal — silent drop of paid/DM traffic intent.

3. **File upload honesty is cosmetic, not functional.** `fileUploadHonest()` adds a "paste a link instead" hint + URL field but there's no evidence the URL or file actually reaches a human (no submit-time check that either resume/role-jd or its `-url` fallback is non-empty) — silent data loss on the highest-effort step.

4. **wizBuild critical-field logic is deeply nested and history of drift.** 90day-outcome selector/critical-array logic (lines ~277-547) has broken before (dead calls, unreachable `__submit__`, invisible required fields) across multiple prior versions; no automated smoke test currently guards this exact v179 path.

5. **Honesty gate is manual, not enforced at write time.** `DEMIGOD-BOARD.json` is currently correctly 2 sample/0 real, but nothing in `foot-core.js` blocks a future writer from flipping `sample:false` — repeated historical failure mode (board corruption #1-3).
