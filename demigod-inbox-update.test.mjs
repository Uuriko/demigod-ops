import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const lib = new URL('./demigod-submissions-lib.mjs', import.meta.url).href;

function runWriter(inboxPath, id, holdMs) {
  const source = `
    import { updateInbox } from ${JSON.stringify(lib)};
    updateInbox((inbox) => {
      const until = Date.now() + ${holdMs};
      while (Date.now() < until) {}
      inbox.items.unshift({ id: ${JSON.stringify(id)} });
    });
  `;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      env: { ...process.env, DEMIGOD_INBOX_PATH: inboxPath },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr || `exit ${code}`)));
  });
}

test('locked inbox updates preserve concurrent writers', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-inbox-update-'));
  const inboxPath = path.join(dir, 'inbox.json');
  fs.writeFileSync(inboxPath, JSON.stringify({ items: [] }), { mode: 0o600 });

  const first = runWriter(inboxPath, 'review', 200);
  await new Promise((resolve) => setTimeout(resolve, 30));
  await Promise.all([first, runWriter(inboxPath, 'ingest', 0)]);

  const inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
  assert.deepEqual(new Set(inbox.items.map((item) => item.id)), new Set(['review', 'ingest']));
  assert.equal(fs.statSync(inboxPath).mode & 0o777, 0o600);
});

test('review and approval route mutations through locked helpers', () => {
  const review = fs.readFileSync(new URL('demigod-submissions-inbox.mjs', import.meta.url), 'utf8');
  const approval = fs.readFileSync(new URL('demigod-submissions-approve.mjs', import.meta.url), 'utf8');
  const gmail = fs.readFileSync(new URL('demigod-gmail-forms.mjs', import.meta.url), 'utf8');
  const funnel = fs.readFileSync(new URL('demigod-funnel.mjs', import.meta.url), 'utf8');
  assert.match(review, /updateInbox\(/);
  assert.match(approval, /approveSubmission\(/);
  assert.match(gmail, /inboxPatched = updateInbox\(/);
  assert.match(funnel, /gmail\.inboxPatched = updateInbox\(/);
  assert.doesNotMatch(review + approval + gmail + funnel, /saveInbox\(/);
});
