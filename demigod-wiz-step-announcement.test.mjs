import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('wizard announces the rendered question after step-specific copy is chosen', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  const showStep = source.match(/function showStep\(idx\) \{[\s\S]+?\n  \}\n  nextBtn\.onclick/)?.[0] || '';
  const render = showStep.indexOf("if(kind==='engineer'&&key==='resume')");
  const announce = showStep.indexOf("live.textContent=qEl.textContent||''");
  assert.ok(render >= 0 && announce > render);
  assert.equal((showStep.match(/live\.textContent=qEl\.textContent/g) || []).length, 1);
});
