#!/usr/bin/env node
/**
 * Demigod SMS Handler (stub for Twilio webhook, pre-services pending).
 * Users text number to start conversation/onboard (candidate profile from SMS body).
 * Feeds into submissions + matching engine for mutual interest/opt-in.
 * Honest: All "pending" until Twilio live. No real sends.
 *
 * See demigod-future-services.mjs for central status + stubs (Twilio, Stripe, Azure/MS Startups).
 * Build now: modular so real Twilio client can drop in later. Keep all pending language.
 *
 * Usage (when webhook live): POST from Twilio -> node demigod-sms-handler.mjs --from=+1415... --body="John PM skills React SF"
 * Or as module: import {handleSms} from './demigod-sms-handler.mjs'
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadInbox, saveInbox, anonymizeCandidate, shouldAutoReject, slugId, inferStageType, loadBoard, saveBoard } from './demigod-submissions-lib.mjs';
import { suggestMatches, markCandidateOptin, generateIntroRequest } from './demigod-matching-engine.mjs';
import { appendPilot } from './demigod-board-lib.mjs';  // for auto pilot stub on SMS yes
import { sendSmsStub, getServiceStatus, isServiceEnabled } from './demigod-future-services.mjs';  // future Twilio adapter (currently pending stub)

const PENDING_NUMBER = '+1 (415) 555-DEMO'; // placeholder, swap on Twilio setup
const WEBHOOK_PENDING = 'https://demigod-trydemigod.loca.lt/sms'; // stub

// persist defaults true (production webhook path unchanged). The CLI smoke test passes false so that
// `node demigod-sms-handler.mjs` does not write the REAL submissions SoR: today 83 of the inbox's 115
// rows are sms test-run residue. Contained (all triaged, new=0) but it grows the prod file on every
// dogfood run — the sim-launders-into-SoR pattern. persist=false still exercises all parsing/matching.
export function handleSms({ from, body, to = PENDING_NUMBER, persist = true }) {
  // Simple state for multi-turn conversation (pre-services stub)
  const stateFile = path.join(ROOT, 'demigod-sms-state.json');
  let state = {};
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
  const prev = state[from] || {};

  const combinedBody = [prev.body || '', body].filter(Boolean).join(' | ').slice(0,500);
  const raw = {
    // A first message is usually a greeting or a request, not a name. The old `body.match(/^[A-Za-z ]+/)`
    // captured leading words indiscriminately, so "Hey looking for design roles" became full-name="Hey
    // looking for design roles" and "Hi, I'm a PM" became "Hi". Since handleSms calls saveInbox() below,
    // that fake-looking name lands in the REAL submissions SoR the moment Twilio is wired to this stub --
    // the sim-launders-into-SoR pattern that caused the corruption era. Names come ONLY from the explicit
    // "my name is X" / "name: X" path (~line 55, which overrides this); default to an honest placeholder.
    // A truthful "SMS User" until they state their name beats a greeting masquerading as one.
    'full-name': prev.name || 'SMS User',
    'seeker-email': `sms-${from.replace(/\D/g,'')}@pending.example`,
    'phone': from,
    'skills-stack': combinedBody.replace(/join|profile|hi|hey|match me|text me|update|add/i, '').trim() || prev.skills || 'from SMS conversation',
    'sf-bay': /sf|bay|san francisco/i.test(combinedBody) ? 'yes' : (prev.sf || 'pending'),
    'experience': combinedBody,
    'links': prev.links || '',
    'why-this-role': /why|startups|sf|because/i.test(body) ? body : prev.why || '',
    source: 'sms',
    smsBody: combinedBody,
    at: new Date().toISOString()
  };

  // Enhanced multi-turn for richer "text to start a conversation" profiles
  // Supports: "profile ...", "update skills: ...", "add Figma", "my name is X", "skills: React", "why: first PM", "exp: shipped ..."
  let updatedFields = [];
  const b = body.toLowerCase();
  if (/my name is|name[:=]\s*/i.test(body)) {
    const nm = body.match(/my name is\s+([A-Za-z ]{2,30})/i) || body.match(/name[:=]\s*([A-Za-z ]{2,30})/i);
    if (nm) { raw['full-name'] = nm[1].trim(); updatedFields.push('name'); }
  }
  if (/skills?[:=]?\s*[^ ]/i.test(body) || /add.*(skill|figma|react|design|growth)/i.test(body)) {
    const skMatch = body.match(/skills?[:=]?\s*([^|]+)/i) || body.match(/add\s+(.+?)(?:\s|$)/i);
    if (skMatch) {
      const sk = skMatch[1].trim();
      raw['skills-stack'] = [raw['skills-stack'], sk].filter(Boolean).join(' | ');
      updatedFields.push('skills');
    }
  }
  if (/why[:=]?\s*|because |startups?/i.test(body)) {
    raw['why-this-role'] = [raw['why-this-role'], body].filter(Boolean).join(' | ');
    updatedFields.push('why');
  }
  if (/exp|experience|shipped|built|worked/i.test(b)) {
    raw['experience'] = [raw['experience'], body].filter(Boolean).join(' | ');
    updatedFields.push('exp');
  }
  if (!updatedFields.length && /profile|update|add|more details/i.test(body)) {
    const extra = body.replace(/update|profile|add|more details?/i, '').trim();
    if (extra) {
      raw['why-this-role'] = [raw['why-this-role'], extra].filter(Boolean).join(' | ');
      raw['skills-stack'] = [raw['skills-stack'], extra].filter(Boolean).join(' ');
      updatedFields.push('profile');
    }
  }

  state[from] = { name: raw['full-name'], skills: raw['skills-stack'], sf: raw['sf-bay'], why: raw['why-this-role'], body: combinedBody, updated: raw.at };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  const formName = 'engineer-join-sms';
  let inbox = loadInbox();
  inbox.items = inbox.items || [];

  // SMS-friendly: dedupe/update by phone (not email), allow re-convo updates without dup reject
  const phoneIdx = inbox.items.findIndex(i => i.phone === from);
  const isExistingSms = phoneIdx >= 0;

  let candidate;
  if (isExistingSms) {
    // update existing convo entry (multi-turn ok)
    candidate = inbox.items[phoneIdx];
    candidate.raw = { ...candidate.raw, ...raw };
    candidate.at = raw.at;
    candidate.status = 'updated';
    inbox.items[phoneIdx] = candidate;
  } else {
    const rejectCheck = shouldAutoReject(raw, formName, inbox);
    if (rejectCheck.reject) {
      console.log('SMS auto-rejected:', rejectCheck.reasons, from);
      return { ok: false, reason: rejectCheck.reasons };
    }
    candidate = {
      id: slugId('sms-cand'),
      form: formName,
      at: raw.at,
      raw,
      status: 'new',
      source: 'sms',
      phone: from
    };
    inbox.items.unshift(candidate);
  }
  if (persist) saveInbox(inbox); // false from the CLI smoke test so it never writes the real leads SoR

  // Role suggestion (no auto opt-in on first message; explicit only)
  let bestRoleTitle = 'Product Manager';
  const skills = (raw['skills-stack'] || '').toLowerCase();
  if (skills.includes('design') || skills.includes('figma')) bestRoleTitle = 'Founding Designer';
  else if (skills.includes('growth') || skills.includes('plg')) bestRoleTitle = 'Head of Growth';
  else if (skills.includes('pm') || skills.includes('product')) bestRoleTitle = 'Product Manager';
  const suggestions = suggestMatches(bestRoleTitle);
  let presented = [];
  if (suggestions.matches && suggestions.matches.length) {
    presented = suggestions.matches.slice(0,2).map(m => ({
      role: bestRoleTitle,
      score: m.score,
      action: 'Reply "yes ' + bestRoleTitle + '" to opt in'
    }));
  }

  // Handle conversation commands for "start a conversation" + explicit opt-in
  let reply;
  const yesMatch = body.match(/yes\s+(.+)/i);
  if (yesMatch) {
    const optedRole = yesMatch[1].trim();
    markCandidateOptin(candidate.id, optedRole);
    const gen = generateIntroRequest(candidate.id || from, optedRole);
    // Integrate: auto log pilot stub for SMS yes (builds proof + GTM signal)
    const pilotRes = spawnSync('node', ['demigod-pilot-logger.mjs', `--brief=${optedRole}`, '--intros=1', '--source=sms', `--sms-cand=${from}`, `--sms-role=${optedRole}`, '--no-publish', '--no-receipt', '--no-signal'], {encoding: 'utf8'});
    // append to board as pilot stub (pre-services)
    let board = loadBoard();
    const { board: nextBoard } = appendPilot(board, {
      brief: optedRole,
      intros: 1,
      outcome: 'SMS opt-in via text conversation',
      stageType: 'from SMS',
      source: 'sms'
    });
    saveBoard(nextBoard, { reason: 'sms-optin-pilot', actor: 'sms-handler' });
    // Also append to .pilots[] (for tracker/SLA/pilot tools) using phone as key
    let b2 = loadBoard();
    b2.pilots = Array.isArray(b2.pilots) ? b2.pilots : [];
    const pemail = `sms-${from.replace(/\D/g,'')}@pending.trydemigod.com`;
    if (!b2.pilots.find(p => p.email === pemail)) {
      b2.pilots.push({
        id: 'plt-sms-' + Date.now().toString(36),
        email: pemail,
        status: 'dm-sent',
        at: new Date().toISOString(),
        slaDue: new Date(Date.now() + 48*3600*1000).toISOString(),
        preServices: true,
        pendingIntegrations: ['twilio', 'stripe'],
        brief: optedRole,
        phone: from,
        phoneProvided: true,
        introsSent: 1,
        source: 'sms',
        history: [{ status: 'dm-sent', at: new Date().toISOString() }]
      });
      saveBoard(b2, { reason: 'sms-pilot-append', actor: 'sms-handler' });
    }
    const tmpl = (gen && (gen.template || gen.ok && 'Intro template generated.')) || '';
    reply = `Opted in for ${optedRole}! ${tmpl} Pilot logged. Humans will review for intro. Reply more details anytime.`;
  } else if (/match me|opt in|interested/i.test(body)) {
    // explicit: mark top suggestion now
    if (presented.length) markCandidateOptin(candidate.id, bestRoleTitle);
    reply = `Great! Opted in for top matches. ${presented.length ? JSON.stringify(presented) : 'Humans will propose soon.'} Reply "yes <role>" to confirm or skills update.`;
  } else {
    const note = updatedFields.length ? ` (${updatedFields.join('+')})` : '';
    reply = `Thanks! Profile updated${note} from conversation (skills: ${raw['skills-stack'].slice(0,60)}). Humans reviewing. Reply "match me" or "yes <role>" or send more details (e.g. "update skills: Figma, why: first PM at seed").`;
  }

  console.log(`SMS conversation updated (pending Twilio): ${from} -> candidate ${candidate.id}. Presented:`, presented);

  return { ok: true, candidate, suggestions: presented, replyForTwilio: reply };
}

// CLI for testing: node demigod-sms-handler.mjs --from=+14155551234 --body="Alex engineer React SF Bay"
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const from = (args.find(a => a.startsWith('--from=')) || '').split('=')[1] || '+14155551234';
  const body = (args.find(a => a.startsWith('--body=')) || '').split('=')[1] || 'Hi, John PM skills product GTM SF';
  const result = handleSms({ from, body, persist: args.includes('--commit') });
  console.dir(result, { depth: 2 });
}

export default { handleSms, PENDING_NUMBER };
