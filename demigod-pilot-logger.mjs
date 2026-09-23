#!/usr/bin/env node
/**
 * Log one named pilot on that data root's board.
 * A logged pilot remains after save. This command does not publish or send mail.
 *
 * Usage: node demigod-pilot-logger.mjs --brief="Harbor East One"
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { loadBoard, saveBoard } from './demigod-submissions-lib.mjs';
import { appendPilot } from './demigod-board-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function boardFile() {
  return path.join(dataRoot(), 'DEMIGOD-BOARD.json');
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    founder: '',
    brief: '',
    intros: 0,
    outcome: '',
    stage: 'Active',
    stageType: 'seed',
    publish: false,
    introsSet: false,
  };
  for (const arg of argv) {
    if (arg.startsWith('--founder=')) out.founder = arg.slice(10);
    else if (arg.startsWith('--brief=')) out.brief = arg.slice(8);
    else if (arg.startsWith('--intros=')) {
      out.intros = arg.slice(9);
      out.introsSet = true;
    } else if (arg.startsWith('--outcome=')) out.outcome = arg.slice(10);
    else if (arg.startsWith('--stage=')) out.stage = arg.slice(8);
    else if (arg.startsWith('--stage-type=')) out.stageType = arg.slice(13);
    else if (arg === '--publish') out.publish = true;
    else if (arg === '--no-publish') out.publish = false;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.publish) fail('publish_refused');
  const brief = String(args.brief || '').trim();
  if (!brief) fail('brief_required');
  if (args.introsSet && !/^\d+$/.test(String(args.intros).trim())) fail('intros_invalid');

  const board = loadBoard();
  const { role } = appendPilot(board, {
    founder: args.founder,
    brief,
    intros: args.introsSet ? Number(args.intros) : 0,
    outcome: args.outcome,
    stage: args.stage,
    stageType: args.stageType,
    withReceipt: false,
  });
  let saved;
  try {
    saved = saveBoard(board, {
      reason: 'pilot-logger',
      actor: 'pilot-logger',
      allowRealRoles: true,
    });
  } catch (err) {
    if (err && err.code === 'REAL_ROLES_REFUSED') fail('real_roles_refused');
    fail('board_write_refused');
  }
  const pilots = (saved.roles || []).filter((row) => row && row.pilot === true).map((row) => row.title);
  console.log(JSON.stringify({
    ok: true,
    brief,
    roleId: role.id,
    pilots,
    path: boardFile(),
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
