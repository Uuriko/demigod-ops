import assert from 'node:assert/strict';
import { stripLeakedBriefPrefill } from './demigod-html-prefill.mjs';

const leaked = `<!doctype html><html><body>
<a class="btn btn-primary" id="brief" href="/?wiz=startup&amp;company=yc%3Aarray-labs&amp;name=Array+Labs&amp;role=Technical+Sourcer">Start a brief</a>
<a class="dir" href="/c/yc:array-labs">one packet</a>
<a class="btn btn-primary" href="/?wiz=startup&amp;company=yc%3Aarray-labs&amp;name=Array+Labs&amp;role=Technical+Sourcer">Start a brief</a>
<a href="/?wiz=startup&amp;company=yc%3Aarray-labs&amp;name=Array+Labs&amp;role=Technical+Sourcer">Hiring here? Start a brief</a>
</body></html>`;

const out = stripLeakedBriefPrefill(leaked);
const generic = [...out.matchAll(/<a\b[^>]*>\s*Start a brief\s*<\/a>/gi)].map((m) => m[0]);
assert.equal(generic.length, 2);
for (const tag of generic) {
  assert.match(tag, /href="\/\?wiz=startup"/);
  assert.doesNotMatch(tag, /company=/);
  assert.doesNotMatch(tag, /name=/);
  assert.doesNotMatch(tag, /role=/);
}
assert.match(out, /href="\/c\/yc:array-labs">one packet</);
assert.match(
  out,
  /href="\/\?wiz=startup&amp;company=yc%3Aarray-labs&amp;name=Array\+Labs&amp;role=Technical\+Sourcer">Hiring here\? Start a brief</,
);
assert.equal(stripLeakedBriefPrefill(out), out);
assert.equal(stripLeakedBriefPrefill(''), '');

console.log('demigod-html-prefill: PASS');
