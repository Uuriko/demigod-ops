#!/usr/bin/env node
/**
 * Local desk explore for planted notes in an explicit data root.
 * Writes DEMIGOD-CURSOR-EXPLORE.json under DEMIGOD_ROOT. Does not open a browser.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  browsed: false,
};

const PAGE_IDS = [
  'agents',
  'dashboard',
  'cloud-agents',
  'settings',
  'integrations',
  'plugins',
  'bugbot',
  'automations',
  'docs',
  'marketplace',
];

const NAV = [
  'Overview', 'Settings', 'Cloud Agents', 'Bugbot', 'Security Agents', 'Approval Agents',
  'Plugins', 'Integrations', 'API Keys', 'Shared Canvases', 'Members', 'Usage', 'Spending',
  'Billing', 'Automations', 'Marketplace', 'Docs',
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-CURSOR-EXPLORE.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'cursor-explore');
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

function entryStat(root, rel) {
  const file = path.join(root, rel);
  if (!insideRoot(root, file)) return null;
  let st;
  try {
    st = fs.lstatSync(file);
  } catch {
    return null;
  }
  if (st.isSymbolicLink()) return null;
  return { file, st };
}

function regularFile(root, rel) {
  const found = entryStat(root, rel);
  if (!found || !found.st.isFile()) return null;
  return found.file;
}

function regularDir(root, rel) {
  const found = entryStat(root, rel);
  if (!found || !found.st.isDirectory()) return null;
  return found.file;
}

function readText(root, rel) {
  const file = regularFile(root, rel);
  if (!file) return null;
  return fs.readFileSync(file, 'utf8');
}

function readJson(root, rel) {
  const text = readText(root, rel);
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function listNames(root, rel, accept) {
  const dir = regularDir(root, rel);
  if (!dir) return [];
  const names = [];
  for (const name of fs.readdirSync(dir)) {
    const relName = path.join(rel, name);
    const found = entryStat(root, relName);
    if (found && accept(found.st, name)) names.push(name);
  }
  return names.sort();
}

function navItems(text) {
  return NAV.filter((item) => text.includes(item));
}

function loginWall(text) {
  return /sign in|log in|continue with google/i.test(text) && text.length < 800;
}

function hasSource(root) {
  if (regularFile(root, path.join('.cursor', 'cli-config.json'))) return true;
  if (regularFile(root, 'demigod-foot-core.js')) return true;
  return PAGE_IDS.some((id) => regularFile(root, path.join('cursor-pages', `${id}.note`)));
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--designer')
    || process.argv.includes('--submit')
    || process.argv.includes('--fetch')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('explore_root_required');
  }
  if (!hasSource(root)) refuse('source_required');

  const footText = readText(root, 'demigod-foot-core.js') || '';
  const cliConfig = readJson(root, path.join('.cursor', 'cli-config.json')) || {};
  const mcp = readJson(root, path.join('.cursor', 'mcp.json')) || {};
  const rules = listNames(root, path.join('.cursor', 'rules'), (st, name) => st.isFile() && name.endsWith('.mdc'));
  const skills = listNames(root, path.join('.cursor', 'skills-cursor'), (st) => st.isDirectory());
  const notes = PAGE_IDS.map((id) => ({
    id,
    text: readText(root, path.join('cursor-pages', `${id}.note`)),
  }));
  const footMarker = (
    footText.match(/Harbor \S+ keep/)
    || notes.map((note) => note.text || '').join('\n').match(/Harbor \S+ keep/)
    || ['']
  )[0];
  const explored = notes.map((note) => {
    const text = note.text || '';
    return {
      id: note.id,
      present: note.text != null,
      navVisible: note.text == null ? [] : navItems(text),
      bodyLen: text.length,
      excerpt: text.slice(0, 2500),
      loginRequired: note.text != null && loginWall(text),
    };
  });
  const notesRead = explored.filter((page) => page.present).length;
  const loginWalls = explored.filter((page) => page.loginRequired).length;
  const relevant = {
    webflowMcp: Boolean(mcp.mcpServers && mcp.mcpServers.webflow),
    chromeDevtoolsMcp: Boolean(mcp.mcpServers && mcp.mcpServers['chrome-devtools']),
    demigodRule: rules.includes('demigod.mdc'),
    approvalMode: cliConfig.approvalMode || null,
    sandbox: cliConfig.sandbox && cliConfig.sandbox.mode ? cliConfig.sandbox.mode : null,
  };
  const pass = notesRead === PAGE_IDS.length
    && loginWalls === 0
    && relevant.demigodRule
    && relevant.webflowMcp;
  const dir = shotDir();
  const screenshots = PAGE_IDS.map((id) => path.join(dir, `${id}.shot`));
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, report) || screenshots.some((file) => !insideRoot(root, file))) {
    refuse('explore_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  for (const file of screenshots) {
    const id = path.basename(file, '.shot');
    const page = explored.find((item) => item.id === id);
    fs.writeFileSync(file, `${footMarker}\n${id}\n${page && page.present ? 'note' : 'missing'}\n`);
  }
  const body = {
    ok: pass,
    at: new Date().toISOString(),
    path: report,
    shotDir: dir,
    source: 'disk',
    footMarker,
    pages: notesRead,
    expected: PAGE_IDS.length,
    loginWalls,
    explored,
    screenshots,
    localConfig: {
      approvalMode: relevant.approvalMode,
      sandbox: relevant.sandbox,
      rules,
      hooks: Boolean(regularFile(root, path.join('.cursor', 'hooks.json'))),
      skills,
      cursorAgentCli: Boolean(regularDir(root, path.join('.local', 'share', 'cursor-agent', 'versions'))),
      appImage: Boolean(regularFile(root, path.join('Downloads', 'Cursor-3.7.36-x86_64.AppImage'))),
      mcpServers: Object.keys(mcp.mcpServers || {}),
    },
    demigodRelevant: relevant,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    source: 'disk',
    footMarker,
    pages: notesRead,
    expected: PAGE_IDS.length,
    loginWalls,
    demigodRule: relevant.demigodRule,
    webflowMcp: relevant.webflowMcp,
    approvalMode: relevant.approvalMode,
    shots: screenshots.length,
    ...localFlags,
  }));
  if (!pass) process.exit(1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({
      ok: false,
      error: 'explore_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
