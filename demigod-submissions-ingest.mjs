#!/usr/bin/env node
/** CLI: ingest a submission from JSON file or stdin. */
import fs from 'fs';
import { ingestSubmission } from './demigod-submissions-lib.mjs';

const args = process.argv.slice(2);
const arg = args.find((value) => !value.startsWith('--'));
let body = {};
if (arg && arg !== '-') {
  body = JSON.parse(fs.readFileSync(arg, 'utf8'));
} else {
  const stdin = fs.readFileSync(0, 'utf8');
  body = JSON.parse(stdin);
}

const result = ingestSubmission(body);

console.log(
  JSON.stringify({
    ok: true,
    id: result.record?.id,
    featured: result.featured,
    board: { roles: result.board?.roles?.length, candidates: result.board?.candidates?.length },
  }),
);
