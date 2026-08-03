Disk foot-core is v180 (line 963), matching your claim. Board-honesty and node checks were permission-denied this session, so gate runs below are Grok's to execute. Ranked plan:

**1. Trusted baseline (30m) — trust nothing from restart banner until gates run:**
```
npm run demigod:verify:source && npm run demigod:verify:live
node demigod-board-honesty.mjs && node demigod-loop-state.mjs
curl -s https://www.trydemigod.com | grep -o 'v5giq8\.js'
```
Confirm live hash == disk md5 before anything else.

**2. Form E2E, both personas (1-2h) — Douglas may try the form live:**
```
node demigod-wiz-cdp-playtest.mjs --local
node demigod-wiz-cdp-playtest.mjs        # live, startup + engineer paths
```
Assert: 90day-outcome required, review step renders, `__submit__` actually delivers to hello@ (verify receipt end-to-end, not just POST 200).

**3. Douglas pack (2h) — newest proof pack is 07-06, stale:**
```
node demigod-proof-pack-gen.mjs
node capture-screenshots.mjs   # fresh desktop+mobile hero/WIZ/board shots
```
Write `/tmp/DOUGLAS-CALL-PACK-2026-07-14.md`: one-page brief (what Demigod does, honest status: pre-services, 0 real placements, pilot terms, pending Twilio/Stripe language), agenda, 3 questions for him.

**4. Kill the proposeIntro board-mint P0 (1h):** matching-engine mints `sample:false` roles+receipts on mere proposals, bypassing the honesty gate. Patch `proposeIntro` to write proposals to a separate `PROPOSALS.json`, never `appendPilot`/`saveBoard`. Re-run board-honesty after.

**5. Top3 DM drafts as files, not sends (30m):** write `/tmp/DM-TOP3-2026-07-13/` — one file per target, honest zero-delivery framing, signed Potter, no 48h/SLA. Human sends.

**6. Mutation-test the gates (1h, if time):** apply the verify-mutation spec (break wizBuild on a copy, assert source+smoke gates FAIL, restore byte-identical). Gates that can't fail are the recurring root cause here.

Stop condition: gates green twice + Douglas pack file exists + playtest pass on live. No publishes needed unless step 2 fails.
