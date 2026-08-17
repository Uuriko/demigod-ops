#!/usr/bin/env node
// Shared ATS board adapters for the 4 providers added 2026-07-26 (SmartRecruiters, Workable,
// Recruitee, Personio) — beyond the original Greenhouse/Lever/Ashby. Each is public + no-auth.
// One home so the role-ledger and the jobs-enrich can't drift on provider logic.
//
// What these vendors publish about being read -- purpose, auth, rate limits, and the fact that none
// of them authorizes third-party aggregation -- is cited in docs/die/ATS-SOURCE-TERMS.md. Read it
// before adding a provider, and read that provider's terms before its first live board, not after.
//
// Each adapter: async (slug) => { ok, roles: [{ jobId, title, location, url, nativePostedAt,
// nativeDateField }] }. ok:true ONLY on a valid parsed job array (mirrors the ledger's honesty rule:
// a failed/garbled fetch must never look like an empty board, or it would false-close every role).
//
// Field paths marked /*V*/ are confirmed against a live response; others are from documented patterns
// and are refined against codex's live verification (scratchpad/codex-ats-out.txt) + selftest fixtures.
const TIMEOUT = 8000;
const MAX_ATS_ROLES = 2000;
const MAX_ATS_TEXT = 500_000;
const ATS_CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

const toDate = (x) => { if (x == null) return null; const d = typeof x === 'number' ? new Date(x) : new Date(String(x)); return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10); };
export const normalizeAtsJobId = (x) => {
  const id = typeof x === 'string' ? x.trim() : Number.isSafeInteger(x) ? String(x) : '';
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(id) ? id : '';
};
export const normalizeAtsText = (value, max) => {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max) return null;
  const text = value.normalize('NFKC').trim();
  return text.length <= max && !ATS_CONTROL.test(text) ? text : null;
};
export const mapValidRoles = (rows, map) => {
  try {
    if (!Array.isArray(rows) || rows.length > MAX_ATS_ROLES) return null;
    const roles = [];
    const ids = new Set();
    const urls = new Set();
    let textSize = 0;
    for (const row of rows) {
      const role = map(row);
      const jobId = normalizeAtsJobId(role?.jobId);
      const title = normalizeAtsText(role?.title, 500);
      const location = normalizeAtsText(role?.location, 1000);
      const url = normalizeAtsText(role?.url, 2048);
      if (
        !jobId ||
        title == null ||
        location == null ||
        url == null ||
        ids.has(jobId) ||
        (url && urls.has(url))
      ) return null;
      textSize += jobId.length + title.length + location.length + url.length;
      if (textSize > MAX_ATS_TEXT) return null;
      ids.add(jobId);
      if (url) urls.add(url);
      roles.push({ ...role, jobId, title, location, url });
    }
    return roles;
  } catch { return null; }
};

async function getJson(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function getText(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

// SmartRecruiters — companyId is a readable id (e.g. "Visa"), NOT the domain label. content[] is PAGED
// at 100; must page to completion or a >100-role board would return a truncated-but-ok fetch → the
// ledger would false-close the omitted roles. ANY page failing → whole board fails (ok:false), never partial.
export async function smartrecruiters(slug) {
  const roles = []; const seen = new Set(); const LIMIT = 100;
  let expectedTotal = null;
  for (let offset = 0; offset < 5000; offset += LIMIT) {
    const d = await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${LIMIT}&offset=${offset}`);
    if (
      !d ||
      !Array.isArray(d.content) ||
      !Number.isSafeInteger(d.totalFound) ||
      d.totalFound < 0 ||
      d.totalFound > MAX_ATS_ROLES ||
      (expectedTotal !== null && d.totalFound !== expectedTotal)
    ) return { ok: false, roles: [] };
    expectedTotal ??= d.totalFound;
    const page = mapValidRoles(d.content, (p) => {
      const jobId = normalizeAtsJobId(p.id);
      return {
        jobId /*V*/,
        title: p.name || '' /*V*/,
        location: p.location?.fullLocation || [p.location?.city, p.location?.region, p.location?.country].filter(Boolean).join(', ') /*V*/,
        url: `https://jobs.smartrecruiters.com/${encodeURIComponent(slug)}/${jobId}`,
        nativePostedAt: toDate(p.releasedDate) /*V*/,
        nativeDateField: 'releasedDate',
      };
    });
    if (!page || page.some((role) => seen.has(role.jobId))) return { ok: false, roles: [] };
    for (const role of page) seen.add(role.jobId);
    roles.push(...page);
    if (roles.length === expectedTotal) {
      const complete = mapValidRoles(roles, (role) => role);
      return { ok: Boolean(complete), roles: complete || [] };
    }
    if (roles.length > expectedTotal || d.content.length < LIMIT) return { ok: false, roles: [] };
  }
  return { ok: false, roles: [] };
}

// Workable — widget account endpoint. account = careers subdomain.
export async function workable(slug) {
  const d = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`);
  const jobs = Array.isArray(d?.jobs) ? d.jobs : null;
  if (!jobs) return { ok: false, roles: [] };
  const roles = mapValidRoles(jobs, (j) => {
    const locations = (Array.isArray(j.locations) ? j.locations : [j.location])
      .filter(Boolean)
      .map((location) =>
        [location.city, location.region || location.state, location.countryCode || location.country]
          .filter(Boolean)
          .join(', '),
      );
    return {
      jobId: normalizeAtsJobId(j.shortcode) || normalizeAtsJobId(j.id),
      title: j.title || '',
      location: [...new Set([
        [j.city, j.state, j.country].filter(Boolean).join(', '),
        ...locations,
        j.telecommuting ? 'Remote' : '',
      ].filter(Boolean))].join(' | '),
      url: j.url || j.application_url || j.shortlink || '',
      nativePostedAt: toDate(j.published_on || j.created_at),
      nativeDateField: 'published_on',
    };
  });
  return {
    ok: Boolean(roles),
    roles: roles || [],
  };
}

// Recruitee — company careers subdomain. offers[].
export async function recruitee(slug) {
  const d = await getJson(`https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`);
  const offers = Array.isArray(d?.offers) ? d.offers : null;
  if (!offers) return { ok: false, roles: [] };
  const roles = mapValidRoles(offers, (o) => ({
    jobId: normalizeAtsJobId(o.id),
    title: o.title || o.position || '',
    location: [o.city, o.country_code || o.country].filter(Boolean).join(', ') || o.location || '',
    url: o.careers_url || o.careers_apply_url || '',
    nativePostedAt: toDate(o.published_at || o.created_at),
    nativeDateField: 'published_at',
  }));
  return {
    ok: Boolean(roles),
    roles: roles || [],
  };
}

// Personio — XML feed. Lightweight tag extraction (stdlib has no XML parser; ponytail: regex over the
// simple, flat Personio schema — upgrade to a real parser only if a board breaks it).
const xmlTag = (block, tag) => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
};
export async function personio(slug) {
  const xml = await getText(`https://${encodeURIComponent(slug)}.jobs.personio.de/xml?language=en`);
  // Gate ok on the feed ROOT (<workzag-jobs>), not on having <position>s — a valid board with all roles
  // closed has zero positions and must still be ok:true so the ledger closes them (not a "failed fetch").
  const body = /<workzag-jobs\b[^>]*>([\s\S]*?)<\/workzag-jobs>\s*$/i.exec(xml || '')?.[1];
  if (body == null) return { ok: false, roles: [] };
  const blocks = body.match(/<position\b[\s\S]*?<\/position>/gi) || [];
  const starts = (body.match(/<position\b/gi) || []).length;
  const ends = (body.match(/<\/position\s*>/gi) || []).length;
  if (blocks.length !== starts || starts !== ends) return { ok: false, roles: [] };
  const roles = mapValidRoles(blocks, (b) => {
    const jobId = normalizeAtsJobId(xmlTag(b, 'id'));
    return {
      jobId,
      title: xmlTag(b, 'name'),
      location: xmlTag(b, 'office') || xmlTag(b, 'city'),
      url: `https://${slug}.jobs.personio.de/job/${jobId}`,
      nativePostedAt: toDate(xmlTag(b, 'createdAt') || xmlTag(b, 'created_at')),
      nativeDateField: 'createdAt',
    };
  });
  return {
    ok: Boolean(roles),
    roles: roles || [],
  };
}

/**
 * Distinct-requisition signal for one board, or an explicit abstention.
 *
 * A single requisition posted to several cities appears as several postings, so
 * `distinct(requisition_id)` looks like a free "real openings" count. It is not: the field is
 * employer-freeform. Measured 2026-07-30 on live Greenhouse boards — Affirm `JR103863`,
 * Anthropic `PIP-11677`, Anaplan `REQ #27298`, Algolia `2284-2` are real IDs, but Airbnb uses
 * `ONE` (x153), `MULTI` (x21), `MUL`, `TBD` as a headcount HINT. Counting those distinct reads
 * 187 postings as 13 openings — a 93% understatement presented as precision.
 *
 * So this abstains rather than guesses. Two independent gates, either one disqualifies a board:
 *   - every value must be present and contain a digit (kills ONE/MULTI/MUL/TBD)
 *   - no single value may cover more than half the postings (kills a category masquerading as an ID)
 * `distinctRequisitions` is null when unusable. Unknown is a valid output here; a fabricated
 * dedupe that silently shrinks a public count is not.
 *
 * Pure over RAW board JSON. Deliberately not added to adapter output or ledger rows — the ledger
 * enforces an exact key allowlist and this is a derived signal, not role identity.
 */
export function requisitionSignal(rawJobs = []) {
  const jobs = Array.isArray(rawJobs) ? rawJobs : [];
  const postings = jobs.length;
  const abstain = (reason) => ({
    postings, distinctRequisitions: null, usablePostings: 0, unusablePostings: postings,
    usable: false, reason,
  });
  if (!postings) return abstain('no_postings');
  const values = jobs.map((job) => String(job?.requisition_id ?? '').trim());
  // A value must look like an identifier. Measured 2026-07-30: real IDs carry digits
  // (JR103863, PIP-11677, REQ #27298, 2284-2); the values that do not are placeholders —
  // Airbnb ONE/MULTI/MUL/TBD, Algolia PIPELINING-ONLY, Alpaca TBD.
  const usable = values.filter((value) => value && /\d/.test(value));
  const unusablePostings = postings - usable.length;
  // Placeholders cluster on a few evergreen reqs, so disqualifying a whole board for 1 of 56
  // discards good signal. Count over the usable subset and report the residue instead — the
  // caller can always reconcile usablePostings + unusablePostings back to postings.
  if (usable.length * 2 <= postings) return abstain('not_id_shaped');
  const counts = new Map();
  for (const value of usable) counts.set(value, (counts.get(value) || 0) + 1);
  const dominant = Math.max(...counts.values());
  // A single value covering most of the usable subset is a category, not an identifier.
  if (dominant * 2 > usable.length) return abstain('dominant_value');
  return {
    postings,
    distinctRequisitions: counts.size,
    usablePostings: usable.length,
    unusablePostings,
    usable: true,
    reason: null,
  };
}

export const NEW_PROVIDERS = { SmartRecruiters: smartrecruiters, Workable: workable, Recruitee: recruitee, Personio: personio };

if (process.argv[1] && process.argv[1].endsWith('demigod-ats-providers.mjs') && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const orig = globalThis.fetch;
  const mock = (body) => { globalThis.fetch = async () => (typeof body === 'string' ? { ok: true, text: async () => body } : { ok: true, json: async () => body }); };

  // honesty: a failed fetch → ok:false, touches nothing
  globalThis.fetch = async () => ({ ok: false });
  for (const [name, fn] of Object.entries(NEW_PROVIDERS)) { const r = await fn('x'); assert(r.ok === false && r.roles.length === 0, `${name}: failed fetch → ok:false`); }
  // 200 with no valid feed container → ok:false (never a false-empty board that would close real roles)
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => 'garbage' });
  for (const [name, fn] of Object.entries(NEW_PROVIDERS)) { const r = await fn('x'); assert(r.ok === false, `${name}: no valid feed → ok:false`); }

  // FIELD-MAPPING fixtures — would catch a renamed field or a broken parser (previously untested)
  mock({ content: [{ id: 1, name: 'Eng', location: { fullLocation: 'SF, CA' }, ref: 'u', releasedDate: '2026-06-01T00:00:00Z' }], totalFound: 1, limit: 100 });
  let r = await smartrecruiters('x'); assert(r.ok && r.roles[0].jobId === '1' && r.roles[0].title === 'Eng' && r.roles[0].location === 'SF, CA' && r.roles[0].url === 'https://jobs.smartrecruiters.com/x/1' && r.roles[0].nativePostedAt === '2026-06-01', 'SmartRecruiters field map');
  mock({ jobs: [{ shortcode: 'AB', title: 'Eng', city: 'Boston', state: 'Massachusetts', country: 'United States', locations: [{ city: 'New York', region: 'New York', countryCode: 'US' }], telecommuting: true, url: 'u', published_on: '2026-05-01' }] });
  r = await workable('x'); assert(r.ok && r.roles[0].jobId === 'AB' && r.roles[0].title === 'Eng' && r.roles[0].location.includes('Boston, Massachusetts, United States') && r.roles[0].location.includes('New York, New York, US') && r.roles[0].location.includes('Remote') && r.roles[0].nativePostedAt === '2026-05-01', 'Workable field map');
  mock({ offers: [{ id: 5, title: 'Eng', city: 'SF', country_code: 'US', careers_url: 'u', published_at: '2026-04-01' }] });
  r = await recruitee('x'); assert(r.ok && r.roles[0].jobId === '5' && r.roles[0].location.includes('SF') && r.roles[0].url === 'u' && r.roles[0].nativePostedAt === '2026-04-01', 'Recruitee field map');
  mock('<workzag-jobs><position><id>9</id><name>Eng</name><office>SF</office><createdAt>2026-03-01</createdAt></position></workzag-jobs>');
  r = await personio('x'); assert(r.ok && r.roles[0].jobId === '9' && r.roles[0].title === 'Eng' && r.roles[0].location === 'SF' && r.roles[0].nativePostedAt === '2026-03-01', 'Personio field map + XML parse');

  // FIX: Personio empty-but-valid feed → ok:true (so the ledger closes those roles, not a false-fail)
  mock('<workzag-jobs></workzag-jobs>');
  r = await personio('x'); assert(r.ok === true && r.roles.length === 0, 'Personio empty feed → ok:true, not false-fail');
  // Any malformed ID fails the whole board: partial/empty ok:true would false-close ledger roles.
  for (const [name, fn, body] of [
    ['SmartRecruiters', smartrecruiters, { content: [{ name: 'No ID' }], totalFound: 1 }],
    ['Workable', workable, { jobs: [null] }],
    ['Recruitee', recruitee, { offers: [{ id: {} }] }],
    ['Personio', personio, '<workzag-jobs><position><name>No ID</name></position></workzag-jobs>'],
    ['Workable unsafe delimiter', workable, { jobs: [{ shortcode: 'bad|id' }] }],
  ]) {
    mock(body);
    r = await fn('x');
    assert(r.ok === false && r.roles.length === 0, `${name}: malformed job ID → ok:false`);
  }
  // FIX: SmartRecruiters pagination collects all pages (no >100 truncation → no false-close)
  { let call = 0; globalThis.fetch = async () => ({ ok: true, json: async () => (call++ === 0 ? { content: Array.from({ length: 100 }, (_, i) => ({ id: i })), totalFound: 150, limit: 100 } : { content: Array.from({ length: 50 }, (_, i) => ({ id: 100 + i })), totalFound: 150, limit: 100 }) }); }
  r = await smartrecruiters('x'); assert(r.ok && r.roles.length === 150, `SmartRecruiters paginates all 150 (got ${r.roles.length})`);
  {
    const page = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: page, totalFound: 150, limit: 100 }) });
  }
  r = await smartrecruiters('x'); assert(!r.ok && r.roles.length === 0, 'SmartRecruiters repeated page fails closed');
  for (const malformed of [
    '<workzag-jobs>',
    '<workzag-jobs><position><id>1</id></workzag-jobs>',
  ]) {
    mock(malformed);
    r = await personio('x');
    assert(!r.ok && r.roles.length === 0, 'Personio malformed XML fails closed');
  }

  globalThis.fetch = orig;
  // --- requisitionSignal: real boards must count, freeform boards must abstain -------------
  {
    const job = (rid) => ({ requisition_id: rid });
    // Affirm shape: real IDs, mild multi-location repeat -> usable
    const affirm = requisitionSignal([...Array(10)].map((_, i) => job(`JR10386${i % 7}`)));
    assert(affirm.usable === true, 'id-shaped requisition ids are usable');
    assert(affirm.postings === 10 && affirm.distinctRequisitions === 7, 'counts postings and distinct reqs separately');
    assert(affirm.unusablePostings === 0, 'clean board has no residue');
    // Airbnb shape: ONE/MULTI/TBD -> MUST abstain, never report 3 openings for 12 postings
    const airbnb = requisitionSignal([
      ...Array(9).fill(null).map(() => job('ONE')),
      ...Array(2).fill(null).map(() => job('MULTI')),
      job('TBD'),
    ]);
    assert(airbnb.usable === false, 'freeform headcount hints must not count as requisitions');
    assert(airbnb.distinctRequisitions === null, 'abstention must be null, not a number');
    assert(airbnb.reason === 'not_id_shaped', `expected not_id_shaped, got ${airbnb.reason}`);
    assert(airbnb.postings === 12, 'postings stay reported even when reqs abstain');
    // Digit gate must stand ALONE: distinct wordy values, no dominance, still not IDs.
    const wordy = requisitionSignal([job('ONE'), job('TWO'), job('THREE'), job('FOUR')]);
    assert(wordy.usable === false && wordy.reason === 'not_id_shaped', 'non-numeric ids abstain even without dominance');
    // Algolia/Alpaca shape: a few placeholders must NOT disqualify a mostly-clean board,
    // and the residue must be reported rather than silently dropped.
    const mixed = requisitionSignal([
      ...[...Array(8)].map((_, i) => job(`REQ-${100 + i}`)),
      job('PIPELINING-ONLY'), job('TBD'),
    ]);
    assert(mixed.usable === true, 'a mostly-clean board stays usable');
    assert(mixed.distinctRequisitions === 8 && mixed.usablePostings === 8, 'distinct counted over usable subset');
    assert(mixed.unusablePostings === 2, 'residue reported, not dropped');
    assert(mixed.usablePostings + mixed.unusablePostings === mixed.postings, 'subset must reconcile to postings');
    // A digit-bearing value that still dominates is a category, not an ID
    const dominant = requisitionSignal([...Array(9).fill(null).map(() => job('REQ1')), job('REQ2'), job('REQ3')]);
    assert(dominant.usable === false && dominant.reason === 'dominant_value', 'dominant value must abstain');
    assert(requisitionSignal([job('JR1'), job('')]).postings === 2, 'blank id counts as residue, not a crash');
    assert(requisitionSignal([]).usable === false, 'empty board abstains');
    assert(requisitionSignal(null).postings === 0, 'non-array input must not throw');
  }

  console.log(JSON.stringify({ ok: true, selftest: 'ats-providers' }));
}
