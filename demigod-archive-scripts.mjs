#!/usr/bin/env node
/** Archive legacy demigod automation inside an explicit DEMIGOD_ROOT.
 * Writes DEMIGOD-ARCHIVE-MANIFEST.json there. Does not archive /home/potter.
 * The command does not publish.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false };

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

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function namedRoot() {
  const raw = process.env.DEMIGOD_ROOT;
  if (!raw) return null;
  const root = path.resolve(raw);
  if (root === path.resolve('/home/potter')) return null;
  return root;
}

function inside(root, file) {
  const resolved = path.resolve(file);
  return resolved === root || resolved.startsWith(root + path.sep);
}

function readFoot(root) {
  try {
    return fs.readFileSync(path.join(root, 'demigod-foot-core.js'), 'utf8');
  } catch {
    return '';
  }
}

function moveInto(root, archive, name, moved) {
  const src = path.join(root, name);
  const dest = path.join(archive, name);
  if (!fs.existsSync(src) || !inside(root, src) || !inside(root, dest)) return;
  fs.renameSync(src, dest);
  moved.push(name);
}

function archiveRoot(root) {
  const archive = path.join(root, 'archive', 'demigod-automation');
  fs.mkdirSync(archive, { recursive: true });
  const moved = [];
  const kept = [];
  for (const f of fs.readdirSync(root)) {
    if (!f.startsWith('demigod-')) continue;
    if (KEEP.has(f)) { kept.push(f); continue; }
    if (!f.endsWith('.mjs') && !f.endsWith('.js') && !f.endsWith('.html')) continue;
    moveInto(root, archive, f, moved);
  }
  for (const f of LEGACY_BUNDLES) moveInto(root, archive, f, moved);
  const foot = readFoot(root);
  const manifest = {
    ok: true,
    at: new Date().toISOString(),
    path: path.join(root, 'DEMIGOD-ARCHIVE-MANIFEST.json'),
    source: 'disk',
    archiveDir: archive,
    footMarker: (foot.match(/Harbor \S+ keep/) || [''])[0],
    moved: moved.sort(),
    kept: [...KEEP].filter((f) => fs.existsSync(path.join(root, f))).sort(),
    movedCount: moved.length,
    ...localFlags,
  };
  fs.writeFileSync(manifest.path, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({
    ok: true,
    path: manifest.path,
    archiveDir: archive,
    footMarker: manifest.footMarker,
    moved: manifest.moved,
    kept: manifest.kept,
    source: 'disk',
    ...localFlags,
  }));
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, error, ...localFlags }));
  process.exit(1);
}

function main() {
  if (process.argv.includes('--publish')) refuse('publish_refused');
  const root = namedRoot();
  if (!root) refuse('archive_root_required');
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) refuse('archive_root_required');
  archiveRoot(root);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'archive_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}

export { scriptDir };
