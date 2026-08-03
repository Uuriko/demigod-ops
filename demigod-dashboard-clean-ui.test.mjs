import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { TOOLS } from './demigod-tools-registry.mjs';

const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const control = fs.readFileSync(new URL('./demigod-control.mjs', import.meta.url), 'utf8');
const dg = fs.readFileSync(new URL('./bin/dg', import.meta.url), 'utf8');
const df = fs.readFileSync(new URL('./bin/df', import.meta.url), 'utf8');
const check = fs.readFileSync(new URL('./demigod-check.mjs', import.meta.url), 'utf8');
const hygiene = fs.readFileSync(new URL('./demigod-laptop-hygiene.mjs', import.meta.url), 'utf8');
const laptopAudit = fs.readFileSync(new URL('./demigod-laptop-audit.mjs', import.meta.url), 'utf8');
const agentDev = fs.readFileSync(new URL('./agent-dev.sh', import.meta.url), 'utf8');
const toolsSelftest = fs.readFileSync(new URL('./demigod-tools-selftest.mjs', import.meta.url), 'utf8');
const toolsOsSelftest = fs.readFileSync(new URL('./demigod-tools-os-selftest.mjs', import.meta.url), 'utf8');
const inboxSource = fs.readFileSync(new URL('./demigod-submissions-inbox.mjs', import.meta.url), 'utf8');
const activeAgentContext = [
  'AGENTS.md',
  'DEMIGOD-AGENTS.md',
  'CLAUDE.md',
  'DEMIGOD-SIMPLE.md',
  'DEMIGOD-COMPRESSED-STATE.md',
  'DEMIGOD-ORCA-BRIEF.txt',
  'claude-lib.mjs',
  'demigod-agent-cockpit.mjs',
  'demigod-review-lib.mjs',
].map((file) => fs.readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'));

test('dashboard has one seven-view navigation and no retired UI modes', () => {
  assert.equal((ui.match(/role="tab"/g) || []).length, 7);
  for (const label of ['Home', 'Inbox', 'Matches', 'Work', 'Tools', 'Ship', 'SF Map']) {
    assert.match(ui, new RegExp(`data-tab="[^"]+">${label}<`));
  }
  assert.doesNotMatch(ui, /modeSimple|densityComfy|themeLight|helpOverlay|panel-(?:system|swarm|brief|gates)/);
  assert.doesNotMatch(ui, /gLight|gSite|gFreeze|gNext|sessionStory|deltaLine|apiStrip|api-pill|demandLine|badge\.v5|badge\.pulse/);
});

test('active agent context does not impose a standing phase label', () => {
  for (const source of [server, ...activeAgentContext]) {
    assert.doesNotMatch(source, /GTM \+ pre-services honesty/);
    assert.doesNotMatch(source, /\bcurrent phase\b/i);
  }
});

test('Tools defaults to the primary catalog and keeps Advanced copy-only', () => {
  assert.match(ui, /fetch\('\/api\/tools\?'\+\(allTools\?'all=1&':''\)\+'t='\+stamp\)/);
  assert.match(ui, /id="btnToolsAll"[^>]+aria-pressed="false"/);
  assert.match(ui, /const canRun = !allTools && t\.runnable === true/);
  assert.match(ui, /Array\.isArray\(reg\.dogfood\?\.tools\)/);
  assert.match(ui, /filter\(tool=>tool&&typeof tool\.tool==='string'\)/);
  assert.match(ui, /fetch\('\/api\/dogfood\?t='\+stamp\)\.catch\(\(\)=>null\)/);
  assert.doesNotMatch(ui, /btnToolsAll'\)\.textContent/);
  assert.doesNotMatch(ui, /toolsHideAlias|toolsHotOnly|function toolsQuery/);
  assert.doesNotMatch(server, /hideAliases|url\.searchParams\.get\('group'\)/);
  assert.doesNotMatch(ui, /aliasesHidden|alias→|t\.alias/);
});

test('Tools shows real execution history separately from judgments and synthetic probes', () => {
  assert.match(ui, /fetch\('\/api\/dogfood\?t='\+stamp\)/);
  for (const field of ['executionTotal', 'annotationTotal', 'syntheticWrapTotal', 'unusedRegisteredTools', 'recentExecutions']) {
    assert.match(ui, new RegExp(field));
  }
});

test('canonical command and registry surfaces stay consolidated', () => {
  assert.match(dg, /\[\[ \$# -gt 0 \]\] \|\| set -- orient/);
  assert.doesNotMatch(dg, /\bfzf\b/);
  assert.match(dg, /events\|events-online\)[\s\S]*"\$\{1:-\}" == "test"[\s\S]*exec bin\/dg events-test/);
  assert.match(dg, /dogfood\)[\s\S]*set -- status "\$@"[\s\S]*demigod-tool-dogfood\.mjs "\$@"/);
  assert.match(df, /DEMIGOD-COMPRESSED-STATE\.md/);
  assert.doesNotMatch(df, /demigod-keep-going\.md/);
  assert.match(check, /edit: \['demigod-verify-source\.mjs'/);
  assert.match(check, /full: \['demigod-full-check\.mjs'/);
  assert.match(check, /release: \['demigod-full-check\.mjs', '--release', '--with-review'/);
  assert.doesNotMatch(check, /demigod-truth\.mjs|demigod-review\.mjs/);
  assert.deepEqual(
    TOOLS.filter((tool) => tool.hot).map((tool) => tool.id).sort(),
    [
      'accepted-role',
      'agent-bus',
      'check',
      'control-board',
      'demand',
      'foot-lock',
      'funnel-status',
      'hygiene',
      'inbox',
      'orient',
      'recruitai-desk',
      'review',
      'ship',
      'structured-hiring',
      'truth',
      'webflow',
    ],
  );
  // Execution authority stays an explicit server review, independent of `hot`.
  for (const id of ['check', 'foot-lock', 'events-online', 'events-test', 'ship']) {
    assert.match(server, new RegExp(`(?:^|\\n)  ['"]?${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?: \\{`));
  }
});

test('dashboard refresh is visibility-gated and laptop hygiene does not force-open it', () => {
  assert.match(ui, /if\(activeTab==='tools' && !document\.hidden\) loadTools\(\)/);
  assert.match(ui, /if \(!document\.hidden\) await load\(false\)/);
  assert.match(ui, /visibilitychange[\s\S]*if \(!document\.hidden\) load\(false\)/);
  assert.doesNotMatch(hygiene, /reopen-ops-dash|json\/new\?.*9878/);
});

test('command palette exposes each operational job once', () => {
  const start = ui.indexOf('const PALETTE=[');
  const palette = ui.slice(start, ui.indexOf('];', start));
  const jobs = [...palette.matchAll(/runJob\('([^']+)'/g)].map(([, id]) => id);
  jobs.push(...[...palette.matchAll(/runSmoke\(\)/g)].map(() => 'smoke'));
  assert.equal(new Set(jobs).size, jobs.length);
});

test('global shortcuts preserve browser modifier keys except Ctrl or Cmd K', () => {
  const start = ui.indexOf("document.addEventListener('keydown'");
  const keyboard = ui.slice(start, ui.indexOf('// boot', start));
  const paletteShortcut = keyboard.indexOf("if(e.key==='/'");
  const modifierGuard = keyboard.indexOf('if(e.ctrlKey||e.metaKey||e.altKey) return;');
  assert.ok(paletteShortcut >= 0 && paletteShortcut < modifierGuard);
  assert.ok(modifierGuard < keyboard.indexOf("if(e.key==='r'"));
  assert.ok(modifierGuard < keyboard.indexOf('const numberTabs='));
});

test('match consent controls appear only for unrecorded sides of reviewed pairs', () => {
  assert.match(ui, /const canConsent=st==='approved'\|\|st==='mutual_yes';/);
  assert.match(ui, /\(canConsent&&!mut\.founder\?[\s\S]{0,180}data-consent="founder"/);
  assert.match(ui, /\(canConsent&&!mut\.candidate\?[\s\S]{0,180}data-consent="candidate"/);
  assert.doesNotMatch(ui, /st!=='rejected'\?[\s\S]{0,180}data-consent/);
});

test('terminal match rejection confirms before POST', () => {
  const handler = ui.match(/root\.querySelectorAll\('\[data-rev\]'\)\.forEach\(btn=>\{[\s\S]*?\n  \}\);/)?.[0] || '';
  assert.match(handler, /if\(decision==='reject'&&!window\.confirm\('[^']+'\)\) return;[\s\S]*fetch\('\/api\/matches'/);
});

test('dashboard polls one status read model and lazily renders only the active view', () => {
  const slimStatus = server.slice(server.indexOf('function slimStatus'), server.indexOf('function dashboardStatus'));
  assert.doesNotMatch(ui, /fetch\('\/api\/coord'\)|function renderSystem|function loadMap/);
  assert.match(ui, /const qs = 'ui=1'/);
  assert.match(server, /function dashboardStatus\(data\)/);
  assert.match(ui, /function renderActivePanel\(d\)/);
  assert.doesNotMatch(ui, /workerDetails|renderSwarm|swarmRoot/);
  assert.match(ui, /if\(\$\('evidenceDetails'\)\?\.open\) renderGates\(d\)/);
  assert.doesNotMatch(server, /tools: toolsSummary|data\.jobsMeta|data\.events\s*=|activity2h:/);
  assert.doesNotMatch(slimStatus, /gates: data\.gates/);
  assert.doesNotMatch(server, /url\.pathname === '\/api\/(?:ledger|evidence|doctor)'/);
});

test('Work view renders concise channel health without another endpoint', () => {
  assert.match(ui, /Operating mode ·/);
  assert.match(ui, /Claude ↔ Codex ready/);
  assert.match(ui, /channel\.roundTripMs/);
  assert.match(ui, /channel\.unread/);
  assert.doesNotMatch(ui, /fetch\('\/api\/orca'/);
});

test('agent tooling has one Orca path and never assigns work to the user', () => {
  for (const source of [agentDev, laptopAudit]) {
    assert.doesNotMatch(source, /orca-(?:demigod|setup|drive-all)|spawn-trio/);
  }
  assert.match(agentDev, /bin\/dg"? orca up/);
  assert.match(agentDev, /bin\/dg"? home --json/);
  assert.match(laptopAudit, /bin\/dg-orca/);
});

test('dashboard rejects malformed keep-awake PIDs before probing liveness', () => {
  assert.match(server, /if \(!Number\.isInteger\(pid\) \|\| pid <= 0\) throw new Error\('invalid keep-awake pid'\);\s+process\.kill\(pid, 0\)/);
});

test('Inbox renders an explicitly operational queue', () => {
  assert.match(inboxSource, /operationalRows: operationalItems/);
  assert.match(ui, /ib\.operationalRows\|\|\(ib\.operationalCount===0\?\[\]:ib\.rows\|\|\[\]\)/);
});

test('Home projects a bounded fail-closed company signal inbox', () => {
  const projection = server.slice(
    server.indexOf('function companySignalInboxView'),
    server.indexOf('function peopleIntelligenceView'),
  );
  assert.match(server, /companySignals: companySignalInboxView\([\s\S]{0,120}demigod-signals\.json/);
  assert.match(server, /companySignals: data\.companySignals \|\| null/);
  assert.match(ui, /Company signal inbox/);
  assert.match(ui, /no positive PeopleOps observation/);
  assert.match(ui, /Exact public ATS observations/);
  const view = Function(`${projection}; return companySignalInboxView`)();
  const observed = (windowDays) => ({
    windowDays,
    observedDays: 1,
    changedAccounts: 1,
    changedAccountDays: 1,
    firstObservedReqs: 1,
    firstObservedOlderPostedReqs: 0,
    closedReqs: 2,
    netObservedReqs: -1,
    from: '2026-07-30',
    through: '2026-07-30',
  });
  const feed = {
    schema: 'demigod.recruitai-signals/3',
    at: '2026-07-30T12:00:00.000Z',
    sourceSchema: 'demigod.recruitai-export/3',
    exportGeneratedAt: '2026-07-30T11:59:59.000Z',
    changeDate: '2026-07-30',
    changeBasis: 'ledger-observation',
    counts: {
      accounts: 1,
      changedAccounts: 1,
      firstObservedTodayReqs: 1,
      firstObservedTodayOlderPostedReqs: 0,
      closedTodayReqs: 2,
      observedHistoryDays: 1,
    },
    changes: [{
      mapCompanyId: 'test:acme',
      name: 'Acme',
      domain: 'acme.test',
      jobsUrl: 'https://jobs.acme.test/',
      openReqCount: 3,
      firstObservedTodayReqCount: 1,
      firstObservedTodayOlderPostedReqCount: 0,
      closedTodayReqCount: 2,
    }],
    velocity: {
      basis: 'exact ledger-observation sums; latest snapshot per observed date; no inferred rate',
      observed7d: observed(7),
      observed30d: observed(30),
    },
    byMapCompanyId: {
      'test:acme': {
        jobsUrl: 'https://jobs.acme.test/',
        openReqCount: 3,
        openPeopleOpsReqCount: 1,
        staleAttributedPostedReqCount: 1,
        maxObservedOpenDays: 5,
        sampleRoleUrl: 'https://jobs.acme.test/private-detail-not-projected',
      },
    },
  };
  const result = view(feed);
  assert.equal(result.observed7d.netObservedReqs, -1);
  assert.equal(result.changes[0].peopleOpsOpenReqs, 1);
  assert.equal('sampleRoleUrl' in result.changes[0], false);
  const poisoned = structuredClone(feed);
  poisoned.byMapCompanyId['test:acme'].jobsUrl = 'https://user:secret@jobs.acme.test/';
  assert.deepEqual(view(poisoned), { error: 'company_signals_unavailable' });
});

test('Inbox reuses the funnel report as aggregate-only people intelligence', () => {
  const projection = server.slice(
    server.indexOf('function peopleIntelligenceView'),
    server.indexOf('function slimStatus'),
  );
  assert.match(server, /currentStatusReport\(\)[\s\S]{0,80}peopleIntelligenceView|peopleIntelligenceView\(currentStatusReport\(\)\)/);
  assert.match(server, /peopleIntelligence: data\.peopleIntelligence \|\| null/);
  assert.match(ui, /d\.peopleIntelligence/);
  assert.match(ui, /People intelligence \(redacted\)/);
  assert.match(ui, /Provider capacity/);
  assert.match(ui, /people\.automation\?\.autoSend===false&&people\.automation\?\.autoDm===false/);
  assert.doesNotMatch(projection, /\b(?:email|handle|linkedin|top|stuckOldest|holdsScrapeDue|holds_reason)\b|_ids\b|_tos\b/i);
  const view = Function(`${projection}; return peopleIntelligenceView`)();
  const report = {
    at: '2026-07-29T00:00:00.000Z',
    total: 1,
    partners: 1,
    talent: 0,
    autoSend: false,
    autoDm: false,
    metrics: {
      holds_enrichable: 0,
      holds_scrape_due: 0,
      holds_cooling: 0,
      holds_exhausted: 0,
      enrich_transport_failures: 0,
      enrich_provider_capacity: 0,
      enrich_other_transport_failures: 0,
      drafted: 0,
      approve_ready: 0,
      send_ready: 0,
      sent_receipt_backed: 0,
    },
  };
  assert.equal(view(report).at, report.at);
  assert.equal(view({ ...report, at: 'POISON_EMAIL_alice@example.test' }).at, null);
});

test('Inbox draft row action is an honest copy-only command', () => {
  assert.match(ui, /data-draft="'\+esc\(r\.id\)\+'">Copy draft cmd<\/button>/);
  const handler = ui.match(/root\.querySelectorAll\('\[data-draft\]'\)\.forEach\(btn=>\{[\s\S]*?\n  \}\);/)?.[0] || '';
  assert.match(handler, /btn\.onclick=\(\)=>copyText\('node demigod-intro-draft\.mjs '\+btn\.getAttribute\('data-draft'\)\)/);
  assert.doesNotMatch(handler, /runJob\('inbox'\)|\/api\/status\?force=1/);
});

test('dashboard keeps one Now surface and only actionable exceptions', () => {
  assert.equal((ui.match(/id="nextBar"/g) || []).length, 1);
  assert.doesNotMatch(ui, /Do this next|id="glance"|id="deltaLine"|id="apiStrip"/);
  assert.match(ui, /filter\(c=>!\['ok','info'\]\.includes\(c\.kind\)\)\s*\.slice\(0,3\)/);
});

test('Home is signals plus release truth, not a tool catalog', () => {
  assert.match(ui, /<h2>Signals<\/h2>/);
  assert.match(ui, /Site chain/);
  assert.match(ui, /manifest v['"]\+manifestVer/);
  assert.match(server, /eventsOperational: onlineFresh/);
  assert.match(ui, /eventsOperational ['"]\+eventMetric\(eventsOnline\?\.eventsOperational\)[\s\S]*prepareOnlyWebsiteConfig ['"]\+eventMetric\(eventsOnline\?\.prepareOnlyWebsiteConfig\)/);
  assert.doesNotMatch(ui, /<h2>Do this next|<h2>Modules|<h2>Agent contracts|<h2>Sprint /);
});

test('Home exposes dashboard source drift from the canonical status payload', () => {
  assert.match(server, /dashboardRuntime: dashboardRuntimeHealth\(\)/);
  for (const file of ['demigod-agent-cockpit.mjs', 'demigod-control.mjs', 'demigod-priority-board.mjs']) {
    assert.match(server, new RegExp(`'${file.replaceAll('.', '\\.')}'`));
  }
  assert.match(server, /dashboardRuntime: statusCache\.data\?\.dashboardRuntime \|\| null/);
  assert.match(server, /dashboardRuntime: d\.dashboardRuntime \|\| null/);
  assert.match(server, /restartCommand: restartRequired \? 'systemctl --user restart demigod-dash\.service' : null/);
  assert.match(ui, /dashboardRuntime\.restartRequired/);
  assert.match(ui, /Running source matches disk/);
});

test('dashboard priority consumes and invalidates on fresh ship preparation', () => {
  assert.match(server, /data\.shipPrepare = safeJson\(path\.join\(BUSY, 'ship-prepare\.json'\)\) \|\| null/);
  assert.match(server, /'truth\.json',\s*'ship-prepare\.json'/);
  assert.match(server, /statSync\(path\.join\(ROOT, 'DEMIGOD-LEADS\.json'\)\)\.mtimeMs > statusCache\.at/);
});

test('job strip shows only active or failed work', () => {
  assert.match(ui, /filter\(j=>j\.status==='failed'\|\|j\.ok===false\|\|j\.status==='running'\|\|j\.status==='queued'\)\.slice\(0,3\)/);
  assert.match(ui, /strip\.hidden = parts\.length === 0/);
  assert.doesNotMatch(ui, /no recent jobs/);
});

test('slim polling preserves operational inbox classification', () => {
  for (const field of ['operationalCount', 'pendingOperationalReviewCount', 'testCount', 'spamCount', 'incompleteCount']) {
    assert.match(server, new RegExp(`${field}: data\\.inbox\\.${field}`));
  }
});

test('selftests never write into the real collaboration wall', () => {
  assert.match(toolsSelftest, /demigod-handoff\.mjs', '--note', 'selftest', '--print'/);
  assert.match(toolsOsSelftest, /'--next', 'verify', '--fast', '--print'/);
});

test('work-loop status uses the canonical useful-loop receipt', () => {
  assert.match(control, /useful-loop-last\.json/);
  assert.match(control, /useful-loop\.STOP/);
  assert.match(control, /usefulLoop\?\.ok === true/);
  assert.doesNotMatch(control, /usefulLoopTasks\.length > 0/);
  assert.match(control, /useful cycle \$\{usefulLoop\.cycle/);
});

test('control-plane review separates priority findings from heuristic notes', () => {
  assert.match(control, /const reviewPriority = .*critical.*high/);
  assert.match(control, /`\$\{reviewPriority\} priority · \$\{review\.summary\?\.count \?\? 0\} total/);
});

test('control plane ignores match receipts older than pair or dashboard evidence', () => {
  const start = control.indexOf('const matchReceiptAgeMs =');
  const end = control.indexOf('const realProposed =', start);
  const select = Function(
    'matchesBusy',
    'dashStatus',
    'pairStore',
    `
      const now = Date.parse('2026-07-30T01:00:00.000Z');
      const ageMsFrom = at => {
        const t = Date.parse(at);
        return Number.isFinite(t) ? now - t : Infinity;
      };
      const safeJsonFile = () => pairStore;
      const path = { join: () => '' };
      const ROOT = '';
      ${control.slice(start, end)}
      return matchSum;
    `,
  );
  const receipt = { at: '2026-07-30T00:58:00.000Z', summary: { total: 99 } };
  const dashboard = {
    matches: { at: '2026-07-30T00:59:00.000Z', summary: { total: 2 } },
  };
  assert.equal(select(receipt, dashboard, { at: '2026-07-30T00:57:00.000Z' }).total, 2);
  assert.equal(
    select(receipt, { matches: { at: '2026-07-30T00:57:00.000Z', summary: { total: 3 } } }, {
      at: '2026-07-30T00:59:00.000Z',
    }).total,
    3,
  );
  assert.equal(
    select(
      { at: '2026-07-30T00:59:30.000Z', summary: { total: 4 } },
      dashboard,
      { at: '2026-07-30T00:59:00.000Z' },
    ).total,
    4,
  );
});

test('control plane treats stale Orca receipts as unknown without shelling out', () => {
  const orca = control.slice(
    control.indexOf('// Orca remote seat'),
    control.indexOf('modules.plans ='),
  );
  assert.match(orca, /ageMs <= 300_000/);
  assert.match(orca, /Orca receipt stale/);
  assert.doesNotMatch(orca, /orca-ide status|spawnSync|execFile/);
});
