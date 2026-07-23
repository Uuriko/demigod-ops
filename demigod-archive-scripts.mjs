#!/usr/bin/env node
/**
 * Archive legacy demigod bundles (explicit allowlist only).
 *
 * NEVER uses "everything not in KEEP" — that failed open and relocated
 * product tools (truth/ship/events/funnel/dashboard) into archive/.
 *
 *   node demigod-archive-scripts.mjs            # dry plan
 *   DEMIGOD_ARCHIVE_APPLY=1 node demigod-archive-scripts.mjs --apply
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const ARCHIVE = path.join(ROOT, 'archive', 'demigod-automation');
const args = process.argv.slice(2);
const ARCH_FLAGS = new Set(['--apply', '--json', '--help', '-h']);
const unknown = args.find((a) => !ARCH_FLAGS.has(a));
if (unknown) {
  console.error(
    `archive-scripts: unknown argument ${unknown} — try: node demigod-archive-scripts.mjs [--apply] [--json]`,
  );
  process.exit(2);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`demigod-archive-scripts — move ONLY explicit legacy bundles

Usage: node demigod-archive-scripts.mjs [--apply] [--json]
--apply requires DEMIGOD_ARCHIVE_APPLY=1`);
  process.exit(0);
}

const apply = args.includes('--apply') && process.env.DEMIGOD_ARCHIVE_APPLY === '1';
if (args.includes('--apply') && process.env.DEMIGOD_ARCHIVE_APPLY !== '1') {
  console.error('REFUSE: --apply requires DEMIGOD_ARCHIVE_APPLY=1 (prevents accidental root wipe)');
  process.exit(2);
}

/** Explicit legacy bundles only — never scan demigod-* and move the rest. */
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
];

// Hard refuse if someone tries to archive live product tools.
const NEVER = [
  'demigod-foot-core.js',
  'demigod-truth.mjs',
  'demigod-ship.mjs',
  'demigod-events-bot-agent.mjs',
  'demigod-events-app.mjs',
  'demigod-funnel.mjs',
  'demigod-agent-dashboard.mjs',
  'demigod-control.mjs',
  'demigod-archive-scripts.mjs',
];

const moved = [];
const missing = [];
for (const f of LEGACY_BUNDLES) {
  if (NEVER.includes(f)) {
    console.error(`REFUSE: refuse-to-archive product path ${f}`);
    process.exit(2);
  }
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) {
    missing.push(f);
    continue;
  }
  moved.push(f);
}

if (apply) {
  fs.mkdirSync(ARCHIVE, { recursive: true });
  for (const f of moved) {
    const dest = path.join(ARCHIVE, f);
    if (fs.existsSync(dest)) {
      // already archived — leave root copy alone if re-run
      continue;
    }
    fs.renameSync(path.join(ROOT, f), dest);
  }
}

const manifest = {
  at: new Date().toISOString(),
  archiveDir: ARCHIVE,
  apply,
  mode: 'explicit-allowlist-only',
  moved: moved.sort(),
  missing: missing.sort(),
  movedCount: moved.length,
  note: 'Scan-everything-except-KEEP was removed after it relocated product tools.',
};
if (apply) {
  fs.writeFileSync(path.join(ROOT, 'DEMIGOD-ARCHIVE-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
}
const out = { apply, moved: moved.length, missing: missing.length, archive: ARCHIVE, mode: manifest.mode };
if (args.includes('--json')) console.log(JSON.stringify({ ...out, files: moved }, null, 2));
else console.log(JSON.stringify(out));
