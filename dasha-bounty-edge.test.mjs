import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
globalThis.WebSocketRequestResponsePair ??= class { constructor(a, b) { this.request = a; this.response = b; } };
import { ensureBountyConnectLinks, BOUNTIES_FEED_URL } from './dasha-lobby-worker.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');

assert.match(worker, /\/oauth\/github\/start/);
assert.match(worker, /handleGithubOAuth/);
assert.match(worker, /bounties\.json/);
assert.equal(BOUNTIES_FEED_URL, 'https://uuriko.github.io/dasha-desk/bounties.json');

const injected = ensureBountyConnectLinks('<html><body><iframe src="https://uuriko.github.io/dasha-desk/bounties/"></iframe></body></html>');
assert.match(injected, /oauth\/github\/start/);
assert.match(injected, /oauth\/x\/start/);
const already = '<body><a href="https://lobby.getdasha.com/oauth/github/start">GitHub</a><a href="https://lobby.getdasha.com/oauth/x/start">X</a></body>';
assert.equal(ensureBountyConnectLinks(already), already);

console.log('dasha-bounty-edge.test.mjs ok');
