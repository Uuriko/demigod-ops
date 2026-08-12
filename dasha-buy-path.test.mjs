#!/usr/bin/env node
/**
 * Every buy control on every surface must point at OUR token.
 *
 * This is the one defect on the site that costs a stranger money rather than attention, and it was
 * the least covered. Before this file there were six `jup.ag/swap` URLs across the surface sources
 * and exactly one of them was checked exactly — `dasha-ship.mjs` pins the landing page's path. The
 * others were covered only by presence checks of the shape
 *
 *     assert(html.includes('jup.ag/swap'))   // a Jupiter link exists
 *     assert(html.includes(MINT))            // the mint appears somewhere on the page
 *
 * Both stay true when the swap URL points at a different token, because the mint also appears in the
 * contract-address display a few lines away. So a swapped `buy=` parameter on the Desk or on
 * /how-to-buy would have shipped green.
 *
 * Presence is not the property worth asserting here. The property is: every buy URL, everywhere,
 * carries exactly our mint — and no surface shows a pump-suffixed address that is not ours.
 *
 *   node dasha-buy-path.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const WSOL = 'So11111111111111111111111111111111111111112';

/* Sources a visitor can reach a buy control from. Missing files are reported, not skipped — a
   surface silently dropping off this list is how coverage rots. */
const SURFACES = [
  'dasha-landing.html',
  'dasha-desk/src/body.html',
  'dasha-how-to-buy.html',
  'dasha-lobby-page.html',
  'dasha-meme-studio.html',
];

let swapCount = 0;
let constructed = 0;
let solscanCount = 0;
const missing = [];

for (const file of SURFACES) {
  if (!existsSync(file)) { missing.push(file); continue; }
  /* `&amp;` in HTML attributes, and percent-escapes in X-intent URLs, both hide the real value. */
  const text = readFileSync(file, 'utf8').replace(/&amp;/g, '&');

  for (const m of text.matchAll(/https:\/\/jup\.ag\/swap\?[^"'\s<>)]+/g)) {
    const url = m[0];
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    /* /how-to-buy builds one of its buy URLs at runtime — `…&buy='+CA` — so a static scan sees an
       empty `buy` and would report the page as pointing at no token. Detect the concatenation
       boundary instead of guessing: the URL must be immediately followed by a closing quote and a
       `+`, and the file must declare the mint as a literal for that concatenation to reach. */
    const after = text.slice(m.index + url.length, m.index + url.length + 2);
    if (params.get('buy') === '' && /^['"]\s*\+/.test(after)) {
      assert.ok(text.includes(`'${MINT}'`) || text.includes(`"${MINT}"`),
        `${file}: builds a Jupiter URL by concatenation but declares no literal $dasha mint to append`);
      constructed++;
      continue;
    }
    swapCount++;
    assert.equal(params.get('buy'), MINT, `${file}: Jupiter buy target is not $dasha — ${url}`);
    assert.equal(params.get('sell'), WSOL, `${file}: Jupiter sell side is not SOL — ${url}`);
    assert.deepEqual([...params.keys()].sort(), ['buy', 'sell'],
      `${file}: Jupiter URL carries unexpected parameters — ${url}`);
  }

  for (const url of text.match(/https:\/\/solscan\.io\/token\/[1-9A-HJ-NP-Za-km-z]+/g) || []) {
    solscanCount++;
    assert.equal(url.split('/token/')[1], MINT, `${file}: Solscan link points at another token — ${url}`);
  }

  /* Any pump-suffixed address rendered by our own sources must be ours. Percent-escapes are
     neutralised first: the Desk shares the mint through an X intent where `%0A` precedes it, and a
     raw scan would match one character early and flag the correct mint as divergent. */
  const scan = text.replace(/%[0-9A-Fa-f]{2}/g, ' ');
  for (const found of scan.match(/(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}pump/g) || []) {
    assert.equal(found, MINT, `${file}: shows a pump address that is not ours — ${found}`);
  }
}

assert.deepEqual(missing, [], `buy surfaces missing from disk: ${missing.join(', ')}`);
/* If the counts ever hit zero the loops above are vacuous and this file proves nothing — which is
   the exact failure mode it was written to remove from the other gates. */
assert.ok(swapCount >= 4, `only ${swapCount} Jupiter URLs found across ${SURFACES.length} surfaces — the scan is not seeing them`);
assert.ok(solscanCount >= 1, 'no Solscan links found — the scan is not seeing them');

console.log(`dasha buy path: PASS (${swapCount} literal Jupiter URLs + ${constructed} built at runtime, ${solscanCount} Solscan links, exact mint on every one)`);
