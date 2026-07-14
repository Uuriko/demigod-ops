#!/usr/bin/env node
/**
 * demigod-route-mime — ROUTE DELIVERY GATE (read-only)
 *
 * User-facing product routes must deliver text/html (not catbox text/plain).
 * Default: same-origin LIVE /?p=slug only (release-relevant).
 * Optional --from-pages-json: diagnostic probes of DEMIGOD-PAGES.json catbox URLs
 * (raw .html often text/plain — expected fail; do not navigate users there).
 *
 * JSON: /tmp/dg-busy/route-mime.json · CLI: bin/dg mime · used by full-check.
 *
 * Usage:
 *   node demigod-route-mime.mjs [--json] [--from-pages-json]
 *   bin/dg mime
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const fromPages = args.includes('--from-pages-json');

const SLUGS = ['how', 'hire', 'talent', 'pricing', 'compare', 'proof', 'faq', 'pilot', 'network'];

async function probe(url) {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'demigod-route-mime', Accept: 'text/html,*/*' },
      redirect: 'follow',
    });
    const ct = r.headers.get('content-type') || '';
    const text = await r.text();
    const isHtml =
      /text\/html/i.test(ct) ||
      /^\s*</.test(text) && /<html|<!doctype html/i.test(text.slice(0, 500));
    const isPlain = /text\/plain/i.test(ct) && !isHtml;
    return {
      url: r.url,
      status: r.status,
      contentType: ct,
      bytes: Buffer.byteLength(text),
      isHtml: Boolean(isHtml),
      isPlain: Boolean(isPlain),
      ok: r.ok && isHtml && !isPlain,
      hint: isPlain
        ? 'text/plain — do not use as user navigation (catbox HTML risk); use /?p= or Webflow page'
        : !isHtml
          ? 'not HTML'
          : null,
    };
  } catch (e) {
    return { url, status: 0, ok: false, error: String(e.message || e) };
  }
}

async function main() {
  const checks = [];

  for (const slug of SLUGS) {
    checks.push({ kind: 'live-query', slug, ...(await probe(`${LIVE}/?p=${slug}`)) });
  }

  if (fromPages) {
    const p = path.join(ROOT, 'DEMIGOD-PAGES.json');
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const [slug, url] of Object.entries(j.pages || {})) {
        checks.push({ kind: 'pages-json', slug, ...(await probe(url)) });
      }
    }
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    at: new Date().toISOString(),
    pass: failed.length === 0,
    checked: checks.length,
    failed: failed.length,
    checks,
  };

  fs.mkdirSync('/tmp/dg-busy', { recursive: true });
  fs.writeFileSync('/tmp/dg-busy/route-mime.json', JSON.stringify(report, null, 2) + '\n');

  if (asJson) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`# route-mime ${report.pass ? 'PASS' : 'FAIL'} · ${checks.length} checks · ${failed.length} fail`);
    for (const c of checks) {
      const mark = c.ok ? '✓' : '✗';
      console.log(
        `  ${mark} [${c.kind}] ${c.slug || ''} ${c.status} ${c.contentType || c.error || ''} ${c.hint || ''}`,
      );
    }
  }
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
