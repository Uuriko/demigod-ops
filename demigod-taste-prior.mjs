#!/usr/bin/env node
/**
 * demigod-taste-prior — fail-closed opt-in Simp / $Dasha-hold taste prior
 * (beyond-Clay slice 5).
 *
 * Soft prior on match review ONLY when a local opt-in receipt exists.
 * Missing receipt → unknown. Never scrape, never call Dasha, never invent
 * a hold or a Simp result. Companies are not people — do not attach this
 * to the company packet.
 *
 *   node demigod-taste-prior.mjs --selftest
 *   node demigod-taste-prior.mjs show --id=SUBJECT [--receipts=/tmp/...]
 *
 * Schema: demigod.taste-prior/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const TASTE_PRIOR_SCHEMA = 'demigod.taste-prior/1';
export const TASTE_PRIOR_USE = 'soft_prior_on_review_only';
export const RECEIPTS_SCHEMA = 'demigod.taste-receipts/1';

const ALLOWED_KEYS = Object.freeze(['schema', 'subjectId', 'status', 'simp', 'hold', 'use']);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const isDay = (value) =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function busyRoot() {
  return process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
}

export function defaultReceiptsPath() {
  return path.join(busyRoot(), 'taste-receipts.json');
}

function unknownPrior(subjectId) {
  return {
    schema: TASTE_PRIOR_SCHEMA,
    subjectId,
    status: 'unknown',
    simp: null,
    hold: null,
    use: TASTE_PRIOR_USE,
  };
}

function loadReceiptsFromPath(receiptsPath) {
  if (typeof receiptsPath !== 'string' || !receiptsPath) return null;
  try {
    const raw = fs.readFileSync(receiptsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function resolveReceipts(receipts, receiptsPath) {
  if (isRecord(receipts)) return receipts;
  if (typeof receiptsPath === 'string' && receiptsPath) {
    return loadReceiptsFromPath(receiptsPath);
  }
  return null;
}

function projectSimp(raw) {
  if (!isRecord(raw)) return null;
  const resultId = typeof raw.resultId === 'string' ? raw.resultId.trim() : '';
  if (!resultId) return null;
  if (!isDay(raw.at)) return null;
  return { resultId, at: raw.at };
}

function projectHold(raw) {
  if (!isRecord(raw)) return null;
  if (raw.proven !== true) return null;
  if (!isDay(raw.at)) return null;
  return { proven: true, at: raw.at };
}

/**
 * Fail-closed taste prior. Pure besides an optional local JSON read.
 * No network. No write. No match/pair/consent. No company packet.
 */
export function readTastePrior(input = {}) {
  const args = isRecord(input) ? input : {};
  const subjectId = typeof args.subjectId === 'string' ? args.subjectId.trim() : '';
  if (!subjectId) return unknownPrior('');

  const bundle = resolveReceipts(args.receipts ?? null, args.receiptsPath ?? null);
  if (!isRecord(bundle) || !isRecord(bundle.subjects)) return unknownPrior(subjectId);

  const row = bundle.subjects[subjectId];
  if (!isRecord(row) || row.optIn !== true) return unknownPrior(subjectId);

  return {
    schema: TASTE_PRIOR_SCHEMA,
    subjectId,
    status: 'opted_in',
    simp: projectSimp(row.simp),
    hold: projectHold(row.hold),
    use: TASTE_PRIOR_USE,
  };
}

function argValue(flag) {
  const eq = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return null;
}

function assertShape(prior, msg) {
  const keys = Object.keys(prior);
  if (keys.length !== ALLOWED_KEYS.length || ALLOWED_KEYS.some((key) => !Object.hasOwn(prior, key))) {
    throw new Error(`taste-prior selftest: ${msg}: unexpected keys ${keys.join(',')}`);
  }
  if (Object.hasOwn(prior, 'score')) throw new Error(`taste-prior selftest: ${msg}: score key`);
  if (Object.hasOwn(prior, 'email')) throw new Error(`taste-prior selftest: ${msg}: email key`);
  if (Object.hasOwn(prior, 'wallet')) throw new Error(`taste-prior selftest: ${msg}: wallet key`);
  if (Object.hasOwn(prior, 'phone')) throw new Error(`taste-prior selftest: ${msg}: phone key`);
  if (Object.hasOwn(prior, 'people')) throw new Error(`taste-prior selftest: ${msg}: people key`);
  if (prior.schema !== TASTE_PRIOR_SCHEMA) throw new Error(`taste-prior selftest: ${msg}: schema`);
  if (prior.use !== TASTE_PRIOR_USE) throw new Error(`taste-prior selftest: ${msg}: use`);
}

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`taste-prior selftest: ${msg}`);
  };

  // 1. no receipts → unknown, simp/hold null
  const none = readTastePrior({ subjectId: 'alice' });
  assertShape(none, 'no receipts');
  assert(none.status === 'unknown', 'no receipts status');
  assert(none.subjectId === 'alice', 'no receipts keeps subjectId');
  assert(none.simp === null && none.hold === null, 'no receipts null simp/hold');
  assert(none.use === 'soft_prior_on_review_only', 'use literal');

  const emptyId = readTastePrior({ subjectId: '' });
  assert(emptyId.subjectId === '' && emptyId.status === 'unknown', 'empty subjectId');
  assert(readTastePrior({}).status === 'unknown' && readTastePrior({}).subjectId === '', 'missing subjectId');
  assert(readTastePrior(null).status === 'unknown', 'null input unknown');
  assert(readTastePrior({ subjectId: 12 }).subjectId === '' && readTastePrior({ subjectId: 12 }).status === 'unknown', 'non-string subjectId');

  // 2. missing file path → unknown, does not throw
  let missingThrew = false;
  let missing;
  try {
    missing = readTastePrior({
      subjectId: 'alice',
      receiptsPath: '/tmp/dg-busy/taste-receipts-does-not-exist-slice5.json',
    });
  } catch (error) {
    missingThrew = true;
    throw new Error(`taste-prior selftest: missing file must not throw: ${error.message || error}`);
  }
  assert(!missingThrew, 'missing file did not throw');
  assertShape(missing, 'missing file');
  assert(missing.status === 'unknown' && missing.simp === null && missing.hold === null, 'missing file unknown');

  let badJsonThrew = false;
  const badJsonPath = '/tmp/dg-busy/taste-receipts-invalid-slice5.json';
  fs.writeFileSync(badJsonPath, '{not-json', 'utf8');
  try {
    const badJson = readTastePrior({ subjectId: 'alice', receiptsPath: badJsonPath });
    assert(badJson.status === 'unknown' && badJson.simp === null && badJson.hold === null, 'invalid json unknown');
  } catch (error) {
    badJsonThrew = true;
    throw new Error(`taste-prior selftest: invalid json must not throw: ${error.message || error}`);
  }
  assert(!badJsonThrew, 'invalid json did not throw');
  try { fs.unlinkSync(badJsonPath); } catch { /* ignore */ }

  // 3. fixture opted_in with simp resultId + hold proven → both project
  const fixture = {
    schema: RECEIPTS_SCHEMA,
    subjects: {
      alice: {
        optIn: true,
        simp: { resultId: 'simp-alice-1', at: '2026-08-10' },
        hold: { proven: true, at: '2026-08-12' },
      },
    },
  };
  const opted = readTastePrior({ subjectId: 'alice', receipts: fixture });
  assertShape(opted, 'opted_in');
  assert(opted.status === 'opted_in', 'opted_in status');
  assert(opted.simp !== null && opted.simp.resultId === 'simp-alice-1' && opted.simp.at === '2026-08-10', 'simp projects');
  assert(opted.hold !== null && opted.hold.proven === true && opted.hold.at === '2026-08-12', 'hold projects');
  assert(Object.keys(opted.simp).join(',') === 'resultId,at', 'simp keys');
  assert(Object.keys(opted.hold).join(',') === 'proven,at', 'hold keys');

  const fixturePath = '/tmp/dg-busy/taste-receipts-fixture-slice5.json';
  fs.writeFileSync(fixturePath, JSON.stringify(fixture), 'utf8');
  const fromFile = readTastePrior({ subjectId: 'alice', receiptsPath: fixturePath });
  assert(fromFile.status === 'opted_in', 'file fixture opted_in');
  assert(fromFile.simp?.resultId === 'simp-alice-1', 'file fixture simp');
  assert(fromFile.hold?.proven === true && fromFile.hold?.at === '2026-08-12', 'file fixture hold');
  try { fs.unlinkSync(fixturePath); } catch { /* ignore */ }

  // object receipts wins over a missing path
  const preferObject = readTastePrior({
    subjectId: 'alice',
    receipts: fixture,
    receiptsPath: '/tmp/dg-busy/taste-receipts-does-not-exist-slice5.json',
  });
  assert(preferObject.status === 'opted_in', 'plain object receipts wins');

  // 4. hold.proven true but optIn false/missing → unknown, hold null (forged hold ignored)
  const forgedFalse = readTastePrior({
    subjectId: 'alice',
    receipts: {
      subjects: {
        alice: {
          optIn: false,
          hold: { proven: true, at: '2026-08-12' },
          simp: { resultId: 'forged', at: '2026-08-10' },
        },
      },
    },
  });
  assertShape(forgedFalse, 'forged optIn false');
  assert(forgedFalse.status === 'unknown', 'forged optIn false status');
  assert(forgedFalse.hold === null && forgedFalse.simp === null, 'forged hold/simp ignored');

  const forgedMissing = readTastePrior({
    subjectId: 'alice',
    receipts: {
      subjects: {
        alice: {
          hold: { proven: true, at: '2026-08-12' },
        },
      },
    },
  });
  assert(forgedMissing.status === 'unknown' && forgedMissing.hold === null, 'forged missing optIn');

  const otherSubject = readTastePrior({ subjectId: 'bob', receipts: fixture });
  assert(otherSubject.status === 'unknown' && otherSubject.hold === null && otherSubject.simp === null, 'missing subject');

  // 5. optIn true but hold.proven "true" (string) → opted_in, hold null
  const stringProven = readTastePrior({
    subjectId: 'alice',
    receipts: {
      subjects: {
        alice: {
          optIn: true,
          hold: { proven: 'true', at: '2026-08-12' },
        },
      },
    },
  });
  assertShape(stringProven, 'string proven');
  assert(stringProven.status === 'opted_in', 'string proven still opted_in');
  assert(stringProven.hold === null, 'string proven hold null');
  assert(stringProven.simp === null, 'string proven no invented simp');

  const numericProven = readTastePrior({
    subjectId: 'alice',
    receipts: {
      subjects: {
        alice: {
          optIn: true,
          hold: { proven: 1, at: '2026-08-12' },
        },
      },
    },
  });
  assert(numericProven.status === 'opted_in' && numericProven.hold === null, 'numeric proven hold null');

  const badSimp = readTastePrior({
    subjectId: 'alice',
    receipts: {
      subjects: {
        alice: {
          optIn: true,
          simp: { resultId: '', at: '2026-08-10' },
          hold: { proven: true, at: '2026-13-40' },
        },
      },
    },
  });
  assert(badSimp.status === 'opted_in' && badSimp.simp === null && badSimp.hold === null, 'invalid simp/hold stay null');

  // 6. no score key
  for (const prior of [none, missing, opted, forgedFalse, forgedMissing, stringProven]) {
    assert(!Object.hasOwn(prior, 'score'), 'no score key');
    assert(!/"score"\s*:/.test(JSON.stringify(prior)), 'json has no score key');
    assert(!Object.hasOwn(prior, 'email'), 'no email');
    assert(!Object.hasOwn(prior, 'wallet'), 'no wallet');
    assert(!Object.hasOwn(prior, 'phone'), 'no phone');
    assert(!Object.hasOwn(prior, 'people'), 'no people');
  }

  // Source canaries — no network, no Dasha call, no packet attach, no match/pair/consent.
  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const surface = here.split('function selftest')[0] || here;
  assert(!/demigod-company-packet/.test(surface), 'does not import company-packet');
  assert(!/demigod-company-memo/.test(surface), 'does not import company-memo');
  assert(!/demigod-hiring-ticket/.test(surface), 'does not import hiring-ticket');
  assert(!/demigod-match/.test(surface), 'does not import match');
  assert(!/demigod-pair/.test(surface), 'does not import pair');
  assert(!/demigod-consent/.test(surface), 'does not import consent');
  assert(!/\bfetch\s*\(/.test(surface), 'no fetch');
  assert(!/\bhttps?\.request\b/.test(surface), 'no http request');
  assert(!/\bwriteFileSync\b/.test(surface), 'runtime does not write');
  assert(surface.includes("use: TASTE_PRIOR_USE") || surface.includes("use: 'soft_prior_on_review_only'"), 'use literal');

  const selfPath = fileURLToPath(import.meta.url);
  const shown = spawnSync(
    process.execPath,
    [selfPath, 'show', '--id=alice', '--receipts=/tmp/dg-busy/taste-receipts-does-not-exist-slice5.json'],
    { encoding: 'utf8', timeout: 15000, env: process.env },
  );
  assert(shown.status === 0, `show missing receipts exit ${shown.status}: ${shown.stderr || ''}`);
  const shownPrior = JSON.parse(shown.stdout);
  assert(shownPrior.status === 'unknown' && shownPrior.simp === null && shownPrior.hold === null, 'show missing unknown');
  assert(shownPrior.use === TASTE_PRIOR_USE, 'show use');
  assert(!Object.hasOwn(shownPrior, 'score'), 'show no score');

  console.log(JSON.stringify({
    ok: true,
    selftest: 'taste-prior',
    cases: {
      no_receipts: { status: none.status, simp: none.simp, hold: none.hold, use: none.use },
      missing_file: { status: missing.status, threw: false },
      opted_in: { status: opted.status, simp: opted.simp, hold: opted.hold },
      forged_hold: { status: forgedFalse.status, hold: forgedFalse.hold },
      string_proven: { status: stringProven.status, hold: stringProven.hold },
      no_score: true,
    },
  }));
}

function show(subjectId, receiptsPath) {
  if (!subjectId) {
    console.error('usage: node demigod-taste-prior.mjs show --id=SUBJECT [--receipts=/tmp/...]');
    process.exit(2);
  }
  const prior = readTastePrior({
    subjectId,
    receiptsPath: receiptsPath || defaultReceiptsPath(),
  });
  console.log(JSON.stringify(prior, null, 2));
}

if (isMain) {
  try {
    if (process.argv.includes('--selftest')) {
      selftest();
    } else if (process.argv[2] === 'show') {
      show(argValue('--id'), argValue('--receipts'));
    } else {
      console.error('usage: node demigod-taste-prior.mjs --selftest | show --id=SUBJECT [--receipts=/tmp/...]');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
