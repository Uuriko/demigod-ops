# WEB-01 — Website ship

**Owner:** Release · **When:** intentional release only (not thrash)  
**Tools:** freeze · ship-prep · full-check · live · mime · cm6/CDN

## Ready
- [ ] Human approves ship window
- [ ] Single foot-core writer
- [ ] Change list known; rollback = previous catbox + footer-lite URL
- [ ] Disk gates: `npm run demigod:verify:source` · foot-smoke · board-honesty

## Execute
- [ ] `node demigod-publish-freeze.mjs off` (human-authorized)
- [ ] `bin/dg ship-prep` (or foot-cdn + head-css publish)
- [ ] CM6 paste / custom code Save as needed
- [ ] Webflow Publish to **www.trydemigod.com** (and staging if required)
- [ ] `bin/dg live --require-match` or `bin/dg full-check --release`
- [ ] `bin/dg mime`
- [ ] Agent smoke / usertest if WIZ touched

## Done
- [ ] LIVE foot ver == DISK
- [ ] Ship ledger row `demigod-ops/releases/SHIP-LEDGER.jsonl`
- [ ] Update `DEMIGOD-COMPRESSED-STATE.md`
- [ ] Freeze **ON** again if site green and thrash risk

**Block:** freeze ON · honesty fail · MIME plain on product routes · dual writers  
**Postmortem ref:** `docs/exchange/DEMIGOD-PUBLISH-LOAD-POSTMORTEM-2026-07-09.md`
