#!/usr/bin/env node
/**
 * Claim-verifier — "fixed" must mean re-checked fact (Sonnet settlement).
 *
 * Usage:
 *   node demigod-claim-verify.mjs "foot v183 is live"
 *   node demigod-claim-verify.mjs --ship
 *   node demigod-claim-verify.mjs --copy-policy
 *   node demigod-claim-verify.mjs --file demigod-foot-core.js --grep "dg-path-pills"
 *   node demigod-claim-verify.mjs --receipt
 *   node demigod-claim-verify.mjs --smoke --board
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BUSY,
  sha256File,
  parseFirstJson,
  runNode,
  ensureBusy,
  flag,
  opt,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const LEDGER = path.join(ROOT, 'docs', 'receipts', 'CLAIM-VERIFY-LOG.jsonl');

const args = process.argv.slice(2);
const checks = [];
let pass = true;

function add(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: String(detail ?? '').slice(0, 300) });
  if (!ok) pass = false;
}

async function liveHtml() {
  const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
    headers: { 'User-Agent': 'dg-claim-verify' },
    signal: AbortSignal.timeout(15000),
  });
  return { status: r.status, html: await r.text() };
}

function claimText() {
  // positional non-flag args that are not values of known flags
  const skipVals = new Set();
  for (const f of ['--file', '--grep', '--owner']) {
    const i = args.indexOf(f);
    if (i >= 0 && args[i + 1]) skipVals.add(args[i + 1]);
  }
  const words = args.filter((a) => !a.startsWith('--') && !skipVals.has(a));
  return words.join(' ').trim() || '(no claim text)';
}

function hasSpecificClaim(claim) {
  if (
    flag(args, '--ship') ||
    flag(args, '--copy-policy') ||
    flag(args, '--receipt') ||
    flag(args, '--smoke') ||
    flag(args, '--board') ||
    opt(args, '--file') ||
    opt(args, '--grep')
  ) {
    return true;
  }
  // Bare words like "fixed" / "ok" are NOT specific enough
  if (/^(fixed|ok|done|pass|green|shipped)$/i.test(claim.trim())) return false;
  // Require concrete signal: version, CDN id, ship/live/cdn, copy policy, board, receipt
  return /live|ship|cdn|publish|v\d{2,}|3fzlp6|catbox|48h|sla|copy|honesty|board|smoke|receipt|foot\s*v\d/i.test(
    claim,
  );
}

function wantsShip(claim) {
  return flag(args, '--ship') || /live|ship|cdn|publish|foot\s*v\d{2,}|v\d{2,}\s+is\s+live/i.test(claim);
}

function wantsCopy(claim) {
  return flag(args, '--copy-policy') || /48h|sla|copy.?policy|honesty.?copy/i.test(claim);
}

function wantsReceipt(claim) {
  return flag(args, '--receipt') || /\breceipt\b/i.test(claim);
}

function wantsSmoke(claim) {
  return flag(args, '--smoke') || /\bsmoke\b|\bboot\b/i.test(claim);
}

function wantsBoard(claim) {
  return flag(args, '--board') || /\bboard\b|\bhonesty\b/i.test(claim);
}

async function main() {
  const claim = claimText();
  const specific = hasSpecificClaim(claim);

  add('foot-exists', fs.existsSync(FOOT), FOOT);
  const chk = runNode(ROOT, ['--check', FOOT], { timeout: 15000 });
  add('foot-syntax', chk.status === 0, chk.status === 0 ? 'ok' : chk.out.slice(0, 200));

  if (!specific) {
    add(
      'claim-specificity',
      false,
      'need --ship/--copy-policy/--smoke/--board/--receipt/--file+--grep or a concrete claim (e.g. "foot v183 is live")',
    );
  }

  if (specific && wantsShip(claim)) {
    const ship = runNode(ROOT, ['demigod-ship-status.mjs', '--json'], { timeout: 90000 });
    const j = parseFirstJson(ship.stdout || ship.out);
    add('ship-status-run', ship.status === 0 || Boolean(j), ship.status === 0 ? 'ok' : 'ran with issues');
    if (j) {
      add('shipped', j.shipped === true, j.stage || j.nextAction || '');
      add('live-reachable', j.live?.ok === true, j.live?.cdnId || j.live?.error || '');
      const liveMan = (j.stages || []).find((s) => s.id === 'live_matches_manifest');
      add('live-matches-manifest', liveMan?.ok === true, j.live?.cdnId || '');
      const cdnBody = (j.stages || []).find((s) => s.id === 'cdn_body_matches_disk');
      if (cdnBody) {
        add('cdn-body-matches-disk', cdnBody.ok === true, cdnBody.detail || j.cdnBody?.sha12 || '');
      } else if (j.cdnBody) {
        add('cdn-body-matches-disk', j.cdnBody.matchDisk === true, j.cdnBody.sha12 || '');
      }
      // Bind claim text version if present (e.g. "foot v183 is live")
      const wantVer = (claim.match(/v(\d{2,4})\b/i) || claim.match(/foot\s*v?(\d{2,4})/i) || [])[1];
      if (wantVer) {
        const liveVer = j.live?.footVer || j.disk?.ver || null;
        const diskVer = j.disk?.ver || null;
        add(
          `claim-version-v${wantVer}`,
          String(liveVer) === String(wantVer),
          `claimed=v${wantVer} live=${liveVer || '?'} disk=${diskVer || '?'}`,
        );
        // Require live match specifically (not just disk)
        if (String(liveVer) !== String(wantVer)) {
          add('claim-version-binds-ship', false, `live≠claimed v${wantVer}`);
        }
      }
    } else {
      add('ship-status-parse', false, 'could not parse ship-status JSON');
    }
  }

  if (specific && wantsCopy(claim)) {
    const js = fs.readFileSync(FOOT, 'utf8');
    const copy = (js.match(/var COPY=\{[\s\S]*?\n\};/) || [''])[0];
    const badInCopy = /48\s*h|within\s*\d+\s*h|\bSLA\b|fastest reply/i.test(copy);
    add('copy-no-speed-in-COPY', !badInCopy, badInCopy ? 'speed language in COPY' : 'clean');
    add('copy-no-John-in-COPY', !/\bJohn\b/.test(copy), !/\bJohn\b/.test(copy) ? 'ok' : 'John in COPY');
    add('has-scrubTimeClaims', /function scrubTimeClaims/.test(js), 'scrubTimeClaims');
    add('has-scrubStaticLabels', /function scrubStaticLabels/.test(js), 'scrubStaticLabels');
  }

  if (specific && wantsReceipt(claim)) {
    let rec = null;
    try {
      rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/receipts/PUBLISH-LATEST.json'), 'utf8'));
    } catch {
      try {
        rec = JSON.parse(fs.readFileSync(path.join(BUSY, 'publish-receipt-latest.json'), 'utf8'));
      } catch {
        /* */
      }
    }
    add('receipt-exists', Boolean(rec), rec ? rec.at : 'missing');
    if (rec) {
      if (rec.ok === false) {
        add('receipt-ok', false, rec.error || 'receipt marked ok:false');
      } else if (rec.ok === true && rec.diskSha) {
        const now = sha256File(FOOT);
        add(
          'receipt-disk-sha-current',
          rec.diskSha === now,
          `receipt=${rec.diskSha?.slice(0, 12)} now=${now?.slice(0, 12)}`,
        );
        try {
          const { html } = await liveHtml();
          const liveId = (html.match(/files\.catbox\.moe\/([a-z0-9]+\.js)/) || [])[1];
          const want = (rec.cdnUrl || '').split('/').pop();
          add('receipt-live-cdn', liveId === want, `live=${liveId} receipt=${want}`);
        } catch (e) {
          add('receipt-live-cdn', false, String(e.message || e));
        }
      } else {
        add('receipt-ok', false, 'receipt missing ok:true + diskSha');
      }
    }
  }

  const file = opt(args, '--file');
  const grep = opt(args, '--grep');
  if (file && grep) {
    const p = path.isAbsolute(file) ? file : path.join(ROOT, file);
    const t = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    let hit = t.includes(grep);
    if (!hit) {
      try {
        hit = new RegExp(grep).test(t);
      } catch {
        hit = false;
      }
    }
    add(`grep:${grep.slice(0, 40)}`, hit, p);
  } else if (file || grep) {
    add('file-grep-pair', false, 'need both --file and --grep');
  }

  if (specific && wantsSmoke(claim)) {
    const s = runNode(ROOT, ['demigod-foot-smoke.mjs'], { timeout: 30000 });
    let ok = s.status === 0;
    let detail = s.out.slice(0, 120);
    try {
      const j = parseFirstJson(s.stdout || s.out);
      if (j && typeof j.pass === 'boolean') {
        ok = j.pass === true;
        detail = j.version || j.error || detail;
      }
    } catch {
      /* */
    }
    add('foot-smoke', ok, detail);
  }

  if (specific && wantsBoard(claim)) {
    const b = runNode(ROOT, ['demigod-verify-board-honesty.mjs'], { timeout: 30000 });
    add('board-honesty', b.status === 0 && /OK/i.test(b.out), b.out.trim().slice(0, 80));
  }

  const result = {
    at: new Date().toISOString(),
    claim,
    specific,
    pass,
    checks,
    summary: pass ? 'PASS — claim re-checked' : 'FAIL — do not certify fixed',
  };

  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.appendFileSync(LEDGER, JSON.stringify(result) + '\n');
    ensureBusy();
    fs.writeFileSync(path.join(BUSY, 'claim-verify-latest.json'), JSON.stringify(result, null, 2));
  } catch {
    /* */
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ pass: false, error: String(e.message || e) }));
  process.exit(1);
});
