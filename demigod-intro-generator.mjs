#!/usr/bin/env node
/**
 * Compatibility wrapper for the canonical, gated pair intro draft.
 * Usage: node demigod-intro-generator.mjs --role-id=... --cand-id=...
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  assertCurrentMutualPairEligibility,
  getPair,
  pairId,
} from './demigod-pairs-lib.mjs';

const args = process.argv.slice(2);
const values = Object.fromEntries(
  args
    .filter((arg) => /^--(?:role|cand)-id=/.test(arg))
    .map((arg) => arg.slice(2).split(/=(.*)/s).slice(0, 2)),
);
const roleId = values['role-id'] || '';
const candId = values['cand-id'] || '';

try {
  if (
    args.length !== 2 ||
    !roleId ||
    !candId ||
    roleId !== roleId.trim() ||
    candId !== candId.trim()
  ) {
    throw new Error('usage: --role-id=ID --cand-id=ID');
  }
  const id = pairId(roleId, candId);
  const pair = getPair(id);
  if (!pair || pair.roleId !== roleId || pair.candId !== candId) throw new Error('pair_not_found');
  assertCurrentMutualPairEligibility(pair, { pairKey: id });
  const root = path.dirname(fileURLToPath(import.meta.url));
  const result = spawnSync(process.execPath, [path.join(root, 'demigod-intro-draft.mjs'), id], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
  process.exit(1);
}
