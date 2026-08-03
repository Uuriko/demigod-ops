#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));

export function archivedInboxes(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.startsWith('DEMIGOD-SUBMISSIONS-INBOX.json')) out.push(file);
    }
  };
  walk(path.join(root, 'archive'));
  return out;
}

export function hardenArchivedInboxes(root = ROOT, apply = false) {
  const files = archivedInboxes(root);
  const unsafe = files.filter((file) => (fs.statSync(file).mode & 0o077) !== 0);
  if (apply) for (const file of unsafe) fs.chmodSync(file, 0o600);
  return { files: files.length, unsafe: unsafe.length, hardened: apply ? unsafe.length : 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = hardenArchivedInboxes(ROOT, process.argv.includes('--apply'));
  console.log(JSON.stringify({ ok: result.unsafe === 0 || result.hardened === result.unsafe, ...result }, null, 2));
}
