#!/usr/bin/env node
// Honesty gate for the LIVE site's served HTML (the crawler's view). The homepage ships dishonest
// authored copy that ~15 runtime "scrub" scripts patch for JS users — but crawlers and no-JS clients
// index the un-scrubbed source. This audits the crawler-visible CONTENT (outside <script>/<style>,
// so the scrub scripts' own regex patterns don't false-positive) for banned phrases.
//
// Currently RED by design: it flags the real trust-leak. It goes GREEN when the source copy is fixed
// (Webflow Designer edits — see WEBFLOW-HONESTY-FIX-READY.md). Wire into verify-all once green.
//
//   node demigod-live-honesty-audit.mjs [--url <u>] [--selftest]
const URL = (() => { const i = process.argv.indexOf('--url'); return i > 0 ? process.argv[i + 1] : 'https://www.trydemigod.com/'; })();
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// Each: label + a regex tested against crawler-visible content (scripts/styles stripped).
export const BANNED = [
  { label: 'stale email (hello@ — should be potter@)', re: /hello@(?:try)?demigod\.com/i },
  { label: 'overclaim "Human-Matched" (model is tech-ranks + human-review)', re: /human-?matched/i },
  { label: 'off-brand CTA "FIND TALENT"', re: /\bfind talent\b/i },
  { label: 'overclaim "pre-vetted"', re: /\bpre-?vetted\b/i },
  { label: 'volume promise "3-5 candidates"', re: /\b3\s*[–-]\s*5\s+(?:candidates?|finalists?|profiles?|matches?)/i },
  { label: 'unbacked "replacement guarantee"', re: /replacement\s+guarantee/i },
  { label: 'stray "Untitled" title', re: /<title>\s*untitled\s*<\/title>/i },
];

// Strip <script> and <style> blocks so the scrub scripts' own regex patterns don't false-positive.
export function crawlerVisible(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
}

export function auditHtml(html) {
  // Test against script/style-stripped content: the page <title> lives in <head> (kept), while the
  // scrub scripts' own regex patterns AND code comments (which mention <title>Untitled</title> etc.)
  // live inside <script> (dropped) — so they can't false-positive.
  const content = crawlerVisible(html);
  return BANNED.filter(b => b.re.test(content)).map(b => b.label);
}

if (process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  // dishonest content is caught…
  assert(auditHtml('<h2>Human-Matched startup talent</h2>').includes('overclaim "Human-Matched" (model is tech-ranks + human-review)'), 'catches Human-Matched');
  assert(auditHtml('<a href="mailto:hello@trydemigod.com">x</a>').length === 1, 'catches hello@');
  // …but the scrub scripts (which contain the regex patterns) do NOT false-positive
  assert(auditHtml('<script>var BAD=/hello@demigod\\.com/;var v=/human-matched/i;</script><h1>Demigod</h1>').length === 0, 'scrub scripts excluded (no false positive)');
  // a code comment INSIDE a script that mentions <title>Untitled</title> must NOT false-positive
  assert(auditHtml('<head><title>Demigod</title></head><script>/* stray <title>Untitled</title> soft-404 */</script>').length === 0, 'script-comment title excluded');
  // but a real stray <title> in the head IS caught
  assert(auditHtml('<head><title>Untitled</title></head>').includes('stray "Untitled" title'), 'real head Untitled caught');
  // clean honest content passes
  assert(auditHtml('<h2>Tech-matched SF startup talent</h2><a href="mailto:potter@trydemigod.com">potter@</a>').length === 0, 'honest content passes');
  console.log(JSON.stringify({ ok: true, selftest: 'live-honesty-audit' }));
  process.exit(0);
}

const r = await fetch(URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
const html = await r.text();
const found = auditHtml(html);
console.log(JSON.stringify({ ok: found.length === 0, url: URL, httpStatus: r.status, bannedInServedHtml: found }, null, 2));
process.exit(found.length ? 1 : 0);
