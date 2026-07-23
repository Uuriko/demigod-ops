#!/usr/bin/env node
/**
 * Demigod Events Bot app — static + lifecycle + offers + chat
 *
 *   node demigod-events-app.mjs              # http://127.0.0.1:3460
 *
 *   GET  /events · /demigod-events.html
 *   GET  /api/events · /api/events.json
 *   GET  /api/events-bot/health
 *   POST /api/events-bot/chat     { messages: [{role,content}] }
 *   GET  /api/events-bot/lifecycle
 *   GET  /api/events-bot/calendar ?year=&month=   multi-event per day OK
 *   POST /api/events-bot/calendar { date, title, time?, venue?, stage?, seats? } // ops
 *   POST /api/events-bot/offer    { kind: sponsor|venue|volunteer, ... }
 *   GET  /api/events-bot/offers   public-safe counts + recent (no private notes)
 *   POST /api/events-bot/event    { title?, stage?, audience?, outcome?, seats?, dateWindows?, notes? }
 *   POST /api/events-bot/schedule { eventId, start } // strict future timezone-aware start
 *   POST /api/events-bot/idea     { title?, outcome?, seed?, generate? }
 *   POST /api/events-bot/event-submission · /read · /manage · /withdraw // reviewed submissions + token-scoped management
 *   POST /api/events-bot/startup-submission                    // public unlisted-startup suggestion
 *   POST /api/events-bot/chatroom/join · /send · /messages     // simple ephemeral public chat
 *   POST /api/events-bot/feedback { text, name?, email?, topic? }
 *   POST /api/events-bot/money    { name, email, amountNote, org?, cents? }
 *   POST /api/events-bot/agent/tick { goal?, maxSteps? }  // autonomous Codex-class loop
 *   GET  /api/events-bot/agent/status
 *   GET  /api/events-bot/outbox
 *   GET  /api/events-bot/invites          // ops: Partiful/Luma drain + absorb pasted URLs
 *   POST /api/events-bot/invite-url       // ops: record real invite URL (no invent / no RSVPs)
 *   POST /api/events-bot/open-rsvps       // ops: open native Demigod RSVP page for active event
 *   GET  /api/events-bot/public-event?id= // public: event card (no guest emails)
 *   POST /api/events-bot/rsvp             // public: name+email RSVP (real only)
 *   GET  /api/events-bot/rsvps?id=        // ops: host RSVP list
 */
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eventsBotChat } from './demigod-events-bot-chat.mjs';
import { webhookClientIp } from './demigod-webhook-rate-limit.mjs';
import { recordFormEvent } from './demigod-form-analytics.mjs';
import {
  eventsBotAgentTick,
  eventsBotIdentity,
  runTool,
  withEventsStoreLock,
  loadStore as agentLoadStore,
  saveStore as agentSaveStore,
  isSfLocation,
  mentionsNonSf,
  offerIsSf,
  isRealOutreachEmail,
  isJunkCalendarTitle,
  isPublicCalendarVisible,
  canAdvanceStage,
  matchOffersToEvent,
  stampOfferMatches,
  publicEventView,
  submitNativeRsvp,
  openNativeRsvps,
  recordInviteUrl,
  hasFutureDateTime,
  normalizeStage,
  stageChecklist,
  eventAudienceBrief,
  STAGES,
} from './demigod-events-bot-agent.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const PORT = Number(process.env.PORT || process.env.DEMIGOD_EVENTS_PORT || 3460);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_OFFERS = 500;
const AUTONOMY = String(process.env.DEMIGOD_EVENTS_AUTONOMY || 'draft').toLowerCase();
const OPS_SECRET = process.env.DEMIGOD_EVENTS_OPS_SECRET || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  /* Bypass-Tunnel-Reminder: localtunnel browser interstitial (prod HTTPS via loca.lt) */
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Bypass-Tunnel-Reminder, X-Requested-With, X-Dg-Events-Ops, X-Ops-Secret',
  );
  res.setHeader('X-Demigod-Events', 'v2');
}

function json(res, code, body) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > 48_000) {
        reject(new Error('body too large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('JSON body must be an object');
        resolve(body);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function defaultStore() {
  return {
    version: 3,
    updated: new Date().toISOString().slice(0, 10),
    honesty: { autoSend: false, sms: 'pending', stripe: 'pending' },
    lifecycle: [],
    activeEvent: { id: null, title: '', stage: 'ideate', outcome: '', seats: null, dateWindows: [], notes: '', updatedAt: null },
    /* calendarEvents: many events may share the same date (YYYY-MM-DD) */
    calendarEvents: [],
    offers: { sponsor: [], venue: [], volunteer: [] },
  };
}

function loadStore() {
  const j = agentLoadStore();
  j.offers = j.offers || { sponsor: [], venue: [], volunteer: [] };
  for (const k of ['sponsor', 'venue', 'volunteer']) {
    if (!Array.isArray(j.offers[k])) j.offers[k] = [];
  }
  j.activeEvent = j.activeEvent || defaultStore().activeEvent;
  j.lifecycle = j.lifecycle || [];
  j.ideas = j.ideas || [];
  j.feedback = j.feedback || [];
  j.outreach = j.outreach || [];
  j.money = j.money || [];
  j.platforms = j.platforms || { luma: [], partiful: [] };
  j.calendarEvents = Array.isArray(j.calendarEvents) ? j.calendarEvents : [];
  return j;
}

function saveStore(s) {
  agentSaveStore(s);
}

/** Serialize load→mutate→save across concurrent async handlers (no lost offers). */
let storeChain = Promise.resolve();
function withStore(fn) {
  const run = storeChain.then(() => withEventsStoreLock(() => {
    const s = loadStore();
    return fn(s);
  }));
  storeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const clientIp = webhookClientIp;

/** Simple per-IP+bucket rate limit for public POSTs (Ponytail — no deps). */
const rateHits = new Map();
// ponytail: ephemeral single-process chat; move to shared storage only when multi-instance traffic exists.
const chatroomSessions = new Map();
const chatroomMessages = [];
const RESERVED_CHAT_NAMES = /^(?:demigod|admin(?:istrator)?|mod(?:erator)?|support|staff|events? ?bot|potter|vesper)$/i;
function rateLimit(req, { max = 40, windowMs = 60_000, bucket = 'default' } = {}) {
  const ip = clientIp(req);
  const key = bucket + '|' + ip;
  const now = Date.now();
  let e = rateHits.get(key);
  if (!e || now - e.t > windowMs) {
    e = { n: 0, t: now };
    rateHits.set(key, e);
  }
  e.n += 1;
  if (rateHits.size > 5000) {
    for (const [k, v] of rateHits) {
      if (now - v.t > windowMs) rateHits.delete(k);
    }
  }
  return e.n <= max;
}

function rateLimited(res) {
  return json(res, 429, { ok: false, error: 'rate_limited', message: 'Slow down — try again in a minute.' });
}

function cleanChatName(value) {
  return clamp(value, 24).replace(/[^\p{L}\p{N} ._'-]/gu, '').replace(/\s+/g, ' ');
}

function cleanChatMessage(value) {
  return clamp(value, 500).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ');
}

function clamp(s, n) {
  return String(s == null ? '' : s).trim().slice(0, n);
}

function seatsOrNull(value) {
  if (value == null || value === '') return null;
  const seats = Number(value);
  return Number.isInteger(seats) && seats > 0 ? seats : NaN;
}

const SUBMISSION_DESTINATIONS = new Set(['demigod', 'luma', 'partiful', 'demigod+luma', 'demigod+partiful']);
const EVENT_FORMATS = new Set(['in-person', 'online', 'hybrid']);
const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clamp(value, 160));
const tokenHash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const tokenMatches = (record, value) => {
  const actual = Buffer.from(tokenHash(value));
  const expected = Buffer.from(String(record?.manageTokenHash || ''));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
const safeSubmissionUrl = (value) => {
  try {
    const url = new URL(clamp(value, 500));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
};
const externalEventPlatform = (value) => {
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    if (host === 'partiful.com') return 'partiful';
    if (host === 'lu.ma' || host === 'luma.com') return 'luma';
  } catch {}
  return '';
};
const activeSubmission = (record) => !['rejected', 'withdrawn'].includes(record?.status);
const sameEventSubmission = (a, b) => activeSubmission(a) && a.organizerEmail === b.organizerEmail && a.title === b.title && (a.startsAt || '') === (b.startsAt || '');

function publicEventSubmission(record) {
  if (!record) return null;
  const { manageTokenHash, organizerEmail, ...safe } = record;
  return { ...safe, organizerEmail };
}

function publicCommunityEvent(record) {
  const { id, title, startsAt, format, venue, audience, details, destination, externalUrl, seats, updatedAt } = record || {};
  // Fail-closed: never emit non-https external links even for legacy approved rows.
  const safeExternal = externalUrl ? safeSubmissionUrl(externalUrl) || null : null;
  return { id, title, startsAt, format, venue, audience, details, destination, externalUrl: safeExternal, seats, updatedAt };
}

function publicCommunityStartup(record) {
  const { id, name, website, neighborhood, description, hiring, reviewedAt } = record || {};
  // Fail-closed: strip non-https websites from public feed (cont37 blocks new approves; this covers legacy).
  const safeWebsite = website ? safeSubmissionUrl(website) || null : null;
  return { id, name, website: safeWebsite, neighborhood, description, hiring, reviewedAt };
}

function publicStartupSubmission(record) {
  if (!record) return null;
  const { manageTokenHash, ...safe } = record;
  return safe;
}

/** Public map feed: new approvals use `approved`; legacy rows used overclaiming `verified`. */
const isPublicStartupSubmission = (row) => row?.status === 'approved' || row?.status === 'verified';

function publicCommunityEvents(store, now = Date.now()) {
  return (store.eventSubmissions || [])
    .filter((row) => row.status === 'approved' && row.destination?.includes('demigod') && Number.isFinite(Date.parse(row.startsAt)) && Date.parse(row.startsAt) >= now - 6 * 60 * 60 * 1000)
    .sort((a, b) => (Number.isFinite(Date.parse(a.startsAt)) ? Date.parse(a.startsAt) : Infinity) - (Number.isFinite(Date.parse(b.startsAt)) ? Date.parse(b.startsAt) : Infinity) || String(a.title).localeCompare(String(b.title)))
    .map(publicCommunityEvent);
}

function validateEventSubmission(body, partial = false) {
  const required = ['title', 'organizerName', 'organizerEmail', 'startsAt', 'format', 'audience', 'details', 'destination'];
  if (!partial) for (const field of required) if (!clamp(body[field], 200)) return { error: `${field} required` };
  if (body.organizerEmail != null && !emailOk(body.organizerEmail)) return { error: 'valid organizerEmail required' };
  if (body.destination != null && !SUBMISSION_DESTINATIONS.has(body.destination)) return { error: 'invalid destination' };
  if (body.format != null && !EVENT_FORMATS.has(body.format)) return { error: 'invalid format' };
  if (body.startsAt != null && body.startsAt !== '' && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(body.startsAt) || !Number.isFinite(Date.parse(body.startsAt)))) return { error: 'startsAt must be a valid timezone-aware ISO date-time' };
  if (['in-person', 'hybrid'].includes(body.format) && !clamp(body.venue, 180)) return { error: 'venue required for in-person or hybrid events' };
  if (body.venue && !isSfLocation(body.venue)) return { error: 'SF_ONLY' };
  if (body.seats != null && body.seats !== '' && Number.isNaN(seatsOrNull(body.seats))) return { error: 'seats must be a positive integer' };
  if (body.externalUrl) {
    const platform = externalEventPlatform(safeSubmissionUrl(body.externalUrl));
    if (!platform) return { error: 'externalUrl must be a Luma or Partiful https link' };
    if (body.destination && !body.destination.includes(platform)) return { error: 'externalUrl must match destination' };
  }
  if (body.destination && body.destination !== 'demigod' && !body.externalUrl) return { error: 'externalUrl required for Luma or Partiful destinations' };
  return { value: {
    ...(body.title != null && { title: clamp(body.title, 120) }),
    ...(body.organizerName != null && { organizerName: clamp(body.organizerName, 120) }),
    ...(body.organizerEmail != null && { organizerEmail: clamp(body.organizerEmail, 160).toLowerCase() }),
    ...(body.startsAt != null && { startsAt: clamp(body.startsAt, 80) }),
    ...(body.format != null && { format: body.format }),
    ...(body.venue != null && { venue: clamp(body.venue, 180) }),
    ...(body.audience != null && { audience: clamp(body.audience, 240) }),
    ...(body.details != null && { details: clamp(body.details, 2000) }),
    ...(body.destination != null && { destination: body.destination }),
    ...(body.seats != null && { seats: seatsOrNull(body.seats) }),
    ...(body.externalUrl != null && { externalUrl: safeSubmissionUrl(body.externalUrl) }),
  } };
}

function publicOfferCounts(store) {
  return matchOffersToEvent(store).offerCounts;
}

function publicData() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-events-data.json'), 'utf8'));
  raw.matchesPublic = [];
  raw.note = 'Public payload only. Internal MATCHES.json is not exposed.';
  // Never re-export the automation playbook from the static public JSON (cont53).
  delete raw.lifecycle;
  const store = loadStore();
  const view = publicEventView(store, store.activeEvent?.id);
  // Presence ≠ public details: hide title pre-rsvp but still report hasActive when id exists.
  const hasActive = !!(store.activeEvent?.id);
  raw.activeEvent = view.ok
    ? { stage: view.event.stage, title: view.event.title, hasActive }
    : { stage: hasActive ? (store.activeEvent.stage || 'ideate') : 'ideate', title: '', hasActive };
  raw.offerCounts = publicOfferCounts(store);
  try {
    const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-BOARD.json'), 'utf8'));
    raw.boardSignal = {
      realRoles: board.signal?.realRoles ?? 0,
      realReceipts: board.signal?.realReceipts ?? 0,
    };
  } catch {
    /* keep */
  }
  return raw;
}

function publicOffers(store) {
  // Counts only — no names/org/offer text (Codex privacy finding)
  return {
    ok: true,
    geo: 'San Francisco only',
    counts: publicOfferCounts(store),
  };
}

/** YYYY-MM-DD only (SF calendar dates; multi-event same day allowed). */
function dateOk(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return false;
  const [y, m, day] = String(d).split('-').map(Number);
  if (m < 1 || m > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day;
}

function publicCalendarEvent(ev) {
  const detailsPublic = STAGES.indexOf(normalizeStage(ev.stage)) >= STAGES.indexOf('rsvp');
  return {
    id: ev.id,
    date: ev.date,
    title: detailsPublic ? ev.title || 'Untitled' : 'SF community night',
    stage: ev.stage || 'ideate',
    time: detailsPublic ? ev.time || '' : '',
    venue: detailsPublic ? ev.venue || '' : '',
    seats: detailsPublic ? ev.seats ?? null : null,
    city: 'San Francisco',
    format: detailsPublic ? ev.format || '' : '',
    outcome: detailsPublic ? ev.outcome || '' : '',
  };
}

function publicEventAudience(store, eventId) {
  const event = store.activeEvent?.id === eventId
    ? store.activeEvent
    : (store.events || []).find((row) => row?.id === eventId);
  const cohorts = (event?.guestMix?.cohorts || [])
    .map((cohort) => ({ label: clamp(cohort?.label, 80), fit: clamp(cohort?.fit, 160) }))
    .filter((cohort) => cohort.label)
    .slice(0, 4);
  const note = 'Intended audience — not an attendee list or RSVP count.';
  if (cohorts.length) {
    return {
      summary: clamp(cohorts.map((cohort) => cohort.label + (cohort.fit ? ' — ' + cohort.fit : '')).join(' · '), 600),
      cohorts,
      note,
    };
  }
  // Fall back to the locked audience string when guestMix was never recorded.
  const summary = clamp(event?.audience, 600);
  return summary ? { summary, cohorts: [], note } : null;
}

function publicCalendar(store, { year, month } = {}) {
  let list = (store.calendarEvents || []).filter((e) => isPublicCalendarVisible(e)).map(publicCalendarEvent);
  // Include activeEvent once if it has a concrete date in dateWindows
  const ae = store.activeEvent;
  if (ae && ae.id && Array.isArray(ae.dateWindows)) {
    for (const w of ae.dateWindows) {
      const d = String(w || '').slice(0, 10);
      if (!dateOk(d)) continue;
      if (list.some((e) => e.id === ae.id && e.date === d)) continue;
      const event = {
        id: ae.id,
        date: d,
        title: ae.title || 'Active night',
        stage: ae.stage || 'ideate',
        seats: ae.seats,
        outcome: ae.outcome,
      };
      if (isPublicCalendarVisible(event)) list.push(publicCalendarEvent(event));
    }
  }
  if (year && month) {
    const pref = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-`;
    list = list.filter((e) => String(e.date).startsWith(pref));
  }
  list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time || '').localeCompare(b.time || '') || (a.title || '').localeCompare(b.title || '')));
  // byDate: same day can have many events
  const byDate = {};
  for (const e of list) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }
  return {
    ok: true,
    geo: 'San Francisco only',
    multiPerDay: true,
    tz: 'America/Los_Angeles',
    events: list,
    byDate,
    count: list.length,
  };
}

function validateCalendarEvent(body) {
  const date = clamp(body.date, 10);
  if (!dateOk(date)) return { error: 'date must be YYYY-MM-DD' };
  const title = clamp(body.title || body.name, 120);
  if (!title) return { error: 'title required' };
  // Refuse loop/fixture noise outside MOCK (prod public calendar honesty)
  if (process.env.DEMIGOD_EVENTS_BOT_MOCK !== '1' && isJunkCalendarTitle(title)) {
    return { error: 'fixture_title', message: 'Title looks like a selftest/fixture — refused.' };
  }
  const city = clamp(body.city || 'San Francisco', 60);
  if (city && !isSfLocation(city)) {
    return { error: 'SF_ONLY', message: 'Events Bot is San Francisco only for now.' };
  }
  const venue = clamp(body.venue || body.location, 120);
  if (venue && !isSfLocation(city + ' ' + venue)) {
    return { error: 'SF_ONLY', message: 'Events Bot is San Francisco only for now.' };
  }
  let stage = clamp(body.stage || 'ideate', 24).toLowerCase();
  const st = normalizeStage(stage);
  if (body.stage && !st) return { error: 'unknown stage', stages: STAGES };
  if (st) stage = st;
  const seats = seatsOrNull(body.seats);
  if (Number.isNaN(seats)) return { error: 'seats must be a positive integer' };
  return {
    event: {
      id: 'cal_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date,
      title,
      stage: stage || 'ideate',
      time: clamp(body.time, 40),
      venue,
      seats,
      outcome: clamp(body.outcome, 400),
      format: clamp(body.format, 80),
      city: 'San Francisco',
      notes: clamp(body.notes, 400),
      source: clamp(body.source || 'web', 40),
      at: new Date().toISOString(),
    },
  };
}

function opsOk(req) {
  // Ops routes (agent/tick, idea generate, event write, outbox) must not be public.
  // localtunnel connects as 127.0.0.1 peer, so peer-IP checks are NOT a security boundary.
  if (OPS_SECRET) {
    const h = req.headers['x-dg-events-ops'] || req.headers['x-ops-secret'] || '';
    return h === OPS_SECRET;
  }
  // No secret configured: only explicit local open (never default-open on tunnel).
  return process.env.DEMIGOD_EVENTS_OPS_OPEN === '1';
}

/** Only these files may be served statically — never ROOT/home (P0 leak). */
const STATIC_ALLOW = new Set([
  'demigod-events.html',
  'demigod-events-cdn.html',
  'demigod-events-data.json',
]);

function validateOffer(body) {
  const kind = clamp(body.kind || body.type, 16).toLowerCase();
  if (!['sponsor', 'venue', 'volunteer'].includes(kind)) {
    return { error: 'kind must be sponsor | venue | volunteer' };
  }
  const name = clamp(body.name, 80);
  const email = clamp(body.email, 120).toLowerCase();
  if (name.length < 2) return { error: 'name required' };
  if (!isRealOutreachEmail(email)) return { error: 'usable email required' };
  let city = clamp(body.city || body.location || 'San Francisco', 60);
  const cityBlob = city + ' ' + clamp(body.offer || body.what || body.message, 200);
  if (!isSfLocation(cityBlob)) {
    return {
      error: 'Events Bot is San Francisco only for now — use an SF venue/area or leave city as San Francisco.',
    };
  }
  if (!city || /^sf$/i.test(city)) city = 'San Francisco';
  const capacity = body.capacity == null || body.capacity === '' ? null : Number(body.capacity);
  if (capacity != null && (!Number.isSafeInteger(capacity) || capacity < 1)) {
    return { error: 'capacity must be a positive whole number' };
  }
  const offer = {
    id: kind.slice(0, 1) + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    kind,
    name,
    email,
    org: clamp(body.org || body.company || body.venueName, 120),
    phone: clamp(body.phone, 40),
    city,
    capacity,
    offer: clamp(body.offer || body.what || body.services || body.message, 800),
    notes: clamp(body.notes, 400),
    url: clamp(body.url || body.website, 200),
    at: new Date().toISOString(),
    status: 'new',
  };
  if (kind === 'venue' && !offer.offer && !offer.org) {
    return { error: 'venue: include venue name and what you can host (SF only)' };
  }
  if (kind === 'sponsor' && !offer.offer) {
    offer.offer = 'Open to sponsorship conversation';
  }
  if (kind === 'volunteer' && !offer.offer) {
    return { error: 'volunteer: say what you can help with' };
  }
  if (!offerIsSf(offer)) return { error: 'Events Bot is San Francisco only for now.' };
  return { offer };
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  let p = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (p === '/' || p === '/events') {
      p = '/demigod-events.html';
    }

    if ((p === '/api/events' || p === '/api/events.json') && req.method === 'GET') {
      return json(res, 200, publicData());
    }

    if (p === '/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, service: 'demigod-events', at: new Date().toISOString() });
    }

    if (p === '/api/events-bot/health' && req.method === 'GET') {
      // Public capability surface only — no persona, API-key presence, or bind details.
      // openai/luma/identity remain on ops-gated /agent/status.
      return json(res, 200, {
        ok: true,
        service: 'demigod-events-bot',
        lifecycle: true,
        offers: true,
        calendar: true,
        multiPerDay: true,
        agent: true,
        invites: true,
        autonomy: AUTONOMY,
        at: new Date().toISOString(),
      });
    }

    if (p === '/api/events-bot/chatroom/join' && req.method === 'POST') {
      if (!rateLimit(req, { max: 10, bucket: 'chatroom-join' })) return rateLimited(res);
      const body = await readBody(req);
      const name = cleanChatName(body.name);
      if (name.length < 2) return json(res, 400, { ok: false, error: 'name must be 2–24 characters' });
      if (RESERVED_CHAT_NAMES.test(name)) return json(res, 400, { ok: false, error: 'that display name is reserved' });
      const now = Date.now();
      for (const [token, session] of chatroomSessions) if (session.expiresAt <= now) chatroomSessions.delete(token);
      const nameKey = name.toLowerCase();
      for (const session of chatroomSessions.values()) {
        if (session.expiresAt > now && String(session.name || '').toLowerCase() === nameKey) {
          return json(res, 409, { ok: false, error: 'display name already in use' });
        }
      }
      const token = crypto.randomBytes(24).toString('base64url');
      chatroomSessions.set(token, { name, expiresAt: now + 12 * 60 * 60 * 1000 });
      return json(res, 201, { ok: true, token, name });
    }

    if (p === '/api/events-bot/chatroom/messages' && req.method === 'POST') {
      if (!rateLimit(req, { max: 180, bucket: 'chatroom-read' })) return rateLimited(res);
      const body = await readBody(req);
      const session = chatroomSessions.get(String(body.token || ''));
      if (!session || session.expiresAt <= Date.now()) return json(res, 401, { ok: false, error: 'join the chatroom again' });
      const since = Math.max(0, Number(body.since) || 0);
      return json(res, 200, { ok: true, messages: chatroomMessages.filter((message) => message.seq > since), online: [...chatroomSessions.values()].filter((session) => session.expiresAt > Date.now()).length });
    }

    if (p === '/api/events-bot/chatroom/send' && req.method === 'POST') {
      if (!rateLimit(req, { max: 12, bucket: 'chatroom-send' })) return rateLimited(res);
      const body = await readBody(req);
      const session = chatroomSessions.get(String(body.token || ''));
      if (!session || session.expiresAt <= Date.now()) return json(res, 401, { ok: false, error: 'join the chatroom again' });
      const text = cleanChatMessage(body.text);
      if (!text) return json(res, 400, { ok: false, error: 'message required' });
      session.expiresAt = Date.now() + 12 * 60 * 60 * 1000;
      const message = { seq: (chatroomMessages.at(-1)?.seq || 0) + 1, name: session.name, text, at: new Date().toISOString() };
      chatroomMessages.push(message);
      if (chatroomMessages.length > 200) chatroomMessages.splice(0, chatroomMessages.length - 200);
      return json(res, 201, { ok: true, message });
    }

    if (p === '/api/events-bot/agent/status' && req.method === 'GET') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      return json(res, 200, {
        ok: true,
        autonomy: AUTONOMY,
        identity: eventsBotIdentity,
        resources: runTool('list_resources', {}),
        lumaKey: !!process.env.LUMA_API_KEY,
        stripe: 'pending',
      });
    }

    if (p === '/api/events-bot/agent/tick' && req.method === 'POST') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required (set DEMIGOD_EVENTS_OPS_SECRET)' });
      const body = await readBody(req);
      const out = await eventsBotAgentTick({
        goal: body.goal || body.message || '',
        maxSteps: body.maxSteps,
      });
      return json(res, 200, out);
    }

    if (p === '/api/events-bot/idea' && req.method === 'POST') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      if (!rateLimit(req, { max: 20, bucket: 'idea' })) return rateLimited(res);
      const body = await readBody(req);
      // generate=true runs full agent tools — ops only (Fable P1 prompt-injection)
      if (body.generate || (opsOk(req) && !body.title && !body.outcome)) {
        if (!opsOk(req)) {
          return json(res, 401, {
            ok: false,
            error: 'idea generate is ops-only; submit title+outcome as a suggestion, or chat',
          });
        }
        const tick = await eventsBotAgentTick({
          goal:
            'Generate original SF event ideas' +
            (body.seed ? ' seeded by: ' + String(body.seed).slice(0, 200) : '') +
            '. Use propose_event_ideas and record_idea only. Do not queue outreach.',
          maxSteps: 3,
          ownerCycle: false,
        });
        return json(res, 200, tick);
      }
      if (!String(body.audience || '').trim() || !String(body.outcome || '').trim()) {
        return json(res, 400, { ok: false, error: 'audience and outcome required' });
      }
      const result = await withStore(() =>
        runTool('record_idea', {
          title: body.title,
          audience: body.audience,
          outcome: body.outcome,
          format: body.format,
          seats: body.seats,
          needs: body.needs,
          source: body.source || 'user',
        }),
      );
      return json(res, result.ok ? 200 : 400, result);
    }

    if (p === '/api/events-bot/analytics/forms' && req.method === 'POST') {
      if (!rateLimit(req, { max: 120, bucket: 'form-analytics' })) return rateLimited(res);
      const body = await readBody(req);
      const recorded = recordFormEvent({ ...body, dnt: req.headers.dnt === '1' || body.dnt });
      if (!recorded.ok) return json(res, recorded.ignored ? 204 : 400, recorded.ignored ? null : { ok: false, error: recorded.error });
      return json(res, 202, { ok: true });
    }

    if (p === '/api/events-bot/event-submission' && req.method === 'POST') {
      if (!rateLimit(req, { max: 10, bucket: 'event-submission' })) return rateLimited(res);
      const body = await readBody(req);
      const checked = validateEventSubmission(body);
      if (checked.error) return json(res, 400, { ok: false, error: checked.error });
      const manageToken = crypto.randomBytes(24).toString('base64url');
      const record = {
        id: 'evt_' + crypto.randomUUID(),
        ...checked.value,
        status: 'submitted',
        manageTokenHash: tokenHash(manageToken),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const created = await withStore((store) => {
        // ponytail: flat private-store list; move to a database when submission volume warrants indexing.
        store.eventSubmissions = Array.isArray(store.eventSubmissions) ? store.eventSubmissions : [];
        if (store.eventSubmissions.some((row) => sameEventSubmission(row, record))) return false;
        store.eventSubmissions.push(record);
        saveStore(store);
        return true;
      });
      if (!created) return json(res, 409, { ok: false, error: 'An identical active event submission already exists.' });
      return json(res, 201, { ok: true, event: publicEventSubmission(record), manageToken, message: 'Event submitted for review. Nothing has been published yet.' });
    }

    if (p === '/api/events-bot/event-submission/read' && req.method === 'POST') {
      if (!rateLimit(req, { max: 60, bucket: 'event-submission-read' })) return rateLimited(res);
      const body = await readBody(req);
      const store = loadStore();
      const record = (store.eventSubmissions || []).find((row) => row.id === body.id);
      if (!record || !tokenMatches(record, body.manageToken)) return json(res, 404, { ok: false, error: 'event submission not found' });
      return json(res, 200, { ok: true, event: publicEventSubmission(record) });
    }

    if (p === '/api/events-bot/event-submission/manage' && req.method === 'POST') {
      if (!rateLimit(req, { max: 30, bucket: 'event-submission-manage' })) return rateLimited(res);
      const body = await readBody(req);
      const updated = await withStore((store) => {
        const record = (store.eventSubmissions || []).find((row) => row.id === body.id);
        if (!record || !tokenMatches(record, body.manageToken)) return null;
        const candidate = { ...record, ...(body.patch || {}) };
        const checked = validateEventSubmission(candidate);
        if (checked.error) return { error: checked.error };
        // Duplicate identity uses full next state (not just sparse checked.value fields).
        const next = { ...record, ...checked.value };
        if ((store.eventSubmissions || []).some((row) => row.id !== record.id && sameEventSubmission(row, next))) return { error: 'duplicate_submission' };
        Object.assign(record, checked.value, { status: 'submitted', updatedAt: new Date().toISOString() });
        delete record.reviewedAt;
        delete record.reviewNote;
        delete record.withdrawnAt;
        saveStore(store);
        return { record };
      });
      if (!updated) return json(res, 404, { ok: false, error: 'event submission not found' });
      if (updated.error) return json(res, updated.error === 'duplicate_submission' ? 409 : 400, { ok: false, error: updated.error === 'duplicate_submission' ? 'An identical active event submission already exists.' : updated.error });
      return json(res, 200, { ok: true, event: publicEventSubmission(updated.record), message: 'Event details updated. Publishing remains a separate reviewed step.' });
    }

    if (p === '/api/events-bot/event-submission/withdraw' && req.method === 'POST') {
      if (!rateLimit(req, { max: 20, bucket: 'event-submission-withdraw' })) return rateLimited(res);
      const body = await readBody(req);
      const withdrawn = await withStore((store) => {
        const record = (store.eventSubmissions || []).find((row) => row.id === body.id);
        if (!record || !tokenMatches(record, body.manageToken)) return null;
        record.status = 'withdrawn';
        record.withdrawnAt = new Date().toISOString();
        record.updatedAt = record.withdrawnAt;
        saveStore(store);
        return record;
      });
      if (!withdrawn) return json(res, 404, { ok: false, error: 'event submission not found' });
      return json(res, 200, { ok: true, event: publicEventSubmission(withdrawn), message: 'Demigod submission withdrawn. This does not cancel an event hosted on another platform.' });
    }

    if (p === '/api/events-bot/submission-review' && req.method === 'POST') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      if (!rateLimit(req, { max: 60, bucket: 'submission-review' })) return rateLimited(res);
      const body = await readBody(req);
      if (!['event', 'startup'].includes(body.kind) || !['approve', 'reject'].includes(body.decision)) {
        return json(res, 400, { ok: false, error: 'kind event|startup and decision approve|reject required' });
      }
      const note = clamp(body.note, 400);
      if (!note) return json(res, 400, { ok: false, error: 'review note required' });
      const reviewed = await withStore((store) => {
        const list = body.kind === 'event' ? store.eventSubmissions : store.startupSubmissions;
        const record = (Array.isArray(list) ? list : []).find((row) => row.id === body.id);
        if (!record) return null;
        if (record.status === 'withdrawn') return { error: 'organizer_withdrawn' };
        // Approve must re-check SF geography fail-closed (intake can be older than store pollution).
        if (body.decision === 'approve') {
          if (body.kind === 'event') {
            if (record.venue && !isSfLocation(record.venue)) return { error: 'SF_ONLY' };
            const recheck = validateEventSubmission(record);
            if (recheck.error) return { error: recheck.error };
          } else {
            const neighborhood = String(record.neighborhood || '').trim();
            if (neighborhood && !isSfLocation(neighborhood)) return { error: 'SF_ONLY' };
            if (record.website && !safeSubmissionUrl(record.website)) return { error: 'website must be https' };
          }
        }
        // Same status for events + startups: operator-approved, not independently "verified".
        record.status = body.decision === 'approve' ? 'approved' : 'rejected';
        record.reviewNote = note;
        record.reviewedAt = new Date().toISOString();
        saveStore(store);
        return { id: record.id, status: record.status, reviewedAt: record.reviewedAt };
      });
      if (!reviewed) return json(res, 404, { ok: false, error: 'submission not found' });
      // SF_ONLY and validation rejections are 400 (not 409 withdrawn)
      if (reviewed.error === 'organizer_withdrawn') return json(res, 409, { ok: false, error: reviewed.error });
      if (reviewed.error) return json(res, 400, { ok: false, error: reviewed.error });
      return json(res, 200, { ok: true, submission: reviewed });
    }

    if (p === '/api/events-bot/community-events' && req.method === 'GET') {
      const store = loadStore();
      return json(res, 200, { ok: true, events: publicCommunityEvents(store) });
    }

    if (p === '/api/events-bot/community-startups' && req.method === 'GET') {
      const store = loadStore();
      return json(res, 200, { ok: true, startups: (store.startupSubmissions || []).filter(isPublicStartupSubmission).map(publicCommunityStartup) });
    }

    if (p === '/api/events-bot/startup-submission' && req.method === 'POST') {
      if (!rateLimit(req, { max: 10, bucket: 'startup-submission' })) return rateLimited(res);
      const body = await readBody(req);
      if (!clamp(body.name, 160) || !clamp(body.website, 500) || !clamp(body.neighborhood, 120) || !clamp(body.description, 1200) || !clamp(body.submitterName, 120) || !emailOk(body.submitterEmail)) {
        return json(res, 400, { ok: false, error: 'name, website, neighborhood, description, submitterName, and valid submitterEmail required' });
      }
      const website = safeSubmissionUrl(body.website);
      if (!website) return json(res, 400, { ok: false, error: 'website must be https' });
      if (body.hiring != null && !['yes', 'no', 'unknown'].includes(body.hiring)) return json(res, 400, { ok: false, error: 'invalid hiring value' });
      if (!isSfLocation(String(body.neighborhood))) {
        return json(res, 400, { ok: false, error: 'SF_ONLY' });
      }
      const manageToken = crypto.randomBytes(24).toString('base64url');
      const record = {
        id: 'startup_' + crypto.randomUUID(),
        name: clamp(body.name, 160), website,
        neighborhood: clamp(body.neighborhood, 120),
        description: clamp(body.description, 1200),
        hiring: body.hiring || 'unknown',
        submitterName: clamp(body.submitterName, 120),
        submitterEmail: clamp(body.submitterEmail, 160).toLowerCase(),
        manageTokenHash: tokenHash(manageToken),
        status: 'submitted', createdAt: new Date().toISOString(),
      };
      const created = await withStore((store) => {
        store.startupSubmissions = Array.isArray(store.startupSubmissions) ? store.startupSubmissions : [];
        if (store.startupSubmissions.some((row) => activeSubmission(row) && row.submitterEmail === record.submitterEmail && row.name === record.name)) return false;
        store.startupSubmissions.push(record);
        saveStore(store);
        return true;
      });
      if (!created) return json(res, 409, { ok: false, error: 'An identical active startup submission already exists.' });
      // Keep top-level id for existing clients/tests; nest full private-safe record under startup.
      return json(res, 201, {
        ok: true,
        id: record.id,
        startup: publicStartupSubmission(record),
        manageToken,
        message: 'Startup received for review. Submission does not guarantee a listing; only reviewed listings appear on the map.',
      });
    }

    if (p === '/api/events-bot/startup-submission/read' && req.method === 'POST') {
      if (!rateLimit(req, { max: 60, bucket: 'startup-submission-read' })) return rateLimited(res);
      const body = await readBody(req);
      const record = (loadStore().startupSubmissions || []).find((row) => row.id === body.id);
      if (!record || !tokenMatches(record, body.manageToken)) return json(res, 404, { ok: false, error: 'startup submission not found' });
      return json(res, 200, { ok: true, startup: publicStartupSubmission(record) });
    }

    if (p === '/api/events-bot/startup-submission/manage' && req.method === 'POST') {
      if (!rateLimit(req, { max: 20, bucket: 'startup-submission-manage' })) return rateLimited(res);
      const body = await readBody(req);
      const updated = await withStore((store) => {
        const record = (store.startupSubmissions || []).find((row) => row.id === body.id);
        if (!record || !tokenMatches(record, body.manageToken)) return null;
        const patch = body.patch || {};
        if (!clamp(patch.name, 160) || !clamp(patch.website, 500) || !clamp(patch.neighborhood, 120) || !clamp(patch.description, 1200)) return { error: 'name, website, neighborhood, and description required' };
        const website = safeSubmissionUrl(patch.website);
        if (!website) return { error: 'website must be https' };
        if (!['yes', 'no', 'unknown'].includes(patch.hiring)) return { error: 'invalid hiring value' };
        if (!isSfLocation(String(patch.neighborhood))) return { error: 'SF_ONLY' };
        Object.assign(record, {
          name: clamp(patch.name, 160), website,
          neighborhood: clamp(patch.neighborhood, 120),
          description: clamp(patch.description, 1200),
          hiring: patch.hiring,
          status: 'submitted', updatedAt: new Date().toISOString(),
        });
        delete record.withdrawnAt;
        saveStore(store);
        return record;
      });
      if (!updated) return json(res, 404, { ok: false, error: 'startup submission not found' });
      if (updated.error) return json(res, 400, { ok: false, error: updated.error });
      return json(res, 200, { ok: true, startup: publicStartupSubmission(updated), message: 'Startup changes saved and returned to review.' });
    }

    if (p === '/api/events-bot/startup-submission/withdraw' && req.method === 'POST') {
      if (!rateLimit(req, { max: 20, bucket: 'startup-submission-withdraw' })) return rateLimited(res);
      const body = await readBody(req);
      const withdrawn = await withStore((store) => {
        const record = (store.startupSubmissions || []).find((row) => row.id === body.id);
        if (!record || !tokenMatches(record, body.manageToken)) return null;
        record.status = 'withdrawn';
        record.withdrawnAt = new Date().toISOString();
        record.updatedAt = record.withdrawnAt;
        saveStore(store);
        return record;
      });
      if (!withdrawn) return json(res, 404, { ok: false, error: 'startup submission not found' });
      return json(res, 200, { ok: true, startup: publicStartupSubmission(withdrawn), message: 'Startup submission withdrawn.' });
    }

    if (p === '/api/events-bot/feedback' && req.method === 'POST') {
      if (!rateLimit(req, { max: 20, bucket: 'feedback' })) return rateLimited(res);
      const body = await readBody(req);
      if (!body.text) return json(res, 400, { ok: false, error: 'text required' });
      const result = await withStore(() => runTool('record_feedback', body));
      return json(res, result.ok ? 200 : 400, result);
    }

    if (p === '/api/events-bot/money' && req.method === 'POST') {
      if (!rateLimit(req, { max: 12, bucket: 'money' })) return rateLimited(res);
      const body = await readBody(req);
      if (!body.name || !body.email || !body.amountNote) {
        return json(res, 400, { ok: false, error: 'name, email, amountNote required' });
      }
      const result = await withStore(() => runTool('record_money_intent', body));
      return json(res, result.ok ? 200 : 400, result);
    }

    if (p === '/api/events-bot/outbox' && req.method === 'GET') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      const s = agentLoadStore();
      const activeId = s.activeEvent?.id;
      const list = (s.outreach || [])
        .filter(
          (o) =>
            activeId && ['queued', 'drafted'].includes(o?.status) && o.eventId === activeId,
        )
        .slice(-30)
        .map((o) => ({
          id: o.id,
          toEmail: o.toEmail,
          kind: o.kind,
          subject: o.subject,
          status: o.status,
          at: o.at,
        }));
      return json(res, 200, { ok: true, outreach: list, autonomy: AUTONOMY });
    }

    // Partiful/Luma real-URL drain board (ops). Absorbs human-pasted URLs from drop/outbox.
    if (
      (p === '/api/events-bot/invites' || p === '/api/events-bot/invite-drain') &&
      req.method === 'GET'
    ) {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      return json(res, 200, runTool('invite_drain_status', {}));
    }

    // Record a real Partiful/Luma/Demigod https URL on a draft — never invent; reject RSVP counts.
    if (
      (p === '/api/events-bot/invite-url' || p === '/api/events-bot/invites') &&
      req.method === 'POST'
    ) {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      if (!rateLimit(req, { max: 40, bucket: 'invite-url' })) return rateLimited(res);
      const body = await readBody(req);
      if (!body.url && !body.inviteUrl) {
        return json(res, 400, {
          ok: false,
          error: 'url required (partiful.com, lu.ma, or trydemigod.com/?p=event&id=…)',
        });
      }
      const result = await withStore((store) => {
        const out = recordInviteUrl(store, body);
        if (out.ok) saveStore(store);
        return out;
      });
      if (!result.ok) return json(res, 400, result);
      return json(res, 200, result);
    }

    // Ops: open native Demigod RSVP page for active event (stamps published invite URL).
    if (
      (p === '/api/events-bot/open-rsvps' || p === '/api/events-bot/open-native-rsvps') &&
      req.method === 'POST'
    ) {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      if (!rateLimit(req, { max: 20, bucket: 'open-rsvps' })) return rateLimited(res);
      const body = await readBody(req);
      const saved = await withStore((store) => {
        const out = openNativeRsvps(store, body || {});
        if (out.ok) saveStore(store);
        return out;
      });
      return json(res, saved.ok ? 200 : 400, saved);
    }

    // Public event card (no guest PII).
    if (p === '/api/events-bot/public-event' && req.method === 'GET') {
      if (!rateLimit(req, { max: 120, bucket: 'public-event' })) return rateLimited(res);
      const id = url.searchParams.get('id') || url.searchParams.get('eventId') || '';
      const store = loadStore();
      const view = publicEventView(store, id);
      if (!view.ok) return json(res, 404, view);
      return json(res, 200, {
        ...view,
        event: {
          ...view.event,
          audience: view.event.audience == null ? null : publicEventAudience(store, view.event.id),
        },
      });
    }

    // Public RSVP — real name+email only.
    if (p === '/api/events-bot/rsvp' && req.method === 'POST') {
      if (!rateLimit(req, { max: 30, bucket: 'rsvp' })) return rateLimited(res);
      const body = await readBody(req);
      const result = await withStore((store) => {
        const saved = submitNativeRsvp(store, body || {});
        if (saved.ok) saveStore(store);
        return saved;
      });
      if (!result.ok) return json(res, 400, result);
      return json(res, 200, result);
    }

    // Ops: host RSVP list (emails).
    if (p === '/api/events-bot/rsvps' && req.method === 'GET') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      const id = url.searchParams.get('id') || url.searchParams.get('eventId') || '';
      if (!id) return json(res, 400, { ok: false, error: 'eventId_required' });
      const result = runTool('list_native_rsvps', { id });
      return json(res, result.ok ? 200 : 400, result);
    }

    if (p === '/api/events-bot/lifecycle' && req.method === 'GET') {
      const store = loadStore();
      const ae = store.activeEvent || {};
      const hasActive = !!(ae.id);
      const isPublic = hasActive && STAGES.indexOf(normalizeStage(ae.stage)) >= STAGES.indexOf('rsvp');
      // Same invite-event match as publicEventView — never echo a mismatched alias URL.
      const publicInvite =
        isPublic && ae.id ? publicEventView(store, ae.id)?.event?.inviteUrl || null : null;
      return json(res, 200, {
        ok: true,
        geo: 'San Francisco only',
        stages: STAGES,
        lifecycle: store.lifecycle,
        // Honesty: empty shell after seed_next_from_debrief is not "in flight"
        hasActive,
        activeEvent: {
          id: isPublic ? ae.id : null,
          title: isPublic ? ae.title || '' : '',
          stage: hasActive ? ae.stage || 'ideate' : 'ideate',
          city: hasActive ? ae.city || 'San Francisco' : '',
          outcome: isPublic ? ae.outcome || '' : '',
          seats: isPublic ? (ae.seats ?? null) : null,
          // Foot eventsBotNativeHostMount reads published_url | publishedUrl | inviteUrl
          inviteUrl: publicInvite,
          published_url: publicInvite,
          publishedUrl: publicInvite,
          dateWindows: isPublic ? ae.dateWindows || [] : [],
          // Operational outcomes stay private — public RSVP totals use public-event view.
          outcomes: null,
          hasActive,
          // Never surface prior-night identity/timestamps on the public lifecycle.
          clearedFrom: null,
          clearedAt: null,
        },
        offerCounts: publicOfferCounts(store),
      });
    }

    if (p === '/api/events-bot/offers' && req.method === 'GET') {
      return json(res, 200, publicOffers(loadStore()));
    }

    if (p === '/api/events-bot/calendar' && req.method === 'GET') {
      const year = url.searchParams.get('year');
      const month = url.searchParams.get('month');
      return json(
        res,
        200,
        publicCalendar(loadStore(), {
          year: year ? Number(year) : null,
          month: month ? Number(month) : null,
        }),
      );
    }

    if (p === '/api/events-bot/calendar' && req.method === 'POST') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      if (!rateLimit(req, { max: 30, bucket: 'calendar' })) return rateLimited(res);
      const body = await readBody(req);
      const v = validateCalendarEvent(body);
      if (v.error) {
        return json(res, 400, {
          ok: false,
          error: v.error,
          message: v.message,
          stages: v.stages,
        });
      }
      // Explicit allow: multiple events on the same date
      const saved = await withStore((store) => {
        store.calendarEvents = store.calendarEvents || [];
        store.calendarEvents.push(v.event);
        while (store.calendarEvents.length > 800) store.calendarEvents.shift();
        saveStore(store);
        return v.event;
      });
      return json(res, 200, {
        ok: true,
        event: publicCalendarEvent(saved),
        message: 'Event on calendar. Multiple nights can share the same day.',
      });
    }

    if ((p === '/api/events-bot/offer' || p === '/api/events-bot/offers') && req.method === 'POST') {
      if (!rateLimit(req, { max: 25, bucket: 'offer' })) return rateLimited(res);
      const body = await readBody(req);
      const v = validateOffer(body);
      if (v.error) return json(res, 400, { ok: false, error: v.error });
      const saved = await withStore((store) => {
        const list = store.offers[v.offer.kind];
        list.push(v.offer);
        while (list.length > MAX_OFFERS) list.shift();
        if (store.activeEvent?.id) stampOfferMatches(store);
        saveStore(store);
        return v.offer;
      });
      return json(res, 200, {
        ok: true,
        id: saved.id,
        kind: saved.kind,
        status: saved.status,
        message: 'Offer recorded. potter@trydemigod.com will follow up — no auto-booking.',
      });
    }

    if (p === '/api/events-bot/event' && req.method === 'POST') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      if (!rateLimit(req, { max: 30, bucket: 'event' })) return rateLimited(res);
      const body = await readBody(req);
      const seats = seatsOrNull(body.seats);
      if (Number.isNaN(seats)) return json(res, 400, { ok: false, error: 'seats must be a positive integer' });
      if (
        body.dateWindows != null &&
        (!Array.isArray(body.dateWindows) || body.dateWindows.some((value) => typeof value !== 'string' || !value.trim()))
      ) {
        return json(res, 400, { ok: false, error: 'dateWindows must be an array of nonblank strings' });
      }
      if (body.outcomes != null) {
        return json(res, 400, {
          ok: false,
          error: 'host_attested_only',
          message: 'Record real outcomes through the debrief flow.',
        });
      }
      for (const field of ['title', 'audience', 'outcome']) {
        if (body[field] != null && !clamp(body[field], field === 'title' ? 120 : field === 'audience' ? 240 : 400)) {
          return json(res, 400, { ok: false, error: field + ' cannot be blank' });
        }
      }
      const aeOut = await withStore((store) => {
        const ae = store.activeEvent || defaultStore().activeEvent;
        if (
          body.seats != null &&
          seats == null &&
          STAGES.indexOf(normalizeStage(ae.stage)) >= STAGES.indexOf('resource')
        ) {
          return { error: 'seats cannot be blank after resourcing starts' };
        }
        // Identity/place fields need an SF cue (isSfLocation). Freeform notes only reject
        // explicit non-SF places — "planning only" must reach the incomplete-mint gate, not SF_ONLY.
        const placeBlob = [
          body.title ?? ae.title,
          body.audience ?? ae.audience,
          body.outcome ?? ae.outcome,
          body.city ?? ae.city,
        ].filter(Boolean).join(' ');
        if (placeBlob && !isSfLocation(placeBlob)) {
          return { error: 'SF_ONLY', message: 'Events Bot is San Francisco only for now.' };
        }
        if (body.notes != null && mentionsNonSf(body.notes)) {
          return { error: 'SF_ONLY', message: 'Events Bot is San Francisco only for now.' };
        }
        if (body.title != null) ae.title = clamp(body.title, 120);
        if (body.audience != null) ae.audience = clamp(body.audience, 240);
        if (body.outcome != null) ae.outcome = clamp(body.outcome, 400);
        if (body.notes != null) ae.notes = clamp(body.notes, 800);
        if (body.seats != null) ae.seats = seats;
        if (Array.isArray(body.dateWindows)) {
          const nextWindows = body.dateWindows.map((d) => clamp(d, 80)).filter(Boolean).slice(0, 8);
          // Vague or empty schedules must not wipe committed dates once planning has started.
          if (
            STAGES.indexOf(normalizeStage(ae.stage)) >= STAGES.indexOf('plan') &&
            !hasFutureDateTime({ dateWindows: nextWindows })
          ) {
            return {
              error: nextWindows.length ? 'future_datetime_required' : 'dateWindows_required',
              message: 'Cannot clear or set vague dateWindows at plan+; use schedule with a real future start.',
            };
          }
          ae.dateWindows = nextWindows;
        }
        if (body.stage) {
          const st = normalizeStage(body.stage);
          if (!st) return { error: 'unknown stage', stages: STAGES };
          if (st !== ae.stage) {
            const gate = canAdvanceStage(ae.stage, st, ae, store, body.evidence || body.note || '');
            if (!gate.ok) return { error: gate.reason, message: gate.message, stages: STAGES };
            ae.stage = st;
            ae.stageAt = new Date().toISOString();
            ae.checklist = stageChecklist(st, ae);
          }
        }
        ae.city = 'San Francisco';
        // First mint requires title + audience/outcome + seats so ops cannot create
        // another incomplete active night (driveCycle would hard-stop). Partial updates
        // remain allowed when ae.id already exists (repair path).
        if (!ae.id) {
          const brief = eventAudienceBrief(ae);
          const seatN = seatsOrNull(ae.seats);
          const titleOk = Boolean(clamp(ae.title, 120));
          if (!titleOk || !brief.ok || !Number.isInteger(seatN) || seatN < 1) {
            const missing = [
              ...(!titleOk ? ['title'] : []),
              ...(brief.missing || []),
              ...(!Number.isInteger(seatN) || seatN < 1 ? ['seats'] : []),
            ];
            return {
              error: 'need_audience_outcome_and_seats',
              message: 'New active events need title, audience, outcome, and seats before an id is minted.',
              missing,
            };
          }
          ae.id = 'ev_' + Date.now().toString(36);
        }
        ae.updatedAt = new Date().toISOString();
        store.activeEvent = ae;
        saveStore(store);
        return { activeEvent: ae };
      });
      if (aeOut.error) {
        return json(res, 400, {
          ok: false,
          error: aeOut.error,
          message: aeOut.message,
          stages: aeOut.stages,
          missing: aeOut.missing,
        });
      }
      return json(res, 200, { ok: true, activeEvent: aeOut.activeEvent });
    }

    if (p === '/api/events-bot/schedule' && req.method === 'POST') {
      if (!opsOk(req)) return json(res, 401, { ok: false, error: 'ops secret required' });
      if (!rateLimit(req, { max: 30, bucket: 'schedule' })) return rateLimited(res);
      const body = await readBody(req);
      const result = await withStore(() => runTool('record_schedule', body));
      return json(res, result.ok ? 200 : 400, result);
    }

    if (p === '/api/events-bot/chat' && req.method === 'POST') {
      if (!rateLimit(req, { max: 40, bucket: 'chat' })) return rateLimited(res);
      const body = await readBody(req);
      // FOCUS #1 tunnel: socket is always 127.0.0.1 via CF/localtunnel —
      // pass CF/XFF clientIp so chat hour-bucket is per visitor, not global.
      const ip = clientIp(req);
      const out = await eventsBotChat({ messages: body.messages || [], ip, allowMutate: opsOk(req) });
      return json(res, out.status || 200, out);
    }

    if (p === '/demigod-events-data.json' && url.searchParams.get('live') === '1') {
      return json(res, 200, publicData());
    }

    // static files — allowlist only (never serve HOME / private JSON)
    let fileRel = p.replace(/^\//, '') || 'demigod-events.html';
    if (fileRel === 'events' || fileRel === 'events/') fileRel = 'demigod-events.html';
    if (!STATIC_ALLOW.has(fileRel) || fileRel.includes('..') || fileRel.startsWith('.')) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found. Try /events or /api/events-bot/health');
      return;
    }
    const abs = path.join(ROOT, fileRel);
    const rootResolved = path.resolve(ROOT) + path.sep;
    if (!path.resolve(abs).startsWith(rootResolved) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(abs);
    const body = fs.readFileSync(abs);
    cors(res);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    if (res.headersSent) {
      try {
        res.end();
      } catch (_) {}
      return;
    }
    const msg = String(e.message || e);
    const code = /body too large/i.test(msg) ? 413 : /JSON|Unexpected token/i.test(msg) ? 400 : 500;
    json(res, code, { ok: false, error: msg.slice(0, 200) });
  }
});

server.on('error', (err) => {
  // Clean exit on double-bind (systemd + manual / orphan) — no unhandled throw spam.
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'EADDRINUSE',
        host: HOST,
        port: PORT,
        hint: 'events app already listening (systemd demigod-events-bot or orphan)',
      }),
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(
    JSON.stringify(
      {
        ok: true,
        events: `http://${HOST}:${PORT}/events`,
        health: `http://${HOST}:${PORT}/api/events-bot/health`,
        chat: `http://${HOST}:${PORT}/api/events-bot/chat`,
        offers: `http://${HOST}:${PORT}/api/events-bot/offer`,
        lifecycle: `http://${HOST}:${PORT}/api/events-bot/lifecycle`,
      },
      null,
      2,
    ),
  );
});
