import assert from 'node:assert/strict';
import fs from 'node:fs';

const { scripts } = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

assert.doesNotMatch(scripts['demigod:ship:loop'], /demigod-board-reset\.mjs/);
assert.match(scripts['demigod:ship:loop'], /demigod-submissions-e2e\.mjs/);
assert.match(scripts['demigod:ship:loop'], /demigod-agent-cockpit\.mjs --json/);
assert.equal(scripts['demigod:board:reset'], 'node demigod-board-reset.mjs');

console.log('demigod ship loop safety: PASS');
