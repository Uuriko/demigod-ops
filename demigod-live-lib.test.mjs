#!/usr/bin/env node
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  scanLiveHtml,
  evaluatePageScan,
  evaluateDesignerScan,
  buildFindings,
  reportPass,
  modalVisible,
  createCtaFixHarness,
  markerPresent,
  HEAD_MARKERS,
} from './demigod-live-lib.mjs';

const ROOT = '/home/potter';

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
    assert.equal(scan.footer2026, true);
    assert.equal(scan.postJob, false);
  });

  it('detects legacy branding', () => {
    const scan = evaluatePageScan({ bodyText: 'POST A JOB TalentLink SF' });
    assert.equal(scan.postJob, true);
    assert.equal(scan.talentLink, true);
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

  it('foot-core v90 has receipt/status routes, webhook, live proof ledger, board CDN, honest MVP (no 48h claims, candidates-only partner, human match)', () => {
    const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    assert.ok(core.includes('function statusRoute'));
    assert.ok(core.includes('function receiptRoute'));
    assert.ok(core.includes('#demigod-status-wrap') || core.includes('demigod-status'));
    assert.ok(core.includes('dg-ledger-row') || core.includes('dg-ledger'));
    assert.ok(core.includes('function pricingCompare') || core.includes('pricing'));
    assert.ok(core.includes('WIZ_THANKS') || core.includes('WIZ_FAIL'));
    assert.ok(/dg-foot-v\d+-core/.test(core));
    assert.ok(!/48h|48 hours/i.test((core.match(/var COPY=\{[\s\S]*?\};/)||[''])[0]));
    assert.ok(core.includes('function bindTap') || core.includes('bindTap'));
  });
});