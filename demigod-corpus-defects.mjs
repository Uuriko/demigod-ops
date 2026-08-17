#!/usr/bin/env node
/**
 * demigod-corpus-defects — corpus data-quality detection over the company map.
 *
 * WHY THIS EXISTS. Company research already finds map defects: 18 of the 30 rows in
 * DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json carry a hand-written `mapDefects` list
 * ("Map stores HTTP…", "Canonical name retains a Wikidata disambiguator", "Website points
 * to a careers subdomain…"). A grep for `mapDefects` across the tree found zero readers, so
 * the expensive part — a human-grade look at the company — was being written down and
 * discarded. This reads them, gives the English a closed kind, and applies the same kinds to
 * all 2,754 rows offline.
 *
 * REVIEW ONLY. Never writes the map, never fetches. A detection is a question for an
 * operator, not a correction: `http://x` may redirect fine, and a non-root website path may
 * be the company's real homepage. Under-claiming is the failure mode — a row we cannot judge
 * produces no finding rather than a guess.
 *
 *   node demigod-corpus-defects.mjs report [--limit=N] [--kind=K] [--json]
 *   node demigod-corpus-defects.mjs --selftest
 *
 * Schema: demigod.corpus-defects/1
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const RESEARCH_PATH = path.join(ROOT, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json');
const OUT_PATH = path.join(BUSY, 'corpus-defects.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const DEFECTS_SCHEMA = 'demigod.corpus-defects/1';

/**
 * Closed kind enum. A defect that does not match one stays `null` rather than being forced
 * into the nearest bucket — an unclassified defect is visible work, a miscoded one is a lie.
 */
export const DEFECT_KINDS = Object.freeze([
  'website-canonical',
  'name-disambiguator',
  'inception-year',
  'location',
  'entity-status',
  'stale-roles',
  'description',
  'taxonomy',
  'no-hiring-evidence',
]);

/** Ordered most-specific-first; the first match wins. */
const RECORDED_PATTERNS = [
  ['name-disambiguator', /\bdisambiguator\b/i],
  ['stale-roles', /\b(?:open-?)?role count is\b.*\bstale\b|\brole count\b.*\bstale\b/i],
  ['inception-year', /\binception[- ]year\b|\bfounding facts\b|\bfounded\b.*\bdiffers\b/i],
  ['location', /\blocation\b|\bcity classification\b|\bis San \w+, not\b/i],
  ['taxonomy', /\btaxonomy false positive\b|\bis a startup-map\b/i],
  ['no-hiring-evidence', /\bno ATS or hiring evidence\b/i],
  ['entity-status', /\bacquisition\b|\bacquired\b|\bdiscontinu\w+|\bparked\b|\bsubsidiary\b|\bHTTP \d{3}\b|\bspans multiple\b/i],
  ['website-canonical', /\bwebsite\b|\bdomain\b|\bhost\b|\bstores HTTP\b|\bcanonicaliz\w+|\bsecondary URL\b|\blanding page\b/i],
  ['description', /\bdescription\b|\bpositioning\b|\bsite (?:still )?says\b|\bwhile the current site\b|\bmap calls\b/i],
];

/** PURE. English defect note -> closed kind, or null when nothing matches. */
export function classifyRecordedDefect(text) {
  const s = String(text || '');
  if (!s.trim()) return null;
  for (const [kind, re] of RECORDED_PATTERNS) if (re.test(s)) return kind;
  return null;
}

const parseUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return /^https?:$/.test(url.protocol) ? url : null;
  } catch {
    return null;
  }
};

/** Hosts that are a hiring surface, never a company homepage. */
const CAREERS_SUBDOMAIN = /^(?:careers|jobs|boards|apply|hiring|work|talent)\./i;
/** A trailing "(United States)" / "(Inc)" style qualifier carried in from a source catalogue. */
const NAME_QUALIFIER = /\s\((?:United States|USA|US|company|Inc\.?|Ltd\.?|[A-Z][a-z]+)\)\s*$/;

/**
 * PURE, offline. Detections for one map row.
 * Each finding names the evidence so an operator can judge it without re-deriving anything.
 */
export function detectRowDefects(company) {
  const row = company && typeof company === 'object' ? company : {};
  const out = [];
  const name = String(row.name || '');
  if (NAME_QUALIFIER.test(name)) {
    out.push({ kind: 'name-disambiguator', detail: 'canonical name carries a source-catalogue qualifier', evidence: name });
  }
  const url = parseUrl(row.website);
  if (url) {
    // The stored scheme is what the directory renders and links. Many of these redirect to
    // https just fine — the finding is about the value we publish, not about the server.
    if (url.protocol === 'http:') {
      out.push({ kind: 'website-canonical', detail: 'stored website scheme is http', evidence: url.href });
    }
    if (CAREERS_SUBDOMAIN.test(url.hostname)) {
      out.push({ kind: 'website-canonical', detail: 'website is a hiring subdomain, not the product homepage', evidence: url.hostname });
    }
    if (url.pathname && url.pathname !== '/') {
      out.push({ kind: 'website-canonical', detail: 'website points at a subpage rather than the site root', evidence: url.pathname });
    }
  }
  return out;
}

/**
 * Reconcile hand-recorded defects against what the detector can still see.
 * Status is `open` (detector agrees) or `not-detected` — never `fixed`. The detector covers a
 * few kinds; silence from it is absence of evidence, and closing a human's finding on that
 * would quietly delete the research this module exists to preserve.
 */
export function reconcileRecordedDefects(researchRows = [], map = {}) {
  const byId = new Map((Array.isArray(map.companies) ? map.companies : []).map((c) => [c.id, c]));
  const out = [];
  for (const row of Array.isArray(researchRows) ? researchRows : []) {
    for (const text of Array.isArray(row?.mapDefects) ? row.mapDefects : []) {
      const kind = classifyRecordedDefect(text);
      const company = byId.get(row.id);
      out.push({
        id: row.id,
        name: row.mapName || null,
        kind,
        note: String(text),
        status: !company
          ? 'row-absent-from-map'
          : detectRowDefects(company).some((d) => d.kind === kind)
            ? 'open'
            : 'not-detected',
      });
    }
  }
  return out;
}

/** Full review receipt. No network, no map write. */
export function buildCorpusDefectReport(map = {}, researchRows = [], { limit = 25 } = {}) {
  const companies = Array.isArray(map.companies) ? map.companies : [];
  const findings = [];
  for (const company of companies) {
    for (const d of detectRowDefects(company)) {
      findings.push({ id: company.id || null, name: company.name || null, ...d });
    }
  }
  const byKind = {};
  for (const f of findings) {
    byKind[f.kind] = byKind[f.kind] || { kind: f.kind, rows: 0, details: {} };
    byKind[f.kind].rows += 1;
    byKind[f.kind].details[f.detail] = (byKind[f.kind].details[f.detail] || 0) + 1;
  }
  const recorded = reconcileRecordedDefects(researchRows, map);
  const recordedByStatus = {};
  for (const r of recorded) recordedByStatus[r.status] = (recordedByStatus[r.status] || 0) + 1;
  return {
    schema: DEFECTS_SCHEMA,
    companies: companies.length,
    note:
      'Review-only. A detection is a question for an operator, not a correction — no map write, no fetch, no score.',
    detected: {
      findings: findings.length,
      rows: new Set(findings.map((f) => f.id)).size,
      byKind: Object.values(byKind).sort((a, b) => b.rows - a.rows),
      sample: findings.slice(0, limit),
    },
    recorded: {
      total: recorded.length,
      unclassified: recorded.filter((r) => !r.kind).length,
      byStatus: recordedByStatus,
      rows: recorded,
    },
  };
}

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

if (isMain && process.argv.includes('--selftest')) {
  // classify: every hand-written note in the shipped dataset must land on a kind, because an
  // unclassified note is silently dropped work — the exact failure this module was built for.
  assert(classifyRecordedDefect('Canonical name retains a Wikidata disambiguator.') === 'name-disambiguator');
  assert(classifyRecordedDefect('Mapped open-role count is stale.') === 'stale-roles');
  assert(classifyRecordedDefect('Map inception year differs from YC’s current record.') === 'inception-year');
  assert(classifyRecordedDefect('Official location is San Carlos, not San Francisco.') === 'location');
  assert(classifyRecordedDefect('Website host commodityai.io redirects to commodityai.com.') === 'website-canonical');
  assert(classifyRecordedDefect('Row represents Artifact as active after Yahoo acquisition and standalone discontinuation.') === 'entity-status');
  assert(classifyRecordedDefect('Conventional real-estate company is a startup-map taxonomy false positive.') === 'taxonomy');
  assert(classifyRecordedDefect('No ATS or hiring evidence exists.') === 'no-hiring-evidence');
  assert(classifyRecordedDefect('') === null && classifyRecordedDefect(null) === null, 'no note -> no kind');
  assert(classifyRecordedDefect('Something entirely unrelated happened.') === null, 'unmatched note stays unclassified, not forced into a bucket');
  assert(DEFECT_KINDS.includes(classifyRecordedDefect('Map stores HTTP and has an inception-year conflict with YC.')), 'every kind returned is in the closed enum');

  // detect: positives and the negatives that keep it from eating clean rows.
  const d = (row) => detectRowDefects(row).map((x) => `${x.kind}:${x.detail}`);
  assert(d({ name: 'GigaGen (United States)', website: 'https://gigagen.com/' })[0].startsWith('name-disambiguator'), 'trailing qualifier caught');
  assert(d({ name: 'Anthropic', website: 'https://www.anthropic.com/' }).length === 0, 'a clean row produces nothing');
  assert(d({ name: 'X', website: 'http://x.com/' }).some((s) => s.includes('http')), 'stored http scheme caught');
  assert(d({ name: 'Chime', website: 'https://careers.chime.com/' }).some((s) => s.includes('hiring subdomain')), 'careers host caught');
  assert(d({ name: 'Cloudflare', website: 'https://www.cloudflare.com/de-de/' }).some((s) => s.includes('subpage')), 'locale subpage caught');
  assert(d({ name: 'Y', website: 'not a url' }).length === 0 && d({}).length === 0, 'unparseable/absent website is not a finding');
  assert(d({ name: 'Ready', website: 'https://ready.net' }).length === 0, 'bare host without trailing slash is root, not a subpage');

  // reconcile: never invents a fix, and survives a row leaving the map.
  const map = { companies: [{ id: 'a', name: 'Alpha (United States)', website: 'https://alpha.com/' }] };
  const rows = [
    { id: 'a', mapName: 'Alpha', mapDefects: ['Canonical name retains a Wikidata disambiguator.'] },
    { id: 'a', mapName: 'Alpha', mapDefects: ['Mapped open-role count is stale.'] },
    { id: 'gone', mapName: 'Ghost', mapDefects: ['Canonical name retains a Wikidata disambiguator.'] },
  ];
  const rec = reconcileRecordedDefects(rows, map);
  assert(rec[0].status === 'open', 'detector agreement keeps a recorded defect open');
  assert(rec[1].status === 'not-detected', 'a kind the detector cannot see is not-detected, never fixed');
  assert(rec[2].status === 'row-absent-from-map', 'a vanished row is named, not silently dropped');
  assert(!rec.some((r) => r.status === 'fixed'), 'this module never closes a human finding on its own');

  const report = buildCorpusDefectReport(map, rows);
  assert(report.schema === DEFECTS_SCHEMA && report.companies === 1, 'report shape');
  assert(report.detected.findings === 1 && report.recorded.total === 3, 'report counts both sides');

  // Vacuity: zero findings over zero companies must not read like a clean corpus.
  const empty = buildCorpusDefectReport({ companies: [] }, []);
  assert(empty.companies === 0 && empty.detected.rows === 0, 'empty corpus reports zero companies, not silence');

  console.log(JSON.stringify({ ok: true, selftest: 'corpus-defects' }));
  process.exit(0);
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] !== 'report') {
    console.error('usage: node demigod-corpus-defects.mjs report [--limit=N] [--kind=K] [--json] | --selftest');
    process.exit(2);
  }
  const limit = Number((args.find((a) => a.startsWith('--limit=')) || '').slice(8)) || 25;
  const kind = (args.find((a) => a.startsWith('--kind=')) || '').slice(7) || null;
  if (kind && !DEFECT_KINDS.includes(kind)) {
    console.error(`unknown --kind=${kind}; expected one of ${DEFECT_KINDS.join(', ')}`);
    process.exit(2);
  }
  const map = readJson(MAP_PATH);
  if (!map) {
    console.error(`missing or unreadable map: ${MAP_PATH}`);
    process.exit(1);
  }
  const research = readJson(RESEARCH_PATH);
  const report = buildCorpusDefectReport(map, research?.companies || [], { limit });
  if (kind) {
    report.detected.byKind = report.detected.byKind.filter((k) => k.kind === kind);
    report.detected.sample = report.detected.sample.filter((f) => f.kind === kind);
    report.recorded.rows = report.recorded.rows.filter((r) => r.kind === kind);
  }
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      JSON.stringify(
        {
          ok: true,
          out: OUT_PATH,
          companies: report.companies,
          detectedFindings: report.detected.findings,
          detectedRows: report.detected.rows,
          byKind: report.detected.byKind.map((k) => ({ kind: k.kind, rows: k.rows })),
          recorded: { total: report.recorded.total, unclassified: report.recorded.unclassified, byStatus: report.recorded.byStatus },
        },
        null,
        2,
      ),
    );
  }
}
