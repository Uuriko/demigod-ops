#!/usr/bin/env node
/**
 * Local button audit for a planted source in an explicit data root.
 * Writes DEMIGOD-BUTTON-AUDIT.json under DEMIGOD_ROOT. Does not open a browser.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false, clicked: false };
const QUICK_TARGETS = [
  /FIND TALENT/i,
  /^Pricing$/i,
  /^Partners$/i,
  /engineer/i,
  /HIRE TALENT/i,
  /JOIN NETWORK/i,
  /^Privacy$/i,
  /^BECOME A PARTNER$/i,
  /How it works/i,
];
const FULL_ROUTES = ['/', '/#partnerships', '/#privacy', '/#terms', '/#legal'];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-BUTTON-AUDIT.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'button-audit');
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

function attr(tag, name) {
  const found = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
  return found ? found[1] : '';
}

function hasId(html, id) {
  return new RegExp(`id=["']${id}["']`, 'i').test(html);
}

function outsideModals(html) {
  return html.replace(/<div\b[^>]*id=["'](?:startup-modal|jobseeker-modal|partner-modal)["'][^>]*>[\s\S]*?<\/div>/gi, '');
}

function textAfter(html, index, tag) {
  const labeled = attr(tag, 'aria-label') || attr(tag, 'value');
  if (labeled) return labeled.trim().replace(/\s+/g, ' ').slice(0, 80);
  const rest = html.slice(index + tag.length);
  const close = rest.search(/</);
  return (close < 0 ? rest : rest.slice(0, close)).trim().replace(/\s+/g, ' ').slice(0, 80);
}

function isHidden(tag) {
  return /\bhidden\b|display:\s*none|visibility:\s*hidden/i.test(tag);
}

function interactives(html) {
  const surface = outsideModals(html);
  const items = [];
  const seen = new Set();
  const re = /<(a|button|input|span|div)\b[^>]*>/gi;
  let match;
  while ((match = re.exec(surface)) !== null) {
    const tag = match[0];
    const tagName = match[1].toUpperCase();
    const role = attr(tag, 'role');
    const submit = tagName === 'INPUT' && /type=["']submit["']/i.test(tag);
    const interactive = tagName === 'A' || tagName === 'BUTTON' || submit || role === 'button';
    if (!interactive || isHidden(tag)) continue;
    const text = textAfter(surface, match.index, tag);
    const href = attr(tag, 'href');
    if (!text && !href && tagName !== 'BUTTON') continue;
    const key = `${tagName}|${href}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      tag: tagName,
      text,
      href,
      modal: attr(tag, 'data-demigod-modal'),
      scroll: attr(tag, 'data-dg-nav'),
      partnerApply: /data-dg-partner-apply/i.test(tag),
      id: attr(tag, 'id'),
      cls: attr(tag, 'class').slice(0, 60),
    });
  }
  return items;
}

function classify(item, html) {
  if (item.modal === 'startup' && hasId(html, 'startup-modal')) return 'startup-modal';
  if ((item.modal === 'engineer' || item.modal === 'jobseeker') && hasId(html, 'jobseeker-modal')) return 'engineer-modal';
  if ((item.modal === 'partner' || item.partnerApply) && hasId(html, 'partner-modal')) return 'partner-modal';
  if (item.href === '#partnerships' && hasId(html, 'demigod-partnerships-wrap')) return 'partners-page';
  if ((item.href === '#privacy' || item.href === '#terms' || item.href === '#legal') && hasId(html, 'demigod-legal-wrap')) return 'legal-page';
  if (item.href === '#demigod-pricing' && hasId(html, 'demigod-pricing')) return 'hash:#demigod-pricing';
  if (item.href === '#demigod-trust-block' && hasId(html, 'demigod-trust-block')) return 'scroll-trust';
  if (item.href.startsWith('mailto:')) return 'mailto';
  if (item.href === '/' || item.href.startsWith('#')) {
    const id = item.href.startsWith('#') ? item.href.slice(1) : '';
    if (id && hasId(html, id)) return `hash:${item.href}`;
    if (item.href === '/') return 'navigate';
  }
  return 'noop';
}

function isBroken(item, result) {
  return (item.text && /^(GET STARTED|LEARN MORE|SUBSCRIBE|CONTACT)$/i.test(item.text))
    || (item.href === '#' && !item.modal && result === 'noop')
    || (item.scroll === 'scroll' && result === 'noop')
    || (item.text === 'Pricing' && result === 'noop');
}

function routeSlug(route) {
  if (route === '/') return 'home';
  return route.replace(/[^a-z0-9]+/gi, '_').replace(/^_+/, '') || 'home';
}

function bareFrom(text) {
  if (text == null) return { present: false, fetched: false, is404: false, foot: false };
  const head = text.slice(0, 8000);
  return {
    present: true,
    fetched: false,
    status: /404|not found/i.test(head) ? 404 : 200,
    foot: /dg-foot-v\d+-core/.test(text),
    is404: /404|not found/i.test(head),
  };
}

function auditRoute(route, html, items, clicks) {
  return {
    meta: {
      foot: /dg-foot-v\d+-core/.test(html),
      nav: hasId(html, 'dg-site-nav'),
      trust: hasId(html, 'demigod-trust-block'),
      pricing: hasId(html, 'demigod-pricing'),
      partnersWrap: hasId(html, 'demigod-partnerships-wrap'),
      legalWrap: hasId(html, 'demigod-legal-wrap'),
      partnersPage: route.includes('partnerships') && hasId(html, 'demigod-partnerships-wrap'),
      legalPage: /privacy|terms|legal/.test(route) && hasId(html, 'demigod-legal-wrap'),
    },
    interactives: items.length,
    clicks,
    broken: clicks.filter((click) => click.broken),
    deadHash: clicks.filter((click) => click.href === '#' && click.result === 'noop'),
    missingPricing: !hasId(html, 'demigod-pricing') && route === '/',
  };
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
    refuse('button_root_required');
  }
  const html = readLocal(root, 'demigod-button-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const quick = process.argv.includes('--quick');
  const routes = quick ? ['/'] : FULL_ROUTES;
  const items = interactives(htmlText);
  const chosen = quick
    ? QUICK_TARGETS.map((rx) => items.find((item) => rx.test(item.text) || rx.test(item.href))).filter(Boolean)
    : items;
  const clicks = chosen.map((item) => {
    const result = classify(item, htmlText);
    return { ...item, result, broken: isBroken(item, result), clicked: false };
  });
  const dir = shotDir();
  const screenshots = routes.map((route) => path.join(dir, `${routeSlug(route)}.shot`));
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, report) || screenshots.some((file) => !insideRoot(root, file))) {
    refuse('button_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  for (const file of screenshots) {
    fs.writeFileSync(file, `${footMarker}\n${path.basename(file, '.shot')}\n`);
  }
  const routeReports = Object.fromEntries(routes.map((route, index) => {
    const audited = auditRoute(route, htmlText, items, clicks);
    audited.shot = screenshots[index];
    return [route, audited];
  }));
  const bareUrls = {
    '/legal': bareFrom(readLocal(root, 'demigod-button-legal.html')),
    '/partnerships': bareFrom(readLocal(root, 'demigod-button-partnerships.html')),
  };
  const totalBroken = Object.values(routeReports).reduce((count, route) => count + route.broken.length, 0);
  const summary = {
    totalBroken,
    bareLegal404: bareUrls['/legal'].is404 === true,
    barePartnerships404: bareUrls['/partnerships'].is404 === true,
  };
  const ok = totalBroken === 0;
  const body = {
    ok,
    at: new Date().toISOString(),
    path: report,
    shotDir: dir,
    source: 'disk',
    footMarker,
    quick,
    routes: routeReports,
    bareUrls,
    summary,
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
    quick,
    summary,
    clicks: clicks.length,
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
    console.error(JSON.stringify({ ok: false, error: 'button_audit_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
