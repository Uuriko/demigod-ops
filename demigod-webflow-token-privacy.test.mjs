import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-webflow-token.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(source, /tokenPreview|token\.slice\(/, 'token diagnostics must never expose credential bytes');

const secret = 'wf_live_privacy_sentinel_6472';
const cli = spawnSync(process.execPath, ['demigod-webflow-token.mjs'], {
  cwd: new URL('.', import.meta.url),
  encoding: 'utf8',
  env: { ...process.env, WEBFLOW_API_TOKEN: secret },
});
assert.equal(cli.status, 0, cli.stderr);
assert.doesNotMatch(`${cli.stdout}${cli.stderr}`, new RegExp(secret), 'token diagnostics leaked the credential');

console.log('demigod Webflow token privacy: PASS');
