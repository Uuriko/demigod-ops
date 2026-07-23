#!/usr/bin/env node
/** Read-only readiness check for a genuine Webflow resume upload widget. */
import fs from 'node:fs';

const required = [
  'w-file-upload-default',
  'w-file-upload-uploading',
  'w-file-upload-success',
  'w-file-upload-error',
];

function inspect(source) {
  const form = source.match(/<form\b[^>]*(?:id="jobseeker-form"|data-name="engineer-join")[\s\S]*?<\/form>/i)?.[0] || '';
  const input = [...form.matchAll(/<input\b[^>]*>/gi)].map((m) => m[0]).find((tag) =>
    /\btype=["']file["']/i.test(tag) &&
    /\bclass=["'][^"']*\bw-file-upload-input\b/i.test(tag) &&
    /\bname=["']resume["']/i.test(tag),
  );
  const missing = required.filter((className) => !form.includes(className));
  if (!input) missing.unshift('input[type=file].w-file-upload-input[name=resume]');
  return {
    ok: missing.length === 0,
    ready: missing.length === 0,
    mode: missing.length ? 'link-only' : 'native-file-or-link',
    missing,
    prerequisite: missing.length
      ? 'Add a genuine Webflow Designer File Upload component inside the talent form; its published DOM must include the resume input plus default, uploading, success, and error states.'
      : null,
  };
}

if (process.argv.includes('--selftest')) {
  const states = required.map((name) => `<div class="${name}"></div>`).join('');
  const fixture = (name) => `<form id="jobseeker-form"><input type="file" class="w-file-upload-input" name="${name}">${states}</form>`;
  if (inspect(fixture('portfolio')).ok || !inspect(fixture('resume')).ok) throw new Error('resume upload readiness contract failed');
  console.log('resume upload readiness selftest PASS');
  process.exit(0);
}

const source = fs.readFileSync(new URL('./demigod-live-snapshot.html', import.meta.url), 'utf8');
const result = { ...inspect(source), source: 'demigod-live-snapshot.html' };

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
