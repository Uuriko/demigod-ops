#!/usr/bin/env node
/**
 * Build public "recently observed roles" asset for the website from DEMIGOD-ROLES-FEED.json.
 *
 * Honesty: firstObservedAt is Demigod's sighting; postedAt only when ledger attributed;
 * links are employer ATS URLs only. Not matching inventory (not DEMIGOD-BOARD.json).
 *
 *   node demigod-public-roles.mjs [--limit 24]
 *   node demigod-public-roles.mjs --selftest
 *
 * Out:
 *   DEMIGOD-PUBLIC-ROLES.json
 *   demigod-public-roles-embed.js  (sets window.__dgPublicRoles)
 *   demigod-footer-lite.html       (inline script id=demigod-public-roles-data before foot loader)
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FEED = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-PUBLIC-ROLES.json');
const OUT_EMBED = path.join(ROOT, 'demigod-public-roles-embed.js');
const FOOTER = path.join(ROOT, 'demigod-footer-lite.html');
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
/* Map teamSize: median 5, p90 51, max 7000. 200 keeps Series-A/B companies in and leaves the
   thousand-person firms out, without needing a headcount claim we cannot source. */
const STARTUP_TEAM_MAX = 200;
/* Homepage rail is 8 slots; one role per employer spreads the market instead of
   two-from-Astro + two-from-Baton filling half the surface. Overflow refill still
   allows a second from one employer only when the feed is thin. */
const PER_COMPANY_MAX = 1;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function argNum(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return def;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : def;
}

/**
 * PURE. First-class public directory metros (expand-from-SF product scope).
 * Never treat bare ", LA" / state code as Los Angeles (Baton Rouge, LA false positive).
 * @returns {'sf-bay'|'la'|'nyc'|null}
 */
export function detectPublicMetro(location) {
  const s = String(location || '');
  if (!s.trim()) return null;
  // SF Bay first — multi-city rows that include SF still tag sf-bay for scoring.
  if (
    /san\s*francisco|\bsf\b|bay\s*area|palo\s*alto|mountain\s*view|menlo\s*park|oakland|berkeley|san\s*mateo|redwood\s*city|sunnyvale|cupertino|san\s*jose|south\s*bay|peninsula|fremont|emeryville|daly\s*city|south\s*san\s*francisco|silicon\s*valley|san\s*carlos|foster\s*city|milpitas|los\s*altos|los\s*gatos|campbell|burlingame|san\s*bruno/i.test(
      s,
    )
  ) {
    return 'sf-bay';
  }
  if (
    /los\s*angeles|santa\s*monica|culver\s*city|pasadena|burbank|el\s*segundo|playa\s*vista|venice(?:\s*,\s*ca)?|hollywood\s*beach|long\s*beach,\s*ca|west\s*hollywood|hollywood\s*wood|glendale,\s*ca|marina\s*del\s*rey|century\s*city/i.test(
      s,
    )
  ) {
    return 'la';
  }
  if (
    /new\s*york|\bnyc\b|brooklyn|manhattan|queens|bronx|long\s*island\s*city|jersey\s*city|hoboken|soho|williamsburg/i.test(
      s,
    )
  ) {
    return 'nyc';
  }
  return null;
}

/**
 * PURE. Prefer core metros SF Bay / LA / NYC (and multi-city rows that include them)
 * for the public directory list.
 * Score 0 = off-geo noise (India-only / remote-Canada-only) — kept only if under limit after prefer.
 * Score 3 = first-class metro (SF Bay, Los Angeles area, NYC).
 * Score 2 = other US / remote-US.
 * Score 1 = unknown / blank.
 */
export function sfPublicRoleScore(location) {
  const s = String(location || '');
  if (detectPublicMetro(s)) return 3;
  const hasUs = /united\s*states|\bUSA\b|\bUS\b|california|\bCA\b|new\s*york|\bNY\b/i.test(s);
  /* ponytail: hand-maintained off-geo list, so it is whack-a-mole by construction — the ceiling is
     a location nobody has seen yet, and the real fix is a geo resolver. Europe was the gap that
     showed why: the list held Asia, the Pacific and Canada, so "London" fell through to the
     unknown tier and shipped inside a payload claiming SF Bay / LA / NYC / US-remote coverage. */
  const offGeo =
    /gurugram|gurgaon|bangalore|bengaluru|hyderabad|chennai|pune|mumbai|manila|singapore|hong\s*kong|tokyo|seoul|sydney|melbourne|canada|toronto|vancouver|montreal|india\b|\bapac\b|\bemea\b|london|\bunited\s*kingdom\b|\bUK\b|england|scotland|wales|ireland|dublin|berlin|munich|germany|france|paris|amsterdam|netherlands|madrid|barcelona|spain|lisbon|portugal|warsaw|poland|zurich|switzerland|stockholm|sweden|copenhagen|denmark|tel\s*aviv|israel|dubai|\buae\b|nigeria|lagos|nairobi|kenya|brazil|sao\s*paulo|mexico\s*city|buenos\s*aires|bogota|santiago/i.test(
      s,
    ) && !hasUs;
  if (offGeo) return 0;
  /* `remote` on its own used to be in this alternation, which made "Remote, UK" score as a US
     remote role — the word "remote" says nothing about a country. It now needs `remote us` or an
     actual US token; a bare "Remote" falls to the unknown tier below, which is what it is. */
  if (hasUs || /\b(seattle|austin|boston|chicago|denver)\b/i.test(s)) {
    return 2;
  }
  return 1; // unknown / hybrid / blank — keep mid
}

/** PURE. Human label for metro filter UI. */
export function publicMetroLabel(metro) {
  if (metro === 'sf-bay') return 'SF Bay';
  if (metro === 'la') return 'Los Angeles';
  if (metro === 'nyc') return 'NYC';
  return '';
}

/**
 * PURE. Is this company a startup, from map evidence only?
 *   2 = known startup — teamSize ≤ STARTUP_TEAM_MAX, or stage with no known headcount
 *   1 = unknown — no profile or no signals; never punished for missing data
 *   0 = known established — teamSize over the ceiling, wikidata-sf-tech with neither size nor stage,
 *       or (no size/stage) openRoles ≥ ESTABLISHED_OPEN_ROLES (board volume proxy when headcount missing)
 *
 * Headcount beats stage labels: YC still stamps "Growth" on 800–2400 person firms
 * (Gusto, Faire, Checkr). Treating stage alone as startup let those crowd the homepage rail.
 * Stage without a known team still counts — many Early YC rows lack headcount on disk.
 * openRoles alone never promotes to startup; it only demotes obvious megaboards (Snowflake/Palantir)
 * that lack teamSize so they stop filling the public rail as "unknown".
 */
/* Map openRoles proxy: p90 of null-teamSize boards with roles sits well above small startups. */
const ESTABLISHED_OPEN_ROLES = 80;
export function startupScore(profile) {
  if (!profile) return 1;
  const team = Number.isFinite(profile.teamSize) ? profile.teamSize : null;
  const stage = String(profile.stage || '').trim();
  // Known size over the ceiling is established even when stage is still "Growth".
  if (team !== null && team > STARTUP_TEAM_MAX) return 0;
  if (team !== null && team <= STARTUP_TEAM_MAX) return 2;
  if (stage) return 2;
  const tags = Array.isArray(profile.tags) ? profile.tags : [];
  if (tags.includes('wikidata-sf-tech') && !stage) return 0;
  const open = Number.isFinite(profile.openRoles) ? profile.openRoles : null;
  // High ATS volume with no headcount/stage ≈ established (Snowflake 251, Robinhood 105).
  if (open !== null && open >= ESTABLISHED_OPEN_ROLES) return 0;
  // Wikidata "startup" without stage is often a public firm (Elastic/Palantir); combine with volume.
  if (tags.includes('wikidata-startup') && open !== null && open >= 40) return 0;
  return 1;
}

/** PURE. Company-name key for joining feed rows to map rows. */
/**
 * PURE. Strip trailing ATS/comp SEO paste from public job titles for site/RSS display.
 * Does not invent a role name — only removes $ / k-range / +equity tails that read as marketplace spam.
 */
export function cleanPublicRoleTitle(title) {
  let t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  // "… — Remote, $200-$400k/yr + equity" / "…, $180k–$220k" / "… + equity"
  t = t.replace(
    /(?:\s*[,;|]\s*|\s+[–—-]\s+)\$?\s*[\d,.]+\s*(?:[kK]|\/\s*yr(?:ear)?)?(?:\s*[–—-]\s*\$?\s*[\d,.]+\s*(?:[kK]|\/\s*yr(?:ear)?)?)?(?:\s*\+\s*equity)?\s*$/i,
    '',
  );
  t = t.replace(/\s*\+\s*equity\s*$/i, '');
  t = t.replace(
    /\s+\$\s*[\d,.]+\s*(?:[kK])?(?:\s*[–—-]\s*\$?\s*[\d,.]+\s*(?:[kK])?)?(?:\s*\/\s*yr(?:ear)?)?\s*$/i,
    '',
  );
  t = t.replace(/\s*[,;|–—-]\s*$/g, '').replace(/\s{2,}/g, ' ').trim();
  return t;
}

export function companyKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Build companyKey -> {teamSize, stage, tags, openRoles} from the startup map. Returns {} when absent. */
export function loadCompanyProfiles(mapPath = MAP) {
  try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const out = {};
    for (const c of map.companies || []) {
      const k = companyKey(c.name);
      if (!k || out[k]) continue;
      const open = Number.isFinite(c.openRoles) ? c.openRoles : null;
      out[k] = {
        teamSize: c.teamSize ?? null,
        stage: c.stage ?? null,
        tags: c.tags || [],
        openRoles: open,
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** PURE. Pick newest observed open roles for public display (startups first; SF Bay / LA / NYC preferred). */
export function publicRolesFromFeed(feed, { limit = 24, profiles = {}, perCompany = PER_COMPANY_MAX } = {}) {
  const cap = Math.min(Math.max(1, limit | 0), 100);
  if (!feed || !Array.isArray(feed.roles)) {
    return {
      schema: 'demigod.public-roles/1',
      generatedAt: new Date().toISOString(),
      basis: 'empty — no roles-feed',
      roles: [],
    };
  }
  const mapped = feed.roles
    .map((r) => ({
      company: String(r.company || '').trim().slice(0, 160),
      title: String(r.title || '').trim().slice(0, 240),
      url: String(r.url || '').trim(),
      firstObservedAt: String(r.firstObservedAt || '').slice(0, 10),
      // Employer-attributed post date from role-ledger only — never invent.
      postedAt:
        r.postedAt && /^\d{4}-\d{2}-\d{2}$/.test(String(r.postedAt).slice(0, 10))
          ? String(r.postedAt).slice(0, 10)
          : null,
      location: r.location ? String(r.location).trim().slice(0, 120) : null,
      provider: r.provider ? String(r.provider).trim().slice(0, 40) : null,
      employerDepartment: r.employerDepartment ? String(r.employerDepartment).trim().slice(0, 120) : null,
      employerOffice: r.employerOffice ? String(r.employerOffice).trim().slice(0, 120) : null,
      boardUpdatedAt: r.boardUpdatedAt && /^\d{4}-\d{2}-\d{2}$/.test(String(r.boardUpdatedAt).slice(0, 10))
        ? String(r.boardUpdatedAt).slice(0, 10)
        : null,
      employmentType: r.employmentType ? String(r.employmentType).trim().slice(0, 60) : null,
      workplaceType: r.workplaceType ? String(r.workplaceType).trim().slice(0, 40) : null,
    }))
    .filter(
      (r) =>
        r.company &&
        r.title &&
        /^https:\/\//i.test(r.url) &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.firstObservedAt),
    );
  // Drop pure off-geo rows when any in-scope row exists (directory metros + US).
  const nonOff = mapped.filter((r) => sfPublicRoleScore(r.location) > 0);
  const pool = nonOff.length ? nonOff : mapped;
  /* Startups first. Previously this sorted on geo, then date, then company name — with no
     startup signal and no per-company cap, so the list filled with whichever big employer posts
     the most SF roles, and the alphabetical tiebreak made it literally Airbnb/Anthropic/Astro.
     Demigod's surface is startup talent across SF Bay, LA, and NYC; the directory has to show that. */
  // Titles that paste comp into the job name are real ATS text, but on an 8-slot homepage
  // rail they read as marketplace spam. Prefer quieter titles when startup/geo/date tie.
  const titleNoise = (title) =>
    /\$|\b\d{2,3}\s*[–-]\s*\d{2,3}\s*k\b|\+\s*equity\b/i.test(String(title || '')) ? 1 : 0;
  const withMetro = pool.map((r) => ({
    ...r,
    metro: detectPublicMetro(r.location) || detectPublicMetro(r.employerOffice) || null,
  }));
  const ranked = withMetro.sort((a, b) => {
    const st = startupScore(profiles[companyKey(b.company)]) - startupScore(profiles[companyKey(a.company)]);
    if (st) return st;
    const ds = sfPublicRoleScore(b.location) - sfPublicRoleScore(a.location);
    if (ds) return ds;
    const tn = titleNoise(a.title) - titleNoise(b.title);
    if (tn) return tn;
    return b.firstObservedAt.localeCompare(a.firstObservedAt) || a.company.localeCompare(b.company);
  });
  /* Then spread across employers (and lightly across metros): no company may take more than
     perCompany slots; prefer not filling the entire rail from one metro when others exist.
     Overflow refills spare capacity so a short feed still fills the list.
     When enough quiet titles exist, skip $comp-in-title rows on the primary pass so the
     homepage rail is not marketplace-spam shaped (full feed still has those rows). */
  const quietEnough = ranked.filter((r) => titleNoise(r.title) === 0).length >= cap;
  const used = new Map();
  const metroUsed = new Map();
  const primary = [];
  const overflow = [];
  // Soft metro spread only when more than one core metro is present — otherwise a SF-only
  // feed would hit the cap early and refill from one prolific employer (see selftest).
  const metrosPresent = new Set(ranked.map((r) => r.metro).filter(Boolean));
  const metroSoftCap = metrosPresent.size > 1 ? Math.max(2, Math.ceil(cap * 0.55)) : cap;
  for (const r of ranked) {
    if (quietEnough && titleNoise(r.title)) {
      overflow.push(r);
      continue;
    }
    const k = companyKey(r.company);
    const n = used.get(k) || 0;
    const m = r.metro || 'other';
    const mn = metroUsed.get(m) || 0;
    if (n < perCompany && primary.length < cap && mn < metroSoftCap) {
      used.set(k, n + 1);
      metroUsed.set(m, mn + 1);
      primary.push(r);
    } else overflow.push(r);
  }
  const roles = primary
    .concat(overflow.slice(0, Math.max(0, cap - primary.length)))
    // Rank on raw ATS titles (noise still demotes); display after selection is cleaned.
    .map((r) => {
      const cleaned = cleanPublicRoleTitle(r.title);
      const row = cleaned && cleaned !== r.title ? { ...r, title: cleaned } : { ...r };
      return row;
    });

  return {
    schema: 'demigod.public-roles/1',
    generatedAt: new Date().toISOString(),
    basis:
      'Recently first-observed open roles on public employer ATS boards (role-ledger). Prefers SF Bay, Los Angeles area, and NYC when those locations appear; other US/remote stay eligible. Optional employerDepartment/office/boardUpdatedAt/employmentType/workplaceType when present on public Greenhouse, Lever, or Ashby boards. Not Demigod matching inventory; not a fill-rate claim.',
    /* Derived from the rows that are actually here, not declared as a constant. The fallback above
       keeps every off-geo row when nothing in scope exists that day, so a fixed string would print
       "sf-bay · los-angeles · nyc · us-remote" over a list containing none of them. A claim about
       coverage should be readable off the payload it describes. */
    coverage: publicRolesCoverage(roles),
    windowDays: feed.windowDays ?? null,
    roles,
  };
}

/**
 * PURE. What this payload actually covers, in the order the product talks about it.
 * `elsewhere` appears only when a row sits outside every named metro and the US.
 */
export function publicRolesCoverage(roles = []) {
  const present = new Set();
  for (const role of roles) {
    if (role?.metro && ['sf-bay', 'la', 'nyc'].includes(role.metro)) present.add(role.metro);
    else if (sfPublicRoleScore(role?.location) >= 2) present.add('us-remote');
    else if (sfPublicRoleScore(role?.location) === 0) present.add('elsewhere');
    else present.add('unspecified');
  }
  const order = ['sf-bay', 'la', 'nyc', 'us-remote', 'unspecified', 'elsewhere'];
  const label = { 'sf-bay': 'sf-bay', la: 'los-angeles', nyc: 'nyc', 'us-remote': 'us-remote', unspecified: 'location-unspecified', elsewhere: 'elsewhere' };
  return order.filter((key) => present.has(key)).map((key) => label[key]).join(' · ') || 'none';
}

export function embedScript(publicRoles) {
  const json = JSON.stringify(publicRoles).replace(/</g, '\\u003c');
  return `/* demigod-public-roles-embed — generated; do not hand-edit */\nwindow.__dgPublicRoles=${json};\n`;
}

/** Insert/update inline public-roles payload in footer-lite (ships with custom-code paste). */
export function writeFooterPublicRoles(publicRoles, footerPath = FOOTER) {
  if (!fs.existsSync(footerPath)) return { ok: false, reason: 'no-footer' };
  let html = fs.readFileSync(footerPath, 'utf8');
  const assign = `window.__dgPublicRoles=${JSON.stringify(publicRoles).replace(/</g, '\\u003c')};`;
  const block =
    '<!-- demigod-public-roles-data: regenerated by demigod-public-roles.mjs; not matching inventory -->\n' +
    `<script id="demigod-public-roles-data">${assign}</script>\n`;
  if (/id="demigod-public-roles-data"/.test(html)) {
    html = html.replace(
      /<!-- demigod-public-roles-data[\s\S]*?<script id="demigod-public-roles-data">[\s\S]*?<\/script>\n?/,
      block,
    );
  } else if (/id="demigod-foot-cdn-loader"/.test(html)) {
    html = html.replace(/(<script id="demigod-foot-cdn-loader")/, `${block}$1`);
  } else {
    html = `${html.trimEnd()}\n${block}`;
  }
  const bytes = Buffer.byteLength(html, 'utf8');
  if (bytes > 120_000) return { ok: false, reason: 'footer-too-large', bytes };
  atomicWrite(footerPath, html);
  return { ok: true, bytes };
}

function selftest() {
  const feed = {
    schema: 'demigod.roles-feed/8',
    windowDays: 3,
    roles: [
      { company: 'Acme', title: 'Founding Eng', url: 'https://jobs.ashbyhq.com/acme/1', firstObservedAt: '2026-08-04', location: 'San Francisco, CA' },
      { company: 'IndiaCo', title: 'QA', url: 'https://jobs.ashbyhq.com/i/2', firstObservedAt: '2026-08-05', location: 'Gurugram' },
      { company: 'Bad', title: 'X', url: 'javascript:alert(1)', firstObservedAt: '2026-08-04' },
    ],
  };
  assert.equal(sfPublicRoleScore('San Francisco, CA'), 3);
  assert.equal(sfPublicRoleScore('Los Angeles, CA'), 3, 'LA is first-class metro');
  assert.equal(sfPublicRoleScore('New York, NY'), 3, 'NYC is first-class metro');
  assert.equal(detectPublicMetro('Baton Rouge, LA'), null, 'Baton Rouge is not LA metro');
  assert.ok(sfPublicRoleScore('Baton Rouge, LA') < 3, 'Baton Rouge must not get core-metro score');
  assert.equal(detectPublicMetro('Santa Monica, CA'), 'la');
  assert.equal(detectPublicMetro('Brooklyn, NY'), 'nyc');
  assert.equal(sfPublicRoleScore('Gurugram'), 0);
  assert.equal(sfPublicRoleScore('Singapore'), 0, 'pure APAC office is off-geo for public rail');
  assert.equal(sfPublicRoleScore('APAC | Remote'), 0, 'region-only remote is off-geo');
  assert.equal(sfPublicRoleScore('Remote US / Singapore'), 2, 'multi-geo with US stays eligible');
  /* Europe was the hole. The off-geo list held Asia, the Pacific and Canada, so a London role fell
     into the unknown tier and shipped inside a payload claiming SF Bay / LA / NYC / US-remote —
     two of them were live on 2026-08-17. And "remote" alone used to score as a US remote role,
     which is how "Remote, UK" got in: the word says nothing about a country. */
  assert.equal(sfPublicRoleScore('London'), 0, 'a London office is not SF Bay, LA, NYC or US-remote');
  assert.equal(sfPublicRoleScore('Remote, UK'), 0, 'remote somewhere else is not remote here');
  assert.equal(sfPublicRoleScore('Berlin'), 0, 'nor is Berlin');
  assert.equal(sfPublicRoleScore('Remote, Canada'), 0, 'nor Canada, comma or no comma');
  assert.equal(sfPublicRoleScore('Toronto'), 0, 'nor a Canadian city on its own');
  assert.equal(sfPublicRoleScore('New York, NY or Toronto, Canada'), 3, 'but a US metro in the same row still counts');
  assert.equal(sfPublicRoleScore('Remote'), 1, 'a bare "Remote" is unknown, not American');
  assert.equal(sfPublicRoleScore('Remote - US'), 2, 'and a US remote role stays eligible whatever the separator');
  assert.equal(sfPublicRoleScore('Remote (US)'), 2, 'including parenthesised');
  // Coverage is read off the payload. The fallback path keeps off-geo rows when nothing in scope
  // exists that day, and a constant string would then claim four geographies over a list with none.
  assert.equal(publicRolesCoverage([{ metro: 'sf-bay', location: 'San Francisco' }, { metro: null, location: 'Remote - US' }]), 'sf-bay · us-remote');
  assert.equal(publicRolesCoverage([{ metro: null, location: 'London' }]), 'elsewhere', 'an all-London day says elsewhere, not sf-bay');
  assert.equal(publicRolesCoverage([{ metro: 'nyc', location: 'New York, NY' }, { metro: null, location: 'Remote' }]), 'nyc · location-unspecified');
  assert.equal(publicRolesCoverage([]), 'none', 'an empty payload covers nothing and says so');
  const multi = {
    schema: 'demigod.roles-feed/8',
    windowDays: 3,
    roles: [
      { company: 'SfCo', title: 'Eng', url: 'https://jobs.ashbyhq.com/sf/1', firstObservedAt: '2026-08-10', location: 'San Francisco, CA' },
      { company: 'LaCo', title: 'Designer', url: 'https://jobs.ashbyhq.com/la/1', firstObservedAt: '2026-08-11', location: 'Los Angeles, CA' },
      { company: 'NycCo', title: 'PM', url: 'https://jobs.ashbyhq.com/nyc/1', firstObservedAt: '2026-08-12', location: 'New York, NY' },
      { company: 'IndiaCo', title: 'QA', url: 'https://jobs.ashbyhq.com/i/2', firstObservedAt: '2026-08-13', location: 'Gurugram' },
    ],
  };
  const multiPub = publicRolesFromFeed(multi, { limit: 10, profiles: {} });
  assert.equal(multiPub.roles.length, 3, 'three core-metro startups keep off-geo out');
  assert.ok(multiPub.roles.every((r) => r.metro === 'sf-bay' || r.metro === 'la' || r.metro === 'nyc'));
  assert.match(multiPub.basis, /Los Angeles|NYC|SF Bay/i);
  assert.ok(!/SF\/Bay preferred when available/i.test(multiPub.basis), 'basis must not claim SF-only prefer');
  const pub = publicRolesFromFeed(feed, { limit: 10 });
  assert.equal(pub.roles.length, 1);
  assert.equal(pub.roles[0].company, 'Acme');
  assert.equal(pub.roles[0].metro, 'sf-bay');
  assert.ok(embedScript(pub).includes('window.__dgPublicRoles='));
  assert.ok(!embedScript(pub).includes('</script'));
  // Known large "Growth" firm must not beat a small startup on the homepage rail.
  assert.equal(startupScore({ teamSize: 12, stage: 'Early' }), 2);
  assert.equal(startupScore({ teamSize: 800, stage: 'Growth' }), 0, 'headcount beats Growth label');
  assert.equal(startupScore({ stage: 'Early' }), 2, 'stage without headcount still startup');
  assert.equal(startupScore({ tags: ['wikidata-sf-tech'] }), 0, 'wikidata-only without stage is established-ish');
  assert.equal(startupScore({ openRoles: 251 }), 0, 'megaboard openRoles proxy without headcount');
  assert.equal(startupScore({ openRoles: 12 }), 1, 'small openRoles alone is not a startup claim');
  assert.equal(startupScore({ stage: 'Early', openRoles: 200 }), 2, 'stage still beats openRoles proxy');
  assert.equal(
    startupScore({ tags: ['wikidata-startup'], openRoles: 72 }),
    0,
    'wikidata-startup + mid volume without stage is established-ish',
  );
  assert.equal(
    startupScore({ tags: ['wikidata-startup'], openRoles: 5 }),
    1,
    'wikidata-startup alone with tiny board stays unknown',
  );
  {
    const ranked = publicRolesFromFeed(
      {
        schema: 'demigod.roles-feed/8',
        roles: [
          { company: 'BigCo', title: 'SRE', url: 'https://jobs.ashbyhq.com/big/1', firstObservedAt: '2026-08-05', location: 'San Francisco' },
          { company: 'TinyCo', title: 'Founding Eng', url: 'https://jobs.ashbyhq.com/tiny/1', firstObservedAt: '2026-08-04', location: 'San Francisco' },
        ],
      },
      { limit: 2, profiles: { bigco: { teamSize: 1200, stage: 'Growth' }, tinyco: { teamSize: 8, stage: 'Early' } } },
    );
    assert.equal(ranked.roles[0].company, 'TinyCo', 'startup ranks above established even if slightly older observation');
  }
  // Comp pasted into title is real ATS text but marketplace-spam on an 8-slot rail.
  {
    const quiet = publicRolesFromFeed(
      {
        schema: 'demigod.roles-feed/8',
        roles: [
          { company: 'A', title: 'Eng $200-$400k/yr + equity', url: 'https://jobs.ashbyhq.com/a/1', firstObservedAt: '2026-08-05', location: 'San Francisco' },
          { company: 'B', title: 'Founding Engineer', url: 'https://jobs.ashbyhq.com/b/1', firstObservedAt: '2026-08-05', location: 'San Francisco' },
        ],
      },
      { limit: 1, profiles: {} },
    );
    assert.equal(quiet.roles[0].company, 'B', 'prefer quiet title when enough quiet rows exist');
  }
  assert.equal(
    cleanPublicRoleTitle('Head of AI Engineering at AIOS — Remote, $200-$400k/yr + equity'),
    'Head of AI Engineering at AIOS — Remote',
    'strip trailing comp package from ATS SEO title',
  );
  assert.equal(cleanPublicRoleTitle('Founding Engineer'), 'Founding Engineer', 'quiet titles unchanged');
  assert.equal(
    cleanPublicRoleTitle('Eng $200-$400k/yr + equity'),
    'Eng',
    'comp-only tail leaves the role word',
  );
  {
    const cleaned = publicRolesFromFeed(
      {
        schema: 'demigod.roles-feed/8',
        roles: [
          {
            company: 'AIOS',
            title: 'Head of AI Engineering at AIOS — Remote, $200-$400k/yr + equity',
            url: 'https://jobs.ashbyhq.com/aios/1',
            firstObservedAt: '2026-08-05',
            location: 'Remote',
          },
        ],
      },
      { limit: 1, profiles: {} },
    );
    assert.equal(
      cleaned.roles[0].title,
      'Head of AI Engineering at AIOS — Remote',
      'selected public roles display cleaned titles',
    );
  }
  // One prolific employer cannot fill the rail when enough other employers exist.
  {
    const spread = publicRolesFromFeed(
      {
        schema: 'demigod.roles-feed/8',
        roles: [
          { company: 'Only', title: 'Role 1', url: 'https://jobs.ashbyhq.com/o/1', firstObservedAt: '2026-08-05', location: 'San Francisco' },
          { company: 'Only', title: 'Role 2', url: 'https://jobs.ashbyhq.com/o/2', firstObservedAt: '2026-08-05', location: 'San Francisco' },
          { company: 'Only', title: 'Role 3', url: 'https://jobs.ashbyhq.com/o/3', firstObservedAt: '2026-08-05', location: 'San Francisco' },
          { company: 'Other', title: 'Role X', url: 'https://jobs.ashbyhq.com/x/1', firstObservedAt: '2026-08-04', location: 'San Francisco' },
          { company: 'Third', title: 'Role Y', url: 'https://jobs.ashbyhq.com/t/1', firstObservedAt: '2026-08-04', location: 'San Francisco' },
        ],
      },
      { limit: 3, profiles: {} },
    );
    assert.equal(spread.roles.filter((r) => r.company === 'Only').length, 1, 'default per-company cap is 1 when peers exist');
    assert.equal(new Set(spread.roles.map((r) => r.company)).size, 3, 'three employers for three slots');
    const loose = publicRolesFromFeed(
      {
        schema: 'demigod.roles-feed/8',
        roles: [
          { company: 'Only', title: 'Role 1', url: 'https://jobs.ashbyhq.com/o/1', firstObservedAt: '2026-08-05', location: 'San Francisco' },
          { company: 'Only', title: 'Role 2', url: 'https://jobs.ashbyhq.com/o/2', firstObservedAt: '2026-08-05', location: 'San Francisco' },
          { company: 'Other', title: 'Role X', url: 'https://jobs.ashbyhq.com/x/1', firstObservedAt: '2026-08-04', location: 'San Francisco' },
        ],
      },
      { limit: 3, perCompany: 2, profiles: {} },
    );
    assert.equal(loose.roles.filter((r) => r.company === 'Only').length, 2, 'explicit perCompany=2 still works');
  }
  // postedAt passes through only when ledger-attributed (YYYY-MM-DD).
  {
    const withPost = publicRolesFromFeed(
      {
        schema: 'demigod.roles-feed/8',
        roles: [
          {
            company: 'Acme',
            title: 'Eng',
            url: 'https://jobs.ashbyhq.com/a/1',
            firstObservedAt: '2026-08-05',
            postedAt: '2026-07-01',
            location: 'San Francisco',
          },
          {
            company: 'Beta',
            title: 'PM',
            url: 'https://jobs.ashbyhq.com/b/1',
            firstObservedAt: '2026-08-05',
            postedAt: 'not-a-date',
            location: 'San Francisco',
          },
        ],
      },
      { limit: 2, profiles: {} },
    );
    assert.equal(withPost.roles.find((r) => r.company === 'Acme')?.postedAt, '2026-07-01');
    assert.equal(withPost.roles.find((r) => r.company === 'Beta')?.postedAt, null);
  }
  const tmp = path.join(ROOT, `.tmp-footer-roles-${process.pid}.html`);
  fs.writeFileSync(tmp, '<script id="demigod-foot-cdn-loader" src="x.js"></script>\n');
  const w = writeFooterPublicRoles(pub, tmp);
  assert.equal(w.ok, true);
  const html = fs.readFileSync(tmp, 'utf8');
  assert.ok(html.includes('demigod-public-roles-data'));
  assert.ok(html.indexOf('demigod-public-roles-data') < html.indexOf('demigod-foot-cdn-loader'));
  fs.unlinkSync(tmp);
  console.log(JSON.stringify({ ok: true, selftest: 'public-roles' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node demigod-public-roles.mjs [--limit <count>] | --selftest');
    process.exit(0);
  }
  const unknown = args.find((arg, i) => arg !== '--selftest' && arg !== '--limit' && args[i - 1] !== '--limit');
  if (unknown) {
    console.error(`public-roles: unknown argument ${unknown}`);
    process.exit(2);
  }
  if (args.includes('--selftest')) { selftest(); process.exit(0); }
  let feed = null;
  try { feed = JSON.parse(fs.readFileSync(FEED, 'utf8')); } catch { /* empty */ }
  const pub = publicRolesFromFeed(feed, { limit: argNum('--limit', 24), profiles: loadCompanyProfiles() });
  atomicWrite(OUT_JSON, JSON.stringify(pub, null, 2));
  atomicWrite(OUT_EMBED, embedScript(pub));
  const footer = writeFooterPublicRoles(pub);
  console.log(JSON.stringify({ ok: true, roles: pub.roles.length, out: OUT_JSON, embed: OUT_EMBED, footer }));
}
