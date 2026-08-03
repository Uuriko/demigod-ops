#!/usr/bin/env node
/** Brief intake smoke: live forms + webhook path + wizard UX. */
import fs from 'fs';
import path from 'path';
import net from 'node:net';
import { spawn, spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-INTAKE-SMOKE.json');
const LIVE_SUBMIT = process.argv.includes('--live-submit');
const WEBHOOK_ONLY = process.env.DEMIGOD_INTAKE_SMOKE_WEBHOOK_ONLY === '1';
let PORT = 0;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function startIsolatedWebhook() {
  PORT = await freePort();
  const scope = `intake-smoke-${process.pid}-${Date.now()}`;
  const env = { ...process.env, DEMIGOD_TEST_SCOPE: scope, DEMIGOD_WEBHOOK_PORT: String(PORT) };
  for (const key of ['DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP', 'DEMIGOD_WEBFLOW_WEBHOOK_SECRET_ENGINEER', 'DEMIGOD_WEBFLOW_WEBHOOK_SECRET']) delete env[key];
  const child = spawn(process.execPath, ['demigod-submissions-webhook.mjs'], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  for (let i = 0; i < 50; i++) {
    if (child.exitCode != null) throw new Error(`isolated webhook exited ${child.exitCode}: ${stderr.slice(-500)}`);
    const health = await webhookHealth();
    if (health.ok) return { child, scope, port: PORT };
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill('SIGTERM');
  throw new Error(`isolated webhook did not start: ${stderr.slice(-500)}`);
}

async function stopWebhook(child) {
  if (!child || child.exitCode != null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('close', resolve)),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
}

async function webhookHealth() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/health`, { signal: AbortSignal.timeout(5000) });
    return { ok: r.ok, json: await r.json() };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

async function formWebhookSmoke(name, data) {
  const body = {
    triggerType: 'form_submission',
    payload: {
      name,
      siteId: '6a34c484dcedc18a17408187',
      data,
      submittedAt: new Date().toISOString(),
      source: 'demigod-intake-smoke.mjs',
    },
  };
  const res = await fetch(`http://127.0.0.1:${PORT}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return {
    httpStatus: res.status,
    ok: res.ok && json.ok,
    id: json.id,
    inboxStatus: json.status,
    featured: json.featured,
  };
}

async function partnerWebhookSmoke() {
  const tag = Date.now();
  return formWebhookSmoke('partner-apply', {
    'partner-type': 'refer-startups',
    'partner-name': 'Smoke Check',
    'partner-email': `smoke-intake+${tag}@trydemigod.com`,
    'partner-org': 'Intake smoke probe',
    'referral-plan': 'CLI intake verification only',
  });
}

function runWizardPlaytest() {
  const r = spawnSync('node', ['demigod-wizard-playtest.mjs', '--desktop-only'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
  });
  let parsed = null;
  try {
    const line = (r.stdout || '').trim().split('\n').filter((l) => l.startsWith('{')).pop();
    parsed = line ? JSON.parse(line) : null;
  } catch (_) { /* ignore */ }
  return { exitCode: r.status, ok: r.status === 0, parsed, stderr: (r.stderr || '').slice(-400) };
}

async function main() {
  const checks = {};
  const isolatedWebhook = await startIsolatedWebhook();
  try {
  const liveScan = WEBHOOK_ONLY
    ? { formsOk: true, forms: [], footerCoreCopy: {} }
    : await fetchLiveHtml(true).then(({ html, footerCoreJs }) => scanLiveHtml(html, { footerCoreJs }));

  checks.liveForms = {
    ok: liveScan.formsOk,
    startup: liveScan.forms.find((f) => f.name === 'startup-hire')?.present,
    engineer: liveScan.forms.find((f) => f.name === 'engineer-join')?.present,
    footVersion: liveScan.footerCoreCopy?.version,
  };

  checks.webhookHealth = await webhookHealth();
  checks.webhookHealth.scope = isolatedWebhook.scope;

  if (checks.webhookHealth.ok) {
    const tag = Date.now();
    checks.partnerPost = await partnerWebhookSmoke();
    checks.startupPost = await formWebhookSmoke('startup-hire', {
      'contact-email': `smoke-startup+${tag}@trydemigod.com`,
      'company-name': 'Smoke Check Co',
      'company-stage': 'seed',
      'role-title': 'Head of Growth',
      'stack-needs': 'Intake smoke probe only',
    });
    checks.engineerPost = await formWebhookSmoke('engineer-join', {
      'full-name': 'Smoke Check',
      'seeker-email': `smoke-engineer+${tag}@trydemigod.com`,
      'linkedin-url': 'https://linkedin.com/in/smoke-check',
      'skills-stack': 'Intake smoke probe',
      'experience': 'CLI verification only',
      'sf-bay': 'yes',
    });
  } else {
    checks.partnerPost = { skipped: true, reason: 'webhook_down' };
    checks.startupPost = { skipped: true, reason: 'webhook_down' };
    checks.engineerPost = { skipped: true, reason: 'webhook_down' };
  }

  checks.wizard = WEBHOOK_ONLY ? { ok: true, skipped: true, reason: 'webhook-only-check' } : runWizardPlaytest();

  const formTest = LIVE_SUBMIT ? spawnSync('node', ['demigod-form-submit-test.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
  }) : null;
  let formParsed = null;
  const formOut = path.join(ROOT, 'DEMIGOD-FORM-SUBMIT-TEST.json');
  try {
    if (formTest && fs.existsSync(formOut)) formParsed = JSON.parse(fs.readFileSync(formOut, 'utf8'));
    else {
      const line = (formTest.stdout || '').trim().split('\n').filter((l) => l.startsWith('{')).pop();
      formParsed = line ? JSON.parse(line) : null;
    }
  } catch (_) { /* ignore */ }
  checks.webflowSubmit = {
    exitCode: formTest?.status ?? null,
    ok: formTest ? formTest.status === 0 : true,
    pass: formParsed?.pass,
    skipped: formTest ? formParsed?.submitResult?.skipped : true,
    reason: formTest ? formParsed?.submitResult?.reason : 'explicit_--live-submit_required',
    mode: formParsed?.startup?.mode,
  };

  const webhookOk = (r) => r?.ok || r?.skipped;
  const pass =
    checks.liveForms.ok
    && checks.webhookHealth.ok
    && webhookOk(checks.partnerPost)
    && webhookOk(checks.startupPost)
    && webhookOk(checks.engineerPost)
    && checks.wizard.ok
    && (checks.webflowSubmit.pass === true || checks.webflowSubmit.skipped);

  const out = {
    at: new Date().toISOString(),
    pass,
    checks,
    humanFollowUp: !LIVE_SUBMIT
      ? null
      : checks.webflowSubmit.skipped
      ? 'Turnstile blocks automated Webflow POST — webhook path verified via CLI smoke.'
      : checks.webflowSubmit.pass
        ? 'Check potter@trydemigod.com / Webflow form notifications for test submission.'
        : 'Webflow submit did not show success — investigate before live traffic.',
    note: 'Webflow forms and the isolated receiver are verified separately; live delivery uses configured Webflow webhooks.',
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  return pass;
  } finally {
    await stopWebhook(isolatedWebhook.child);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).then((pass) => { if (pass === false) process.exitCode = 1; });
