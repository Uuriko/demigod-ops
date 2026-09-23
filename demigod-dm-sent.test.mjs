import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const MARK = path.join(OPS, 'demigod-dm-mark-sent.mjs');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, MARK, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const line = String(res.status === 0 ? res.stdout : res.stderr)
    .trim()
    .split('\n')
    .filter((row) => row.trim().startsWith('{'))
    .at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function sentDate(tracker, company) {
  const line = tracker.split('\n').find((row) => row.includes(`| ${company} |`));
  assert.ok(line, `missing tracker row for ${company}`);
  return line.split('|')[4].trim();
}

describe('DM sent company', { concurrency: 1 }, () => {
  test('a shared handle fragment does not stamp the other company', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-dm-sent-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = dir;
    const flag = path.join(dir, 'fetch-calls.log');
    const preload = path.join(dir, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    const outreach = path.join(dir, 'demigod-outreach');
    fs.mkdirSync(outreach, { recursive: true });
    const tracker = path.join(outreach, 'DM-BATCH-TRACKER.md');
    fs.writeFileSync(tracker, [
      '| Name | Company | Real? | Sent date | Channel | Reply | Next step |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      '| Ada East | Harbor East | yes |  | x @ada |  | send |',
      '| Ada West | Harbor West | yes |  | x @ada-west |  | send |',
      '',
    ].join('\n'));

    const marked = readJson(run(dir, preload, [
      '--handle=@ada',
      '--company=Harbor West',
      '--channel=x',
    ]), 'mark sent');
    assert.equal(marked.ok, true);
    assert.equal(marked.company, 'Harbor West');
    assert.equal(marked.handle, '@ada');
    assert.equal(marked.sent, false);
    assert.equal(marked.liveMail, false);
    assert.equal(marked.log, path.join(outreach, 'dm-send-log.txt'));
    assert.equal(marked.tracker, tracker);

    const text = fs.readFileSync(tracker, 'utf8');
    assert.equal(sentDate(text, 'Harbor East'), '');
    assert.match(sentDate(text, 'Harbor West'), /^\d{4}-\d{2}-\d{2}$/);
    const log = fs.readFileSync(marked.log, 'utf8');
    assert.equal(log.includes('SENT-CONFIRMED'), true);
    assert.equal(log.includes('Harbor West'), true);
    assert.equal(log.includes('/home/potter'), false);
    assert.equal(fs.existsSync(flag), false);
  });
});
