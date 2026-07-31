#!/usr/bin/env node
/**
 * demigod-product-desk — productization spine for Match / Directory / Notes / Desk / DIE.
 *
 *   node demigod-product-desk.mjs            # JSON to stdout + write receipt
 *   node demigod-product-desk.mjs --md
 *   node demigod-product-desk.mjs --selftest
 *
 * Read-only. Does not publish, send mail, or invent accepted roles.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { statusReport as acceptedRoleReport } from './demigod-accepted-role.mjs';
import { refuseIfStale } from './demigod-evidence.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const LIVE = 'https://www.trydemigod.com';
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function countCompanies(mapPath) {
  const j = readJson(mapPath);
  return Array.isArray(j?.companies) ? j.companies.length : null;
}

function blogPublishedCount() {
  const j = readJson(path.join(ROOT, 'demigod-blog-posts.json'));
  const posts = Array.isArray(j?.posts) ? j.posts : [];
  return posts.filter((p) => p && p.published !== false).length;
}

function pilotSummary() {
  const paths = [
    path.join(ROOT, 'DEMIGOD-PILOTS.json'),
    path.join(process.env.HOME || '', 'DEMIGOD-PILOTS.json'),
  ];
  for (const p of paths) {
    const j = readJson(p);
    if (!j || !Array.isArray(j.pilots)) continue;
    const by = {};
    for (const row of j.pilots) {
      const s = String(row?.status || 'unknown');
      by[s] = (by[s] || 0) + 1;
    }
    return { path: p, total: j.pilots.length, byStatus: by };
  }
  return { path: null, total: 0, byStatus: {} };
}

function pairsSummary() {
  const j = readJson(path.join(ROOT, 'DEMIGOD-PAIRS.json'));
  if (!j) return { exists: false, total: 0, real: 0, sample: 0 };
  const pairs = Array.isArray(j.pairs) ? j.pairs : Array.isArray(j.items) ? j.items : [];
  let real = 0;
  let sample = 0;
  for (const p of pairs) {
    if (p?.sample === false) real += 1;
    else sample += 1;
  }
  return { exists: true, total: pairs.length, real, sample };
}

function demandSummary() {
  const j = readJson(path.join(BUSY, 'demand-status.json')) || {};
  const queue = j.queue || {};
  const drafts = j.drafts || j.hygiene || {};
  return {
    pending: queue.pending ?? null,
    total: queue.total ?? null,
    hygieneOk: drafts.ok ?? drafts.hygiene?.ok ?? null,
    clean: drafts.clean ?? drafts.hygiene?.clean ?? null,
    flagged: drafts.flagged ?? drafts.hygiene?.flagged ?? null,
    autoDmAllowed: j.autoDmAllowed === true ? true : false,
  };
}

function diskFootVer(root = ROOT) {
  try {
    const core = fs.readFileSync(path.join(root, 'demigod-foot-core.js'), 'utf8');
    const m = core.match(/dgFootVersion\s*=\s*['"]v?(\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function truthSummary(root = ROOT) {
  const j = readJson(path.join(BUSY, 'truth.json')) || {};
  const foot = j.foot || {};
  const live = j.live || {};
  const diskVer = diskFootVer(root) || foot.ver || foot.diskVer || j.diskVer || null;
  const liveVer = live.footVer || j.liveVer || null;
  const diskN = Number(String(diskVer || '').replace(/^v/, ''));
  const liveN = Number(String(liveVer || '').replace(/^v/, ''));
  const lag =
    Number.isFinite(diskN) && Number.isFinite(liveN) ? diskN - liveN : null;
  return {
    pass: j.pass === true,
    diskVer,
    liveVer,
    fullyShipped: j.fullyShipped === true && lag === 0,
    prepareOnly:
      j.prepareOnlyRelease === true ||
      j.prepareOnly === true ||
      (lag != null && lag > 0),
    lockFree: j.lock?.free !== false && j.lock?.held !== true,
    summaryLine: j.summaryLine || null,
  };
}

function researchSummary() {
  const catalog = readJson(path.join(ROOT, 'DEMIGOD-COMPANY-RESEARCH.json')) || {};
  const companies = Array.isArray(catalog.companies) ? catalog.companies : [];
  const seal = refuseIfStale('company-research-benchmark');
  return {
    operationalCatalogCount: companies.length,
    researchSealGreen: seal?.green === true,
    researchSealReason: seal?.reason || null,
    researchSealRunId: seal?.runId || null,
  };
}

/**
 * Canonical product surfaces for Demigod productization.
 * Public Match/Directory/Notes stay on trydemigod.com; Desk/DIE are ops surfaces.
 */
export function buildProductDesk(opts = {}) {
  const root = opts.root || ROOT;
  const accepted = opts.accepted || acceptedRoleReport();
  const pilots = pilotSummary();
  const pairs = pairsSummary();
  const demand = demandSummary();
  const truth = truthSummary(root);
  const research = researchSummary();
  const mapCos = countCompanies(path.join(root, 'DEMIGOD-SF-STARTUP-MAP.json'));
  const blogN = blogPublishedCount();
  const board = readJson(path.join(root, 'DEMIGOD-BOARD.json')) || {};
  const signal = board.signal || {};

  const deliveryLoop = {
    schema: 'demigod.delivery-loop/1',
    acceptedForDelivery: accepted.counts?.acceptedForDelivery ?? 0,
    hasAcceptedReceipts: accepted.hasAcceptedReceipts === true,
    phase2Ready: accepted.phase2Ready === true,
    gateOpen: accepted.gateOpen === true,
    boardRoles: accepted.counts?.boardRoles ?? 0,
    nonSampleRoles: accepted.counts?.nonSampleRoles ?? 0,
    boardIsCanonical: accepted.boardIsCanonical === true,
    realPairs: pairs.real,
    samplePairs: pairs.sample,
    pilotsOpen: (pilots.byStatus.piloted || 0) + (pilots.byStatus.new || 0) + (pilots.byStatus.shortlist || 0) + (pilots.byStatus.intro || 0),
    pilotsTotal: pilots.total,
    blockedReason:
      (accepted.counts?.acceptedForDelivery ?? 0) === 0
        ? 'no_accepted_real_role'
        : pairs.real === 0
          ? 'no_real_pair'
          : accepted.phase2Ready
            ? null
            : 'phase2_gate_closed_policy',
    nextUnblocked: [
      (accepted.counts?.acceptedForDelivery ?? 0) === 0 && 'Accept one real startup role (sample:false + featured inbox origin)',
      pairs.real === 0 && 'Create a real pair after shortlist (not sample)',
      'Mutual yes → intro draft only (no send without current-request auth)',
      'DIE company context only after accepted role (evidence drawer, no AI verdict)',
    ].filter(Boolean),
  };

  const surfaces = [
    {
      id: 'match',
      name: 'Demigod Match',
      kind: 'public',
      status: deliveryLoop.acceptedForDelivery > 0 ? 'partial' : 'live_empty_loop',
      summary: 'Two-sided SF talent match: private profiles, mutual yes, 10% on start.',
      urls: {
        live: `${LIVE}/`,
        hire: `${LIVE}/hire`,
        talent: `${LIVE}/talent`,
        pricing: `${LIVE}/pricing`,
      },
      modules: ['hire-wizard', 'talent-wizard', 'mutual-yes', 'intro-path', 'fee-10pct'],
      metrics: {
        realBoardRoles: signal.realRoles ?? deliveryLoop.nonSampleRoles,
        slotsTaken: signal.slotsTaken ?? null,
        acceptedForDelivery: deliveryLoop.acceptedForDelivery,
        realPairs: pairs.real,
      },
      productize: 'Deepen status pages for founder/talent after first real pair; keep Webflow+foot SPA.',
    },
    {
      id: 'directory',
      name: 'Demigod Directory',
      kind: 'public',
      status: mapCos != null && mapCos > 0 ? 'live' : 'missing',
      summary: 'SF startup map, hiring signals, observed roles, aging, pulse.',
      urls: {
        live: `${LIVE}/startups`,
        pulse: `${LIVE}/` /* hiring pulse fragment if linked */,
      },
      modules: ['sf-map', 'roles-feed', 'role-ledger', 'directory-aging', 'hiring-pulse'],
      metrics: { mapCompanies: mapCos },
      productize: 'Keep public free utility; ship CDN map when publish authorized.',
    },
    {
      id: 'notes',
      name: 'Demigod Notes',
      kind: 'public',
      status: blogN >= 1 ? 'live' : 'empty',
      summary: 'Product + market notes (JSON SoR → foot SPA).',
      urls: { live: `${LIVE}/blog`, spa: `${LIVE}/?p=blog` },
      modules: ['blog-posts', 'blog-quality', 'blog-sync'],
      metrics: { publishedDisk: blogN },
      productize: 'Disk may lead live until publish; SoR stays demigod-blog-posts.json.',
    },
    {
      id: 'desk',
      name: 'Demigod Desk',
      kind: 'ops',
      status: 'local',
      summary: 'Operator product: inbox, pilots, matches, demand drafts, seals, ship.',
      urls: {
        local: 'http://127.0.0.1:9878/desk',
        api: 'http://127.0.0.1:9878/api/desk',
        control: 'http://127.0.0.1:9878/',
      },
      modules: [
        'orient',
        'inbox',
        'pilots',
        'matches',
        'demand-drafts',
        'control-board',
        'ship-prepare',
        'tools',
      ],
      metrics: {
        demandPending: demand.pending,
        pilotsTotal: pilots.total,
        autoDmAllowed: demand.autoDmAllowed,
      },
      productize: 'This API + /desk page is the product spine for ops; auth later.',
    },
    {
      id: 'die',
      name: 'Demigod Research (DIE)',
      kind: 'ops',
      status: deliveryLoop.hasAcceptedReceipts ? 'gated_open_partial' : 'gated_closed',
      summary:
        'Inspectable public company facts for accepted roles only — not a Clay GTM OS.',
      urls: {
        api: 'http://127.0.0.1:9878/api/desk#die',
        docs: 'docs/die/ROADMAP.md',
      },
      modules: [
        'atomic-assertions',
        'evidence-drawer',
        'company-research-catalog',
        'research-seal',
        'phase2-role-context',
      ],
      metrics: {
        operationalCatalog: research.operationalCatalogCount,
        researchSealGreen: research.researchSealGreen,
        phase2Ready: deliveryLoop.phase2Ready,
      },
      productize:
        'Project company context into match-review only when acceptedForDelivery≥1; no public research SaaS.',
      forbidden: [
        'people-email-waterfalls',
        'auto-dm',
        'sequencer-ads-crm-clone',
        'always-on-account-memory-product',
      ],
    },
  ];

  const next = [];
  if (!deliveryLoop.hasAcceptedReceipts) {
    next.push({
      pri: 0,
      surface: 'match',
      task: 'accept-real-role',
      title: 'Accept one real startup role for delivery',
    });
  } else if (pairs.real === 0) {
    next.push({
      pri: 0,
      surface: 'match',
      task: 'real-pair',
      title: 'Open a real pair on an accepted role',
    });
  }
  if (truth.prepareOnly || (truth.diskVer && truth.liveVer && truth.diskVer !== truth.liveVer)) {
    next.push({
      pri: 1,
      surface: 'directory',
      task: 'publish-when-authorized',
      title: `Disk ${truth.diskVer || '?'} vs live ${truth.liveVer || '?'} — ship only with publish auth`,
    });
  }
  next.push({
    pri: 2,
    surface: 'desk',
    task: 'use-desk-api',
    title: 'Operate from /desk and /api/desk as product home',
  });

  return {
    schema: 'demigod.product-desk/1',
    at: new Date().toISOString(),
    live: LIVE,
    root,
    surfaces,
    deliveryLoop,
    truth,
    demand,
    pilots,
    pairs,
    research,
    accepted: {
      counts: accepted.counts,
      hasAcceptedReceipts: accepted.hasAcceptedReceipts,
      phase2Ready: accepted.phase2Ready,
      gateOpen: accepted.gateOpen,
      note: accepted.note,
      boardPath: accepted.boardPath,
      boardIsCanonical: accepted.boardIsCanonical,
      acceptedRoles: (accepted.acceptedRoles || []).map((r) => ({
        id: r.id || r.roleId,
        company: r.company || null,
        title: r.title || null,
      })),
    },
    next,
    architecture: {
      publicWebapp: 'Webflow + demigod-foot-core.js CDN SPA',
      opsWebapp: 'demigod-agent-dashboard :9878 + /desk',
      die: 'Internal evidence layer on Desk; Phase 2 gated by accepted real role',
      notBuilding: 'Clay clone / public GTM OS / people data marketplace',
    },
  };
}

export function productDeskMarkdown(doc = buildProductDesk()) {
  const lines = [
    `# Demigod product desk`,
    ``,
    `at: ${doc.at}`,
    `live: ${doc.live}`,
    ``,
    `## Delivery loop`,
    ``,
    `- acceptedForDelivery: **${doc.deliveryLoop.acceptedForDelivery}**`,
    `- realPairs: **${doc.deliveryLoop.realPairs}**`,
    `- phase2Ready: **${doc.deliveryLoop.phase2Ready}**`,
    `- blocked: ${doc.deliveryLoop.blockedReason || 'none'}`,
    ``,
    `## Surfaces`,
    ``,
  ];
  for (const s of doc.surfaces) {
    lines.push(`### ${s.name} (\`${s.id}\`) · ${s.kind} · ${s.status}`);
    lines.push(s.summary);
    lines.push(`Productize: ${s.productize}`);
    lines.push('');
  }
  lines.push(`## Next`);
  for (const n of doc.next) {
    lines.push(`- [P${n.pri}] ${n.title} (${n.surface})`);
  }
  return lines.join('\n') + '\n';
}

function writeReceipt(doc) {
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    atomicWrite(path.join(BUSY, 'product-desk.json'), JSON.stringify(doc, null, 2) + '\n');
  } catch {
    /* best-effort */
  }
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(m);
  };
  const doc = buildProductDesk({
    accepted: {
      counts: { boardRoles: 3, nonSampleRoles: 0, acceptedForDelivery: 0 },
      hasAcceptedReceipts: false,
      phase2Ready: false,
      gateOpen: false,
      note: 'test',
      boardPath: '/tmp/x',
      boardIsCanonical: true,
      acceptedRoles: [],
    },
  });
  assert(doc.schema === 'demigod.product-desk/1', 'schema');
  assert(doc.surfaces.length === 5, 'five surfaces');
  assert(doc.surfaces.every((s) => s.id && s.name && s.kind), 'surface fields');
  assert(doc.deliveryLoop.blockedReason === 'no_accepted_real_role', 'blocked empty');
  assert(doc.architecture.notBuilding.includes('Clay'), 'anti-clay');
  const md = productDeskMarkdown(doc);
  assert(/Delivery loop/.test(md), 'md');
  console.log('demigod-product-desk selftest: PASS');
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    process.exit(0);
  }
  const doc = buildProductDesk();
  writeReceipt(doc);
  if (args.includes('--md')) {
    console.log(productDeskMarkdown(doc));
  } else {
    console.log(JSON.stringify(doc, null, 2));
  }
}
