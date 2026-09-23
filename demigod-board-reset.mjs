#!/usr/bin/env node
/**
 * Local seed reset for a featured board in an explicit data root.
 * Writes DEMIGOD-BOARD.json and DEMIGOD-BOARD-RESET.json under DEMIGOD_ROOT.
 * Does not publish.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  published: false,
};

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function boardFile() {
  return path.join(dataRoot(), 'DEMIGOD-BOARD.json');
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-BOARD-RESET.json');
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

function linkStatus(file) {
  try {
    const st = fs.lstatSync(file);
    return st.isSymbolicLink() ? 'link' : 'file';
  } catch (e) {
    if (e && e.code === 'ENOENT') return 'missing';
    return 'blocked';
  }
}

function readText(file) {
  if (linkStatus(file) !== 'file') return null;
  return fs.readFileSync(file, 'utf8');
}

function seeds(at) {
  return {
    at,
    sample: true,
    roles: [
      {
        id: 'role-seed1',
        title: 'Product Manager',
        stageType: 'Pre-seed · B2B SaaS',
        skills: 'GTM, roadmap, user research',
        comp: '$160-200k + equity',
        status: 'Active',
        sample: true,
        featuredAt: at,
      },
      {
        id: 'role-seed2',
        title: 'Founding Designer',
        stageType: 'Seed · Consumer',
        skills: 'Figma, design systems, brand',
        comp: 'Comp on intro',
        status: 'Open',
        sample: true,
        featuredAt: at,
      },
      {
        id: 'role-seed3',
        title: 'Head of Growth',
        stageType: 'Series A · Fintech',
        skills: 'Paid social, PLG, analytics',
        comp: '$180-240k',
        status: 'Active',
        sample: true,
        featuredAt: at,
      },
    ],
    candidates: [
      {
        id: 'cand-seed1',
        summary: 'Product strategy, Figma, growth. 4 years at Series B startup.',
        tags: ['SF Bay Area', 'Product strategy', 'Figma'],
        sample: true,
        featuredAt: at,
      },
      {
        id: 'cand-seed2',
        summary: 'Full-stack engineer. Shipped React platforms at seed-stage startups.',
        tags: ['SF Bay Area', 'Engineer', 'React'],
        sample: true,
        featuredAt: at,
      },
    ],
    cdnUrl: null,
  };
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('reset_root_required');
  }
  const board = boardFile();
  const report = reportPath();
  const foot = path.join(root, 'demigod-foot-core.js');
  if (!insideRoot(root, board) || !insideRoot(root, report) || !insideRoot(root, foot)) {
    refuse('reset_root_required');
  }
  if (linkStatus(board) === 'link' || linkStatus(report) === 'link' || linkStatus(foot) === 'link') {
    refuse('board_link_refused');
  }
  const footText = readText(foot);
  const previousText = readText(board);
  if (footText == null && previousText == null) refuse('source_required');
  const footMarker = ((footText || '').match(/Harbor \S+ keep/) || [''])[0];
  let previousRoles = 0;
  if (previousText != null) {
    try {
      previousRoles = (JSON.parse(previousText).roles || []).length;
    } catch {
      previousRoles = 0;
    }
  }
  const at = new Date().toISOString();
  const next = seeds(at);
  const pass = next.roles.length === 3
    && next.candidates.length === 2
    && next.roles.every((role) => role.sample === true)
    && next.candidates.every((card) => card.sample === true);
  const body = {
    ok: pass,
    at,
    path: report,
    boardPath: board,
    source: 'disk',
    footMarker,
    replaced: previousText != null,
    previousRoles,
    roles: next.roles.length,
    candidates: next.candidates.length,
    sample: true,
    ...localFlags,
  };
  fs.writeFileSync(board, JSON.stringify(next, null, 2));
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    boardPath: board,
    source: 'disk',
    footMarker,
    replaced: previousText != null,
    previousRoles,
    roles: next.roles.length,
    candidates: next.candidates.length,
    sample: true,
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
      error: 'board_reset_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
