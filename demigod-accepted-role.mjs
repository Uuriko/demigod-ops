#!/usr/bin/env node
/**
 * Accepted-for-delivery role receipt — pure read model for DIE Phase 2 gate.
 *
 *   node demigod-accepted-role.mjs status
 *   node demigod-accepted-role.mjs --json
 *   node demigod-accepted-role.mjs --selftest
 *
 * Never writes board / catalog / pairs. Fail-closed.
 * Codex review (2026-07-29): hash-only invent, nested sample, company only on board,
 * phase2Ready overclaim — hardened below.
 */
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { isSeedRole } from './demigod-board-lib.mjs';
import { BOARD_PATH, loadBoard, loadInbox, isSampleData } from './demigod-submissions-lib.mjs';
import { normalizeCompanyName } from './demigod-startup-atlas.mjs';

// Deliberately NOT `process.env.DEMIGOD_ROOT || ...` — every other module in this lane honors
// that env var for test convenience, and this one must not. This file owns the gate that
// authorizes Phase 2 product work; an env var able to repoint it at a fixture board would be a
// gate bypass, not a test seam. Fixtures go through `listAcceptedRoles(board, inbox)` instead,
// which is how the tests already inject them. Do not "make this consistent."
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function submissionFingerprint(id) {
  return crypto.createHash('sha256').update(String(id || '')).digest('hex');
}

/** Company may live only on private inbox (anonymizeRole does not put it on board). */
function companyFromOrigin(origin = {}) {
  // Merge layers: empty `data:{}` must not hide raw.company-name
  const d = {
    ...(origin.raw && typeof origin.raw === 'object' ? origin.raw : {}),
    ...(origin.fields && typeof origin.fields === 'object' ? origin.fields : {}),
    ...(origin.data && typeof origin.data === 'object' ? origin.data : {}),
  };
  return String(
    d['company-name'] ||
      d.companyName ||
      d.company ||
      d['Company Name'] ||
      origin.company ||
      '',
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function isFeaturedOrigin(origin = {}) {
  // Canonical approveSubmission finishes at status 'featured' only
  return String(origin.status || '').toLowerCase() === 'featured';
}

function isStartupRoleForm(origin = {}) {
  const form = String(origin.form || origin.formName || origin.name || '').toLowerCase();
  // Mirror mintBoardEntry `/startup/` branch — require startup, not partner-company etc.
  if (!form) return false;
  if (/partner|refer|engineer|talent|candidate/.test(form)) return false;
  return /startup/.test(form) || /^hire$|hire-/.test(form) || form === 'startup-hire';
}

/**
 * @returns {{ ok: true, receipt: object } | { ok: false, why: string }}
 */
export function classifyRole(role = {}, inbox = {}) {
  if (!role || typeof role !== 'object') return { ok: false, why: 'missing_role' };
  if (role.sample !== false) return { ok: false, why: 'not_explicit_real' };
  if (isSeedRole(role) || isSampleData(role)) return { ok: false, why: 'seed_or_sample' };
  const id = String(role.id || '').trim();
  if (!id) return { ok: false, why: 'missing_id' };
  if (/^role-seed/i.test(id) || /^cand-seed/i.test(id) || /^demo/i.test(id)) {
    return { ok: false, why: 'seed_id' };
  }
  if (/sample|demo|selftest/i.test(`${role.title || ''} ${role.note || ''} ${role.outcome || ''}`)) {
    return { ok: false, why: 'sample_label' };
  }

  // A default parameter only fires on `undefined`, so an explicit null inbox reached this line
  // and threw. Fail-closed means refusing, never crashing — an exported gate cannot assume its
  // callers pass well-formed input (Claude Phase 2 poison, 2026-07-29).
  const items = Array.isArray(inbox?.items) ? inbox.items : [];
  const hash = String(role.sourceSubmissionHash || '').trim();

  // Collect matching origins by object identity (not submission id collapse)
  const matched = [];
  const pushUnique = (it) => {
    if (!it || matched.includes(it)) return;
    matched.push(it);
  };
  for (const it of items) {
    if (it && it.featuredId === id) pushUnique(it);
  }
  if (hash) {
    for (const it of items) {
      if (!it) continue;
      if (
        it.sourceSubmissionHash === hash ||
        submissionFingerprint(it.id) === hash ||
        String(it.fingerprint || '') === hash
      ) {
        pushUnique(it);
      }
    }
  }
  if (!matched.length) return { ok: false, why: 'no_submission_trace' };
  if (matched.length > 1) return { ok: false, why: 'ambiguous_origin' };

  const origin = matched[0];
  if (isSampleData(origin)) return { ok: false, why: 'origin_sample' };
  if (/spam|rejected|not_accepted/i.test(String(origin.status || ''))) {
    return { ok: false, why: 'origin_rejected' };
  }
  if (!isFeaturedOrigin(origin)) return { ok: false, why: 'origin_not_featured' };
  if (origin.featuredId && origin.featuredId !== id) {
    return { ok: false, why: 'featured_id_mismatch' };
  }
  if (!isStartupRoleForm(origin)) return { ok: false, why: 'origin_not_startup_form' };

  const originId = String(origin.id || '').trim();
  if (!originId) return { ok: false, why: 'origin_missing_id' };
  if (Array.isArray(origin.rejectReasons) && origin.rejectReasons.length) {
    return { ok: false, why: 'origin_rejected' };
  }
  if (origin.supersedes || origin.supersededBy) return { ok: false, why: 'origin_superseded' };

  // Production board stores SHA-256(submission id) only
  const expect = submissionFingerprint(originId);
  if (hash) {
    if (hash !== expect) return { ok: false, why: 'hash_mismatch' };
  } else if (origin.featuredId !== id) {
    return { ok: false, why: 'no_submission_trace' };
  }

  // Company identity from verified origin only (board cannot invent).
  // Compare via atlas normalizeCompanyName (same as matching/research) so legal
  // suffixes, punctuation, and diacritics do not false-mismatch the same firm;
  // empty norms fall back to simple whitespace+case so "Inc." ≠ "Acme Inc.".
  const company = companyFromOrigin(origin);
  if (!company) return { ok: false, why: 'missing_company' };
  const boardCompany = String(role.company || role.companyName || role.startup || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (boardCompany) {
    const boardNorm = normalizeCompanyName(boardCompany);
    const originNorm = normalizeCompanyName(company);
    const same =
      boardNorm && originNorm
        ? boardNorm === originNorm
        : boardCompany.toLowerCase() === company.toLowerCase();
    if (!same) return { ok: false, why: 'company_mismatch' };
  }

  return {
    ok: true,
    receipt: {
      roleId: id,
      company,
      companySource: 'inbox',
      title: String(role.title || '').trim() || null,
      sample: false,
      sourceSubmissionHash: hash || expect,
      featuredFromInbox: origin.featuredId === id,
      originSubmissionId: originId,
      originStatus: origin.status || null,
      featuredAt: role.featuredAt || origin.featuredAt || null,
    },
  };
}

export function listAcceptedRoles(board, inbox) {
  const b = board || loadBoard();
  const box = inbox || loadInbox();
  const roles = Array.isArray(b.roles) ? b.roles : [];
  const acceptedRoles = [];
  const rejectedReasons = [];
  for (const role of roles) {
    const c = classifyRole(role, box);
    if (c.ok) acceptedRoles.push(c.receipt);
    else rejectedReasons.push({ roleId: role?.id || null, why: c.why });
  }
  const nonSampleRoles = roles.filter((r) => r && r.sample === false).length;
  return {
    version: 1,
    at: new Date().toISOString(),
    acceptedRoles,
    rejectedReasons,
    counts: {
      boardRoles: roles.length,
      nonSampleRoles,
      acceptedForDelivery: acceptedRoles.length,
    },
    /**
     * Which board these counts describe. submissions-lib silently redirects BOARD_PATH to a
     * per-scope temp board whenever it detects a test process, and it detects one from a bare
     * DEMIGOD_TEST_SCOPE — a value it also self-assigns from the pid and which every spawned
     * child inherits. Measured 2026-07-30: with a leaked scope this gate reported
     * `boardRoles: 0` off an empty temp board, indistinguishable from a genuinely empty real
     * board. The redirect stays (it exists because tests corrupted the live board twice); the
     * silence does not. Read this before trusting a zero.
     */
    boardPath: BOARD_PATH,
    boardIsCanonical: BOARD_PATH === path.join(ROOT, 'DEMIGOD-BOARD.json'),
    /** Has ≥1 fail-closed accepted receipt — not full Phase 2 product gate. */
    hasAcceptedReceipts: acceptedRoles.length > 0,
    /** Always false: needs green benchmark + real non-sample pair + human review. */
    phase2Ready: false,
    gateOpen: false,
    note:
      acceptedRoles.length === 0
        ? 'No accepted-for-delivery roles. Phase 2 product work stays closed.'
        : `${acceptedRoles.length} accepted receipt(s); Phase 2 still needs green benchmark + real match-review pair (phase2Ready=false).`,
  };
}

export function statusReport(board, inbox) {
  return listAcceptedRoles(board, inbox);
}

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  const emptyInbox = { items: [] };
  let r = listAcceptedRoles(
    {
      roles: [
        { id: 'role-seed1', title: 'PM', sample: true },
        { id: 'role-seed2', title: 'Designer', sample: true },
      ],
    },
    emptyInbox,
  );
  assert(r.counts.acceptedForDelivery === 0, 'samples → 0');
  assert(r.phase2Ready === false, 'phase2Ready always false');

  // fake hash alone
  r = listAcceptedRoles(
    {
      roles: [
        {
          id: 'role-real-fakehash',
          sample: false,
          title: 'Eng',
          company: 'Acme',
          sourceSubmissionHash: 'totally-fake-hash',
        },
      ],
    },
    emptyInbox,
  );
  assert(r.counts.acceptedForDelivery === 0, 'unverified hash refused');

  // nested raw.sample
  r = listAcceptedRoles(
    {
      roles: [
        {
          id: 'role-real-nested',
          sample: false,
          title: 'Eng',
          company: 'Acme',
          sourceSubmissionHash: submissionFingerprint('sub-n'),
        },
      ],
    },
    {
      items: [
        {
          id: 'sub-n',
          featuredId: 'role-real-nested',
          status: 'featured',
          raw: { sample: true },
        },
      ],
    },
  );
  assert(r.counts.acceptedForDelivery === 0, 'nested sample refused');

  // company only on inbox (canonical mint shape)
  const subId = 'sub-mint-1';
  const fp = submissionFingerprint(subId);
  r = listAcceptedRoles(
    {
      roles: [
        {
          id: 'role-minted',
          sample: false,
          title: 'Founding Eng',
          sourceSubmissionHash: fp,
          featuredAt: '2026-07-29T00:00:00.000Z',
        },
      ],
    },
    {
      items: [
        {
          id: subId,
          featuredId: 'role-minted',
          status: 'featured',
          form: 'startup-hire',
          data: { 'company-name': 'Acme Labs' },
        },
      ],
    },
  );
  assert(r.counts.acceptedForDelivery === 1, 'inbox company accepted');
  assert(r.acceptedRoles[0].company === 'Acme Labs', 'company from inbox');
  assert(r.acceptedRoles[0].companySource === 'inbox', 'source inbox');
  assert(r.hasAcceptedReceipts === true, 'hasAcceptedReceipts');
  assert(r.phase2Ready === false, 'phase2Ready still false with receipts');

  // engineer form refused
  r = listAcceptedRoles(
    {
      roles: [{ id: 'role-eng', sample: false, title: 'X', sourceSubmissionHash: submissionFingerprint('s2') }],
    },
    {
      items: [
        {
          id: 's2',
          featuredId: 'role-eng',
          status: 'featured',
          form: 'engineer-join',
          data: { 'company-name': 'Nope' },
        },
      ],
    },
  );
  assert(r.counts.acceptedForDelivery === 0, 'engineer form refused');

  r = listAcceptedRoles(
    {
      roles: [{ id: 'role-new', sample: false, title: 'X', sourceSubmissionHash: submissionFingerprint('s3') }],
    },
    {
      items: [
        {
          id: 's3',
          featuredId: 'role-new',
          status: 'new',
          form: 'startup-hire',
          data: { 'company-name': 'Acme' },
        },
      ],
    },
  );
  assert(r.counts.acceptedForDelivery === 0, 'status new refused');

  console.log(JSON.stringify({ ok: true, selftest: 'accepted-role' }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`demigod-accepted-role — accepted-for-delivery role receipt (read-only)

Usage:
  node demigod-accepted-role.mjs status|--json
  node demigod-accepted-role.mjs --selftest`);
    process.exit(0);
  }
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  const report = statusReport();
  if (args.includes('--json') || args[0] === 'status' || !args.length) {
    if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`# accepted-role receipt · at ${report.at}`);
      console.log(
        `  board=${report.counts.boardRoles} · nonSample=${report.counts.nonSampleRoles} · acceptedForDelivery=${report.counts.acceptedForDelivery}`,
      );
      console.log(
        `  hasAcceptedReceipts=${report.hasAcceptedReceipts} · phase2Ready=${report.phase2Ready} · gateOpen=${report.gateOpen}`,
      );
      console.log(`  ${report.note}`);
      for (const a of report.acceptedRoles) {
        console.log(`  · ${a.roleId} · ${a.company} (${a.companySource}) · ${a.title || '—'}`);
      }
    }
    process.exit(0);
  }
  console.error('unknown args; try --help');
  process.exit(2);
}

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }
}
