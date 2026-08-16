#!/usr/bin/env node
/**
 * One supported CLI over the existing private company-intelligence slices.
 * No network, public write, score, consent, match, or intro authority.
 *
 *   node demigod-company-intelligence.mjs list [--limit=N]
 *   node demigod-company-intelligence.mjs get --id=yc:…
 *   node demigod-company-intelligence.mjs enrich --id=yc:… [source flags]
 *   node demigod-company-intelligence.mjs memo --id=yc:… [--out=/tmp/…]
 *   node demigod-company-intelligence.mjs writeback [--id=yc:…] [--out=/tmp/…]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  listCompanyRows,
} from './demigod-company-table.mjs';
import { loadPacketInputs } from './demigod-company-packet.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROUTES = Object.freeze({
  get: ['demigod-company-packet.mjs', 'show'],
  enrich: ['demigod-company-waterfall.mjs', 'run'],
  memo: ['demigod-company-memo.mjs', 'show'],
  writeback: ['demigod-packet-writeback.mjs', 'run'],
});
const MUTATION_FLAGS = /^(?:--apply(?:-map)?|--write)(?:=|$)/;

export function companyCommandPlan(argv = []) {
  const [command, ...rest] = argv;
  if (!command) return null;
  if (rest.some((arg) => MUTATION_FLAGS.test(String(arg)))) {
    const error = new Error('company intelligence is read-only/dry-run; mutation flag refused');
    error.code = 'mutation_forbidden';
    throw error;
  }
  if (command === 'list') return { kind: 'list', command, args: rest };
  const route = ROUTES[command];
  if (!route) return null;
  const forwarded = command === 'enrich' && !rest.includes('--dry-run')
    ? [...rest, '--dry-run']
    : rest;
  return { kind: 'proxy', command, script: route[0], args: [route[1], ...forwarded] };
}

export function parseListLimit(args = []) {
  const unknown = args.filter((arg) => !String(arg).startsWith('--limit='));
  if (unknown.length) throw new Error(`unknown list argument: ${unknown[0]}`);
  const raw = args.find((arg) => String(arg).startsWith('--limit='));
  if (!raw) return DEFAULT_LIMIT;
  const value = String(raw).slice('--limit='.length);
  if (!/^\d+$/.test(value)) throw new Error('limit must be an integer');
  return Math.min(Number(value), MAX_LIMIT);
}

export function buildCompanyList(args = [], inputs = loadPacketInputs()) {
  return listCompanyRows(inputs, { limit: parseListLimit(args) });
}

function usage() {
  return 'usage: node demigod-company-intelligence.mjs '
    + 'list [--limit=N] | get --id=yc:… | enrich --id=yc:… [source flags] '
    + '| memo --id=yc:… [--out=/tmp/…] | writeback [--id=yc:…] [--out=/tmp/…]';
}

function selftest() {
  const enrich = companyCommandPlan(['enrich', '--id=yc:acme']);
  if (enrich.script !== 'demigod-company-waterfall.mjs' || !enrich.args.includes('--dry-run')) {
    throw new Error('enrich must route to forced dry-run waterfall');
  }
  if (companyCommandPlan(['get', '--id=yc:acme']).script !== 'demigod-company-packet.mjs') {
    throw new Error('get route');
  }
  if (parseListLimit([]) !== DEFAULT_LIMIT || parseListLimit(['--limit=999']) !== MAX_LIMIT) {
    throw new Error('list limit');
  }
  let refused = false;
  try {
    companyCommandPlan(['writeback', '--apply']);
  } catch (error) {
    refused = error?.code === 'mutation_forbidden';
  }
  if (!refused) throw new Error('mutation flag must fail closed');
  console.log(JSON.stringify({ ok: true, selftest: 'company-intelligence' }));
}

function main() {
  if (process.argv.includes('--selftest')) return selftest();
  const plan = companyCommandPlan(process.argv.slice(2));
  if (!plan) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }
  if (plan.kind === 'list') {
    console.log(JSON.stringify(buildCompanyList(plan.args), null, 2));
    return;
  }
  const child = spawnSync(process.execPath, [path.join(ROOT, plan.script), ...plan.args], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (child.error) throw child.error;
  process.exitCode = Number.isInteger(child.status) ? child.status : 1;
}

if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }));
    process.exitCode = error?.code === 'mutation_forbidden' ? 2 : 1;
  }
}
