#!/usr/bin/env node
/** E2E: webhook ingest → inbox → approve → local board. Does not publish or call Webflow. */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadInbox } from './demigod-submissions-lib.mjs';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DEMIGOD_ROOT || '/home/potter';

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

  const engineerEnvelope = {
    triggerType: 'form_submission',
    payload: {
      name: 'engineer-join',
      siteId: '6a34c484dcedc18a17408187',
      data: {
        'full-name': 'Mina Alvarez',
        'seeker-email': 'mina.alvarez@baymail.co',
        'skills-stack': 'JavaScript, activation work',
        experience: 'Led an activation rebuild',
        'sf-bay': 'yes',
        availability: 'now',
        'salary-expectation': '$180k',
      },
      submittedAt: new Date().toISOString(),
    },
  };

  const postStartup = await postWebhook(startupEnvelope);
  const postEngineer = await postWebhook(engineerEnvelope);
  const postPartner = await postWebhook(partnerEnvelope);
  const inbox = loadInbox();
  const partnerRec = inbox.items.find((i) => i.form === 'partner-apply' && i.raw?.['partner-email'] === 'partner@acme.vc');
  const engineerRec = inbox.items.find((i) => i.id === postEngineer.json?.id);
  const subId = postStartup.json?.id || inbox.items.find((i) => i.form === 'startup-hire')?.id;
  const approve = spawnSync(process.execPath, ['demigod-submissions-approve.mjs', subId || '--latest'], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: DATA,
      DEMIGOD_PUBLISH_FREEZE: process.env.DEMIGOD_PUBLISH_FREEZE || '1',
    },
    encoding: 'utf8',
  });

  const boardFile = path.join(DATA, 'DEMIGOD-BOARD.json');
  const board = fs.existsSync(boardFile) ? JSON.parse(fs.readFileSync(boardFile, 'utf8')) : { roles: [] };
  const localRole = (board.roles || []).some((r) => r.title === 'Founding Engineer');
  let live = null;
  if (board.cdnUrl && process.env.DEMIGOD_E2E_LIVE_CDN === '1') {
    live = await (await fetch(`${board.cdnUrl}?v=${Date.now()}`)).json();
  }

  const ok = postStartup.json?.ok && !postStartup.json?.featured
    && postEngineer.json?.ok && engineerRec?.status === 'new' && engineerRec?.form === 'engineer-join'
    && postPartner.json?.ok && partnerRec?.status === 'new' && partnerRec?.form === 'partner-apply'
    && approve.status === 0
    && localRole
    && (live == null || live.roles?.some((r) => r.title === 'Founding Engineer'));

  console.log(JSON.stringify({
    ok,
    postStartup,
    postEngineer,
    postPartner,
    partnerInbox: partnerRec ? { id: partnerRec.id, status: partnerRec.status } : null,
    approved: approve.stdout?.trim(),
    boardRoles: board.roles?.length,
    localRole,
    liveTitle: live?.roles?.[0]?.title || null,
    publishSkipped: true,
  }));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });