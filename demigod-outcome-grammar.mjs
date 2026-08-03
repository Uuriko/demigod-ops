#!/usr/bin/env node
/**
 * Outcome Grammar — structured parse of first-result free text (from hire briefs).
 *
 *   node demigod-outcome-grammar.mjs --text="Ship multi-tenant billing to 10 customers"
 *   node demigod-outcome-grammar.mjs --selftest
 *
 * Best-effort, fail-open parse. Never a hiring score. Used for clarity UX / twin themes.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const VERBS = [
  'ship', 'launch', 'deliver', 'build', 'migrate', 'reduce', 'increase', 'grow', 'hire',
  'close', 'land', 'raise', 'cut', 'improve', 'own', 'lead', 'stabilize', 'scale', 'replace',
  'redesign', 'instrument', 'automate', 'close', 'win', 'publish', 'open',
];

/**
 * @param {string} text
 * @returns {{
 *   raw: string,
 *   ok: boolean,
 *   verb: string|null,
 *   object: string|null,
 *   metric: string|null,
 *   horizon: string|null,
 *   measurable: boolean,
 *   clarity: 'high'|'medium'|'low',
 *   themes: string[],
 *   notes: string[],
 * }}
 */
export function parseOutcome(text) {
  const raw = String(text || '').trim().replace(/\s+/g, ' ');
  const notes = [];
  if (!raw) {
    return {
      raw: '',
      ok: false,
      verb: null,
      object: null,
      metric: null,
      horizon: null,
      measurable: false,
      clarity: 'low',
      themes: [],
      notes: ['empty'],
    };
  }

  const lower = raw.toLowerCase();
  let verb = null;
  for (const v of VERBS) {
    const re = new RegExp(`\\b${v}(?:s|ed|ing)?\\b`, 'i');
    if (re.test(lower)) {
      verb = v;
      break;
    }
  }
  if (!verb) notes.push('no_action_verb');

  const metricMatch = raw.match(
    /\b(\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*[x×]|\d[\d,]*(?:\.\d+)?(?:\s*(?:customers?|users?|logos?|seats?|deals?|hires?|weeks?|days?|months?))?|\$\d[\d,]*(?:\.\d+)?[kKmMbB]?)\b/,
  );
  const metric = metricMatch ? metricMatch[0].trim() : null;
  if (!metric) notes.push('no_metric');

  let horizon = null;
  if (/\b90[\s-]?days?\b/i.test(raw) || /\bfirst quarter\b/i.test(raw) || /\bQ1\b/i.test(raw)) horizon = '90d';
  else if (/\b\d+\s*(?:weeks?|months?|days?)\b/i.test(raw)) {
    const h = raw.match(/\b(\d+\s*(?:weeks?|months?|days?))\b/i);
    horizon = h ? h[1].toLowerCase() : 'stated';
  } else notes.push('no_explicit_horizon');

  let object = raw;
  if (verb) {
    object = raw.replace(new RegExp(`^.*?\\b${verb}(?:s|ed|ing)?\\b\\s*`, 'i'), '').trim();
  }
  object = object.replace(/\bin (?:the )?(?:first )?90 days\.?$/i, '').trim() || null;

  const themes = [];
  if (/\b(billing|payments?|checkout|invoice)\b/i.test(raw)) themes.push('billing');
  if (/\b(onboard|activation|signup|conversion)\b/i.test(raw)) themes.push('activation');
  if (/\b(infra|latency|reliability|uptime|migrate|kubernetes|platform)\b/i.test(raw)) themes.push('infrastructure');
  if (/\b(hire|recruit|headcount|team)\b/i.test(raw)) themes.push('hiring');
  if (/\b(revenue|pipeline|arr|mrr|sales|gtm)\b/i.test(raw)) themes.push('gtm');
  if (/\b(security|soc\s*2|compliance|auth)\b/i.test(raw)) themes.push('security');
  if (/\b(ml|model|ai|llm|agent)\b/i.test(raw)) themes.push('ai');
  if (/\b(design|ux|ui|product)\b/i.test(raw)) themes.push('product');

  const measurable = !!(metric || (verb && object && object.length > 8));
  let clarity = 'low';
  if (verb && object && metric) clarity = 'high';
  else if (verb && object) clarity = 'medium';
  else if (raw.length >= 40 && measurable) clarity = 'medium';

  return {
    raw,
    ok: clarity !== 'low',
    verb,
    object: object ? object.slice(0, 160) : null,
    metric,
    horizon,
    measurable,
    clarity,
    themes,
    notes,
  };
}

export function gradeOutcomeText(text) {
  const p = parseOutcome(text);
  return {
    ...p,
    suggestions: [
      !p.verb ? 'Lead with an action verb (ship, launch, reduce, hire…).' : null,
      !p.metric ? 'Add one number or measurable result.' : null,
      !p.horizon ? 'Optional: add a realistic horizon (for example, 30, 60, or 90 days).' : null,
      p.object && p.object.length < 12 ? 'Name the concrete deliverable or system.' : null,
    ].filter(Boolean),
  };
}

function selftest() {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const a = parseOutcome('Ship multi-tenant billing v1 to first 10 customers in 90 days');
  assert(a.verb === 'ship', `verb ${a.verb}`);
  assert(a.metric && /10/.test(a.metric), 'metric');
  assert(a.horizon === '90d', 'horizon');
  assert(a.clarity === 'high', a.clarity);
  assert(a.themes.includes('billing'), 'theme');
  const b = parseOutcome('be a rockstar ninja');
  assert(b.clarity === 'low', 'low clarity fluff');
  const c = gradeOutcomeText('Improve onboarding activation');
  assert(c.suggestions.length >= 1, 'suggestions');
  console.log(JSON.stringify({ ok: true, selftest: 'outcome-grammar', sample: a }));
}

function main() {
  if (process.argv.includes('--selftest')) return selftest();
  const eq = process.argv.find((a) => a.startsWith('--text='));
  const text = eq ? eq.slice('--text='.length) : process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ');
  if (!text) {
    console.error('usage: --text="…" | --selftest');
    process.exit(2);
  }
  console.log(JSON.stringify(gradeOutcomeText(text), null, 2));
}

if (isMain) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}
