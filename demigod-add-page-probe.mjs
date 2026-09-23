#!/usr/bin/env node
/**
 * Local add-page probe for planted markup in an explicit data root.
 * Writes DEMIGOD-ADD-PAGE-PROBE.json under DEMIGOD_ROOT. Does not open a designer.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  clicked: false,
  designerOpen: false,
};

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-ADD-PAGE-PROBE.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'add-page');
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

function readText(root, rel) {
  const found = entryStat(root, rel);
  if (!found || !found.st.isFile()) return null;
  return fs.readFileSync(found.file, 'utf8');
}

function menuTexts(html) {
  const texts = [];
  const re = /<(?:button|a|div|span)[^>]*>([^<]{1,49})<\/(?:button|a|div|span)>/gi;
  let match;
  while ((match = re.exec(html))) {
    const text = match[1].trim();
    if (text) texts.push(text);
  }
  return [...new Set(texts)].slice(0, 30);
}

function automationIds(html) {
  const found = [];
  const re = /data-automation-id=["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(html))) {
    const id = match[1];
    if (/page|folder|add/i.test(id)) found.push({ id, t: '' });
  }
  return found.slice(0, 40);
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    refuse('probe_root_required');
  }
  const html = readText(root, 'demigod-add-page-source.html');
  const foot = readText(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const menu = menuTexts(htmlText);
  const aids = automationIds(htmlText);
  const ids = aids.map((item) => item.id);
  const pagesButton = ids.includes('left-sidebar-pages-button');
  const addMenu = ids.includes('add-page-menu-button');
  const createPage = menu.includes('Create page');
  const pass = pagesButton && addMenu && createPage;
  const body = visibleText(htmlText).slice(-2000);
  const dir = shotDir();
  const shot = path.join(dir, 'add-page-menu.shot');
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, shot) || !insideRoot(root, report)) {
    refuse('probe_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\nadd-page-menu\n${html == null ? 'missing' : 'note'}\n`);
  const stored = {
    ok: pass,
    at: new Date().toISOString(),
    path: report,
    shot,
    source: 'disk',
    footMarker,
    menu,
    aids,
    body,
    pagesButton,
    addMenu,
    createPage,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(stored, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    shot,
    source: 'disk',
    footMarker,
    menuCount: menu.length,
    pagesButton,
    addMenu,
    createPage,
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
      error: 'add_page_probe_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
