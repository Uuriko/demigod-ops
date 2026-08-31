import assert from 'node:assert/strict';
import { PRIVACY_CANONICAL, PRIVACY_HTML } from './dasha-privacy-page.mjs';

assert.equal(PRIVACY_CANONICAL, 'https://www.getdasha.com/privacy');
assert.match(PRIVACY_HTML, /<h1>Privacy<\/h1>/);
assert.match(PRIVACY_HTML, /Updated 28 August 2026/);
assert.match(PRIVACY_HTML, /does not store the X access token/);
assert.match(PRIVACY_HTML, /roughly 30 minutes and 40 messages/);
assert.match(PRIVACY_HTML, /<h2>Cookies<\/h2>/);
assert.match(PRIVACY_HTML, /__Host-dasha_x/);
assert.match(PRIVACY_HTML, /__Host-dasha_x_oauth/);
assert.match(PRIVACY_HTML, /_cfuvid/);
assert.match(PRIVACY_HTML, /HttpOnly, Secure, SameSite=Lax, up to 30 days/);
assert.match(PRIVACY_HTML, /SameSite=None, for the browser session/);
assert.match(PRIVACY_HTML, /Dasha application code does not read that cookie/);
assert.match(PRIVACY_HTML, /does not use cookies for ads or analytics/);
assert.doesNotMatch(PRIVACY_HTML, /does not use cookies\./);
assert.match(PRIVACY_HTML, /rel="canonical" href="https:\/\/www\.getdasha\.com\/privacy"/);
assert.match(PRIVACY_HTML, /id="dasha-page"/);

console.log('dasha-privacy-page: PASS');
