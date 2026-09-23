#!/usr/bin/env node
/**
 * Demigod SMS Handler (stub for Twilio webhook, pre-services pending).
 * A text with a sender can start a candidate profile. It does not send SMS.
 * A suggestion is the one board role whose title or skill words the text names.
 *
 * Usage: node demigod-sms-handler.mjs --from=+1415... --body="My name is Mina Chen. skills: React"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadInbox, saveInbox, shouldAutoReject, slugId, loadBoard, saveBoard } from './demigod-submissions-lib.mjs';
import { suggestMatches, markCandidateOptin, generateIntroRequest } from './demigod-matching-engine.mjs';
import { appendPilot } from './demigod-board-lib.mjs';

const PENDING_NUMBER = '+1 (415) 555-DEMO';
const WEBHOOK_PENDING = 'https://demigod-trydemigod.loca.lt/sms';
const STOP_SKILLS = new Set(['and', 'the', 'for', 'with', 'from', 'role', 'skills', 'skill']);

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function escapeReg(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startupRoles() {
  return (loadBoard().roles || []).filter((row) => row && (!row.pilot || row.status === 'Active'));
}

/** One board role named by the text. A shared skill, or no skill, is no suggestion. */
export function uniqueNamedRole(text) {
  const blob = String(text || '');
  const hits = startupRoles().filter((role) => {
    const title = String(role.title || '').trim();
    if (title && new RegExp(`\\b${escapeReg(title)}\\b`, 'i').test(blob)) return true;
    const tokens = String(role.skills || role['stack-needs'] || '')
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((token) => token.length >= 3 && !STOP_SKILLS.has(token));
    return tokens.some((token) => new RegExp(`\\b${escapeReg(token)}\\b`, 'i').test(blob));
  });
  if (hits.length !== 1) return null;
  return hits[0];
}

function presentRole(role) {
  if (!role) return [];
  const suggestions = suggestMatches(role.id, { propose: false, limit: 2 });
  const matches = suggestions.ok && suggestions.matches ? suggestions.matches.slice(0, 2) : [];
  if (!matches.length) {
    return [{
      role: role.title,
      roleId: role.id,
      score: null,
      action: `Reply "yes ${role.title}" to opt in`,
    }];
  }
  return matches.map((row) => ({
    role: role.title,
    roleId: role.id,
    score: row.score,
    action: `Reply "yes ${role.title}" to opt in`,
  }));
}

export function handleSms({ from, body, to = PENDING_NUMBER }) {
  const sender = String(from || '').trim();
  const text = String(body || '').trim();
  if (!sender || !text) {
    return {
      ok: false,
      error: !sender ? 'sender_required' : 'body_required',
      suggestions: [],
      sent: false,
      liveSms: false,
      liveMail: false,
    };
  }

  const root = dataRoot();
  fs.mkdirSync(root, { recursive: true });
  const stateFile = path.join(root, 'demigod-sms-state.json');
  let state = {};
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { /* first text */ }
  const prev = state[sender] || {};
  const command = /^(yes\b|match me\b|opt in\b|interested\b)/i.test(text);

  const combinedBody = [prev.body || '', text].filter(Boolean).join(' | ').slice(0, 500);
  const raw = {
    'full-name': command && prev.name
      ? prev.name
      : (text.match(/^[A-Za-z ]+/) || [prev.name || 'SMS User'])[0].trim(),
    'seeker-email': `sms-${sender.replace(/\D/g, '')}@pending.example`,
    'phone': sender,
    'skills-stack': command && prev.skills
      ? prev.skills
      : (combinedBody.replace(/join|profile|hi|hey|match me|text me|update|add/i, '').trim() || prev.skills || 'from SMS conversation'),
    'sf-bay': /sf|bay|san francisco/i.test(combinedBody) ? 'yes' : (prev.sf || 'pending'),
    'experience': combinedBody,
    'links': prev.links || '',
    'why-this-role': /why|startups|sf|because/i.test(text) ? text : prev.why || '',
    source: 'sms',
    smsBody: combinedBody,
    at: new Date().toISOString(),
  };

  const updatedFields = [];
  const lower = text.toLowerCase();
  if (/my name is|name[:=]\s*/i.test(text)) {
    const named = text.match(/my name is\s+([A-Za-z ]{2,30})/i) || text.match(/name[:=]\s*([A-Za-z ]{2,30})/i);
    if (named) {
      raw['full-name'] = named[1].trim();
      updatedFields.push('name');
    }
  }
  if (!command && (/skills?[:=]?\s*[^ ]/i.test(text) || /add.*(skill|figma|react|design|growth)/i.test(text))) {
    const skillMatch = text.match(/skills?[:=]?\s*([^|]+)/i) || text.match(/add\s+(.+?)(?:\s|$)/i);
    if (skillMatch) {
      const skill = skillMatch[1].trim();
      raw['skills-stack'] = [raw['skills-stack'], skill].filter(Boolean).join(' | ');
      updatedFields.push('skills');
    }
  }
  if (/why[:=]?\s*|because |startups?/i.test(text)) {
    raw['why-this-role'] = [raw['why-this-role'], text].filter(Boolean).join(' | ');
    updatedFields.push('why');
  }
  if (/exp|experience|shipped|built|worked/i.test(lower)) {
    raw['experience'] = [raw['experience'], text].filter(Boolean).join(' | ');
    updatedFields.push('exp');
  }
  if (!updatedFields.length && /profile|update|add|more details/i.test(text)) {
    const extra = text.replace(/update|profile|add|more details?/i, '').trim();
    if (extra) {
      raw['why-this-role'] = [raw['why-this-role'], extra].filter(Boolean).join(' | ');
      raw['skills-stack'] = [raw['skills-stack'], extra].filter(Boolean).join(' ');
      updatedFields.push('profile');
    }
  }

  state[sender] = {
    name: raw['full-name'],
    skills: raw['skills-stack'],
    sf: raw['sf-bay'],
    why: raw['why-this-role'],
    body: combinedBody,
    updated: raw.at,
  };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  const formName = 'engineer-join-sms';
  const inbox = loadInbox();
  inbox.items = inbox.items || [];
  const phoneIdx = inbox.items.findIndex((item) => item.phone === sender);
  const isExistingSms = phoneIdx >= 0;

  let candidate;
  if (isExistingSms) {
    candidate = inbox.items[phoneIdx];
    candidate.raw = { ...candidate.raw, ...raw };
    candidate.at = raw.at;
    candidate.status = 'updated';
    inbox.items[phoneIdx] = candidate;
  } else {
    const rejectCheck = shouldAutoReject(raw, formName, inbox);
    if (rejectCheck.reject) {
      console.log('SMS auto-rejected:', rejectCheck.reasons, sender);
      return {
        ok: false,
        error: 'rejected',
        reason: rejectCheck.reasons,
        suggestions: [],
        sent: false,
        liveSms: false,
        liveMail: false,
      };
    }
    candidate = {
      id: slugId('sms-cand'),
      form: formName,
      at: raw.at,
      raw,
      status: 'new',
      source: 'sms',
      phone: sender,
    };
    inbox.items.unshift(candidate);
  }
  saveInbox(inbox);

  const named = uniqueNamedRole(text);
  const presented = presentRole(named);
  let reply;
  let pilotBrief = null;
  const yesMatch = text.match(/^yes\s+(.+)/i);
  if (yesMatch) {
    const optedRole = yesMatch[1].trim();
    pilotBrief = optedRole;
    markCandidateOptin(candidate.id, optedRole);
    const gen = generateIntroRequest(candidate.id || sender, optedRole);
    const stored = loadBoard();
    stored.pilots = Array.isArray(stored.pilots) ? stored.pilots : [];
    if (!stored.pilots.some((row) => row.phone === sender && row.brief === optedRole)) {
      stored.pilots.push({
        id: `plt-sms-${Date.now().toString(36)}`,
        email: `sms-${sender.replace(/\D/g, '')}@pending.trydemigod.com`,
        status: 'opted-in',
        at: new Date().toISOString(),
        brief: optedRole,
        phone: sender,
        phoneProvided: true,
        introsSent: 0,
        source: 'sms',
        preServices: true,
        sent: false,
        liveSms: false,
        history: [{ status: 'opted-in', at: new Date().toISOString() }],
      });
    }
    saveBoard(stored, { reason: 'sms-pilot-append', actor: 'sms-handler' });
    try {
      const board = loadBoard();
      const { board: nextBoard } = appendPilot(board, {
        brief: optedRole,
        intros: 0,
        outcome: 'SMS opt-in via text conversation',
        stageType: 'from SMS',
        withReceipt: false,
      });
      saveBoard(nextBoard, {
        reason: 'sms-optin-pilot',
        actor: 'sms-handler',
        allowRealRoles: true,
      });
    } catch {
      // A featured card stays behind the real-role gate. The opt-in row is already saved.
    }
    const tmpl = (gen && (gen.template || (gen.ok && 'Intro template generated.'))) || '';
    reply = `Opted in for ${optedRole}. ${tmpl} Humans will review before any intro.`;
  } else if (/match me|opt in|interested/i.test(text)) {
    if (named) markCandidateOptin(candidate.id, named.id);
    reply = named
      ? `Noted interest for ${named.title}. Humans will review before any intro.`
      : 'Humans will propose soon. Reply with a role title or more skills.';
  } else {
    const note = updatedFields.length ? ` (${updatedFields.join('+')})` : '';
    const roleNote = named ? ` Suggested role: ${named.title}.` : '';
    reply = `Thanks. Profile updated${note} from the text (skills: ${String(raw['skills-stack']).slice(0, 60)}).${roleNote} Humans reviewing. Reply "yes <role>" or send more skills.`;
  }

  console.log(`SMS conversation updated (pending Twilio): ${sender} -> candidate ${candidate.id}. suggested=${presented[0]?.roleId || 'none'}`);
  return {
    ok: true,
    candidate,
    suggestions: presented,
    replyForTwilio: reply,
    to,
    webhookPending: WEBHOOK_PENDING,
    pilotBrief,
    sent: false,
    liveSms: false,
    liveMail: false,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const fromArg = args.find((arg) => arg.startsWith('--from='));
  const bodyArg = args.find((arg) => arg.startsWith('--body='));
  const from = fromArg ? fromArg.slice('--from='.length).trim() : '';
  const body = bodyArg ? bodyArg.slice('--body='.length).trim() : '';
  if (!from || !body) {
    console.error(JSON.stringify({
      ok: false,
      error: !from ? 'sender_required' : 'body_required',
      sent: false,
      liveSms: false,
      liveMail: false,
    }));
    process.exit(1);
  }
  const result = handleSms({ from, body });
  const suggested = (result.suggestions || [])[0] || null;
  const line = {
    ok: !!result.ok,
    error: result.error || null,
    phone: from,
    suggestedRole: suggested ? suggested.role : null,
    suggestedRoleId: suggested ? suggested.roleId : null,
    pilotBrief: result.pilotBrief || null,
    sent: false,
    liveSms: false,
    liveMail: false,
  };
  if (result.ok) console.log(JSON.stringify(line));
  else {
    console.error(JSON.stringify(line));
    process.exit(1);
  }
}

export default { handleSms, uniqueNamedRole, PENDING_NUMBER };
