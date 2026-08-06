import assert from 'node:assert/strict';
import fs from 'node:fs';

// Proves shipped brandAssets CSS restores rich phosphor H1 character (not flat system green).
const core = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const baStart = core.indexOf('function brandAssets');
assert.ok(baStart >= 0, 'brandAssets defined');
const baEnd = core.indexOf('\nfunction ', baStart + 10);
const ba = core.slice(baStart, baEnd > baStart ? baEnd : baStart + 60000);

// Must paint brand H1 via cyber wordmark
assert.match(core, /function paintHeroBrandH1\s*\(/);
assert.match(core, /paintCyberWord\(el,\s*['"]Demigod['"]\)/);

// Rich character tokens in injected CSS (shipped path, not reimplemented)
assert.ok(ba.includes('text-transform:uppercase'), 'wordmark uppercase in brandAssets');
assert.ok(/letter-spacing:\.?0?7em|letter-spacing:\.0[6-9]em|letter-spacing:\.1/.test(ba), 'wide cyber tracking');
assert.ok(ba.includes('rgba(166,255,203') || ba.includes('var(--dg-phosphor)'), 'phosphor color');
assert.ok(
  ba.includes('0 0 10px') || ba.includes('0 0 14px') || ba.includes('text-shadow:0 0'),
  'phosphor glow text-shadow',
);
// Must not force flat none-glow only (old over-correction)
const host = ba.match(/\.dg-cyber-host,\.dg-cyber-word\{[^}]+\}/);
assert.ok(host, 'host rule present');
assert.ok(!/letter-spacing:-\.02em/.test(host[0]), 'must not keep over-tight flat tracking on host');
assert.ok(!/text-transform:none!important/.test(host[0]), 'must not force none transform on host');

console.log('demigod hero wordmark character: PASS');
