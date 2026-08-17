#!/usr/bin/env node
/**
 * demigod-company-liveness — "is this company still operating?" as evidence, not a verdict.
 *
 * WHY THE CLASSIFIER IS THE PRODUCT. The naive version of this feature deletes real companies.
 * Measured 2026-08-16 over all 2,675 corpus websites and all 339 shipped ATS boards:
 * OpenAI, Cloudflare, Coinbase, Gusto, Pinterest, Chime and Dropbox all answer **403** to a
 * plain client and **200/301** to a browser — they are among the most alive companies in the
 * corpus. A checker that treats 4xx as death removes 1,000+ real open roles. So a refusal is
 * classified `blocked`, never `gone`, and `blocked` is explicitly not evidence of anything.
 *
 * What survives as a real signal: DNS that does not resolve, a refused connection, an expired
 * or wrong-host certificate, or a hard 404 on the company's own homepage. Those found 48 rows
 * — Zimride, Hipmunk, Engine Yard, SourceClear, mLab, Embark, Open Garden — none of which had
 * a live job board.
 *
 * REVIEW ONLY. Never writes the map. `gone` is a question for an operator: a company can be
 * acquired and alive, or dark and alive. Under-claiming is the failure mode.
 *
 *   node demigod-company-liveness.mjs classify --status=403         # pure, offline
 *   node demigod-company-liveness.mjs report --probe=/tmp/probe.json
 *   node demigod-company-liveness.mjs probe [--limit=N] [--concurrency=N]   # opt-in network
 *   node demigod-company-liveness.mjs --selftest
 *
 * Schema: demigod.company-liveness/1
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const OUT_PATH = path.join(BUSY, 'company-liveness.json');
const PROBE_PATH = path.join(BUSY, 'company-liveness-probe.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const LIVENESS_SCHEMA = 'demigod.company-liveness/1';

/**
 * Closed states. `blocked` and `unknown` both mean "we learned nothing" and are kept apart
 * only so the reason stays legible — neither may ever be read as evidence of death.
 */
export const LIVENESS_STATES = Object.freeze(['alive', 'blocked', 'unreachable', 'gone', 'unknown']);

/** Transport failures that mean the name or host is really gone. */
const GONE_ERRORS = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED']);
/** TLS failures: the host answers but its identity is abandoned or reassigned. */
const CERT_ERRORS = /^(?:CERT_HAS_EXPIRED|ERR_TLS_CERT_ALTNAME_INVALID|UNABLE_TO_VERIFY_LEAF_SIGNATURE|DEPTH_ZERO_SELF_SIGNED_CERT)/;
/** Refusals. A bot wall is the single most common 4xx on a live company homepage. */
const BLOCKED_STATUS = new Set([401, 402, 403, 406, 409, 429]);

/**
 * PURE. One probe observation -> a liveness state with the reason that produced it.
 * @param {{status?: number, err?: string}} observation
 */
export function classifyLiveness(observation = {}) {
  const status = Number(observation.status);
  const err = String(observation.err || '');
  if (err) {
    if (GONE_ERRORS.has(err)) return { state: 'gone', reason: `dns/connect failed (${err})` };
    if (CERT_ERRORS.test(err)) return { state: 'gone', reason: `certificate abandoned (${err})` };
    // A timeout or reset is a bad minute, not a dead company.
    return { state: 'unreachable', reason: `transport error (${err})` };
  }
  if (!Number.isFinite(status) || status <= 0) return { state: 'unknown', reason: 'no observation' };
  if (status >= 200 && status < 400) return { state: 'alive', reason: `http ${status}` };
  if (BLOCKED_STATUS.has(status)) {
    return { state: 'blocked', reason: `http ${status} — refusal, not absence; live sites bot-wall plain clients` };
  }
  if (status === 404 || status === 410) return { state: 'gone', reason: `http ${status} on the company's own homepage` };
  if (status >= 500) return { state: 'unreachable', reason: `http ${status} — origin error` };
  return { state: 'unknown', reason: `http ${status}` };
}

/**
 * PURE. Corroborate a website observation with hiring evidence already in the corpus.
 * A live ATS board outranks a dead-looking homepage: boards are maintained by the same
 * company and a `gone` verdict against one is almost always our probe being wrong.
 */
export function corroborate(state, company = {}) {
  const hasBoard = Boolean(company.openRoles && company.atsSource);
  if (state === 'gone' && hasBoard) {
    return { state: 'unknown', reason: `homepage looks gone but ${company.openRoles} roles are open on ${company.atsSource} — probe is the weaker evidence` };
  }
  return null;
}

/** Roll probe observations up against the map. Pure — takes data, returns a receipt. */
export function buildLivenessReport(map = {}, observations = [], { limit = 40 } = {}) {
  const byId = new Map((Array.isArray(map.companies) ? map.companies : []).map((c) => [c.id, c]));
  const rows = [];
  for (const obs of Array.isArray(observations) ? observations : []) {
    const company = byId.get(obs.id) || {};
    const first = classifyLiveness(obs);
    const corrected = corroborate(first.state, company);
    rows.push({
      id: obs.id ?? null,
      name: obs.name ?? company.name ?? null,
      url: obs.url ?? company.website ?? null,
      state: corrected ? corrected.state : first.state,
      reason: corrected ? corrected.reason : first.reason,
      supersededFrom: corrected ? first.state : undefined,
      openRoles: company.openRoles ?? null,
      atsSource: company.atsSource ?? null,
      source: company.source ?? null,
    });
  }
  const byState = {};
  for (const r of rows) byState[r.state] = (byState[r.state] || 0) + 1;
  const gone = rows.filter((r) => r.state === 'gone');
  return {
    schema: LIVENESS_SCHEMA,
    observed: rows.length,
    companies: byId.size,
    byState,
    note:
      'Review-only. `blocked` is a refusal, never evidence of death. `gone` is a question for an operator — acquired, renamed and dark companies all look identical from here.',
    goneBySource: gone.reduce((acc, r) => ({ ...acc, [r.source || 'unknown']: (acc[r.source || 'unknown'] || 0) + 1 }), {}),
    gone: gone.slice(0, limit),
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

/**
 * Opt-in network probe. One request per company website already in the corpus — a status
 * check on a URL we publish, not a crawl of its content. Browser UA because the whole point
 * is to avoid mistaking a bot wall for a grave.
 */
async function probe(companies, { concurrency = 12, timeoutMs = 10000 } = {}) {
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
  const out = [];
  let i = 0;
  const worker = async () => {
    while (i < companies.length) {
      const c = companies[i++];
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await fetch(c.website, { redirect: 'follow', signal: ac.signal, headers: { 'user-agent': UA } });
        out.push({ id: c.id, name: c.name, url: c.website, status: res.status });
      } catch (e) {
        out.push({ id: c.id, name: c.name, url: c.website, status: 0, err: String(e?.cause?.code || e?.name || 'error') });
      } finally {
        clearTimeout(timer);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return out;
}

if (isMain && process.argv.includes('--selftest')) {
  const s = (o) => classifyLiveness(o).state;
  // The rule this module exists for. Every one of these was measured live on 2026-08-16.
  assert(s({ status: 403 }) === 'blocked', 'OpenAI/Cloudflare/Coinbase answer 403 and are alive');
  assert(s({ status: 429 }) === 'blocked', 'rate limiting is not death');
  assert(s({ status: 401 }) === 'blocked' && s({ status: 406 }) === 'blocked', 'other refusals are refusals');
  assert(!['gone', 'unreachable'].includes(s({ status: 403 })), 'a refusal must never read as absence');
  assert(s({ status: 200 }) === 'alive' && s({ status: 301 }) === 'alive' && s({ status: 308 }) === 'alive');
  assert(s({ status: 404 }) === 'gone' && s({ status: 410 }) === 'gone');
  assert(s({ status: 500 }) === 'unreachable' && s({ status: 530 }) === 'unreachable', 'origin errors are transient');
  assert(s({ err: 'ENOTFOUND' }) === 'gone' && s({ err: 'ECONNREFUSED' }) === 'gone', 'no DNS / refused is gone');
  assert(s({ err: 'CERT_HAS_EXPIRED' }) === 'gone' && s({ err: 'ERR_TLS_CERT_ALTNAME_INVALID' }) === 'gone');
  assert(s({ err: 'AbortError' }) === 'unreachable' && s({ err: 'ECONNRESET' }) === 'unreachable', 'a timeout is a bad minute');
  assert(s({}) === 'unknown' && s({ status: 0 }) === 'unknown', 'no observation is unknown, not alive');
  assert(LIVENESS_STATES.includes(s({ status: 418 })), 'every returned state is in the closed enum');
  assert(classifyLiveness({ status: 403 }).reason.includes('refusal'), 'the reason explains itself to the operator');

  // Corroboration: hiring evidence outranks a homepage probe.
  assert(corroborate('gone', { openRoles: 13, atsSource: 'Ashby' }).state === 'unknown', 'a live board overrides a gone homepage');
  assert(corroborate('gone', {}) === null, 'no board -> gone stands');
  assert(corroborate('alive', { openRoles: 13, atsSource: 'Ashby' }) === null, 'corroboration only ever softens gone');

  const map = {
    companies: [
      { id: 'a', name: 'Alpha', website: 'https://a.com/', source: 'Wikidata' },
      { id: 'b', name: 'Beta', website: 'https://b.com/', source: 'Y Combinator', openRoles: 4, atsSource: 'Ashby' },
      { id: 'c', name: 'Gamma', website: 'https://c.com/', source: 'Y Combinator' },
    ],
  };
  const report = buildLivenessReport(map, [
    { id: 'a', status: 0, err: 'ENOTFOUND' },
    { id: 'b', status: 0, err: 'ENOTFOUND' },
    { id: 'c', status: 403 },
  ]);
  assert(report.byState.gone === 1, 'only the boardless dead row counts as gone');
  assert(report.rows.find((r) => r.id === 'b').state === 'unknown', 'the row with open roles was rescued');
  assert(report.rows.find((r) => r.id === 'b').supersededFrom === 'gone', 'the rescue records what it overrode');
  assert(report.byState.blocked === 1 && !report.byState.alive, 'a 403 is counted as blocked, not alive and not gone');
  assert(report.goneBySource.Wikidata === 1, 'gone rows are attributed to the source that supplied them');
  // Vacuity: no observations must not read as a clean corpus.
  const empty = buildLivenessReport(map, []);
  assert(empty.observed === 0 && Object.keys(empty.byState).length === 0, 'zero observations reports zero, not health');

  console.log(JSON.stringify({ ok: true, selftest: 'company-liveness' }));
  process.exit(0);
}

if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const flag = (name, fallback) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };

  if (cmd === 'classify') {
    const status = Number(flag('status', ''));
    const err = flag('err', '');
    console.log(JSON.stringify(classifyLiveness({ status, err }), null, 2));
    process.exit(0);
  }

  const map = readJson(MAP_PATH);
  if (!map) {
    console.error(`missing or unreadable map: ${MAP_PATH}`);
    process.exit(1);
  }

  if (cmd === 'probe') {
    const limit = Number(flag('limit', '')) || Infinity;
    const concurrency = Number(flag('concurrency', '')) || 12;
    const targets = (map.companies || []).filter((c) => c.website).slice(0, limit === Infinity ? undefined : limit);
    const observations = await probe(targets, { concurrency });
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(PROBE_PATH, `${JSON.stringify(observations, null, 1)}\n`);
    console.log(JSON.stringify({ ok: true, probed: observations.length, out: PROBE_PATH }, null, 2));
    process.exit(0);
  }

  if (cmd === 'report') {
    const probeFile = flag('probe', PROBE_PATH);
    const observations = readJson(probeFile);
    if (!observations) {
      console.error(`no probe observations at ${probeFile} — run: node demigod-company-liveness.mjs probe`);
      process.exit(1);
    }
    const report = buildLivenessReport(map, observations);
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      JSON.stringify({ ok: true, out: OUT_PATH, observed: report.observed, byState: report.byState, goneBySource: report.goneBySource }, null, 2),
    );
    process.exit(0);
  }

  console.error('usage: node demigod-company-liveness.mjs classify --status=N|--err=CODE | probe [--limit=N] [--concurrency=N] | report [--probe=FILE] | --selftest');
  process.exit(2);
}
