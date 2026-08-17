#!/usr/bin/env node
/** Write the trycloudflare URL, then keep cloudflared in the foreground. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const urlFile = path.join(os.homedir(), '.config/demigod/die-public-url');
const bin = process.env.CLOUDFLARED || `${os.homedir()}/.local/bin/cloudflared`;
fs.mkdirSync(path.dirname(urlFile), { recursive: true, mode: 0o700 });
const child = spawn(bin, ['tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:9880'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let found = false;
const look = (buf) => {
  const text = buf.toString();
  process.stderr.write(text);
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!match || found) return;
  found = true;
  const tmp = `${urlFile}.tmp`;
  fs.writeFileSync(tmp, `${match[0]}\n`, { mode: 0o600 });
  fs.renameSync(tmp, urlFile);
};
child.stdout.on('data', look);
child.stderr.on('data', look);
const stop = () => child.kill('SIGTERM');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code, signal) => {
  try { fs.rmSync(urlFile); } catch { /* already gone */ }
  process.exit(signal ? 1 : code ?? 1);
});
