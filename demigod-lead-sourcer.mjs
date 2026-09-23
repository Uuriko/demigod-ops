#!/usr/bin/env node
/**
 * Source talent and hiring-partner leads from the named inbox.
 * A partner list comes from partner submissions in that inbox. This command does not invent a startup.
 *
 * Usage:
 *   node demigod-lead-sourcer.mjs --type=talent
 *   node demigod-lead-sourcer.mjs --type=partners --limit=10
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function inboxPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-INBOX.json');
}

function leadsPath() {
  return path.join(dataRoot(), 'DEMIGOD-LEADS.json');
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    if (eq === -1) out[body] = true;
    else out[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return out;
}

function textOf(raw, keys) {
  for (const key of keys) {
    const value = raw?.[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function kindFor(type) {
  if (type === 'talent') return 'talent';
  if (type === 'partner' || type === 'partners') return 'partner';
  return '';
}

function matchesKind(item, kind) {
  const form = String(item?.form || '');
  if (kind === 'talent') return /engineer|candidate|jobseeker|talent/i.test(form);
  if (kind === 'partner') return /partner/i.test(form);
  return false;
}

function scoreLead(lead) {
  let score = 0;
  const skills = String(lead.skills || '').toLowerCase();
  const stage = String(lead.stageType || '').toLowerCase();
  const loc = String(lead.location || '').toLowerCase();
  if (skills) score += 30;
  if (stage.includes('seed') || stage.includes('pre')) score += 20;
  if (loc.includes('sf') || loc.includes('bay')) score += 20;
  if (lead.outcome90d || lead.why) score += 15;
  return Math.min(100, score);
}

function leadFromItem(item, kind) {
  const raw = item.raw || {};
  const lead = {
    id: item.id,
    type: kind,
    email: textOf(raw, ['partner-email', 'contact-email', 'seeker-email', 'partnerEmail', 'contactEmail', 'seekerEmail']),
    company: textOf(raw, ['partner-org', 'company-name', 'company', 'partnerOrg', 'companyName']),
    title: textOf(raw, ['role-title', 'title', 'partner-type', 'roleTitle']),
    skills: textOf(raw, ['skills-stack', 'stack-needs', 'skills', 'referral-plan']),
    location: textOf(raw, ['location', 'sf-bay']),
    stageType: textOf(raw, ['stage', 'stage-type', 'stageType']),
    why: textOf(raw, ['why-this-role', 'why', 'referral-plan']),
    outcome90d: textOf(raw, ['90day-outcome', '90d-outcome', 'outcome90d']),
  };
  lead.score = scoreLead(lead);
  return lead;
}

export function sourceLeads(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const requested = String(args.type || 'talent');
  const kind = kindFor(requested);
  if (!kind) {
    return {
      ok: false,
      error: 'type_invalid',
      sent: false,
      liveMail: false,
    };
  }
  const limit = Math.max(1, Number(args.limit) || 5);
  const inbox = readJson(inboxPath()) || { items: [] };
  const leads = (inbox.items || [])
    .filter((item) => matchesKind(item, kind))
    .map((item) => leadFromItem(item, kind))
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .slice(0, limit);
  const file = leadsPath();
  const report = {
    at: new Date().toISOString(),
    ok: true,
    type: kind,
    count: leads.length,
    leads,
    path: file,
    sent: false,
    liveMail: false,
  };
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(file, JSON.stringify(report, null, 2) + '\n');
  return report;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = sourceLeads();
  if (!result.ok) {
    console.error(JSON.stringify(result));
    process.exit(1);
  }
  console.log(JSON.stringify(result));
}
