#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
const claims = JSON.parse(fs.readFileSync('DEMIGOD-CLAIMS.json', 'utf8') || '[]');
const results = [];
for (const c of claims) {
  try {
    const out = execSync(c.evidenceCmd, {encoding:'utf8', stdio:['pipe','pipe','pipe']});
    results.push({ ...c, status: 'VERIFIED', output: out.trim().slice(0,200) });
  } catch (e) {
    results.push({ ...c, status: 'REFUTED', error: String(e).slice(0,100) });
  }
}
console.log(JSON.stringify(results, null, 2));
fs.writeFileSync('DEMIGOD-CLAIMS.json', JSON.stringify(results, null, 2));
