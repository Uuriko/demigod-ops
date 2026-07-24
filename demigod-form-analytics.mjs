#!/usr/bin/env node
/** Privacy-safe aggregate form analytics. No answers, identity, URLs, IP, UA, or event-level rows. */
import { atomicWrite, readJson, withFileLock } from './demigod-agent-tools-lib.mjs';

const STORE = process.env.DEMIGOD_FORM_ANALYTICS_STORE || '/tmp/dg-busy/form-analytics.json';
const FORMS = new Set(['startup', 'talent']);
const EVENTS = new Set(['start', 'view', 'validation', 'completion']);
const DEVICES = new Set(['mobile', 'tablet', 'desktop', 'unknown']);
const STEPS = new Set(['start', 'company', 'stage', 'role', 'skills', 'outcome', 'contact', 'name', 'linkedin', 'work', 'constraints', 'resume', 'review', 'complete']);
const RETENTION_MS = 30 * 86400000;
const MAX_CELLS = 5000;
const MAX_COUNT = Number.MAX_SAFE_INTEGER;
export const MAX_ANALYTICS_BODY = 4096;

export function summarizeFormAnalytics(doc = {}, now = Date.now()) {
  const forms = Object.fromEntries([...FORMS].map((form) => [form, { starts: 0, completions: 0, validations: 0, steps: {}, validationSteps: {} }]));
  for (const cell of Array.isArray(doc.cells) ? doc.cells : []) {
    const bucket = Date.parse(cell?.bucket || '');
    if (!Number.isFinite(bucket) || bucket < now - RETENTION_MS || bucket > now || !FORMS.has(cell?.form) || !EVENTS.has(cell?.event) || !DEVICES.has(cell?.device) || !(STEPS.has(cell?.step) || /^step-(?:[0-9]|1[0-2])$/.test(cell?.step))) continue;
    const count = Number.isSafeInteger(cell.count) && cell.count > 0 ? cell.count : 0;
    const form = forms[cell.form];
    if (cell.event === 'start') form.starts = Math.min(MAX_COUNT, form.starts + count);
    if (cell.event === 'completion') form.completions = Math.min(MAX_COUNT, form.completions + count);
    if (cell.event === 'validation') {
      form.validations = Math.min(MAX_COUNT, form.validations + count);
      form.validationSteps[cell.step] = Math.min(MAX_COUNT, (form.validationSteps[cell.step] || 0) + count);
    }
    if (cell.event === 'view') form.steps[cell.step] = Math.min(MAX_COUNT, (form.steps[cell.step] || 0) + count);
  }
  for (const form of Object.values(forms)) form.completionRate = form.starts ? Math.min(100, Math.round(form.completions / form.starts * 100)) : null;
  return forms;
}

export function allowTimestampRequest(hits, now = Date.now(), max = 30) {
  while (hits.length && now - hits[0] >= 60_000) hits.shift();
  if (hits.length >= max) return false;
  hits.push(now);
  return true;
}

export const allowFormAnalyticsWrite = allowTimestampRequest;

function normalize(input = {}, now = Date.now()) {
  if (input.dnt === true || String(input.dnt || '') === '1') return { ignored: 'dnt' };
  const form = String(input.form || '').toLowerCase();
  const event = String(input.event || '').toLowerCase();
  const device = String(input.device || 'unknown').toLowerCase();
  const rawStep = typeof input.step === 'number' ? `step-${input.step}` : String(input.step || '').toLowerCase();
  const step = /^step-(?:[0-9]|1[0-2])$/.test(rawStep) || STEPS.has(rawStep) ? rawStep : '';
  if (!FORMS.has(form) || !EVENTS.has(event) || !DEVICES.has(device) || !step) return { error: 'invalid_event' };
  return { form, step, event, device, bucket: new Date(Math.floor(now / 3600000) * 3600000).toISOString() };
}

export function recordFormEvent(input, { store = STORE, now = Date.now() } = {}) {
  const event = normalize(input, now);
  if (event.error || event.ignored) return { ok: false, ...event };
  withFileLock(`${store}.lock`, () => {
    const doc = readJson(store) || { schema: 'demigod.form-analytics/1', cells: [] };
    const cutoff = now - RETENTION_MS;
    const cells = Array.isArray(doc.cells) ? doc.cells.flatMap((cell) => {
      const bucket = typeof cell?.bucket === 'string' ? cell.bucket : '';
      const bucketTime = Date.parse(bucket);
      if (!Number.isFinite(bucketTime) || bucketTime < cutoff || bucketTime > now || !FORMS.has(cell?.form) || !EVENTS.has(cell?.event)
        || !DEVICES.has(cell?.device) || !(STEPS.has(cell?.step) || /^step-(?:[0-9]|1[0-2])$/.test(cell?.step))) return [];
      const count = Number.isSafeInteger(cell.count) && cell.count > 0 ? cell.count : 0;
      return [{ bucket, form: cell.form, step: cell.step, event: cell.event, device: cell.device, count }];
    }) : [];
    const hit = cells.find((cell) => ['bucket', 'form', 'step', 'event', 'device'].every((key) => cell[key] === event[key]));
    if (hit) hit.count = Math.min(hit.count + 1, MAX_COUNT);
    else cells.push({ ...event, count: 1 });
    cells.sort((a, b) => a.bucket.localeCompare(b.bucket));
    atomicWrite(store, JSON.stringify({ schema: 'demigod.form-analytics/1', cells: cells.slice(-MAX_CELLS) }, null, 2) + '\n', { mode: 0o600 });
  });
  return { ok: true, bucket: event.bucket };
}

export function processFormAnalyticsRequest(body, { contentType = '', dnt = '', store = STORE, now = Date.now() } = {}) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(String(body || ''));
  if (bytes.length > MAX_ANALYTICS_BODY) return { status: 413 };
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return { status: 415 };
  if (String(dnt) === '1') return { status: 204 };
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); } catch { return { status: 400 }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { status: 400 };
  const result = recordFormEvent(
    { form: parsed.form, step: parsed.step, event: parsed.event, device: parsed.device, dnt: parsed.dnt },
    { store, now },
  );
  return { status: result.ok || result.ignored ? 204 : 422 };
}

export { normalize as normalizeFormEvent };
