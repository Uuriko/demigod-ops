#!/usr/bin/env node
/** Isolated E2E: webhook ingest → inbox → approve → local board. */
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';

const SCOPE = `submissions-e2e-${process.pid}-${Date.now()}`;
const ISOLATED_REPORT = path.join('/tmp/dg-busy/tests', SCOPE, 'DEMIGOD-INBOX-REPORT.json');
process.env.DEMIGOD_TEST_SCOPE = SCOPE;
const { loadInbox, loadBoard } = await import('./demigod-submissions-lib.mjs');
const { listAcceptedRoles } = await import('./demigod-accepted-role.mjs');
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

async function startWebhook() {
  PORT = await freePort();
  const env = { ...process.env, DEMIGOD_TEST_SCOPE: SCOPE, DEMIGOD_WEBHOOK_PORT: String(PORT) };
  for (const key of ['DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP', 'DEMIGOD_WEBFLOW_WEBHOOK_SECRET_ENGINEER', 'DEMIGOD_WEBFLOW_WEBHOOK_SECRET']) delete env[key];
  const child = spawn(process.execPath, ['demigod-submissions-webhook.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  for (let i = 0; i < 50; i++) {
    if (child.exitCode != null) throw new Error(`isolated webhook exited ${child.exitCode}: ${stderr.slice(-500)}`);
    const ok = await fetch(`http://127.0.0.1:${PORT}/health`).then((r) => r.ok).catch(() => false);
    if (ok) return child;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill('SIGTERM');
  throw new Error(`isolated webhook did not start: ${stderr.slice(-500)}`);
}

async function stopWebhook(child) {
  if (!child || child.exitCode != null) return;
  child.kill('SIGTERM');
  await Promise.race([new Promise((resolve) => child.once('close', resolve)), new Promise((resolve) => setTimeout(resolve, 1000))]);
}

async function postWebhook(body) {
  const res = await fetch(`http://127.0.0.1:${PORT}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  const startupEnvelope = {
    triggerType: 'form_submission',
    payload: {
      name: 'startup-hire',
      siteId: '6a34c484dcedc18a17408187',
      data: {
        'company-name': 'Isolated E2E Co',
        'company-stage': 'seed',
        'contact-email': 'founder@isolated-e2e.dev',
        'role-title': 'Founding Engineer',
        'stack-needs': 'Seed B2B SaaS, React, Node',
        '90day-outcome': 'Ship the first customer-ready product release',
        'work-location': 'San Francisco, CA (in-person)',
        'salary-range': '$190-230k',
        'why-this-role': 'First eng hire',
      },
      submittedAt: new Date().toISOString(),
    },
  };

  const partnerEnvelope = {
    triggerType: 'form_submission',
    payload: {
      name: 'partner-apply',
      siteId: '6a34c484dcedc18a17408187',
      data: {
        'partner-type': 'refer-startups',
        'partner-name': 'Jordan Lee',
        'partner-email': 'partner@isolated-e2e.vc',
        'partner-org': 'Seed VC Partners',
        'referral-plan': 'Portfolio warm intros and candidate referrals',
        'partner-linkedin': 'https://linkedin.com/in/jordanlee',
      },
      submittedAt: new Date().toISOString(),
    },
  };

  const webhook = await startWebhook();
  try {
  const postStartup = await postWebhook(startupEnvelope);
  const postPartner = await postWebhook(partnerEnvelope);
  const inbox = loadInbox();
  const partnerRec = inbox.items.find((i) => i.form === 'partner-apply' && i.raw?.['partner-email'] === 'partner@isolated-e2e.vc');
  const subId = postStartup.json?.id || inbox.items.find((i) => i.form === 'startup-hire')?.id;
  const calibrate = spawnSync(process.execPath, [
    'demigod-submissions-inbox.mjs',
    `--mark-reviewed=${subId}`,
    '--interview-process=Founder chat → work sample → final; target decision in ~2 weeks',
    '--i-observed-founder-answer',
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_TEST_SCOPE: SCOPE },
  });
  // Child must share DEMIGOD_TEST_SCOPE so approve writes the same isolated board/inbox.
  const approve = spawnSync(process.execPath, ['demigod-submissions-approve.mjs', subId || '--latest'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_TEST_SCOPE: SCOPE },
  });

  const board = loadBoard();
  const approvedInbox = loadInbox();
  const approvedRole = board.roles?.find((role) => role.title === 'Founding Engineer');
  const accepted = listAcceptedRoles(board, approvedInbox);

  const ok = postStartup.json?.ok && !postStartup.json?.featured
    && postPartner.json?.ok && partnerRec?.status === 'new' && partnerRec?.form === 'partner-apply'
    && calibrate.status === 0
    && fs.existsSync(ISOLATED_REPORT)
    && approve.status === 0
    && approvedRole?.sample === false
    && accepted.counts.acceptedForDelivery === 1;

  console.log(JSON.stringify({
    ok,
    postStartup,
    postPartner,
    partnerInbox: partnerRec ? { id: partnerRec.id, status: partnerRec.status } : null,
    calibrated: calibrate.stdout?.trim(),
    isolatedReportWritten: fs.existsSync(ISOLATED_REPORT),
    approved: approve.stdout?.trim(),
    boardRoles: board.roles?.length,
    approvedTitle: approvedRole?.title || null,
    acceptedRoles: accepted.counts.acceptedForDelivery,
    scope: SCOPE,
  }));
  return ok;
  } finally {
    await stopWebhook(webhook);
  }
}

main().then((ok) => { if (!ok) process.exitCode = 1; }).catch((e) => { console.error(e); process.exitCode = 1; });
