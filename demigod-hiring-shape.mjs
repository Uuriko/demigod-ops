#!/usr/bin/env node
/**
 * demigod-hiring-shape — what a company is hiring for right now, as a label with its evidence.
 *
 * The map already carries `roleMix` for 337 companies (function -> open-role count, from the
 * companies' own public boards). Nothing read it except peer overlap. A recruiter reads that
 * mix in one glance — "they're eng-only", "that's a first commercial hire", "they're building
 * the recruiting function" — and those readings decide which brief is worth a conversation.
 * This makes the reading explicit and inspectable.
 *
 * NOT A SCORE. No ranking, no fit, no quality, no ordering of companies against each other.
 * Every label carries the counts that produced it so an operator can disagree with one look.
 *
 * ABSTAINS LOUDLY. Under three open roles there is no shape, only noise. And `categorizeRole`
 * is an honest coarse bucketer (AR-08, PARTIAL) — when its `other` residual is most of a
 * board, the mix describes the classifier's limits rather than the company's plan, so the
 * label is withheld rather than guessed.
 *
 *   node demigod-hiring-shape.mjs show --id=yc:abundant
 *   node demigod-hiring-shape.mjs find --shape=first-commercial-hires [--limit=N]
 *   node demigod-hiring-shape.mjs summary
 *   node demigod-hiring-shape.mjs --selftest
 *
 * Schema: demigod.hiring-shape/1
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const OUT_PATH = path.join(BUSY, 'hiring-shape.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const SHAPE_SCHEMA = 'demigod.hiring-shape/1';

/** Closed label set. `insufficient-signal` is a real answer, not a failure. */
export const HIRING_SHAPES = Object.freeze([
  'insufficient-signal',
  'eng-only',
  'first-commercial-hires',
  'eng-led',
  'gtm-heavy',
  'ops-heavy',
  'people-building',
  'broad-scale',
  'mixed',
]);

/** Minimum board size before a mix means anything. Two roles is an anecdote. */
export const MIN_ROLES_FOR_SHAPE = 3;
/**
 * Recruiting seats only mean "building the hiring function" as a SHARE of the board.
 * A bare `people >= 2` labelled OpenAI (7 recruiters of 627 open roles, 1.1%) and Databricks
 * (3 of 424) as building their hiring function — 46 of 49 hits were boards of 20+ roles, and
 * because this rule is tested before broad-scale it stole their correct label too. Measured over
 * the 101 boards that have any people role, the median share is 0.056 and p90 is 0.179, so 0.10
 * is about double typical: notable rather than merely present. Same reasoning as the board-size
 * bound on first-commercial-hires — "two sales roles out of forty is not a transition".
 */
export const MIN_PEOPLE_SHARE = 0.1;
/** Above this share of unclassifiable titles the mix describes our bucketer, not the company. */
export const MAX_OTHER_SHARE = 0.5;

const TECH = ['engineering', 'ai/data'];
const COMMERCIAL = ['sales', 'marketing'];

const sum = (mix, keys) => keys.reduce((n, k) => n + (Number(mix[k]) || 0), 0);

/**
 * PURE. Company row -> { shape, why, evidence }.
 * Order is deliberate: the specific readings come before the general ones, because
 * "eng-only" and "first commercial hires" are the two a recruiter actually acts on.
 */
export function hiringShape(company = {}) {
  const mix = company && typeof company.roleMix === 'object' && company.roleMix ? company.roleMix : {};
  const total = Object.values(mix).reduce((n, v) => n + (Number(v) || 0), 0);
  const other = Number(mix.other) || 0;
  const tech = sum(mix, TECH);
  const commercial = sum(mix, COMMERCIAL);
  const ops = Number(mix.operations) || 0;
  const people = Number(mix.people) || 0;
  const functions = Object.keys(mix).filter((k) => k !== 'other' && (Number(mix[k]) || 0) > 0);
  const evidence = { openRoles: total, functions: functions.length, mix, teamSize: company.teamSize ?? null, stage: company.stage ?? null };

  if (total < MIN_ROLES_FOR_SHAPE) {
    return { shape: 'insufficient-signal', why: `only ${total} open role${total === 1 ? '' : 's'} — no shape at this size`, evidence };
  }
  if (total > 0 && other / total > MAX_OTHER_SHARE) {
    return {
      shape: 'insufficient-signal',
      why: `${other} of ${total} titles did not classify — this describes the role bucketer, not the company`,
      evidence,
    };
  }
  if (tech === total - other && tech > 0 && commercial === 0 && ops === 0) {
    return { shape: 'eng-only', why: `all ${tech} classified roles are engineering or ai/data`, evidence };
  }
  // The transition a recruiter cares about most: a technical team opening its first one or two
  // commercial seats. Bounded by board size — two sales roles out of forty is not a transition.
  if (tech >= 1 && commercial >= 1 && commercial <= 2 && total <= 8) {
    return {
      shape: 'first-commercial-hires',
      why: `${commercial} commercial role${commercial === 1 ? '' : 's'} alongside ${tech} technical on a ${total}-role board`,
      evidence,
    };
  }
  if (people >= 2 && people / total >= MIN_PEOPLE_SHARE) {
    return {
      shape: 'people-building',
      why: `${people} of ${total} roles are people/recruiting — building the hiring function itself`,
      evidence,
    };
  }
  if (commercial / total >= 0.5) {
    return { shape: 'gtm-heavy', why: `${commercial} of ${total} roles are sales or marketing`, evidence };
  }
  if (ops / total >= 0.4) {
    return { shape: 'ops-heavy', why: `${ops} of ${total} roles are operations`, evidence };
  }
  if (functions.length >= 6 && total >= 20) {
    return { shape: 'broad-scale', why: `${total} roles across ${functions.length} functions`, evidence };
  }
  if (tech / total >= 0.6) {
    return { shape: 'eng-led', why: `${tech} of ${total} roles are technical`, evidence };
  }
  return { shape: 'mixed', why: `${total} roles across ${functions.length} functions with no dominant function`, evidence };
}

/** Roll shapes over the corpus. Pure. */
export function summarizeShapes(map = {}) {
  const companies = (Array.isArray(map.companies) ? map.companies : []).filter((c) => c && c.roleMix);
  const rows = companies.map((c) => ({ id: c.id || null, name: c.name || null, ...hiringShape(c) }));
  const byShape = {};
  for (const r of rows) byShape[r.shape] = (byShape[r.shape] || 0) + 1;
  return {
    schema: SHAPE_SCHEMA,
    withRoleMix: companies.length,
    note: 'Labels with evidence, not scores. No ranking, no fit, no ordering of companies against each other.',
    byShape,
    rows,
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
  const sh = (row) => hiringShape(row).shape;
  // Abstention comes first, because a confident label on two roles is the failure mode here.
  assert(sh({ roleMix: { engineering: 2 } }) === 'insufficient-signal', 'two roles is not a shape');
  assert(sh({ roleMix: {} }) === 'insufficient-signal' && sh({}) === 'insufficient-signal', 'no mix is not a shape');
  assert(sh({ roleMix: { other: 6, engineering: 2 } }) === 'insufficient-signal', 'an unclassifiable board withholds the label');
  assert(
    hiringShape({ roleMix: { other: 6, engineering: 2 } }).why.includes('bucketer'),
    'the abstention says it is our limit, not the company being shapeless',
  );
  assert(sh({ roleMix: { other: 3, engineering: 4 } }) !== 'insufficient-signal', 'a minority other residual still yields a shape');

  assert(sh({ roleMix: { engineering: 4, 'ai/data': 2 } }) === 'eng-only', 'pure technical board');
  assert(sh({ roleMix: { engineering: 4, 'ai/data': 2, other: 1 } }) === 'eng-only', 'other does not break eng-only');
  assert(sh({ roleMix: { engineering: 3, sales: 1 } }) === 'first-commercial-hires', 'the transition case');
  assert(sh({ roleMix: { engineering: 3, sales: 1, marketing: 1 } }) === 'first-commercial-hires', 'two commercial seats still counts');
  assert(sh({ roleMix: { engineering: 30, sales: 2, product: 5, design: 4 } }) !== 'first-commercial-hires', 'two sellers on a big board is not a transition');
  assert(sh({ roleMix: { sales: 5, marketing: 3, engineering: 2 } }) === 'gtm-heavy', 'commercial majority');
  assert(sh({ roleMix: { operations: 4, engineering: 2, product: 2 } }) === 'ops-heavy', 'operations plurality');
  assert(sh({ roleMix: { people: 3, engineering: 5, sales: 3 } }) === 'people-building', 'building the hiring function');
  // Recruiting seats are a share, not a count. A big board with a couple of recruiters is a big
  // board — and must fall through to the label that actually describes it.
  assert(
    sh({ roleMix: { engineering: 400, people: 7, sales: 90, product: 40, design: 30, operations: 30, marketing: 30 } }) !== 'people-building',
    '7 recruiters on a 627-role board is not building the hiring function',
  );
  assert(
    sh({ roleMix: { engineering: 400, people: 7, sales: 90, product: 40, design: 30, operations: 30, marketing: 30 } }) === 'broad-scale',
    'and the share bound must hand it back to the label that fits',
  );
  assert(
    sh({ roleMix: { engineering: 10, sales: 4, product: 3, design: 2, operations: 2, people: 1, marketing: 1 } }) === 'broad-scale',
    'wide board at scale',
  );
  assert(sh({ roleMix: { engineering: 7, product: 2, design: 1 } }) === 'eng-led', 'technical majority without purity');
  assert(sh({ roleMix: { product: 2, design: 2, operations: 1 } }) === 'mixed', 'no dominant function');
  assert(HIRING_SHAPES.includes(sh({ roleMix: { product: 2, design: 2, operations: 1 } })), 'every label is in the closed set');
  assert(hiringShape({ roleMix: { engineering: 3, sales: 1 } }).evidence.openRoles === 4, 'evidence carries the counts');
  // Not a score: identical mixes must be indistinguishable, and nothing may imply an ordering.
  const a = hiringShape({ roleMix: { engineering: 3, sales: 1 }, teamSize: 5 });
  const b = hiringShape({ roleMix: { engineering: 3, sales: 1 }, teamSize: 900 });
  assert(a.shape === b.shape, 'team size does not change the hiring shape — the mix does');
  assert(!('score' in a) && !('rank' in a), 'a shape is a label, never a score');

  const summary = summarizeShapes({ companies: [{ id: 'a', roleMix: { engineering: 4 } }, { id: 'b', roleMix: { engineering: 1 } }, { id: 'c' }] });
  assert(summary.withRoleMix === 2, 'rows without a mix are not counted as shapeless companies');
  assert(summary.byShape['eng-only'] === 1 && summary.byShape['insufficient-signal'] === 1, 'summary tallies both');

  console.log(JSON.stringify({ ok: true, selftest: 'hiring-shape' }));
  process.exit(0);
}

if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const flag = (name) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  const map = readJson(MAP_PATH);
  if (!map) {
    console.error(`missing or unreadable map: ${MAP_PATH}`);
    process.exit(1);
  }

  if (cmd === 'show') {
    const id = flag('id');
    const company = (map.companies || []).find((c) => c.id === id);
    if (!company) {
      console.error(`no company with id=${id}`);
      process.exit(1);
    }
    console.log(JSON.stringify({ id: company.id, name: company.name, ...hiringShape(company) }, null, 2));
    process.exit(0);
  }

  if (cmd === 'find') {
    const shape = flag('shape');
    if (!shape || !HIRING_SHAPES.includes(shape)) {
      console.error(`--shape must be one of: ${HIRING_SHAPES.join(', ')}`);
      process.exit(2);
    }
    const limit = Number(flag('limit')) || 25;
    const hits = summarizeShapes(map).rows.filter((r) => r.shape === shape);
    console.log(JSON.stringify({ ok: true, shape, matched: hits.length, showing: Math.min(limit, hits.length), rows: hits.slice(0, limit) }, null, 2));
    process.exit(0);
  }

  if (cmd === 'summary') {
    const summary = summarizeShapes(map);
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, out: OUT_PATH, withRoleMix: summary.withRoleMix, byShape: summary.byShape }, null, 2));
    process.exit(0);
  }

  console.error('usage: node demigod-hiring-shape.mjs show --id=ID | find --shape=SHAPE [--limit=N] | summary | --selftest');
  process.exit(2);
}
