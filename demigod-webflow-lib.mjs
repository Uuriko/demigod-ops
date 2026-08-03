#!/usr/bin/env node
/**
 * demigod-webflow-lib — shared Webflow Designer / Custom Code CDP helpers
 *
 * Used by: demigod-webflow.mjs, cm6-paste, ship scripts. Prefer freeze-aware callers.
 * CDP default: http://127.0.0.1:9223
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { BUSY, ensureBusy, readJson, atomicWrite } from './demigod-agent-tools-lib.mjs';
import { status as publishFreezeStatus } from './demigod-publish-freeze.mjs';

export const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
export const CDP = process.env.CDP_URL || process.env.DEMIGOD_CDP || 'http://127.0.0.1:9223';
export const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
export const DESIGNER = process.env.WEBFLOW_DESIGNER_URL || 'https://talentlink-sf.design.webflow.com/';
export const CUSTOM_CODE =
  process.env.WEBFLOW_CUSTOM_CODE_URL ||
  'https://webflow.com/dashboard/sites/talentlink-sf/custom-code';
export const DASHBOARD = 'https://webflow.com/dashboard';
export const SITE_SLUG = process.env.WEBFLOW_SITE || 'talentlink-sf';
export const OUT = path.join(BUSY, 'webflow-status.json');
export const PLAYBOOK_OUT = path.join(BUSY, 'webflow-playbook-latest.md');

export const CANONICAL = {
  footCore: 'demigod-foot-core.js',
  footerLite: 'demigod-footer-lite.html',
  headMinimal: 'demigod-head-minimal.html',
  headCss: 'demigod-head-styles.css',
  footManifest: 'DEMIGOD-FOOT-CDN.json',
};

/** Classify a browser tab URL (+ optional title) into a Demigod role */
export function classifyTab(url = '', title = '') {
  const u = String(url);
  const tit = String(title || '');
  if (!u || u === 'about:blank') return 'blank';
  if (/127\.0\.0\.1:9878|localhost:9878/.test(u)) return 'ops-dash';
  if (/trydemigod\.com/.test(u)) return 'live';
  if (/design\.webflow\.com/.test(u)) return 'designer';
  // Login wall often keeps "custom-code" in the r= query — must not count as paste-ready
  if (/webflow\.com\/login/i.test(u)) return 'webflow-login';
  // 404 custom-code (wrong account / no session) is not paste-ready
  if (/custom-code|custom_code/.test(u) && !/webflow\.com\/login/i.test(u)) {
    // empty title = still loading or denied shell — not paste-ready
    if (!tit.trim() || /^404\b|Access to this page has been denied|not the page you were looking/i.test(tit)) return 'webflow-login';
    return 'custom-code';
  }
  if (/webflow\.com\/.*\/forms|webflow\.com\/forms/.test(u)) return 'forms';
  if (/webflow\.com\/dashboard/.test(u)) return 'wf-dashboard';
  if (/webflow\.com/.test(u)) return 'webflow-other';
  if (/grok\.com|x\.ai|claude\.ai|chat\.openai/.test(u)) return 'agent-chat';
  if (/stripe\.(com|network)/.test(u)) return 'stripe-iframe';
  return 'other';
}

export async function cdpFetch(pathname) {
  const r = await fetch(`${CDP}${pathname}`, { signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(`CDP ${pathname} HTTP ${r.status}`);
  return r.json();
}

export async function cdpUp() {
  try {
    const v = await cdpFetch('/json/version');
    return {
      ok: true,
      browser: v.Browser || v['User-Agent'] || 'unknown',
      webSocketDebuggerUrl: v.webSocketDebuggerUrl,
    };
  } catch (e) {
    return { ok: false, error: [e.message || e, e.cause?.code].filter(Boolean).join(' · ') };
  }
}

export async function listPages() {
  try {
    const list = await cdpFetch('/json/list');
    const pages = (Array.isArray(list) ? list : []).filter((t) => t.type === 'page' || t.type === 'iframe');
    return pages.map((t) => ({
      id: t.id,
      type: t.type,
      title: (t.title || '').slice(0, 80),
      url: t.url || '',
      role: classifyTab(t.url || '', t.title || ''),
      webSocketDebuggerUrl: t.webSocketDebuggerUrl,
    }));
  } catch {
    return [];
  }
}

export function freezeStatus() {
  return publishFreezeStatus();
}

export function diskTruth() {
  const footPath = path.join(ROOT, CANONICAL.footCore);
  const foot = fs.existsSync(footPath) ? fs.readFileSync(footPath, 'utf8') : '';
  const ver =
    (foot.match(/__dgFootVer\s*=\s*['"](\d+)/) || [])[1] ||
    (foot.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] ||
    null;
  const footer = fs.existsSync(path.join(ROOT, CANONICAL.footerLite))
    ? fs.readFileSync(path.join(ROOT, CANONICAL.footerLite), 'utf8')
    : '';
  const footLoaderVer = (footer.match(/demigod-foot-cdn-loader v(\d+)/) || [])[1] || null;
  const footerShipReady =
    /blog\|notes/.test(footer) &&
    /#note-/.test(footer) &&
    /\\\/sample/.test(footer) &&
    /p=sample/.test(footer) &&
    [
      /method[^\n]{0,80}p=how/,
      /founders[^\n]{0,80}p=hire/,
      /candidates\|engineers[^\n]{0,80}p=talent/,
      /compare[^\n]{0,80}p=pricing/,
      /status[^\n]{0,80}p=about/,
    ].every((pattern) => pattern.test(footer));
  const man = readJson(path.join(ROOT, CANONICAL.footManifest)) || {};
  const sha = foot ? crypto.createHash('sha256').update(foot).digest('hex') : null;
  return {
    footVer: ver ? `v${ver}` : null,
    footSha256: sha,
    footerLoaderVer: footLoaderVer ? `v${footLoaderVer}` : null,
    footerShipReady,
    manifest: {
      version: man.version || man.footVer || null,
      cdnUrl: man.cdnUrl || man.url || null,
      sha256: man.sha256 || null,
    },
    diskMatchesManifest: Boolean(sha && man.sha256 && sha === man.sha256),
    files: {
      footCore: fs.existsSync(path.join(ROOT, CANONICAL.footCore)),
      footerLite: fs.existsSync(path.join(ROOT, CANONICAL.footerLite)),
      headMinimal: fs.existsSync(path.join(ROOT, CANONICAL.headMinimal)),
    },
    bytes: {
      footCore: foot.length,
      footerLite: footer.length,
      headMinimal: fs.existsSync(path.join(ROOT, CANONICAL.headMinimal))
        ? fs.readFileSync(path.join(ROOT, CANONICAL.headMinimal), 'utf8').length
        : 0,
    },
  };
}

export async function liveTruth() {
  try {
    const [r, robots, sitemap] = await Promise.all([
      fetch(`${LIVE}/?wf=${Date.now()}`, {
        signal: AbortSignal.timeout(12000),
        headers: { 'Cache-Control': 'no-cache' },
      }),
      ...['/robots.txt', '/sitemap.xml'].map(async (pathname) => {
        try {
          const response = await fetch(`${LIVE}${pathname}`, { signal: AbortSignal.timeout(12000) });
          return { status: response.status, type: response.headers.get('content-type') || '', body: await response.text() };
        } catch (e) {
          return { status: 0, type: '', body: '', error: e.message || String(e) };
        }
      }),
    ]);
    const html = await r.text();
    const footCdn = (html.match(/https:\/\/files\.catbox\.moe\/[a-z0-9]+\.js/i) || [])[0] || null;
    const loader = (html.match(/demigod-foot-cdn-loader v(\d+)/) || [])[1] || null;
    const footVer =
      (html.match(/foot v(\d+)/i) || [])[1] ||
      (html.match(/__dgFootVer['"]?\s*[:=]\s*['"]?(\d+)/) || [])[1] ||
      null;
    const metaCounts = {
      description: (html.match(/<meta\s+[^>]*name=["']description["'][^>]*>/gi) || []).length,
      ogTitle: (html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*>/gi) || []).length,
    };
    return {
      ok: r.ok,
      status: r.status,
      footCdn,
      footerLoaderVer: loader ? `v${loader}` : null,
      footVerHint: footVer ? `v${footVer}` : null,
      hasFooterLoader: /demigod-foot-cdn-loader|catbox\.moe\/[a-z0-9]+\.js/i.test(html),
      metaCounts,
      robots: {
        status: robots.status,
        hasSitemap: robots.status === 200 && /Sitemap:\s*https:\/\/www\.trydemigod\.com\/sitemap\.xml/i.test(robots.body),
        bytes: robots.body.length,
        error: robots.error || null,
      },
      sitemap: {
        status: sitemap.status,
        type: sitemap.type,
        valid: sitemap.status === 200 && /<(?:urlset|sitemapindex)\b/i.test(sitemap.body),
        bytes: sitemap.body.length,
        error: sitemap.error || null,
      },
      bytes: html.length,
    };
  } catch (e) {
    return { ok: false, error: [e.message || e, e.cause?.code].filter(Boolean).join(' · ') };
  }
}

export const TOOL_MAP = {
  'paste-footer': {
    cmd: 'node demigod-cm6-paste-publish.mjs',
    mutate: true,
    needs: ['cdp', 'custom-code-tab'],
    purpose: 'Repair and verify the canonical head + footer pair (CM6 dispatch)',
  },
  'paste-head-footer': {
    cmd: 'node demigod-cm6-paste-publish.mjs',
    mutate: true,
    needs: ['cdp', 'custom-code-tab'],
    purpose: 'Paste head + footer into Custom Code',
  },
  'foot-cdn': {
    cmd: 'node demigod-foot-cdn-publish.mjs',
    mutate: true,
    needs: [],
    purpose: 'Upload foot-core to catbox + update manifest (no Webflow UI)',
  },
  'tab-prune': {
    cmd: 'node demigod-cdp-tab-prune.mjs',
    mutate: false,
    needs: ['cdp'],
    purpose: 'Close excess CDP tabs (keep Designer/live/custom-code)',
  },
  smoke: {
    cmd: 'node demigod-agent-smoke.mjs',
    mutate: false,
    needs: ['cdp'],
    purpose: 'Live body/H1/foot/WIZ proof',
  },
  truth: {
    cmd: 'node demigod-truth.mjs --md',
    mutate: false,
    needs: [],
    purpose: 'live==disk claims',
  },
  freeze: {
    cmd: 'node demigod-publish-freeze.mjs status',
    mutate: false,
    needs: [],
    purpose: 'Publish freeze status',
  },
};

export const PLAYBOOKS = {
  'status-only': {
    title: 'Read-only Webflow orientation',
    mutate: false,
    steps: [
      'bin/dg-webflow status',
      'bin/dg-webflow doctor',
      'bin/dg-webflow tabs',
      'bin/dg-webflow truth',
    ],
  },
  'prep-footer-paste': {
    title: 'Prepare canonical head + footer paste',
    mutate: true,
    steps: [
      'bin/dg-webflow doctor',
      'bin/dg-webflow tabs',
      'bin/dg-webflow open custom-code   # if missing',
      'bin/dg-webflow paste-check',
      'bin/dg-webflow run paste-footer --dry-run',
      '# Foot lock required for mutation: bin/dg lock claim --owner "$USER" --why webflow-ship',
      'bin/dg-webflow run paste-footer',
    ],
  },
  'ship-foot-cdn-only': {
    title: 'CDN foot upload only (no Webflow UI)',
    mutate: true,
    steps: [
      'npm run demigod:verify:source',
      'bin/dg-webflow run foot-cdn',
      'bin/dg-webflow truth',
    ],
  },
  'ship-all': {
    title: 'Canonical verify → CDN → Custom Code → live proof',
    mutate: true,
    steps: [
      'bin/dg ship prepare',
      'bin/dg lock claim --owner "$USER" --why webflow-ship   # export the printed DG_LOCK_TOKEN',
      'bin/dg ship run   # prepare → foot-cdn → CM6 head+footer paste → truth verify',
      'bin/dg truth --require-match',
      'node demigod-agent-smoke.mjs',
    ],
  },
  'post-publish-confirm': {
    title: 'After any Webflow publish',
    mutate: false,
    steps: [
      'bin/dg-webflow truth',
      'node demigod-agent-smoke.mjs',
      'node demigod-truth.mjs --md',
    ],
  },
  'tab-hygiene': {
    title: 'CDP tab budget',
    mutate: false,
    steps: ['bin/dg-webflow tabs', 'bin/dg-webflow run tab-prune', 'bin/dg-webflow tabs'],
  },
};

export function agentTips(status) {
  const tips = [];
  if (!status.cdp?.ok) {
    tips.push(/EPERM/.test(status.cdp?.error || '')
      ? 'CDP unobservable — this namespace blocks the local probe.'
      : 'CDP down — ~/agent-dev.sh up (Chrome :9223, Webflow-logged profile).');
  }
  tips.push(status.freeze?.frozen
    ? `Publish freeze is enabled${status.freeze.why ? ` — ${status.freeze.why}` : ''}; read-only checks only.`
    : !status.freeze?.authorized
      ? 'Current request has not authorized CDN/paste/publish mutations; prepare-only checks remain available.'
      : 'Current request authorizes publication; foot CDN/paste mutations still require the foot lock.');
  const roles = status.tabs?.byRole || {};
  if (!(roles['custom-code'] > 0) && (roles['webflow-login'] || 0) > 0 && status.cdp?.ok) {
    tips.push('Webflow login/404 wall — re-auth site-owner account (not empty Google workspace), then open custom-code');
  } else if (!(roles['custom-code'] > 0) && status.cdp?.ok) {
    tips.push('No Custom Code tab — bin/dg-webflow open custom-code');
  }
  if (!(roles.designer > 0) && status.cdp?.ok) {
    tips.push('No Designer tab — bin/dg-webflow open designer');
  }
  if ((roles.live || 0) > 2) {
    tips.push(`Too many live tabs (${roles.live}) — bin/dg-webflow run tab-prune`);
  }
  if ((roles['ops-dash'] || 0) > 2) {
    tips.push(`Too many Ops dash tabs (${roles['ops-dash']}) — close extras, keep one :9878`);
  }
  if ((status.tabs?.pages || 0) > 12) {
    tips.push(`Tab count high (${status.tabs.pages}) — prune before more CDP work`);
  }
  if (status.disk?.footVer && status.live?.footVerHint && status.disk.footVer !== status.live.footVerHint) {
    tips.push(`Foot disk ${status.disk.footVer} vs live ${status.live.footVerHint}`);
  }
  if (status.live?.sitemap && !status.live.sitemap.valid) {
    tips.push('Live sitemap is missing; Webflow auto-generation remains a prepare-only SEO fix until an authorized publish request.');
  }
  if (status.disk && !status.disk.diskMatchesManifest) {
    tips.push('disk foot sha ≠ manifest — foot-cdn only if intentionally shipping foot');
  }
  tips.push('Paste sources: demigod-head-minimal.html + demigod-footer-lite.html');
  tips.push('CM6: use demigod-cm6-paste-publish.mjs (cmTile.view.dispatch), never keyboard.type megabytes');
  tips.push('Site talentlink-sf · live trydemigod.com · Designer talentlink-sf.design.webflow.com');
  return tips;
}

/** Route a plain-language site change to the existing canonical toolchain. */
export function classifyChange(intent = '') {
  const text = String(intent).trim();
  const rules = [
    { type: 'cms', test: /\b(cms|collection|blog post|note post)\b/i, files: ['demigod-blog-posts.json'], commands: ['node demigod-webflow-blog-cms-setup.mjs', '# Dry-run only until Webflow API/Designer credentials are available'] },
    { type: 'designer-layout', test: /\b(file upload|upload (field|component)|webflow upload)\b/i, files: [], commands: ['bin/dg-webflow open designer', '# Use Webflow Designer/API; then: bin/dg-webflow playbook post-publish-confirm'] },
    { type: 'designer-layout', test: /\b(?:add|remove|rename|replace|create|change|edit|update|move|reorder|make) (?:an? |the )?(?:(?:native|webflow) )*form (?:field|input|control)\b/i, files: [], commands: ['bin/dg-webflow open designer', '# Use Webflow Designer/API; then: bin/dg-webflow playbook post-publish-confirm'] },
    { type: 'assets', test: /\b(asset|image|photo|hero image|upload)\b/i, files: ['assets/', 'demigod-assets/'], commands: ['node demigod-blog-assets-gen.mjs', 'bin/dg-webflow open designer'] },
    { type: 'page-settings-seo', test: /\b(page settings|page title|meta description|seo\.description|open graph title)\b/i, files: [], commands: ['bin/dg-webflow open designer', '# Page Settings → SEO/Open Graph; then: bin/dg-webflow playbook post-publish-confirm'] },
    { type: 'head-meta', test: /\b(meta|seo|favicon|open graph|og image|title tag|canonical|structured data|schema)\b/i, files: ['demigod-head-minimal.html'], commands: ['node demigod-favicon-ship.mjs   # only for favicon changes', 'bin/dg ship prepare', 'bin/dg-webflow playbook ship-all'] },
    { type: 'head-css', test: /\b(css|style|font|color|spacing|responsive|mobile|animation)\b/i, files: ['demigod-head-styles.css', 'demigod-head-minimal.html'], commands: ['bin/dg-webflow playbook ship-all'] },
    { type: 'custom-code-head', test: /\b(head|header) (code|custom code)\b/i, files: ['demigod-head-minimal.html'], commands: ['npm run demigod:verify:source', 'bin/dg ship prepare', 'bin/dg-webflow playbook ship-all'] },
    { type: 'custom-code-footer', test: /\b(footer|loader) (code|custom code)\b/i, files: ['demigod-footer-lite.html'], commands: ['npm run demigod:verify:source', 'bin/dg ship prepare', 'bin/dg-webflow playbook ship-all'] },
    { type: 'designer-layout', test: /\b(designer|layout|section|component|grid|webflow page)\b/i, files: [], commands: ['bin/dg-webflow open designer', '# Use Webflow Designer/API; then: bin/dg-webflow playbook post-publish-confirm'] },
    { type: 'foot-js', test: /\b(js|javascript|behavior|form|wizard|modal|nav|interaction|copy|cta|button|page overlay)\b/i, files: ['demigod-foot-core.js'], commands: ['bin/dg lock claim --owner "$USER" --why "<intent>"', 'npm run demigod:verify:source', 'bin/dg-webflow playbook ship-all'] },
  ];
  const hit = rules.find((rule) => rule.test.test(text)) || { type: 'unknown', files: [], commands: ['bin/dg-webflow doctor'], note: 'No canonical route matched; inspect before mutating.' };
  return { intent: text, type: hit.type, files: hit.files, commands: hit.commands, note: hit.note || (hit.type === 'cms' ? 'CMS integration is dry-run only.' : null) };
}

export async function buildStatus() {
  ensureBusy();
  const cdp = await cdpUp();
  const pages = cdp.ok ? await listPages() : [];
  const pageOnly = pages.filter((p) => p.type === 'page');
  const byRole = {};
  for (const p of pageOnly) {
    byRole[p.role] = (byRole[p.role] || 0) + 1;
  }
  const freeze = freezeStatus();
  const disk = diskTruth();
  const live = await liveTruth();
  const status = {
    at: new Date().toISOString(),
    site: SITE_SLUG,
    urls: {
      live: LIVE,
      designer: DESIGNER,
      customCode: CUSTOM_CODE,
      dashboard: DASHBOARD,
      cdp: CDP,
    },
    cdp,
    freeze,
    disk,
    live,
    tabs: {
      pages: pageOnly.length,
      total: pages.length,
      byRole,
      list: pageOnly.slice(0, 40),
    },
    tools: TOOL_MAP,
    playbooks: Object.keys(PLAYBOOKS),
    canonical: CANONICAL,
  };
  status.tips = agentTips(status);
  status.ready = {
    readOnly: Boolean(cdp.ok),
    paste: Boolean(cdp.ok && byRole['custom-code'] && !freeze.frozen && freeze.authorized),
    publish: Boolean(cdp.ok && !freeze.frozen && freeze.authorized),
  };
  atomicWrite(OUT, JSON.stringify(status, null, 2) + '\n');
  return status;
}

export function runNode(args, opts = {}) {
  return spawnSync('node', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 180000,
    env: { ...process.env, ...(opts.env || {}) },
  });
}

/** Open URL in CDP browser via /json/new */
export async function openUrl(url) {
  const encoded = encodeURIComponent(url);
  const u = `${CDP}/json/new?${encoded}`;
  let r = await fetch(u, { method: 'PUT', signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r || !r.ok) {
    r = await fetch(u, { method: 'GET', signal: AbortSignal.timeout(8000) });
  }
  if (!r.ok) throw new Error(`CDP /json/new HTTP ${r.status}`);
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: r.ok, raw: text.slice(0, 200) };
  }
}

/** Probe Custom Code page for CM6 panes via CDP Runtime.evaluate */
export async function pasteCheck() {
  const pages = await listPages();
  const cc = pages.find((p) => p.role === 'custom-code' && p.type === 'page');
  if (!cc?.webSocketDebuggerUrl) {
    return { ok: false, error: 'no_custom_code_tab', hint: 'bin/dg-webflow open custom-code' };
  }
  // lightweight: just report tab present; full CM6 needs ws which is heavier
  return {
    ok: true,
    tab: { id: cc.id, url: cc.url, title: cc.title },
    hint: 'Custom Code tab found. Paste with: node demigod-cm6-paste-publish.mjs',
    cm6Script: 'demigod-cm6-paste-publish.mjs uses .cm-content cmTile.view.dispatch',
  };
}
