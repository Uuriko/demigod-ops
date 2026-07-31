#!/usr/bin/env node
/**
 * demigod-public-comp — Levels-shaped thin: extract public job-post pay bands.
 *
 * Pure quote extraction from JD paste / ATS body, or operator-supplied public URL
 * (SSRF-safe https fetch). Never scrapes Levels personal submissions.
 * Never invents a band without a quote.
 *
 *   node demigod-public-comp.mjs extract --text="…" [--url=https://…]
 *   node demigod-public-comp.mjs extract --fetch-url=https://…   # network
 *   node demigod-public-comp.mjs apply --role=ID --url=https://… --text="…"
 *   node demigod-public-comp.mjs apply --role=ID --fetch-url=https://…
 *   node demigod-public-comp.mjs --selftest
 *
 * Apply writes via demigod-role-packet setCompBand (source=public_job_post).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCompRange } from './demigod-matching-engine.mjs';
import { safeResearchUrl } from './demigod-evidence.mjs';
import {
  loadPackets,
  setCompBand,
  upsertPacket,
} from './demigod-role-packet.mjs';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const MAX_FETCH_BYTES = 400_000;
const FETCH_MS = 12_000;

/**
 * Find salary-band spans in free text. Returns DIE-shaped quote candidates
 * (exact substrings from input — not rewritten).
 */
export function extractPublicCompQuotes(text) {
  const src = String(text || '');
  if (!src.trim()) return [];
  const patterns = [
    // Salary / OTE / total cash / equity cash grant / RSU / target bonus (public JD only; never %)
    /(?:salary|compensation|base(?:\s+pay)?|pay|ote|on[- ]?target earnings|total cash|annual(?:\s+(?:salary|pay|compensation))?|equity(?:\s+\w+){0,3}|rsus?(?:\s+\w+){0,2}|target bonus|signing bonus|annual bonus)\s*(?:range|band|valued at|of)?\s*[:\-]?\s*(\$?\s*[\d,.]+\s*[kKmM]?(?:\s*(?:to|–|-|—)\s*\$?\s*[\d,.]+\s*[kKmM]?)?(?:\s*(?:USD|usd|\/\s*yr|\/\s*year|per year))?)/gi,
    // $180,000 – $220,000 / $180k-$220k
    /(\$\s*[\d,.]+\s*[kKmM]?\s*(?:to|–|-|—)\s*\$?\s*[\d,.]+\s*[kKmM]?(?:\s*(?:USD|usd|\/\s*yr|\/\s*year|per year))?)/gi,
    // single: $180,000 USD / $180k base / OTE $200k / Equity $50k
    /(?:salary|compensation|base|ote|total cash|equity|rsus?|target bonus|signing bonus)\s*[:\-]?\s*(\$\s*[\d,.]+\s*[kKmM]?(?:\s*(?:USD|usd|\/\s*yr|\/\s*year))?)/gi,
  ];
  const seenQuote = new Set();
  const byBand = new Map(); // unit|min|max → best hit (prefer keyword-rich longer quote)
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      // Prefer full match when it starts with salary keyword; else capture group.
      let quote = (m[0] || '').replace(/\s+/g, ' ').trim();
      if (quote.length > 280) quote = quote.slice(0, 280);
      if (quote.length < 8) continue;
      const qk = quote.toLowerCase();
      if (seenQuote.has(qk)) continue;
      // Must parse as a real range (refuse "competitive")
      const parsed = parseCompRange(quote);
      if (!parsed || !Number.isFinite(parsed.min)) continue;
      seenQuote.add(qk);
      const max = Number.isFinite(parsed.max) ? parsed.max : null;
      const bandKey = `${parsed.unit}|${parsed.min}|${max}`;
      const hit = {
        quote,
        parsed: { unit: parsed.unit, min: parsed.min, max },
        bandText: formatBand(parsed),
      };
      const prev = byBand.get(bandKey);
      if (!prev || quoteScore(hit.quote) > quoteScore(prev.quote)) byBand.set(bandKey, hit);
    }
  }
  const hits = [...byBand.values()];
  // Drop point bands when a wider range shares the same unit+min (e.g. "OTE $200k" under "OTE $200k–$250k").
  return hits.filter((h) => {
    const max = h.parsed.max;
    if (max != null && max !== h.parsed.min) return true;
    return !hits.some(
      (o) =>
        o !== h &&
        o.parsed.unit === h.parsed.unit &&
        o.parsed.min === h.parsed.min &&
        o.parsed.max != null &&
        o.parsed.max > h.parsed.min,
    );
  });
}

/** Prefer OTE/salary/equity-cash keyword spans over bare $ranges; then longer exact quote. */
function quoteScore(quote) {
  const q = String(quote || '').toLowerCase();
  let s = q.length;
  if (/\b(ote|salary|compensation|base|total cash|annual|equity|rsu|bonus)\b/.test(q)) s += 50;
  return s;
}

/** Prefer annual bands over hourly when operator leaves pick default (JD often lists both). */
export function pickPublicCompHit(hits, pick = 0) {
  const list = Array.isArray(hits) ? hits : [];
  if (!list.length) return null;
  const annual = list.filter((h) => h?.parsed?.unit === 'annual');
  const pool = annual.length ? annual : list;
  const i = Math.max(0, Math.min(pool.length - 1, pick | 0));
  return pool[i];
}

function formatBand(parsed) {
  if (!parsed) return '';
  const fmt = (n) => {
    if (!Number.isFinite(n)) return '';
    if (n >= 1000 && n % 1000 === 0 && n < 1e6) return `$${n / 1000}k`;
    if (n >= 1e6) return `$${n / 1e6}M`;
    return `$${n.toLocaleString('en-US')}`;
  };
  if (parsed.unit === 'hourly') {
    const max = Number.isFinite(parsed.max) ? parsed.max : parsed.min;
    return parsed.min === max ? `$${parsed.min}/hr` : `$${parsed.min}–$${max}/hr`;
  }
  const max = Number.isFinite(parsed.max) ? parsed.max : null;
  if (max == null || max === parsed.min) return fmt(parsed.min);
  if (parsed.min === 0) return `up to ${fmt(max)}`;
  return `${fmt(parsed.min)}–${fmt(max)}`;
}

/** https-only + DIE safeResearchUrl (blocks localhost/private IP/userinfo). */
export function assertPublicJobUrl(url) {
  const raw = String(url || '').trim();
  if (!/^https:\/\//i.test(raw) || /@/.test(raw)) {
    throw new Error('public_comp_url_required_https');
  }
  const safe = safeResearchUrl(raw);
  if (!safe || !safe.startsWith('https://')) throw new Error('public_comp_url_unsafe');
  return safe;
}

/** Strip HTML/scripts to plain-ish text for quote search (not a full readability engine). */
export function htmlToPlain(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch operator-supplied public job URL (network). SSRF-safe, size-capped.
 * Returns { url, text, bytes } — never invents quotes.
 */
export async function fetchPublicJobText(url, { timeoutMs = FETCH_MS } = {}) {
  const safe = assertPublicJobUrl(url);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(safe, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'DemigodPublicComp/1 (+https://www.trydemigod.com; public job-post band extract)',
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
      },
    });
    if (!res.ok) throw new Error(`public_comp_fetch_http_${res.status}`);
    const finalUrl = assertPublicJobUrl(res.url || safe);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_FETCH_BYTES) throw new Error('public_comp_fetch_too_large');
    const ctype = String(res.headers.get('content-type') || '').toLowerCase();
    let text = buf.toString('utf8');
    if (ctype.includes('html') || /<\/?[a-z][\s\S]*>/i.test(text.slice(0, 2000))) {
      text = htmlToPlain(text);
    }
    if (text.length < 20) throw new Error('public_comp_fetch_empty');
    return { url: finalUrl, text: text.slice(0, 200_000), bytes: buf.length };
  } finally {
    clearTimeout(t);
  }
}

/** Build setCompBand args from best extract + required public URL. */
export function toPublicCompBand({ text, url, pick = 0 } = {}) {
  const hits = extractPublicCompQuotes(text);
  if (!hits.length) throw new Error('no_public_comp_quote');
  const hit = pickPublicCompHit(hits, pick);
  if (!hit) throw new Error('no_public_comp_quote');
  const u = assertPublicJobUrl(url);
  // DIE quote for public_job_post: prefer the raw match (≤280, ≥8 already).
  let quote = hit.quote;
  if (quote.length > 280) quote = quote.slice(0, 280);
  const annual = hits.filter((h) => h?.parsed?.unit === 'annual');
  const pool = annual.length ? annual : hits;
  const i = Math.max(0, pool.indexOf(hit));
  return {
    text: hit.bandText || hit.quote,
    source: 'public_job_post',
    url: u,
    quote,
    candidates: hits.length,
    pick: i,
  };
}

export function applyToPacket(roleId, { text, url, pick = 0 } = {}) {
  const id = String(roleId || '').trim();
  if (!id) throw new Error('roleId required');
  const packet = loadPackets().packets[id];
  if (!packet) throw new Error(`packet_not_found:${id}`);
  const band = toPublicCompBand({ text, url, pick });
  const next = setCompBand(packet, {
    text: band.text,
    source: band.source,
    url: band.url,
    quote: band.quote,
  });
  upsertPacket(next);
  return { ok: true, roleId: id, compBand: next.compBand, candidates: band.candidates };
}

export async function applyFromUrl(roleId, fetchUrl, { pick = 0 } = {}) {
  const fetched = await fetchPublicJobText(fetchUrl);
  return {
    ...applyToPacket(roleId, { text: fetched.text, url: fetched.url, pick }),
    fetchedBytes: fetched.bytes,
  };
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`public-comp selftest: ${m}`);
  };
  const body =
    'We are hiring a Founding Engineer in SF. Salary range $180,000 to $220,000 USD plus equity. Competitive benefits.';
  const hits = extractPublicCompQuotes(body);
  assert(hits.length >= 1, 'extract');
  assert(/180/.test(hits[0].quote) && /220/.test(hits[0].quote), 'quote span');
  assert(hits[0].parsed.min === 180000 && hits[0].parsed.max === 220000, 'parsed');
  const band = toPublicCompBand({
    text: body,
    url: 'https://boards.greenhouse.io/demo/jobs/1',
  });
  assert(band.source === 'public_job_post', 'source');
  assert(band.quote.includes('180'), 'band quote');
  let threw = false;
  try {
    toPublicCompBand({ text: 'competitive package', url: 'https://example.com/job' });
  } catch {
    threw = true;
  }
  assert(threw, 'refuse competitive');
  threw = false;
  try {
    toPublicCompBand({ text: body, url: 'http://insecure.example/j' });
  } catch {
    threw = true;
  }
  assert(threw, 'https only');
  const k = extractPublicCompQuotes('Base pay $160k–$190k. More text.');
  assert(k.length >= 1 && k[0].parsed.min === 160000, 'k form');
  const ote = extractPublicCompQuotes('Role in SF. OTE $200k–$250k plus equity.');
  assert(ote.length === 1 && ote[0].parsed.min === 200000 && ote[0].parsed.max === 250000, 'OTE range deduped to one band');
  assert(/ote/i.test(ote[0].quote), 'prefer keyword OTE quote over bare $ range');
  const tc = extractPublicCompQuotes('Total cash: $145,000 to $175,000 USD per year.');
  assert(tc.length === 1 && tc[0].parsed.min === 145000, 'total cash one band');
  assert(extractPublicCompQuotes('Competitive OTE package').length === 0, 'refuse competitive OTE');
  const eq = extractPublicCompQuotes('Equity grant valued at $40,000 to $80,000 USD. Base separate.');
  assert(eq.length >= 1 && eq[0].parsed.min === 40000 && eq[0].parsed.max === 80000, 'equity cash grant');
  assert(/equity/i.test(eq[0].quote), 'equity keyword in quote');
  const rsu = extractPublicCompQuotes('RSU award $50k–$100k over 4 years.');
  assert(rsu.length >= 1 && rsu[0].parsed.min === 50000 && rsu[0].parsed.max === 100000, 'RSU cash range');
  const bonus = extractPublicCompQuotes('Target bonus $20,000 to $30,000 per year.');
  assert(bonus.length >= 1 && bonus[0].parsed.min === 20000, 'target bonus');
  assert(
    extractPublicCompQuotes('Base $200k + equity').some((h) => h.parsed.min === 200000 && h.parsed.max === 200000),
    'trailing + equity still strips to base band',
  );
  assert(extractPublicCompQuotes('Equity $40k-$80k')[0]?.parsed?.min === 40000, 'leading equity cash parses');
  const mixed = extractPublicCompQuotes('Pay $75/hr contract. Salary range $150,000 to $180,000 USD full-time.');
  const preferred = pickPublicCompHit(mixed, 0);
  assert(preferred?.parsed?.unit === 'annual' && preferred.parsed.min === 150000, 'prefer annual over hourly');
  threw = false;
  try {
    assertPublicJobUrl('http://example.com/job');
  } catch {
    threw = true;
  }
  assert(threw, 'http refused');
  threw = false;
  try {
    assertPublicJobUrl('https://127.0.0.1/job');
  } catch {
    threw = true;
  }
  assert(threw, 'loopback refused');
  const plain = htmlToPlain(
    '<html><script>x</script><p>Salary range $100,000 to $120,000 USD</p></html>',
  );
  assert(plain.includes('Salary range') && !plain.includes('script'), 'html strip');
  assert(extractPublicCompQuotes(plain).length >= 1, 'html extract');
  console.log(JSON.stringify({ ok: true, selftest: 'public-comp', hits: hits.length }));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest') || args[0] === 'selftest') {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-public-comp.mjs extract|apply [--text=] [--url=] [--fetch-url=] [--role=] [--pick=0]
  extract  pure quote candidates from JD text (or --fetch-url public page)
  apply    set-comp on a RolePacket (source=public_job_post; requires https url + quote)
Policy: public job post only; no Levels personal scrape; no invented bands; SSRF-safe fetch.`);
    return;
  }
  const get = (k) => {
    const eq = args.find((a) => a.startsWith(`--${k}=`));
    if (eq) return eq.slice(k.length + 3);
    const i = args.indexOf(`--${k}`);
    if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1];
    return null;
  };
  const cmd = args.find((a) => !a.startsWith('-')) || 'extract';
  let text = get('text') || '';
  let url = get('url');
  const fetchUrl = get('fetch-url') || get('fetchUrl');
  const pick = Number(get('pick') || 0);

  if (fetchUrl) {
    try {
      const fetched = await fetchPublicJobText(fetchUrl);
      text = fetched.text;
      url = url || fetched.url;
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
      return;
    }
  }

  if (cmd === 'apply') {
    try {
      const out = applyToPacket(get('role'), { text, url, pick });
      console.log(JSON.stringify(out, null, 2));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  // extract
  try {
    const hits = extractPublicCompQuotes(text);
    const payload = {
      ok: true,
      hits,
      ready: null,
      fetched: fetchUrl ? { url, chars: text.length } : null,
    };
    if (url && hits.length) {
      try {
        payload.ready = toPublicCompBand({ text, url, pick });
      } catch (e) {
        payload.readyError = String(e.message || e);
      }
    }
    console.log(JSON.stringify(payload, null, 2));
    process.exit(hits.length ? 0 : 1);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }
}

if (isMain) main();
