import assert from 'node:assert/strict';
import { ensureFaucetHeading, FAUCET_H1 } from './dasha-faucet-heading.mjs';

const live = `<!doctype html>
<html lang="en">
<head><title>Fill the jar</title></head>
<body>
<header class="bar"><a class="word" href="https://www.getdasha.com/">$<b>dasha</b></a><a class="buy" href="https://jup.ag/swap">Buy</a></header>
<figure id="dasha-faucet-static"><img src="https://lobby.getdasha.com/simp/photo/faucet.png" alt=""></figure>
<main id="dasha-faucet" data-faucet-api="https://lobby.getdasha.com"></main>
</body>
</html>`;

const out = ensureFaucetHeading(live);
assert.match(out, /<h1>Fill the jar<\/h1>/);
assert.ok(out.indexOf('<main id="dasha-faucet"') < out.indexOf('<h1>Fill the jar</h1>'));
assert.equal(ensureFaucetHeading(out), out);
assert.equal(ensureFaucetHeading('<h1>Already</h1><main></main>'), '<h1>Already</h1><main></main>');
assert.equal(FAUCET_H1, 'Fill the jar');

const gitOwned = '<!doctype html><html lang="en"><body><p>Faucet</p></body></html>';
assert.match(ensureFaucetHeading(gitOwned), /<body><h1>Fill the jar<\/h1>/);

console.log('dasha-faucet-heading: PASS');
