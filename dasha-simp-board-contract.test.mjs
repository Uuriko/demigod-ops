#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './dasha-simp-burn-score.test.mjs';
import './dasha-simp-native-share.test.mjs';

const load = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const schema = load('./dasha-simp-board.schema.json');
const board = load('./dasha-simp-board.json');
const invalid = load('./dasha-simp-board.invalid.json');

function validate(value, rule, path = '$') {
  const errors = [];
  const types = Array.isArray(rule.type) ? rule.type : rule.type ? [rule.type] : [];
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value;
  if (types.length && !types.includes(actual) && !(actual === 'integer' && types.includes('number'))) return [`${path}: expected ${types.join('|')}, got ${actual}`];
  if ('const' in rule && value !== rule.const) errors.push(`${path}: must equal ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${path}: not in enum`);
  if (rule.pattern && typeof value === 'string' && !new RegExp(rule.pattern).test(value)) errors.push(`${path}: pattern mismatch`);
  if (rule.minimum !== undefined && value < rule.minimum) errors.push(`${path}: below minimum`);
  if (actual === 'object') {
    for (const key of rule.required || []) if (!(key in value)) errors.push(`${path}.${key}: required`);
    if (rule.additionalProperties === false) for (const key of Object.keys(value)) if (!(key in (rule.properties || {}))) errors.push(`${path}.${key}: unexpected`);
    for (const [key, child] of Object.entries(rule.properties || {})) if (key in value) errors.push(...validate(value[key], child, `${path}.${key}`));
  }
  if (actual === 'array' && rule.items) value.forEach((item, index) => errors.push(...validate(item, rule.items, `${path}[${index}]`)));
  return errors;
}

assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.deepEqual(validate(board, schema), []);
const errors = validate(invalid, schema);
assert(errors.some(error => error.includes('manual_evidence_submission')));
assert(errors.some(error => error.includes('nomination')));
assert.equal(board.lanes.holder.points, 0);
assert.equal(board.lanes.oss.source, 'merged-reviewed-public-github-pr');
assert.equal(board.rules.forbidden.includes('public evidence form'), true);
console.log(`dasha Simp contract: PASS (${errors.length} hostile-fixture violations rejected)`);
