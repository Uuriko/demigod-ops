#!/usr/bin/env node
/** Archive legacy demigod automation + dead JS/HTML bundles. */
import fs from 'fs';
import path from 'path';

const ROOT = '/home/potter';
const ARCHIVE = path.join(ROOT, 'archive', 'demigod-automation');
const KEEP = new Set([
  'demigod-verify-all.mjs',
  'demigod-verify-live.mjs',
  'demigod-verify-source.mjs',
  'demigod-live-lib.mjs',
  'demigod-live-lib.test.mjs',
  'demigod-playtest-review.mjs',
  'demigod-foot-cdn-publish.mjs',
  'demigod-fix-custom-code.mjs',
  'demigod-full-audit.mjs',
  'demigod-copy-inventory.mjs',
  'demigod-heavy-copy-inventory.mjs',
  'demigod-heavy-copy-prompt.mjs',
  'demigod-heavy-full-audit.mjs',
  'demigod-heavy-website-prompt.mjs',
  'demigod-heavy-cleanup-pass.mjs',
  'demigod-archive-scripts.mjs',
  'demigod-turn-lib.mjs',
  'demigod-capture-live-audit.mjs',
  'demigod-form-submit-test.mjs',
  'demigod-webflow-audit.mjs',
  'demigod-foot-core.js',
  'demigod-head-minimal.html',
  'demigod-footer-lite.html',
  'demigod-footer-loader.html',
  'demigod-foot-cdn-resolve.mjs',
  'demigod-github-restore-foot.mjs',
  'collab-lib.mjs',
  'cdp-config.mjs',
]);

const LEGACY_BUNDLES = [
  'demigod-head-full.html',
  'demigod-core.js',
  'demigod-forms-head.js',
  'demigod-live-cta-fix.js',
  'demigod-footer-polish.html',
  'demigod-features.js',
  'demigod-pricing-css.html',
  'demigod-foot-v19.js',
  'demigod-long-faq-accordion-1.0.0.js',
  'demigod-core-min.js',
  'demigod-footer-loader.html',
];

fs.mkdirSync(ARCHIVE, { recursive: true });
const moved = [];
const kept = [];

for (const f of fs.readdirSync(ROOT)) {
  if (!f.startsWith('demigod-')) continue;
  if (KEEP.has(f)) { kept.push(f); continue; }
  if (!f.endsWith('.mjs') && !f.endsWith('.js') && !f.endsWith('.html')) continue;
  const src = path.join(ROOT, f);
  const dest = path.join(ARCHIVE, f);
  fs.renameSync(src, dest);
  moved.push(f);
}

for (const f of LEGACY_BUNDLES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(ARCHIVE, f);
  fs.renameSync(src, dest);
  moved.push(f);
}

const manifest = {
  at: new Date().toISOString(),
  archiveDir: ARCHIVE,
  moved: moved.sort(),
  kept: [...KEEP].filter((f) => fs.existsSync(path.join(ROOT, f))).sort(),
  movedCount: moved.length,
};
fs.writeFileSync(path.join(ROOT, 'DEMIGOD-ARCHIVE-MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ moved: moved.length, kept: manifest.kept.length, archive: ARCHIVE }));