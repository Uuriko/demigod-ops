#!/usr/bin/env node
/** Brief intake smoke: live forms + webhook path + wizard UX. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml } from './demigod-live-lib.mjs';
import { loadInbox } from './demigod-submissions-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-INTAKE-SMOKE.json');
const PORT = Number(process.env.DEMIGOD_WEBHOOK_PORT || 9877);

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
  const inbox = loadInbox();
  const rec = inbox.items.find((i) => i.id === json.id);
  return {
    httpStatus: res.status,
    ok: res.ok && json.ok,
    id: json.id,
    inboxStatus: rec?.status,
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
  const { html, footerCoreJs } = await fetchLiveHtml(true);
  const scan = scanLiveHtml(html, { footerCoreJs });

  checks.liveForms = {
    ok: scan.formsOk,
    startup: scan.forms.find((f) => f.name === 'startup-hire')?.present,
    engineer: scan.forms.find((f) => f.name === 'engineer-join')?.present,
    footVersion: scan.footerCoreCopy?.version,
    webhookUrl: scan.liveWebhookUrl || null,
  };

  checks.webhookHealth = await webhookHealth();

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

  checks.wizard = runWizardPlaytest();

  const formTest = spawnSync('node', ['demigod-form-submit-test.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
  });
  let formParsed = null;
  const formOut = path.join(ROOT, 'DEMIGOD-FORM-SUBMIT-TEST.json');
  try {
    if (fs.existsSync(formOut)) formParsed = JSON.parse(fs.readFileSync(formOut, 'utf8'));
    else {
      const line = (formTest.stdout || '').trim().split('\n').filter((l) => l.startsWith('{')).pop();
      formParsed = line ? JSON.parse(line) : null;
    }
  } catch (_) { /* ignore */ }
  checks.webflowSubmit = {
    exitCode: formTest.status,
    ok: formTest.status === 0,
    pass: formParsed?.pass,
    skipped: formParsed?.submitResult?.skipped,
    reason: formParsed?.submitResult?.reason,
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
    humanFollowUp: checks.webflowSubmit.skipped
      ? 'Turnstile blocks automated Webflow POST — webhook path verified via CLI smoke.'
      : checks.webflowSubmit.pass
        ? 'Check hello@trydemigod.com / Webflow form notifications for test submission.'
        : 'Webflow submit did not show success — investigate before live traffic.',
    note: 'All three wizards POST to submissions webhook when window.__dgWebhookUrl is set (v69+).',
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});