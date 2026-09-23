#!/usr/bin/env node
/**
 * Local mobile audit for a planted source in an explicit data root.
 * Writes DEMIGOD-MOBILE-AUDIT.json under DEMIGOD_ROOT. Does not open a browser.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const COPY_LEAK = /meet your 3-5|within 24 hours|48\s*h|syndicate subscription|\$5\s*k|curated insights|methodology/i;
const MIN_TAP = 44;
const MIN_INPUT = 16;
const VIEWPORT = { w: 390, h: 844 };

const ROUTES = [
  { id: 'home', marker: /id=["']dg-bar["']/i },
  { id: 'trust', marker: /id=["']demigod-trust-block["']/i },
  { id: 'pricing', marker: /id=["']demigod-pricing["']/i },
  { id: 'partners-teaser', marker: /id=["']demigod-partners-teaser["']/i },
  { id: 'partners-page', marker: /id=["']demigod-partnerships-wrap["']/i },
  { id: 'privacy', marker: /id=["']demigod-legal-privacy["']/i },
];

const TAPS = [
  { sel: '#dg-bar .dg-h', marker: /class=["'][^"']*\bdg-h\b[^"']*["']/i, expect: 'startup', modal: /id=["']startup-modal["']/i },
  { sel: '#dg-site-nav .dg-nav-cta', marker: /class=["'][^"']*\bdg-nav-cta\b[^"']*["']/i, expect: 'startup', modal: /id=["']startup-modal["']/i },
  { sel: '#demigod-pricing a[data-demigod-modal=startup]', marker: /data-demigod-modal=["']startup["']/i, expect: 'startup', modal: /id=["']startup-modal["']/i },
  { sel: '#demigod-partners-teaser a[data-dg-partner-apply]', marker: /data-dg-partner-apply/i, expect: 'partner', modal: /id=["']partner-modal["']/i },
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-MOBILE-AUDIT.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'mobile-audit');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, error, ...localFlags }));
  process.exit(1);
}

function insideRoot(root, file) {
  const base = path.resolve(root);
  const resolved = path.resolve(file);
  return resolved === base || resolved.startsWith(base + path.sep);
}

function readLocal(root, name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function footVer(foot) {
  const marked = foot.match(/__dgFootVer\s*=\s*["'](\d+)["']/);
  if (marked) return marked[1];
  const file = foot.match(/dg-foot-v(\d+)/);
  return file ? file[1] : '';
}

function declaredPx(tag, prop) {
  const style = tag.match(/\bstyle=["']([^"']*)["']/i);
  if (!style) return null;
  const found = style[1].match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`, 'i'));
  return found ? Number(found[1]) : null;
}

function declaredHeight(tag) {
  const height = declaredPx(tag, 'height');
  const minHeight = declaredPx(tag, 'min-height');
  if (height == null && minHeight == null) return null;
  return Math.max(height || 0, minHeight || 0);
}

function openTags(html) {
  return [...html.matchAll(/<(?:a|button)\b[^>]*>/gi)].map((match) => match[0]);
}

function isHidden(tag) {
  return /\bhidden\b|display:\s*none/i.test(tag);
}

function isTapTarget(tag) {
  return /class=["'][^"']*\b(?:dg-h|dg-j|dg-nav-cta|premium-btn|w-button)\b[^"']*["']/i.test(tag)
    || /data-demigod-modal=/i.test(tag)
    || /data-dg-partner-apply/i.test(tag);
}

function heroCtasHidden(html) {
  const hero = html.match(/<[^>]*class=["'][^"']*\bhero-section\b[^"']*["'][^>]*>[\s\S]*?<\/(?:section|div)>/i);
  if (!hero) return true;
  const btn = hero[0].match(/<a\b[^>]*\bpremium-btn\b[^>]*>/i);
  if (!btn) return true;
  return isHidden(btn[0]);
}

function overflowX(html) {
  return [...html.matchAll(/(?:^|[^-])(?:min-)?width\s*:\s*(\d+)px/gi)].some((match) => Number(match[1]) > VIEWPORT.w + 8);
}

function copyLeaks(html) {
  const text = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const hits = [];
  const re = />([^<]{1,200})</g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const line = match[1].trim();
    if (line && COPY_LEAK.test(line)) hits.push(line.slice(0, 80));
  }
  return hits.slice(0, 20);
}

function inputCovered(html) {
  const nav = html.match(/<[^>]*class=["'][^"']*\bdg-wiz-nav\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  return !!(nav && /name=["']contact-email["']/i.test(nav[0]));
}

function wizardFrom(html) {
  const next = html.match(/<[^>]*class=["'][^"']*\bdg-wiz-next\b[^"']*["'][^>]*>/i);
  const nextH = next ? (declaredHeight(next[0]) || 0) : 0;
  const modal = /id=["']startup-modal["'][^>]*\bdg-wiz-active\b|\bdg-wiz-active\b[^>]*id=["']startup-modal["']/i.test(html);
  const input = html.match(/<input\b[^>]*name=["']contact-email["'][^>]*>/i);
  const inputFs = input ? (declaredPx(input[0], 'font-size') || 0) : 0;
  const covered = inputCovered(html);
  const issues = [];
  if (!modal) issues.push({ severity: 'high', code: 'startup_modal_no_open' });
  if (nextH < MIN_TAP) issues.push({ severity: 'high', code: 'wiz_next_small', h: nextH });
  if (covered) issues.push({ severity: 'high', code: 'input_hidden_by_wiz_nav' });
  if (inputFs > 0 && inputFs < MIN_INPUT) issues.push({ severity: 'medium', code: 'wiz_input_font_small', fs: inputFs });
  return { modal, nextH, inputFs, inputCoveredByNav: covered, issues };
}

function layoutIssues(html) {
  const issues = [];
  if (overflowX(html)) issues.push({ severity: 'high', code: 'horizontal_overflow' });
  for (const tag of openTags(html)) {
    if (!isTapTarget(tag) || isHidden(tag)) continue;
    const height = declaredHeight(tag);
    if (height == null) issues.push({ severity: 'high', code: 'tap_size_unmeasured' });
    else if (height < MIN_TAP) issues.push({ severity: 'high', code: 'small_tap_targets', h: height });
  }
  return issues;
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--designer')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('mobile_root_required');
  }
  const html = readLocal(root, 'demigod-mobile-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const ver = footVer(footText);
  const leaks = copyLeaks(htmlText);
  const wizard = wizardFrom(htmlText);
  const layout = layoutIssues(htmlText);
  const taps = TAPS.map((tap) => {
    const opened = tap.marker.test(htmlText) && tap.modal.test(htmlText);
    return { sel: tap.sel, expect: tap.expect, opened, err: opened ? null : 'selector_missing', tapped: false };
  });
  const issues = [];
  for (const route of ROUTES) {
    if (!route.marker.test(htmlText)) issues.push({ severity: 'high', code: 'route_missing', route: route.id });
  }
  if (leaks.length) issues.push({ severity: 'medium', code: 'copy_leaks', count: leaks.length });
  issues.push(...layout);
  for (const tap of taps) {
    if (!tap.opened || tap.err) issues.push({ severity: 'high', code: 'cta_tap_fail', sel: tap.sel });
  }
  issues.push(...wizard.issues);
  const hiddenHero = heroCtasHidden(htmlText);
  if (!hiddenHero) issues.push({ severity: 'high', code: 'hero_cta_visible' });
  const high = issues.filter((issue) => issue.severity === 'high');
  const medium = issues.filter((issue) => issue.severity === 'medium');
  const pass = {
    footV75: ver === '75',
    heroCtasHidden: hiddenHero,
    noOverflow: !overflowX(htmlText),
    tapsOk: taps.every((tap) => tap.opened && !tap.err),
    wizardOk: wizard.issues.filter((issue) => issue.severity === 'high').length === 0,
    copyLeaks: leaks.length === 0,
    highIssues: high.length,
  };
  const ok = pass.noOverflow && pass.tapsOk && pass.wizardOk && pass.heroCtasHidden && high.length === 0;
  const dir = shotDir();
  const screenshots = ROUTES.map((route) => path.join(dir, `${route.id}.shot`));
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, report) || screenshots.some((file) => !insideRoot(root, file))) {
    refuse('mobile_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  for (const file of screenshots) {
    fs.writeFileSync(file, `${footMarker}\n${path.basename(file, '.shot')}\n`);
  }
  const body = {
    ok,
    at: new Date().toISOString(),
    path: report,
    shotDir: dir,
    source: 'disk',
    footMarker,
    viewport: VIEWPORT,
    layoutMeasured: 'declared',
    foot: ver,
    routes: Object.fromEntries(ROUTES.map((route) => [route.id, { found: route.marker.test(htmlText) }])),
    taps,
    wizard,
    copyLeaks: leaks,
    pass,
    issues,
    summary: { high: high.length, medium: medium.length, total: issues.length },
    screenshots,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok,
    path: report,
    shot: screenshots[0],
    shots: screenshots.length,
    source: 'disk',
    footMarker,
    pass,
    summary: body.summary,
    ...localFlags,
  }));
  if (!ok) process.exit(1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'mobile_audit_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
