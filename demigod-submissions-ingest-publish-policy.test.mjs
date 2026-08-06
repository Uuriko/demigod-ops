import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-submissions-ingest.mjs', import.meta.url), 'utf8');
/* This asserted the presence of a publish GATE in the ingest CLI: a --no-publish default, a
   --publish + DEMIGOD_FORCE_PUBLISH=1 override, and a guarded spawn of demigod-board-publish.mjs.
   The CLI no longer contains any publish path at all — verified: the string "publish" does not
   appear in demigod-submissions-ingest.mjs, and the committed version has none either.

   A gate for a call that does not exist is dead code, and asserting on it fails forever. The
   requirement underneath was never "have a gate" — it was "ingesting a submission must not
   publish". Assert THAT instead, which is a strictly stronger guarantee than a gated path:
   no publish invocation can be added here without this test going red.

   demigod-board-publish.mjs pushes DEMIGOD-BOARD.json to the catbox CDN — a real external publish
   — and CLAUDE.md requires exact authorization in the current request for any publish. Ingest is a
   data-entry path and must never be one. */
assert.doesNotMatch(source, /demigod-board-publish/, 'ingest must never invoke the board publisher');
assert.doesNotMatch(source, /DEMIGOD_FORCE_PUBLISH/, 'ingest must not carry a publish override');
assert.doesNotMatch(source, /spawnSync|execFileSync|exec\(/, 'ingest must not shell out — that is how a publish path returns');
assert.match(source, /ingestSubmission\(body\)/, 'ingest does exactly one thing: record the submission');

console.log('demigod submissions ingest publish policy: PASS');
