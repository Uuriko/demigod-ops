import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  parseGitIndex,
  REQUIRED_IGNORE_RULES,
  verifyNoCommittableSor,
} from './demigod-no-committable-sor-lib.mjs';

function makeIndex(files, { version = 2, extended = false, extensions = [] } = {}) {
  const header = Buffer.alloc(12);
  header.write('DIRC');
  header.writeUInt32BE(version, 4);
  header.writeUInt32BE(files.length, 8);
  const entries = files.map((file) => {
    const name = Buffer.from(file);
    const fixed = Buffer.alloc(62);
    fixed.writeUInt16BE(Math.min(name.length, 0xfff) | (extended ? 0x4000 : 0), 60);
    const unpadded = Buffer.concat([
      fixed,
      ...(extended ? [Buffer.alloc(2)] : []),
      name,
      Buffer.from([0]),
    ]);
    return Buffer.concat([unpadded, Buffer.alloc((8 - (unpadded.length % 8)) % 8)]);
  });
  const extensionBuffers = extensions.map(([signature, data = Buffer.alloc(0)]) => {
    const extension = Buffer.alloc(8);
    extension.write(signature, 0, 4, 'ascii');
    extension.writeUInt32BE(data.length, 4);
    return Buffer.concat([extension, data]);
  });
  const body = Buffer.concat([header, ...entries, ...extensionBuffers]);
  return Buffer.concat([body, crypto.createHash('sha1').update(body).digest()]);
}

function makeRepo(t, files, { rules = REQUIRED_IGNORE_RULES, index } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sor-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.git'));
  fs.writeFileSync(path.join(root, '.git', 'index'), index || makeIndex(files));
  fs.writeFileSync(path.join(root, '.gitignore'), `${rules.join('\n')}\n`);
  return root;
}

test('parses SHA-1 Git index v2 and extended v3 entries', () => {
  const files = ['.gitignore', 'demigod-board.json', 'dir/space name.md'];
  assert.deepEqual(parseGitIndex(makeIndex(files, { version: 2 })), files);
  assert.deepEqual(
    parseGitIndex(makeIndex(files, { version: 3, extended: true, extensions: [['TREE']] })),
    files,
  );
});

test('accepts safe tracked files behind the complete ignore policy', (t) => {
  const root = makeRepo(t, [
    '.gitignore',
    'demigod-board.json',
    'demigod-outreach/template-dm.md',
  ]);
  const result = verifyNoCommittableSor(root);
  assert.equal(result.ok, true, result.detail);
  assert.equal(result.trackedCount, 3);
});

test('rejects tracked private SoRs, operational files, and home runtime config', (t) => {
  const result = verifyNoCommittableSor(
    makeRepo(t, [
      '.gitconfig',
      '.openclaude/settings.json',
      'DEMIGOD-BOARD.json',
      'DEMIGOD-INBOX-REPORT.json',
      'DEMIGOD-REFERRALS.json',
      'DEMIGOD-REFERRALS.json.archive.jsonl',
      'talent-crm/candidate.json',
    ]),
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.trackedSensitive, [
    '.gitconfig',
    '.openclaude/settings.json',
    'DEMIGOD-BOARD.json',
    'DEMIGOD-INBOX-REPORT.json',
    'DEMIGOD-REFERRALS.json',
    'DEMIGOD-REFERRALS.json.archive.jsonl',
    'talent-crm/candidate.json',
  ]);
});

test('keeps aggregate reports safe while rejecting inbox reports with contact rows', (t) => {
  const result = verifyNoCommittableSor(
    makeRepo(t, ['DEMIGOD-BOARD-REPORT.json', 'DEMIGOD-INBOX-REPORT.json']),
  );
  assert.deepEqual(result.trackedSensitive, ['DEMIGOD-INBOX-REPORT.json']);
});

test('rejects missing privacy rules and unsafe negations', (t) => {
  const missing = REQUIRED_IGNORE_RULES.filter((rule) => rule !== 'DEMIGOD-BOARD.json');
  const result = verifyNoCommittableSor(
    makeRepo(t, ['.gitignore'], {
      rules: [...missing, '!DEMIGOD-BOARD.json', '!unrelated-safe-file'],
    }),
  );
  assert.deepEqual(result.missingIgnoreRules, ['DEMIGOD-BOARD.json']);
  assert.deepEqual(result.unsafeNegations, [
    '!DEMIGOD-BOARD.json',
    '!unrelated-safe-file',
  ]);
  assert.equal(result.ok, false);
});

test('fails closed on unsupported, split, sparse, and corrupt indexes', (t) => {
  const cases = [
    ['version 4', makeIndex([], { version: 4 }), /version 4 unsupported/],
    ['split', makeIndex([], { extensions: [['link']] }), /split index unsupported/],
    ['sparse', makeIndex([], { extensions: [['sdir']] }), /sparse index unsupported/],
    ['required extension', makeIndex([], { extensions: [['abcd']] }), /required git index extension abcd unsupported/],
  ];
  const corrupt = makeIndex([]);
  corrupt[corrupt.length - 1] ^= 0xff;
  cases.push(['checksum', corrupt, /checksum invalid/]);

  for (const [name, index, expected] of cases) {
    const result = verifyNoCommittableSor(makeRepo(t, [], { index }));
    assert.equal(result.ok, false, name);
    assert.match(result.error, expected, name);
  }
});
