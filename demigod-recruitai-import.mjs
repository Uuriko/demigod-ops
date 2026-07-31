#!/usr/bin/env node
/**
 * demigod-recruitai-import — Phase B dry-run-first importer.
 *
 * Loads the private committed Demigod export into recruitAI v0.1.1 SQLite
 * `company` + optional sample `req` rows. Never writes contacts, drafts, sends,
 * scores, fees, or Gmail state.
 *
 *   node demigod-recruitai-import.mjs              # dry-run (default)
 *   node demigod-recruitai-import.mjs --dry-run
 *   node demigod-recruitai-import.mjs --apply      # write DB (backs up first)
 *   node demigod-recruitai-import.mjs --db PATH --limit N
 *   node demigod-recruitai-import.mjs --apply --reqs [--reqs-per-company=3]
 *   node demigod-recruitai-import.mjs --selftest
 *
 * Default DB: ~/.config/recruitai/recruitai.db
 * Never writes contacts, drafts, sends, scores, fees, or Gmail state.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { loadRecruitaiExport } from './demigod-lead-sourcer.mjs';
import { buildSeedPack } from './demigod-recruitai-seed-pack.mjs';
import { categorizeRole, isRemoteLocation } from './demigod-startup-jobs-enrich.mjs';
import { safeResearchUrl } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const SCHEMA = 'demigod.recruitai-import/1';
const DEFAULT_DB = path.join(process.env.HOME || '', '.config/recruitai/recruitai.db');
const RECEIPT = path.join(BUSY, 'recruitai-import-latest.json');

const LEGAL_SUFFIX =
  /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|ltd|limited|co|company|plc|gmbh|ag|sa|s\.a|bv|b\.v|pty|pvt|private|public)\.?$/gi;

/** Normalize company name the way a lazy upstream would: lower + strip legal suffixes. */
export function nameNorm(name) {
  let s = String(name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&.+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 3; i++) {
    const next = s.replace(LEGAL_SUFFIX, '').replace(/[.,\s]+$/g, '').trim();
    if (next === s) break;
    s = next;
  }
  return s || String(name || '').toLowerCase().trim();
}

/** Stable id: domain preferred; else hash of name_norm. Prefix keeps Demigod origin clear. */
export function companyId({ domain, name }) {
  const d = String(domain || '').trim().toLowerCase();
  if (d && d.length <= 253 && !/[\s@]/.test(d)) return `dg:${d}`;
  const n = nameNorm(name);
  const h = crypto.createHash('sha256').update(`name:${n}`).digest('hex').slice(0, 16);
  return `dg:n:${h}`;
}

/**
 * Map one seed + optional signal into a company row plan (pure).
 * Positive-only for has_inhouse_ta / no_agency_policy.
 */
export function planCompanyRow(seed, signal = null) {
  const name = String(seed?.name || '').trim();
  if (!name || name.length > 200) return null;
  const domain = String(seed?.domain || signal?.domain || '').trim().toLowerCase() || null;
  if (domain && (domain.length > 253 || /[\s@]/.test(domain))) return null;

  const open = Number.isSafeInteger(signal?.openReqCount) ? signal.openReqCount : 0;
  const stale = Number.isSafeInteger(signal?.staleAttributedPostedReqCount)
    ? signal.staleAttributedPostedReqCount
    : 0;
  const maxDays = Number.isSafeInteger(signal?.maxObservedOpenDays)
    ? signal.maxObservedOpenDays
    : Number.isSafeInteger(signal?.maxAttributedPostedDays)
      ? signal.maxAttributedPostedDays
      : null;
  const people = Number.isSafeInteger(signal?.openPeopleOpsReqCount)
    ? signal.openPeopleOpsReqCount
    : 0;
  const noAgency = Number.isSafeInteger(signal?.noAgencyEvidenceReqCount)
    ? signal.noAgencyEvidenceReqCount
    : 0;

  let website = null;
  const site = String(seed?.website || '').trim();
  if (/^https:\/\//i.test(site) && !/@/.test(site) && site.length < 2048) website = site;

  let careers = null;
  const jobs = String(signal?.jobsUrl || '').trim();
  if (/^https:\/\//i.test(jobs) && !/@/.test(jobs) && jobs.length < 2048) careers = jobs;

  let atsPlatform = null;
  let atsToken = null;
  const bk = signal?.boardKey;
  if (bk && typeof bk === 'object') {
    const p = String(bk.provider || '').trim();
    const slug = String(bk.slug || '').trim();
    if (p && slug && p.length < 40 && slug.length < 120) {
      atsPlatform = p;
      atsToken = slug;
    }
  }

  return {
    id: companyId({ domain, name }),
    domain,
    name,
    name_norm: nameNorm(name),
    website,
    careers_url: careers,
    ats_platform: atsPlatform,
    ats_token: atsToken,
    open_req_count: Math.max(0, open),
    stale_req_count: Math.max(0, Math.min(stale, Math.max(0, open))),
    max_days_open: maxDays != null && maxDays >= 0 ? maxDays : null,
    // Positive only: PeopleOps open roles ⇒ likely in-house TA; absence is unknown not false.
    has_inhouse_ta: people > 0 ? 1 : null,
    // Positive only: supported agency-policy evidence ⇒ flag; never invent from silence.
    no_agency_policy: noAgency > 0 ? 1 : 0,
    in_bay_area: 1, // Demigod SF map projection
    status: 'discovered',
    notes: signal?.mapCompanyId
      ? `demigod import mapCompanyId=${signal.mapCompanyId}`
      : 'demigod import',
    mapCompanyId: signal?.mapCompanyId || null,
  };
}

/**
 * Sample open roles from export/3 relationship graph (public ATS titles/URLs only).
 * Caps per company; no description/contact scrape.
 */
export function planReqsFromExport(exportDoc, companyByDomain, { perCompany = 3 } = {}) {
  const cap = Math.max(0, Math.min(25, Number(perCompany) || 0));
  if (!cap || !exportDoc?.relationships) return [];
  const nodes = Array.isArray(exportDoc.relationships.nodes) ? exportDoc.relationships.nodes : [];
  const edges = Array.isArray(exportDoc.relationships.edges) ? exportDoc.relationships.edges : [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // boardId → company domain
  const boardDomain = new Map();
  for (const e of edges) {
    if (e.type !== 'uses_board') continue;
    const company = byId.get(e.source);
    const board = byId.get(e.target);
    if (company?.type === 'company' && board?.type === 'ats_board' && company.domain) {
      boardDomain.set(board.id, String(company.domain).toLowerCase());
    }
  }
  const per = new Map();
  const out = [];
  for (const e of edges) {
    if (e.type !== 'has_open_role') continue;
    const domain = boardDomain.get(e.source);
    if (!domain || !companyByDomain.has(domain)) continue;
    const role = byId.get(e.target);
    if (!role || role.type !== 'open_role') continue;
    const url = safeResearchUrl(role.url);
    const title = String(role.title || '').trim();
    if (!url || !title || title.length > 300) continue;
    const n = per.get(domain) || 0;
    if (n >= cap) continue;
    per.set(domain, n + 1);
    // external_id from role id tail (provider|slug|jobId) or url hash
    const ext =
      String(role.id || '')
        .replace(/^role:/, '')
        .slice(0, 200) || crypto.createHash('sha256').update(url).digest('hex').slice(0, 24);
    out.push({
      company_id: companyByDomain.get(domain),
      external_id: ext,
      source: 'demigod',
      title: title.slice(0, 300),
      location: role.location ? String(role.location).slice(0, 200) : null,
      is_remote: isRemoteLocation(role.location) ? 1 : 0,
      url,
      function_family: categorizeRole(title),
      no_agency_disclaimer: role.agencyPolicyEvidence?.status === 'supported' ? 1 : 0,
    });
  }
  return out;
}

export function buildImportPlan(exportDoc, { limit = null } = {}) {
  const pack = buildSeedPack(exportDoc);
  const planned = [];
  let skipped = 0;
  for (const { seed, demigod } of pack.entries) {
    if (limit != null && planned.length >= limit) break;
    const row = planCompanyRow(seed, demigod);
    if (!row) {
      skipped++;
      continue;
    }
    planned.push(row);
  }
  return {
    schema: SCHEMA,
    at: new Date().toISOString(),
    counts: { seeds: pack.counts.seeds, planned: planned.length, skipped },
    rows: planned,
  };
}

function openDb(dbPath, { readOnly = false } = {}) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`recruitAI db missing: ${dbPath}`);
  }
  return new DatabaseSync(dbPath, readOnly ? { readOnly: true } : {});
}

function existingByDomain(db) {
  const map = new Map();
  for (const row of db.prepare('SELECT id, domain, name, status, reviewed, open_req_count FROM company').all()) {
    if (row.domain) map.set(String(row.domain).toLowerCase(), row);
  }
  return map;
}

function classifyPlan(planRows, existing) {
  const insert = [];
  const update = [];
  const skipReviewed = [];
  const skipNoDomain = [];
  for (const row of planRows) {
    if (!row.domain) {
      // Domain is the natural key in recruitAI; name-only seeds stay dry-run report only.
      skipNoDomain.push(row);
      continue;
    }
    const cur = existing.get(row.domain);
    if (!cur) {
      insert.push(row);
      continue;
    }
    if (cur.reviewed === 1 || (cur.status && !['discovered', 'enriched'].includes(cur.status))) {
      skipReviewed.push({ id: cur.id, domain: row.domain, status: cur.status, reviewed: cur.reviewed });
      continue;
    }
    update.push({ ...row, existingId: cur.id });
  }
  return { insert, update, skipReviewed, skipNoDomain };
}

function backupDb(dbPath) {
  const dir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(dir, `recruitai-pre-import-${stamp}.db`);
  fs.copyFileSync(dbPath, dest);
  try {
    fs.chmodSync(dest, 0o600);
  } catch {
    /* */
  }
  return dest;
}

function applyPlan(dbPath, classified, reqs = []) {
  const backup = backupDb(dbPath);
  const db = openDb(dbPath, { readOnly: false });
  const now = Date.now();
  let inserted = 0;
  let updated = 0;
  let reqsInserted = 0;
  let reqsUpdated = 0;
  try {
    db.exec('BEGIN IMMEDIATE');
    const ins = db.prepare(`
      INSERT INTO company (
        id, domain, name, name_norm, website, careers_url,
        ats_platform, ats_token, open_req_count, stale_req_count, max_days_open,
        has_inhouse_ta, no_agency_policy, in_bay_area, status, notes, created_at, updated_at
      ) VALUES (
        @id, @domain, @name, @name_norm, @website, @careers_url,
        @ats_platform, @ats_token, @open_req_count, @stale_req_count, @max_days_open,
        @has_inhouse_ta, @no_agency_policy, @in_bay_area, @status, @notes, @created_at, @updated_at
      )
    `);
    const upd = db.prepare(`
      UPDATE company SET
        name = @name,
        name_norm = @name_norm,
        website = COALESCE(website, @website),
        careers_url = COALESCE(careers_url, @careers_url),
        ats_platform = COALESCE(ats_platform, @ats_platform),
        ats_token = COALESCE(ats_token, @ats_token),
        open_req_count = @open_req_count,
        stale_req_count = @stale_req_count,
        max_days_open = @max_days_open,
        has_inhouse_ta = CASE
          WHEN @has_inhouse_ta IS NOT NULL THEN @has_inhouse_ta
          ELSE has_inhouse_ta
        END,
        no_agency_policy = CASE
          WHEN @no_agency_policy = 1 THEN 1
          ELSE no_agency_policy
        END,
        notes = CASE
          WHEN notes IS NULL OR notes = '' THEN @notes
          WHEN instr(notes, 'demigod import') > 0 THEN notes
          ELSE notes || ' · ' || @notes
        END,
        updated_at = @updated_at
      WHERE id = @existingId
    `);
    const audit = db.prepare(`
      INSERT INTO audit_log (actor, action, entity, entity_id, after_json, note)
      VALUES ('job:demigod-import', @action, 'company', @entity_id, @after_json, @note)
    `);

    for (const row of classified.insert) {
      ins.run({
        id: row.id,
        domain: row.domain,
        name: row.name,
        name_norm: row.name_norm,
        website: row.website,
        careers_url: row.careers_url,
        ats_platform: row.ats_platform,
        ats_token: row.ats_token,
        open_req_count: row.open_req_count,
        stale_req_count: row.stale_req_count,
        max_days_open: row.max_days_open,
        has_inhouse_ta: row.has_inhouse_ta,
        no_agency_policy: row.no_agency_policy,
        in_bay_area: row.in_bay_area,
        status: row.status,
        notes: row.notes,
        created_at: now,
        updated_at: now,
      });
      audit.run({
        action: 'import_insert',
        entity_id: row.id,
        after_json: JSON.stringify({
          domain: row.domain,
          open_req_count: row.open_req_count,
          mapCompanyId: row.mapCompanyId,
        }),
        note: 'demigod-recruitai-import',
      });
      inserted++;
    }
    for (const row of classified.update) {
      upd.run({
        existingId: row.existingId,
        name: row.name,
        name_norm: row.name_norm,
        website: row.website,
        careers_url: row.careers_url,
        ats_platform: row.ats_platform,
        ats_token: row.ats_token,
        open_req_count: row.open_req_count,
        stale_req_count: row.stale_req_count,
        max_days_open: row.max_days_open,
        has_inhouse_ta: row.has_inhouse_ta,
        no_agency_policy: row.no_agency_policy,
        notes: row.notes,
        updated_at: now,
      });
      audit.run({
        action: 'import_update',
        entity_id: row.existingId,
        after_json: JSON.stringify({
          domain: row.domain,
          open_req_count: row.open_req_count,
          mapCompanyId: row.mapCompanyId,
        }),
        note: 'demigod-recruitai-import',
      });
      updated++;
    }

    if (reqs.length) {
      const hasReq = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='req'`,
        )
        .get();
      if (hasReq) {
        const findReq = db.prepare(
          `SELECT id FROM req WHERE company_id = ? AND external_id = ? AND source = ?`,
        );
        const insReq = db.prepare(`
          INSERT INTO req (
            company_id, external_id, source, title, location, is_remote, url,
            function_family, no_agency_disclaimer, first_seen_at, last_seen_at
          ) VALUES (
            @company_id, @external_id, @source, @title, @location, @is_remote, @url,
            @function_family, @no_agency_disclaimer, @first_seen_at, @last_seen_at
          )
        `);
        const updReq = db.prepare(`
          UPDATE req SET
            title = @title,
            location = @location,
            is_remote = @is_remote,
            url = @url,
            function_family = @function_family,
            no_agency_disclaimer = CASE
              WHEN @no_agency_disclaimer = 1 THEN 1
              ELSE no_agency_disclaimer
            END,
            last_seen_at = @last_seen_at
          WHERE id = @id
        `);
        for (const r of reqs) {
          const existing = findReq.get(r.company_id, r.external_id, r.source);
          if (existing) {
            updReq.run({
              id: existing.id,
              title: r.title,
              location: r.location,
              is_remote: r.is_remote,
              url: r.url,
              function_family: r.function_family,
              no_agency_disclaimer: r.no_agency_disclaimer,
              last_seen_at: now,
            });
            reqsUpdated++;
          } else {
            insReq.run({
              company_id: r.company_id,
              external_id: r.external_id,
              source: r.source,
              title: r.title,
              location: r.location,
              is_remote: r.is_remote,
              url: r.url,
              function_family: r.function_family,
              no_agency_disclaimer: r.no_agency_disclaimer,
              first_seen_at: now,
              last_seen_at: now,
            });
            reqsInserted++;
          }
        }
      }
    }

    db.exec('COMMIT');
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* */
    }
    throw e;
  } finally {
    db.close();
  }
  return { backup, inserted, updated, reqsInserted, reqsUpdated };
}

function runImport({
  dbPath = DEFAULT_DB,
  apply = false,
  limit = null,
  importReqs = false,
  reqsPerCompany = 3,
  exportDoc = null,
} = {}) {
  const source = exportDoc || loadRecruitaiExport({ committedOnly: true });
  const plan = buildImportPlan(source, { limit });
  const db = openDb(dbPath, { readOnly: true });
  let existing;
  try {
    existing = existingByDomain(db);
  } finally {
    db.close();
  }
  const classified = classifyPlan(plan.rows, existing);

  // Domain → company_id after planned inserts/updates
  const companyByDomain = new Map();
  for (const [domain, row] of existing) companyByDomain.set(domain, row.id);
  for (const row of classified.insert) companyByDomain.set(row.domain, row.id);
  for (const row of classified.update) companyByDomain.set(row.domain, row.existingId);

  let reqs = [];
  if (importReqs) {
    reqs = planReqsFromExport(source, companyByDomain, { perCompany: reqsPerCompany });
  }

  const receipt = {
    schema: SCHEMA,
    at: plan.at,
    mode: apply ? 'apply' : 'dry-run',
    source: exportDoc ? 'explicit-test-fixture' : 'committed-export',
    dbPath,
    counts: {
      ...plan.counts,
      existingCompanies: existing.size,
      wouldInsert: classified.insert.length,
      wouldUpdate: classified.update.length,
      skipReviewed: classified.skipReviewed.length,
      skipNoDomain: classified.skipNoDomain.length,
      wouldImportReqs: reqs.length,
    },
    sampleInsert: classified.insert.slice(0, 5).map((r) => ({
      id: r.id,
      domain: r.domain,
      name: r.name,
      open_req_count: r.open_req_count,
      has_inhouse_ta: r.has_inhouse_ta,
      no_agency_policy: r.no_agency_policy,
    })),
    sampleUpdate: classified.update.slice(0, 5).map((r) => ({
      id: r.existingId,
      domain: r.domain,
      open_req_count: r.open_req_count,
    })),
    sampleReqs: reqs.slice(0, 5).map((r) => ({
      company_id: r.company_id,
      title: r.title,
      function_family: r.function_family,
    })),
    policy:
      'Companies (+ optional sample open reqs). No contacts/drafts/sends/scores/fees. has_inhouse_ta and no_agency_policy positive-only. Dry-run default.',
  };

  if (!apply) {
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
    return receipt;
  }

  const result = applyPlan(dbPath, classified, reqs);
  receipt.applied = result;
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  atomicWrite(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  return receipt;
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`recruitai-import selftest: ${m}`);
  };
  assert(nameNorm('Stripe, Inc.') === 'stripe', 'nameNorm strips Inc');
  assert(companyId({ domain: 'stripe.com', name: 'Stripe' }) === 'dg:stripe.com', 'id domain');
  assert(companyId({ name: 'No Domain Co' }).startsWith('dg:n:'), 'id name hash');

  const row = planCompanyRow(
    { name: 'Acme', domain: 'acme.test' },
    {
      openReqCount: 12,
      staleAttributedPostedReqCount: 3,
      maxObservedOpenDays: 4,
      openPeopleOpsReqCount: 2,
      noAgencyEvidenceReqCount: 0,
      jobsUrl: 'https://boards.greenhouse.io/acme',
      boardKey: { provider: 'Greenhouse', slug: 'acme' },
      mapCompanyId: 'yc:acme',
    },
  );
  assert(row.id === 'dg:acme.test' && row.open_req_count === 12, 'plan basics');
  assert(row.has_inhouse_ta === 1, 'people ops positive');
  assert(row.no_agency_policy === 0, 'no agency silence stays 0');
  assert(row.careers_url?.includes('greenhouse'), 'careers url');
  assert(planCompanyRow({ name: '' }) === null, 'empty name');
  assert(
    planCompanyRow(
      { name: 'Beta', domain: 'beta.test' },
      { openPeopleOpsReqCount: 0, noAgencyEvidenceReqCount: 1 },
    ).no_agency_policy === 1,
    'no-agency positive',
  );
  assert(
    planCompanyRow(
      { name: 'Gamma', domain: 'gamma.test' },
      { openPeopleOpsReqCount: 0 },
    ).has_inhouse_ta === null,
    'no people ops ⇒ unknown not false',
  );
  assert(
    parseImportArgs(['--apply', '--reqs', '--reqs-per-company=5']).apply === true,
    'strict CLI valid path',
  );
  for (const bad of [
    ['--bogus'],
    ['--apply', '--dry-run'],
    ['--limit', '12x'],
    ['--reqs-per-company=26'],
    ['--pack', '/tmp/uncommitted'],
  ]) {
    let refused = false;
    try {
      parseImportArgs(bad);
    } catch {
      refused = true;
    }
    assert(refused, `strict CLI refuses ${bad.join(' ')}`);
  }

  {
    const reqs = planReqsFromExport(
      {
        relationships: {
          nodes: [
            { id: 'company:c1', type: 'company', domain: 'acme.test', label: 'Acme' },
            { id: 'board:Greenhouse|acme', type: 'ats_board', provider: 'Greenhouse', slug: 'acme' },
            {
              id: 'role:Greenhouse|acme|1',
              type: 'open_role',
              title: 'Staff Engineer',
              location: 'Remote, US',
              url: 'https://boards.greenhouse.io/acme/jobs/1',
            },
          ],
          edges: [
            { type: 'uses_board', source: 'company:c1', target: 'board:Greenhouse|acme' },
            {
              type: 'has_open_role',
              source: 'board:Greenhouse|acme',
              target: 'role:Greenhouse|acme|1',
            },
          ],
        },
      },
      new Map([['acme.test', 'dg:acme.test']]),
      { perCompany: 3 },
    );
    assert(reqs.length === 1 && reqs[0].function_family === 'engineering', 'plan reqs');
    assert(reqs[0].is_remote === 1, 'remote flag');
  }

  // Temp DB with subset of real schema + audit_log
  const tmp = fs.mkdtempSync(path.join('/tmp', 'dg-recruitai-import-'));
  const dbPath = path.join(tmp, 'recruitai.db');
  const exportDoc = {
    schema: 'demigod.recruitai-export/6',
    rows: [
      {
        name: 'Acme',
        domain: 'acme.test',
        openReqCount: 5,
        openPeopleOpsReqCount: 1,
        noAgencyEvidenceReqCount: 0,
        staleAttributedPostedReqCount: 1,
        maxObservedOpenDays: 4,
        jobsUrl: 'https://boards.greenhouse.io/acme',
        boardKey: { provider: 'Greenhouse', slug: 'acme' },
        mapCompanyId: 'yc:acme',
      },
      { name: 'Keep Co', domain: 'keep.test', openReqCount: 99, openPeopleOpsReqCount: 0 },
      { name: 'No Domain Only' },
    ],
    relationships: {
      nodes: [
        { id: 'company:c1', type: 'company', domain: 'acme.test', label: 'Acme' },
        { id: 'board:Greenhouse|acme', type: 'ats_board', provider: 'Greenhouse', slug: 'acme' },
        {
          id: 'role:Greenhouse|acme|1',
          type: 'open_role',
          title: 'Staff Engineer',
          location: 'Remote, US',
          url: 'https://boards.greenhouse.io/acme/jobs/1',
        },
      ],
      edges: [
        { type: 'uses_board', source: 'company:c1', target: 'board:Greenhouse|acme' },
        {
          type: 'has_open_role',
          source: 'board:Greenhouse|acme',
          target: 'role:Greenhouse|acme|1',
        },
      ],
    },
  };
  try {
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE company (
        id TEXT PRIMARY KEY,
        domain TEXT UNIQUE,
        canonical_id TEXT,
        name TEXT NOT NULL,
        name_norm TEXT NOT NULL,
        website TEXT,
        careers_url TEXT,
        ats_platform TEXT,
        ats_token TEXT,
        open_req_count INTEGER NOT NULL DEFAULT 0,
        stale_req_count INTEGER NOT NULL DEFAULT 0,
        max_days_open INTEGER,
        has_inhouse_ta INTEGER,
        no_agency_policy INTEGER NOT NULL DEFAULT 0,
        in_bay_area INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'discovered',
        reviewed INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY,
        at INTEGER NOT NULL DEFAULT 0,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        before_json TEXT,
        after_json TEXT,
        note TEXT
      ) STRICT;
      CREATE TABLE req (
        id INTEGER PRIMARY KEY,
        company_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        location TEXT,
        is_remote INTEGER NOT NULL DEFAULT 0,
        url TEXT,
        function_family TEXT,
        no_agency_disclaimer INTEGER NOT NULL DEFAULT 0,
        first_seen_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        UNIQUE(company_id, external_id, source)
      ) STRICT;
    `);
    // Pre-existing reviewed row must not be clobbered
    db.prepare(
      `INSERT INTO company (id,domain,name,name_norm,open_req_count,status,reviewed,created_at,updated_at)
       VALUES ('x:keep','keep.test','Keep','keep',1,'approved',1,1,1)`,
    ).run();
    db.close();

    const dry = runImport({ exportDoc, dbPath, apply: false, importReqs: true });
    assert(dry.mode === 'dry-run', 'dry mode');
    assert(dry.counts.wouldInsert === 1, `insert1 got ${dry.counts.wouldInsert}`);
    assert(dry.counts.skipReviewed === 1, 'skip reviewed');
    assert(dry.counts.skipNoDomain === 1, 'skip no domain');
    assert(dry.counts.wouldImportReqs === 1, 'dry req plan');

    const applied = runImport({ exportDoc, dbPath, apply: true, importReqs: true });
    assert(applied.applied.inserted === 1, 'applied insert');
    assert(applied.applied.updated === 0, 'no update on first apply');
    assert(applied.applied.reqsInserted === 1, 'req insert');
    assert(fs.existsSync(applied.applied.backup), 'backup exists');

    const db2 = new DatabaseSync(dbPath, { readOnly: true });
    const acme = db2.prepare('SELECT * FROM company WHERE domain = ?').get('acme.test');
    assert(acme && acme.open_req_count === 5 && acme.has_inhouse_ta === 1, 'row written');
    assert(acme.ats_platform === 'Greenhouse' && acme.ats_token === 'acme', 'ats');
    const keep = db2.prepare('SELECT * FROM company WHERE domain = ?').get('keep.test');
    assert(keep.open_req_count === 1 && keep.status === 'approved', 'reviewed untouched');
    const audits = db2.prepare('SELECT COUNT(*) c FROM audit_log').get().c;
    assert(audits === 1, 'audit row');
    const req = db2.prepare('SELECT * FROM req').get();
    assert(req?.function_family === 'engineering' && req.is_remote === 1, 'req written');
    db2.close();

    // Second apply updates company + same req instead of duplicating either.
    Object.assign(exportDoc.rows[0], {
      openReqCount: 7,
      noAgencyEvidenceReqCount: 1,
      staleAttributedPostedReqCount: 2,
      maxObservedOpenDays: 5,
    });
    exportDoc.relationships.nodes.find((node) => node.type === 'open_role').title =
      'Staff Platform Engineer';
    const up = runImport({ exportDoc, dbPath, apply: true, importReqs: true });
    assert(up.applied.updated === 1, 'update path');
    assert(up.applied.reqsUpdated === 1 && up.applied.reqsInserted === 0, 'req update path');
    const db3 = new DatabaseSync(dbPath, { readOnly: true });
    const acme2 = db3.prepare('SELECT open_req_count, no_agency_policy FROM company WHERE domain = ?').get(
      'acme.test',
    );
    assert(acme2.open_req_count === 7 && acme2.no_agency_policy === 1, 'updated signals');
    assert(db3.prepare('SELECT COUNT(*) c FROM req').get().c === 1, 'req idempotent');
    assert(db3.prepare('SELECT title FROM req').get().title === 'Staff Platform Engineer', 'req refreshed');
    db3.close();
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ ok: true, selftest: 'recruitai-import' }));
}

function positiveInt(raw, name, max = Number.MAX_SAFE_INTEGER) {
  if (!/^[1-9]\d*$/.test(String(raw || ''))) throw new Error(`${name} must be a positive integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > max) throw new Error(`${name} is out of range`);
  return value;
}

export function parseImportArgs(args = []) {
  const options = {
    apply: false,
    dbPath: DEFAULT_DB,
    limit: null,
    importReqs: false,
    reqsPerCompany: 3,
  };
  const seen = new Set();
  const once = (key) => {
    if (seen.has(key)) throw new Error(`duplicate ${key}`);
    seen.add(key);
  };
  const valueAfter = (index, flag) => {
    const value = args[index + 1];
    if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value`);
    return value;
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply' || arg === '--dry-run') {
      once('mode');
      options.apply = arg === '--apply';
    } else if (arg === '--reqs') {
      once('--reqs');
      options.importReqs = true;
    } else if (arg === '--db') {
      once('--db');
      options.dbPath = valueAfter(i, arg);
      i++;
    } else if (arg === '--limit') {
      once('--limit');
      options.limit = positiveInt(valueAfter(i, arg), '--limit');
      i++;
    } else if (arg === '--reqs-per-company') {
      once('--reqs-per-company');
      options.reqsPerCompany = positiveInt(valueAfter(i, arg), arg, 25);
      i++;
    } else if (arg.startsWith('--reqs-per-company=')) {
      once('--reqs-per-company');
      options.reqsPerCompany = positiveInt(arg.slice(arg.indexOf('=') + 1), '--reqs-per-company', 25);
    } else {
      throw new Error(`unknown argument ${arg}`);
    }
  }
  return options;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--selftest') {
    selftest();
    return;
  }
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log(`usage: node demigod-recruitai-import.mjs [--dry-run|--apply] [--db PATH] [--limit N] [--reqs] [--reqs-per-company N] [--selftest]
  dry-run (default)  plan inserts/updates against recruitAI SQLite; write receipt only
  --apply            backup DB then insert/update company rows (no contacts)
  --db PATH          default ~/.config/recruitai/recruitai.db
  --limit N          cap planned seeds
  --reqs             include public sample open-role rows
  --reqs-per-company N  1..25, default 3
`);
    process.exit(0);
  }
  try {
    const receipt = runImport(parseImportArgs(args));
    console.log(
      JSON.stringify(
        {
          ok: true,
          ...receipt.counts,
          mode: receipt.mode,
          sampleInsert: receipt.sampleInsert,
          sampleReqs: receipt.sampleReqs,
          applied: receipt.applied || null,
          receipt: RECEIPT,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }));
    process.exit(1);
  }
}

if (isMain) main();
