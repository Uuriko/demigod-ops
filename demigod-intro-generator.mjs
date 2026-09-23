#!/usr/bin/env node
/**
 * Demigod Intro Generator (automation for human review)
 * Writes a local draft only when both the role and the candidate are on the board.
 * Does not send mail.
 *
 * Usage: node demigod-intro-generator.mjs --role-id=<id> --cand-id=<id>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { loadBoard } from './demigod-submissions-lib.mjs';

function argValue(args, name) {
  const hit = args.find((item) => item.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1).trim() : '';
}

function refuse(error, extra = {}) {
  console.error(JSON.stringify({ ok: false, error, sent: false, liveMail: false, ...extra }));
  process.exit(1);
}

function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function main() {
  const args = process.argv.slice(2);
  const roleId = argValue(args, '--role-id');
  const candId = argValue(args, '--cand-id');
  if (!roleId) refuse('role_required');
  if (!candId) refuse('candidate_required');

  const board = loadBoard();
  const role = (board.roles || []).find((row) => row && row.id === roleId);
  const cand = (board.candidates || []).find((row) => row && row.id === candId);
  if (!role) refuse('role_not_found', { roleId });
  if (!cand) refuse('candidate_not_found', { candId });

  const title = String(role.title || '').trim();
  const summary = String(cand.summary || '').trim();
  if (!title || !summary) refuse('intro_fields_required', { roleId, candId });

  const root = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
  const skills = String(role.skills || '').trim() || '—';
  const tags = Array.isArray(cand.tags) ? cand.tags.filter(Boolean).join(', ') : '';
  const intro = [
    `Subject: Warm intro: ${title}`,
    '',
    'Hi both,',
    '',
    `Board role: ${title}.`,
    `Candidate card: ${summary}.`,
    `Role skills: ${skills}.`,
    `Candidate tags: ${tags || '—'}.`,
    '',
    'Human review before any send. This draft was not mailed.',
    '',
    'Demigod',
  ].join('\n');

  const dir = path.join(root, 'DEMIGOD-INTROS');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${safeId(roleId)}-${safeId(candId)}.md`);
  atomicWrite(out, `${intro}\n`);
  console.log(JSON.stringify({
    ok: true,
    path: out,
    roleId,
    candId,
    sent: false,
    liveMail: false,
  }, null, 2));
}

main();
