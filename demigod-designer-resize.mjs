#!/usr/bin/env node
/**
 * Local viewport check for planted notes in an explicit data root.
 * Writes DEMIGOD-DESIGNER-RESIZE.json under DEMIGOD_ROOT. Does not open a designer.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  resized: false,
  designerOpen: false,
};
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 800;

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-DESIGNER-RESIZE.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'designer-resize');
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

function readViewport(root) {
  const text = readText(root, 'demigod-designer-resize-source.json');
  if (text == null) return null;
  try {
    const parsed = JSON.parse(text);
    return {
      width: Number(parsed.width) || 0,
      height: Number(parsed.height) || 0,
    };
  } catch {
    return { width: 0, height: 0 };
  }
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--designer')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('resize_root_required');
  }
  const footText = readText(root, 'demigod-foot-core.js');
  const viewport = readViewport(root);
  if (footText == null && viewport == null) refuse('source_required');
  const width = viewport ? viewport.width : 0;
  const height = viewport ? viewport.height : 0;
  const tooSmall = width < MIN_WIDTH || height < MIN_HEIGHT;
  const pass = !tooSmall;
  const footMarker = ((footText || '').match(/Harbor \S+ keep/) || [''])[0];
  const dir = shotDir();
  const shot = path.join(dir, 'canvas.shot');
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, shot) || !insideRoot(root, report)) {
    refuse('resize_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\n${width}x${height}\n${tooSmall ? 'small' : 'clear'}\n`);
  const body = {
    ok: pass,
    at: new Date().toISOString(),
    path: report,
    shot,
    source: 'disk',
    footMarker,
    width,
    height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    tooSmall,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    shot,
    source: 'disk',
    footMarker,
    width,
    height,
    tooSmall,
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
      error: 'designer_resize_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
