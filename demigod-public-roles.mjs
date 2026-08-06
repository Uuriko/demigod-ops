#!/usr/bin/env node
/**
 * Build public "recently observed roles" asset for the website from DEMIGOD-ROLES-FEED.json.
 *
 * Honesty: firstObservedAt is Demigod's sighting; postedAt only when ledger attributed;
 * links are employer ATS URLs only. Not matching inventory (not DEMIGOD-BOARD.json).
 *
 *   node demigod-public-roles.mjs [--days 3] [--limit 24]
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
const PER_COMPANY_MAX = 2;
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
  const offGeo =
    /gurugram|gurgaon|bangalore|bengaluru|hyderabad|chennai|pune|mumbai|manila|remote\s*canada|canada\s*only|india\b/i.test(
      s,
    ) && !/san\s*francisco|united\s*states|\bUSA\b|\bUS\b|california/i.test(s);
  if (offGeo) return 0;
  if (/\b(remote\s*us|united\s*states|\bUSA\b|california|\bCA\b|los\s*angeles|new\s*york|seattle|remote)\b/i.test(s)) {
    return 2;
  }
  return 1; // unknown / hybrid / blank — keep mid
}

/**
 * PURE. Is this company a startup, from map evidence only?
 *   2 = known startup — YC-shaped: a small team size, or a declared funding stage
 *   1 = unknown — no profile or no signals; never punished for missing data
 *   0 = known established — wikidata-listed SF tech with no team size and no stage
 *
 * The map carries teamSize/stage for YC companies (median team 5, p90 51) and tags
 * established firms `wikidata-sf-tech` with neither. Anthropic and OpenAI are the second
 * case; that is the whole signal, and it comes from data already on disk.
 */
export function startupScore(profile) {
  if (!profile) return 1;
  const team = Number.isFinite(profile.teamSize) ? profile.teamSize : null;
  const stage = String(profile.stage || '').trim();
  if ((team !== null && team <= STARTUP_TEAM_MAX) || stage) return 2;
  const tags = Array.isArray(profile.tags) ? profile.tags : [];
  if (tags.includes('wikidata-sf-tech') && team === null && !stage) return 0;
  return 1;
}

/** PURE. Company-name key for joining feed rows to map rows. */
export function companyKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Build companyKey -> {teamSize, stage, tags} from the startup map. Returns {} when absent. */
export function loadCompanyProfiles(mapPath = MAP) {
  try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const out = {};
    for (const c of map.companies || []) {
      const k = companyKey(c.name);
      if (!k || out[k]) continue;
      out[k] = { teamSize: c.teamSize ?? null, stage: c.stage ?? null, tags: c.tags || [] };
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
  const ranked = pool.sort((a, b) => {
    const st = startupScore(profiles[companyKey(b.company)]) - startupScore(profiles[companyKey(a.company)]);
    if (st) return st;
    const ds = sfPublicRoleScore(b.location) - sfPublicRoleScore(a.location);
    if (ds) return ds;
    return b.firstObservedAt.localeCompare(a.firstObservedAt) || a.company.localeCompare(b.company);
  });
  /* Then spread across employers: no company may take more than perCompany slots, so one
     prolific poster cannot crowd out the rest of the market. Overflow refills any spare
     capacity at the end so a short feed still fills the list. */
  const used = new Map();
  const primary = [];
  const overflow = [];
  for (const r of ranked) {
    const k = companyKey(r.company);
    const n = used.get(k) || 0;
    if (n < perCompany && primary.length < cap) { used.set(k, n + 1); primary.push(r); }
    else overflow.push(r);
  }
  const roles = primary.concat(overflow.slice(0, Math.max(0, cap - primary.length)));

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
  const pub = publicRolesFromFeed(feed, { limit: 10 });
  assert.equal(pub.roles.length, 1);
  assert.equal(pub.roles[0].company, 'Acme');
  assert.ok(embedScript(pub).includes('window.__dgPublicRoles='));
  assert.ok(!embedScript(pub).includes('</script'));
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
  if (process.argv.includes('--selftest')) { selftest(); process.exit(0); }
  let feed = null;
  try { feed = JSON.parse(fs.readFileSync(FEED, 'utf8')); } catch { /* empty */ }
  const pub = publicRolesFromFeed(feed, { limit: argNum('--limit', 24), profiles: loadCompanyProfiles() });
  atomicWrite(OUT_JSON, JSON.stringify(pub, null, 2));
  atomicWrite(OUT_EMBED, embedScript(pub));
  const footer = writeFooterPublicRoles(pub);
  console.log(JSON.stringify({ ok: true, roles: pub.roles.length, out: OUT_JSON, embed: OUT_EMBED, footer }));
}
