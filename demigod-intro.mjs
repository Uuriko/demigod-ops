#!/usr/bin/env node
/**
 * dg-intro — mutual-yes gate + intro packet log (no board mint).
 * Consent is per-candidate (founder yes and candidate yes must share candId).
 *
 * Usage:
 *   node demigod-intro.mjs status <pilotId>
 *   node demigod-intro.mjs yes <pilotId> --side founder|candidate --cand <id>
 *   node demigod-intro.mjs packet <pilotId>
 *   node demigod-intro.mjs send <pilotId>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUSY, ensureBusy, atomicWrite, opt, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-PILOTS.json');
const STORE_LOCK = path.join(ROOT, 'DEMIGOD-PILOTS.json.lock');
const args = process.argv.slice(2);
const cmd = args[0] || 'help';

function load() {
  return JSON.parse(fs.readFileSync(STORE, 'utf8'));
}
function save(data) {
  data.at = new Date().toISOString();
  atomicWrite(STORE, JSON.stringify(data, null, 2) + '\n');
}
/** Exclusive load → mutate → save (prevents lost updates). */
function updatePilot(mutator) {
  return withFileLock(STORE_LOCK, () => {
    const data = load();
    const out = mutator(data);
    data.at = new Date().toISOString();
    atomicWrite(STORE, JSON.stringify(data, null, 2) + '\n');
    return out;
  });
}
function findPilot(data, pid) {
  const exact = data.pilots.find((p) => p.id === pid);
  if (exact) return exact;
  const hits = data.pilots.filter((p) => p.id.startsWith(pid));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    console.error(JSON.stringify({ ok: false, error: 'ambiguous_id', matches: hits.map((h) => h.id) }));
    process.exit(1);
  }
  return null;
}
function resolveCand(p, candId) {
  if (!candId) return null;
  const exact = (p.shortlist || []).find((c) => c.id === candId);
  if (exact) return exact;
  const hits = (p.shortlist || []).filter((c) => c.id.startsWith(candId));
  return hits.length === 1 ? hits[0] : null;
}

if (cmd === 'status') {
  const p = findPilot(load(), args[1]);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  const m = p.mutual || {};
  const ready =
    Boolean(m.candId) &&
    m.founderYesFor === m.candId &&
    m.candidateYesFor === m.candId;
  console.log(
    JSON.stringify(
      {
        pilotId: p.id,
        status: p.status,
        candId: m.candId || null,
        founderYesFor: m.founderYesFor || null,
        candidateYesFor: m.candidateYesFor || null,
        ready,
        introAt: p.introAt || null,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (cmd === 'yes') {
  const pid = args[1];
  const side = opt(args, '--side', '');
  const candId = opt(args, '--cand', '');
  if (!['founder', 'candidate'].includes(side) || !candId) {
    console.error('usage: yes <pilotId> --side founder|candidate --cand <exact-or-unique-prefix-id>');
    process.exit(2);
  }
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  const cand = resolveCand(p, candId);
  if (!cand) {
    console.error(JSON.stringify({ ok: false, error: 'cand_not_on_shortlist', candId }));
    process.exit(1);
  }
  p.mutual = p.mutual || {};
  p.mutual.candId = cand.id;
  if (side === 'founder') {
    p.mutual.founderYesFor = cand.id;
    p.mutual.founderYesAt = new Date().toISOString();
  } else {
    p.mutual.candidateYesFor = cand.id;
    p.mutual.candidateYesAt = new Date().toISOString();
  }
  save(data);
  console.log(JSON.stringify({ ok: true, mutual: p.mutual }, null, 2));
  process.exit(0);
}

if (cmd === 'packet' || cmd === 'send') {
  const pid = args[1];
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  const m = p.mutual || {};
  const cand = (p.shortlist || []).find((c) => c.id === m.candId);
  const ready =
    Boolean(m.candId) &&
    m.founderYesFor === m.candId &&
    m.candidateYesFor === m.candId &&
    Boolean(p.outcome90d) &&
    cand?.consent === true &&
    (p.status === 'shortlist' || p.status === 'intro');
  if (cmd === 'send' && !ready) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'need_shortlist_mutual_yes_consent_outcome',
        mutual: m,
        status: p.status,
        hasOutcome: Boolean(p.outcome90d),
        candConsent: cand?.consent ?? false,
      }),
    );
    process.exit(1);
  }
  if (!cand && cmd === 'send') {
    console.error(JSON.stringify({ ok: false, error: 'cand_missing' }));
    process.exit(1);
  }
  const md = [
    `# Intro packet — ${p.company} × ${cand?.name || 'candidate'}`,
    ``,
    `**Pilot:** ${p.id}`,
    `**Role:** ${p.role}`,
    `**90-day outcome:** ${p.outcome90d || '(not set)'}`,
    ``,
    `## Candidate`,
    `- **Name:** ${cand?.name || '?'}`,
    `- **Why (match thesis):** ${cand?.why || '?'}`,
    `- **Consent logged:** ${cand?.consent ? 'yes' : 'no'}`,
    `- **Links:** ${cand?.links || '—'}`,
    ``,
    `## Mutual yes (same candidate)`,
    `- Founder yes for: ${m.founderYesFor || 'pending'} @ ${m.founderYesAt || '—'}`,
    `- Candidate yes for: ${m.candidateYesFor || 'pending'} @ ${m.candidateYesAt || '—'}`,
    ``,
    `## Next`,
    `- Reply-all intro from hello@trydemigod.com (human).`,
    `- No turnaround clocks. Payments pending — fee 10% on hire only.`,
    ``,
    `_Generated by demigod-intro.mjs_`,
  ].join('\n');

  ensureBusy();
  const out = path.join(BUSY, `intro-packet-${p.id}.md`);
  atomicWrite(out, md + '\n');
  fs.mkdirSync(path.join(ROOT, 'demigod-ops', 'intros'), { recursive: true });
  atomicWrite(path.join(ROOT, 'demigod-ops', 'intros', `${p.id}.md`), md + '\n');

  if (cmd === 'send') {
    p.status = 'intro';
    p.introAt = new Date().toISOString();
    p.history = p.history || [];
    p.history.push({ at: p.introAt, status: 'intro', by: 'dg-intro' });
    save(data);
  }

  console.log(JSON.stringify({ ok: true, packet: out, status: p.status, mutual: m, ready }, null, 2));
  process.exit(0);
}

console.error('usage: status|yes|packet|send <pilotId> …');
process.exit(2);
