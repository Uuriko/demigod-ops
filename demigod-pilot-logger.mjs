#!/usr/bin/env node
/**
 * demigod-pilot-logger — log a REAL pilot after white-glove delivery
 *
 *   node demigod-pilot-logger.mjs --founder=… --brief=… [--outcome=…] [--no-publish]
 *
 * Runs board-honesty first. Default no fake receipts. Prefer --no-publish until
 * board CDN should update. Warm inbound ≠ pilot — use bin/dg pilot warm first.
 */
import { execSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
  const out = execSync('node demigod-verify-board-honesty.mjs', {encoding:'utf8'});
  if (!out.includes('OK')) { console.error('Board not honest - abort'); process.exit(1); }
} catch(e){ console.error('board check fail', e.message); process.exit(1); }

// Future: when Stripe ready, call createInvoiceStub after successful pilot/hire
// const inv = createInvoiceStub({pilotId: '...', amount: '10% first year', toEmail: founderEmail});
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard, saveBoard } from './demigod-submissions-lib.mjs';
import { appendPilot, computeSignal, latestReceipt } from './demigod-board-lib.mjs';
import { createInvoiceStub, getServiceStatus, onHireInvoice } from './demigod-future-services.mjs';  // Stripe stub for future 10% fee automation (manual now)
import { generateIntroRequest } from './demigod-matching-engine.mjs';

function parseArgs(argv) {
  const out = {
    founder: '',
    brief: '',
    intros: 0,
    quote: '',
    outcome: '',
    stage: 'Active',
    stageType: 'Pre-seed · SF startup',
    publish: true,
    receipt: true,
    signal: true,
    png: false,
    source: '',
    smsCand: '',
    smsRole: '',
    report: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report') out.report = true;
    else if (a.startsWith('--founder=')) out.founder = a.slice(10);
    else if (a.startsWith('--brief=')) out.brief = a.slice(8);
    else if (a.startsWith('--intros=')) out.intros = Number(a.slice(9)) || 0;
    else if (a.startsWith('--quote=')) out.quote = a.slice(8);
    else if (a.startsWith('--outcome=')) out.outcome = a.slice(10);
    else if (a.startsWith('--stage=')) out.stage = a.slice(8);
    else if (a.startsWith('--stage-type=')) out.stageType = a.slice(13);
    else if (a === '--no-publish') out.publish = false;
    else if (a === '--no-receipt') out.receipt = false;
    else if (a === '--no-signal') out.signal = false;
    else if (a === '--png') out.png = true;
    else if (a.startsWith('--source=')) out.source = a.slice(9);
    else if (a.startsWith('--sms-cand=')) out.smsCand = a.slice(11);
    else if (a.startsWith('--sms-role=')) out.smsRole = a.slice(11);
  }
  return out;
}

function runNode(script, extraArgs = []) {
  const pub = spawnSync('node', [script, ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120_000,
  });
  return { ok: pub.status === 0, status: pub.status, stdout: (pub.stdout || '').trim() };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.report) {
    try {
      const fs = require('fs');
      const path = require('path');
      const { fileURLToPath } = require('url');
      const { loadBoard } = require('./demigod-submissions-lib.mjs');
      // Prefer script-adjacent outreach (worktree), fall back to ROOT home
      const scriptDir = path.dirname(fileURLToPath(import.meta.url));
      const outreachCandidates = [
        path.join(scriptDir, 'demigod-outreach'),
        path.join(ROOT, 'demigod-outreach'),
      ];
      const outreachDir =
        outreachCandidates.find((d) => fs.existsSync(d)) || outreachCandidates[0];

      const b = loadBoard() || {};
      const pilots = b.pilots || [];
      console.log('=== Pilots ===');
      console.log('Pilots logged:', pilots.length);
      pilots.slice(-5).forEach((p) =>
        console.log(' -', p.founder || 'anon', p.brief || '', p.outcome ? '90d:' + String(p.outcome).slice(0, 50) : '')
      );

      // DM send-log summary (human-confirmed outbound)
      const sendLogPath = path.join(outreachDir, 'dm-send-log.txt');
      console.log('\n=== DM send-log ===');
      console.log('path:', sendLogPath);
      if (!fs.existsSync(sendLogPath)) {
        console.log('No dm-send-log.txt yet.');
        console.log('Format: SENT-CONFIRMED | YYYY-MM-DD | @handle | Company | channel');
      } else {
        const lines = fs
          .readFileSync(sendLogPath, 'utf8')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
        const confirmed = lines.filter((l) => /SENT-CONFIRMED/i.test(l));
        const planned = lines.filter((l) => /Planned:/i.test(l));
        const other = lines.filter((l) => !/SENT-CONFIRMED/i.test(l) && !/Planned:/i.test(l));
        console.log('Lines total:', lines.length);
        console.log('SENT-CONFIRMED:', confirmed.length);
        console.log('Planned / notes:', planned.length + other.length);
        if (confirmed.length) {
          console.log('Recent confirmed:');
          confirmed.slice(-8).forEach((l) => console.log(' -', l));
        } else {
          console.log('(no SENT-CONFIRMED yet — human must send 8 ready DMs then append log lines)');
        }
        if (other.length) {
          console.log('Legacy / freeform (not counted as sent):');
          other.slice(-5).forEach((l) => console.log(' -', l.slice(0, 100)));
        }
      }

      // Ready batch + archive hygiene
      const readyDir = path.join(outreachDir, 'ready-emails');
      console.log('\n=== Ready emails ===');
      console.log('path:', readyDir);
      if (fs.existsSync(readyDir)) {
        const files = fs.readdirSync(readyDir).filter((f) => f.endsWith('.txt'));
        const batch = files.filter((f) => /^dm-\d{4}-\d{2}-\d{2}-/.test(f));
        console.log('ready-emails/*.txt:', files.length, '| dated dm-YYYY-MM-DD batch:', batch.length);
        if (batch.length) batch.sort().forEach((f) => console.log(' -', f));
        else files.slice(0, 8).forEach((f) => console.log(' -', f));
      } else {
        console.log('No ready-emails dir');
      }
    } catch (e) {
      console.log('report err', e.message);
    }
    process.exit(0);
  }
  if (!args.brief?.trim()) {
    console.error('Usage: npm run demigod:pilot:log -- --brief="Founding PM" --intros=3 [--quote="..."] [--outcome="..."] [--png] [--source=sms] [--sms-cand=ID --sms-role=ROLE] [--report]');
    process.exit(1);
  }

  if (args.smsCand && args.smsRole) {
    const gen = generateIntroRequest(args.smsCand, args.smsRole);
    if (gen && gen.template && !args.quote) {
      args.quote = gen.template.split('\n').slice(0,5).join(' ');
    }
  }

  let board = loadBoard();
  const { board: next, role, receipt } = appendPilot(board, {
    founder: args.founder,
    brief: args.brief,
    intros: args.intros,
    quote: args.quote,
    outcome: args.outcome,
    stage: args.stage,
    stageType: args.stageType,
    withReceipt: args.receipt,
    source: args.source,
  });
  saveBoard(next, { reason: 'pilot-logger', actor: process.env.USER || 'pilot-logger' });

  if (args.source === 'sms') {
    let introTmpl = '';
    const roleTitle = args.brief || args.smsRole || '';
    // Always integrate generate for SMS source: prefer explicit, else recent SMS cand + role
    if (args.smsCand && roleTitle) {
      const g = generateIntroRequest(args.smsCand, roleTitle);
      introTmpl = g && g.template ? g.template : '';
    }
    if (!introTmpl) {
      try {
        const { loadInbox } = require('./demigod-submissions-lib.mjs');
        const inbox = loadInbox();
        const recentSms = (inbox.items || []).find(i => (i.source === 'sms' || (i.raw && i.raw.source === 'sms')));
        if (recentSms && roleTitle) {
          const g = generateIntroRequest(recentSms.id || recentSms.phone, roleTitle);
          introTmpl = g && g.template ? g.template : '';
        }
      } catch(e){}
    }
    console.log('SMS proof: 1 pilot logged from text conversation.');
    if (introTmpl) console.log('Ready intro template for this SMS lead:\n' + introTmpl.split('\n').slice(0,6).join('\n'));
    else console.log('(no recent SMS cand for auto-generate; use sms-proof or present-sms)');
    console.log('Use matching-engine sms-proof or present-sms for volume signal.');

    // Make SMS proof visible: append simple line for GTM / signal use (honest, from real convo)
    try {
      const fs = require('fs');
      const proofLine = `${new Date().toISOString()} | SMS lead: ${roleTitle || args.brief} via +1 (415) 555-DEMO (pending) | intro generated | source=text\n`;
      fs.appendFileSync('demigod-outreach/SMS-PROOF.txt', proofLine);
      console.log('Appended to demigod-outreach/SMS-PROOF.txt');
    } catch(e){}
  }

  let publishNote = 'skipped';
  if (args.publish) {
    const pub = runNode('demigod-board-publish.mjs');
    publishNote = pub.ok ? 'ok' : `failed:${pub.status}`;
  }

  let signalNote = 'skipped';
  let signalManifest = null;
  if (args.signal) {
    const sigArgs = ['demigod-signal-theater.mjs'];
    if (args.png) sigArgs.push('--png');
    const sig = runNode(sigArgs[0], sigArgs.slice(1));
    signalNote = sig.ok ? 'ok' : `failed:${sig.status}`;
    if (sig.ok && sig.stdout) {
      try {
        signalManifest = JSON.parse(sig.stdout);
      } catch {
        signalManifest = { raw: sig.stdout.slice(0, 400) };
      }
    }
  }

  const receiptUrl = receipt
    ? `https://www.trydemigod.com/#receipt/${receipt.hash}`
    : (latestReceipt(next) ? `https://www.trydemigod.com/#receipt/${latestReceipt(next).hash}` : null);

  console.log(JSON.stringify({
    ok: true,
    message: 'Proof logged — ledger + board CDN updated',
    role: {
      title: role.title,
      stageType: role.stageType,
      outcome: role.outcome,
      pilot: true,
    },
    signal: computeSignal(next),
    receiptUrl,
    publish: publishNote,
    signalTheater: signalNote,
    share: signalManifest?.pngLatest || signalManifest?.htmlLatest || 'demigod-outreach/signal-theater/signal-card-latest.html',
    dmSnippets: signalManifest?.dmLatest || 'demigod-outreach/signal-theater/dm-snippets-latest.txt',
  }, null, 2));
}

main();

// Events integration: on outcome==="hired" or receipted, trigger Stripe stub (pending).
// Human reviews before any real charge.
try {
  if (outcome && /hired|success|receipt/i.test(outcome)) {
    const inv = onHireInvoice({id: pilotId || founder, comp: stageType, founder, outcome});
    console.log("onHireInvoice stub:", inv);
  }
} catch(e){ console.log("invoice note (pending):", e.message); }
