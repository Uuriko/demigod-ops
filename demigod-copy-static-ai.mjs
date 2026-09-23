#!/usr/bin/env node
/**
 * Local copy check for a planted source in an explicit data root.
 * Writes DEMIGOD-COPY-STATIC-AI.json under DEMIGOD_ROOT. Does not submit a designer prompt.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  aiSubmit: false,
};

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-COPY-STATIC-AI.json');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, pass: false, error, ...localFlags }));
  process.exit(1);
}

function insideRoot(root, file) {
  const base = path.resolve(root);
  const resolved = path.resolve(file);
  return resolved === base || resolved.startsWith(base + path.sep);
}

function readLocal(root, name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function metrics(html) {
  return {
    speedLeaks: (html.match(/48\s*h(?:ours?)?|within\s*48|3-5[^<]{0,40}48/gi) || []).length,
    nameLeaks: (html.match(/John\s+Doe/gi) || []).length,
    talentLink: (html.match(/TalentLink/gi) || []).length,
    badMeta: /3-5.*48\s*h|48\s*hours.*10% fee/i.test(html) ? 1 : 0,
  };
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--ai')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('static_root_required');
  }
  const html = readLocal(root, 'demigod-copy-static-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const found = metrics(htmlText);
  const pass = found.speedLeaks === 0 && found.nameLeaks === 0 && found.badMeta === 0;
  const report = reportPath();
  if (!insideRoot(root, report)) refuse('static_root_required');
  const body = {
    ok: pass,
    pass,
    at: new Date().toISOString(),
    path: report,
    source: 'disk',
    footMarker,
    before: found,
    after: found,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    pass,
    path: report,
    source: 'disk',
    footMarker,
    before: found,
    after: found,
    ...localFlags,
  }));
  if (!pass) process.exit(1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({
      ok: false,
      pass: false,
      error: 'copy_static_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
