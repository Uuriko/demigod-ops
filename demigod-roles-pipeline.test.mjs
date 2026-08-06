import assert from 'node:assert/strict';
import { extractAtsBoards } from './demigod-roles-ats-links.mjs';
import { collectDiscoveredBoards, applyBoardsToCompanies } from './demigod-roles-ats-apply.mjs';
import { publicRolesFromFeed, embedScript, writeFooterPublicRoles } from './demigod-public-roles.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// extract
const boards = extractAtsBoards('Hiring SF https://jobs.lever.co/Acme/xyz');
assert.equal(boards[0].provider, 'Lever');

// apply
const { stats, companies } = applyBoardsToCompanies(
  [{ name: 'Acme', website: 'https://acme.com', jobsUrl: null }],
  boards,
);
assert.equal(stats.applied, 1);
assert.match(companies[0].jobsUrl, /lever\.co\/acme/);

// public roles fail-closed on bad urls
const pub = publicRolesFromFeed({
  roles: [
    { company: 'A', title: 'E', url: 'https://jobs.ashbyhq.com/a/1', firstObservedAt: '2026-08-05' },
    { company: 'B', title: 'E', url: 'http://insecure.example/1', firstObservedAt: '2026-08-05' },
  ],
});
assert.equal(pub.roles.length, 1);
assert.ok(embedScript(pub).startsWith('/* demigod-public-roles-embed'));
assert.equal(typeof writeFooterPublicRoles, 'function');

// foot inject present in shipped foot
const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
assert.match(foot, /function injectObservedRoles\s*\(/);
assert.match(foot, /demigod\.public-roles\/1/);
assert.match(foot, /#dg-observed-roles/);

// Diagnostic CLI calls must never regenerate website assets.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-public-roles-cli-'));
const cli = fileURLToPath(new URL('./demigod-public-roles.mjs', import.meta.url));
const help = spawnSync(process.execPath, [cli, '--help'], { env: { ...process.env, DEMIGOD_ROOT: tmp }, encoding: 'utf8' });
assert.equal(help.status, 0);
assert.match(help.stdout, /^Usage:/);
assert.deepEqual(fs.readdirSync(tmp), []);
const unknown = spawnSync(process.execPath, [cli, '--wat'], { env: { ...process.env, DEMIGOD_ROOT: tmp }, encoding: 'utf8' });
assert.equal(unknown.status, 2);
assert.deepEqual(fs.readdirSync(tmp), []);
fs.rmSync(tmp, { recursive: true });

console.log('demigod-roles-pipeline.test: PASS');
