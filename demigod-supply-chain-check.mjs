#!/usr/bin/env node
/**
 * demigod-supply-chain-check — is any known-compromised npm package actually installed here?
 *
 * WHY
 * 2026 was the year the npm registry stopped being background infrastructure. Axios (100M weekly
 * downloads) shipped a remote-access trojan in 1.14.1 and 0.30.4 after a maintainer account was
 * hijacked; node-ipc published three malicious versions in one day; the Shai-Hulud worm moved
 * through Keyv and its dependents; 32 packages under @redhat-cloud-services were compromised in a
 * single push. npm v12's answer is to block install scripts by default, which helps the next
 * install and does nothing about the tree already on disk.
 *
 * The question this answers is deliberately narrow and checkable: **not** "are we secure", but
 * "is a specific version that is known to have shipped malware present in this tree right now".
 *
 * WHY IT WALKS DISK INSTEAD OF READING THE LOCKFILE
 * A lockfile describes what an install should produce. The compromise happened between the registry
 * and this disk, and stale `node_modules` outlive the lockfile that made them — this tree has 24
 * separate axios installs across worktrees, caches and vendored `src/` checkouts, most of which no
 * root lockfile mentions. Only the bytes on disk answer the question that matters.
 *
 *   node demigod-supply-chain-check.mjs
 *   node demigod-supply-chain-check.mjs --json
 *   node demigod-supply-chain-check.mjs --selftest
 *
 * Schema: demigod.supply-chain/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/**
 * Known-bad (package, version) pairs, each with the incident it came from.
 *
 * Only exact versions confirmed to have shipped malicious code. A range would be a guess, and a
 * guess that fires on a clean tree teaches everyone to ignore this check.
 */
export const COMPROMISED = [
  { name: 'axios', versions: ['1.14.1', '0.30.4'], incident: 'maintainer account hijack, RAT payload, 2026-03' },
  { name: 'node-ipc', versions: ['9.2.2', '9.2.3', '12.0.4'], incident: 'three malicious versions published, 2026-05-14' },
  // Shai-Hulud, 2026-08-04: published through Keyv's own GitHub Actions release process, so the
  // packages are signed and provenanced exactly like a legitimate release. Version is the only tell.
  { name: 'keyv', versions: ['6.0.0'], incident: 'Shai-Hulud worm, 2026-08-04' },
  { name: 'cacheable', versions: ['2.5.1'], incident: 'Shai-Hulud worm, 2026-08-04' },
  { name: 'flat-cache', versions: ['6.1.24'], incident: 'Shai-Hulud worm, 2026-08-04' },
  { name: 'file-entry-cache', versions: ['11.1.6'], incident: 'Shai-Hulud worm, 2026-08-04' },
  { name: 'cacheable-request', versions: ['13.0.20'], incident: 'Shai-Hulud worm, 2026-08-04' },
  { name: 'cache-manager', versions: ['7.2.10'], incident: 'Shai-Hulud worm, 2026-08-04' },
];

/**
 * The worm's on-disk signature. Worth more than the version table: it catches the payload whoever
 * shipped it and whatever the version string claims, including packages nobody has named yet.
 *
 * Shai-Hulud adds two files to each package it infects and wires them in through a preinstall hook,
 * so that merely installing runs it. It also plants Claude Code and VS Code hooks to persist beyond
 * the package — which is why this scans the agent config on this machine too.
 */
export const PAYLOAD_FILES = ['setup.mjs', 'Math_Symbol.js'];

/** PURE. Does an installed (name, version) match a known incident? */
export function verdictFor(name, version, table = COMPROMISED) {
  const entry = table.find((row) => row.name === name);
  if (!entry) return null;
  if (!entry.versions.length) return { name, version, incident: entry.incident, level: 'review' };
  return entry.versions.includes(version) ? { name, version, incident: entry.incident, level: 'compromised' } : null;
}

/** Every installed copy of the packages we care about, found on disk rather than in a lockfile. */
export function installedCopies({ root = ROOT, names = COMPROMISED.map((r) => r.name), maxDepth = 12 } = {}) {
  const found = [];
  const walk = (dir, depth) => {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (names.includes(entry.name) && path.basename(dir) === 'node_modules') {
        try {
          const version = JSON.parse(fs.readFileSync(path.join(full, 'package.json'), 'utf8')).version;
          if (version) found.push({ name: entry.name, version, path: full });
        } catch { /* a directory named like a package but without one is not an install */ }
      }
      if (entry.name === '.git') continue;
      walk(full, depth + 1);
    }
  };
  walk(root, 0);
  return found;
}

/**
 * PURE. Does a package directory carry the worm's payload?
 *
 * Both marker files AND a preinstall hook, not any one of them: `setup.mjs` alone is an ordinary
 * file name, and plenty of honest packages have a preinstall. The combination is the signature.
 */
export function payloadVerdict({ files = [], scripts = {} } = {}) {
  const markers = PAYLOAD_FILES.filter((f) => files.includes(f));
  const preinstall = typeof scripts.preinstall === 'string' ? scripts.preinstall : '';
  const runsMarker = PAYLOAD_FILES.some((f) => preinstall.includes(f));
  if (markers.length === PAYLOAD_FILES.length && runsMarker) return 'payload';
  if (markers.length && runsMarker) return 'suspect';
  return null;
}

function scanPayload(dir) {
  try {
    const files = fs.readdirSync(dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return payloadVerdict({ files, scripts: pkg.scripts || {} });
  } catch { return null; }
}

/**
 * PURE. A version one patch below a compromised release is not a hit — it is a warning that an
 * `npm update` reaches the malicious version. Pinning is the fix; knowing is the prerequisite.
 */
export function nearMiss(name, version, table = COMPROMISED) {
  const entry = table.find((row) => row.name === name);
  if (!entry) return null;
  const parts = String(version).split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) return null;
  return entry.versions.some((bad) => {
    const b = bad.split('.').map(Number);
    return b[0] === parts[0] && b[1] === parts[1] && b[2] === parts[2] + 1;
  }) ? { name, version, nextIsCompromised: true } : null;
}

/**
 * The worm's persistence trick: hooks written into agent config so it survives a clean reinstall of
 * every package. Reported as paths to inspect, never auto-edited — an agent silently rewriting the
 * config that governs agents is its own bad idea.
 */
export function agentConfigMarkers({ home = process.env.HOME || ROOT } = {}) {
  const targets = [
    path.join(home, '.claude', 'settings.json'),
    path.join(home, '.claude', 'settings.local.json'),
    path.join(home, '.vscode', 'settings.json'),
    path.join(home, '.config', 'Code', 'User', 'settings.json'),
  ];
  const found = [];
  for (const file of targets) {
    let raw;
    try { raw = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const marker of PAYLOAD_FILES) {
      if (raw.includes(marker)) found.push({ file, marker });
    }
  }
  return found;
}

export function check(options = {}) {
  const copies = installedCopies(options);
  const seen = new Set();
  const hits = [];
  for (const copy of copies) {
    const verdict = verdictFor(copy.name, copy.version);
    const payload = scanPayload(copy.path);
    if (payload) hits.push({ name: copy.name, version: copy.version, level: payload, incident: 'Shai-Hulud on-disk payload', path: copy.path });
    else if (verdict) {
      const key = `${verdict.name}@${verdict.version}`;
      if (verdict.level === 'review' && seen.has(key)) continue;
      seen.add(key);
      hits.push({ ...verdict, path: copy.path });
    }
  }
  const near = [];
  const nearSeen = new Set();
  for (const copy of copies) {
    const miss = nearMiss(copy.name, copy.version);
    const key = miss && `${miss.name}@${miss.version}`;
    if (miss && !nearSeen.has(key)) { nearSeen.add(key); near.push(miss); }
  }
  return {
    schema: 'demigod.supply-chain/1',
    scanned: copies.length,
    packages: [...new Set(copies.map((c) => c.name))],
    versions: [...new Set(copies.map((c) => `${c.name}@${c.version}`))].sort(),
    compromised: hits.filter((h) => h.level === 'compromised' || h.level === 'payload'),
    review: hits.filter((h) => h.level === 'review' || h.level === 'suspect'),
    nearMisses: near,
    agentConfig: agentConfigMarkers(),
  };
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`supply-chain selftest: ${msg}`); };

  // The check must be able to fire, or a green run means nothing.
  assert(verdictFor('axios', '1.14.1').level === 'compromised', 'the known-bad axios must be caught');
  assert(verdictFor('axios', '0.30.4').level === 'compromised', 'both bad axios versions, not just the newer one');
  assert(verdictFor('axios', '1.18.1') === null, 'a clean axios is not an alarm');
  assert(verdictFor('node-ipc', '9.2.2').level === 'compromised', 'node-ipc is covered');
  assert(verdictFor('express', '4.0.0') === null, 'an unlisted package is not judged');

  assert(verdictFor('keyv', '6.0.0').level === 'compromised', 'the Shai-Hulud keyv release is caught');
  assert(verdictFor('keyv', '5.6.0') === null, 'the version this tree actually has is clean');
  assert(verdictFor('flat-cache', '6.1.24').level === 'compromised', 'the worm hit more than keyv');

  // The payload signature must need BOTH markers and a hook that runs one.
  assert(payloadVerdict({ files: ['setup.mjs', 'Math_Symbol.js'], scripts: { preinstall: 'node setup.mjs' } }) === 'payload', 'the full signature is caught');
  assert(payloadVerdict({ files: ['setup.mjs'], scripts: { preinstall: 'node setup.mjs' } }) === 'suspect', 'a partial match is suspect, not conviction');
  assert(payloadVerdict({ files: ['setup.mjs', 'Math_Symbol.js'], scripts: {} }) === null, 'marker files with no hook are just files');
  assert(payloadVerdict({ files: ['index.js'], scripts: { preinstall: 'node-gyp rebuild' } }) === null, 'an honest preinstall is not an alarm');
  assert(payloadVerdict({}) === null, 'an empty package is not an alarm');

  // Version comparison is exact — "1.14.10" must not match "1.14.1".
  assert(verdictFor('axios', '1.14.10') === null, 'version matching is exact, not prefix');

  // And the scan must actually find things on this disk, or it is checking nothing.
  const found = installedCopies({ maxDepth: 4 });
  assert(found.length > 0, 'the disk walk found no installs at all — it is not scanning');
  assert(found.every((f) => f.version && f.path.includes('node_modules')), 'every hit is a real install');

  assert(nearMiss('cacheable', '2.5.0').nextIsCompromised, 'one patch below a bad release is a near miss');
  assert(nearMiss('cacheable', '2.5.1') === null, 'the bad release itself is a hit, not a near miss');
  assert(nearMiss('cacheable', '2.4.0') === null, 'two behind is not a near miss');
  assert(nearMiss('axios', '1.18.1') === null, 'an unrelated version is not a near miss');
  assert(nearMiss('cacheable', 'not.a.version') === null, 'junk versions do not crash the check');
  assert(Array.isArray(agentConfigMarkers({ home: '/nonexistent' })), 'a missing config is empty, not an error');

  console.log(JSON.stringify({ ok: true, selftest: 'supply-chain', sampled: found.length }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); }
  else {
    const report = check();
    if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`supply-chain · ${report.scanned} installs of ${report.packages.length} watched packages`);
      for (const v of report.versions) console.log(`    ${v}`);
      for (const hit of report.compromised) console.log(`  COMPROMISED ${hit.name}@${hit.version} — ${hit.incident}\n    ${hit.path}`);
      for (const hit of report.review) console.log(`  review ${hit.name}@${hit.version} — ${hit.incident}`);
      for (const miss of report.nearMisses) console.log(`  near miss ${miss.name}@${miss.version} — the NEXT patch release is the compromised one; pin it`);
      for (const marker of report.agentConfig) console.log(`  AGENT CONFIG ${marker.file} mentions ${marker.marker}`);
      if (!report.compromised.length) console.log('  no known-compromised version present');
    }
    process.exit(report.compromised.length ? 1 : 0);
  }
}
