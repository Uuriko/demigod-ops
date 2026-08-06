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
 * PURE. Prefer SF/Bay (and multi-city rows that include them) for public homepage list.
 * Score 0 = off-geo noise (India-only / remote-Canada-only) — kept only if under limit after prefer.
 */
export function sfPublicRoleScore(location) {
  const s = String(location || '');
  if (
    /san\s*francisco|\bsf\b|bay\s*area|palo\s*alto|mountain\s*view|menlo\s*park|oakland|berkeley|san\s*mateo|redwood\s*city|sunnyvale|cupertino|san\s*jose|south\s*bay|peninsula/i.test(
      s,
    )
  ) {
    return 3;
  }
  const hasUs = /san\s*francisco|united\s*states|\bUSA\b|\bUS\b|california/i.test(s);
  const offGeo =
    /gurugram|gurgaon|bangalore|bengaluru|hyderabad|chennai|pune|mumbai|manila|singapore|hong\s*kong|tokyo|seoul|sydney|melbourne|remote\s*canada|canada\s*only|india\b|\bapac\b|\bemea\b/i.test(
      s,
    ) && !hasUs;
  if (offGeo) return 0;
  if (/\b(remote\s*us|united\s*states|\bUSA\b|california|\bCA\b|los\s*angeles|new\s*york|seattle|remote)\b/i.test(s)) {
    return 2;
  }
  return 1; // unknown / hybrid / blank — keep mid
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

/** PURE. Pick newest observed open roles for public display (startups first, SF/Bay preferred). */
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
  // Drop pure off-geo rows when any SF/US/unknown row exists (homepage is SF talent surface).
  const nonOff = mapped.filter((r) => sfPublicRoleScore(r.location) > 0);
  const pool = nonOff.length ? nonOff : mapped;
  /* Startups first. Previously this sorted on geo, then date, then company name — with no
     startup signal and no per-company cap, so the list filled with whichever big employer posts
     the most SF roles, and the alphabetical tiebreak made it literally Airbnb/Anthropic/Astro.
     Demigod's surface is SF *startup* talent; the directory has to show that. */
  // Titles that paste comp into the job name are real ATS text, but on an 8-slot homepage
  // rail they read as marketplace spam. Prefer quieter titles when startup/geo/date tie.
  const titleNoise = (title) =>
    /\$|\b\d{2,3}\s*[–-]\s*\d{2,3}\s*k\b|\+\s*equity\b/i.test(String(title || '')) ? 1 : 0;
  const ranked = pool.sort((a, b) => {
    const st = startupScore(profiles[companyKey(b.company)]) - startupScore(profiles[companyKey(a.company)]);
    if (st) return st;
    const ds = sfPublicRoleScore(b.location) - sfPublicRoleScore(a.location);
    if (ds) return ds;
    const tn = titleNoise(a.title) - titleNoise(b.title);
    if (tn) return tn;
    return b.firstObservedAt.localeCompare(a.firstObservedAt) || a.company.localeCompare(b.company);
  });
  /* Then spread across employers: no company may take more than perCompany slots, so one
     prolific poster cannot crowd out the rest of the market. Overflow refills any spare
     capacity at the end so a short feed still fills the list.
     When enough quiet titles exist, skip $comp-in-title rows on the primary pass so the
     homepage rail is not marketplace-spam shaped (full feed still has those rows). */
  const quietEnough = ranked.filter((r) => titleNoise(r.title) === 0).length >= cap;
  const used = new Map();
  const primary = [];
  const overflow = [];
  for (const r of ranked) {
    if (quietEnough && titleNoise(r.title)) {
      overflow.push(r);
      continue;
    }
    const k = companyKey(r.company);
    const n = used.get(k) || 0;
    if (n < perCompany && primary.length < cap) { used.set(k, n + 1); primary.push(r); }
    else overflow.push(r);
  }
  const roles = primary
    .concat(overflow.slice(0, Math.max(0, cap - primary.length)))
    // Rank on raw ATS titles (noise still demotes); display after selection is cleaned.
    .map((r) => {
      const cleaned = cleanPublicRoleTitle(r.title);
      return cleaned && cleaned !== r.title ? { ...r, title: cleaned } : r;
    });

  return {
    schema: 'demigod.public-roles/1',
    generatedAt: new Date().toISOString(),
    basis:
      'Recently first-observed open roles on public employer ATS boards (role-ledger), SF/Bay preferred when available. Optional employerDepartment/office/boardUpdatedAt/employmentType/workplaceType when present on public Greenhouse, Lever, or Ashby boards. Not Demigod matching inventory; not a fill-rate claim.',
    windowDays: feed.windowDays ?? null,
    roles,
  };
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
  assert.equal(sfPublicRoleScore('Gurugram'), 0);
  assert.equal(sfPublicRoleScore('Singapore'), 0, 'pure APAC office is off-geo for SF rail');
  assert.equal(sfPublicRoleScore('APAC | Remote'), 0, 'region-only remote is off-geo');
  assert.equal(sfPublicRoleScore('Remote US / Singapore'), 2, 'multi-geo with US stays eligible');
  const pub = publicRolesFromFeed(feed, { limit: 10 });
  assert.equal(pub.roles.length, 1);
  assert.equal(pub.roles[0].company, 'Acme');
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
