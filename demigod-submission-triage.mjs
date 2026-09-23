#!/usr/bin/env node
/**
 * Score one named submission against that data root's board.
 * Writes the triage note in the data root. Does not auto-match or send mail.
 *
 * Usage: node demigod-submission-triage.mjs --data '{"email":"ada@harbor.example","skills":"React","stage":"seed","company":"Harbor East","details":"shipped v1"}'
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function boardPath() {
  return path.join(dataRoot(), 'DEMIGOD-BOARD.json');
}

function latestPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSION-TRIAGE.json');
}

function logPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSION-TRIAGE.jsonl');
}

function fail(error) {
  console.error(JSON.stringify({ ok: false, error, sent: false, liveMail: false }));
  process.exit(1);
}

function parseArgs(argv) {
  const out = { data: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--data' && argv[i + 1]) out.data = argv[++i];
    else if (arg.startsWith('--data=')) out.data = arg.slice(7);
  }
  return out;
}

function loadBoard() {
  try {
    const board = JSON.parse(fs.readFileSync(boardPath(), 'utf8'));
    return Array.isArray(board.roles) ? board : { roles: [] };
  } catch {
    return { roles: [] };
  }
}

function companyKey(value) {
  return String(value || '').trim().toLowerCase();
}

function skillTokens(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[, ]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function rolesFor(sub, roles) {
  const wanted = companyKey(sub.company);
  if (!wanted) return roles;
  return roles.filter((role) => companyKey(role.company) === wanted);
}

function score(sub, roles) {
  let points = 0;
  const skills = skillTokens(sub.skills);
  const stage = String(sub.stage || '').toLowerCase();
  for (const role of rolesFor(sub, roles)) {
    if (role.stageType && String(role.stageType).toLowerCase().includes(stage) && stage) points += 20;
    const roleSkills = String(role.skills || '').toLowerCase();
    for (const skill of skills) {
      if (roleSkills.includes(skill)) points += 10;
    }
  }
  if (sub.email && sub.details) points += 15;
  return Math.min(100, points);
}

function suggest(sub, roles) {
  const skills = skillTokens(sub.skills);
  return rolesFor(sub, roles)
    .filter((role) => {
      const roleSkills = String(role.skills || '').toLowerCase();
      return skills.some((skill) => roleSkills.includes(skill));
    })
    .slice(0, 3)
    .map((role) => `Intro to ${role.title} at ${role.company || role.stageType}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.data.trim()) fail('submission_required');
  let data;
  try {
    data = JSON.parse(args.data);
  } catch {
    fail('submission_invalid');
  }
  const email = String(data.email || '').trim();
  if (!email) fail('email_required');

  const roles = loadBoard().roles;
  const note = {
    ok: true,
    at: new Date().toISOString(),
    email,
    company: String(data.company || '').trim(),
    score: score(data, roles),
    suggestions: suggest(data, roles),
    path: logPath(),
    sent: false,
    liveMail: false,
    autoMatch: false,
  };
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.appendFileSync(logPath(), JSON.stringify(note) + '\n');
  fs.writeFileSync(latestPath(), JSON.stringify(note, null, 2) + '\n');
  console.log(JSON.stringify(note));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
