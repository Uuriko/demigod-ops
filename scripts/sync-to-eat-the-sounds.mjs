#!/usr/bin/env node
/** Mirror canonical /home/potter game files into eat-the-sounds/ for GitHub push. */
import fs from 'fs';
import path from 'path';

const ROOT = '/home/potter';
const DEST = path.join(ROOT, 'eat-the-sounds');

const FILES = [
  'ninjawhee-eat-the-sounds.html',
  'overworld.js',
  'pause-journal.js',
  'pixel-gfx.js',
  'game-progress.js',
  'vinyl-audio.js',
  'vinyl-echo-bridge.js',
  'store-ambient.js',
  'store-items.js',
  'store-events.js',
  'audio-bus.js',
  'heavy-dialogue-art.js',
  'heavy-runtime.js',
  'rhythm-loop.js',
  'easter-eggs.js',
  'game-root.mjs',
  'playtest-browser.mjs',
  'new-player-playtest.mjs',
  'audio-audit-playtest.mjs',
  'thorough-playtest.mjs',
  'cdp-config.mjs',
  'AGENTS.md',
  'CURSOR-CLOUD-AGENT.md',
  '.cursorignore',
  'manifest.webmanifest',
];

const RULES = [
  'eat-the-sounds.mdc',
  'audio.mdc',
  'playtest.mdc',
];

let copied = 0;
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(DEST, f));
  copied++;
}

fs.mkdirSync(path.join(DEST, '.cursor', 'rules'), { recursive: true });
fs.mkdirSync(path.join(DEST, '.cursor', 'hooks'), { recursive: true });
fs.copyFileSync(path.join(ROOT, '.cursor', 'mcp.json'), path.join(DEST, '.cursor', 'mcp.json'));
if (fs.existsSync(path.join(ROOT, '.cursor', 'hooks.json'))) {
  fs.copyFileSync(path.join(ROOT, '.cursor', 'hooks.json'), path.join(DEST, '.cursor', 'hooks.json'));
}
if (fs.existsSync(path.join(ROOT, '.cursor', 'hooks', 'guard-automation.sh'))) {
  fs.copyFileSync(
    path.join(ROOT, '.cursor', 'hooks', 'guard-automation.sh'),
    path.join(DEST, '.cursor', 'hooks', 'guard-automation.sh'),
  );
}
for (const r of RULES) {
  const src = path.join(ROOT, '.cursor', 'rules', r);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DEST, '.cursor', 'rules', r));
}

const assetsSrc = path.join(ROOT, 'assets');
const assetsDest = path.join(DEST, 'assets');
if (fs.existsSync(assetsSrc)) {
  fs.mkdirSync(assetsDest, { recursive: true });
  for (const name of fs.readdirSync(assetsSrc)) {
    if (name.endsWith('.png') || name.endsWith('.webp') || name.endsWith('.jpg')) {
      fs.copyFileSync(path.join(assetsSrc, name), path.join(assetsDest, name));
      copied++;
    }
  }
}

console.log(JSON.stringify({ copied, dest: DEST, at: new Date().toISOString() }, null, 2));