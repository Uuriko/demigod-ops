#!/usr/bin/env node
/** Shared Demigod live-site assertions — used by playtest, verify, and idle-lib. */
export const LIVE_ORIGIN = 'https://www.trydemigod.com';

/** MCP Bridge scripts that rewrite CTAs — must never appear on live HTML. */
export const BAD_MCP_SCRIPT_PATTERNS = [
  /demigodfollowupauditfix/i,
  /demigodlaunchfixes/i,
  /demigodtrustsignals/i,
  /pricingmodalhardroute/i,
  /ctamodalsfix/i,
];

export const EXPECTED_FORM_NAMES = ['startup-hire', 'engineer-join'];

/** Source-owned product routes that the edge sitemap must expose for indexing. */
export const EXPECTED_PRODUCT_ROUTES = [
  '/compare',
  '/faq',
  '/hire',
  '/how',
  '/network',
  '/pilot',
  '/pricing',
  '/proof',
  '/talent',
];

export const HEAD_MARKERS = [
  'hide-webflow-badge',
  'Demigod forms',
  'openModal',
  'hello@trydemigod.com',
  'og:title',
  'demigod-polish',
];

export const TALLY_HEAD_MARKERS = ['Demigod forms', 'demigod-tally-embed', 'demigod-core'];

/** Split-architecture: head-minimal (CSS) + footer-core (JS). */
export function markerPresent(html, marker) {
  if (marker === 'hide-webflow-badge') {
    return html.includes('hide-webflow-badge')
      || (/rel="stylesheet"/.test(html) && /\.w-webflow-badge[^}]*display:\s*none/i.test(html));
  }
  if (marker === 'hello@trydemigod.com') {
    return /(?:hello|potter)@trydemigod\.com/i.test(html)
      || /mailto:[^"'&]*@trydemigod\.com/i.test(html);
  }
  if (marker === 'og:title') return html.includes('og:title');
  if (marker === 'Demigod forms') {
    return TALLY_HEAD_MARKERS.some((k) => html.includes(k))
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

/** Parse `window.__dgWebhookUrl` from footer loader on live HTML. */
export function extractLiveWebhookUrl(html = '') {
  const m = html.match(/__dgWebhookUrl\s*=\s*["']([^"']+)["']/);
  return m ? m[1].replace(/\/?$/, '/') : '';
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

/** Remove embedded code before checking whether static page markup contains real elements/copy. */
function stripEmbeddedCode(html = '') {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
}

function tagHasAttributeValue(html, tagName, attributeName, expectedValue) {
  const markup = stripEmbeddedCode(html);
  const tags = markup.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || [];
  const attribute = new RegExp(
    `\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  return tags.some((tag) => {
    const match = tag.match(attribute);
    return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '') === expectedValue;
  });
}

function visibleStaticText(html = '') {
  return stripEmbeddedCode(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlAttribute(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/** Inspect real XML <loc> entries and report missing source-owned product routes. */
export function evaluateSitemap(xml = '', expectedRoutes = EXPECTED_PRODUCT_ROUTES) {
  const markup = String(xml).replace(/<!--[\s\S]*?-->/g, '');
  const urls = [];
  const locPattern = /<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi;
  let match;
  while ((match = locPattern.exec(markup)) !== null) {
    const value = decodeHtmlAttribute(match[1]).trim();
    if (value) urls.push(value);
  }
  const paths = [];
  for (const value of urls) {
    try {
      const url = new URL(value, `${LIVE_ORIGIN}/`);
      if (url.hostname.replace(/^www\./i, '') !== 'trydemigod.com') continue;
      const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
      paths.push(pathname);
    } catch (_) { /* malformed locations are owned by XML validation */ }
  }
  const uniquePaths = [...new Set(paths)];
  return {
    urls,
    paths: uniquePaths,
    missingRoutes: expectedRoutes.filter((route) => !uniquePaths.includes(route)),
  };
}

/** Inspect actual root-page links without accepting URLs embedded in CSS or JavaScript. */
export function evaluateLandingLinks(html = '') {
  const markup = stripEmbeddedCode(html);
  const anchors = markup.match(/<a\b[^>]*>/gi) || [];
  const links = [];
  for (const anchor of anchors) {
    const match = anchor.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = decodeHtmlAttribute(match?.[1] ?? match?.[2] ?? match?.[3] ?? '');
    if (!href) continue;
    try {
      const url = new URL(href, `${LIVE_ORIGIN}/`);
      const wizard = url.searchParams.get('wiz');
      if (wizard !== 'startup' && wizard !== 'engineer') continue;
      const prefillKeys = ['company', 'name', 'role'].filter((key) => url.searchParams.has(key));
      links.push({ href, wizard, prefillKeys });
    } catch (_) { /* ignore malformed links; other link checks own them */ }
  }
  const startup = links.filter((link) => link.wizard === 'startup');
  const engineer = links.filter((link) => link.wizard === 'engineer');
  return {
    startup,
    engineer,
    unsafeStartup: startup.filter((link) => link.prefillKeys.length > 0),
  };
}

export function scanLiveHtml(html, { footerCoreJs = '' } = {}) {
  const merged = footerCoreJs ? `${html}\n<script>${footerCoreJs}</script>` : html;
  const staticMarkup = stripEmbeddedCode(html);
  const staticText = visibleStaticText(html);
  const scriptRefs = html.match(/[a-z0-9/%-]+-1\.0\.0[^"'\s]*\.js/gi) || [];
  const mcpScripts = [...new Set(
    scriptRefs.filter((s) => BAD_MCP_SCRIPT_PATTERNS.some((re) => re.test(s))),
  )];
  const allMcpAppScripts = [...new Set(html.match(/demigod[a-z0-9]+-1\.0\.0/gi) || [])];
  // Live may still publish legacy ids until next designer publish
  const legacyAliases = {
    'startup-hire': ['startup-form', 'startup-hire'],
    'engineer-join': ['jobseeker-form', 'engineer-join'],
  };
  const formsResolved = EXPECTED_FORM_NAMES.map((name) => {
    const aliases = legacyAliases[name] || [name];
    const present = aliases.some((alias) => (
      tagHasAttributeValue(html, 'form', 'name', alias)
      || tagHasAttributeValue(html, 'form', 'id', alias)
    ));
    return { name, present, aliases };
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
  if (!/(?:FIND TALENT|START A BRIEF)/i.test(staticText)) {
    staticDrift.push({ severity: 'medium', issue: 'Founder CTA missing in static HTML (runtime-only nav CTA)' });
  }
  if (tagHasAttributeValue(html, 'form', 'data-name', 'email-form')) {
    staticDrift.push({ severity: 'high', issue: 'data-name=email-form still in static HTML' });
  }
  const talentLinkVisible = /TalentLink/i.test(staticMarkup.replace(/talentlink-sf\.webflow[^"'\s]*/gi, ''));
  if (talentLinkVisible) {
    staticDrift.push({ severity: 'high', issue: 'TalentLink branding in static HTML' });
  }
  if (/METHODOLOGY/i.test(staticMarkup)) {
    staticDrift.push({ severity: 'low', issue: 'METHODOLOGY block in static HTML' });
  }
  if (/SYNDICATE SUBSCRIPTION/i.test(staticMarkup)) {
    staticDrift.push({ severity: 'medium', issue: 'SYNDICATE SUBSCRIPTION in static HTML' });
  }
  if (/48\s*h(?:ours?)?|within\s*(?:48|24)|3-5[^<]{0,48}48|Meet Your \d/i.test(staticMarkup)) {
    staticDrift.push({ severity: 'medium', issue: 'Speed promise (48h) in static HTML' });
  }
  if (/John\s+Doe/i.test(staticMarkup)) {
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
    tallyConfigured: (
      /FORMS_MODE\s*=\s*['"]hybrid['"]/.test(html)
      && /var\s+TALLY_ENGINEER\s*=\s*['"]https?:\/\//.test(html)
    ) || (
      /var\s+TALLY_STARTUP\s*=\s*['"]https?:\/\//.test(html)
      && /var\s+TALLY_ENGINEER\s*=\s*['"]https?:\/\//.test(html)
    ) || (
      /var\s+TALLY_URL\s*=\s*['"]https?:\/\//.test(html)
    ) || (
      (html.includes('demigod-tally-embed') || html.includes('demigod-core'))
      && (/yPgaDp|zxg6XM/.test(html) && /0QGWP0|QKjQKG/.test(html))
    ),
    formsMode: /FORMS_MODE\s*=\s*['"](\w+)['"]/.exec(html)?.[1]
      || (html.includes('TALLY_STARTUP') ? 'tally-both' : (footerCoreOk ? 'webflow-footer-core' : 'unknown')),
    tallyHosts: {
      startup: /tally-startup-embed/.test(html),
      engineer: /tally-engineer-embed/.test(html),
    },
    staticDrift,
    liveWebhookUrl: extractLiveWebhookUrl(html),
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
  // navCta: HIRE TALENT (current product) or FIND TALENT (legacy); partners via partnerships() or partnerNav COPY
  const navOk = /navCta:\s*['"](?:FIND TALENT|HIRE TALENT)['"]/.test(js);
  const partnerOk = /function partnerships/.test(js) || /partnerNav:\s*['"]/.test(js);
  return {
    ok: /ctaFounder:\s*['"]HIRE TALENT['"]/.test(js)
      && navOk
      && /ctaEngineer:\s*['"]JOIN NETWORK['"]/.test(js)
      && /SF Startup Talent/.test(js)
      && partnerOk
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
    startBrief: (t.match(/START A BRIEF/gi) || []).length,
    joinNetwork: (t.match(/JOIN(?: THE)? NETWORK/gi) || []).length,
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
export function buildFindings({ pageScan, htmlScan, modals = {}, designerIssues = null, expectedWebhookUrl = '' } = {}) {
  const findings = [];
  const normWebhook = (u) => String(u || '').trim().replace(/\/?$/, '/');

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
        issue: 'Missing expected form names on live HTML',
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
    if (!htmlScan.tallyConfigured && !htmlScan.footerCoreOk) {
      findings.push({
        severity: 'low',
        issue: 'Tally URLs not configured — set startup + engineer in DEMIGOD-TALLY-URLS.json',
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
    if (expectedWebhookUrl) {
      const live = normWebhook(htmlScan.liveWebhookUrl);
      const expected = normWebhook(expectedWebhookUrl);
      if (!live) {
        findings.push({ severity: 'high', issue: 'Partner webhook URL missing on live footer loader' });
      } else if (live !== expected) {
        findings.push({
          severity: 'high',
          issue: 'Partner webhook URL drift (republish footer loader)',
          detail: { live, expected },
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
    if (!pageScan.hireTalent && !pageScan.startBrief && !runtimeCopy) {
      findings.push({ severity: 'high', issue: 'Missing HIRE TALENT hero CTA for founders' });
    }
    if (!pageScan.findTalent && !pageScan.startBrief && !runtimeCopy) {
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

export function htmlToVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchLiveHtml(cacheBust = true, targetPath = '/') {
  const target = new URL(targetPath, `${LIVE_ORIGIN}/`);
  if (cacheBust) target.searchParams.set('v', `verify-${Date.now()}`);
  const url = target.toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`live fetch ${res.status}`);
  const html = await res.text();
  const footerCoreJs = await fetchFooterCoreJs(html);
  const bodyText = htmlToVisibleText(html);
  const pageScan = evaluatePageScan({ bodyText, html });
  return { url, html, footerCoreJs, bodyText, pageScan };
}

export async function fetchLiveSitemap(cacheBust = true) {
  const target = new URL('/sitemap.xml', `${LIVE_ORIGIN}/`);
  if (cacheBust) target.searchParams.set('v', `verify-${Date.now()}`);
  const url = target.toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  const xml = await res.text();
  return { url, xml, ...evaluateSitemap(xml) };
}

/** Minimal DOM harness for unit-testing demigod-live-cta-fix.js click routing. */
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
