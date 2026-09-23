import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const OPS = path.dirname(new URL(import.meta.url).pathname);

function startWebhook(dir) {
  const preload = path.join(dir, 'no-live.mjs');
  fs.writeFileSync(preload, 'globalThis.fetch = async () => { throw new Error("live_call"); };\n');
  const child = spawn(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-submissions-webhook.mjs',
  ], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_WEBHOOK_PORT: '0',
      DEMIGOD_WEBHOOK_HOST: '127.0.0.1',
    },
  });
  let buf = '';
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`webhook did not listen: ${buf}`)), 8000);
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const line = buf.split('\n').find((row) => row.includes('"port"'));
      if (!line) return;
      clearTimeout(timer);
      resolve(JSON.parse(line));
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`webhook exited ${code}: ${buf}`));
    });
  });
  return { child, ready };
}

describe('intake sequence without a browser', { concurrency: 1 }, () => {
  test('e2e posts both onboardings and approves the role onto the local board', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-e2e-'));
    const { child, ready } = startWebhook(dir);
    t.after(() => child.kill());
    const info = await ready;
    const ran = spawnSync(process.execPath, ['demigod-submissions-e2e.mjs'], {
      cwd: OPS,
      env: {
        ...process.env,
        DEMIGOD_ROOT: dir,
        DEMIGOD_WEBHOOK_PORT: String(info.port),
        DEMIGOD_PUBLISH_FREEZE: '1',
        DEMIGOD_E2E_LIVE_CDN: '',
      },
      encoding: 'utf8',
    });
    assert.equal(ran.status, 0, ran.stderr || ran.stdout);
    const out = JSON.parse(ran.stdout);
    assert.equal(out.ok, true);
    assert.equal(out.postStartup.json.form, 'startup-hire');
    assert.equal(out.postStartup.json.status, 'new');
    assert.equal(out.postStartup.json.featured, false);
    assert.equal(out.postEngineer.json.form, 'engineer-join');
    assert.equal(out.postEngineer.json.status, 'new');
    assert.equal(out.partnerInbox.status, 'new');
    assert.equal(out.localRole, true);
    assert.equal(out.liveTitle, null);
    const board = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), 'utf8'));
    const role = board.roles.find((row) => row.title === 'Founding Engineer');
    assert.equal(role.sample, true);
    assert.equal(JSON.stringify(role).includes('founder@'), false);
    const approved = JSON.parse(out.approved);
    assert.equal(approved.publish.skipped, true);
    console.log(JSON.stringify({
      order: 'e2e',
      ok: out.ok,
      startupForm: out.postStartup.json.form,
      engineerForm: out.postEngineer.json.form,
      partnerStatus: out.partnerInbox.status,
      localRole: out.localRole,
      publishSkipped: approved.publish.skipped,
      liveTitle: out.liveTitle,
    }));
  });

  test('intake smoke posts three forms when the browser steps are skipped', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-intake-'));
    const htmlFile = path.join(dir, 'home.html');
    fs.writeFileSync(htmlFile, '<form name="startup-hire"></form><form id="engineer-join"></form><nav><a href="/hire">FIND TALENT</a></nav>');
    const { child, ready } = startWebhook(dir);
    t.after(() => child.kill());
    const info = await ready;
    const ran = spawnSync(process.execPath, ['demigod-intake-smoke.mjs'], {
      cwd: OPS,
      env: {
        ...process.env,
        DEMIGOD_ROOT: dir,
        DEMIGOD_WEBHOOK_PORT: String(info.port),
        DEMIGOD_INTAKE_SKIP_BROWSER: '1',
        DEMIGOD_INTAKE_HTML_FILE: htmlFile,
        DEMIGOD_INTAKE_OUT: path.join(dir, 'intake-smoke.json'),
      },
      encoding: 'utf8',
    });
    assert.equal(ran.status, 0, ran.stderr || ran.stdout);
    const out = JSON.parse(ran.stdout);
    assert.equal(out.pass, true);
    assert.equal(out.checks.liveForms.startup, true);
    assert.equal(out.checks.liveForms.engineer, true);
    assert.equal(out.checks.webhookHealth.ok, true);
    assert.equal(out.checks.startupPost.ok, true);
    assert.equal(out.checks.engineerPost.ok, true);
    assert.equal(out.checks.partnerPost.ok, true);
    assert.equal(out.checks.wizard.skipped, true);
    assert.equal(out.checks.webflowSubmit.skipped, true);
    const inbox = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), 'utf8'));
    assert.equal(inbox.items.some((row) => row.form === 'startup-hire'), true);
    assert.equal(inbox.items.some((row) => row.form === 'engineer-join'), true);
    assert.equal(inbox.items.some((row) => row.form === 'partner-apply'), true);
    console.log(JSON.stringify({
      order: 'intake-smoke',
      pass: out.pass,
      startup: out.checks.startupPost.ok,
      engineer: out.checks.engineerPost.ok,
      partner: out.checks.partnerPost.ok,
      browserSkipped: true,
      publish: false,
    }));
  });
});
