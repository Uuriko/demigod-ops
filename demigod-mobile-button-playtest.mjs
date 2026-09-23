#!/usr/bin/env node
/**
 * Local mobile button playtest for a planted source in an explicit data root.
 * Writes DEMIGOD-MOBILE-BUTTON-PLAYTEST.json under DEMIGOD_ROOT. Does not open a browser.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false, tapped: false };
const MIN_TAP = 44;
const TARGETS = [
  { sel: '#dg-bar .dg-h', marker: /class=["'][^"']*\bdg-h\b[^"']*["']/i, expect: 'startup', modal: 'startup-modal' },
  { sel: '#dg-bar .dg-j', marker: /class=["'][^"']*\bdg-j\b[^"']*["']/i, expect: 'engineer', modal: 'jobseeker-modal' },
  { sel: '#dg-site-nav .dg-nav-cta', marker: /class=["'][^"']*\bdg-nav-cta\b[^"']*["']/i, expect: 'startup', modal: 'startup-modal' },
  { sel: '#dg-site-nav a[data-demigod-modal=jobseeker]', marker: /data-demigod-modal=["']jobseeker["']/i, expect: 'engineer', modal: 'jobseeker-modal' },
  { sel: '#demigod-pricing a[data-demigod-modal=startup]', marker: /data-demigod-modal=["']startup["']/i, expect: 'startup', modal: 'startup-modal' },
  { sel: '#demigod-partners-teaser a[data-dg-partner-apply]', marker: /data-dg-partner-apply/i, expect: 'partner', modal: 'partner-modal' },
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-MOBILE-BUTTON-PLAYTEST.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'mobile-playtest');
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

function hasId(html, id) {
  return new RegExp(`id=["']${id}["']`, 'i').test(html);
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

function isHidden(tag) {
  return /\bhidden\b|display:\s*none/i.test(tag);
}

function isSizedTarget(tag) {
  return /class=["'][^"']*\b(?:dg-h|dg-j|dg-nav-cta|premium-btn)\b[^"']*["']/i.test(tag)
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

function sizesFrom(html) {
  const sizes = [];
  for (const match of html.matchAll(/<(?:a|button)\b[^>]*>/gi)) {
    const tag = match[0];
    if (!isSizedTarget(tag) || isHidden(tag)) continue;
    const height = declaredHeight(tag);
    const text = html.slice(match.index + tag.length).split('<')[0].trim().slice(0, 32);
    sizes.push({ text, h: height, ok: height != null && height >= MIN_TAP });
  }
  return sizes;
}

function wizardFrom(html) {
  const next = html.match(/<[^>]*class=["'][^"']*\bdg-wiz-next\b[^"']*["'][^>]*>/i);
  const nextH = next ? (declaredHeight(next[0]) || 0) : 0;
  const modal = /id=["']startup-modal["'][^>]*\bdg-wiz-active\b|\bdg-wiz-active\b[^>]*id=["']startup-modal["']/i.test(html);
  const shown = html.match(/<[^>]*class=["'][^"']*\bdg-wiz-show\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  const advanced = !!(shown && /name=["']contact-email["']/i.test(shown[0]));
  return { nextH, modal, advanced };
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
    refuse('playtest_root_required');
  }
  const html = readLocal(root, 'demigod-mobile-playtest-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const ver = footVer(footText);
  const taps = TARGETS.map((target) => {
    const opened = target.marker.test(htmlText) && hasId(htmlText, target.modal);
    return {
      sel: target.sel,
      expect: target.expect,
      opened,
      err: opened ? null : 'selector_missing',
      tapped: false,
    };
  });
  const sizes = sizesFrom(htmlText);
  const wizard = wizardFrom(htmlText);
  const hiddenHero = heroCtasHidden(htmlText);
  const pass = {
    footV75: ver === '75',
    heroCtasHidden: hiddenHero,
    touchUi: hasId(htmlText, 'dg-touch-style'),
    minTapTargets: sizes.length > 0 && sizes.every((size) => size.ok),
    allOpen: taps.every((tap) => tap.opened && !tap.err),
    wizNextTap: wizard.advanced && wizard.nextH >= MIN_TAP,
  };
  const ok = Object.values(pass).every(Boolean);
  const dir = shotDir();
  const shot = path.join(dir, 'mobile-buttons.shot');
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, shot) || !insideRoot(root, report)) {
    refuse('playtest_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\nmobile-buttons\n`);
  const body = {
    ok,
    at: new Date().toISOString(),
    path: report,
    shot,
    source: 'disk',
    footMarker,
    viewport: { w: 390, h: 844 },
    state: { foot: ver, touchStyle: pass.touchUi },
    sizes,
    taps,
    wizTap: wizard,
    pass,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok,
    path: report,
    shot,
    source: 'disk',
    footMarker,
    pass,
    taps: taps.length,
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
    console.error(JSON.stringify({ ok: false, error: 'mobile_playtest_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
