#!/usr/bin/env node
// Shared ATS board adapters for the 4 providers added 2026-07-26 (SmartRecruiters, Workable,
// Recruitee, Personio) — beyond the original Greenhouse/Lever/Ashby. Each is public + no-auth.
// One home so the role-ledger and the jobs-enrich can't drift on provider logic.
//
// Each adapter: async (slug) => { ok, roles: [{ jobId, title, location, url, nativePostedAt,
// nativeDateField }] }. ok:true ONLY on a valid parsed job array (mirrors the ledger's honesty rule:
// a failed/garbled fetch must never look like an empty board, or it would false-close every role).
//
// Field paths marked /*V*/ are confirmed against a live response; others are from documented patterns
// and are refined against codex's live verification (scratchpad/codex-ats-out.txt) + selftest fixtures.
const TIMEOUT = 8000;

const toDate = (x) => { if (x == null) return null; const d = typeof x === 'number' ? new Date(x) : new Date(String(x)); return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10); };

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
  const roles = []; const LIMIT = 100;
  for (let offset = 0; offset < 5000; offset += LIMIT) {
    const d = await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${LIMIT}&offset=${offset}`);
    if (!d || !Array.isArray(d.content)) return { ok: false, roles: [] };
    for (const p of d.content) roles.push({
      jobId: String(p.id) /*V*/,
      title: p.name || '' /*V*/,
      location: p.location?.fullLocation || [p.location?.city, p.location?.region, p.location?.country].filter(Boolean).join(', ') /*V*/,
      url: p.ref || `https://jobs.smartrecruiters.com/${slug}/${p.id}`,
      nativePostedAt: toDate(p.releasedDate) /*V*/,
      nativeDateField: 'releasedDate',
    });
    if (d.content.length < LIMIT || (Number.isFinite(d.totalFound) && offset + d.content.length >= d.totalFound)) break;
  }
  return { ok: true, roles };
}

// Workable — widget account endpoint. account = careers subdomain.
export async function workable(slug) {
  const d = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`);
  const jobs = Array.isArray(d?.jobs) ? d.jobs : null;
  if (!jobs) return { ok: false, roles: [] };
  return {
    ok: true,
    roles: jobs.map((j) => ({
      jobId: String(j.shortcode || j.id),
      title: j.title || '',
      location: [j.city || j.location?.city, j.country || j.location?.country].filter(Boolean).join(', '),
      url: j.url || j.application_url || j.shortlink || '',
      nativePostedAt: toDate(j.published_on || j.created_at),
      nativeDateField: 'published_on',
    })),
  };
}

// Recruitee — company careers subdomain. offers[].
export async function recruitee(slug) {
  const d = await getJson(`https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`);
  const offers = Array.isArray(d?.offers) ? d.offers : null;
  if (!offers) return { ok: false, roles: [] };
  return {
    ok: true,
    roles: offers.map((o) => ({
      jobId: String(o.id),
      title: o.title || o.position || '',
      location: [o.city, o.country_code || o.country].filter(Boolean).join(', ') || o.location || '',
      url: o.careers_url || o.careers_apply_url || '',
      nativePostedAt: toDate(o.published_at || o.created_at),
      nativeDateField: 'published_at',
    })),
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
  if (!xml || !/<workzag-jobs\b/i.test(xml)) return { ok: false, roles: [] };
  const blocks = xml.match(/<position\b[\s\S]*?<\/position>/gi) || [];
  return {
    ok: true,
    roles: blocks.map((b) => ({
      jobId: xmlTag(b, 'id'),
      title: xmlTag(b, 'name'),
      location: xmlTag(b, 'office') || xmlTag(b, 'city'),
      url: `https://${slug}.jobs.personio.de/job/${xmlTag(b, 'id')}`,
      nativePostedAt: toDate(xmlTag(b, 'createdAt') || xmlTag(b, 'created_at')),
      nativeDateField: 'createdAt',
    })).filter((r) => r.jobId),
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
  let r = await smartrecruiters('x'); assert(r.ok && r.roles[0].jobId === '1' && r.roles[0].title === 'Eng' && r.roles[0].location === 'SF, CA' && r.roles[0].nativePostedAt === '2026-06-01', 'SmartRecruiters field map');
  mock({ jobs: [{ shortcode: 'AB', title: 'Eng', city: 'Boston', country: 'US', url: 'u', published_on: '2026-05-01' }] });
  r = await workable('x'); assert(r.ok && r.roles[0].jobId === 'AB' && r.roles[0].title === 'Eng' && r.roles[0].location.includes('Boston') && r.roles[0].nativePostedAt === '2026-05-01', 'Workable field map');
  mock({ offers: [{ id: 5, title: 'Eng', city: 'SF', country_code: 'US', careers_url: 'u', published_at: '2026-04-01' }] });
  r = await recruitee('x'); assert(r.ok && r.roles[0].jobId === '5' && r.roles[0].location.includes('SF') && r.roles[0].url === 'u' && r.roles[0].nativePostedAt === '2026-04-01', 'Recruitee field map');
  mock('<workzag-jobs><position><id>9</id><name>Eng</name><office>SF</office><createdAt>2026-03-01</createdAt></position></workzag-jobs>');
  r = await personio('x'); assert(r.ok && r.roles[0].jobId === '9' && r.roles[0].title === 'Eng' && r.roles[0].location === 'SF' && r.roles[0].nativePostedAt === '2026-03-01', 'Personio field map + XML parse');

  // FIX: Personio empty-but-valid feed → ok:true (so the ledger closes those roles, not a false-fail)
  mock('<workzag-jobs></workzag-jobs>');
  r = await personio('x'); assert(r.ok === true && r.roles.length === 0, 'Personio empty feed → ok:true, not false-fail');
  // FIX: SmartRecruiters pagination collects all pages (no >100 truncation → no false-close)
  { let call = 0; globalThis.fetch = async () => ({ ok: true, json: async () => (call++ === 0 ? { content: Array.from({ length: 100 }, (_, i) => ({ id: i })), totalFound: 150, limit: 100 } : { content: Array.from({ length: 50 }, (_, i) => ({ id: 100 + i })), totalFound: 150, limit: 100 }) }); }
  r = await smartrecruiters('x'); assert(r.ok && r.roles.length === 150, `SmartRecruiters paginates all 150 (got ${r.roles.length})`);

  globalThis.fetch = orig;
  console.log(JSON.stringify({ ok: true, selftest: 'ats-providers' }));
}
