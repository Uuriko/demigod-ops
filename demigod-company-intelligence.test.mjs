#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildCompanyList,
  companyCommandPlan,
  parseListLimit,
} from './demigod-company-intelligence.mjs';

assert.equal(companyCommandPlan(['get', '--id=yc:acme']).script, 'demigod-company-packet.mjs');
assert.deepEqual(
  companyCommandPlan(['enrich', '--id=yc:acme']).args,
  ['run', '--id=yc:acme', '--dry-run'],
);
assert.equal(parseListLimit(['--limit=2']), 2);
assert.throws(() => companyCommandPlan(['memo', '--write']), /mutation flag refused/);

const table = buildCompanyList(['--limit=1']);
assert.equal(table.schema, 'demigod.company-table/1');
assert.equal(table.rows.length, Math.min(1, table.total));
assert.doesNotMatch(JSON.stringify(table), /"(?:email|phone|score|consent|match)"\s*:/i);

console.log(JSON.stringify({ ok: true, test: 'company-intelligence-cli' }));
