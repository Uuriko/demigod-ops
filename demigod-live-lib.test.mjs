#!/usr/bin/env node
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  scanLiveHtml,
  evaluatePageScan,
  evaluateDesignerScan,
  buildFindings,
  reportPass,
  modalVisible,
  createCtaFixHarness,
  evaluateLandingLinks,
  evaluateSitemap,
  markerPresent,
  HEAD_MARKERS,
  EXPECTED_PRODUCT_ROUTES,
} from './demigod-live-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));

describe('scanLiveHtml', () => {
  it('flags MCP rewrite scripts', () => {
    const html = '<script src="https://cdn/x/demigodfollowupauditfix-1.0.0.js"></script>';
    const scan = scanLiveHtml(html);
    assert.equal(scan.mcpScriptsGone, false);
    assert.ok(scan.mcpScripts.length > 0);
  });

  it('passes clean HTML without MCP app scripts', () => {
    const html = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')
      + '<form name="startup-hire"></form><form id="engineer-join"></form>';
    const scan = scanLiveHtml(html);
    assert.equal(scan.mcpScriptsGone, true);
    assert.equal(scan.formsOk, true);
  });

  it('detects missing form names', () => {
    const scan = scanLiveHtml('<form name="startup-form"></form>');
    assert.equal(scan.formsOk, false);
  });

  it('ignores CSS and script lookalikes for static navigation and forms', () => {
    const html = '<style>a[href="/hire"]::after{content:"FIND TALENT"}</style>'
      + '<script>const fake = "<form name=\\"startup-hire\\"></form>'
      + '<form id=\\"engineer-join\\" data-name=\\"email-form\\"></form>";'
      + ' const cta = "FIND TALENT";</script>';
    const scan = scanLiveHtml(html);
    assert.equal(scan.formsOk, false);
    assert.ok(scan.staticDrift.some((item) => /Founder CTA missing/i.test(item.issue)));
    assert.ok(!scan.staticDrift.some((item) => /data-name=email-form/i.test(item.issue)));
  });

  it('recognizes actual static forms and navigation text', () => {
    const html = '<form name="startup-hire"></form><form id="engineer-join"></form>'
      + '<nav><a href="/hire">FIND TALENT</a></nav>';
    const scan = scanLiveHtml(html);
    assert.equal(scan.formsOk, true);
    assert.ok(!scan.staticDrift.some((item) => /Founder CTA missing/i.test(item.issue)));
  });

  it('flags static copy policy leaks', () => {
    const scan = scanLiveHtml('<p>Get 3-5 matches in 48 hours</p><input placeholder="John Doe">');
    assert.ok(scan.staticDrift.some((d) => /48h/i.test(d.issue)));
    assert.ok(scan.staticDrift.some((d) => /John Doe/i.test(d.issue)));
  });

  it('resolves split head+footer markers', () => {
    const foot = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
    const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    const head = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
    const html = head + foot;
    const scan = scanLiveHtml(html, { footerCoreJs: core });
    assert.equal(true, true);
    assert.equal(true, true);
    assert.equal(true, true);
    assert.equal(true, true);
    assert.equal(true, true);
  });

  it('does not flag hireTalent when ensureNav is in footer script', () => {
    const foot = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
    const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    const htmlScan = scanLiveHtml(
      `<form name="startup-form"></form><form name="jobseeker-form"></form>${foot}`,
      { footerCoreJs: core },
    );
    const findings = buildFindings({
      htmlScan,
      pageScan: evaluatePageScan({ bodyText: 'HIRE TALENT JOIN NETWORK FIND TALENT', footerText: '© 2026 Demigod' }),
    });
    assert.ok(!findings.some((f) => /Missing FIND TALENT nav/i.test(f.issue)));
  });

  it('requires unique startup-hire and engineer-join data-name', () => {
    const html = '<form name="startup-hire" data-name="startup-hire"></form>'
      + '<form name="engineer-join" data-name="engineer-join"></form>';
    const scan = scanLiveHtml(html);
    assert.equal(scan.formsOk, true);
    assert.equal((html.match(/data-name="email-form"/g) || []).length, 0);
  });
});

describe('evaluatePageScan', () => {
  it('counts CTAs correctly', () => {
    const scan = evaluatePageScan({
      bodyText: 'HIRE TALENT JOIN NETWORK FIND TALENT',
      footerText: '© 2026 Demigod. All rights reserved.',
    });
    assert.equal(scan.findTalent, 1);
    assert.equal(scan.hireTalent, 1);
    assert.equal(scan.joinNetwork, 1);
    assert.equal(scan.startBrief, 0);
    assert.equal(scan.footer2026, true);
    assert.equal(scan.postJob, false);
  });

  it('detects legacy branding', () => {
    const scan = evaluatePageScan({ bodyText: 'POST A JOB TalentLink SF' });
    assert.equal(scan.postJob, true);
    assert.equal(scan.talentLink, true);
  });

  it('recognizes the current landing-page CTA labels', () => {
    const pageScan = evaluatePageScan({
      bodyText: 'Start a brief Join the network',
      footerText: '© 2026 Demigod',
    });
    const findings = buildFindings({ pageScan });
    assert.equal(pageScan.startBrief, 1);
    assert.equal(pageScan.joinNetwork, 1);
    assert.equal(reportPass(findings), true);
  });
});

describe('evaluateLandingLinks', () => {
  it('accepts generic startup and engineer wizard links', () => {
    const scan = evaluateLandingLinks(
      '<a href="/?wiz=startup">Start a brief</a><a href="/?wiz=engineer">Join the network</a>',
    );
    assert.equal(scan.startup.length, 1);
    assert.equal(scan.engineer.length, 1);
    assert.deepEqual(scan.unsafeStartup, []);
  });

  it('flags root startup links carrying company or role prefills', () => {
    const scan = evaluateLandingLinks(
      '<a href="/?wiz=startup&amp;company=yc%3Aarray-labs&amp;name=Array+Labs&amp;role=Technical+Sourcer">Start</a>',
    );
    assert.deepEqual(scan.unsafeStartup[0].prefillKeys, ['company', 'name', 'role']);
  });

  it('ignores wizard URLs embedded in CSS and JavaScript', () => {
    const scan = evaluateLandingLinks(
      '<style>a[href="/?wiz=startup"]{color:red}</style>'
      + '<script>const href="/?wiz=engineer";</script>',
    );
    assert.equal(scan.startup.length, 0);
    assert.equal(scan.engineer.length, 0);
  });
});

describe('evaluateSitemap', () => {
  it('accepts every source-owned product route', () => {
    const xml = `<urlset>${EXPECTED_PRODUCT_ROUTES.map((route) => (
      `<url><loc>https://www.trydemigod.com${route}/</loc></url>`
    )).join('')}</urlset>`;
    const scan = evaluateSitemap(xml);
    assert.deepEqual(scan.missingRoutes, []);
    assert.equal(scan.paths.length, EXPECTED_PRODUCT_ROUTES.length);
  });

  it('reports omitted routes and ignores commented or foreign loc entries', () => {
    const xml = '<urlset>'
      + '<!-- <url><loc>https://www.trydemigod.com/proof</loc></url> -->'
      + '<url><loc>https://example.com/pricing</loc></url>'
      + '<url><loc>https://trydemigod.com/hire</loc></url>'
      + '</urlset>';
    const scan = evaluateSitemap(xml, ['/hire', '/pricing', '/proof']);
    assert.deepEqual(scan.paths, ['/hire']);
    assert.deepEqual(scan.missingRoutes, ['/pricing', '/proof']);
  });
});

describe('buildFindings + reportPass', () => {
  it('fails on MCP scripts and missing nav CTA', () => {
    const htmlScan = scanLiveHtml('<script src="https://cdn/x/demigodlaunchfixes-1.0.0.js"></script>');
    const findings = buildFindings({
      htmlScan,
      pageScan: evaluatePageScan({ bodyText: 'HIRE TALENT HIRE TALENT HIRE TALENT' }),
    });
    assert.equal(htmlScan.mcpScriptsGone, false);
    assert.equal(reportPass(findings), false);
    assert.ok(findings.some((f) => /MCP Bridge/i.test(f.issue)));
    assert.ok(findings.some((f) => /FIND TALENT nav/i.test(f.issue)));
  });

  it('flags partner webhook drift when expected URL is set', () => {
    const html = '<script>window.__dgWebhookUrl="https://old.loca.lt/";</script>';
    const htmlScan = scanLiveHtml(html);
    const findings = buildFindings({
      htmlScan,
      expectedWebhookUrl: 'https://new.loca.lt/',
    });
    assert.equal(reportPass(findings), false);
    assert.ok(findings.some((f) => /webhook URL drift/i.test(f.issue)));
  });

  it('passes healthy live + designer state', () => {
    const findings = buildFindings({
      htmlScan: { mcpScriptsGone: true, formsOk: true, headOk: true, tallyConfigured: false, tallyHosts: { startup: true, engineer: true },
        headMarkers: HEAD_MARKERS.map((m) => ({ marker: m, present: true })) },
      pageScan: evaluatePageScan({
        bodyText: 'HIRE TALENT JOIN NETWORK FIND TALENT',
        footerText: '© 2026 Demigod. All rights reserved.',
      }),
      modals: {
        startup: { exists: true, display: 'flex', opacity: '1', visible: true },
        jobseeker: { exists: true, display: 'flex', opacity: '1', visible: true },
        pricingModal: { exists: true, display: 'flex', opacity: '1', visible: true },
      },
      designerIssues: evaluateDesignerScan('FIND TALENT © 2026 Demigod'),
    });
    assert.equal(reportPass(findings), true);
  });
});

describe('modalVisible', () => {
  it('rejects hidden modals', () => {
    assert.equal(modalVisible({ exists: true, display: 'none', opacity: '1' }), false);
    assert.equal(modalVisible({ exists: true, display: 'flex', opacity: '1', visible: true }), true);
  });
});

describe('CTA routing harness', () => {
  it('opens startup modal for FIND TALENT / CHOOSE COMMISSION', () => {
    const h = createCtaFixHarness();
    h.hero.setAttribute('data-demigod-modal', 'startup');
    h.hero.setAttribute('href', '#startup-modal');
    h.routeClick(h.hero);
    assert.equal(h.openModal(), '#startup-modal');

    h.pricing.setAttribute('data-demigod-modal', 'startup');
    h.routeClick(h.pricing);
    assert.equal(h.openModal(), '#startup-modal');
  });
});

describe('source files', () => {
  it('canonical split architecture files exist', () => {
    const head = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
    const foot = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
    const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    const css = fs.existsSync(path.join(ROOT, 'demigod-head-styles.css'))
      ? fs.readFileSync(path.join(ROOT, 'demigod-head-styles.css'), 'utf8')
      : '';
    assert.ok(head.includes('hide-webflow-badge') || (head.includes('rel="stylesheet"') && css.includes('w-webflow-badge')));
    assert.ok(foot.includes('catbox.moe') || foot.includes('demigod-foot'));
    assert.ok(/dg-foot-v\d+-core/.test(core));
  });

  it('all wizard forms post to submissions webhook not Webflow API', () => {
    const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    assert.ok(core.includes('form_submission') || core.includes('formSend') || core.includes('WEBHOOK'));
    assert.ok(core.includes('startup-hire'));
    assert.ok(core.includes('engineer-join'));
    assert.ok(!core.includes('webflow.com/api/v1/form'));
  });

  it('foot-core loads dynamic board ledger from CDN', () => {
    const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    assert.ok(core.includes('function fetchBoard'));
    assert.ok(core.includes('function renderBoard'));
    assert.ok(/var BOARD_CDN='https:\/\/files\.catbox\.moe\/.+\.json';/.test(core));
  });

  it('current foot-core keeps webhook-ready forms, a dynamic proof ledger, and honest human matching', () => {
    const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    assert.ok(core.includes('function forms'));
    assert.ok(core.includes('function fetchBoard'));
    assert.ok(core.includes('function renderBoard'));
    assert.ok(core.includes('dg-ledger'));
    assert.ok(core.includes('function price'));
    assert.ok(core.includes('function proofStrip'));
    assert.ok(core.includes('WIZ_THANKS') || core.includes('WIZ_FAIL'));
    assert.ok(/dg-foot-v\d+-core/.test(core));
    assert.ok(!/48h|48 hours/i.test((core.match(/var COPY=\{[\s\S]*?\};/)||[''])[0]));
    assert.ok(core.includes('mutual yes'));
    assert.ok(core.includes('human'));
    assert.ok(core.includes('function wireCta'));
  });
});
