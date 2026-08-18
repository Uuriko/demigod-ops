#!/usr/bin/env node
/**
 * Drives the shipped OSS on-ramp: CONTRIBUTING.md on disk.
 * Fail if the community contract or website-boundary sentence goes missing.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const text = read('CONTRIBUTING.md');
const readme = read('README.md');
const security = read('SECURITY.md');
const support = read('SUPPORT.md');
const coc = read('CODE_OF_CONDUCT.md');
const bug = read('.github/ISSUE_TEMPLATE/bug.md');
const request = read('.github/ISSUE_TEMPLATE/request.md');
const pr = read('.github/PULL_REQUEST_TEMPLATE.md');

assert.match(text, /\bDemigod\b/, 'on-ramp names Demigod');
assert.match(text, /DIE[\s\S]{0,80}internal/i, 'DIE is named as internal');
assert.match(text, /github\.com\/Uuriko\/demigod-ops\/issues/, 'issue URL');
assert.match(text, /github\.com\/Uuriko\/demigod-ops\/pulls/, 'PR URL');
assert.match(text, /no official Discord, Telegram/i, 'forbids official off-site chat');
assert.match(
  text,
  /public-safe website sources in this repo are part of the open-source tree/i,
  'website sources in-repo are OSS',
);
assert.match(
  text,
  /live trydemigod\.com \/ Webflow \/ CDN publish is not the contribution path/i,
  'live publish is out of the PR path',
);
assert.match(text, /not required to land a PR/i, 'PRs do not require a live publish');
assert.match(text, /Apache License 2\.0/, 'points at the license grant');

assert.match(readme, /\bDemigod\b/, 'README names Demigod');
assert.match(readme, /DIE[\s\S]{0,80}internal/i, 'README names DIE as internal');
assert.match(readme, /no official Discord, Telegram/i, 'README forbids off-site chat');
assert.match(readme, /public-safe website sources/i, 'README website-in-OSS');
assert.match(readme, /not the contribution path/i, 'README live publish out of PR path');

assert.match(security, /security\/advisories\/new/, 'SECURITY private advisory');
assert.match(security, /Do \*\*not\*\* open a public issue/i, 'SECURITY no public vuln issues');
assert.match(security, /hiring PII/i, 'SECURITY forbids PII dumps');

assert.match(support, /github\.com\/Uuriko\/demigod-ops\/issues/, 'SUPPORT issue URL');
assert.match(support, /no official Discord, Telegram/i, 'SUPPORT forbids off-site chat');

assert.match(coc, /Contributor Covenant/, 'CoC is Contributor Covenant');
assert.match(coc, /security\/advisories\/new/, 'CoC private enforcement contact');

assert.match(bug, /^name:\s*Bug report/m, 'bug template name');
assert.match(bug, /^about:\s+/m, 'bug template about');
assert.match(request, /^name:\s*Change request/m, 'request template name');
assert.match(request, /^about:\s+/m, 'request template about');
assert.match(pr, /not require a live Webflow/i, 'PR template no live publish');

console.log('contributing-oss: PASS');
