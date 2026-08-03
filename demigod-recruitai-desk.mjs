#!/usr/bin/env node
/**
 * RecruitAI desk — local bridge status + handoff pack for lalalune/recruitai-claude.
 *
 * Upstream (latest release as of 2026-07-30):
 *   https://github.com/lalalune/recruitai-claude/releases/tag/v0.1.1
 *   commit 2aa5021 · desktop Electron GTM desk (Gmail, local SQLite). Not a Demigod site surface.
 *
 * Demigod side stays drafts-only / no auto-send. We produce private committed export + partner
 * preview; the desktop app does discovery+send on its own machine.
 *
 *   node demigod-recruitai-desk.mjs status
 *   node demigod-recruitai-desk.mjs --json
 *   node demigod-recruitai-desk.mjs pack          # snapshot export → handoff folder
 *   node demigod-recruitai-desk.mjs refresh       # export + partner preview + pack
 *   node demigod-recruitai-desk.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { loadLatest, isFresh, refuseIfStale } from './demigod-evidence.mjs';
import { loadRecruitaiExport } from './demigod-lead-sourcer.mjs';
import { buildSeedPack, writeSeedPackFiles } from './demigod-recruitai-seed-pack.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Pinned to latest GitHub release we integrate against. Bump only after re-review. */
export const RECRUITAI_UPSTREAM = {
  repo: 'lalalune/recruitai-claude',
  tag: 'v0.1.1',
  commit: '2aa5021',
  publishedAt: '2026-07-29T21:07:10Z',
  releaseUrl: 'https://github.com/lalalune/recruitai-claude/releases/tag/v0.1.1',
  linuxAppImage:
    'https://github.com/lalalune/recruitai-claude/releases/download/v0.1.1/recruitAI-0.1.1.AppImage',
  note:
    'Local-first agency GTM desk. Demigod never runs its Gmail send path; use export handoff + partner preview here.',
};

const EXPORT_POINTER = path.join(BUSY, 'recruitai-export');
const HANDOFF_DIR = path.join(BUSY, 'recruitai-handoff');
const PARTNER_LATEST = path.join(BUSY, 'lead-sourcer-latest.json');
const STATUS_OUT = path.join(BUSY, 'recruitai-desk-status.json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function exportStatus() {
  if (!fs.existsSync(EXPORT_POINTER)) {
    return {
      ok: false,
      reason: 'no-export',
      hint: 'node demigod-recruitai-export.mjs',
    };
  }
  let source;
  try {
    source = loadRecruitaiExport({ committedOnly: true, withFiles: true });
  } catch (e) {
    return {
      ok: false,
      reason: 'invalid-export',
      detail: String(e?.message || e),
      hint: 'node demigod-recruitai-export.mjs',
    };
  }
  const { artifact: doc, commit, generation: gen } = source;
  const re = doc?.researchEvidence || {};
  const rows = Array.isArray(doc?.rows) ? doc.rows.length : 0;
  const cr =
    doc?.diagnostics?.rowsWithCompanyResearch ??
    doc?.counts?.rowsWithCompanyResearch ??
    null;
  let mode = null;
  try {
    mode = (fs.statSync(path.join(gen, 'latest.json')).mode & 0o777).toString(8);
  } catch {
    /* */
  }
  return {
    ok: true,
    generation: gen,
    schema: doc?.schema || null,
    generatedAt: doc?.generatedAt || commit?.at || null,
    rows,
    rowsWithCompanyResearch: cr,
    researchGreen: re.green === true,
    researchReason: re.reason || null,
    researchRunId: re.runId || null,
    commitSchema: commit?.schema || null,
    fileMode: mode,
    csvPath: path.join(gen, 'latest.csv'),
    jsonPath: path.join(gen, 'latest.json'),
  };
}

function researchStatus() {
  try {
    const env = loadLatest('company-research-benchmark');
    const fr = isFresh(env);
    const refuse = refuseIfStale('company-research-benchmark');
    return {
      pass: env?.result?.pass === true,
      fresh: fr.fresh === true,
      reason: fr.reason || refuse?.reason || null,
      green: refuse?.green === true,
      runId: env?.runId || null,
      summary: env?.result?.summary || null,
    };
  } catch (e) {
    return { pass: false, fresh: false, green: false, reason: String(e?.message || e) };
  }
}

function partnerStatus() {
  const doc = readJson(PARTNER_LATEST);
  if (!doc) return { ok: false, reason: 'no-partner-preview' };
  const receipt = doc.selectionReceipt || null;
  return {
    ok: true,
    at: doc.at || null,
    type: doc.type || null,
    leads: Array.isArray(doc.leads) ? doc.leads.length : 0,
    selectionReceipt: receipt,
    sample: (doc.leads || []).slice(0, 3).map((l) => ({
      id: l.id,
      company: l.company,
      openReqCount: l.openReqCount,
      domain: l.domain,
    })),
  };
}

export function buildDeskStatus() {
  const exportSt = exportStatus();
  const research = researchStatus();
  const partner = partnerStatus();
  const handoffReady = fs.existsSync(path.join(HANDOFF_DIR, 'latest.json'));
  return {
    schema: 'demigod.recruitai-desk/1',
    at: new Date().toISOString(),
    upstream: RECRUITAI_UPSTREAM,
    policy: {
      demigodSend: 'drafts-only',
      autoDm: false,
      recruitaiSend: 'desktop-app-only',
      publicSite: false,
    },
    research,
    export: exportSt,
    partner,
    handoff: {
      dir: HANDOFF_DIR,
      ready: handoffReady,
      readme: path.join(HANDOFF_DIR, 'README.md'),
    },
    next: exportSt.ok
      ? partner.ok
        ? 'pack or open handoff; run partner preview in dash Tools'
        : 'node demigod-lead-sourcer.mjs --type=partners --limit=10'
      : 'node demigod-recruitai-export.mjs',
    cmds: {
      export: 'node demigod-recruitai-export.mjs',
      partnerPreview: 'node demigod-lead-sourcer.mjs --type=partners --limit=10',
      pack: 'node demigod-recruitai-desk.mjs pack',
      refresh: 'node demigod-recruitai-desk.mjs refresh',
      status: 'node demigod-recruitai-desk.mjs status',
      importDry: 'node demigod-funnel.mjs import-sourcer --id=yc:stripe',
      recruitaiImportDry: 'node demigod-recruitai-import.mjs --dry-run',
      recruitaiImportApply: 'node demigod-recruitai-import.mjs --apply',
    },
  };
}

export function packHandoff() {
  const source = loadRecruitaiExport({ committedOnly: true, withFiles: true });
  const st = buildDeskStatus();
  if (!st.export.ok || st.export.generation !== source.generation) {
    throw new Error('pack requires a committed RecruitAI export — run demigod-recruitai-export.mjs first');
  }
  fs.mkdirSync(HANDOFF_DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(HANDOFF_DIR, 0o700);
  const gen = source.generation;
  for (const name of ['latest.json', 'latest.csv', 'commit.json']) {
    atomicWrite(path.join(HANDOFF_DIR, name), source.files[name], { mode: 0o600 });
  }

  // Seed pack: CompanySeed jsonl + demigod signals (adapter for future SQLite import)
  const seedPack = buildSeedPack(source.artifact, { at: st.at, generation: gen });
  const seedEnvelope = writeSeedPackFiles(seedPack, HANDOFF_DIR);

  const researchStaleVsExport =
    st.research &&
    st.export.ok &&
    st.export.researchGreen === true &&
    st.research.green !== true;

  const readme = `# Demigod → recruitAI handoff

**Upstream pin:** ${RECRUITAI_UPSTREAM.repo} \`${RECRUITAI_UPSTREAM.tag}\` (${RECRUITAI_UPSTREAM.commit})
**Release:** ${RECRUITAI_UPSTREAM.releaseUrl}
**Packed at:** ${st.at}

## What this is

Private Demigod Intelligence export for the **agency GTM desk** (lalalune/recruitai-claude).
Not website content. No contacts, scores, consent, or send authority.

| File | Purpose |
|------|---------|
| \`latest.json\` | \`demigod.recruitai-export/3\` table + relationship graph |
| \`latest.csv\` | Flat rows for spreadsheet / offline review |
| \`commit.json\` | Hash bind of JSON+CSV generation |
| \`company-seeds.jsonl\` | One recruitAI \`CompanySeed\` per line \`{name,domain?,website?}\` |
| \`demigod-signals.json\` | Demigod hiring signals by domain / mapCompanyId (not stock v0.1.1 import) |
| \`seed-pack.json\` | Envelope + top open-req companies for dash/tools |

## How to use with recruitAI desktop

1. Install/run the desktop app from the release (Linux: AppImage on this machine at \`/tmp/dg-busy/recruitai-app/\`).
2. Use recruitAI's own free discovery for ATS sweeps + Gmail send (its product surface).
3. Use **this pack** as Demigod-grounded hiring signal when reviewing SF companies:
   - openReqCount, maxObservedOpenDays, staleAttributedPostedReqCount
   - openPeopleOpsReqCount (positive signal only)
   - noAgency evidence quote/URL when present
   - companyResearch only when export researchGreen is true **and** Demigod research is currently green
4. \`company-seeds.jsonl\` matches v0.1.1 \`CompanySeed\` — stock app does not auto-load it; use Demigod import:
   \`\`\`bash
   node demigod-recruitai-import.mjs --dry-run   # plan only
   node demigod-recruitai-import.mjs --apply     # backup + insert/update company rows
   \`\`\`
   Companies only (no contacts/drafts/sends). Prefer dry-run while the desktop app is open.

Partner CRM promotion stays on Demigod: \`node demigod-funnel.mjs import-sourcer --id=yc:slug\` (dry by default).

${researchStaleVsExport ? '**Warning:** export still marks researchGreen but Demigod research seal is not green — reseal + re-export before trusting research cells.\\n' : ''}
## Policy

- Demigod demand: **drafts-only** (no auto-DM).
- recruitAI Gmail send: only inside the desktop app under its governor.
- Do not paste this pack onto the public site or CDN.

## Regenerate

\`\`\`bash
node demigod-recruitai-desk.mjs refresh
# or seeds only from current export:
node demigod-recruitai-seed-pack.mjs --out /tmp/dg-busy/recruitai-handoff
\`\`\`
`;
  atomicWrite(path.join(HANDOFF_DIR, 'README.md'), readme, { mode: 0o600 });
  const out = {
    ...st,
    seedPack: seedEnvelope.counts,
    researchStaleVsExport: Boolean(researchStaleVsExport),
    handoff: { ...st.handoff, ready: true, packedAt: st.at, seeds: seedEnvelope.counts?.seeds ?? 0 },
  };
  atomicWrite(path.join(HANDOFF_DIR, 'desk-status.json'), `${JSON.stringify(out, null, 2)}\n`, {
    mode: 0o600,
  });
  return out;
}

function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_ROOT: ROOT, DEMIGOD_BUSY: BUSY },
  });
  if (r.status !== 0) {
    throw new Error(
      `${script} exit ${r.status}: ${(r.stderr || r.stdout || '').slice(-400)}`,
    );
  }
  return r;
}

export function refreshDesk() {
  runNode('demigod-recruitai-export.mjs');
  runNode('demigod-lead-sourcer.mjs', ['--type=partners', '--limit=10']);
  return packHandoff();
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`recruitai-desk selftest: ${m}`);
  };
  assert(RECRUITAI_UPSTREAM.tag === 'v0.1.1', 'upstream pin');
  assert(/lalalune\/recruitai-claude/.test(RECRUITAI_UPSTREAM.repo), 'repo');
  const st = buildDeskStatus();
  assert(st.schema === 'demigod.recruitai-desk/1', 'schema');
  assert(st.policy.demigodSend === 'drafts-only', 'policy drafts-only');
  assert(st.policy.autoDm === false, 'no auto-dm');
  assert(st.upstream.releaseUrl.includes('v0.1.1'), 'release url');
  assert(typeof st.cmds.export === 'string' && st.cmds.export.includes('recruitai-export'), 'cmds');
  // exportStatus never throws on missing
  assert(st.export && typeof st.export.ok === 'boolean', 'export status shape');
  // Seed pack pure path (no disk export required)
  const mini = buildSeedPack({
    schema: 'demigod.recruitai-export/3',
    rows: [{ name: 'Zed', domain: 'zed.test', openReqCount: 2, mapCompanyId: 'yc:zed' }],
  });
  assert(mini.counts.seeds === 1 && mini.entries[0].seed.domain === 'zed.test', 'seed pack wire');
  console.log(JSON.stringify({ ok: true, selftest: 'recruitai-desk', upstream: RECRUITAI_UPSTREAM.tag }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  const json = args.includes('--json') || args.includes('-j');
  const cmd = args.find((a) => !a.startsWith('-')) || 'status';

  let out;
  if (cmd === 'status' || cmd === 'desk') {
    out = buildDeskStatus();
    atomicWrite(STATUS_OUT, `${JSON.stringify(out, null, 2)}\n`, { mode: 0o600 });
  } else if (cmd === 'pack') {
    out = packHandoff();
    atomicWrite(STATUS_OUT, `${JSON.stringify(out, null, 2)}\n`, { mode: 0o600 });
  } else if (cmd === 'refresh') {
    out = refreshDesk();
    atomicWrite(STATUS_OUT, `${JSON.stringify(out, null, 2)}\n`, { mode: 0o600 });
  } else if (cmd === 'help' || args.includes('--help')) {
    console.log(`usage: node demigod-recruitai-desk.mjs status|pack|refresh [--json]
  status   — export + research + partner + upstream pin
  pack     — copy committed export into ${HANDOFF_DIR}
  refresh  — export + partner preview + pack
  --selftest
Upstream: ${RECRUITAI_UPSTREAM.releaseUrl}`);
    process.exit(0);
  } else {
    console.error(`unknown command ${cmd}`);
    process.exit(2);
  }

  if (json) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`# RecruitAI desk · upstream ${out.upstream.tag}`);
    console.log(`  research: pass=${out.research.pass} fresh=${out.research.fresh} green=${out.research.green}`);
    console.log(
      `  export: ${out.export.ok ? `rows=${out.export.rows} CR=${out.export.rowsWithCompanyResearch} researchGreen=${out.export.researchGreen}` : out.export.reason}`,
    );
    console.log(
      `  partner: ${out.partner.ok ? `leads=${out.partner.leads}` : out.partner.reason}`,
    );
    console.log(`  handoff: ${out.handoff.ready ? out.handoff.dir : 'not packed'} · next: ${out.next}`);
    console.log(`  release: ${out.upstream.releaseUrl}`);
  }
}

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }
}
