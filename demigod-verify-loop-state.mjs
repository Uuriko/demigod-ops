#!/usr/bin/env node
/** Trust regression: ## loop-state claims in the named root must match that root's foot.
 * Writes DEMIGOD-LOOP-STATE.json in DEMIGOD_ROOT. The command does not publish.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-LOOP-STATE.json');
}
function readText(name) {
  try {
    return fs.readFileSync(path.join(dataRoot(), name), 'utf8');
  } catch {
    return '';
  }
}

function checkpointKnown(root, sha) {
  if (!sha || sha === 'none' || sha.startsWith('(')) return true;
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) return false;
  if (!fs.existsSync(path.join(root, '.git'))) return false;
  try {
    execFileSync('git', ['cat-file', '-e', sha], { cwd: root, stdio: 'ignore', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function buildReport() {
  const root = dataRoot();
  const kg = readText('demigod-keep-going.md');
  const foot = readText('demigod-foot-core.js');
  const block = (kg.split(/^## loop-state.*$/m)[1] || '').split(/^\*\*/m)[0];
  const get = (k) => (block.match(new RegExp(`- ${k}:\\s*(\\S+)`)) || [])[1] || '';
  const claimed = get('foot_ver_disk').replace(/^v/, '');
  const actual = (foot.match(/__dgFootVer='(\d+)'/) || [])[1] || '';
  const errs = [];
  if (!block.trim()) errs.push('no ## loop-state block found');
  if (claimed && claimed !== actual) errs.push(`foot_ver_disk claims v${claimed}, disk is v${actual}`);
  if (!/- dm_freeze: OFF/.test(block)) errs.push('dm_freeze missing or not ON/OFF');
  const sha = get('last_checkpoint');
  if (sha && sha !== 'none' && !sha.startsWith('(') && !checkpointKnown(root, sha)) {
    errs.push(`last_checkpoint ${sha} not in git`);
  }
  return {
    ok: errs.length === 0,
    at: new Date().toISOString(),
    path: reportPath(),
    source: 'disk',
    pass: errs.length === 0,
    footMarker: (foot.match(/Harbor \S+ keep/) || [''])[0],
    footVersion: actual || null,
    dmFreeze: get('dm_freeze') || null,
    errs,
    ...localFlags,
  };
}

function main() {
  const report = buildReport();
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  process.exit(report.pass ? 0 : 1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  if (process.argv.includes('--publish')) {
    console.error(JSON.stringify({ ok: false, error: 'publish_refused', ...localFlags }));
    process.exit(1);
  }
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'loop_state_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
