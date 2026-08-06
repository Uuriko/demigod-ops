#!/usr/bin/env node
/**
 * demigod-live-lib — shared live HTML probes + banned-script patterns
 *
 *   import { LIVE_ORIGIN, scanLiveHtml, markerPresent, BAD_MCP_SCRIPT_PATTERNS } from './demigod-live-lib.mjs'
 *
 * Used by: verify-source, playtests, smoke. Never invents board/pilot truth.
 */
import fs from 'fs';
import path from 'path';

export const LIVE_ORIGIN = 'https://www.trydemigod.com';

/** MCP Bridge scripts that rewrite CTAs — must never appear on live HTML. */
export const BAD_MCP_SCRIPT_PATTERNS = [
  /demigodfollowupauditfix/i,
  /demigodlaunchfixes/i,
  /demigodtrustsignals/i,
  /pricingmodalhardroute/i,
  /ctamodalsfix/i,
];

export const EXPECTED_FORM_NAMES = ['startup-hire', 'engineer-join', 'partner-apply'];

export const HEAD_MARKERS = [
  'hide-webflow-badge',
  'Demigod forms',
  'openModal',
  'potter@trydemigod.com',
  'og:title',
  'demigod-polish',
];

/** Split-architecture: head-minimal (CSS) + footer-core (JS). */
export function markerPresent(html, marker) {
  if (marker === 'hide-webflow-badge') {
    return html.includes('hide-webflow-badge')
      || (/rel="stylesheet"/.test(html) && /\.w-webflow-badge[^}]*display:\s*none/i.test(html));
  }
  // Contact SoR: potter@ only (foot v495+). hello@ is residual canvas, not a pass marker.
  if (marker === 'potter@trydemigod.com') {
    return html.includes('potter@trydemigod.com');
  }
  if (marker === 'hello@trydemigod.com') {
    // Explicit hello@ checks still see residual canvas truth (do not treat as contact OK).
    return html.includes('hello@trydemigod.com');
  }
  if (marker === 'og:title') return html.includes('og:title');
  if (marker === 'Demigod forms') {
    return html.includes('Demigod forms')
      || (/dg-foot-v\d+-core/.test(html) && /function forms/.test(html));
  }
  if (marker === 'openModal') {
    return /openModal|var OPEN=null|function show\(id\)/.test(html);
  }
  if (marker === 'demigod-polish') {
    return /demigod-polish|function polish\(/.test(html);
  }
  return html.includes(marker);
}

/** Extract external footer script URLs from Webflow custom-code loader. */
export function extractFooterScriptUrls(html) {
  const urls = [];
  const re = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    if (/catbox\.moe|jsdelivr\.net|demigod-foot|pp797y/i.test(src)) urls.push(src);
  }
  return [...new Set(urls)];
}

export async function fetchFooterCoreJs(html) {
  const urls = extractFooterScriptUrls(html);
  if (!urls.length) return '';
  const parts = [];
  for (const url of urls) {
    try {
      const bust = url.includes('?') ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`;
      const res = await fetch(bust, { signal: AbortSignal.timeout(15000) });
      if (res.ok) parts.push(await res.text());
    } catch (_) { /* ignore */ }
  }
  return parts.join('\n');
}

export function scanLiveHtml(html, { footerCoreJs = '' } = {}) {
  const merged = footerCoreJs ? `${html}\n<script>${footerCoreJs}</script>` : html;
  const scriptRefs = html.match(/[a-z0-9/%-]+-1\.0\.0[^"'\s]*\.js/gi) || [];
  const mcpScripts = [...new Set(
    scriptRefs.filter((s) => BAD_MCP_SCRIPT_PATTERNS.some((re) => re.test(s))),
  )];
  const allMcpAppScripts = [...new Set(html.match(/demigod[a-z0-9]+-1\.0\.0/gi) || [])];
  const partnerForm = (html.match(/<form\b(?=[^>]*\bdata-name=["']partner-apply["'])[^>]*>[\s\S]*?<\/form>/i) || [])[0] || '';
  const partnerFields = [...partnerForm.matchAll(/<(?:input|textarea|select)\b[^>]*>/gi)]
    .filter(([tag]) => !/\btype=["'](?:hidden|submit|button)["']/i.test(tag))
    .map(([tag]) => (tag.match(/\bname=["']([^"']+)["']/i) || [])[1])
    .filter(Boolean);
  const partnerExpected = ['partner-name', 'partner-email', 'referral-plan'];
  const partnerContractOk = partnerFields.length === partnerExpected.length
    && partnerExpected.every((name) => partnerFields.includes(name));
  // Live may still publish legacy ids until next designer publish
  const legacyAliases = {
    'startup-hire': ['startup-form', 'startup-hire'],
    'engineer-join': ['jobseeker-form', 'engineer-join'],
    'partner-apply': ['partner-apply'],
  };
  const formsResolved = EXPECTED_FORM_NAMES.map((name) => {
    const aliases = legacyAliases[name] || [name];
    const found = aliases.some((a) => new RegExp(`name=["'][^"']*${a}|id=["'][^"']*${a}`, 'i').test(html));
    const present = name === 'partner-apply' ? found && partnerContractOk : found;
    return { name, present, aliases, ...(name === 'partner-apply' ? { fields: partnerFields } : {}) };
  });
  const headMarkers = HEAD_MARKERS.map((m) => ({
    marker: m,
    present: markerPresent(merged, m),
  }));
  const footerCoreOk = /dg-foot-v\d+-core/.test(merged) && /function forms/.test(merged);
  const footerCoreCopy = evaluateFooterCoreCopy(footerCoreJs || (footerCoreOk ? merged : ''));
  const runtimeNavOk = /function nav/.test(merged) || /function ensureNav/.test(merged);
  const badgeHiddenByCss = (/hide-webflow-badge/.test(html) || /rel="stylesheet"/.test(html))
    && /w-webflow-badge[^}]*display:\s*none/i.test(merged);
  const staticDrift = [];
  if (!/FIND TALENT/i.test(html)) {
    staticDrift.push({ severity: 'medium', issue: 'FIND TALENT missing in static HTML (runtime-only nav CTA)' });
  }
  if (/data-name=["']email-form["']/i.test(html)) {
    staticDrift.push({ severity: 'high', issue: 'data-name=email-form still in static HTML' });
  }
  const talentLinkVisible = /TalentLink/i.test(html.replace(/talentlink-sf\.webflow[^"'\s]*/gi, ''));
  if (talentLinkVisible) {
    staticDrift.push({ severity: 'high', issue: 'TalentLink branding in static HTML' });
  }
  if (/METHODOLOGY/i.test(html)) {
    staticDrift.push({ severity: 'low', issue: 'METHODOLOGY block in static HTML' });
  }
  if (/SYNDICATE SUBSCRIPTION/i.test(html)) {
    staticDrift.push({ severity: 'medium', issue: 'SYNDICATE SUBSCRIPTION in static HTML' });
  }
  // User-visible canvas only — strip scripts/styles so scrubber regex sources don't false-positive
  const visibleHtml = String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  if (/48\s*h(?:ours?)?|within\s*(?:48|24)\s*h/i.test(visibleHtml)) {
    staticDrift.push({ severity: 'medium', issue: 'Speed promise (48h) in static HTML' });
  }
  if (/Meet Your\s*3[\s–-]5|receive\s+3[\s–-]5\s+highly/i.test(visibleHtml)) {
    staticDrift.push({ severity: 'medium', issue: 'Volume promise (3-5 candidates) in static HTML' });
  }
  if (/hello@(?:try)?demigod\.com/i.test(visibleHtml)) {
    staticDrift.push({ severity: 'medium', issue: 'hello@ contact in static HTML (runtime scrubs to potter@)' });
  }
  if (/John\s+Doe/i.test(html)) {
    staticDrift.push({ severity: 'medium', issue: 'John Doe in static HTML' });
  }
  return {
    mcpScripts,
    mcpScriptsGone: mcpScripts.length === 0,
    allMcpAppScripts,
    forms: formsResolved,
    formsOk: formsResolved.every((f) => f.present),
    headMarkers,
    headOk: headMarkers.every((m) => m.present),
    footerCoreOk,
    footerCoreCopy,
    runtimeNavOk,
    badgeHiddenByCss,
    staticDrift,
  };
}

/** COPY constants wired in demigod-foot-core.js (runtime patches static Webflow HTML). */
export function evaluateFooterCoreCopy(js = '') {
  if (!js) return { ok: false };
  const copyBlock = (js.match(/var COPY=\{[\s\S]*?\};/))?.[0] || '';
  const noSpeedInCopy = !/48\s*h|48\s*hours|reply\s*(?:in|within)|fastest\s*reply/i.test(copyBlock);
  const noNameInCopy = !/\bJohn\b/i.test(copyBlock);
  // Accept legacy superCleanup OR current scrubTimeClaims + scrubStaticLabels (v150+)
  const hasScrub = (/function superCleanup/.test(js) && /SPEED_LEAK|patchMeta/.test(js))
    || (/function scrubTimeClaims/.test(js) && /function scrubStaticLabels/.test(js));
  // navCta: HIRE TALENT (current product) or FIND TALENT (legacy)
  const navOk = /navCta:\s*['"](?:FIND TALENT|HIRE TALENT)['"]/i.test(js);
  const referralOk = /\n\s*refer\s*:\s*\{/.test(js);
  return {
    ok: /ctaFounder:\s*['"]HIRE TALENT['"]/i.test(js)
      && navOk
      && /ctaEngineer:\s*['"](?:Share privately|Share what I[’']d consider|I['']m looking)['"]/i.test(js)
      && /SF STARTUP TALENT/i.test(js)
      && referralOk
      && noSpeedInCopy
      && noNameInCopy
      && hasScrub,
    version: (js.match(/dg-foot-v(\d+)-core/) || [])[1] || null,
    noSpeedInCopy,
    noNameInCopy,
    hasScrub,
  };
}

/** Scan rendered page text/DOM — pass results of page.evaluate(). */
export function evaluatePageScan({ bodyText = '', html = '', footerText = '' } = {}) {
  const t = bodyText;
  const footer = footerText || t;
  return {
    postJob: /POST A JOB/i.test(t),
    hireTalent: (t.match(/HIRE TALENT/g) || []).length,
    findTalent: (t.match(/FIND TALENT/g) || []).length,
    joinNetwork: (t.match(/JOIN NETWORK/g) || []).length,
    getJob: (t.match(/GET JOB/g) || []).length,
    talentLink: /TalentLink/i.test(t.replace(/talentlink-sf/gi, '')),
    footer2026: /2026/i.test(footer) && /Demigod/i.test(footer),
    athena: /ATHENA/i.test(t),
    hephaestus: /HEPHAESTUS/i.test(t),
    curated: /CURATED INSIGHTS/i.test(t),
    edtech: /edtech/i.test(html),
    webflowBadge: /w-webflow-badge/.test(html),
  };
}

export function evaluateDesignerScan(text = '') {
  return {
    postJob: /POST A JOB/i.test(text),
    hireTalent: /HIRE TALENT/i.test(text),
    talentLink: /TalentLink/i.test(text),
    footer2026: /2026 Demigod/i.test(text),
  };
}

export function modalVisible(state) {
  if (!state?.exists) return false;
  return state.display !== 'none' && parseFloat(state.opacity || '1') > 0.1 && state.visible !== false;
}

/** Build playtest/verify findings from scans. */
export function buildFindings({ pageScan, htmlScan, modals = {}, designerIssues = null } = {}) {
  const findings = [];

  if (htmlScan) {
    if (!htmlScan.mcpScriptsGone) {
      findings.push({
        severity: 'high',
        issue: 'MCP Bridge app scripts on live (CTA rewrite risk)',
        detail: htmlScan.mcpScripts,
      });
    }
    if (!htmlScan.formsOk) {
      findings.push({
        severity: 'high',
        issue: 'Missing or invalid expected form contracts on live HTML',
        detail: htmlScan.forms.filter((f) => !f.present),
      });
    }
    if (!htmlScan.headOk) {
      findings.push({
        severity: 'medium',
        issue: 'Head custom code missing expected markers',
        detail: htmlScan.headMarkers.filter((m) => !m.present),
      });
    }
    if (htmlScan.staticDrift?.length) {
      const runtimeOk = htmlScan.runtimeNavOk && htmlScan.formsOk && htmlScan.footerCoreCopy?.ok;
      for (const d of htmlScan.staticDrift) {
        const sev = runtimeOk && d.severity === 'high' ? 'medium' : (d.severity || 'medium');
        findings.push({
          severity: sev,
          issue: runtimeOk ? `Static HTML drift (runtime OK): ${d.issue}` : `Static HTML drift: ${d.issue}`,
        });
      }
    }
  }

  if (pageScan) {
    if (pageScan.postJob) {
      findings.push({ severity: 'high', issue: 'Nav still says POST A JOB on live' });
    }
    const runtimeNav = htmlScan?.runtimeNavOk && htmlScan?.footerCoreCopy?.ok;
    if (pageScan.hireTalent > 3) {
      findings.push({ severity: 'high', issue: `Duplicate HIRE TALENT (${pageScan.hireTalent}x)` });
    } else if (pageScan.hireTalent > 2 && !pageScan.findTalent && !runtimeNav) {
      findings.push({ severity: 'high', issue: `Nav still HIRE TALENT (${pageScan.hireTalent}x) — should be FIND TALENT` });
    }
    const runtimeCopy = htmlScan?.footerCoreOk && htmlScan?.footerCoreCopy?.ok;
    if (!pageScan.hireTalent && !runtimeCopy) {
      findings.push({ severity: 'high', issue: 'Missing HIRE TALENT hero CTA for founders' });
    }
    if (!pageScan.findTalent && !runtimeCopy) {
      findings.push({ severity: 'high', issue: 'Missing FIND TALENT nav CTA' });
    }
    if (!pageScan.joinNetwork && !pageScan.getJob && !runtimeCopy) {
      findings.push({ severity: 'high', issue: 'Missing JOIN NETWORK engineer CTA' });
    }
    if (pageScan.athena || pageScan.hephaestus) {
      findings.push({ severity: 'low', issue: 'Feature creep: extra Pantheon agents' });
    }
    if (pageScan.curated || pageScan.edtech) {
      findings.push({ severity: 'medium', issue: 'Curated/edtech stock content remains' });
    }
    if (pageScan.talentLink) {
      findings.push({ severity: 'high', issue: 'TalentLink branding on live' });
    }
    if (!pageScan.footer2026) {
      findings.push({ severity: 'medium', issue: 'Footer missing © 2026 Demigod' });
    }
    if (pageScan.webflowBadge && !htmlScan?.badgeHiddenByCss) {
      findings.push({ severity: 'low', issue: 'Webflow badge visible' });
    }
  }

  if (modals.startup && !modalVisible(modals.startup)) {
    findings.push({ severity: 'high', issue: 'Startup modal does not open on founder CTA', detail: modals.startup });
  }
  if (modals.jobseeker && !modalVisible(modals.jobseeker)) {
    findings.push({ severity: 'high', issue: 'Jobseeker modal does not open on engineer CTA', detail: modals.jobseeker });
  }
  if (modals.pricingModal && !modalVisible(modals.pricingModal)) {
    findings.push({ severity: 'medium', issue: 'CHOOSE COMMISSION does not open startup modal', detail: modals.pricingModal });
  }

  if (designerIssues && (designerIssues.postJob || designerIssues.talentLink)) {
    const liveOk = pageScan.hireTalent && pageScan.footer2026 && !pageScan.talentLink;
    findings.push({
      severity: liveOk ? 'medium' : 'high',
      issue: 'Designer canvas still has legacy nav/footer (masters not saved)',
      detail: { ...designerIssues, livePatchesOk: liveOk },
    });
  }

  return findings;
}

export function reportPass(findings) {
  return findings.filter((f) => f.severity === 'high').length === 0;
}

/** Stable key for audit jsonl rows (task + finding text; ignore at/evidence). */
export function findingStreamKey(row) {
  return `${row?.task || ''}\0${row?.finding || ''}`;
}

/** Load known keys from a dg-findings-style jsonl (optional task filter). */
export function loadFindingStreamKeys(filePath, { task = null } = {}) {
  const keys = new Set();
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const o = JSON.parse(line);
        if (task && o.task !== task) continue;
        keys.add(findingStreamKey(o));
      } catch {
        /* skip corrupt line */
      }
    }
  } catch {
    /* missing file */
  }
  return keys;
}

/**
 * Append only novel findings to jsonl. Stops re-appending known a11y/defect noise.
 * @returns {{ written: number, skipped: number, novel: object[] }}
 */
export function appendNovelFindings(filePath, findings, { known = null } = {}) {
  const keys = known || loadFindingStreamKeys(filePath);
  const novel = [];
  for (const f of findings || []) {
    const k = findingStreamKey(f);
    if (keys.has(k)) continue;
    keys.add(k);
    novel.push(f);
  }
  if (novel.length) {
    fs.mkdirSync(path.dirname(filePath) || '.', { recursive: true });
    fs.appendFileSync(filePath, `${novel.map((f) => JSON.stringify(f)).join('\n')}\n`);
  }
  return { written: novel.length, skipped: (findings?.length || 0) - novel.length, novel };
}

export function htmlToVisibleText(html) {
  return html
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchLiveHtml(cacheBust = true) {
  const url = cacheBust ? `${LIVE_ORIGIN}/?v=verify-${Date.now()}` : `${LIVE_ORIGIN}/`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`live fetch ${res.status}`);
  const html = await res.text();
  const footerCoreJs = await fetchFooterCoreJs(html);
  const bodyText = htmlToVisibleText(html);
  const pageScan = evaluatePageScan({ bodyText, html });
  return { url, html, footerCoreJs, bodyText, pageScan };
}

/** Minimal DOM harness for unit-testing canonical CTA click routing. */
export function createCtaFixHarness() {
  const modals = {
    '#startup-modal': { id: 'startup-modal', style: {}, display: 'none' },
    '#jobseeker-modal': { id: 'jobseeker-modal', style: {}, display: 'none' },
  };
  let openModal = null;

  const elements = [];
  const mk = (tag, attrs = {}, children = []) => {
    const el = {
      tagName: tag.toUpperCase(),
      textContent: attrs.text || '',
      children,
      parentElement: null,
      attributes: { ...attrs },
      style: { setProperty(k, v, imp) { this[`_${k}`] = [v, imp]; } },
      getAttribute(k) { return this.attributes[k] ?? null; },
      setAttribute(k, v) { this.attributes[k] = v; },
      querySelector(sel) {
        if (sel === '.btn-label') return children.find((c) => c.className === 'btn-label') || null;
        return null;
      },
      closest() { return this; },
    };
    children.forEach((c) => { c.parentElement = el; });
    elements.push(el);
    return el;
  };

  const hero = mk('a', { class: 'premium-btn is-talent', href: '#', text: '' }, [
    mk('span', { class: 'btn-label', text: 'HIRE TALENT' }),
  ]);
  const pricing = mk('button', { text: 'CHOOSE COMMISSION' });

  const doc = {
    querySelector(sel) {
      if (sel === '#startup-modal') return modals['#startup-modal'];
      if (sel === '#jobseeker-modal') return modals['#jobseeker-modal'];
      if (sel === 'a.premium-btn.is-talent') return hero;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'a,button') return [hero, pricing];
      if (sel === 'footer *') return [];
      return [];
    },
  };

  function show(id) {
    openModal = id;
    const m = modals[id];
    if (m) m.display = 'flex';
  }

  function routeClick(el) {
    const modalKey = el.getAttribute('data-demigod-modal');
    const href = el.getAttribute('href') || '';
    if (modalKey === 'startup' || href === '#startup-modal') return show('#startup-modal');
    if (modalKey === 'jobseeker' || href === '#jobseeker-modal') return show('#jobseeker-modal');
  }

  return { doc, hero, pricing, modals, openModal: () => openModal, show, routeClick };
}
