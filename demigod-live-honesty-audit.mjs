#!/usr/bin/env node
// Honesty gate for the LIVE site's served HTML (the crawler's view). This audits crawler-visible
// content outside <script>/<style> so defensive scrub code cannot make the source look honest.
//
//   node demigod-live-honesty-audit.mjs [--url <u>] [--selftest]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const URL = (() => { const i = process.argv.indexOf('--url'); return i > 0 ? process.argv[i + 1] : 'https://www.trydemigod.com/'; })();
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// Each: label + a regex tested against crawler-visible content (scripts/styles stripped).
export const BANNED = [
  { label: 'stale email (hello@ — should be potter@)', re: /hello@(?:try)?demigod\.com/i },
  { label: 'overclaim "Human-Matched" (model is tech-ranks + human-review)', re: /human-?matched/i },
  { label: 'off-brand CTA "FIND TALENT"', re: /\bfind talent\b/i },
  { label: 'overclaim "pre-vetted"', re: /\bpre-?vetted\b/i },
  { label: 'volume promise "3-5 candidates"', re: /\b3\s*[–-]\s*5\s+(?:candidates?|finalists?|profiles?|matches?)/i },
  { label: 'unbacked "replacement guarantee"', re: /replacement\s+guarantee/i },
  { label: 'stray "Untitled" title', re: /<title>\s*untitled\s*<\/title>/i },
  { label: 'form action opens an email client', re: /<form\b[^>]*\baction\s*=\s*["']mailto:/i },
];

export const BANNED_ASSETS = [
  { label: 'Webflow GSAP runtime', re: /\/gsap\/[^/"']+\/gsap(?:\.min)?\.js/i },
  { label: 'Webflow SplitText plugin', re: /SplitText(?:\.min)?\.js/i },
  { label: 'Webflow ScrollTrigger plugin', re: /ScrollTrigger(?:\.min)?\.js/i },
  { label: 'Webflow IX visibility-hide rule', re: /html\.w-mod-js:not\(\.w-mod-ix3\)\s+:is\(/i },
  { label: 'retired custom IX unhide workaround', re: /id=["']dg-(?:unhide-critical|unhide-main|graceful-unhide|early-unhide)["']|unhide-v5-safe|__dgUnhideV5/i },
  { label: 'retired nav interaction', re: /i-aisb-nav-on-page-load-fade-in-all-elements-ec2d63bc/i },
  { label: 'retired section interaction', re: /i-aisb-fade-in-all-elements-5274fcbd/i },
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

export function auditAssets(html) {
  return BANNED_ASSETS.filter(b => b.re.test(String(html || ''))).map(b => b.label);
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
  assert(auditHtml('<form method="post" action="mailto:potter@trydemigod.com"></form>').includes('form action opens an email client'), 'catches mailto form action');
  // the 4 overclaims not covered above (find-talent / pre-vetted / 3-5 / replacement) each fire
  assert(auditHtml('<p>find talent, pre-vetted, meet your 3-5 candidates, 90-day replacement guarantee</p>').length === 4, 'catches find-talent + pre-vetted + 3-5 + replacement overclaims');
  // clean honest content passes
  assert(auditHtml('<h2>Tech-matched SF startup talent</h2><a href="mailto:potter@trydemigod.com">potter@</a>').length === 0, 'honest content passes');
  const bloated = '<script src="/gsap/3.15.0/gsap.min.js"></script><script src="SplitText.min.js"></script><script src="ScrollTrigger.min.js"></script><style>html.w-mod-js:not(.w-mod-ix3) :is(.nav_container){visibility:hidden}</style><style id="dg-unhide-critical">/*unhide-v5-safe*/</style>i-aisb-nav-on-page-load-fade-in-all-elements-ec2d63bc i-aisb-fade-in-all-elements-5274fcbd';
  assert(auditAssets(bloated).length === BANNED_ASSETS.length, 'catches the retired Webflow animation stack');
  assert(auditAssets('<script src="/js/webflow.js"></script>').length === 0, 'ordinary Webflow runtime passes');
  console.log(JSON.stringify({ ok: true, selftest: 'live-honesty-audit' }));
  process.exit(0);
}

if (isMain) {
  const r = await fetch(URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  const html = await r.text();
  const found = auditHtml(html);
  const assets = auditAssets(html);
  const ok = r.ok && found.length === 0 && assets.length === 0;
  console.log(JSON.stringify({ ok, url: URL, httpStatus: r.status, bannedInServedHtml: found, bannedAssets: assets }, null, 2));
  process.exit(ok ? 0 : 1);
}
