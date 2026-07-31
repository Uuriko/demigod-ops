#!/usr/bin/env node
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
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
  htmlToVisibleText,
  findingStreamKey,
  loadFindingStreamKeys,
  appendNovelFindings,
} from './demigod-live-lib.mjs';

// Derived, never hardcoded: '/home/potter' exists on one laptop and fails in any clean checkout.
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));

const ROOT = REPO_ROOT;

describe('scanLiveHtml', () => {
  it('flags MCP rewrite scripts', () => {
    const html = '<script src="https://cdn/x/demigodfollowupauditfix-1.0.0.js"></script>';
    const scan = scanLiveHtml(html);
    assert.equal(scan.mcpScriptsGone, false);
    assert.ok(scan.mcpScripts.length > 0);
  });

  it('passes clean HTML without MCP app scripts', () => {
    const html = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')
      + '<form name="startup-hire"></form><form id="engineer-join"></form>'
      + '<form data-name="partner-apply"><input name="partner-name"><input name="partner-email"><textarea name="referral-plan"></textarea></form>';
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
    assert.equal(scan.footerCoreOk, true);
    assert.equal(scan.footerCoreCopy.ok, true);
    assert.equal(scan.headOk, true);
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
      + '<form name="engineer-join" data-name="engineer-join"></form>'
      + '<form data-name="partner-apply"><input name="partner-name"><input name="partner-email"><textarea name="referral-plan"></textarea></form>';
    const scan = scanLiveHtml(html);
    assert.equal(scan.formsOk, true);
    assert.equal((html.match(/data-name="email-form"/g) || []).length, 0);
  });

  it('rejects a partially configured referral form', () => {
    const html = '<form name="startup-hire"></form><form name="engineer-join"></form>'
      + '<form data-name="partner-apply"><input name="contact-email"><input name="role-title"><textarea name="stack-needs"></textarea></form>';
    const scan = scanLiveHtml(html);
    assert.equal(scan.formsOk, false);
    assert.deepEqual(scan.forms.find((form) => form.name === 'partner-apply')?.fields, [
      'contact-email',
      'role-title',
      'stack-needs',
    ]);
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

describe('htmlToVisibleText', () => {
  it('excludes inert blocks, spaced closing tags, and unclosed scripts', () => {
    assert.equal(
      htmlToVisibleText(
        '<p>Visible</p><script>script claim</script ><style>style claim</style>'
        + '<template>template claim</template><p>Tail</p>',
      ),
      'Visible Tail',
    );
    assert.equal(htmlToVisibleText('<p>Visible</p><script>unclosed claim'), 'Visible');
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

  it('passes healthy live + designer state', () => {
    const findings = buildFindings({
      htmlScan: { mcpScriptsGone: true, formsOk: true, headOk: true,
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

  // Removed 'foot-core loads dynamic board ledger from CDN': it asserted fetchBoard/renderBoard/
  // BOARD_CDN exist. v205 dropped the fetchBoard() call from run(), so the ledger stopped rendering
  // and BOARD stayed null; the test kept passing for 3 days on the dead definitions alone. That code
  // is now deleted, so the assertion has nothing honest left to make.

  // Was 'foot-core v90 has receipt/status routes, …'. That test was RED at git HEAD before any of
  // this — statusRoute, receiptRoute, demigod-status and bindTap were all removed from foot-core long
  // ago, and its first assert failed on every run. Reduced to the assertions that are still true and
  // still worth guarding.
  it('foot-core keeps pricing, WIZ thanks copy, a version marker, and no 48h claim in COPY', () => {
    const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    assert.ok(core.includes('function pricingCompare') || core.includes('pricing'));
    assert.ok(core.includes('WIZ_THANKS') || core.includes('WIZ_FAIL'));
    assert.ok(/dg-foot-v\d+-core/.test(core));
    assert.ok(!/48h|48 hours/i.test((core.match(/var COPY=\{[\s\S]*?\};/) || [''])[0]));
  });

  it('appendNovelFindings skips already-logged task+finding pairs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-findings-'));
    const file = path.join(dir, 'dg-findings.jsonl');
    const a = { at: 't1', task: 'mobile-a11y-sweep', finding: 'tap target <44px on home: a.nav' };
    const b = { at: 't2', task: 'mobile-a11y-sweep', finding: 'tap target <44px on home: a.nav' };
    const c = { at: 't3', task: 'mobile-a11y-sweep', finding: 'input missing label on events: #x' };
    const first = appendNovelFindings(file, [a, c]);
    assert.equal(first.written, 2);
    assert.equal(first.skipped, 0);
    const second = appendNovelFindings(file, [b, c]);
    assert.equal(second.written, 0);
    assert.equal(second.skipped, 2);
    assert.equal(findingStreamKey(a), findingStreamKey(b));
    const keys = loadFindingStreamKeys(file, { task: 'mobile-a11y-sweep' });
    assert.equal(keys.size, 2);
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    assert.equal(lines.length, 2);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
