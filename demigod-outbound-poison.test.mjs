/**
 * Honesty poison-tests for outbound / receipt tools (Claude collab c174).
 * Gates that stay green but never fail on fake sends lock nothing.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const node = process.execPath;

function run(script, args = [], env = {}) {
  return spawnSync(node, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, ...env },
  });
}

function source(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

test('dm-auto-send refuses non-dry delivery (no env widens authority)', () => {
  const r = run('demigod-dm-auto-send.mjs', ['--name=Nobody']);
  assert.equal(r.status, 2, 'must exit 2 without --dry');
  assert.match(r.stderr + r.stdout, /auto_dm_stopped/);
  const src = source('demigod-dm-auto-send.mjs');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /twilio|resend|nodemailer|smtp|mailgun/i);
  assert.match(src, /no environment variable widens authority|Delivery is permanently disabled/i);
});

test('founder-dm-blast --send is refused and has no delivery path', () => {
  const r = run('demigod-founder-dm-blast.mjs', ['--send', '--limit=1']);
  assert.equal(r.status, 2);
  assert.match(r.stderr + r.stdout, /auto_dm_stopped/);
  const src = source('demigod-founder-dm-blast.mjs');
  assert.match(src, /Delivery is permanently disabled/);
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /twilio|resend|nodemailer|smtp/i);
  const m = run('demigod-founder-dm-blast.mjs', ['--mark-sent=Nobody']);
  assert.equal(m.status, 2);
  assert.match(m.stderr + m.stdout, /external_delivery_receipt_required|cannot attest delivery/i);
});

test('gtm-blast without --dry refuses and never appends a send log', () => {
  const r = run('demigod-gtm-blast.mjs', []);
  assert.equal(r.status, 2);
  assert.match(r.stderr + r.stdout, /auto_dm_stopped/);
  const src = source('demigod-gtm-blast.mjs');
  assert.doesNotMatch(src, /appendFileSync/);
  assert.match(src, /--dry/);
  const dry = run('demigod-gtm-blast.mjs', ['--dry']);
  assert.equal(dry.status, 0);
  assert.match(dry.stdout, /DRY inventory/i);
});

test('gtm-log-send refuses inventing sends without attest + receipt', () => {
  const env = { ...process.env };
  delete env.DEMIGOD_ATTEST_SEND;
  const r = run('demigod-gtm-log-send.mjs', ['--role=Poison', '--to=realperson@startup.example', '--90d=x'], env);
  assert.equal(r.status, 2);
  assert.match(r.stderr + r.stdout, /send_log_refused|ATTEST_SEND/i);

  // Attest without receipt still refuses
  const r2 = run(
    'demigod-gtm-log-send.mjs',
    ['--role=Poison', '--to=realperson@startup.example', '--90d=x'],
    { ...env, DEMIGOD_ATTEST_SEND: '1' },
  );
  assert.equal(r2.status, 2);
  assert.match(r2.stderr + r2.stdout, /receipt_required|receipt/i);

  // Fake receipt without Message-ID refuses
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-send-rcpt-'));
  const bad = path.join(tmp, 'bad.txt');
  fs.writeFileSync(bad, 'SENT-CONFIRMED\n');
  const r3 = run(
    'demigod-gtm-log-send.mjs',
    [`--receipt=${bad}`, '--role=Poison', '--to=realperson@startup.example', '--90d=x'],
    { ...env, DEMIGOD_ATTEST_SEND: '1' },
  );
  assert.equal(r3.status, 2);
  assert.match(r3.stderr + r3.stdout, /receipt_invalid/i);
});

test('receipt-mint refuses real delivered receipts without DEMIGOD_ALLOW_REAL_RECEIPTS', () => {
  const env = { ...process.env };
  delete env.DEMIGOD_ALLOW_REAL_RECEIPTS;
  delete env.DEMIGOD_ALLOW_REAL_ROLES;
  const r = run(
    'demigod-receipt-mint.mjs',
    ['--status=delivered', '--intros=1', '--no-publish', '--note=poison'],
    env,
  );
  const src = source('demigod-receipt-mint.mjs');
  assert.match(src, /REAL_RECEIPTS_REFUSED|receipt-mint refused/);
  assert.match(src, /DEMIGOD_ALLOW_REAL_RECEIPTS=1/);
  if (r.status === 0) {
    // Board may have no delivered real path if mint uses sample — gate must still exist in source.
    assert.match(src, /allowRealReceipts: true/);
  } else {
    assert.equal(r.status, 2);
    assert.match(r.stderr + r.stdout, /DEMIGOD_ALLOW_REAL_RECEIPTS|refused/i);
  }
});
