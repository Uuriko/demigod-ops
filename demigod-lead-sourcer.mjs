#!/usr/bin/env node
/**
 * Demigod Lead Sourcer (internal automation tool)
 * Sources talent (engineers) and hiring partners (startups) leads.
 * Parses real submissions and writes a preview for human triage.
 * Never overwrites the canonical lead CRM.
 *
 * Usage:
 *   node demigod-lead-sourcer.mjs --type=talent
 *   node demigod-lead-sourcer.mjs --type=partners --limit=10
 *
 * Integrates: submissions inbox + validated RecruitAI export.
 * Honest: outputs for human triage only. No auto board.
 */

import fs from 'fs';
import path from 'path';
/* Shared 'is this a startup' evidence — same source the public directory and role ledger use. */
import { startupScore, companyKey as startupKey, loadCompanyProfiles } from './demigod-public-roles.mjs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'url';
import {
  candidateProfileReadiness,
  currentCandidateSubmissions,
  loadInbox,
  scrubPII,
} from './demigod-submissions-lib.mjs';
import { isJunkAggregatorLead, isSfBayLocation } from './demigod-lead-collect.mjs';
import { assertExportValid } from './demigod-recruitai-export.mjs';
import { refuseIfStale, safeResearchUrl } from './demigod-evidence.mjs';
import { boardFromCompany } from './demigod-role-ledger.mjs';
import { UNSAFE_INVISIBLE_CLASS } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = path.resolve(process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy');
const OUT = path.join(BUSY, 'lead-sourcer-latest.json');
// Bare DEMIGOD_RECRUITAI_EXPORT skips pointer/mode/hash binding. Only honor it
// when DEMIGOD_TEST_SCOPE === basename(BUSY): a leaked pid/scope from other
// tests must not unlock production override (Claude acceptance P2 + 2026-07-29).
const RECRUITAI_EXPORT_OVERRIDE =
  process.env.DEMIGOD_RECRUITAI_EXPORT &&
  String(process.env.DEMIGOD_TEST_SCOPE || '').trim() === path.basename(BUSY)
    ? process.env.DEMIGOD_RECRUITAI_EXPORT
    : '';
const COMMITTED_RECRUITAI_EXPORT =
  path.join(BUSY, 'recruitai-export', 'latest.json');
const RECRUITAI_EXPORT =
  RECRUITAI_EXPORT_OVERRIDE || COMMITTED_RECRUITAI_EXPORT;
const LEADS = process.env.DEMIGOD_LEADS_PATH || path.join(ROOT, 'DEMIGOD-LEADS.json');
const ROLE_LEDGER =
  process.env.DEMIGOD_ROLE_LEDGER || path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const STARTUP_MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const COMPANY_RESEARCH = path.join(ROOT, 'DEMIGOD-COMPANY-RESEARCH.json');
const USAGE =
  'usage: node demigod-lead-sourcer.mjs [--type=talent|partners] [--limit=1..100] [--offset=0..10000]';
/** One refusal for every way the committed export can be absent, unlinked, or tampered with. */
export const EXPORT_REFUSED = 'invalid committed RecruitAI export';
const UNSAFE_PARTNER_CONTROL =
  new RegExp('[\\u0000-\\u001f' + UNSAFE_INVISIBLE_CLASS + ']');

function parseArgs() {
  const args = process.argv.slice(2);
  const type = (args.find(a => a.startsWith('--type=')) || '--type=talent').split('=')[1];
  const rawLimit = (args.find(a => a.startsWith('--limit=')) || '--limit=5').split('=')[1];
  const rawOffset = (args.find(a => a.startsWith('--offset=')) || '--offset=0').split('=')[1];
  const limit = /^[1-9]\d*$/.test(rawLimit) ? Number(rawLimit) : NaN;
  const offset = /^(?:0|[1-9]\d*)$/.test(rawOffset) ? Number(rawOffset) : NaN;
  if (
    args.length > 4 ||
    new Set(args.map(a => a.split('=')[0])).size !== args.length ||
    args.some(
      a =>
        !a.startsWith('--type=') &&
        !a.startsWith('--limit=') &&
        !a.startsWith('--offset=') &&
        /* Opt-in startup screen; validated here so an unknown flag still fails closed. */
        a !== '--startups',
    ) ||
    !['talent', 'partners'].includes(type) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 10000 ||
    (type !== 'partners' && offset !== 0)
  ) throw new Error(USAGE);
  return { type, limit, offset };
}

function scoreLead(lead, type) {
  let score = 0;
  const skills = (lead.skills || lead['stack-needs'] || '').toLowerCase();
  const stage = (lead.stageType || '').toLowerCase();
  const loc = (lead.location || lead['sf-bay'] || '').toLowerCase();
  if (skills) score += 30;
  if (stage.includes('seed') || stage.includes('pre')) score += 20;
  if (isSfBayLocation(loc)) score += 20;
  if (lead['90day-outcome'] || lead.why) score += 15;
  return Math.min(100, score);
}

function scrubCompanyName(value, domain = '') {
  const raw = String(value || '');
  return raw.toLowerCase().replace(/^www\./, '') === String(domain).toLowerCase()
    ? raw
    : scrubPII(raw);
}

function companyKey(value, domain = '') {
  return scrubCompanyName(value, domain)
    .replace(/\[(?:contact|phone|address|link|handle) removed\]/gi, ' ')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function projectedPartnerText(value, max, domain = '') {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    UNSAFE_PARTNER_CONTROL.test(value)
  ) return null;
  return scrubCompanyName(value, domain) === value ? value : null;
}

function projectedPartnerDomain(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 253 ||
    UNSAFE_PARTNER_CONTROL.test(value)
  ) return null;
  const safe = safeResearchUrl(`https://${value}`);
  if (!safe) return null;
  const url = new URL(safe);
  return url.hostname === value && url.origin === `https://${value}` ? value : null;
}

function projectedPartnerUrl(value) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    UNSAFE_PARTNER_CONTROL.test(value)
  ) return null;
  const safe = safeResearchUrl(value);
  return safe && safe.length <= 2048 ? safe : null;
}

function ycPublicCompanyUrl(value, mapCompanyId) {
  const safe = projectedPartnerUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const slug = url.pathname.match(/^\/companies\/([a-z0-9][a-z0-9-]*)\/?$/i)?.[1];
  return (
    url.protocol === 'https:' &&
    url.hostname.replace(/^www\./, '') === 'ycombinator.com' &&
    !url.port &&
    !url.search &&
    !url.hash &&
    slug &&
    mapCompanyId === `yc:${slug.toLowerCase()}`
  ) ? url.href : null;
}

function validDate(value) {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

function assertCurrentRecruitaiSource(artifact, now) {
  const generatedAt = Date.parse(artifact.generatedAt);
  const ledgerUpdatedAt = Date.parse(artifact.roleLedgerUpdatedAt);
  const today = Number.isFinite(now) ? new Date(now).toISOString().slice(0, 10) : null;
  if (
    !today ||
    generatedAt > now + 60_000 ||
    ledgerUpdatedAt > now + 60_000 ||
    new Date(generatedAt).toISOString().slice(0, 10) !== today ||
    new Date(ledgerUpdatedAt).toISOString().slice(0, 10) !== today ||
    artifact.changeDate !== today
  ) throw new Error('stale committed RecruitAI source');
  const ledger = JSON.parse(fs.readFileSync(ROLE_LEDGER, 'utf8'));
  const map = JSON.parse(fs.readFileSync(STARTUP_MAP, 'utf8'));
  if (
    ledger?.schema !== 'demigod.role-ledger/1' ||
    ledger.updatedAt !== artifact.roleLedgerUpdatedAt ||
    fs.statSync(ROLE_LEDGER).mtimeMs > generatedAt ||
    (map?.generatedAt || map?.at) !== artifact.mapGeneratedAt ||
    fs.statSync(STARTUP_MAP).mtimeMs > generatedAt
  ) throw new Error('stale committed RecruitAI source');
  if (artifact.researchEvidence?.green === true) {
    const research = refuseIfStale('company-research-benchmark');
    const catalog = JSON.parse(fs.readFileSync(COMPANY_RESEARCH, 'utf8'));
    const catalogSha = createHash('sha256')
      .update(JSON.stringify(catalog || {}))
      .digest('hex');
    if (
      research.green !== true ||
      research.runId !== artifact.researchEvidence.runId ||
      research.endedAt !== artifact.researchEvidence.endedAt ||
      catalogSha !== artifact.researchEvidence.catalog.inputSha256
    ) throw new Error('stale committed RecruitAI source');
  }
}

export function loadRecruitaiExport({ committedOnly = false, withFiles = false } = {}) {
  const exportPath = committedOnly ? COMMITTED_RECRUITAI_EXPORT : RECRUITAI_EXPORT;
  if (!committedOnly && RECRUITAI_EXPORT_OVERRIDE) {
    const artifact = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    assertExportValid(artifact);
    return artifact;
  }
  const pointer = path.dirname(exportPath);
  const configuredGenerationsRoot = path.join(BUSY, 'recruitai-export-generations');
  const files = ['commit.json', 'latest.json', 'latest.csv'];
  // Every check here is fail-closed and reports one deliberate message. They are raw fs calls
  // though, and a MISSING path throws ENOENT before any check can run — so that message was
  // unreachable in the most common case. BUSY defaults under /tmp, so any reboot removes the
  // generations root, and `demigod-lead-sourcer.mjs --type=partners` (listed in `bin/dg tools`)
  // died with a stack trace instead of saying the export was not there. Absent and malformed are
  // the same answer to the caller — refuse — so they get the same error, not a crash.
  let generation;
  try {
    const generationsRoot = fs.realpathSync(configuredGenerationsRoot);
    generation = fs.realpathSync(pointer);
    if (
      !fs.lstatSync(configuredGenerationsRoot).isDirectory() ||
      !fs.lstatSync(pointer).isSymbolicLink() ||
      path.dirname(generation) !== generationsRoot ||
      !fs.lstatSync(generation).isDirectory() ||
      (fs.statSync(generationsRoot).mode & 0o777) !== 0o700 ||
      (fs.statSync(generation).mode & 0o777) !== 0o700 ||
      files.some((file) => {
        const stat = fs.lstatSync(path.join(generation, file));
        return !stat.isFile() || (stat.mode & 0o777) !== 0o600;
      })
    ) throw new Error(EXPORT_REFUSED);
  } catch {
    throw new Error(EXPORT_REFUSED);
  }
  const buffers = Object.fromEntries(
    files.map((file) => [file, fs.readFileSync(path.join(generation, file))]),
  );
  const commit = JSON.parse(buffers['commit.json']);
  const committedFiles = Object.keys(commit?.files || {}).sort();
  if (
    commit?.schema !== 'demigod.recruitai-export-commit/1' ||
    commit.generation !== generation ||
    !validDate(commit.at) ||
    JSON.stringify(committedFiles) !== JSON.stringify(['latest.csv', 'latest.json']) ||
    committedFiles.some((file) =>
      !/^[0-9a-f]{64}$/.test(commit.files[file]) ||
      createHash('sha256').update(buffers[file]).digest('hex') !== commit.files[file]
    )
  ) throw new Error(EXPORT_REFUSED);
  const artifact = JSON.parse(buffers['latest.json']);
  if (
    !Array.isArray(artifact?.rows) ||
    commit.rows !== artifact.rows.length ||
    commit.rowLimit !== artifact.rowLimit
  ) throw new Error(EXPORT_REFUSED);
  assertExportValid(artifact);
  return withFiles ? { artifact, commit, generation, files: buffers } : artifact;
}

export function selectRecruitaiPartners(
  crm,
  { limit = 5, offset = 0, committedOnly = false, now = Date.now() } = {},
) {
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  ) throw new Error('invalid partner selection window');
  const artifact = loadRecruitaiExport({ committedOnly });
  if (
    !validDate(artifact.generatedAt) ||
    !validDate(artifact.roleLedgerUpdatedAt) ||
    !validDate(artifact.changeDate) ||
    !Number.isSafeInteger(artifact.staleDaysThreshold) ||
    artifact.staleDaysThreshold < 1 ||
    artifact.staleDaysThreshold >= artifact.evergreenDaysThreshold
  ) {
    throw new Error('invalid RecruitAI source metadata');
  }
  if (committedOnly || !RECRUITAI_EXPORT_OVERRIDE) {
    assertCurrentRecruitaiSource(artifact, now);
  }
  if (!Array.isArray(crm?.partners) || !Array.isArray(crm?.talent)) {
    throw new Error('invalid lead CRM');
  }
  const dedupePartners = crm.partners.filter((lead) => {
    const receipt = Array.isArray(lead.stateHistory) ? lead.stateHistory.at(-1) : null;
    const lifecycle = [lead.state, lead.status].filter((value) => typeof value === 'string' && value);
    return !(
      lifecycle.length > 0 &&
      lifecycle.every((value) => value.toLowerCase() === 'disqualified') &&
      isJunkAggregatorLead(lead) &&
      receipt?.to === 'disqualified' &&
      receipt.actor === 'agent' &&
      receipt.note === 'junk-aggregator-or-fragment'
    );
  });
  const existingCompanies = new Set(
    dedupePartners.map((lead) => companyKey(lead.company, lead.domain)).filter(Boolean),
  );
  const existingIds = new Set(dedupePartners.flatMap((lead) =>
    [lead.mapCompanyId, lead.companyId, lead.id]
      .filter((id) => typeof id === 'string' && id.startsWith('yc:'))
  ));
  /* Opt-in: default behaviour is unchanged so existing callers and fixtures keep working.
     Turning it on by default abstained every test fixture (companies absent from the map score 1,
     not 2) and took the sourcer from 18/0 to 14/4. */
  const startupsOnly = process.argv.includes('--startups');
  const startupProfiles = startupsOnly ? loadCompanyProfiles() : {};
  const leads = [];
  let eligibleBeforeWindow = 0;
  let eligibleBeyondLimit = 0;
  const seenIds = new Set();
  const seenCompanies = new Set();
  const abstentions = {
    notPublicYcIdentity: 0,
    quarantinedHiringEvidence: 0,
    noOpenRole: 0,
    positiveNoAgencyEvidence: 0,
    existingCrmId: 0,
    existingCrmName: 0,
    duplicateSourceIdentity: 0,
    notStartupSized: 0,
  };
  for (const row of artifact.rows) {
    const domain =
      row.domain == null ? null : projectedPartnerDomain(row.domain);
    const displayCompany =
      row.name == null ? null : projectedPartnerText(row.name, 300, domain || '');
    const sampleRoleTitle =
      row.sampleRoleTitle == null
        ? null
        : projectedPartnerText(row.sampleRoleTitle, 500);
    const peopleOpsRoleTitle =
      row.samplePeopleOpsRoleTitle == null
        ? null
        : projectedPartnerText(row.samplePeopleOpsRoleTitle, 500);
    const retrievedAt = projectedPartnerText(row.retrievedAt, 40);
    if (
      (row.domain != null && !domain) ||
      (row.name != null && !displayCompany) ||
      (row.sampleRoleTitle != null && !sampleRoleTitle) ||
      (row.samplePeopleOpsRoleTitle != null && !peopleOpsRoleTitle) ||
      !retrievedAt
    ) throw new Error(`invalid partner projection for ${row.mapCompanyId}`);
    const company = companyKey(displayCompany, domain || '');
    const sourceUrl = ycPublicCompanyUrl(row.sourceUrl, row.mapCompanyId);
    if (
      typeof row.mapCompanyId !== 'string' ||
      !row.mapCompanyId.startsWith('yc:') ||
      row.sourceLicense !== 'YC-public' ||
      !company ||
      !sourceUrl
    ) {
      abstentions.notPublicYcIdentity++;
      continue;
    }
    if (row.companyResearch?.quarantineHiring === true) {
      abstentions.quarantinedHiringEvidence++;
      continue;
    }
    if (row.openReqCount < 1) {
      abstentions.noOpenRole++;
      continue;
    }
    if (row.noAgencyEvidenceReqCount !== 0) {
      abstentions.positiveNoAgencyEvidence++;
      continue;
    }
    /* Rank-by-open-reqs puts Stripe (549 reqs) at the top of the outreach list. Demigod places at
       SF startups; a 549-req employer has an in-house recruiting org and will not hire through a
       solo operator, so those rows crowd out the companies worth contacting. Third tool needing
       this same screen (public-roles, role-ledger, now here) — reuse startupScore rather than
       re-deriving "is this a startup" a fourth time. Recorded as an abstention, not a silent drop,
       so the count stays auditable like every other refusal above. */
    if (startupsOnly && startupScore(startupProfiles[startupKey(row.name)]) !== 2) {
      abstentions.notStartupSized++;
      continue;
    }
    if (existingIds.has(row.mapCompanyId)) {
      abstentions.existingCrmId++;
      continue;
    }
    if (existingCompanies.has(company)) {
      abstentions.existingCrmName++;
      continue;
    }
    if (seenIds.has(row.mapCompanyId) || seenCompanies.has(company)) {
      abstentions.duplicateSourceIdentity++;
      continue;
    }
    seenIds.add(row.mapCompanyId);
    seenCompanies.add(company);
    if (eligibleBeforeWindow < offset) {
      eligibleBeforeWindow++;
      continue;
    }
    if (leads.length >= limit) {
      eligibleBeyondLimit++;
      continue;
    }
    const jobsUrl = projectedPartnerUrl(row.jobsUrl);
    const sampleRoleUrl =
      row.sampleRoleUrl ? projectedPartnerUrl(row.sampleRoleUrl) : null;
    const peopleOpsRoleUrl =
      row.openPeopleOpsReqCount > 0
        ? projectedPartnerUrl(row.samplePeopleOpsRoleUrl)
        : null;
    const board = boardFromCompany({ jobsUrl, atsSource: row.boardKey.provider });
    if (
      !jobsUrl ||
      (row.sampleRoleUrl && !sampleRoleUrl) ||
      (row.openPeopleOpsReqCount > 0 &&
        (!peopleOpsRoleTitle || !peopleOpsRoleUrl)) ||
      !validDate(retrievedAt) ||
      board?.provider !== row.boardKey.provider ||
      board?.slug !== row.boardKey.slug
    ) throw new Error(`invalid partner evidence for ${row.mapCompanyId}`);
    leads.push({
      id: row.mapCompanyId,
      type: 'partner',
      company: displayCompany,
      domain,
      openReqCount: row.openReqCount,
      sampleRoleTitle,
      sampleRoleUrl,
      jobsUrl,
      reviewSignals: {
        firstObservedTodayReqCount: row.firstObservedTodayReqCount,
        firstObservedTodayOlderPostedReqCount:
          row.firstObservedTodayOlderPostedReqCount,
        closedTodayReqCount: row.closedTodayReqCount,
        reopenedOpenReqCount: row.reopenedOpenReqCount,
        attributedPostedReqCount: row.attributedPostedReqCount,
        staleAttributedPostedReqCount: row.staleAttributedPostedReqCount,
        evergreenAttributedPostedReqCount: row.evergreenAttributedPostedReqCount,
        maxAttributedPostedDays: row.maxAttributedPostedDays,
        ...(peopleOpsRoleUrl ? {
          peopleOpsRoleEvidence: {
            openRoleCount: row.openPeopleOpsReqCount,
            sampleRoleTitle: peopleOpsRoleTitle,
            sampleRoleUrl: peopleOpsRoleUrl,
          },
        } : {}),
      },
      provenance: {
        boardKey: {
          provider: row.boardKey.provider,
          slug: row.boardKey.slug,
        },
        sourceLicense: row.sourceLicense,
        sourceUrl,
        retrievedAt,
      },
    });
  }
  const abstained = Object.values(abstentions).reduce((sum, count) => sum + count, 0);
  const selectionReceipt = {
    inputRows: artifact.rows.length,
    rowsBeforeExportLimit: artifact.counts.rowsBeforeTop,
    upstreamOmitted: artifact.counts.rowsBeforeTop - artifact.rows.length,
    emissionLimit: limit,
    emissionOffset: offset,
    eligibleBeforeWindow,
    selected: leads.length,
    eligibleBeyondLimit,
    abstentions,
  };
  if (
    selectionReceipt.selected +
      selectionReceipt.eligibleBeforeWindow +
      selectionReceipt.eligibleBeyondLimit +
      abstained !== selectionReceipt.inputRows
  ) throw new Error('invalid partner selection receipt');
  return {
    leads,
    selectionReceipt,
    source: {
      schema: artifact.schema,
      generatedAt: artifact.generatedAt,
      roleLedgerUpdatedAt: artifact.roleLedgerUpdatedAt,
      changeDate: artifact.changeDate,
      changeBasis: artifact.changeBasis,
      ageBasis: artifact.ageBasis,
      attributedPostingBasis: artifact.attributedPostingBasis,
      staleDaysThreshold: artifact.staleDaysThreshold,
      evergreenDaysThreshold: artifact.evergreenDaysThreshold,
    },
  };
}

function main() {
  const { type, limit, offset } = parseArgs();
  let leads = [];
  let source = null;
  let selectionReceipt = null;
  if (type === 'talent') {
    const inbox = loadInbox();
    leads = currentCandidateSubmissions(inbox.items).filter(i =>
      candidateProfileReadiness(i).matchReady
    ).map(i => ({
      id: i.id,
      type: 'talent',
      skills: scrubPII(i.raw?.['skills-stack'] || ''),
      location: scrubPII(i.raw?.location || ''),
      why: scrubPII(i.raw?.['why-this-role'] || ''),
      score: 0
    }));
    leads.forEach(l => l.score = scoreLead(l, type));
    leads.sort((a, b) => b.score - a.score);
  } else {
    let crm;
    try {
      crm = JSON.parse(fs.readFileSync(LEADS, 'utf8'));
    } catch (error) {
      // Gitignored CRM is absent in CI and after a clean clone. Same answer as a missing
      // RecruitAI export: refuse, do not print a stack.
      if (error?.code === 'ENOENT' || error instanceof SyntaxError) throw new Error(EXPORT_REFUSED);
      throw error;
    }
    ({ leads, source, selectionReceipt } =
      selectRecruitaiPartners(crm, { limit, offset }));
  }
  leads = leads.slice(0, limit);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmp = `${OUT}.tmp-${process.pid}`;
  const preview = { at: new Date().toISOString(), type, leads };
  if (source) preview.source = source;
  if (selectionReceipt) preview.selectionReceipt = selectionReceipt;
  fs.writeFileSync(
    tmp,
    JSON.stringify(preview, null, 2),
    { mode: 0o600 },
  );
  fs.renameSync(tmp, OUT);
  fs.chmodSync(OUT, 0o600);
  console.log(`Previewed ${leads.length} evidence-backed ${type} leads at ${OUT}`);
  if (type === 'partners') console.log('RecruitAI source validated; preview only, CRM unchanged.');
  console.log('Top:', leads.slice(0, 2));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    if (error.message === EXPORT_REFUSED) {
      // Refusing is correct; crashing is not. No export yet is an ordinary state after a reboot,
      // since BUSY defaults under /tmp — say so and exit non-zero rather than printing a stack.
      console.error(JSON.stringify({ ok: false, error: EXPORT_REFUSED, hint: 'node demigod-recruitai-export.mjs' }));
      process.exitCode = 1;
    } else if (error.message === USAGE) {
      console.error(USAGE);
      process.exitCode = 2;
    } else {
      throw error;
    }
  }
}
