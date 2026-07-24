import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const control = fs.readFileSync(new URL('./demigod-control.mjs', import.meta.url), 'utf8');
const toolsSelftest = fs.readFileSync(new URL('./demigod-tools-selftest.mjs', import.meta.url), 'utf8');
const toolsOsSelftest = fs.readFileSync(new URL('./demigod-tools-os-selftest.mjs', import.meta.url), 'utf8');
const inboxSource = fs.readFileSync(new URL('./demigod-submissions-inbox.mjs', import.meta.url), 'utf8');

test('dashboard has one seven-view navigation and no retired UI modes', () => {
  assert.equal((ui.match(/role="tab"/g) || []).length, 7);
  for (const label of ['Home', 'Inbox', 'Matches', 'Work', 'Tools', 'Ship', 'SF Map']) {
    assert.match(ui, new RegExp(`data-tab="[^"]+">${label}<`));
  }
  assert.doesNotMatch(ui, /modeSimple|densityComfy|themeLight|helpOverlay|panel-(?:system|swarm|brief|gates)/);
  assert.doesNotMatch(ui, /gLight|gSite|gFreeze|gNext|sessionStory|deltaLine|apiStrip|api-pill|demandLine|badge\.v5|badge\.pulse/);
});

test('Tools uses the server-curated catalog without duplicate filter modes', () => {
  assert.match(ui, /fetch\('\/api\/tools\?t='\+Date\.now\(\)\)/);
  assert.doesNotMatch(ui, /toolsHideAlias|toolsHotOnly|function toolsQuery/);
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
  assert.doesNotMatch(ui, /fetch\('\/api\/coord'\)|function renderSystem|function loadMap/);
  assert.match(ui, /const qs = 'ui=1'/);
  assert.match(server, /function dashboardStatus\(data\)/);
  assert.match(ui, /function renderActivePanel\(d\)/);
  assert.match(ui, /if\(\$\('workerDetails'\)\?\.open\) renderSwarm\(d\)/);
  assert.match(ui, /if\(\$\('evidenceDetails'\)\?\.open\) renderGates\(d\)/);
});

test('dashboard rejects malformed keep-awake PIDs before probing liveness', () => {
  assert.match(server, /if \(!Number\.isInteger\(pid\) \|\| pid <= 0\) throw new Error\('invalid keep-awake pid'\);\s+process\.kill\(pid, 0\)/);
});

test('Inbox renders an explicitly operational queue', () => {
  assert.match(inboxSource, /operationalRows: operationalItems/);
  assert.match(ui, /ib\.operationalRows\|\|\(ib\.operationalCount===0\?\[\]:ib\.rows\|\|\[\]\)/);
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
  assert.match(server, /dashboardRuntime: statusCache\.data\?\.dashboardRuntime \|\| null/);
  assert.match(server, /dashboardRuntime: d\.dashboardRuntime \|\| null/);
  assert.match(server, /restartCommand: restartRequired \? 'systemctl --user restart demigod-dash\.service' : null/);
  assert.match(ui, /dashboardRuntime\.restartRequired/);
  assert.match(ui, /Running source matches disk/);
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
  assert.match(control, /useful cycle \$\{usefulLoop\.cycle/);
  assert.doesNotMatch(control, /cycle-work-latest\.json|never-stop\.STOP|swarm-busy\.STOP/);
});

test('control-plane review separates priority findings from heuristic notes', () => {
  assert.match(control, /const reviewPriority = .*critical.*high/);
  assert.match(control, /`\$\{reviewPriority\} priority · \$\{review\.summary\?\.count \?\? 0\} total/);
});
