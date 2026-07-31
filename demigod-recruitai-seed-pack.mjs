#!/usr/bin/env node
/**
 * demigod-recruitai-seed-pack — map committed export/3 → recruitAI CompanySeed + Demigod signals.
 *
 * recruitAI (lalalune/recruitai-claude v0.1.1) upserts companies as:
 *   { name, domain?, website? }
 * It does not yet import Demigod's full export. This pack is the honest adapter:
 *   - company-seeds.jsonl  — one seed per line (upstream-shaped)
 *   - demigod-signals.json  — full Demigod hiring signals keyed by domain/mapCompanyId
 *   - DEMIGOD-HIRING-HISTORY.jsonl — typed daily observations for 7/30d velocity
 *   - seed-pack.json        — envelope for tools/desk
 *
 * Never invents contacts, scores, fees, or send state.
 *
 *   node demigod-recruitai-seed-pack.mjs [--out dir]
 *   node demigod-recruitai-seed-pack.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';
import { loadRecruitaiExport } from './demigod-lead-sourcer.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const HISTORY = path.join(ROOT, 'DEMIGOD-HIRING-HISTORY.jsonl');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const SCHEMA = 'demigod.recruitai-seed-pack/1';
const SIGNAL_OBSERVATION_SCHEMA = 'demigod.hiring-signal-observation/1';

const isDay = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

function assertSignalObservation(row) {
  const counts = row?.counts;
  if (
    row?.schema !== SIGNAL_OBSERVATION_SCHEMA ||
    row.kind !== 'role-ledger-change' ||
    !isDay(row.date) ||
    !Number.isFinite(Date.parse(row.at)) ||
    !Number.isFinite(Date.parse(row.exportGeneratedAt)) ||
    row.changeBasis !== 'ledger-observation' ||
    !counts ||
    !Array.isArray(row.changes) ||
    ![
      counts.accounts,
      counts.changedAccounts,
      counts.firstObservedTodayReqs,
      counts.firstObservedTodayOlderPostedReqs,
      counts.closedTodayReqs,
    ].every(isCount) ||
    counts.changedAccounts !== row.changes.length ||
    counts.changedAccounts > counts.accounts
  ) {
    throw new Error('invalid hiring signal observation');
  }
  const ids = new Set();
  let firstObserved = 0;
  let olderPosted = 0;
  let closed = 0;
  for (const change of row.changes) {
    if (
      typeof change?.mapCompanyId !== 'string' ||
      !change.mapCompanyId.trim() ||
      ids.has(change.mapCompanyId) ||
      typeof change.name !== 'string' ||
      !change.name.trim() ||
      change.name.length > 200 ||
      (change.domain !== null &&
        (typeof change.domain !== 'string' || change.domain.length > 253)) ||
      ![
        change.firstObservedTodayReqCount,
        change.firstObservedTodayOlderPostedReqCount,
        change.closedTodayReqCount,
      ].every(isCount) ||
      change.firstObservedTodayOlderPostedReqCount >
        change.firstObservedTodayReqCount
    ) {
      throw new Error('invalid hiring signal account change');
    }
    ids.add(change.mapCompanyId);
    firstObserved += change.firstObservedTodayReqCount;
    olderPosted += change.firstObservedTodayOlderPostedReqCount;
    closed += change.closedTodayReqCount;
  }
  if (
    firstObserved !== counts.firstObservedTodayReqs ||
    olderPosted !== counts.firstObservedTodayOlderPostedReqs ||
    closed !== counts.closedTodayReqs
  ) {
    throw new Error('hiring signal observation counts diverge');
  }
}

const signalObservationState = (row) =>
  JSON.stringify(row, (key, value) =>
    ['schema', 'kind', 'at', 'exportGeneratedAt'].includes(key) ? undefined : value,
  );

export function recordSignalObservation(pack, changes, historyPath = HISTORY) {
  const observation = {
    schema: SIGNAL_OBSERVATION_SCHEMA,
    kind: 'role-ledger-change',
    date: pack.changeDate,
    at: pack.at,
    exportGeneratedAt: pack.exportGeneratedAt,
    changeBasis: pack.changeBasis,
    counts: {
      accounts: pack.entries.length,
      changedAccounts: changes.length,
      firstObservedTodayReqs: changes.reduce(
        (sum, row) => sum + row.firstObservedTodayReqCount,
        0,
      ),
      firstObservedTodayOlderPostedReqs: changes.reduce(
        (sum, row) => sum + row.firstObservedTodayOlderPostedReqCount,
        0,
      ),
      closedTodayReqs: changes.reduce(
        (sum, row) => sum + row.closedTodayReqCount,
        0,
      ),
    },
    changes: changes.map((row) => ({
      mapCompanyId: row.mapCompanyId,
      name: row.name,
      domain: row.domain,
      firstObservedTodayReqCount: row.firstObservedTodayReqCount,
      firstObservedTodayOlderPostedReqCount:
        row.firstObservedTodayOlderPostedReqCount,
      closedTodayReqCount: row.closedTodayReqCount,
    })),
  };
  assertSignalObservation(observation);

  return withFileLock(`${historyPath}.lock`, () => {
    const rows = fs.existsSync(historyPath)
      ? fs
          .readFileSync(historyPath, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      : [];
    const observations = rows.filter((row) => row?.kind === 'role-ledger-change');
    observations.forEach(assertSignalObservation);
    const state = signalObservationState(observation);
    if (
      !observations.some(
        (row) =>
          row.exportGeneratedAt === observation.exportGeneratedAt ||
          signalObservationState(row) === state,
      )
    ) {
      fs.appendFileSync(historyPath, `${JSON.stringify(observation)}\n`, {
        mode: 0o600,
      });
      observations.push(observation);
    }
    fs.chmodSync(historyPath, 0o600);
    return observations;
  });
}

export function buildObservedVelocity(observations, through, windowDays) {
  if (!isDay(through) || !Number.isSafeInteger(windowDays) || windowDays < 1) {
    throw new Error('invalid hiring velocity window');
  }
  const latestByDate = new Map();
  for (const row of observations) {
    assertSignalObservation(row);
    const current = latestByDate.get(row.date);
    if (!current || Date.parse(row.at) > Date.parse(current.at)) {
      latestByDate.set(row.date, row);
    }
  }
  const throughMs = Date.parse(`${through}T00:00:00Z`);
  const rows = [...latestByDate.values()]
    .filter((row) => {
      const age = (throughMs - Date.parse(`${row.date}T00:00:00Z`)) / 86_400_000;
      return age >= 0 && age < windowDays;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const accounts = new Map();
  for (const row of rows) {
    for (const change of row.changes) {
      const account = accounts.get(change.mapCompanyId) || {
        mapCompanyId: change.mapCompanyId,
        name: change.name,
        domain: change.domain,
        changeDays: 0,
        firstObservedReqs: 0,
        firstObservedOlderPostedReqs: 0,
        closedReqs: 0,
      };
      account.name = change.name;
      account.domain = change.domain;
      account.changeDays++;
      account.firstObservedReqs += change.firstObservedTodayReqCount;
      account.firstObservedOlderPostedReqs +=
        change.firstObservedTodayOlderPostedReqCount;
      account.closedReqs += change.closedTodayReqCount;
      accounts.set(change.mapCompanyId, account);
    }
  }
  const accountRows = [...accounts.values()]
    .map((row) => ({
      ...row,
      netObservedReqs: row.firstObservedReqs - row.closedReqs,
    }))
    .sort(
      (a, b) =>
        b.firstObservedReqs +
          b.closedReqs -
          a.firstObservedReqs -
          a.closedReqs ||
        a.name.localeCompare(b.name),
    );
  const firstObservedReqs = rows.reduce(
    (sum, row) => sum + row.counts.firstObservedTodayReqs,
    0,
  );
  const closedReqs = rows.reduce(
    (sum, row) => sum + row.counts.closedTodayReqs,
    0,
  );
  return {
    windowDays,
    observedDays: rows.length,
    from: rows[0]?.date || null,
    through,
    changedAccounts: accountRows.length,
    changedAccountDays: rows.reduce(
      (sum, row) => sum + row.counts.changedAccounts,
      0,
    ),
    firstObservedReqs,
    firstObservedOlderPostedReqs: rows.reduce(
      (sum, row) => sum + row.counts.firstObservedTodayOlderPostedReqs,
      0,
    ),
    closedReqs,
    netObservedReqs: firstObservedReqs - closedReqs,
    accounts: accountRows,
  };
}

/** @param {string|null|undefined} website */
export function websiteFromJobsOrSource(row = {}) {
  const jobs = String(row.jobsUrl || '').trim();
  // Prefer company website when we only have ATS URL — leave website undefined so
  // recruitAI can resolve from domain; do not invent https://stripe.com from board slug.
  return null;
}

/**
 * Build one recruitAI CompanySeed + demigod signal block from an export row.
 * Pure. Drops rows without a usable name.
 */
export function rowToSeedEntry(row = {}) {
  const name = String(row.name || '').trim();
  if (!name || name.length > 200) return null;
  const domain = String(row.domain || '').trim().toLowerCase() || null;
  if (domain && (domain.length > 253 || /[\s@]/.test(domain))) return null;

  const seed = {
    name,
    ...(domain ? { domain } : {}),
    // website optional — only pass credential-free https company pages if present on row
  };
  const site = String(row.website || '').trim();
  if (/^https:\/\//i.test(site) && !/@/.test(site) && site.length < 2048) {
    seed.website = site;
  }

  const demigod = {
    mapCompanyId: row.mapCompanyId || null,
    boardKey: row.boardKey || null,
    openReqCount: Number.isSafeInteger(row.openReqCount) ? row.openReqCount : null,
    firstObservedTodayReqCount: Number.isSafeInteger(row.firstObservedTodayReqCount)
      ? row.firstObservedTodayReqCount
      : null,
    firstObservedTodayOlderPostedReqCount: Number.isSafeInteger(
      row.firstObservedTodayOlderPostedReqCount,
    )
      ? row.firstObservedTodayOlderPostedReqCount
      : null,
    closedTodayReqCount: Number.isSafeInteger(row.closedTodayReqCount)
      ? row.closedTodayReqCount
      : null,
    reopenedOpenReqCount: Number.isSafeInteger(row.reopenedOpenReqCount)
      ? row.reopenedOpenReqCount
      : null,
    maxObservedOpenDays: Number.isSafeInteger(row.maxObservedOpenDays) ? row.maxObservedOpenDays : null,
    maxAttributedPostedDays: Number.isSafeInteger(row.maxAttributedPostedDays)
      ? row.maxAttributedPostedDays
      : null,
    staleAttributedPostedReqCount: Number.isSafeInteger(row.staleAttributedPostedReqCount)
      ? row.staleAttributedPostedReqCount
      : null,
    evergreenAttributedPostedReqCount: Number.isSafeInteger(row.evergreenAttributedPostedReqCount)
      ? row.evergreenAttributedPostedReqCount
      : null,
    openPeopleOpsReqCount: Number.isSafeInteger(row.openPeopleOpsReqCount)
      ? row.openPeopleOpsReqCount
      : null,
    noAgencyEvidenceReqCount: Number.isSafeInteger(row.noAgencyEvidenceReqCount)
      ? row.noAgencyEvidenceReqCount
      : null,
    sampleRoleTitle: row.sampleRoleTitle || null,
    sampleRoleUrl: row.sampleRoleUrl || null,
    samplePeopleOpsRoleTitle: row.samplePeopleOpsRoleTitle || null,
    samplePeopleOpsRoleUrl: row.samplePeopleOpsRoleUrl || null,
    sampleNoAgencyPolicyQuote: row.sampleNoAgencyPolicyQuote || null,
    sampleNoAgencyPolicyUrl: row.sampleNoAgencyPolicyUrl || null,
    jobsUrl: row.jobsUrl || null,
    sourceLicense: row.sourceLicense || null,
    sourceUrl: row.sourceUrl || null,
    ageBasis: row.ageBasis || null,
    researchStatus: row.companyResearch?.status || row.researchStatus || null,
  };

  return { seed, demigod };
}

/**
 * @param {object} exportDoc demigod.recruitai-export/3|4|5|6
 * @param {{ at?: string, generation?: string|null }} meta
 */
export function buildSeedPack(exportDoc = {}, meta = {}) {
  const rows = Array.isArray(exportDoc.rows) ? exportDoc.rows : [];
  const entries = [];
  const seenDomain = new Set();
  const seenName = new Set();
  let skipped = 0;
  let deduped = 0;

  for (const row of rows) {
    const entry = rowToSeedEntry(row);
    if (!entry) {
      skipped++;
      continue;
    }
    const d = entry.seed.domain;
    const n = entry.seed.name.toLowerCase();
    if (d && seenDomain.has(d)) {
      deduped++;
      continue;
    }
    if (!d && seenName.has(n)) {
      deduped++;
      continue;
    }
    if (d) seenDomain.add(d);
    seenName.add(n);
    entries.push(entry);
  }

  // Sort by openReqCount desc then name — agency desk review order, not a "score"
  entries.sort(
    (a, b) =>
      (b.demigod.openReqCount || 0) - (a.demigod.openReqCount || 0) ||
      a.seed.name.localeCompare(b.seed.name),
  );

  const withPeopleOps = entries.filter((e) => (e.demigod.openPeopleOpsReqCount || 0) > 0).length;
  const withNoAgency = entries.filter((e) => (e.demigod.noAgencyEvidenceReqCount || 0) > 0).length;
  const withStalePosted = entries.filter(
    (e) => (e.demigod.staleAttributedPostedReqCount || 0) > 0,
  ).length;

  return {
    schema: SCHEMA,
    at: meta.at || new Date().toISOString(),
    sourceSchema: exportDoc.schema || null,
    generation: meta.generation || null,
    exportGeneratedAt: exportDoc.generatedAt || null,
    changeDate: exportDoc.changeDate || null,
    changeBasis: exportDoc.changeBasis || null,
    counts: {
      exportRows: rows.length,
      seeds: entries.length,
      skipped,
      deduped,
      withPeopleOps,
      withNoAgency,
      withStalePosted,
    },
    note:
      'company-seeds.jsonl matches recruitAI CompanySeed {name,domain?,website?}. ' +
      'demigod-signals.json is Demigod-only hiring signal (not imported by stock v0.1.1). ' +
      'Sort is openReqCount desc for review — not an agency score. No contacts or fees.',
    entries,
  };
}

export function writeSeedPackFiles(pack, outDir, historyPath = HISTORY) {
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(outDir, 0o700);
  } catch {
    /* */
  }

  const jsonl = pack.entries.map((e) => JSON.stringify(e.seed)).join('\n') + (pack.entries.length ? '\n' : '');

  const changes = pack.entries
    .filter(
      (e) =>
        (e.demigod.firstObservedTodayReqCount || 0) +
          (e.demigod.closedTodayReqCount || 0) >
        0,
    )
    .sort(
      (a, b) =>
        (b.demigod.firstObservedTodayReqCount || 0) +
          (b.demigod.closedTodayReqCount || 0) -
          (a.demigod.firstObservedTodayReqCount || 0) -
          (a.demigod.closedTodayReqCount || 0) ||
        a.seed.name.localeCompare(b.seed.name),
    )
    .map((e) => ({
      name: e.seed.name,
      domain: e.seed.domain || null,
      mapCompanyId: e.demigod.mapCompanyId,
      boardKey: e.demigod.boardKey,
      jobsUrl: e.demigod.jobsUrl,
      openReqCount: e.demigod.openReqCount,
      firstObservedTodayReqCount: e.demigod.firstObservedTodayReqCount,
      firstObservedTodayOlderPostedReqCount:
        e.demigod.firstObservedTodayOlderPostedReqCount,
      closedTodayReqCount: e.demigod.closedTodayReqCount,
      reopenedOpenReqCount: e.demigod.reopenedOpenReqCount,
    }));
  const observations = recordSignalObservation(pack, changes, historyPath);
  const velocity = {
    basis:
      'exact ledger-observation sums; latest snapshot per observed date; no inferred rate',
    observed7d: buildObservedVelocity(observations, pack.changeDate, 7),
    observed30d: buildObservedVelocity(observations, pack.changeDate, 30),
  };
  atomicWrite(path.join(outDir, 'company-seeds.jsonl'), jsonl, { mode: 0o600 });
  const signals = {
    schema: 'demigod.recruitai-signals/3',
    at: pack.at,
    sourceSchema: pack.sourceSchema,
    exportGeneratedAt: pack.exportGeneratedAt,
    changeDate: pack.changeDate,
    changeBasis: pack.changeBasis,
    counts: {
      accounts: pack.entries.length,
      changedAccounts: changes.length,
      firstObservedTodayReqs: changes.reduce(
        (sum, row) => sum + row.firstObservedTodayReqCount,
        0,
      ),
      firstObservedTodayOlderPostedReqs: changes.reduce(
        (sum, row) => sum + row.firstObservedTodayOlderPostedReqCount,
        0,
      ),
      closedTodayReqs: changes.reduce((sum, row) => sum + row.closedTodayReqCount, 0),
      observedHistoryDays: new Set(observations.map((row) => row.date)).size,
    },
    changes,
    velocity,
    byDomain: Object.fromEntries(
      pack.entries
        .filter((e) => e.seed.domain)
        .map((e) => [e.seed.domain, { name: e.seed.name, ...e.demigod }]),
    ),
    byMapCompanyId: Object.fromEntries(
      pack.entries
        .filter((e) => e.demigod.mapCompanyId)
        .map((e) => [e.demigod.mapCompanyId, { name: e.seed.name, domain: e.seed.domain, ...e.demigod }]),
    ),
  };
  atomicWrite(path.join(outDir, 'demigod-signals.json'), `${JSON.stringify(signals, null, 2)}\n`, {
    mode: 0o600,
  });

  // Envelope without full entries dump redundancy — include counts + paths
  const envelope = {
    schema: pack.schema,
    at: pack.at,
    sourceSchema: pack.sourceSchema,
    generation: pack.generation,
    exportGeneratedAt: pack.exportGeneratedAt,
    changeDate: pack.changeDate,
    changeBasis: pack.changeBasis,
    counts: pack.counts,
    note: pack.note,
    files: {
      companySeedsJsonl: 'company-seeds.jsonl',
      demigodSignals: 'demigod-signals.json',
      seedPack: 'seed-pack.json',
    },
    // Top 25 for quick glance in desk-status UIs
    topByOpenReq: pack.entries.slice(0, 25).map((e) => ({
      name: e.seed.name,
      domain: e.seed.domain,
      openReqCount: e.demigod.openReqCount,
      maxObservedOpenDays: e.demigod.maxObservedOpenDays,
      openPeopleOpsReqCount: e.demigod.openPeopleOpsReqCount,
      staleAttributedPostedReqCount: e.demigod.staleAttributedPostedReqCount,
    })),
  };
  atomicWrite(path.join(outDir, 'seed-pack.json'), `${JSON.stringify(envelope, null, 2)}\n`, {
    mode: 0o600,
  });

  return envelope;
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`seed-pack selftest: ${m}`);
  };
  const row = {
    mapCompanyId: 'yc:acme',
    domain: 'acme.test',
    name: 'Acme',
    boardKey: { provider: 'Greenhouse', slug: 'acme' },
    openReqCount: 12,
    firstObservedTodayReqCount: 2,
    firstObservedTodayOlderPostedReqCount: 1,
    closedTodayReqCount: 1,
    reopenedOpenReqCount: 1,
    maxObservedOpenDays: 4,
    staleAttributedPostedReqCount: 3,
    openPeopleOpsReqCount: 1,
    noAgencyEvidenceReqCount: 0,
    sampleRoleTitle: 'Staff Eng',
    sampleRoleUrl: 'https://boards.greenhouse.io/acme/jobs/1',
    jobsUrl: 'https://boards.greenhouse.io/acme',
    sourceLicense: 'YC-public',
  };
  const e = rowToSeedEntry(row);
  assert(e.seed.name === 'Acme' && e.seed.domain === 'acme.test', 'seed shape');
  assert(!('website' in e.seed), 'no invented website');
  assert(e.demigod.openReqCount === 12 && e.demigod.openPeopleOpsReqCount === 1, 'signals');
  assert(
    e.demigod.firstObservedTodayReqCount === 2 &&
      e.demigod.closedTodayReqCount === 1,
    'change signals',
  );
  assert(rowToSeedEntry({ name: '' }) === null, 'empty name dropped');
  assert(rowToSeedEntry({ name: 'X', domain: 'bad domain' }) === null, 'bad domain dropped');

  const pack = buildSeedPack(
    {
      schema: 'demigod.recruitai-export/6',
      generatedAt: '2026-07-30T00:00:00.000Z',
      changeDate: '2026-07-30',
      changeBasis: 'ledger-observation',
      rows: [
        row,
        { ...row, mapCompanyId: 'yc:acme2', name: 'Acme Dup', domain: 'acme.test' }, // domain dedupe
        {
          ...row,
          mapCompanyId: 'yc:beta',
          name: 'Beta',
          domain: 'beta.test',
          openReqCount: 99,
          firstObservedTodayReqCount: 0,
          firstObservedTodayOlderPostedReqCount: 0,
          closedTodayReqCount: 4,
        },
        { name: '' },
      ],
    },
    { at: '2026-07-30T12:00:00.000Z' },
  );
  assert(pack.counts.seeds === 2, `seeds=2 got ${pack.counts.seeds}`);
  assert(pack.counts.deduped === 1, 'domain dedupe');
  assert(pack.entries[0].seed.name === 'Beta', 'sorted by openReqCount');
  assert(pack.schema === SCHEMA, 'schema');

  const tmp = fs.mkdtempSync(path.join('/tmp', 'dg-seed-pack-'));
  try {
    const history = path.join(tmp, 'history.jsonl');
    const env = writeSeedPackFiles(pack, tmp, history);
    assert(env.counts.seeds === 2, 'write envelope');
    const lines = fs.readFileSync(path.join(tmp, 'company-seeds.jsonl'), 'utf8').trim().split('\n');
    assert(lines.length === 2, 'jsonl lines');
    const s0 = JSON.parse(lines[0]);
    assert(s0.name === 'Beta' && s0.domain === 'beta.test', 'jsonl seed');
    const sig = JSON.parse(fs.readFileSync(path.join(tmp, 'demigod-signals.json'), 'utf8'));
    assert(sig.byDomain['beta.test'].openReqCount === 99, 'signals by domain');
    assert(
      sig.schema === 'demigod.recruitai-signals/3' &&
        sig.changeDate === '2026-07-30' &&
        sig.changeBasis === 'ledger-observation',
      'signals provenance',
    );
    assert(
      sig.counts.changedAccounts === 2 &&
        sig.counts.firstObservedTodayReqs === 2 &&
        sig.counts.closedTodayReqs === 5 &&
        sig.counts.observedHistoryDays === 1 &&
        sig.changes[0].name === 'Beta',
      'account change feed',
    );
    const nextPack = buildSeedPack(
      {
        schema: 'demigod.recruitai-export/6',
        generatedAt: '2026-07-31T00:00:00.000Z',
        changeDate: '2026-07-31',
        changeBasis: 'ledger-observation',
        rows: [
          {
            ...row,
            firstObservedTodayReqCount: 1,
            firstObservedTodayOlderPostedReqCount: 0,
            closedTodayReqCount: 0,
          },
        ],
      },
      { at: '2026-07-31T12:00:00.000Z' },
    );
    writeSeedPackFiles(nextPack, tmp, history);
    writeSeedPackFiles(
      {
        ...nextPack,
        at: '2026-07-31T13:00:00.000Z',
        exportGeneratedAt: '2026-07-31T01:00:00.000Z',
      },
      tmp,
      history,
    );
    const trended = JSON.parse(
      fs.readFileSync(path.join(tmp, 'demigod-signals.json'), 'utf8'),
    );
    assert(
      trended.velocity.observed7d.observedDays === 2 &&
        trended.velocity.observed7d.firstObservedReqs === 3 &&
        trended.velocity.observed7d.closedReqs === 5 &&
        trended.velocity.observed7d.netObservedReqs === -2 &&
        trended.velocity.observed30d.accounts[0].mapCompanyId === 'yc:acme',
      'observed velocity windows',
    );
    assert(
      fs.readFileSync(history, 'utf8').trim().split('\n').length === 2,
      'unchanged same-day signal is idempotent across export generations',
    );
    const beforePoison = fs.readFileSync(
      path.join(tmp, 'demigod-signals.json'),
      'utf8',
    );
    const poisoned = JSON.parse(
      fs.readFileSync(history, 'utf8').trim().split('\n').at(-1),
    );
    poisoned.counts.closedTodayReqs++;
    fs.appendFileSync(history, `${JSON.stringify(poisoned)}\n`);
    let poisonFailed = false;
    try {
      writeSeedPackFiles(nextPack, tmp, history);
    } catch {
      poisonFailed = true;
    }
    assert(poisonFailed, 'corrupt history fails closed');
    assert(
      fs.readFileSync(path.join(tmp, 'demigod-signals.json'), 'utf8') ===
        beforePoison,
      'corrupt history preserves the last feed',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ ok: true, selftest: 'recruitai-seed-pack' }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--selftest') {
    selftest();
    return;
  }
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('usage: node demigod-recruitai-seed-pack.mjs [--out dir] [--selftest]');
    process.exit(0);
  }
  let out = path.join(BUSY, 'recruitai-handoff');
  let hasOut = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1] && !args[i + 1].startsWith('-') && !hasOut) {
      hasOut = true;
      out = args[++i];
    } else {
      throw new Error(`unknown or invalid argument ${args[i]}`);
    }
  }
  const doc = loadRecruitaiExport({ committedOnly: true });
  const gen = fs.realpathSync(path.join(BUSY, 'recruitai-export'));
  const pack = buildSeedPack(doc, { generation: gen });
  const envelope = writeSeedPackFiles(pack, out);
  console.log(
    JSON.stringify(
      {
        ok: true,
        out,
        ...envelope.counts,
        top: envelope.topByOpenReq?.slice(0, 5),
      },
      null,
      2,
    ),
  );
}

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }
}
