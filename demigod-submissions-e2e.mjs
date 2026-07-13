#!/usr/bin/env node
/** E2E: webhook ingest → inbox → approve → board CDN. */
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { ingestSubmission, loadInbox, BOARD_PATH } from './demigod-submissions-lib.mjs';
import fs from 'fs';

const PORT = Number(process.env.DEMIGOD_WEBHOOK_PORT || 9877);

async function postWebhook(body) {
  const res = await fetch(`http://127.0.0.1:${PORT}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  const health = await fetch(`http://127.0.0.1:${PORT}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    console.error(JSON.stringify({ ok: false, error: 'webhook not running' }));
    process.exit(1);
  }

  const startupEnvelope = {
    triggerType: 'form_submission',
    payload: {
      name: 'startup-hire',
      siteId: '6a34c484dcedc18a17408187',
      data: {
        'company-stage': 'seed',
        'contact-email': 'founder@test.com',
        'role-title': 'Founding Engineer',
        'stack-needs': 'Seed B2B SaaS, React, Node',
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
        'partner-email': 'partner@acme.vc',
        'partner-org': 'Seed VC Partners',
        'referral-plan': 'Portfolio warm intros and candidate referrals',
        'partner-linkedin': 'https://linkedin.com/in/jordanlee',
      },
      submittedAt: new Date().toISOString(),
    },
  };

  const postStartup = await postWebhook(startupEnvelope);
  const postPartner = await postWebhook(partnerEnvelope);
  const inbox = loadInbox();
  const partnerRec = inbox.items.find((i) => i.form === 'partner-apply' && i.raw?.['partner-email'] === 'partner@acme.vc');
  const subId = postStartup.json?.id || inbox.items.find((i) => i.form === 'startup-hire')?.id;
  const approve = spawnSync('node', ['demigod-submissions-approve.mjs', subId || '--latest'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  const board = JSON.parse(fs.readFileSync(BOARD_PATH, 'utf8'));
  const cdnUrl = board.cdnUrl;
  let live = null;
  if (cdnUrl) {
    live = await (await fetch(`${cdnUrl}?v=${Date.now()}`)).json();
  }

  const ok = postStartup.json?.ok && !postStartup.json?.featured
    && postPartner.json?.ok && partnerRec?.status === 'new' && partnerRec?.form === 'partner-apply'
    && approve.status === 0
    && live?.roles?.some((r) => r.title === 'Founding Engineer');

  console.log(JSON.stringify({
    ok,
    postStartup,
    postPartner,
    partnerInbox: partnerRec ? { id: partnerRec.id, status: partnerRec.status } : null,
    approved: approve.stdout?.trim(),
    boardRoles: board.roles?.length,
    liveTitle: live?.roles?.[0]?.title,
    cdnUrl,
  }));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });