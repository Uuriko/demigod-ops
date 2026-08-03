#!/usr/bin/env node
/**
 * demigod-import-integrity — fail if tracked demigod sources import local demigod-*.mjs
 * modules that are missing on disk or not tracked in git (clone-breakers), OR if
 * import-critical modules no longer export their required public surface.
 *
 * Content hashes thrash on every intentional edit; export contracts catch silent gutting.
 * Poison (verify-the-verifier): node --test demigod-import-integrity.test.mjs
 * Wired into: verify:source (sor:import-integrity), ship prepare, .githooks/pre-commit
 *
 *   node demigod-import-integrity.mjs
 *   npm run demigod:import-integrity
 *   node demigod-import-integrity.mjs --json
 *   DEMIGOD_ROOT=/tmp/fixture node demigod-import-integrity.mjs  # isolated tree
 *   DEMIGOD_IMPORT_GATES=1 …  # also fail on untracked/missing verify-all gate scripts
 *   git config core.hooksPath .githooks   # enable pre-commit (once per clone)
 *
 * Default: static import edges + export contracts. verify-all gate-list is always *reported*
 * (gateUntracked/gateMissing) but only fails when DEMIGOD_IMPORT_GATES=1 — so "no git add
 * without request" does not red the tree while still making late clone-breakers visible.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL, fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const JSON_OUT = process.argv.includes('--json');

/**
 * Import-critical SoRs: required named exports (not content hashes).
 * Priority = consumer fan-in (contract-testing: critical integration points first).
 * Webhook/craft set: trust boundary. High-fan-in libs: silent gutting breaks half the tree.
 */
const EXPORT_CONTRACTS = {
  'demigod-webhook-auth.mjs': [
    'resolveWebflowWebhookSecrets',
    'persistWebflowWebhookSecrets',
    'webflowWebhookSecretCoverage',
    'webhookAuthReadiness',
    'webhookAuthSafeToBind',
    'verifyWebflowWebhook',
  ],
  'demigod-webhook-origin.mjs': ['webhookOriginPolicy', 'privateCapabilityHeaders'],
  'demigod-webhook-rate-limit.mjs': ['webhookClientIp', 'allowWebhookRequest'],
  'demigod-webflow-token.mjs': ['resolveWebflowApiToken', 'hasWebflowApiToken'],
  'demigod-craft-log.mjs': ['mintShip', 'mintIntro', 'status', 'verifyShipLive'],
  // High fan-in (ranked by real named-import sites across tracked mjs/bin)
  'demigod-turn-lib.mjs': [
    'ROOT',
    'sleep',
    'wlog',
    'loadDemigodState',
    'saveDemigodState',
    'WEBFLOW_DESIGNER_URL',
    'prepareWebflowDesigner',
    'captureDemigodScreenshots',
  ],
  'demigod-agent-tools-lib.mjs': [
    'BUSY',
    'atomicWrite',
    'ensureBusy',
    'readJson',
    'opt',
    'flag',
    'withFileLock',
  ],
  'demigod-live-lib.mjs': [
    'LIVE_ORIGIN',
    'fetchLiveHtml',
    'scanLiveHtml',
    'markerPresent',
    'buildFindings',
    'reportPass',
  ],
  'demigod-publish-freeze.mjs': ['status', 'assertNotFrozen'],
  'demigod-submissions-lib.mjs': [
    'loadBoard',
    'saveBoard',
    'loadInbox',
    'extractEmail',
    'scrubPII',
    'ingestSubmission',
    'approveSubmission',
    'publicStatus',
  ],
};

const tracked = new Set(
  spawnSync('git', ['-C', ROOT, 'ls-files'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean),
);

const importRe =
  /(?:from|import)\s*\(?\s*['"](\.\/)?(demigod-[a-zA-Z0-9._-]+\.mjs)['"]/g;

const missing = [];
const untracked = [];
const gateUntracked = [];
const gateMissing = [];
const contractFails = [];
const checked = new Set();

for (const rel of tracked) {
  if (!/\.(mjs|js)$/.test(rel)) continue;
  if (rel.startsWith('archive/') || rel.includes('node_modules/')) continue;
  const abs = path.join(ROOT, rel);
  let src;
  try {
    src = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  importRe.lastIndex = 0;
  let m;
  while ((m = importRe.exec(src))) {
    const mod = m[2];
    if (!mod || checked.has(`${rel}->${mod}`)) continue;
    checked.add(`${rel}->${mod}`);
    const modPath = path.join(ROOT, mod);
    if (!fs.existsSync(modPath)) {
      missing.push({ from: rel, mod, reason: 'missing-on-disk' });
    } else if (!tracked.has(mod)) {
      untracked.push({ from: rel, mod, reason: 'exists-untracked' });
    }
  }
}

// demigod-verify-all.mjs spawns gate scripts by path — no static import edge.
// Untracked gates are late clone-breakers: import-integrity green does not mean gates are
// clone-safe. Always report; fail only when DEMIGOD_IMPORT_GATES=1 (strict; needs git-add).
const VERIFY_ALL = path.join(ROOT, 'demigod-verify-all.mjs');
if (fs.existsSync(VERIFY_ALL)) {
  let gateSrc = '';
  try {
    gateSrc = fs.readFileSync(VERIFY_ALL, 'utf8');
  } catch {
    gateSrc = '';
  }
  const gateRe = /\[[\s\n]*['"](demigod-[a-zA-Z0-9._-]+\.mjs)['"]/g;
  const seenGates = new Set();
  let gm;
  while ((gm = gateRe.exec(gateSrc))) {
    const mod = gm[1];
    if (!mod || seenGates.has(mod)) continue;
    seenGates.add(mod);
    const modPath = path.join(ROOT, mod);
    if (!fs.existsSync(modPath)) {
      gateMissing.push({ from: 'demigod-verify-all.mjs', mod, reason: 'gate-missing-on-disk' });
    } else if (!tracked.has(mod)) {
      gateUntracked.push({ from: 'demigod-verify-all.mjs', mod, reason: 'gate-exists-untracked' });
    }
  }
}
const strictGates = process.env.DEMIGOD_IMPORT_GATES === '1';

for (const [mod, names] of Object.entries(EXPORT_CONTRACTS)) {
  const modPath = path.join(ROOT, mod);
  if (!fs.existsSync(modPath)) {
    contractFails.push({ mod, reason: 'contract-module-missing', missing: names });
    continue;
  }
  if (!tracked.has(mod)) {
    contractFails.push({ mod, reason: 'contract-module-untracked', missing: names });
    continue;
  }
  try {
    const ns = await import(pathToFileURL(modPath).href);
    const absent = names.filter((n) => !(n in ns));
    if (absent.length) contractFails.push({ mod, reason: 'missing-exports', missing: absent });
  } catch (err) {
    contractFails.push({
      mod,
      reason: 'contract-import-failed',
      missing: names,
      error: String(err?.message || err).slice(0, 160),
    });
  }
}

const edgesOk = missing.length === 0 && untracked.length === 0 && contractFails.length === 0;
const gatesOk = gateMissing.length === 0 && gateUntracked.length === 0;
const ok = edgesOk && (!strictGates || gatesOk);
const report = {
  ok,
  at: new Date().toISOString(),
  edgesChecked: checked.size,
  contractsChecked: Object.keys(EXPORT_CONTRACTS).length,
  missing,
  untracked,
  gateUntracked,
  gateMissing,
  gatesOk,
  strictGates,
  contractFails,
  summary: ok
    ? `import-integrity OK edges=${checked.size} contracts=${Object.keys(EXPORT_CONTRACTS).length}` +
      (gatesOk ? '' : ` · gate-advisory untracked=${gateUntracked.length} missing=${gateMissing.length}`)
    : `import-integrity FAIL missing=${missing.length} untracked=${untracked.length} contracts=${contractFails.length}` +
      (strictGates && !gatesOk
        ? ` gateUntracked=${gateUntracked.length} gateMissing=${gateMissing.length}`
        : ''),
};

if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
else {
  console.log(report.summary);
  for (const row of [...missing, ...untracked].slice(0, 40)) {
    console.log(`  ${row.reason}: ${row.from} → ${row.mod}`);
  }
  for (const row of [...gateMissing, ...gateUntracked].slice(0, 40)) {
    console.log(`  ${row.reason}: ${row.from} → ${row.mod}`);
  }
  for (const row of contractFails.slice(0, 20)) {
    console.log(
      `  ${row.reason}: ${row.mod}${row.missing?.length ? ` missing=[${row.missing.join(',')}]` : ''}${row.error ? ` err=${row.error}` : ''}`,
    );
  }
}
process.exit(ok ? 0 : 1);
