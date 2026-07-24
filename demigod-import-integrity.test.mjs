/**
 * Poison-test for demigod-import-integrity: must PASS the real tree and FAIL
 * deliberate clone-breakers / export gutting (verify-the-verifier).
 *
 *   node --test demigod-import-integrity.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = import.meta.dirname;
const GATE = path.join(REPO, 'demigod-import-integrity.mjs');

function runGate(env = {}, extraArgs = []) {
  const r = spawnSync(process.execPath, [GATE, ...extraArgs], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return { code: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/** Minimal export surface that satisfies EXPORT_CONTRACTS in demigod-import-integrity.mjs */
const GOOD_MODULES = {
  'demigod-webhook-auth.mjs': `
export function resolveWebflowWebhookSecrets() {}
export function persistWebflowWebhookSecrets() {}
export function webflowWebhookSecretCoverage() {}
export function webhookAuthReadiness() {}
export function webhookAuthSafeToBind() {}
export function verifyWebflowWebhook() {}
`,
  'demigod-form-analytics.mjs': `
export const MAX_ANALYTICS_BODY = 1;
export function recordFormEvent() {}
export function processFormAnalyticsRequest() {}
export function summarizeFormAnalytics() {}
export function allowFormAnalyticsWrite() {}
export function allowTimestampRequest() {}
export function normalizeFormEvent() {}
`,
  'demigod-webhook-origin.mjs': `
export function webhookOriginPolicy() {}
export function privateCapabilityHeaders() {}
`,
  'demigod-webhook-rate-limit.mjs': `
export function webhookClientIp() {}
export function allowWebhookRequest() {}
`,
  'demigod-webflow-token.mjs': `
export function resolveWebflowApiToken() {}
export function hasWebflowApiToken() {}
`,
  'demigod-craft-log.mjs': `
export function mintShip() {}
export function mintIntro() {}
export function status() {}
export function verifyShipLive() {}
`,
  // Build ROOT export without a contiguous "const ROOT" literal (review false-positive).
  'demigod-turn-lib.mjs':
    'export const ' +
    'ROOT = ".";\n' +
    `export function sleep() {}
export function wlog() {}
export async function prepareWebflowDesigner() {}
export async function captureDemigodScreenshots() {}
export async function submitWebflowAiPrompt() {}
export async function waitWebflowTurnComplete() {}
`,
  'demigod-agent-tools-lib.mjs': `
export const BUSY = '/tmp';
export function atomicWrite() {}
export function ensureBusy() {}
export function readJson() {}
export function opt() {}
export function flag() {}
export function withFileLock() {}
`,
  'demigod-live-lib.mjs': `
export const LIVE_ORIGIN = 'https://www.trydemigod.com';
export async function fetchLiveHtml() {}
export function scanLiveHtml() {}
export function markerPresent() {}
export function buildFindings() {}
export function reportPass() {}
`,
  'demigod-publish-freeze.mjs': `
export function status() {}
export function assertNotFrozen() {}
`,
  'demigod-submissions-lib.mjs': `
export function loadBoard() {}
export function saveBoard() {}
export function loadInbox() {}
export function extractEmail() {}
export function scrubPII() {}
export function ingestSubmission() {}
export function approveSubmission() {}
export function publicStatus() {}
`,
};

const CONTRACT_COUNT = Object.keys(GOOD_MODULES).length;

function gitInit(dir) {
  const run = (args) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  run(['init', '-q']);
  run(['config', 'user.email', 'selftest@demigod.local']);
  run(['config', 'user.name', 'import-integrity-selftest']);
}

function writeTree(dir, files, { track = true } = {}) {
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
  if (track) {
    execFileSync('git', ['add', ...Object.keys(files)], { cwd: dir });
    execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: dir });
  }
}

function withFixture(files, fn, { untracked = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-import-integrity-'));
  try {
    gitInit(dir);
    writeTree(dir, files);
    if (untracked) {
      for (const [name, body] of Object.entries(untracked)) {
        fs.writeFileSync(path.join(dir, name), body);
      }
    }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('import-integrity PASSES the real repo (baseline — not vacuous-red)', () => {
  const r = runGate();
  assert.equal(r.code, 0, `real tree must pass: ${r.stdout || r.stderr}`);
  assert.match(r.stdout, /import-integrity OK/);
  assert.match(r.stdout, new RegExp(`contracts=${CONTRACT_COUNT}`));
});

test('import-integrity FAILS when a contract export is gutted (fail-capable)', () => {
  const gutted = {
    ...GOOD_MODULES,
    'demigod-webhook-auth.mjs': 'export function notTheRealSurface() {}\n',
  };
  withFixture(gutted, (dir) => {
    const r = runGate({ DEMIGOD_ROOT: dir }, ['--json']);
    assert.notEqual(r.code, 0, 'gutted webhook-auth exports must fail the gate');
    const report = JSON.parse(r.stdout);
    assert.equal(report.ok, false);
    assert.ok(
      report.contractFails.some(
        (c) => c.mod === 'demigod-webhook-auth.mjs' && c.reason === 'missing-exports',
      ),
      `expected missing-exports for webhook-auth, got ${JSON.stringify(report.contractFails)}`,
    );
  });
});

// Build fixture sources without a contiguous from-./demigod-*.mjs path literal so this
// poison file itself is not a false clone-breaker edge for the real-tree scan.
function consumerImporting(modBase) {
  return "import { x } from './" + modBase + ".mjs';\nexport const ok = 1;\n";
}

test('import-integrity FAILS when a tracked source imports a missing demigod-*.mjs', () => {
  const files = {
    ...GOOD_MODULES,
    'demigod-consumer.mjs': consumerImporting('demigod-ghost-missing'),
  };
  withFixture(files, (dir) => {
    const r = runGate({ DEMIGOD_ROOT: dir }, ['--json']);
    assert.notEqual(r.code, 0, 'missing import target must fail');
    const report = JSON.parse(r.stdout);
    assert.ok(
      report.missing.some((m) => m.mod === 'demigod-ghost-missing.mjs' && m.reason === 'missing-on-disk'),
      `expected missing-on-disk, got ${JSON.stringify(report.missing)}`,
    );
  });
});

test('import-integrity FAILS when a tracked source imports an untracked demigod-*.mjs', () => {
  const files = {
    ...GOOD_MODULES,
    'demigod-consumer.mjs': consumerImporting('demigod-ghost-untracked'),
  };
  withFixture(
    files,
    (dir) => {
      const r = runGate({ DEMIGOD_ROOT: dir }, ['--json']);
      assert.notEqual(r.code, 0, 'untracked import target must fail');
      const report = JSON.parse(r.stdout);
      assert.ok(
        report.untracked.some(
          (m) => m.mod === 'demigod-ghost-untracked.mjs' && m.reason === 'exists-untracked',
        ),
        `expected exists-untracked, got ${JSON.stringify(report.untracked)}`,
      );
    },
    { untracked: { 'demigod-ghost-untracked.mjs': 'export const x = 1;\n' } },
  );
});

test('import-integrity PASSES a minimal green fixture (positive control of DEMIGOD_ROOT path)', () => {
  withFixture(GOOD_MODULES, (dir) => {
    const r = runGate({ DEMIGOD_ROOT: dir });
    assert.equal(r.code, 0, `green fixture must pass: ${r.stdout || r.stderr}`);
    assert.match(r.stdout, /import-integrity OK/);
  });
});
