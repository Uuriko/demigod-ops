import assert from 'node:assert/strict';
import { dashaBuildPageHtml, dashaBuildPageResponse } from './dasha-build-page.mjs';

const html = dashaBuildPageHtml();
assert.match(html, /<h1>Ship open source\. Build a record\.<\/h1>/);
assert.match(html, /\/bounties\.json/);
assert.match(html, /github\.com\/Uuriko\/dasha-desk/);
assert.match(html, /github\.com\/SlopDotCash\/slopdotcash/);
assert.match(html, /MIT-licensed/);
assert.match(html, /does not imply affiliation/i);
assert.doesNotMatch(html, /plugin\.jup\.ag/);
assert.doesNotMatch(html, /we hold funds/i);

const res = dashaBuildPageResponse(new Request('https://www.getdasha.com/build'));
assert.equal(res.status, 200);
assert.equal(res.headers.get('X-Dasha-Edge'), 'build');
assert.match(res.headers.get('Content-Security-Policy') || '', /frame-ancestors 'none'/);
assert.match(await res.text(), /Dasha Build/);

const head = dashaBuildPageResponse(new Request('https://www.getdasha.com/build', { method: 'HEAD' }));
assert.equal(head.status, 200);
assert.equal(await head.text(), '');

console.log('dasha-build-page: PASS');
