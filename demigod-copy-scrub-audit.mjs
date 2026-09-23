#!/usr/bin/env node
/**
 * Local copy scrub for a planted source in an explicit data root.
 * Writes DEMIGOD-COPY-SCRUB-AUDIT.json under DEMIGOD_ROOT. Does not fetch a live page.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const VOLUME = /startups?\s+receive\s+3-5|3-5\s+highly aligned|highly aligned,\s*pre-vetted|pre-vetted candidates ready to interview|3-5[^<]{0,60}candidates ready|receive 3-5 highly/i;
const LOREM = /lorem ipsum|ipsum dolor sit amet|consectetur adipiscing elit|ut enim ad minim veniam/i;
const GOOD_FIT = /Humans intro fitting matches|Submit brief or profile|Hire — invoice 10% on start date/i;
const HAS_GOOD_INJECT = /Humans intro fitting matches|dg-signal-bar|Live brief signal/i;

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-COPY-SCRUB-AUDIT.json');
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

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--fetch')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('scrub_root_required');
  }
  const html = readLocal(root, 'demigod-copy-scrub-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const leaks = [];
  if (VOLUME.test(htmlText)) leaks.push({ severity: 'medium', issue: 'volume_language' });
  if (LOREM.test(htmlText)) leaks.push({ severity: 'low', issue: 'lorem_placeholder' });
  if (!GOOD_FIT.test(htmlText)) leaks.push({ severity: 'medium', issue: 'fit_language_missing' });
  const pass = leaks.length === 0;
  const report = reportPath();
  if (!insideRoot(root, report)) refuse('scrub_root_required');
  const body = {
    ok: pass,
    pass,
    at: new Date().toISOString(),
    path: report,
    source: 'disk',
    footMarker,
    leaks,
    checks: {
      hasVolumeLeak: VOLUME.test(htmlText),
      hasLorem: LOREM.test(htmlText),
      hasGoodFitSteps: GOOD_FIT.test(htmlText),
      hasInjectedSignalOrSteps: HAS_GOOD_INJECT.test(htmlText),
    },
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    pass,
    path: report,
    source: 'disk',
    footMarker,
    leaks: leaks.length,
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
      error: 'copy_scrub_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
