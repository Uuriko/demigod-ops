#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const manifest = JSON.parse(read('./dasha-studio-media.json'));
assert.equal(manifest.schema, 'dasha.studio-media/1');
assert.equal(manifest.policy.projectUse, 'project-authorized');
assert.equal(manifest.policy.redistribution, 'source-rights-retained');
assert.match(manifest.policy.exportNotice, /does not transfer rights/i);

const ids = new Set(), urls = new Set();
for (const [id, url, source] of manifest.assets) {
  assert(id && !ids.has(id), `duplicate or empty media id: ${id}`);
  assert(/^https:\/\/(pbs\.twimg\.com|upload\.wikimedia\.org)\//.test(url), `unapproved media host: ${url}`);
  assert(source, `missing source class: ${id}`);
  assert(!urls.has(url), `duplicate media URL: ${url}`);
  ids.add(id); urls.add(url);
}

const implementations = ['./dasha-meme-studio.html'];
const deployedSource = './.grok/worktrees/potter/dasha/dasha-meme-studio.html';
if (existsSync(new URL(deployedSource, import.meta.url))) implementations.push(deployedSource);
const publicStudio = './dasha-desk/studio/index.html';
if (existsSync(new URL(publicStudio, import.meta.url))) implementations.push(publicStudio);
for (const file of implementations) {
  const remoteImages = [...read(file).matchAll(/https:\/\/(?:pbs\.twimg\.com|upload\.wikimedia\.org)\/[^'"\s]+/g)].map(m => m[0]);
  for (const url of remoteImages) assert(urls.has(url), `${file} uses unregistered media: ${url}`);
}

console.log(`dasha Studio media: PASS (${manifest.assets.length} registered assets)`);
