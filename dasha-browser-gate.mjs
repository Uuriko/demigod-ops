#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
if (!args.length) throw new Error('browser gate needs a command');

let browser;
try {
  try { await fetch('http://127.0.0.1:9223/json/version', { signal: AbortSignal.timeout(1000) }); }
  catch { browser = await chromium.launch({ headless: true, args: ['--remote-debugging-port=9223'] }); }
  const child = spawn(args[0], args.slice(1), { stdio: 'inherit' });
  const code = await new Promise(resolve => child.on('exit', resolve));
  process.exitCode = code ?? 1;
} finally {
  await browser?.close();
}
