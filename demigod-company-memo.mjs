#!/usr/bin/env node
/**
 * demigod-company-memo — share-only private research memo (beyond-Clay slice 3).
 *
 * One-pager both sides can read before a conversation. Rendered from a
 * company packet. Not a public page. Not email. Not a CRM write.
 *
 *   node demigod-company-memo.mjs --selftest
 *   node demigod-company-memo.mjs show --id=yc:abundant
 *   node demigod-company-memo.mjs show --id=yc:abundant --out=/tmp/memo.md
 *
 * Schema: demigod.company-memo/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompanyPacket, loadPacketInputs } from './demigod-company-packet.mjs';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const MEMO_SCHEMA = 'demigod.company-memo/1';
const SHARE_PRIVATE = 'private';
const FOOTER = 'Private memo. Not a recommendation.';
const PEER_BASIS_LINE = 'sf-map + roleMix overlap';
const LINE_MAX = 240;
const JOURNAL_KINDS = new Set(['opened', 'closed', 'reopened', 'maintained_stale']);
const FORBIDDEN_RE = /score|recommend|@|mailto:/i;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
const CONTROL_BIDI_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const MD_SPECIAL_RE = /[|*_`[\]]/g;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isDay = (value) =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function busyRoot() {
  return process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
}

/** Local control-safe projector. Do not add a shared sanitizer package. */
function sanitize(value) {
  let text = String(value ?? '');
  text = text.replace(/\r\n|\r|\n/g, ' ');
  text = text.replace(CONTROL_BIDI_RE, '');
  text = text.replace(MD_SPECIAL_RE, '\\$&');
  text = text.replace(/ {2,}/g, ' ').trim();
  if (text.length > LINE_MAX) text = text.slice(0, LINE_MAX);
  return text;
}

function isForbidden(value) {
  const text = String(value ?? '');
  return FORBIDDEN_RE.test(text) || PHONE_RE.test(text);
}

function safeText(value) {
  if (value == null) return '';
  const raw = String(value);
  if (!raw.trim()) return '';
  if (isForbidden(raw)) return '';
  return sanitize(raw);
}

/** HTTPS only, no credentials, no javascript:/mailto:. Bound to 240. */
function safeHref(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return '';
    if (url.username || url.password) return '';
    if (!url.hostname) return '';
    const href = url.href;
    if (!href || href.length > LINE_MAX) return '';
    if (isForbidden(href)) return '';
    return href;
  } catch {
    return '';
  }
}

function boundLine(text) {
  const line = String(text ?? '');
  return line.length <= LINE_MAX ? line : line.slice(0, LINE_MAX);
}

function bullet(label, value) {
  const v = typeof value === 'number' && Number.isSafeInteger(value)
    ? String(value)
    : safeText(value);
  if (!v) return '';
  const l = safeText(label);
  if (!l) return '';
  return boundLine(`- ${l}: ${v}`);
}

function joinParts(parts) {
  return parts.filter(Boolean).join('\n');
}

function unknownMarkdown(companyId) {
  const id = safeText(companyId);
  const who = id || 'the id';
  return joinParts([
    '# unknown company',
    '',
    boundLine(`${who} was not found.`),
    '',
    FOOTER,
    '',
  ]);
}

function identityLines(identity) {
  const lines = [];
  const name = safeText(identity?.name);
  if (name) lines.push(bullet('name', identity.name));
  const domain = safeText(identity?.domain);
  if (domain) lines.push(bullet('domain', identity.domain));
  const website = safeHref(identity?.website);
  if (website) lines.push(boundLine(`- website: ${website}`));
  const sourceUrl = safeHref(identity?.sourceUrl);
  if (sourceUrl) lines.push(boundLine(`- source: ${sourceUrl}`));
  else {
    const source = safeText(identity?.source);
    if (source) lines.push(bullet('source', identity.source));
  }
  return lines;
}

function hiringLines(hiring, { quarantined }) {
  const lines = [];
  const status = safeText(hiring?.status);
  if (status) lines.push(bullet('status', hiring.status));
  if (Number.isSafeInteger(hiring?.openRoles)) {
    lines.push(boundLine(`- openRoles: ${hiring.openRoles}`));
  }
  const ats = safeText(hiring?.atsSource);
  if (ats) lines.push(bullet('atsSource', hiring.atsSource));
  if (!quarantined) {
    const jobsUrl = safeHref(hiring?.jobsUrl);
    if (jobsUrl) lines.push(boundLine(`- jobsUrl: ${jobsUrl}`));
  }
  return lines;
}

function evidenceBlocks(evidence) {
  const rows = Array.isArray(evidence) ? evidence : [];
  const blocks = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const quote = typeof row.quote === 'string' ? row.quote.trim() : '';
    if (!quote || isForbidden(quote)) continue;
    const q = sanitize(quote);
    if (!q) continue;
    const url = safeHref(row.url);
    const lines = [`> ${q}`];
    if (url) lines.push(url);
    blocks.push(lines.join('\n'));
  }
  return blocks;
}

function unknownLines(unknowns) {
  const rows = Array.isArray(unknowns) ? unknowns : [];
  const lines = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const field = safeText(row.field);
    const reason = safeText(row.reason);
    if (!field || !reason) continue;
    lines.push(boundLine(`- ${field}: ${reason}`));
  }
  return lines;
}

function openRoleLine(role) {
  if (!role || typeof role !== 'object') return '';
  if (role.closedAt != null) return '';
  const titleRaw = typeof role.title === 'string' ? role.title : '';
  if (!titleRaw.trim() || isForbidden(titleRaw)) return '';
  const title = sanitize(titleRaw);
  if (!title) return '';
  const bits = [title];
  const dept = safeText(role.employerDepartment);
  const office = safeText(role.employerOffice);
  const place = [dept, office].filter(Boolean).join(' / ');
  if (place) bits.push(place);
  if (isDay(role.firstSeen) && !isForbidden(role.firstSeen)) bits.push(`firstSeen ${role.firstSeen}`);
  if (role.nativeDateField === 'first_published' && isDay(role.nativePostedAt) && !isForbidden(role.nativePostedAt)) {
    bits.push(role.nativePostedAt);
  }
  const url = safeHref(role.url);
  if (url) bits.push(url);
  return boundLine(`- ${bits.join(' — ')}`);
}

function journalLine(event) {
  if (!event || typeof event !== 'object') return '';
  if (!JOURNAL_KINDS.has(event.kind)) return '';
  const kind = event.kind;
  const at = isDay(event.at) ? event.at : '';
  const titleRaw = typeof event.title === 'string' ? event.title : '';
  if (titleRaw && isForbidden(titleRaw)) return '';
  const title = titleRaw ? sanitize(titleRaw) : '';
  const bits = [kind];
  if (at) bits.push(at);
  if (title) bits.push(title);
  return boundLine(`- ${bits.join(' ')}`);
}

function peerLine(peer) {
  if (!peer || typeof peer !== 'object') return '';
  const nameRaw = typeof peer.name === 'string' ? peer.name : '';
  const idRaw = typeof peer.id === 'string' ? peer.id : '';
  if ((nameRaw && isForbidden(nameRaw)) || (idRaw && isForbidden(idRaw))) return '';
  const name = safeText(nameRaw);
  const id = safeText(idRaw);
  if (!name && !id) return '';
  const families = Array.isArray(peer.sharedFamilies)
    ? peer.sharedFamilies.map((family) => safeText(family)).filter(Boolean)
    : [];
  const head = name && id ? `${name} (${id})` : (name || id);
  const tail = families.length ? ` — ${families.join(', ')}` : '';
  return boundLine(`- ${head}${tail}`);
}

function pushSection(parts, heading, body) {
  if (!body) return;
  parts.push(`## ${heading}`, body, '');
}

/**
 * Pure. Packet object only. No network. No score. share is always private.
 */
export function renderCompanyMemo(packet) {
  const companyId = typeof packet?.companyId === 'string' ? packet.companyId : '';
  const asOf = packet && Object.hasOwn(packet, 'asOf') ? packet.asOf : null;
  const base = {
    schema: MEMO_SCHEMA,
    companyId,
    asOf,
    share: SHARE_PRIVATE,
  };

  if (!isRecord(packet) || packet.status === 'unknown') {
    return { ...base, markdown: unknownMarkdown(companyId) };
  }

  const quarantined = packet.hiring?.status === 'quarantined';
  const name = safeText(packet.identity?.name);
  const parts = [];
  parts.push(name ? `# ${name}` : '# company');
  parts.push('');

  const identity = identityLines(packet.identity);
  parts.push('## Identity');
  if (identity.length) parts.push(...identity);
  parts.push('');

  const hiring = hiringLines(packet.hiring, { quarantined });
  pushSection(parts, 'Hiring', hiring.length ? hiring.join('\n') : '');

  const evidence = evidenceBlocks(packet.evidence);
  pushSection(parts, 'Evidence', evidence.length ? evidence.join('\n\n') : '');

  const unknowns = unknownLines(packet.unknowns);
  pushSection(parts, 'Unknowns', unknowns.length ? unknowns.join('\n') : '');

  if (!quarantined) {
    const roleLines = (Array.isArray(packet.roles) ? packet.roles : [])
      .map(openRoleLine)
      .filter(Boolean);
    pushSection(parts, 'Open roles', roleLines.length ? roleLines.join('\n') : '');

    const journalLines = (Array.isArray(packet.journal) ? packet.journal : [])
      .map(journalLine)
      .filter(Boolean);
    pushSection(parts, 'Journal', journalLines.length ? journalLines.join('\n') : '');

    const peerLines = (Array.isArray(packet.peers) ? packet.peers : [])
      .map(peerLine)
      .filter(Boolean);
    if (peerLines.length) {
      parts.push('## Peers', peerLines.join('\n'), `*basis ${PEER_BASIS_LINE}*`, '');
    }
  }

  parts.push(FOOTER, '');
  return { ...base, markdown: parts.join('\n').replace(/\n{3,}/g, '\n\n') };
}

export function writePrivateMemo(filePath, markdown) {
  fs.writeFileSync(filePath, markdown, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function argValue(flag) {
  const eq = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return null;
}

function allowedOutPath(outPath) {
  if (typeof outPath !== 'string' || !outPath.trim()) return null;
  const resolved = path.resolve(outPath);
  const roots = [path.resolve('/tmp'), path.resolve(busyRoot())];
  const ok = roots.some((root) => resolved.startsWith(`${root}${path.sep}`));
  return ok ? resolved : null;
}

function supportedField(value, quote = 'Example makes research useful.') {
  return {
    value,
    status: 'supported',
    url: 'https://acme.example/',
    quote,
  };
}

function goldBenchmark(targetId, extraFields = {}) {
  return {
    researchedAt: '2026-08-01',
    thresholds: { usableCoverage: 0.9, evidenceSupport: 0.95 },
    companies: Array.from({ length: 30 }, (_, index) => ({
      id: index === 0 ? targetId : `gold:${index}`,
      fields: {
        canonicalCompany: supportedField(index === 0 ? 'Acme' : `Gold ${index}`),
        productSummary: supportedField('Makes useful things'),
        productCategory: supportedField('Software'),
        likelyBuyer: supportedField('Operations teams'),
        pricingStatus: index < 27
          ? supportedField('contact sales', 'Contact us for pricing details.')
          : { value: null, status: 'unknown', url: null, quote: null },
        ...extraFields,
      },
    })),
  };
}

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`company-memo selftest: ${msg}`);
  };

  const company = {
    id: 'yc:acme',
    name: 'Acme',
    website: 'https://www.acme.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/acme',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/acme',
    openRoles: 1,
    openRolesAt: '2026-08-14',
    roleMix: { engineering: 1 },
    hiring: 'yes',
  };
  const peerCo = {
    id: 'yc:beta',
    name: 'Beta',
    website: 'https://beta.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/beta',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/beta',
    openRoles: 2,
    openRolesAt: '2026-08-14',
    roleMix: { engineering: 2 },
    hiring: 'yes',
  };
  const poisonCo = {
    id: 'yc:poison',
    name: '## injected *star*',
    website: 'javascript:alert(1)',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/poison',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/poison',
    openRoles: 1,
    openRolesAt: '2026-08-14',
    roleMix: { engineering: 1 },
    hiring: 'yes',
  };
  const map = {
    generatedAt: '2026-08-14T12:00:00.000Z',
    companies: [company, peerCo, poisonCo],
  };
  const ledger = {
    schema: 'demigod.role-ledger/1',
    updatedAt: '2026-08-14',
    roles: {
      'Greenhouse|acme|1': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: '1',
        company: 'Acme',
        title: 'Founding Engineer',
        location: 'San Francisco, CA',
        url: 'https://jobs.example/acme/jobs/1',
        firstSeen: '2026-08-10',
        lastSeen: '2026-08-14',
        closedAt: null,
        nativePostedAt: '2026-08-01',
        nativeDateField: 'first_published',
        employerDepartment: 'Engineering',
        employerOffice: 'San Francisco',
      },
      'Greenhouse|poison|1': {
        provider: 'Greenhouse',
        slug: 'poison',
        jobId: '1',
        company: 'Poison',
        title: '## injected *role*',
        location: 'San Francisco',
        url: 'https://jobs.example/poison/jobs/1',
        firstSeen: '2026-08-10',
        lastSeen: '2026-08-14',
        closedAt: null,
        nativePostedAt: '2026-08-01',
        nativeDateField: 'first_published',
      },
    },
  };
  const benchmark = goldBenchmark('yc:acme');

  // 1. Known packet with evidence + unknown + open role + journal + peer.
  const knownPacket = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger,
    signals: null,
    signalsMissing: true,
    benchmark,
    catalog: {},
    today: '2026-08-14',
  });
  const known = renderCompanyMemo(knownPacket);
  assert(known.schema === MEMO_SCHEMA, 'schema');
  assert(known.share === SHARE_PRIVATE, 'share private');
  assert(known.companyId === 'yc:acme', 'companyId');
  assert(known.asOf === knownPacket.asOf, 'asOf from packet');
  assert(known.markdown.includes('Acme'), 'name');
  assert(known.markdown.includes('Example makes research useful.'), 'quote');
  assert(known.markdown.includes('## Unknowns') && known.markdown.includes('signals'), 'unknown field');
  assert(known.markdown.includes('Founding Engineer'), 'role title');
  assert(known.markdown.includes('opened'), 'journal kind');
  assert(known.markdown.includes('Beta'), 'peer name');
  assert(known.markdown.includes(FOOTER), 'footer');
  assert(known.markdown.includes('*basis sf-map + roleMix overlap*'), 'peer basis italic');
  assert(!Object.hasOwn(known, 'score'), 'no score key');

  // 2. Unknown id packet → no fixture website / role title / peer name.
  const absentPacket = buildCompanyPacket({
    companyId: 'yc:nope',
    map,
    ledger,
    signals: null,
    benchmark,
  });
  const absent = renderCompanyMemo(absentPacket);
  assert(absent.schema === MEMO_SCHEMA, 'unknown schema');
  assert(absent.share === SHARE_PRIVATE, 'unknown share private');
  assert(absent.markdown.startsWith('# unknown company'), 'unknown title');
  assert(absent.markdown.includes('was not found'), 'unknown not-found line');
  assert(!absent.markdown.includes('acme.example'), 'unknown no fixture website');
  assert(!absent.markdown.includes('Founding Engineer'), 'unknown no role title');
  assert(!absent.markdown.includes('Beta'), 'unknown no peer name');
  assert(!absent.markdown.includes('https://www.acme.example/'), 'unknown no website url');
  assert(!absent.markdown.includes('## Identity'), 'unknown no identity section');
  assert(!absent.markdown.includes('## Open roles'), 'unknown no roles section');
  assert(!absent.markdown.includes('## Journal'), 'unknown no journal section');
  assert(!absent.markdown.includes('## Peers'), 'unknown no peers section');
  assert(!absent.markdown.includes('## Evidence'), 'unknown no evidence section');

  // 3. Quarantine packet → no jobs.example URL, no role titles, no journal kinds, no peer names.
  const quarantinedPacket = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger,
    signals: null,
    signalsMissing: true,
    benchmark,
    catalog: {
      companies: [{
        id: 'yc:acme',
        quarantineHiring: true,
        fields: benchmark.companies[0].fields,
      }],
    },
    today: '2026-08-14',
  });
  const quarantined = renderCompanyMemo(quarantinedPacket);
  assert(quarantined.share === SHARE_PRIVATE, 'quarantine share');
  assert(!quarantined.markdown.includes('jobs.example'), 'quarantine no jobs.example');
  assert(!quarantined.markdown.includes('Founding Engineer'), 'quarantine no role title');
  assert(!/\bopened\b/.test(quarantined.markdown), 'quarantine no opened');
  assert(!/\bclosed\b/.test(quarantined.markdown), 'quarantine no closed');
  assert(!/\breopened\b/.test(quarantined.markdown), 'quarantine no reopened');
  assert(!quarantined.markdown.includes('maintained_stale'), 'quarantine no maintained_stale');
  assert(!quarantined.markdown.includes('Beta'), 'quarantine no peer name');
  assert(!quarantined.markdown.includes('## Open roles'), 'quarantine no open roles heading');
  assert(!quarantined.markdown.includes('## Journal'), 'quarantine no journal heading');
  assert(!quarantined.markdown.includes('## Peers'), 'quarantine no peers heading');
  assert(quarantined.markdown.includes('quarantined'), 'quarantine status visible');

  // 4. Title with ## injected and * becomes escaped / flattened (no extra H2).
  const poisonPacket = buildCompanyPacket({
    companyId: 'yc:poison',
    map,
    ledger,
    signals: null,
    benchmark: goldBenchmark('yc:poison'),
    catalog: {},
    today: '2026-08-14',
  });
  const poison = renderCompanyMemo(poisonPacket);
  const h2 = poison.markdown.split('\n').filter((line) => line.startsWith('## '));
  const allowedH2 = new Set([
    '## Identity',
    '## Hiring',
    '## Evidence',
    '## Unknowns',
    '## Open roles',
    '## Journal',
    '## Peers',
  ]);
  assert(h2.every((line) => allowedH2.has(line)), `no extra H2, got ${h2.join(' | ')}`);
  assert(!/^## injected/m.test(poison.markdown), 'injected heading flattened');
  assert(poison.markdown.includes('\\*'), 'asterisk escaped');

  // 5. javascript:alert(1) website is not in markdown.
  assert(!poison.markdown.includes('javascript:alert(1)'), 'javascript url dropped');
  assert(!poison.markdown.includes('javascript:'), 'javascript scheme dropped');

  // 6. No score key; markdown has no "we recommend".
  for (const memo of [known, absent, quarantined, poison]) {
    assert(!Object.hasOwn(memo, 'score'), 'render output has no score key');
    assert(!/we recommend/i.test(memo.markdown), 'no we recommend');
    assert(memo.share === SHARE_PRIVATE, 'share never public');
    const dumped = JSON.stringify(memo);
    assert(!/"score"/.test(dumped), 'json has no score key');
  }
  const withoutFooter = known.markdown.replace(FOOTER, '');
  assert(!/recommend/i.test(withoutFooter), 'recommend only in footer');
  assert(!/score/i.test(known.markdown), 'no score substring');

  const tmp = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'dg-company-memo-'));
  try {
    const privatePath = path.join(tmp, 'memo.md');
    writePrivateMemo(privatePath, known.markdown);
    assert((fs.statSync(privatePath).mode & 0o777) === 0o600, 'private memo mode 0600');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const surface = here.split('function selftest')[0] || here;
  assert(!/\bscoreMatch\s*\(/.test(surface), 'memo never calls scoreMatch');
  assert(!/RecruitAI/.test(surface), 'memo does not name RecruitAI');
  assert(!/\bsend\s*\(/.test(surface), 'memo does not send');
  assert(surface.includes('share: SHARE_PRIVATE') || surface.includes("share: 'private'")
    || surface.includes('share: SHARE_PRIVATE'), 'share literal private');

  console.log(JSON.stringify({ ok: true, selftest: 'company-memo' }));
}

function show(companyId, outPath) {
  if (!companyId) {
    console.error('usage: node demigod-company-memo.mjs show --id=yc:… [--out=/tmp/…]');
    process.exit(2);
  }
  let dest = null;
  if (outPath != null) {
    dest = allowedOutPath(outPath);
    if (!dest) {
      console.error(JSON.stringify({
        ok: false,
        error: 'out_path_refused',
        hint: 'write only under /tmp or the busy root',
      }));
      process.exit(2);
    }
  }
  let packet;
  try {
    packet = buildCompanyPacket({ companyId, ...loadPacketInputs() });
  } catch (error) {
    if (error?.code === 'duplicate_company_id') {
      console.error(JSON.stringify({
        schema: MEMO_SCHEMA,
        status: 'unknown',
        companyId,
        error: 'duplicate_company_id',
        share: SHARE_PRIVATE,
      }));
      process.exit(1);
    }
    throw error;
  }
  const memo = renderCompanyMemo(packet);
  if (dest) writePrivateMemo(dest, memo.markdown);
  process.stdout.write(memo.markdown.endsWith('\n') ? memo.markdown : `${memo.markdown}\n`);
}

if (isMain) {
  try {
    if (process.argv.includes('--selftest')) {
      selftest();
    } else if (process.argv[2] === 'show') {
      show(argValue('--id'), argValue('--out'));
    } else {
      console.error('usage: node demigod-company-memo.mjs --selftest | show --id=yc:… [--out=/tmp/…]');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
