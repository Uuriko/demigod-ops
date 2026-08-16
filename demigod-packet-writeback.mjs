#!/usr/bin/env node
/**
 * demigod-packet-writeback — evidence panel sidecar + dry-run RecruitAI writeback
 * of the company packet (Clay-useful slice 6).
 *
 * Projects demigod.company-packet/1 into:
 *   - company-evidence.jsonl   — read-only per-company evidence sidecar for the desk pack
 *   - packet-writeback-plan.json — dry-run plan reusing the existing import row shape
 *
 * Dry-run only: there is no --apply here. Packet never touches score/consent/match.
 * No network. No people data.
 *
 *   node demigod-packet-writeback.mjs --selftest
 *   node demigod-packet-writeback.mjs run [--id=yc:…] [--out dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompanyPacket, loadPacketInputs, PACKET_SCHEMA } from './demigod-company-packet.mjs';
import { planCompanyRow } from './demigod-recruitai-import.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const SIDECAR_SCHEMA = 'demigod.company-evidence/1';
export const WRITEBACK_SCHEMA = 'demigod.packet-writeback/1';

/**
 * Read-only evidence panel for one packet. Null for unknown packets — a company
 * we cannot identify gets no sidecar, not an invented one.
 */
export function buildCompanySidecar(packet) {
  if (!packet || packet.schema !== PACKET_SCHEMA || packet.status === 'unknown') return null;
  return {
    schema: SIDECAR_SCHEMA,
    companyId: packet.companyId,
    name: packet.identity.name,
    domain: packet.identity.domain,
    asOf: packet.asOf,
    hiring: {
      status: packet.hiring.status,
      openRoles: packet.hiring.openRoles,
      atsSource: packet.hiring.atsSource,
    },
    researchStatus: packet.research?.status || null,
    acceptedFields: packet.research?.acceptedFields || [],
    evidence: packet.evidence,
    unknowns: packet.unknowns,
  };
}

/**
 * Dry-run writeback row for one packet, through the existing import row shape.
 * Null when the packet is unknown or the importer refuses the seed.
 */
export function planPacketRow(packet) {
  if (!packet || packet.schema !== PACKET_SCHEMA || packet.status === 'unknown') return null;
  const row = planCompanyRow(
    {
      name: packet.identity.name,
      domain: packet.identity.domain,
      website: packet.identity.website,
    },
    {
      mapCompanyId: packet.companyId,
      openReqCount: packet.hiring.openRoles,
      jobsUrl: packet.hiring.jobsUrl,
    },
  );
  if (!row) return null;
  return {
    ...row,
    researchStatus: packet.research?.status || null,
    acceptedFields: packet.research?.acceptedFields || [],
    evidenceCount: packet.evidence.length,
    unknownCount: packet.unknowns.length,
  };
}

/** Dry-run plan doc for a list of packets. Pure. Mode is constant — no apply exists. */
export function buildWritebackPlan(packets, { at = null } = {}) {
  const sidecars = [];
  const rows = [];
  let skippedUnknown = 0;
  let refused = 0;
  for (const packet of packets) {
    const sidecar = buildCompanySidecar(packet);
    if (!sidecar) {
      skippedUnknown++;
      continue;
    }
    const row = planPacketRow(packet);
    if (!row) {
      refused++;
      continue;
    }
    sidecars.push(sidecar);
    rows.push(row);
  }
  return {
    schema: WRITEBACK_SCHEMA,
    mode: 'dry-run',
    at,
    note: 'Evidence sidecar is read-only desk context. Rows reuse the existing '
      + 'recruitai-import company shape; nothing here writes a DB, score, consent, or match.',
    counts: { packets: packets.length, planned: rows.length, skippedUnknown, refused },
    rows,
    sidecars,
  };
}

export function writeWritebackFiles(plan, outDir) {
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const jsonl = plan.sidecars.map((s) => JSON.stringify(s)).join('\n')
    + (plan.sidecars.length ? '\n' : '');
  const sidecarPath = path.join(outDir, 'company-evidence.jsonl');
  const planPath = path.join(outDir, 'packet-writeback-plan.json');
  fs.writeFileSync(sidecarPath, jsonl, { mode: 0o600 });
  const { sidecars, ...planOnly } = plan;
  fs.writeFileSync(planPath, `${JSON.stringify(planOnly, null, 2)}\n`, { mode: 0o600 });
  return { sidecarPath, planPath };
}

function run() {
  const idArg = process.argv.find((a) => a.startsWith('--id='));
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outDir = outArg ? outArg.slice(6) : path.join(BUSY, 'recruitai-handoff');
  const inputs = loadPacketInputs();
  const ids = idArg
    ? [idArg.slice(5)]
    : (Array.isArray(inputs.map.companies) ? inputs.map.companies : [])
      .map((c) => c?.id)
      .filter((id) => typeof id === 'string' && id);
  const packets = ids.map((companyId) => buildCompanyPacket({ companyId, ...inputs }));
  const plan = buildWritebackPlan(packets, { at: new Date().toISOString() });
  const files = writeWritebackFiles(plan, outDir);
  console.log(JSON.stringify({ ok: true, mode: plan.mode, ...plan.counts, ...files }, null, 2));
}

function fixturePackets() {
  const company = {
    id: 'yc:acme',
    name: 'Acme',
    website: 'https://www.acme.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/acme',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/acme',
    openRoles: 1,
    openRolesAt: '2026-08-14',
    hiring: 'yes',
  };
  const map = { generatedAt: '2026-08-14T12:00:00.000Z', companies: [company] };
  const ledger = {
    updatedAt: '2026-08-14',
    roles: {
      'Greenhouse|acme|1': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: '1',
        title: 'Senior Backend Engineer',
        location: 'San Francisco, CA',
        url: 'https://boards.greenhouse.io/acme/jobs/1',
        firstSeen: '2026-07-01',
        lastSeen: '2026-08-14',
        closedAt: null,
        nativePostedAt: '2026-06-01',
        nativeDateField: 'first_published',
        employerDepartment: 'Engineering',
      },
    },
  };
  const field = (value) => ({
    value,
    status: 'supported',
    url: 'https://acme.example/',
    quote: 'Example makes research useful.',
  });
  const benchmark = {
    researchedAt: '2026-08-01',
    thresholds: { usableCoverage: 0.9, evidenceSupport: 0.95 },
    companies: Array.from({ length: 30 }, (_, i) => ({
      id: i === 0 ? 'yc:acme' : `gold:${i}`,
      fields: {
        canonicalCompany: field(i === 0 ? 'Acme' : `Gold ${i}`),
        productSummary: field('Makes useful things'),
        productCategory: field('Software'),
        likelyBuyer: field('Operations teams'),
        pricingStatus: field('contact sales'),
      },
    })),
  };
  const known = buildCompanyPacket({ companyId: 'yc:acme', map, ledger, signals: null, benchmark });
  const unknown = buildCompanyPacket({ companyId: 'yc:ghost', map, ledger, benchmark });
  const quarantined = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger,
    benchmark,
    catalog: {
      companies: [{ id: 'yc:acme', quarantineHiring: true, fields: benchmark.companies[0].fields }],
    },
  });
  return { known, unknown, quarantined };
}

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`packet-writeback selftest: ${msg}`);
  };
  const { known, unknown, quarantined } = fixturePackets();

  // 1. Known packet → sidecar carries evidence quotes/urls, unknowns, asOf.
  const sidecar = buildCompanySidecar(known);
  assert(sidecar?.schema === SIDECAR_SCHEMA, 'sidecar schema');
  assert(sidecar.companyId === 'yc:acme' && sidecar.domain === 'acme.example', 'sidecar identity');
  assert(sidecar.evidence.length > 0, 'evidence present');
  assert(
    sidecar.evidence.every((e) => e.url && e.quote && e.quote.split(/\s+/).length <= 20),
    'evidence quote+url bounds',
  );
  assert(sidecar.asOf.researchedAt === '2026-08-01', 'retrievedAt via asOf');
  assert(Array.isArray(sidecar.unknowns) && sidecar.unknowns.length > 0, 'unknowns projected');

  // 2. Unknown packet → no sidecar, no plan row, no invention.
  assert(buildCompanySidecar(unknown) === null, 'unknown → no sidecar');
  assert(planPacketRow(unknown) === null, 'unknown → no row');

  // 3. Dry-run row reuses the import shape, keyed like the importer.
  const row = planPacketRow(known);
  assert(row.id === 'dg:acme.example', 'importer domain key');
  assert(row.careers_url === 'https://boards.greenhouse.io/acme', 'jobsUrl → careers_url');
  assert(row.open_req_count === 1, 'open roles flow');
  assert(row.researchStatus === 'verified' && row.evidenceCount === sidecar.evidence.length, 'research flows');

  // 4. Quarantine: hiring facts stay hidden, evidence still flows.
  const qRow = planPacketRow(quarantined);
  assert(qRow.careers_url === null && qRow.open_req_count === 0, 'quarantine hides hiring');
  assert(buildCompanySidecar(quarantined).evidence.length > 0, 'quarantine keeps evidence');

  // 5. Plan doc is dry-run only; no people/score/consent bytes anywhere.
  const plan = buildWritebackPlan([known, unknown, quarantined], { at: '2026-08-14T16:00:00.000Z' });
  assert(plan.mode === 'dry-run', 'mode dry-run');
  assert(plan.counts.planned === 2 && plan.counts.skippedUnknown === 1, 'counts');
  const dumped = JSON.stringify(plan);
  for (const bad of ['"email"', '"phone"', '"persona"', '"score"', '"consent"', '"match"']) {
    assert(!dumped.includes(bad), `forbidden key ${bad}`);
  }
  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  assert(!/\bscoreMatch\s*\(/.test(here), 'never calls scoreMatch');
  const engine = fs.readFileSync(path.join(ROOT, 'demigod-matching-engine.mjs'), 'utf8');
  assert(!/packet-writeback/.test(engine), 'matching engine does not import writeback');

  // 6. Files write hermetically to a tmp dir.
  const tmp = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'dg-writeback-'));
  try {
    const files = writeWritebackFiles(plan, tmp);
    const lines = fs.readFileSync(files.sidecarPath, 'utf8').trim().split('\n');
    assert(lines.length === 2, 'one sidecar line per planned company');
    assert(JSON.parse(lines[0]).schema === SIDECAR_SCHEMA, 'jsonl parses');
    const written = JSON.parse(fs.readFileSync(files.planPath, 'utf8'));
    assert(written.mode === 'dry-run' && !written.sidecars, 'plan file omits sidecar bodies');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(JSON.stringify({ ok: true, selftest: 'packet-writeback' }));
}

if (isMain) {
  try {
    if (process.argv.includes('--selftest')) {
      selftest();
    } else if (process.argv[2] === 'run') {
      run();
    } else {
      console.error('usage: node demigod-packet-writeback.mjs --selftest | run [--id=yc:…] [--out dir]');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
