#!/usr/bin/env node
/** CLI: ingest a submission from JSON file or stdin → board + CDN publish. */
import fs from 'fs';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { ingestSubmission } from './demigod-submissions-lib.mjs';

const arg = process.argv[2];
let body = {};
if (arg && arg !== '-') {
  body = JSON.parse(fs.readFileSync(arg, 'utf8'));
} else {
  const stdin = fs.readFileSync(0, 'utf8');
  body = JSON.parse(stdin);
}

const result = ingestSubmission(body);
  const gate = require("child_process").spawnSync("node", ["demigod-verify-board-honesty.mjs"], {encoding:"utf8"});
  if (gate.status !== 0) { console.error("HONESTY FAIL"); process.exit(1); }
  const gate = require("child_process").spawnSync("node", ["demigod-verify-board-honesty.mjs"], {encoding:"utf8"});
  if (gate.status !== 0) { console.error("HONESTY FAIL"); process.exit(1); }
  const gate = require("child_process").spawnSync("node", ["demigod-verify-board-honesty.mjs"], {encoding:"utf8"});
  if (gate.status !== 0) { console.error("HONESTY FAIL"); process.exit(1); }
  const gate = require("child_process").spawnSync("node", ["demigod-verify-board-honesty.mjs"], {encoding:"utf8"});
  if (gate.status !== 0) { console.error("HONESTY FAIL"); process.exit(1); }
  const gate = require("child_process").spawnSync("node", ["demigod-verify-board-honesty.mjs"], {encoding:"utf8"});
  if (gate.status !== 0) { console.error("HONESTY FAIL"); process.exit(1); }
  const gate = require("child_process").spawnSync("node", ["demigod-verify-board-honesty.mjs"], {encoding:"utf8"});
  if (gate.status !== 0) { console.error("HONESTY FAIL"); process.exit(1); }
  const gate = require("child_process").spawnSync("node", ["demigod-verify-board-honesty.mjs"], {encoding:"utf8"});
  if (gate.status !== 0) { console.error("HONESTY FAIL"); process.exit(1); }
  const gate = require("child_process").spawnSync("node", ["demigod-verify-board-honesty.mjs"], {encoding:"utf8"});
  if (gate.status !== 0) { console.error("HONESTY FAIL"); process.exit(1); }
  // Fable gate: honesty before publish
const gate = require('child_process').spawnSync('node', ['demigod-verify-board-honesty.mjs'], {encoding:'utf8'});
  if (gate.status !== 0) { console.log('HONESTY FAIL, skip publish'); process.exit(1); }
const pub = spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8' });
console.log(JSON.stringify({
  ok: true,
  id: result.record.id,
  featured: result.featured,
  board: { roles: result.board.roles?.length, candidates: result.board.candidates?.length },
  publish: pub.status === 0 ? pub.stdout?.trim() : pub.stderr,
}));