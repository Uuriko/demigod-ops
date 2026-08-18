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
const text = readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8');

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

console.log('contributing-oss: PASS');
