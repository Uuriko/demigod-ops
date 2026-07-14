#!/usr/bin/env node
/** Print the only allowed ship sequence (freeze-aware). */
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
const f = freezeStatus();
console.log(`# Demigod ship path (single sequence)
freeze: ${f.frozen ? 'ON — ' + (f.why || '') : 'OFF'}

1. bin/dg truth
2. bin/dg lock claim --owner "$USER" --why "ship foot"
   export DG_LOCK_TOKEN=… DG_LOCK_OWNER=$USER
3. npm run demigod:verify:source && node demigod-foot-smoke.mjs
4. bin/dg-review --bug --gates --format summary
5. ONLY if freeze OFF:
   node demigod-foot-cdn-publish.mjs
   node demigod-cm6-paste-publish.mjs --footer-only   # or full CM6
   # Human: Webflow Publish if needed
6. bin/dg truth --require-match
7. bin/dg lock release --token "$DG_LOCK_TOKEN"
8. node demigod-publish-freeze.mjs on --why "post-ship"

Never: parallel foot writers · claim live==disk without body hash · publish while freeze ON
`);
if (f.frozen) process.exit(0);
