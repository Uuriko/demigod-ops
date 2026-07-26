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

// SmartRecruiters — companyId is a readable id (e.g. "Visa"), NOT the domain label. content[] paginated.
export async function smartrecruiters(slug) {
  const d = await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=100`);
  if (!d || !Array.isArray(d.content)) return { ok: false, roles: [] };
  return {
    ok: true,
    roles: d.content.map((p) => ({
      jobId: String(p.id) /*V*/,
      title: p.name || '' /*V*/,
      location: p.location?.fullLocation || [p.location?.city, p.location?.region, p.location?.country].filter(Boolean).join(', ') /*V*/,
      url: p.ref || `https://jobs.smartrecruiters.com/${slug}/${p.id}`,
      nativePostedAt: toDate(p.releasedDate) /*V*/,
      nativeDateField: 'releasedDate',
    })),
  };
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
  if (!xml || !/<position\b/i.test(xml)) return { ok: false, roles: [] };
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
  // pure normalization is exercised by the live-fixture test in demigod-role-ledger; here just assert
  // the honesty contract: a null/garbled fetch yields ok:false (never an empty-but-ok board).
  const orig = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false });
  for (const [name, fn] of Object.entries(NEW_PROVIDERS)) { const r = await fn('x'); assert(r.ok === false && r.roles.length === 0, `${name}: failed fetch → ok:false`); }
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '<x/>' });
  for (const [name, fn] of Object.entries(NEW_PROVIDERS)) { const r = await fn('x'); assert(r.ok === false, `${name}: no job array → ok:false (not a false-empty board)`); }
  globalThis.fetch = orig;
  console.log(JSON.stringify({ ok: true, selftest: 'ats-providers' }));
}
