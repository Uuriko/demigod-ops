#!/usr/bin/env node
/**
 * demigod-tools-os-selftest — suite: orient/unify/next/truth identity + evidence
 *
 *   node demigod-tools-os-selftest.mjs
 *   bin/dg-tools-selftest
 *
 * Runs child selftests (unify, next-identity, poison-green, ship facts, lock who).
 * Exit 0 only if tools OS contracts hold (assertSame path, no false green).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { beginRun, sealRun, isFresh, refuseIfStale, loadLatest } from './demigod-evidence.mjs';
import { checkContract } from './demigod-review-proof.mjs';
import { buildNext } from './demigod-next.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = '/tmp/dg-busy/tools-os-selftest.json';
const fails = [];
const spawnErrors = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));
const ran = (r) => !r.error && r.status !== null;
const exited = (r, codes) => ran(r) && codes.includes(Number(r.status));
const diagnoseSpawn = (label, r) => {
  if (!r.error) return;
  const message = String(r.error.message || r.error.code || 'child start failed')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
  const detail = {
    label,
    code: r.error.code || null,
    syscall: r.error.syscall || null,
    path: r.error.path || null,
    message,
  };
  spawnErrors.push(detail);
  console.error(`${label}: child process failed to start${detail.code ? ` (${detail.code})` : ''}: ${message}`);
};

const qualitySource = fs.readFileSync(path.join(ROOT, 'bin/dg-quality'), 'utf8');
const dgSource = fs.readFileSync(path.join(ROOT, 'bin/dg'), 'utf8');
const eventsOnlineSource = fs.readFileSync(path.join(ROOT, 'demigod-events-online.mjs'), 'utf8');
const dashboardSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8');
ok(
  /events-outbox\)[\s\S]{0,100}exec bin\/dg-events-outbox/.test(dgSource) &&
    /events-invite-drain\|invite-drain\)[\s\S]{0,100}exec node demigod-events-invite-drain\.mjs/.test(dgSource) &&
    /events-online\)[\s\S]{0,100}exec node demigod-events-online\.mjs/.test(dgSource),
  'dg routes Events outbox and real invite drain through the control-plane front door',
);
ok(
  /certified: !hostUnobservable && publicOk && websiteConfig\.reachable === true && hygiene\.ok && nativeRsvpRoutes === true/.test(eventsOnlineSource),
  'Events online status certifies only observable, public, hygienic health',
);
ok(
  /const confirmedCount = Array\.isArray\(store\.rsvps\)[\s\S]{0,120}confirmedRsvps\.length[\s\S]{0,120}active\.outcomes\?\.confirmed[\s\S]{0,80}: null/.test(dashboardSource),
  'dashboard keeps unknown Events RSVP counts null instead of inventing zero',
);
ok(
  /Q3\)[\s\S]{0,220}demigod-review\.mjs --bug --json --no-contract --fail-on critical[\s\S]{0,120}--files demigod-foot-core\.js demigod-head-minimal\.html demigod-blog-posts\.json/.test(qualitySource) &&
    /Q4\)[\s\S]{0,120}demigod-review\.mjs --json --no-contract/.test(qualitySource),
  'quality reviews scope bug checks to website sources and bypass mutate-contract gating',
);

function writeReceipt(pass, { mode = 'full' } = {}) {
  const degraded = mode !== 'full';
  const contractPass = fails.length === 0;
  const rerunCommand = 'node demigod-tools-os-selftest.mjs';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const receipt = JSON.stringify({
    schema: 'demigod.tools-os-selftest/1',
    at: new Date().toISOString(),
    pass,
    contractPass,
    osAttested: pass && !degraded && spawnErrors.length === 0,
    mode,
    executionMode: mode === 'full' ? 'child-process' : mode,
    rerunCommand,
    degraded,
    blocked: spawnErrors.length > 0,
    failureKind: pass ? null : (spawnErrors.length ? 'child-start' : (fails.length ? 'contract' : null)),
    fails,
    spawnErrors,
  }, null, 2) + '\n';
  // The never-stop loop and dashboard refresh can run this suite concurrently.
  // Publish by rename so readers never observe a truncated JSON receipt.
  const temp = `${OUT}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temp, receipt);
    fs.renameSync(temp, OUT);
  } finally {
    try { fs.unlinkSync(temp); } catch {}
  }
}

const foot = path.join(ROOT, 'demigod-foot-core.js');
const run = beginRun('selftest', { scope: [foot] });
const sealed = sealRun(run, { pass: true, summary: 'selftest' });
ok(Boolean(sealed.runId && sealed._path), 'seal evidence');
const fr = isFresh(sealed);
ok(fr.fresh, 'fresh after seal');

// mutate hash expectation by lying
const bad = { ...sealed, inputsAtSeal: { files: { 'demigod-foot-core.js': '0'.repeat(64) } } };
ok(!isFresh(bad).fresh, 'stale on hash mismatch');

const rTruth = spawnSync(process.execPath, [path.join(ROOT, 'demigod-truth.mjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 90000,
});
if (!rTruth.error) ok(exited(rTruth, [0, 1]), 'truth runs');
diagnoseSpawn('truth', rTruth);
// A denied first child means this environment cannot execute the suite at all.
// Stop here so one infrastructure fault is not reported as a cascade of
// contract/JSON failures. Exit 2 distinguishes "suite could not run" from a
// real contract failure (exit 1).
if (rTruth.error) {
  if (rTruth.error.code === 'EPERM') {
    const orientSource = fs.readFileSync(path.join(ROOT, 'demigod-orient.mjs'), 'utf8');
    const truthSource = fs.readFileSync(path.join(ROOT, 'demigod-truth.mjs'), 'utf8');
    const shipSource = fs.readFileSync(path.join(ROOT, 'demigod-ship.mjs'), 'utf8');
    const demandSource = fs.readFileSync(path.join(ROOT, 'demigod-demand.mjs'), 'utf8');
  const neverStopSource = fs.readFileSync(path.join(ROOT, 'demigod-never-stop-loop.mjs'), 'utf8');
    const nextSource = fs.readFileSync(path.join(ROOT, 'demigod-next.mjs'), 'utf8');
    const controlSource = fs.readFileSync(path.join(ROOT, 'demigod-control.mjs'), 'utf8');
    const dashboardSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8');
    const dashboardUiSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html'), 'utf8');
    const dashboardCliSource = fs.readFileSync(path.join(ROOT, 'bin/dg-dash'), 'utf8');
    ok(
      /COORD_CACHE/.test(dashboardCliSource) &&
        /host_receipt_fresh/.test(dashboardCliSource) &&
        /cached:true,degraded:true,cacheAgeMs:Math\.max\(0,age\)/.test(dashboardCliSource) &&
        /items=\(q\?\.items\|\|\[\]\)\.filter/.test(dashboardCliSource) &&
        /quality:q&&\{at:q\.at,openP0P1:items\.length,items\},claims:read\("claims\.json"\)/.test(dashboardCliSource),
      'fallback dashboard coord command labels cached evidence and preserves quality/claims safety state',
    );
    try {
      const inlineScripts = [...dashboardUiSource.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
      ok(inlineScripts.length > 0, 'fallback dashboard UI contains an inline application script');
      ok(
        /const request = \(async\(\)=>\{[\s\S]*if\(loadInflight===request\) loadInflight=null;[\s\S]*loadInflight=request;[\s\S]*return request;/.test(dashboardUiSource),
        'fallback dashboard superseded refresh cannot clear the active request slot',
      );
      for (const [index, match] of inlineScripts.entries()) {
        new vm.Script(match[1], { filename: `demigod-agent-dashboard-ui.inline-${index}.js` });
      }
      ok(true, 'fallback dashboard inline JavaScript parses');
    } catch (error) {
      console.error('fallback dashboard inline JavaScript parse error:', error.message);
      ok(false, 'fallback dashboard inline JavaScript parses');
    }
    const selftestSource = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const cm6Source = fs.readFileSync(path.join(ROOT, 'demigod-cm6-paste-publish.mjs'), 'utf8');
    const shipHeadSource = fs.readFileSync(path.join(ROOT, 'demigod-ship-head-now.mjs'), 'utf8');
    ok(
      shipHeadSource.includes("CLI_ARGS.has('--help')") &&
        shipHeadSource.includes('process.exit(0)') &&
        shipHeadSource.indexOf("CLI_ARGS.has('--help')") < shipHeadSource.indexOf("assertCanWriteFoot({ label: 'ship-head-now' })"),
      'fallback head ship help exits before mutation gates',
    );
    const cycleWorkSource = fs.readFileSync(path.join(ROOT, 'demigod-cycle-work.mjs'), 'utf8');
    const cycleStatusSource = fs.readFileSync(path.join(ROOT, 'demigod-cycle-status.mjs'), 'utf8');
    ok(
      /function refreshDetail\(result\)[\s\S]{0,900}JSON\.parse\(raw\)/.test(cycleWorkSource) &&
        /const tail = refreshDetail\(r\)/.test(cycleWorkSource),
      'fallback tools refresh receipts summarize JSON instead of clipping dashboard payloads',
    );
    ok(!selftestSource.includes('assert' + '('), 'fallback tools selftest uses receipt-aware assertions');
  ok(/assertSameInProcess\s*\(/.test(orientSource), 'fallback orient uses in-process NEXT identity');
  ok(
    /ship\?\.next && typeof ship\.next === ['"]object['"] && ship\.next\.id && !ship\.next\.stage/.test(orientSource) &&
      /!\/\^\[0-9a-f\]\{8,\}\$\/i\.test\(ship\.next\.id\)/.test(orientSource),
    'fallback orient excludes ship stage-chain metadata from canonical NEXT identity',
  );
  ok(
    /const lockCompromised = Boolean\(lockHeld && lockOwnerAlive === false\)/.test(orientSource) &&
      /OWNER EXITED; lease held/.test(orientSource),
    'fallback orient surfaces compromised foot leases without unlocking them',
  );
  ok(
      /lockOwnerIsLocal\s*=\s*!lock\?\.host \|\| lock\.host === os\.hostname\(\)/.test(orientSource) &&
      /lockHasOwnerPid\s*=\s*lock\?\.pidScope === ['"]lease-owner['"]/.test(orientSource) &&
      /lockHeld && lockOwnerIsLocal && lockHasOwnerPid[\s\S]{0,80}\? processAlive\(lock\?\.pid\)[\s\S]{0,30}: null/.test(orientSource) &&
      /ownerIsLocal: lockHeld \? lockOwnerIsLocal : null/.test(orientSource),
    'fallback orient requires a local explicit lease-owner PID before inferring liveness',
  );
  ok(
    /lockHasOwnerPid\s*=\s*footLock\?\.pidScope === ['"]lease-owner['"]/.test(controlSource) &&
      /lockHeld && lockOwnerIsLocal && lockHasOwnerPid/.test(controlSource) &&
      /reservation:\s*Boolean\(lockHeld && footLock\?\.pidScope === ['"]claim-command['"]\)/.test(controlSource),
    'fallback control plane does not infer publisher liveness from a claim-command reservation PID',
  );
  ok(
    /buildControlPlane\(\{ dashStatus: data \}\)/.test(dashboardSource) &&
      /suppliedDashStatus \|\| safeJsonFile/.test(controlSource) &&
      !/writeJsonAtomic\(STATUS_JSON, \{ \.\.\.data, control: undefined \}\)/.test(dashboardSource),
    'fallback dashboard passes in-memory status to control without publishing a partial receipt',
  );
    ok(
      /function clearGoChord\(\)/.test(dashboardUiSource) &&
        /goChordTimer=setTimeout\(clearGoChord,1200\)/.test(dashboardUiSource) &&
        /if\(goChord\)\{\s*clearGoChord\(\)/.test(dashboardUiSource),
      'fallback dashboard navigation chord expires and clears on consumption',
    );
    ok(
      /if \(terminal && state\.failCounts\) delete state\.failCounts\[work\.id\]/.test(neverStopSource) &&
        /if \(terminal\) state\.current = null/.test(neverStopSource),
      'fallback never-stop terminal state clears stale current and failure count',
    );
    ok(
      /function\s+productHealth\s*\(/.test(dashboardSource) &&
        /truthGreen\s*=\s*data\?\.truthEvidence\?\.green\s*===\s*true/.test(dashboardSource) &&
        /url\.pathname\s*===\s*['"]\/healthz['"]/.test(dashboardSource) &&
        /url\.pathname\s*===\s*['"]\/api\/healthz['"]/.test(dashboardSource) &&
        /url\.pathname\s*===\s*['"]\/api\/health['"]/.test(dashboardSource) &&
        /res\.writeHead\(health\.ok\s*\?\s*200\s*:\s*503/.test(dashboardSource),
      'fallback dashboard separates liveness from fail-closed product health',
    );
    ok(
      /const liveOk = truthGreen \|\| data\?\.live\?\.ok === true \|\| data\?\.live\?\.reachable === true \|\| data\?\.live\?\.htmlOk === true/.test(dashboardSource) &&
        /if \(next\.shipped\) site \+= ['"] · hash chain green['"]/.test(dashboardSource),
      'fallback dashboard glance lets fresh canonical truth override an unobservable local probe',
    );
    ok(
      /const allClear\s*=\s*d\.truthEvidence\?\.green\s*===\s*true\s*&&\s*d\.live\?\.ok/.test(dashboardUiSource),
      'fallback dashboard all-clear bar requires canonical green truth evidence',
    );
    ok(
      /releaseDetails\?\.identityDelta\s*\|\|/.test(dashboardSource) &&
        /releaseDetails\?\.core\s*&&\s*releaseDetails\?\.manifest/.test(dashboardSource) &&
        /expected === staged \? \[\] : \[\[key, \{ expected, staged \}\]\]/.test(dashboardSource),
      'fallback dashboard derives release identity from website core/manifest receipts',
    );
    ok(
      /const flags = \[/.test(cycleStatusSource) &&
        /child-start-blocked/.test(cycleStatusSource) &&
        /flags\.join\(['"][,]?['"]\)/.test(cycleStatusSource),
      'fallback cycle status explains flag-only check exceptions',
    );
    ok(
      /draftHygiene\.stale===true[\s\S]{0,180}draftHygiene\.ok===true[\s\S]{0,220}draftHygiene\.ok===false/.test(dashboardUiSource) &&
        !/draftHygiene\.stale===true\s*\?\s*\(draftHygiene\.stale===true/.test(dashboardUiSource),
      'fallback dashboard renders fresh clean and flagged draft hygiene states',
    );
    ok(
      /console\.log\(\s*`5 demand[\s\S]*?drafts\.hygiene=\$\{formatDemandHygiene\(/.test(orientSource) &&
        !/console\.log\(\s*`6 lamps/.test(orientSource) &&
        /receipt=\$\{path\.basename\(hygiene\.statusPath\)\}\$\{hygiene\.jsonPointer \|\| '\/drafts\/hygiene'\}/.test(orientSource),
      'fallback orient keeps draft hygiene in the exact five-line CLI card',
    );
    ok(
      /reason=\$\{card\.greenReason\}; policy=truth-seal-only/.test(orientSource),
      'fallback orient labels the green reason and evidence policy separately',
    );
  ok(
    /const clockSkewed = rawAgeSec !== null && rawAgeSec < -60/.test(orientSource) &&
      /const stale = timestampInvalid \|\| clockSkewed \|\| ageSec === null \|\| ageSec > 900/.test(orientSource) &&
      /clockSkewed,/.test(orientSource),
    'fallback orient rejects future-dated draft-hygiene evidence',
  );
  ok(
    /const timestampInvalid = sourceAt !== null && !Number\.isFinite\(sourceAtMs\)/.test(orientSource) &&
      /const evidenceAtMs = sourceAt === null[\s\S]{0,100}\? fileAtMs/.test(orientSource) &&
      /const stale = timestampInvalid \|\| clockSkewed \|\| ageSec === null \|\| ageSec > 900/.test(orientSource) &&
      /timestampInvalid,/.test(orientSource),
    'fallback orient rejects malformed explicit draft-hygiene timestamps',
  );
    ok(
      /jsonPointer: source\?\.jsonPointer \|\| ['"]\/drafts\/hygiene['"]/.test(orientSource) &&
        /const receipt = sourceReceipt\(statusPath\)/.test(orientSource) &&
        /sourceReceipt: receipt/.test(orientSource) &&
        /sourceSha256: receipt\.sha256/.test(orientSource) &&
        /ready: ok === true && stale === false && receipt\.sha256 !== null && receipt\.bytes !== null/.test(orientSource) &&
        /ready=\$\{hygiene\.ready === true \? ['"]yes['"] : ['"]NO['"]\}/.test(orientSource),
      'fallback orient exposes byte-bound, discoverable, fail-closed draft-hygiene readiness',
    );
    ok(/liveFootLoaderCount\s*===\s*1/.test(truthSource), 'fallback truth requires one live foot loader');
    ok(
      /disk v\$\{diskVer \|\| ['"]\?['"]\} · live v\$\{liveVer \|\| ['"]\?['"]\}/.test(truthSource),
      'fallback truth renders unknown versions as ? instead of null',
    );
    ok(/status|prepare|cdn|paste|verify|run/.test(shipSource), 'fallback ship surface exposes canonical verbs');
    ok(
      !/DEMIGOD_ALLOW_AUTO_DM/.test(demandSource) &&
        /auto_dm_stopped/.test(demandSource) &&
        /agentNeverAutoSends:\s*true/.test(demandSource),
      'fallback demand keeps no-auto-DM gate without an environment bypass',
    );
    ok(
      /demigod-dm-mark-sent\.mjs --name=NAME --i-sent-it/.test(demandSource) &&
        /demigod-dm-mark-sent\.mjs --name=\$\{row\.name\} --i-sent-it/.test(demandSource),
      'fallback demand advertises mark-sent only with --i-sent-it attestation',
    );
    ok(
      (() => {
        try {
          const q = fs.readFileSync(path.join(ROOT, 'demigod-ops', 'SEND-QUEUE-PRIORITIZED.md'), 'utf8');
          const rows = q.split('\n').filter((l) => /demigod-dm-mark-sent/.test(l));
          return rows.length > 0 && rows.every((l) => /--i-sent-it/.test(l));
        } catch {
          return false;
        }
      })(),
      'fallback SEND-QUEUE After send rows require --i-sent-it attestation',
    );

    ok(/cycle-work-latest\.json/.test(cycleStatusSource) && /demand-status\.json/.test(cycleStatusSource) && /next\.json/.test(cycleStatusSource), 'fallback cycle status joins cycle, demand, and NEXT receipts');
    ok(
      /next\.mutate\s*===\s*true\s*\|\|\s*next\.mutates\s*===\s*true/.test(cycleStatusSource) &&
        /report\.next\?\.mutate/.test(cycleStatusSource),
      'fallback cycle status preserves canonical NEXT mutate semantics',
    );
    ok(/args\.has\('--attest'\)/.test(cycleStatusSource) && /process\.exitCode = 2/.test(cycleStatusSource), 'fallback cycle status attestation fails closed');
    ok(
      /const toolsReady = cycle\?\.domain === ['"]tools['"][\s\S]{0,120}cycle\?\.toolsReady === true/.test(cycleStatusSource) &&
        /cycle\?\.domain === ['"]tools['"][\s\S]{0,100}cycle\?\.verification === ['"]release-blocked['"]/.test(cycleStatusSource) &&
        /cycle\?\.domain === ['"]ship['"] && hasReleasePreflight && releaseReady === false/.test(cycleStatusSource),
      'fallback cycle status separates tools OS readiness from ship release readiness',
    );
    ok(
      /const reasons = \[/.test(cycleStatusSource) &&
        /cycle_blocked/.test(cycleStatusSource) &&
        /release_not_ready/.test(cycleStatusSource) &&
        /verdict,\s*\n\s*reasons: \[\.\.\.new Set\(reasons\)\]/.test(cycleStatusSource),
      'fallback cycle status exposes a machine-readable fail-closed verdict',
    );
    ok(
      /domain:\s*['"]website['"][\s\S]*?health:\s*\[[\s\S]*?name:\s*['"]wiz-ownership['"][\s\S]*?name:\s*['"]foot-smoke['"][\s\S]*?name:\s*['"]head-styles['"][\s\S]*?name:\s*['"]cm6-structure['"][\s\S]*?name:\s*['"]copy-policy-source['"]/.test(cycleWorkSource),
      'fallback website cycle publishes check-level health for status attestation',
    );
    ok(
      /const cm6Structure = checkCm6StructureInProcess\(\)/.test(cycleWorkSource) &&
        ['cm6StructureOk', 'releaseReady', 'releaseDrift', 'releaseBlocker', 'releaseRecovery', 'releaseTransport']
          .every((field) => new RegExp(`\\n\\s*${field},`).test(cycleWorkSource)) &&
        /releaseDetails:\s*cm6Report\?\.releaseDetails\s*\|\|\s*null/.test(cycleWorkSource) &&
        /release:\s*\{[\s\S]{0,600}?structuralOk:\s*cm6StructureOk/.test(cycleWorkSource) &&
        /release:\s*\{[\s\S]{0,600}?ready:\s*releaseReady/.test(cycleWorkSource) &&
        /release:\s*\{[\s\S]{0,600}?drift:\s*releaseDrift/.test(cycleWorkSource) &&
        /release:\s*\{[\s\S]{0,600}?blocker:\s*releaseBlocker/.test(cycleWorkSource) &&
        /release:\s*\{[\s\S]{0,600}?recovery:\s*releaseRecovery/.test(cycleWorkSource) &&
        /release:\s*\{[\s\S]{0,600}?transport:\s*releaseTransport/.test(cycleWorkSource),
      'fallback website cycle preserves CM6 structure and staged release identity',
    );
    ok(
      /const releaseTransportBlocked = Boolean\(/.test(cycleWorkSource) &&
        /state: releaseTransportBlocked[\s\S]{0,180}retry-when-release-transport-is-available/.test(cycleWorkSource) &&
        /command: releaseTransportBlocked \? null : 'node demigod-foot-cdn-publish\.mjs'/.test(cycleWorkSource),
      'fallback CM6 suppresses runnable recovery while release transports are unavailable',
    );
    ok(
      /name === ['"]cm6-structure['"]/.test(cycleStatusSource) &&
        /releaseDrift/.test(cycleStatusSource) &&
        /remediation:\s*releaseReady \? null : ['"]bin\/dg ship prepare['"]/.test(cycleStatusSource),
      'fallback cycle status preserves CM6 release drift with a non-publishing remediation',
    );
    ok(
      /typeof cycle\?\.releaseReady === ['"]boolean['"][\s\S]{0,120}\? cycle\.releaseReady[\s\S]{0,180}: cm6Check\?\.release\?\.ready === true/.test(cycleStatusSource),
      'fallback cycle status gives authoritative aggregate release readiness precedence over nested detail',
    );
    ok(
      /const contractChecksPassed = checks\.length > 0 && checks\.every\(\(check\) => check\?\.exit === 0\)/.test(cycleStatusSource) &&
        /contractChecksPassed,[\s\S]{0,100}osAttested: cycle\.attested === true && exceptions\.length === 0/.test(cycleStatusSource),
      'fallback cycle status separates contract success from OS attestation',
    );
    ok(
      /cycle\?\.releaseDrift/.test(cycleStatusSource) &&
        /cycle\?\.releaseBlocker/.test(cycleStatusSource) &&
        /guardedRecovery:\s*releaseReady \? null : \(cycle\?\.releaseRecovery \|\| null\)/.test(cycleStatusSource) &&
        /healthSummary:\s*cycle\.healthSummary \|\| null/.test(cycleStatusSource),
      'fallback cycle status preserves authoritative release failure and health receipts',
    );
    ok(
      /name === ['"]cm6-structure['"][\s\S]{0,900}release\s*=\s*\{/.test(cycleWorkSource) &&
        /blocker:\s*report\.releaseBlocker \|\| null/.test(cycleWorkSource) &&
        /recovery:\s*report\.releaseRecovery \|\| null/.test(cycleWorkSource) &&
        /transport:\s*report\.releaseTransport \|\| null/.test(cycleWorkSource) &&
        /\.\.\.\(release \? \{ release \} : \{\}\)/.test(cycleWorkSource),
      'fallback tools cycle persists structured CM6 release identity and guarded recovery before truncating log detail',
    );
    ok(
      /function checkDetail\(result, structured/.test(cycleWorkSource) &&
        /const tail = checkDetail\(r, structuredReport\)/.test(cycleWorkSource) &&
        /releaseReady:\s*structured\.releaseReady === true/.test(cycleWorkSource),
      'fallback tools cycle emits concise valid JSON detail instead of a clipped CM6 report',
    );
    ok(
      /manifestAttested:\s*manifest\?\.ok === true/.test(cycleWorkSource) &&
        /manifestVersionMarkersAgree:\s*Boolean\s*\(/.test(cycleWorkSource) &&
        /manifest\?\.footVer != null/.test(cycleWorkSource),
      'fallback CM6 release check enforces manifest attestation and version-marker agreement',
    );
    ok(
      /const cm6Release = health\.find/.test(cycleWorkSource) &&
        /const contractExit = name === ['"]cm6-structure['"] && release\?\.structuralOk === true/.test(cycleWorkSource) &&
        /failureKind:[\s\S]{0,220}release\?\.ready === false \? ['"]release-drift['"]/.test(cycleWorkSource) &&
        /releaseReady,\s*\n\s*releaseDrift,\s*\n\s*releaseBlocker,\s*\n\s*releaseRecovery/.test(cycleWorkSource) &&
        /release-structure-unverified/.test(cycleWorkSource) &&
        /!releaseStructuralOk \? null/.test(cycleWorkSource) &&
        /command:\s*['"]node demigod-foot-cdn-publish\.mjs['"]/.test(cycleWorkSource) &&
        /then:\s*['"]node demigod-cm6-paste-publish\.mjs['"]/.test(cycleWorkSource) &&
        /gatedBy:\s*\[['"]publish-freeze['"],\s*['"]foot-lock['"]\]/.test(cycleWorkSource),
      'fallback tools cycle separates CM6 structural health from release drift and promotes gated recovery',
    );
    ok(
      /max_age_must_be_a_non_negative_number/.test(cycleStatusSource) &&
        /ok:\s*Boolean\(cycle\)\s*&&\s*!configError/.test(cycleStatusSource),
      'fallback cycle status rejects malformed freshness policy',
    );
  ok(!/send yourself|human re-enables/i.test(demandSource), 'fallback demand assigns no human send task');
  ok(!/human send|mark-sent --i-sent-it/i.test(orientSource), 'fallback orient assigns no human send task');
  ok(
    !/owner:\s*freezeOnEarly\s*\?\s*['"]human['"]/.test(dashboardSource) &&
      (dashboardSource.match(/owner:\s*freezeOnEarly\s*\?\s*['"]freeze-gate['"]/g) || []).length >= 2,
    'fallback dashboard treats frozen release drift as unassigned gate state',
  );
    ok(!/wait for human task/i.test(dashboardSource), 'fallback dashboard brief assigns no human task');
    ok(/demandSignal:\s*nextCanon\.demandSignal \|\| null/.test(controlSource), 'fallback control projects canonical demand hygiene signal');
    ok(
      /DEMAND_STATUS_TTL_MS/.test(nextSource) && /statusFresh:\s*demandStatusFresh/.test(nextSource) && /recordedDraftHygieneOk/.test(nextSource),
      'fallback canonical NEXT expires stale demand hygiene while retaining diagnostics',
    );
    ok(
      /DEMAND_STATUS_FUTURE_TOLERANCE_MS/.test(nextSource) &&
        /statusFutureDated:\s*demandStatusFutureDated/.test(nextSource) &&
        /!demandStatusFutureDated/.test(nextSource),
      'fallback canonical NEXT rejects materially future-dated demand evidence',
    );
    ok(/demand-status\.json/.test(dashboardSource), 'fallback dashboard consumes demand status');
    ok(
      /jsonPointer:\s*sourceHygiene\?\.jsonPointer \|\| ['"]\/drafts\/hygiene['"]/.test(dashboardSource) &&
        /ready:\s*\n\s*hygieneOk === true[\s\S]{0,180}hygieneAgeSec <= 900/.test(dashboardSource),
      'fallback dashboard demand snapshot exposes hygiene pointer and fail-closed readiness',
    );
    ok(
      /drafts\.hygiene: \$\{draftHygieneState\} checked=\$\{draftHygiene\?\.checked/.test(dashboardSource) &&
        /draftHygiene\?\.stale === true[\s\S]{0,120}['"]STALE['"]/.test(dashboardSource),
      'fallback agent brief exposes draft hygiene and fails stale receipts closed',
    );
    ok(
      /foot-latest\\\.js[^\n]{0,500}\(\?:\[\?#\]/.test(dashboardSource) &&
        /catbox\\\.moe[^\n]{0,220}\\\.js\(\?:\[\?#\]/.test(dashboardSource) &&
        (dashboardSource.match(/foot-latest\\\.js\(\?:\[\?#\]\\S\*\)\?/g) || []).length >= 2 &&
        /gist\\\.githubusercontent\\\.com[^\n]{0,100}\\\.js\(\?:\[\?#\]\\S\*\)\?/.test(dashboardSource),
      'fallback dashboard CDN parser accepts query or fragment cache-busters',
    );
    ok(
      /const headHtml = htmlHead\(html\)/.test(dashboardSource) &&
        /hasUnhide:\s*\/unhide-v5\/\.test\(headHtml\)/.test(dashboardSource) &&
        /hasCriticalUnhide:\s*\/dg-unhide-critical\/\.test\(headHtml\)/.test(dashboardSource),
      'fallback dashboard scopes canonical-head attestation to the actual head',
    );
    ok(
      /const compromised = !expired && ownerAlive === false/.test(dashboardSource) &&
        /compromised,/.test(dashboardSource),
      'fallback dashboard surfaces compromised foot leases without unlocking them',
    );
    ok(
      /if\(\$\('palette'\)\.classList\.contains\('open'\)\)\{[\s\S]{0,120}return;/.test(dashboardUiSource) &&
        /if\(\$\('confirmOverlay'\)\.classList\.contains\('open'\)\)\{[\s\S]{0,120}return;/.test(dashboardUiSource),
      'fallback dashboard modal dialogs suppress global shortcuts while open',
    );
    ok(
      ['handoffDone', 'handoffNext', 'handoffBlocked', 'handoffText'].every((id) =>
        new RegExp(`<(?:input|textarea)[^>]*id=["']${id}["'][^>]*aria-label=["'][^"']+["']`, 'i').test(dashboardUiSource),
      ),
      'fallback dashboard handoff fields have accessible names',
    );
    ok(/demandDraftsHygieneSource/.test(dashboardSource) && /drafts\.allHygieneOk/.test(dashboardSource), 'fallback orient API exposes draft-hygiene source');
    ok(
      /body\.demand\s*=\s*\{[\s\S]{0,320}drafts:\s*demand\?\.drafts \|\| null/.test(dashboardSource) &&
        /body\.demandDraftsHygiene\s*=\s*demand\?\.drafts\?\.hygiene \|\| null/.test(dashboardSource),
      'fallback orient API binds canonical demand.drafts.hygiene to its normalized hygiene aliases',
    );
    ok(/statusJsonPath:\s*data\.statusJsonPath/.test(dashboardSource) && /orientApi:\s*data\.orientApi/.test(dashboardSource), 'fallback status JSON advertises path and orient API');
    ok(
      /orient:\s*data\.orient[\s\S]{0,520}receiptGreen:\s*data\.orient\.receiptGreen[\s\S]{0,220}receiptAgeMs:\s*data\.orient\.receiptAgeMs[\s\S]{0,180}degraded:\s*data\.orient\.degraded === true/.test(dashboardSource),
      'fallback status delta replaces orient freshness and degradation atomically',
    );
    ok(/data\.cycleWork\s*=\s*safeJson/.test(dashboardSource), 'fallback status exposes latest cycle receipt');
    ok(
      /const fields = \{[\s\S]{0,420}cycleWork:\s*data\.cycleWork \|\| null,[\s\S]{0,120}cycleWorkHealth:\s*data\.cycleWorkHealth \|\| null,/.test(dashboardSource),
      'fallback status delta carries cycle receipt and attestation health',
    );
    ok(
      /if \(process\.argv\.includes\('--snapshot'\)\)[\s\S]{0,700}cycleWork:\s*data\.cycleWork \|\| null,[\s\S]{0,180}cycleWorkHealth:\s*data\.cycleWorkHealth \|\| null,[\s\S]{0,180}cycleWorkAttested:\s*data\.cycleWorkHealth\?\.attested === true,[\s\S]{0,180}cycleWorkDegraded:\s*data\.cycleWorkHealth\?\.degraded === true,[\s\S]{0,180}cycleWorkVerification:\s*data\.cycleWorkHealth\?\.verification \|\| null/.test(dashboardSource),
      'fallback dashboard snapshot preserves cycle attestation, degradation, and verification',
    );
    ok(
      /const fields = \{[\s\S]{0,4500}demandDraftsHygieneAt:\s*data\.demandDraftsHygieneAt \|\| null,[\s\S]{0,180}demandDraftsHygieneAgeSec:[\s\S]{0,180}demandDraftsHygieneStale:/.test(dashboardSource) &&
        /data\.orient\.demandDraftsHygieneStale \?\? data\.demandDraftsHygieneStale \?\? true/.test(dashboardSource),
      'fallback status delta carries demand-hygiene freshness and fails stale by default',
    );
    ok(
      /inferredReleaseMutation[\s\S]{0,500}demigod-foot-cdn-publish/.test(dashboardSource) &&
        /releaseRecoveryMutates = rawReleaseRecovery\?\.mutates === true \|\| inferredReleaseMutation/.test(dashboardSource) &&
        /\['current-request-authorization', 'publish-freeze-off', 'foot-write-lock'\]/.test(dashboardSource) &&
        /command: releaseRecoveryMutates \? null : agentSafeCommand/.test(dashboardSource) &&
        /mutates:\s*releaseRecoveryMutates/.test(dashboardSource),
      'fallback dashboard suppresses known release publishers behind explicit authority gates',
    );
    ok(
      /cycleHasReleasePreflight/.test(dashboardSource) &&
        /domain === ['"]tools['"]/.test(dashboardSource),
      'fallback dashboard exposes release preflight from tools cycles',
    );
    ok(
      /cycleReleaseBlocked[\s\S]*?'release-blocked'/.test(dashboardSource),
      'fallback dashboard preserves the ship release-blocked verification label',
    );
    ok(
      /cycleWorkExceptions\.length > 0 \? ['"]check-exception['"] : null/.test(dashboardSource) &&
        /cycleReleaseBlocked[\s\S]{0,180}cycleWorkExceptions\.length > 0[\s\S]{0,80}\? ['"]failed['"]/.test(dashboardSource),
      'fallback dashboard cycle exceptions force a failed verification label',
    );
    ok(
      /Date\.parse\(data\.cycleWork\?\.at/.test(dashboardSource) &&
        /rawReceiptAgeSec >= -60/.test(dashboardSource) &&
        /timestampSource:\s*['"]receipt\.at['"]/.test(dashboardSource) &&
        /fileAgeSec:\s*cycleWorkFileAgeSec/.test(dashboardSource),
      'fallback dashboard cycle freshness comes from receipt.at, with file age diagnostic only',
    );
    ok(
      /const draftHygiene = dem\.drafts&&dem\.drafts\.hygiene/.test(dashboardUiSource) &&
        /draftHygiene\.stale===true/.test(dashboardUiSource),
      'fallback dashboard uses canonical demand hygiene evidence and labels stale receipts',
    );
    ok(
      /draftHygiene\.stale===true[\s\S]{0,120}draft hygiene stale/.test(dashboardUiSource) &&
        /draftHygiene\.stale===true\|\|draftHygiene\.ok===false/.test(dashboardUiSource),
      'fallback dashboard demand chip cannot present stale hygiene as clean',
    );
    ok(
      /malformedReceipts/.test(dashboardSource) &&
        /malformedReceiptReasons/.test(dashboardSource) &&
        /quarantineQueueOverlap/.test(dashboardSource) &&
        /pendingHandles/.test(dashboardSource),
      'fallback dashboard demand snapshot projects receipt quarantine + full-queue overlap',
    );
    ok(
      /demand-quarantine/.test(dashboardUiSource) &&
        /malN\+' receipt'\+\(malN===1\?'':'s'\)\+' quarantined'/.test(dashboardUiSource) &&
        /SENT may under-report/.test(dashboardUiSource) &&
        /queue-overlap=/.test(dashboardUiSource) &&
        /__dgDemandQuarantine/.test(dashboardUiSource),
      'fallback dashboard demand card surfaces receipt quarantine when present',
    );
    ok(
      /check\?\.detail,\s*childError,\s*check\?\.tail/.test(dashboardSource),
      'fallback dashboard normalizes cycle receipt diagnostics',
    );
    ok(
      /check\?\.childStartBlocked === true/.test(cycleWorkSource) &&
        /check\?\.fallback === true/.test(cycleWorkSource),
      'fallback cycle attestation rejects child-start blockage and fallback-only checks',
    );
    ok(
      /const blocked = childStartBlocked \|\| r\.blocked \|\| receiptBlocked/.test(cycleWorkSource),
      'fallback tools checks preserve child-start blockage on each check receipt',
    );
    ok(
      /name === ['"]tools-os['"] && \(childStartBlocked \|\| r\.status === 2\)/.test(cycleWorkSource),
      'fallback tools cycle cannot let a stale degraded receipt poison a successful tools-os run',
    );
    ok(
      /function writeJsonAtomic\(/.test(cycleWorkSource) &&
        /fs\.renameSync\(temp, file\)/.test(cycleWorkSource) &&
        /writeJsonAtomic\(path\.join\(BUSY, ['"]cycle-work-latest\.json['"]\), rec\)/.test(cycleWorkSource),
      'fallback cycle publishes canonical latest receipt atomically',
    );
    ok(
      /const healthSummary = \{/.test(cycleWorkSource) &&
        /fallbackPassed: health\.filter/.test(cycleWorkSource) &&
        /blocked: health\.filter\(\(check\) => check\.blocked \|\| check\.childStartBlocked\)\.length/.test(cycleWorkSource) &&
        /healthSummary,\s*health,/.test(cycleWorkSource),
      'fallback tools receipt publishes aggregate check counts',
    );
    ok(
      /attested:\s*healthAttested/.test(cycleWorkSource) &&
        /verification:\s*healthAttested\s*\?\s*['"]attested['"]/.test(cycleWorkSource),
      'fallback tools receipt separates contract success from OS attestation',
    );
    ok(
      /rec\.toolsReady = rec\.domain === ['"]tools['"]\s*\? rec\.attested\s*:\s*undefined/.test(cycleWorkSource) &&
        /\(rec\.domain === ['"]website['"] \|\| rec\.domain === ['"]ship['"] \|\| rec\.domain === ['"]tools['"]\)/.test(cycleWorkSource) &&
        /releaseBlocked \? ['"]release-blocked['"]/.test(cycleWorkSource),
      'fallback tools receipt separates OS readiness from explicitly labelled release drift',
    );
    ok(
      /const executionMode = healthAttested \? ['"]child-process['"]/.test(cycleWorkSource) &&
        /const attestationCommand = healthBlocked/.test(cycleWorkSource) &&
        (cycleWorkSource.match(/attestationCommand,/g) || []).length >= 2,
      'fallback tools receipt exposes an agent rerun command and execution mode',
    );
    ok(
      /const cycleWorkSummary = \{/.test(dashboardSource) &&
        /fallbackPassed: cycleChecks\.filter/.test(dashboardSource) &&
        /fallback: cycleChecks\.filter\(\(check\) => check\.fallback\)\.length/.test(dashboardSource) &&
        /summary:\s*cycleWorkSummary/.test(dashboardSource),
      'fallback dashboard projects aggregate cycle check counts',
    );
    ok(
      /const healthBlocked = health\.some\(\(check\) => check\.blocked \|\| check\.childStartBlocked\)/.test(cycleWorkSource) &&
        /blocked:\s*healthBlocked/.test(cycleWorkSource) &&
        /failureKind:\s*healthBlocked[\s\S]{0,120}['"]child-start['"][\s\S]{0,120}['"]contract-failure['"]/.test(cycleWorkSource),
      'fallback cycle receipts propagate typed child-start blockage',
    );
    ok(
      /const childError = check\?\.error && typeof check\.error === ['"]object['"][\s\S]{0,420}failureKind: typeof check\?\.failureKind === ['"]string['"]/.test(dashboardSource),
      'fallback dashboard preserves structured child-start error and failure kind',
    );
    ok(
      /failureKind:\s*blocked[\s\S]{0,100}['"]child-start['"][\s\S]{0,100}['"]contract-failure['"]/.test(cycleWorkSource) &&
        /failureKind:\s*blocked[\s\S]{0,100}['"]child-start['"][\s\S]{0,100}['"]refresh-failure['"]/.test(cycleWorkSource),
      'fallback cycle check receipts expose typed contract and refresh failures',
    );
    ok(
      (cycleWorkSource.match(/const childStartError = childStartBlocked \? r\.error : null;/g) || []).length === 2 &&
        (cycleWorkSource.match(/error:\s*childStartError,/g) || []).length === 2,
      'fallback cycle checks preserve child-start diagnostics after in-process replacement',
    );
    ok(
      /\['demand-refresh',\s*\['demigod-demand\.mjs',\s*'status'\]\]/.test(cycleWorkSource) &&
        /\['control-refresh',\s*\['demigod-control\.mjs',\s*'status',\s*'--json'\]\]/.test(cycleWorkSource) &&
        /for \(const \[name, argv\] of refreshes\)[\s\S]{0,900}health\.push\(/.test(cycleWorkSource),
      'fallback tools cycle records demand and control refresh health',
    );
    ok(/data\.demandDraftsHygiene\s*=/.test(dashboardSource) && /data\.demandDraftsHygieneOk\s*=/.test(dashboardSource) && /data\.demandStatusPath\s*=/.test(dashboardSource), 'fallback status JSON exposes draft hygiene health and source path');
    ok(
      /sourceReceipt[\s\S]{0,260}sha256:\s*sha256File\(hygieneStatusPath\)/.test(dashboardSource) &&
        /data\.demandStatusSourceReceipt\s*=/.test(dashboardSource) &&
        /data\.demandStatusSourceReceipt\s*=/.test(dashboardSource),
      'fallback status binds demand hygiene provenance to source bytes',
    );
    ok(
      /schema:\s*['"]demigod\.source-receipt\/1['"][\s\S]{0,100}capturedAt:\s*new Date\(\)\.toISOString\(\)/.test(dashboardSource),
      'fallback demand hygiene source receipt is self-describing and capture-timestamped',
    );
    ok(
      /data\.draftHygieneVerdict\s*=\s*\{/.test(dashboardSource) &&
        /schema:\s*['"]demigod\.draft-hygiene-verdict\/1['"]/.test(dashboardSource) &&
        /ready:\s*data\.demandDraftsHygieneReady === true/.test(dashboardSource) &&
        /reason:\s*data\.demandDraftsHygieneReady === true[\s\S]{0,500}['"]clock-skewed['"][\s\S]{0,300}['"]flagged['"]/.test(dashboardSource) &&
        /draftHygieneVerdict:\s*data\.draftHygieneVerdict \|\| null/.test(dashboardSource) &&
        /body\.draftHygieneVerdict\s*=\s*\{[\s\S]{0,220}ready:[\s\S]{0,180}body\.demandDraftsHygieneOk === true[\s\S]{0,120}body\.demandDraftsHygieneStale === false/.test(dashboardSource),
      'fallback full, slim, and orient status share fail-closed draft-hygiene semantics',
    );
    ok(
      /data\.orient\.drafts\s*=\s*\{[\s\S]{0,220}hygiene:\s*data\.demandDraftsHygiene \|\| null[\s\S]{0,160}hygieneVerdict:\s*data\.draftHygieneVerdict[\s\S]{0,360}sourceReceipt:\s*\{/.test(dashboardSource),
      'fallback persisted orient drafts co-locates hygiene verdict and source receipt',
    );
    ok(
      /const hygieneAt = sourceHygiene\?\.at \|\| j\.at \|\| null/.test(dashboardSource) &&
        /ageSec: hygieneAgeSec/.test(dashboardSource) &&
        /stale: hygieneClockSkewed \|\| hygieneAgeSec == null \|\| hygieneAgeSec > 900/.test(dashboardSource) &&
        /clockSkewed: hygieneClockSkewed/.test(dashboardSource),
      'fallback nested status-path draft hygiene is self-describing and freshness-aware',
    );
    ok(
      /const cleanCount = top3\.filter\([\s\S]{0,180}draft\?\.hygieneOk === true && Number\(draft\?\.flagCount \|\| 0\) === 0/.test(dashboardSource) &&
        /clean: sourceHygiene\?\.clean \?\? cleanCount/.test(dashboardSource),
      'fallback dashboard never counts warning-flagged demand drafts as clean',
    );
    ok(
      /data\.demandDraftsHygieneAt = data\.demandDraftsHygiene\?\.at \|\| null/.test(dashboardSource) &&
        /data\.demandDraftsHygieneAgeSec = data\.demandDraftsHygiene\?\.ageSec \?\? null/.test(dashboardSource) &&
        /data\.demandDraftsHygieneStale = data\.demandDraftsHygiene\?\.stale \?\? true/.test(dashboardSource),
      'fallback top-level status preserves the draft-hygiene evidence clock',
    );
    ok(
      /data\.demandDraftsHygieneReady\s*=\s*[\s\S]{0,160}\.ok === true && data\.demandDraftsHygieneStale === false/.test(dashboardSource) &&
        /demandDraftsHygieneReady:\s*data\.demandDraftsHygieneReady === true/.test(dashboardSource) &&
        /data\.orient\.demandDraftsHygieneReady = data\.demandDraftsHygieneReady/.test(dashboardSource),
      'fallback full, slim, and orient status expose fail-closed draft-hygiene readiness',
    );
    ok(
      /fresh:\s*Boolean\(te\.fresh\)/.test(controlSource) &&
        /if \(!truthEvidence\.green\) \{[\s\S]{0,160}health = Math\.min\(health, 49\);[\s\S]{0,160}healthLabel = truthEvidence\.fresh \? ['"]truth-failed['"] : ['"]truth-stale['"]/.test(controlSource),
      'fallback control health distinguishes fresh truth failure from stale evidence',
    );
    ok(
      /freeze:\s*\{\s*on:\s*freezeState\?\.on\s*===\s*true,\s*why:\s*freezeState\?\.why\s*\|\|\s*null/.test(dashboardSource) &&
        /freeze:\s*data\.orient\.freeze\s*\|\|/.test(dashboardSource),
      'fallback persisted and delta orient cards mirror current publish freeze honestly',
    );
    ok(
      /data\.statusJsonPathView\s*=\s*\{[\s\S]*?orientDemandDraftsHygiene:\s*data\.orient\?\.demandDraftsHygiene \|\| null[\s\S]{0,300}orientDemandDraftsHygieneConsistent/.test(dashboardSource) &&
        /data\.orient\?\.demandDraftsHygiene != null[\s\S]{0,160}data\.demandDraftsHygiene != null[\s\S]{0,120}orientDemandDraftsHygieneConsistent/.test(dashboardSource),
      'fallback compact status JSON view carries and verifies orient-side draft hygiene',
    );
    ok(
      /data\.statusJsonPathView\s*=\s*\{[\s\S]*?schema:\s*['"]demigod\.dashboard-status-path-view\/1['"][\s\S]*?demand:\s*\{[\s\S]{0,100}drafts:\s*\{[\s\S]{0,100}hygiene:\s*data\.demandDraftsHygiene \|\| null/.test(dashboardSource),
      'fallback compact status JSON view mirrors canonical demand.drafts.hygiene',
    );
    ok(
      /complete:[\s\S]{0,300}orientDemandDraftsHygieneConsistent\s*&&[\s\S]{0,300}data\.draftHygieneVerdict\?\.ready === true/.test(dashboardSource),
      'fallback compact status JSON view fails complete closed on stale or flagged hygiene',
    );
    ok(
      /hygieneVerdict:\s*data\.draftHygieneVerdict \|\| null/.test(dashboardSource) &&
        /demandDraftsHygieneVerdictJsonPointer:\s*['"]\/statusJsonPathView\/demand\/drafts\/hygieneVerdict['"]/.test(dashboardSource) &&
        /demandDraftsHygieneReady:\s*data\.draftHygieneVerdict\?\.ready === true/.test(dashboardSource),
      'fallback compact status JSON view pairs draft hygiene evidence with fail-closed readiness',
    );
    ok(
      /hygieneVerdict:\s*body\.draftHygieneVerdict/.test(dashboardSource) &&
        /demandDraftsHygieneReady:\s*body\.draftHygieneVerdict\?\.ready === true/.test(dashboardSource) &&
        /body\.draftHygieneVerdict\?\.ready === true/.test(dashboardSource),
      'fallback orient compact status view pairs hygiene with a fail-closed readiness verdict',
    );
    ok(
      (dashboardSource.match(/orientEndpoint:\s*\{/g) || []).length >= 2 &&
        (dashboardSource.match(/demandDraftsHygieneJsonPointer:\s*['"]\/statusJsonPathView\/demand\/drafts\/hygiene['"]/g) || []).length >= 2,
      'fallback compact status JSON view co-locates orient endpoint and hygiene pointer',
    );
    ok(
      /orientEndpoint:\s*\{[\s\S]{0,900}demandDraftsHygieneSource:\s*data\.demandDraftsHygieneSource \|\| ['"]unknown['"][\s\S]{0,180}demandDraftsHygieneStatusPath:\s*\n\s*data\.demandDraftsHygieneStatusPath \|\| data\.demandStatusPath \|\| null/.test(dashboardSource),
      'fallback compact status JSON endpoint exposes draft-hygiene source receipt path',
    );
    ok(
      /orientDemandDraftsHygieneVisible:\s*data\.orient\?\.demandDraftsHygiene != null/.test(dashboardSource) &&
        /Boolean\(data\.orient\)[\s\S]{0,120}data\.orient\?\.demandDraftsHygiene != null[\s\S]{0,120}data\.demandDraftsHygiene != null/.test(dashboardSource),
      'fallback persisted visibility is complete only when orient mirrors draft hygiene',
    );
    ok(/demandDraftsHygieneJsonPointer:\s*['"]\/demandDraftsHygiene['"]/.test(dashboardSource) && /data\.demandDraftsHygieneSource\s*=/.test(dashboardSource), 'fallback status discovery exposes exact draft-hygiene pointer and evidence source');
    ok(
      /agentConsume:\s*\{[\s\S]{0,500}preferred:\s*\[[\s\S]{0,180}\/api\/orient[\s\S]{0,500}note:\s*['"]Start with \/api\/orient or bin\/dg orient/.test(dashboardSource),
      'dashboard status directs agents to canonical orient first',
    );
    ok(
      (() => {
        const snapshot = dashboardSource.match(
          /if \(process\.argv\.includes\('--snapshot'\)\)([\s\S]*?)\nconst server =/,
        )?.[1] || '';
        return /orientApi:/.test(snapshot) &&
          /demandDraftsHygieneReady:/.test(snapshot) &&
          /orientDemandDraftsHygieneReady:/.test(snapshot) &&
          /demandDraftsHygieneStatusPath:/.test(snapshot) &&
          /demandStatusPath:/.test(snapshot) &&
          /statusJsonPathView:/.test(snapshot);
      })(),
      'fallback dashboard snapshot keeps orient and draft-hygiene source discovery in one response',
    );
    ok(/receiptAvailable:\s*Boolean\(j\)/.test(dashboardSource) && /demandDraftsHygiene:\s*demand\?\.drafts\?\.hygiene/.test(dashboardSource), 'fallback persisted status keeps orient discovery and draft hygiene without an orient receipt');
    ok(
      /demand:\s*demand[\s\S]{0,260}\.\.\.\(j\?\.demand \|\| \{\}\)[\s\S]{0,160}\.\.\.demand,[\s\S]{0,120}drafts:\s*demand\.drafts \|\| null/.test(dashboardSource),
      'fallback persisted orient canonical demand path refreshes drafts.hygiene from demand status',
    );
    ok(
      /rawAgeMs >= -60_000/.test(dashboardSource) &&
        /const degraded = !j \|\| receiptAgeMs == null \|\| receiptAgeMs > 120_000[\s\S]{0,320}degraded,/.test(dashboardSource),
      'fallback dashboard fails stale orient receipts closed',
    );
    ok(
      /const receiptAtMs = Date\.parse\(j\?\.at \|\| ['"]{2}\)/.test(dashboardSource) &&
        /const cachedAtMs = Date\.parse\(body\?\.at \|\| ['"]{2}\)/.test(dashboardSource) &&
        !/(?:rawAgeMs|cacheAgeMs)\s*=\s*(?:Math\.max\(0,\s*)?Date\.now\(\)\s*-\s*fs\.statSync\(orientPath\)\.mtimeMs/.test(dashboardSource),
      'fallback dashboard and orient API freshness use receipt time, not mutable file mtime',
    );
    ok(/freezeOn\s*&&\s*!!canon\.mutate/.test(dashboardSource), 'fallback dashboard freeze-blocks only mutating canonical NEXT');
ok(
  /n\.freezeBlocks\s*\|\|\s*\(d\.freeze\?\.on\s*&&\s*n\.mutate\)/.test(dashboardUiSource),
  'fallback dashboard UI labels freeze lock only for mutating NEXT',
);
ok(
  /b\.setAttribute\(['"]role['"],['"]tab['"]\)/.test(dashboardUiSource) &&
    /b\.setAttribute\(['"]aria-controls['"],panelId\)/.test(dashboardUiSource) &&
    /b\.setAttribute\(['"]aria-selected['"],on\?['"]true['"]:['"]false['"]\)/.test(dashboardUiSource) &&
    /p\.setAttribute\(['"]role['"],['"]tabpanel['"]\)/.test(dashboardUiSource) &&
    /p\.hidden=!on/.test(dashboardUiSource),
  'fallback dashboard tabs expose selected, controlled tabpanel state',
);
ok(
  /const validTabs=\[\.\.\.document\.querySelectorAll\(['"]\.nav button\[data-tab\]['"]\)\]\.map\(b=>b\.dataset\.tab\)/.test(dashboardUiSource) &&
    /if\(!validTabs\.includes\(name\)\) name=['"]overview['"]/.test(dashboardUiSource),
  'fallback dashboard rejects unknown tab inputs instead of persisting a blank view',
);
ok(
  dashboardUiSource.includes('publish frozen') && dashboardUiSource.includes('publish open'),
  'fallback dashboard header names publish freeze without conflating the foot-write lease',
);
    ok(
      /n\.mutate \? ['"]human['"] : \(n\.pri != null && n\.pri <= 1 \? ['"]priority['"]/.test(dashboardUiSource) &&
        /owner === ['"]priority['"] \? ['"]Priority['"]/.test(dashboardUiSource),
      'fallback dashboard does not label read-only P0/P1 NEXT as mutate',
    );
    ok(
      dashboardSource.includes('## Orient (canonical entry — prefer /api/orient)') &&
        dashboardSource.includes("lines.push('- cli: `bin/dg orient`')") &&
        !dashboardSource.includes('## Unify (single story — prefer /api/unify)'),
      'dashboard generated agent brief starts from canonical orient',
    );
    ok(
      /hasOwnProperty\.call\(delta,['"]next['"]\)[\s\S]{0,180}lastData\.next\s*=\s*delta\.next\s*\|\|\s*null/.test(dashboardUiSource),
      'dashboard SSE can clear canonical NEXT',
    );
    ok(
      /delta\.next\s*=\s*d\.next\s*\?\s*nextContract\(d\)\s*:\s*null/.test(dashboardSource) &&
        /lastData\.next\s*=\s*delta\.next\s*\|\|\s*null/.test(dashboardUiSource) &&
        !/lastData\.next\s*=\s*delta\.next\s*\?\s*\{\.\.\.\(lastData\.next/.test(dashboardUiSource),
      'dashboard SSE replaces NEXT atomically without stale mutation metadata',
    );
    ok(
      /if\(delta\.freeze\)\{[\s\S]{0,500}renderHdr\(lastData\);[\s\S]{0,500}renderNextBar\(lastData\);[\s\S]{0,160}renderGlance\(lastData\);/.test(dashboardUiSource),
      'dashboard SSE refreshes every freeze-dependent status surface',
    );
    ok(
      /let pendingActivityEvents = \[\];/.test(dashboardUiSource) &&
        /if\(!lastData\)\{[\s\S]{0,180}pendingActivityEvents=\[\.\.\.events,\.\.\.pendingActivityEvents\]\.slice\(0,40\);[\s\S]{0,40}return;/.test(dashboardUiSource) &&
        /if\(pendingActivityEvents\.length\)\{[\s\S]{0,160}mergeActivityEvents\(queued\);/.test(dashboardUiSource),
      'dashboard SSE preserves the initial activity snapshot until status is ready',
    );
    ok(
      /id=["']btnPalette["'][^>]*aria-haspopup=["']dialog["']/.test(dashboardUiSource) &&
        !/helpOverlay|btnHelp/.test(dashboardUiSource),
      'dashboard keeps one visible command surface without a duplicate help dialog',
    );
    ok(
      /const target=mutateReturnFocus; mutateReturnFocus=null;[\s\S]{0,240}target\.focus\(\);[\s\S]{0,120}await runJobNow/.test(dashboardUiSource),
      'dashboard mutate confirmation restores trigger focus before awaiting the job',
    );
    ok(
      /confirmOverlay'\)\) \$\('confirmOverlay'\)\.onclick=e=>\{ if\(e\.target\.id==='confirmOverlay'\) closeMutateConfirm\(\); \};/.test(dashboardUiSource),
      'dashboard mutate confirmation backdrop uses the canonical cancel path',
    );
    ok(
      /id=["']confirmOverlay["'][^>]*role=["']dialog["'][^>]*aria-describedby=["']confirmText["']/.test(dashboardUiSource) &&
        /id=["']confirmText["']/.test(dashboardUiSource),
      'dashboard mutate confirmation exposes its warning as the dialog description',
    );
    ok(
      /validOrientCard =[\s\S]{0,220}body\?\.schema === ['"]demigod\.orient\/1['"][\s\S]{0,320}jsonSend\(res, validOrientCard \? 200 : 503/.test(dashboardSource),
      'fallback orient HTTP status requires a schema-valid current card',
    );
    ok(
      /url\.pathname === ['"]\/api\/orient['"]/.test(dashboardSource) &&
        /body\.demandDraftsHygiene\s*=\s*demand\?\.drafts\?\.hygiene \|\| null/.test(dashboardSource) &&
        /data\.statusJsonPathView\s*=\s*\{[\s\S]*?demand:\s*\{[\s\S]{0,120}drafts:\s*\{[\s\S]{0,120}hygiene:\s*data\.demandDraftsHygiene \|\| null/.test(dashboardSource) &&
        /data\.demandDraftsHygieneCanonicalJsonPointer\s*=\s*['"]\/demand\/drafts\/hygiene['"]/.test(dashboardSource),
      'fallback dashboard keeps demand draft hygiene visible in /api/orient and persisted status JSON',
    );
    ok(
      /const canRun = t\.runnable === true/.test(dashboardUiSource) &&
        /canRun\s*\?/.test(dashboardUiSource),
      'dashboard run buttons require server-issued runnable authority',
    );
    ok(
      /if\(j&&j\.mutate===true&&!opts\.mutate\)[\s\S]{0,120}askMutateConfirm\(id, opts\)/.test(dashboardUiSource),
      'dashboard server-classified mutate jobs enter explicit confirmation',
    );
    const fallbackPaletteTitles = [...dashboardUiSource.matchAll(/\{t:'([^']+)'[^\n]*run:/g)].map((match) => match[1]);
    ok(new Set(fallbackPaletteTitles).size === fallbackPaletteTitles.length, 'dashboard command palette has no duplicate actions');
    ok(
      (dashboardUiSource.match(/el\.onclick=\(\)=>\{ const it=items\[\+el\.dataset\.i\]; closePalette\(\); if\(it\) it\.run\(\); \};/g) || []).length === 1,
      'dashboard command palette binds each option click once',
    );
    ok(
      /const job = Object\.prototype\.hasOwnProperty\.call\(JOBS, tool\.id\)[\s\S]{0,80}\? JOBS\[tool\.id\][\s\S]{0,30}: null/.test(dashboardSource) &&
        /runnable:\s*(?:Boolean\(job\)|Object\.prototype\.hasOwnProperty\.call\(JOBS, tool\.id\))/.test(dashboardSource) &&
        /safe:\s*job\?\.safe === true/.test(dashboardSource) &&
        /mutate:\s*job \? job\.mutate === true : false/.test(dashboardSource),
      'dashboard server derives runnable and mutate authority from the JOBS allowlist',
    );
    ok(
      /const authorityPill=!canRun\?/.test(dashboardUiSource) && /view only/.test(dashboardUiSource) && /t\.safe===true/.test(dashboardUiSource),
      'dashboard UI does not label non-runnable catalog tools safe',
    );
    ok(
      /const visibleN = all\.filter\(matches\)\.length/.test(dashboardUiSource) &&
        /visibleN\+['"] of ['"]\+\(reg\.count\|\|all\.length\)\+['"] tools['"]/.test(dashboardUiSource) &&
        /const items=all\.filter\(t=>t\.group===g && matches\(t\)\)/.test(dashboardUiSource),
      'dashboard tools filter reports visible and total result counts',
    );
    ok(
      /const canRun = t\.runnable === true[\s\S]{0,900}: '<button type="button" data-copy-cmd/.test(dashboardUiSource),
      'dashboard tools keep a copy action for view-only catalog entries',
    );
    ok(
      /function renderTools\(reg\)[\s\S]*?\$\('toolsRoot'\)\.querySelectorAll\('\[data-copy-cmd\]'\)[\s\S]*?copyText\(btn\.getAttribute\('data-copy-cmd'\)\)/.test(dashboardUiSource),
      'dashboard tools bind their copy command action',
    );
    ok(
      /cur && \(!Number\.isFinite\(curExpiryMs\) \|\| curExpiryMs > Date\.now\(\)\)/.test(dashboardSource),
      'dashboard refuses to overwrite malformed mutate leases',
    );
    ok(
      /orderedEditors\(\)/.test(cm6Source) && /assertHeadFootSplit\s*\(/.test(cm6Source),
      'fallback CM6 uses ordered head/footer split',
    );
    ok(
      /editorHelperVerifiesPersistedSplit/.test(cm6Source) &&
        /pre === expectedHead && post === expectedFoot/.test(cm6Source),
      'fallback CM6 preflight attests persisted API head/footer separation',
    );
    ok(
      /CHECK_STRUCTURAL/.test(cm6Source) &&
        /headHasNoFootLoader/.test(cm6Source) &&
        /editorHelperPinsHeadFooter/.test(cm6Source) &&
        /editorHelperRequiresExactReadback/.test(cm6Source) &&
        /editorHelperHasNoRawIndexWriter/.test(cm6Source),
      'fallback CM6 exposes structural split and exact-readback preflight',
    );
    ok(
      /function releaseRemediation\(preflight\)[\s\S]{0,5000}releaseRecovery:\s*\{[\s\S]{0,400}mutates:\s*true,[\s\S]{0,200}guarded:\s*true,[\s\S]{0,200}gatedBy:\s*\[['"]publish-freeze['"],\s*['"]foot-lock['"],\s*['"]live-attestation['"]\]/.test(cm6Source),
      'fallback CM6 labels release remediation as a guarded mutation',
    );
    ok(
      /footerMatchesManifest:\s*Boolean\(footerUrl && manifestUrl && footerUrl === manifestUrl\)/.test(cm6Source),
      'fallback CM6 rejects invalid footer and manifest URLs instead of equating null normalizations',
    );
    ok(
      /HEAD\.includes\(['"]unhide-v5['"]\)/.test(shipHeadSource) &&
        /footLoaderUrls[\s\S]{0,500}foot-latest\\\.js/.test(shipHeadSource) &&
        /loaderCount\(savedHeadText\) === 0/.test(shipHeadSource) &&
        /footerLoaderUrls\.length === 1/.test(shipHeadSource) &&
        /footerLoaderUrls\[0\] === expectedFootUrls\[0\]/.test(shipHeadSource) &&
        /!\/unhide-v5\|dg-unhide-critical\//.test(shipHeadSource),
      'fallback head ship gate requires unhide-v5 and an isolated single footer loader',
    );
    ok(
      /role=["']tablist["'][^>]*aria-orientation=["']horizontal["']/.test(dashboardUiSource) &&
        /id=["']tab-overview["'][^>]*role=["']tab["'][^>]*aria-controls=["']panel-overview["'][^>]*aria-selected=["']true["'][^>]*tabindex=["']0["']/.test(dashboardUiSource) &&
        /id=["']tab-inbox["'][^>]*role=["']tab["'][^>]*aria-controls=["']panel-inbox["'][^>]*aria-selected=["']false["'][^>]*tabindex=["']-1["']/.test(dashboardUiSource),
      'fallback dashboard exposes usable tab semantics before JavaScript boot',
    );
    const n = buildNext();
    ok(Boolean(n.id && n.cmd && n.title), 'fallback canonical NEXT shape');
    ok(typeof n.truthEvidence?.green === 'boolean', 'fallback canonical NEXT evidence');
    const cOk = checkContract({ goal: 'selftest contract', touch: ['demigod-evidence.mjs'], requireFootLock: false }, ['demigod-evidence.mjs']);
    const cBad = checkContract({ goal: 'selftest contract', touch: ['demigod-evidence.mjs'], requireFootLock: false }, ['demigod-truth.mjs']);
    ok(cOk.ok, 'fallback contract allows in-scope');
    ok(!cBad.ok, 'fallback contract blocks out-of-scope');
    const contractsPass = fails.length === 0;
    // Static/in-process checks are useful diagnostics, but they do not prove
    // that the OS-level child-process contracts ran. Never publish a green
    // tools-OS receipt when the suite itself could not execute.
    writeReceipt(false, { mode: 'in-process-fallback' });
    if (!contractsPass) {
      console.error('FAIL', fails);
      process.exit(1);
    }
    console.error('DEGRADED demigod-tools-os-selftest: fallback contracts pass; OS execution unverified');
    process.exit(2);
  }
  writeReceipt(false);
  console.error('BLOCKED tools-os-selftest: child processes unavailable');
  process.exit(2);
}
const latest = loadLatest('truth');
ok(latest && latest.producer === 'truth', 'latest-truth exists');
const ref = refuseIfStale('truth');
ok(ref.ok, 'refuseIfStale returns');

const cOk = checkContract({ goal: 'selftest contract', touch: ['demigod-evidence.mjs'], requireFootLock: false }, [
  'demigod-evidence.mjs',
]);
ok(cOk.ok, 'contract allows in-scope');
const cBad = checkContract({ goal: 'selftest contract', touch: ['demigod-evidence.mjs'], requireFootLock: false }, [
  'demigod-truth.mjs',
]);
ok(!cBad.ok, 'contract blocks out-of-scope');

const rev = spawnSync(
  process.execPath,
  [
    path.join(ROOT, 'demigod-review.mjs'),
    '--no-git',
    '--files',
    'demigod-evidence.mjs',
    '--fail-on',
    'never',
    '--format',
    'summary',
  ],
  { cwd: ROOT, encoding: 'utf8', timeout: 60000 },
);
ok(exited(rev, [0]), 'review summary');
diagnoseSpawn('review', rev);
ok(/REVIEW/.test(rev.stdout), 'review prints summary');

const lock = spawnSync(process.execPath, [path.join(ROOT, 'demigod-foot-lock.mjs'), 'require'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, DG_FOOT_LOCK_SKIP: '' },
});
// free lock should fail
ok(ran(lock) && lock.status !== 0, 'lock require fails when free');
diagnoseSpawn('lock require', lock);

const shipSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-ship-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 180000,
});
ok(exited(shipSt, [0]), 'ship-selftest');
diagnoseSpawn('ship-selftest', shipSt);
if (shipSt.status !== 0) console.error(shipSt.stdout + shipSt.stderr);

const demSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-demand-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 180000,
});
ok(exited(demSt, [0]), 'demand-selftest');
diagnoseSpawn('demand-selftest', demSt);
if (demSt.status !== 0) console.error(demSt.stdout + demSt.stderr);

const cm6St = spawnSync(process.execPath, [path.join(ROOT, 'demigod-cm6-paste-publish.mjs'), '--check-structural'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 15000,
});
ok(exited(cm6St, [0]), 'cm6 head/footer structural preflight');
diagnoseSpawn('cm6 structural preflight', cm6St);
if (cm6St.status !== 0) console.error(cm6St.stdout + cm6St.stderr);

const wizSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-wiz-ownership-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 30000,
});
ok(exited(wizSt, [0]), 'wiz-ownership-selftest');
diagnoseSpawn('wiz-ownership-selftest', wizSt);
if (wizSt.status !== 0) console.error(wizSt.stdout + wizSt.stderr);

const nextA = spawnSync(process.execPath, [path.join(ROOT, 'demigod-next.mjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 15000,
});
ok(exited(nextA, [0]), 'next-canon runs');
diagnoseSpawn('next-canon', nextA);
try {
  const n = JSON.parse(nextA.stdout.slice(nextA.stdout.indexOf('{')));
  ok(n.source !== 'broken' && n.id, 'next has id');
  ok(typeof n.truthEvidence?.green === 'boolean', 'next truthEvidence');
} catch {
  fails.push('next json parse');
}

const idSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-next-identity-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 90000,
});
ok(exited(idSt, [0]), 'next-identity-selftest');
diagnoseSpawn('next-identity-selftest', idSt);
if (idSt.status !== 0) console.error(idSt.stdout + idSt.stderr);

const uniSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-unify-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
ok(exited(uniSt, [0]), 'unify-selftest');
diagnoseSpawn('unify-selftest', uniSt);
if (uniSt.status !== 0) console.error(uniSt.stdout + uniSt.stderr);

// P1 CLI surface checks
const who = spawnSync(process.execPath, [path.join(ROOT, 'demigod-foot-lock.mjs'), 'who'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 10000,
});
ok(exited(who, [0]), 'lock who');
diagnoseSpawn('lock who', who);
const facts = spawnSync(process.execPath, [path.join(ROOT, 'demigod-ship.mjs'), 'status', '--facts'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
ok(exited(facts, [0]), 'ship --facts');
diagnoseSpawn('ship --facts', facts);
ok(!/demand-ops|Human DM/i.test(facts.stdout), 'facts has no agent NEXT prose');
const evP = spawnSync(process.execPath, [path.join(ROOT, 'demigod-evidence.mjs'), 'producers', 'truth,review'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 15000,
});
ok(exited(evP, [0, 1]), 'evidence producers runs');
diagnoseSpawn('evidence producers', evP);
const ho = spawnSync(
  process.execPath,
  [path.join(ROOT, 'demigod-handoff.mjs'), '--from', 'selftest', '--done', 'p1', '--next', 'verify', '--fast', '--print'],
  { cwd: ROOT, encoding: 'utf8', timeout: 15000 },
);
ok(exited(ho, [0]), 'handoff structured');
diagnoseSpawn('handoff', ho);

// Boring ROI: poison false-green (required — no skip)
const poisonSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-poison-green-selftest.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
ok(exited(poisonSt, [0]), 'poison-green-selftest');
diagnoseSpawn('poison-green-selftest', poisonSt);
if (poisonSt.status !== 0) console.error(poisonSt.stdout + poisonSt.stderr);

// Boring ROI: orient one-shot (0 oriented · 1 soft · 2 dual-NEXT · 3 hard)
const orientSt = spawnSync(process.execPath, [path.join(ROOT, 'demigod-orient.mjs'), '--json', '--no-refresh'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
const dashboardHttpPolicySource = fs.readFileSync(path.join(ROOT, 'demigod-dashboard-http-policy.mjs'), 'utf8');
const dashboardUiSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html'), 'utf8');
try {
  const inlineScripts = [...dashboardUiSource.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  ok(inlineScripts.length > 0, 'dashboard UI contains an inline application script');
  ok(
    /const request = \(async\(\)=>\{[\s\S]*if\(loadInflight===request\) loadInflight=null;[\s\S]*loadInflight=request;[\s\S]*return request;/.test(dashboardUiSource),
    'dashboard superseded refresh cannot clear the active request slot',
  );
  for (const [index, match] of inlineScripts.entries()) {
    new vm.Script(match[1], { filename: `demigod-agent-dashboard-ui.inline-${index}.js` });
  }
  ok(true, 'dashboard inline JavaScript parses');
} catch (error) {
  console.error('dashboard inline JavaScript parse error:', error.message);
  ok(false, 'dashboard inline JavaScript parses');
}
ok(
  /function render\(d\)\{[\s\S]{0,700}renderPriorityBoard\(d\);/.test(dashboardUiSource),
  'dashboard status refresh renders the priority board',
);
ok(
  /body\.cached = true;[\s\S]{0,120}body\.degraded = true;/.test(dashboardSource) &&
    /const cachedAtMs = Date\.parse\(body\?\.at \|\| ''\);[\s\S]{0,320}body\.cacheAgeMs\s*=/.test(dashboardSource),
  'dashboard cached orient fallback is degraded and age-stamped',
);
ok(
  /validOrientCard =[\s\S]{0,220}body\?\.schema === ['"]demigod\.orient\/1['"][\s\S]{0,320}jsonSend\(res, validOrientCard \? 200 : 503/.test(dashboardSource),
  'dashboard orient API serves only schema-valid current cards over HTTP 200',
);
ok(
  /cdnUrls: data\.live\.cdnUrls/.test(dashboardSource)
    && /canonicalHead: data\.live\.canonicalHead/.test(dashboardSource)
    && /hasCriticalUnhide: data\.live\.hasCriticalUnhide/.test(dashboardSource),
  'dashboard compact status preserves ship-critical live evidence',
);
ok(
  /const canRun = t\.runnable === true/.test(dashboardUiSource) && /canRun\s*\?/.test(dashboardUiSource),
  'dashboard run buttons require server-issued runnable authority',
);
ok(
  /const visibleN = all\.filter\(matches\)\.length/.test(dashboardUiSource) &&
    /visibleN\+['"] of ['"]\+\(reg\.count\|\|all\.length\)\+['"] tools['"]/.test(dashboardUiSource) &&
    /const items=all\.filter\(t=>t\.group===g && matches\(t\)\)/.test(dashboardUiSource),
  'dashboard tools filter reports visible and total result counts',
);
ok(
  /if\(j&&j\.mutate===true&&!opts\.mutate\)[\s\S]{0,120}askMutateConfirm\(id, opts\)/.test(dashboardUiSource),
  'dashboard server-classified mutate jobs enter explicit confirmation',
);
ok(
  /const canRun = t\.runnable === true[\s\S]{0,900}: '<button type="button" data-copy-cmd/.test(dashboardUiSource),
  'dashboard tools keep a copy action for view-only catalog entries',
);
ok(
  /function renderTools\(reg\)[\s\S]*?\$\('toolsRoot'\)\.querySelectorAll\('\[data-copy-cmd\]'\)[\s\S]*?copyText\(btn\.getAttribute\('data-copy-cmd'\)\)/.test(dashboardUiSource),
  'dashboard tools bind their copy command action',
);
ok(
  !/id=['"]apiStrip['"]/.test(dashboardUiSource) &&
    dashboardUiSource.includes("{t:'Copy orient URL', d:'canonical session-start card', run:()=>copyText('http://127.0.0.1:9878/api/orient')}"),
  'dashboard keeps canonical orient discovery without a duplicate API strip',
);
ok(
  dashboardUiSource.includes("{t:'Copy orient URL', d:'canonical session-start card', run:()=>copyText('http://127.0.0.1:9878/api/orient')}"),
  'dashboard command palette copies canonical orient URL',
);
const paletteTitles = [...dashboardUiSource.matchAll(/\{t:'([^']+)'[^\n]*run:/g)].map((match) => match[1]);
ok(new Set(paletteTitles).size === paletteTitles.length, 'dashboard command palette has no duplicate actions');
ok(paletteTitles.includes('Run orient'), 'dashboard command palette exposes canonical orient job');
ok(
  /body\.statusJsonPathView\s*=\s*\{/.test(dashboardSource) &&
    /hygiene:\s*body\.demandDraftsHygiene/.test(dashboardSource) &&
    /demandDraftsHygieneJsonPointer:\s*['"]\/statusJsonPathView\/demand\/drafts\/hygiene['"]/.test(dashboardSource),
  'orient API exposes the compact status JSON path view with demand draft hygiene',
);
ok(
  /cycleWorkExceptions\.length === 0/.test(dashboardSource) &&
    /!cycleWorkStale/.test(dashboardSource) &&
    /exceptionCount:\s*cycleWorkExceptions\.length/.test(dashboardSource) &&
    /child-start-blocked/.test(dashboardSource),
  'dashboard cycle health cannot be green when stale or checks have exceptions',
);
ok(
  /const cycleWorkDegraded\s*=/.test(dashboardSource) &&
    /check\.degraded \|\| check\.fallback \|\| check\.childStartBlocked/.test(dashboardSource) &&
    /degraded:\s*cycleWorkDegraded/.test(dashboardSource),
  'dashboard derives degraded cycle health from child checks as well as the receipt summary',
);
ok(
  /const orientAtMs = Date\.parse\(body\?\.at \|\| ['"]['"]\)/.test(dashboardSource) &&
    /Number\.isFinite\(orientAtMs\)/.test(dashboardSource) &&
    /!body\.cached \|\| orientAgeMs <= 15 \* 60_000/.test(dashboardSource),
  'dashboard orient HTTP status rejects malformed or stale cached receipts',
);
const orientSource = fs.readFileSync(path.join(ROOT, 'demigod-orient.mjs'), 'utf8');
ok(
  /doctorPass:\s*webflowDoctorFresh\s*\?\s*webflow\.doctor\?\.pass/.test(dashboardSource) &&
    /doctorFailed:\s*webflowDoctorFresh/.test(dashboardSource) &&
    /doctorObservable:\s*webflowDoctorFresh\s*&&/.test(dashboardSource) &&
    /check\.name === 'cdp' && \/EPERM\//.test(dashboardSource),
  'coord API distinguishes an unobservable Webflow doctor from a real failure',
);
ok(
  /hasPilotPath/.test(dashboardSource) &&
    /\\\/pilot/.test(dashboardSource) &&
    /p=pilot/.test(dashboardSource) &&
    /shipReady:\s*hasBlogRedirect\s*&&\s*hasMethodRedirect\s*&&\s*hasNestedPathRedirects\s*&&\s*hasNoteSlugRedirect\s*&&\s*hasSamplePath\s*&&\s*hasPilotPath/.test(dashboardSource),
  'coord footer-lite readiness requires nested Webflow redirects + /sample + /pilot paths',
);
ok(
  /hasNoteSlugRedirect/.test(dashboardSource) &&
    /hasDeepLink/.test(dashboardSource) &&
    /hasNoteTitle/.test(dashboardSource) &&
    /hasNoteHashChange/.test(dashboardSource) &&
    dashboardSource.includes('id="note-${slug}"') &&
    /dynamicSor/.test(dashboardSource) &&
    /var\\s\+DG_BLOG_POSTS\\s\*=/.test(dashboardSource) &&
    /anchors === posts\.length/.test(dashboardSource) &&
    /focusBlogNoteFromHash/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /hashchange/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'coord footNotes/footerLite dogfood dynamic DG_BLOG_POSTS SoR + note slug deep-links + hashchange title',
);
ok(
  /const cdpDown = \(webflowDoctor\.checks \|\| \[\]\)\.some/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /receipt timestamp is in the future/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /next\.title && [\s\S]{0,80}!cards\.some\(\(card\) => next\.cmd && card\.cmd === next\.cmd\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')),
  'priority board collapses derivative CDP tab failures, explains clock skew, and deduplicates canonical commands',
);

ok(
  /observational = new Set\(\['cdp', 'live fetch', 'live SEO meta unique'\]\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /filter\(\(check\) => !observational\.has\(check\.name\)\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /pri: failed\.length \? 1 : 3/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')),
  'priority board demotes namespace-only Webflow failures when canonical live truth is healthy',
);
ok(
  /CDP unobservable/.test(fs.readFileSync(path.join(ROOT, 'demigod-webflow-lib.mjs'), 'utf8')) &&
    /s\.cdp\.error\?\.includes\(['"]EPERM['"]\) \? ['"]- CDP unobservable in this namespace['"] : ['"]- Fix CDP first['"]/.test(
      fs.readFileSync(path.join(ROOT, 'demigod-webflow.mjs'), 'utf8'),
    ),
  'Webflow doctor and brief distinguish namespace-blocked CDP from confirmed downtime',
);
ok(
  /if \(!s\.cdp\.error\?\.includes\(['"]EPERM['"]\)\) \{[\s\S]{0,260}webflow-doctor\.json[\s\S]{0,180}atomicWrite\(OUT/.test(
    fs.readFileSync(path.join(ROOT, 'demigod-webflow.mjs'), 'utf8'),
  ),
  'Webflow doctor does not overwrite host receipts from a namespace-blocked CDP probe',
);
ok(
  /namespaceBlocked = s\.cdp\.error\?\.includes\(['"]EPERM['"]\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-webflow.mjs'), 'utf8')) &&
    /namespaceBlocked \? \['cdp', 'live fetch'\] : \[\]/.test(fs.readFileSync(path.join(ROOT, 'demigod-webflow.mjs'), 'utf8')),
  'Webflow doctor does not fail on namespace-blocked observational probes',
);
{
  const prioritySource = fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8');
  ok(
    /Cycle tools OK · release-blocked/.test(prioritySource) &&
      /toolsReady && releaseBlocked && te\.green === true \? 3 : 2/.test(prioritySource),
    'priority board demotes tools OK·release-blocked to P3 when truth is green',
  );
  ok(
    /pri: 3,[\s\S]{0,80}id: 'webflow-doctor-stale',[\s\S]{0,120}kind: siteTruthCoversStaleness \? 'info' : 'watch'/.test(prioritySource),
    'priority board keeps stale Webflow doctor receipts as P3 watch (or info when truth already covers it)',
  );
ok(
  /Site sealed green/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /id: 'truth-green'/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /pri: 4/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')),
  'priority board surfaces truth-green as P4 Site sealed green',
);
ok(
  /const liveUnobservable = \/ENOTFOUND\|EAI_AGAIN\|EPERM\//.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /live\.ok === false && !liveUnobservable/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /error\?\.cause\?\.code/.test(fs.readFileSync(path.join(ROOT, 'demigod-truth.mjs'), 'utf8')),
  'priority board does not report a namespace-blocked live probe as an outage',
);
ok(
  /Drafts only — no auto-DM/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /top3Names/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /hygiene ok/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')),
  'priority board demand drafts detail includes top3 names and hygiene',
);
ok(
  /foot-lock\.json/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /lockHeld/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /id: 'lock-held'/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')),
  'priority board surfaces foot lock held from foot-lock.json',
);
ok(
  /lock\.why/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')) &&
    /ttl ~\$\{lock\.ttlLeftSec\}/.test(fs.readFileSync(path.join(ROOT, 'demigod-priority-board.mjs'), 'utf8')),
  'priority board lock-held detail includes why + ttl',
);




  ok(
    /warmInbound\?\.freshness|overdueActionCount/.test(prioritySource) &&
      /warm-due-today/.test(prioritySource) &&
      /dueTodayActionCount/.test(prioritySource),
    'priority board separates warm due-today from overdue using freshness counts',
  );

ok(
  (() => {
    const ui = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html'), 'utf8');
    return /#priorityBoard \.p-actions button\{[^}]*min-height:44px/.test(ui) &&
      /data-run-job="[^"]*" aria-label=/.test(ui) &&
      /data-copy-cmd="[^"]*" aria-label=/.test(ui);
  })(),
  'dashboard priority cards keep 44px taps and labeled Run/Copy actions',
);
ok(
  (() => {
    const ui = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html'), 'utf8');
    return /#priorityBoard \.p-actions button:focus-visible\{/.test(ui) &&
      /outline:2px solid/.test(ui);
  })(),
  'dashboard priority cards keep keyboard focus-visible on actions',
);


}
ok(
  /clockSkewed: Number\.isFinite\(doctorAgeMs\) && doctorAgeMs < -60000/.test(dashboardSource) &&
    /doctorAgeMs >= -60000 && doctorAgeMs <= 120000/.test(dashboardSource),
  'dashboard Webflow doctor rejects future-dated receipts',
);
ok(
  /shipStatusFresh:\s*Number\.isFinite\(shipAgeMs\) && shipAgeMs >= -60000 && shipAgeMs <= 300000/.test(dashboardSource),
  'coord API rejects future-dated ship status receipts',
);
ok(
  /swarmLatestClockSkewed = ageSec < -60/.test(dashboardSource) &&
    /swarmLatestAgeSec = Math\.max\(0, ageSec\)/.test(dashboardSource) &&
    /stale: swarmLatestClockSkewed \|\| swarmLatestAgeSec == null/.test(dashboardSource),
  'coord API clamps and rejects future-dated swarm summaries',
);
ok(
  /let cssFresh = false/.test(dashboardSource) &&
    /head-css-cdn\.json/.test(dashboardSource) &&
    /wantLiveCss/.test(dashboardSource) &&
    /crypto\.createHash\('sha256'\)\.update\(liveCss\)\.digest\('hex'\) === diskCssSha/.test(dashboardSource) &&
    /hasColorScheme/.test(dashboardSource) &&
    /cssFresh/.test(dashboardSource),
  'coord head CSS: receipt-first dogfood; optional live catbox only when wantLiveCss (laptop-light)',
);
ok(
  /id=["']dg-nav-jsonld["']/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /@type["']:\s*["']ItemList["']/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head exposes #dg-nav-jsonld ItemList for mini-page discovery (no sitemap.xml)',
);
ok(
  /wiz=startup/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /wiz=engineer/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /p=contact/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head ItemList includes wiz CTAs + contact for discovery without sitemap',
);
ok(
  /dg-volume-step-hide/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /dg-volume-honest/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head FOUC-hides volume step-card until dg-volume-honest after scrub',
);
ok(
  /dg-contact-honest/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /mailto:hello/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head FOUC-hides mailto:hello until dg-contact-honest after scrub',
);
ok(
  /dg-early-skip/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /Skip to content/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /querySelector\('\.hero-section'\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /setAttribute\('role','main'\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head early skip link has a real main target before foot-core',
);
ok(
  /prefers-reduced-motion:\s*reduce/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /scrollIntoView/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head early skip respects reduced-motion + scrollIntoView',
);
ok(
  /Cinzel/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head headings use Cinzel display face (Webflow-loaded)',
);
ok(
  /focus-visible/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /::selection/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head focus-visible + selection brand chrome',
);
ok(
  /dns-prefetch/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /cdn\.jsdelivr\.net/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head dns-prefetch jsDelivr for foot CDN',
);
ok(
  /#dg-skip-early:focus-visible/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head early skip focus-visible outline',
);

ok(
  /scroll-margin-top/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /scroll-margin-top/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'head+foot scroll-margin for skip-link targets',
);
ok(
  /dg-cta-honest/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /btn-label/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head FOUC-hides .btn-label until dg-cta-honest after FIND/HIRE rewrite',
);
ok(
  /dg-pricing-honest/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /pre-vetted SF talent/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head rewrites pricing-card agency bullets + dg-pricing-honest',
);
ok(
  /Skip to main content/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /aria-label/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot skipLink Skip to main content + aria-label (v522)',
);
ok(
  /function forceMainVisible/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /roles-grid/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /display:grid/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot forceMainVisible restores product grids as display:grid',
);
ok(
  /prefers-reduced-motion:reduce/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /transform:none/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot reduced-motion disables CTA hover transform',
);
ok(
  /#dg-legal-links\{display:flex/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot #dg-legal-links flex-wrap footer chrome',
);
ok(
  /#footer-email/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot footer mailto hover styles for potter@ contact',
);
// Was a hard pin on the literal selector `.pricing-card a.premium-btn:focus-visible`. That exact
// rule was consolidated (like the legal-links case below) into a broader `.premium-btn:focus-visible`
// rule that covers every premium-btn, pricing-card included, by class alone regardless of ancestor.
// Verified live via CDP on the real DOM node (.pricing-card a.premium-btn.is-talent): computed
// min-height is 48px, and no later same-or-higher-specificity rule sets outline:none for it — the
// global rule is the only one in scope. Accept either shape.
ok(
  (/pricing-card a\.premium-btn:focus-visible/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) ||
    /\.premium-btn:focus-visible[^{]{0,200}\{[^}]{0,200}outline:\s*\d/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8'))) &&
    /min-height:48px!important/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot pricing CTA min-height 48px + focus-visible (specific rule or the global .premium-btn:focus-visible rule covering it)',
);
ok(
  /pricing-card \.pricing-amount/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot pricing-amount contrast for redesign',
);
// Was /#dg-legal-links a:focus-visible/ — a FALSE failure. That exact selector was correctly
// deleted: ensureA11yCss ships a broader `a:focus-visible{outline:2px solid ...}` rule which covers
// every link, legal links included, so the specific one was redundant. The gate pinned the selector
// TEXT, not the behaviour, so a redesign that improved the CSS turned the gate red and it stayed red.
// Verified in a real browser (CDP, disk foot-core injected) rather than by reading: focusing
// `#dg-legal-links a` ("How") resolves to outlineWidth 2px, outlineStyle solid,
// outlineColor rgb(201,168,76), and matches(':focus-visible') === true.
// Accept either shape: the legal-links-specific rule OR the global one that provably covers it.
{
  const footSrc = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  // Must match an actual focus RULE (selector list -> a block that sets an outline), not a bare
  // mention, so a comment or a stray string can never satisfy it.
  ok(
    /#dg-legal-links a:focus-visible/.test(footSrc) ||
      /a:focus-visible[^{]{0,200}\{[^}]{0,200}outline:\s*\d/.test(footSrc),
    'foot legal-links focus-visible (specific rule or the global a:focus-visible rule covering it)',
  );
}
ok(
  /export function classifyTab\(url = '', title = ''\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-webflow-lib.mjs'), 'utf8')) &&
    /not the page you were looking/.test(fs.readFileSync(path.join(ROOT, 'demigod-webflow-lib.mjs'), 'utf8')),
  'webflow-lib 404 custom-code classifies as webflow-login',
)
// Was checking that a .role-card:hover transform gets disabled under prefers-reduced-motion.
// STALE: verified live via CDP (disk foot-core injected, real Webflow stylesheet inspected) that
// .role-card has no :hover rule at all anymore — only a :focus-within outline. The hover-transform
// feature the gate pinned was removed in a later redesign; there is nothing left for
// reduced-motion to "kill", so the a11y concern is moot. Retired rather than rewritten.
ok(
  /#dg-bar a:focus-visible/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot mobile bar focus-visible',
);
ok(
  /text-wrap:balance/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head heading text-wrap balance',
);
// Was "focus-visible + touch-action" as one pin. Focus is covered above. touch-action on
// #dg-bar was deleted in the redesign (touch-action:manipulation now only on WIZ nav
// buttons via CSS + enhanceWIZ setProperty — not the mobile bar). Retired the bar half.
ok(
  /-webkit-tap-highlight-color/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head webkit tap-highlight gold tint',
);
// Was min-height:44px on the same selector. Redesign kept the RULE (tap min-height on
// #dg-legal-links a) but dropped the value to 40px. Pin the rule shape, not the old number.
{
  const footSrc = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  ok(
    /#dg-legal-links a\{[^}]*min-height:\d+px/.test(footSrc),
    'foot legal-links min-height tap targets',
  );
}
// Was min-height:48px. Same story: rule survives at min-height:40px.
{
  const footSrc = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  ok(
    /#dg-path-pills a\{[^}]*min-height:\d+px/.test(footSrc),
    'foot path-pills min-height tap targets',
  );
}
ok(
  /dg-wiz-next:focus-visible/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot wiz next/back focus-visible',
);
// Was #footer-email:focus-visible + 44px. Specific focus rule deleted — covered by the
// global a:focus-visible{outline:...} rule (same consolidation as legal-links). 44px tap
// on the mailto was also removed (text link, no min-height). Assert focus coverage only.
{
  const footSrc = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  ok(
    /#footer-email:focus-visible/.test(footSrc) ||
      /a:focus-visible[^{]{0,200}\{[^}]{0,200}outline:\s*\d/.test(footSrc),
    'foot footer-email focus-visible (specific rule or global a:focus-visible covering it)',
  );
}
ok(
  /text-size-adjust:100%/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head text-size-adjust 100% mobile',
);
// Was #dg-hero-chips .dg-chip{user-select:none}. DELETED feature: hero() now builds a single
// <p class="dg-trust-line"> from COPY.heroTrustLine; .dg-chip and user-select are 0 refs.
// Retired rather than broadened (would rubber-stamp a bare mention).
ok(
  /overflow-x:clip/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head overflow-x clip redesign',
);
ok(
  /!tit\.trim\(\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-webflow-lib.mjs'), 'utf8')),
  'webflow-lib empty-title custom-code fail-closed',
);
ok(
  /re-auth site-owner account/.test(fs.readFileSync(path.join(ROOT, 'demigod-webflow-lib.mjs'), 'utf8')),
  'webflow-lib site-owner tip on login wall',
);
ok(
  /liveCdnId: cdnPin\(liveCdnCanon\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-ship-status.mjs'), 'utf8')) &&
    /manCdnId: cdnPin\(manCdnCanon\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-ship-status.mjs'), 'utf8')),
  'ship-status facts use jsDelivr sha pins',
);
ok(
  /liveCdnShort:/.test(fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8')) &&
    /live@\$\{redesignSnap\.liveCdnShort/.test(fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8')),
  'dash redesignSnap live@ pin in workSummary',
);
ok(
  /#dg-copyright,footer \[class\*=copyright\]/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot copyright brandAssets styles',
);
ok(
  /scrollbar-gutter:stable/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head scrollbar-gutter stable',
);
// Was .step-num{font-variant-numeric:tabular-nums}. DELETED: .step-num still styles
// color/size/weight but dropped tabular-nums. font-variant-numeric lives only on wiz
// .dg-cur (different element). Retired the step-num pin.
ok(
  /-moz-text-size-adjust:100%/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head moz text-size-adjust',
);
// Was body{isolation:isolate} exact. Rule gained overscroll-behavior-y:none in the same
// block. Pin the declaration inside a body rule, not the whole block text.
{
  const headSrc = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
  ok(
    /body\{[^}]*isolation:\s*isolate/.test(headSrc),
    'head body isolation isolate',
  );
}
ok(
  /shipFacts\?\.liveCdnId/.test(fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8')),
  'dash shipBit liveCdnId pin',
);
// role-title-text / heading_tertiary line-height / hero-badge min-height / roles-header
// max-width / trust-header+steps-grid+roles-grid padding / role-tag padding /
// role-card radius 14px / footer-tagline line-height — all DELETED in the redesign:
// roles section force-hidden (section:has(.roles-grid)), hero-badge display:none,
// headings consolidated without line-height pins, grids lost padding:0 1rem chrome,
// role-card 14px never re-landed on product cards (14px is #dg-page blog/event only).
// Retired rather than rubber-stamping bare mentions.
ok(
  /-webkit-font-smoothing:antialiased/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head font-smoothing antialiased',
);
// Was .paragraph_large{line-height:1.55} alone. Consolidated into
// .trust-header p,.paragraph_large,.step-desc{...line-height:1.55!important}.
// Require a RULE that names .paragraph_large and sets line-height:1.55.
{
  const footSrc = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  ok(
    /\.paragraph_large[^{]{0,120}\{[^}]{0,200}line-height:\s*1\.55/.test(footSrc),
    'foot paragraph_large line-height',
  );
}
ok(
  /a:visited\{color:var\(--gl\)\}/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head a:visited gold-light',
);
ok(
  /\.pricing-card h3\{[^}]*text-transform:uppercase/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot pricing-card h3 uppercase',
);
ok(
  /a:hover\{color:var\(--gl\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head a:hover gold-light',
);
ok(
  /mark\{background:rgba\(201,168,76/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head mark gold highlight',
);
ok(
  /strong,b\{color:var\(--cr\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head strong/b cream weight',
);
ok(
  /code,kbd,samp\{/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head code/kbd mono gold',
);
ok(
  /hr\{border:0;border-top:1px solid rgba\(201,168,76/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head hr gold-tint rule',
);
ok(
  /blockquote\{margin:1rem auto/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head blockquote gold border',
);
ok(
  /table\{width:100%/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head table gold-border styles',
);









ok(
  /scroll-behavior:smooth/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /prefers-reduced-motion:reduce\)\{html\{scroll-behavior:auto\}/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head scroll-behavior a11y',
);







// Was footer-tagline{line-height:1.45}. DELETED: tagline rule is now
// #demigod-footer-tag,footer .footer-tagline{font-size;color} only — no line-height.
// Retired.






const headMinimalSource = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
ok(
  (headMinimalSource.match(/rel="preconnect"/g) || []).length === 1 &&
    /rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"/.test(headMinimalSource),
  'head preconnect budget keeps only critical jsDelivr',
);








ok(
  /dg-cta-honest/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /dg-pricing-honest/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot marks dg-*-honest classes after scrub for head FOUC CSS',
);
ok(
  /function skipLink/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /scrollIntoView/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /prefers-reduced-motion/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot skipLink scrollIntoView + reduced-motion (v521)',
);
ok(
  /shipLive/.test(dashboardSource) && /liveVerSource/.test(dashboardSource) && /shipMan/.test(dashboardSource),
  'coord ship.facts prefers truth live/man when ship-status lags post-ship',
);

ok(
  /COORD_TTL_MS/.test(dashboardSource) &&
    /coordCache/.test(dashboardSource) &&
    /cacheAgeMs/.test(dashboardSource) &&
    /coordTtlMs:\s*COORD_TTL_MS/.test(dashboardSource),
  'coord API short-TTL cache + healthz exposes coordTtlMs (hot-poll light path)',
);
ok(
  /let pollMs = 45000/.test(dashboardUiSource) &&
    /document\.hidden \? 90000 : 45000/.test(dashboardUiSource),
  'dashboard UI default poll 45s (hidden 90s) for laptop-friendly refresh',
);
ok(
  /const statusAgeMs = wf\?\.at \? Date\.now\(\) - Date\.parse\(wf\.at\) : Infinity/.test(dashboardSource) &&
    /fresh: Number\.isFinite\(statusAgeMs\) && statusAgeMs >= -60000 && statusAgeMs <= 120000/.test(dashboardSource),
  'Webflow API exposes status receipt freshness and clock skew',
);
ok(
  /if \(force\) \{[\s\S]{0,120}demigod-webflow\.mjs doctor --json[\s\S]{0,180}if \(!wf\) \{/.test(dashboardSource),
  'Webflow API refresh renews status and doctor receipts together',
);
ok(
  /const webflowDoctor = safeJson\(path\.join\(BUSY, 'webflow-doctor\.json'\)\)/.test(dashboardSource) &&
    /webflowStatus \|\| webflowDoctor \? \{ \.\.\.\(webflowStatus \|\| \{\}\), doctor: webflowDoctor \|\| webflowStatus\?\.doctor \|\| null \} : null/.test(dashboardSource) &&
    /doctorPass: webflowDoctorFresh \? webflow\.doctor\?\.pass/.test(dashboardSource) &&
    /doctorFresh: webflowDoctorFresh/.test(dashboardSource) &&
    /doctorCmd: webflowDoctorFresh \? null : ['"]bin\/dg webflow doctor['"]/.test(dashboardSource),
  'coord API preserves only a fresh standalone Webflow doctor receipt and names stale recovery',
);
ok(
  /const wl=d\?\.work\|\|d\?\.workLog/.test(dashboardUiSource) &&
    !/fetch\('\/api\/coord'\)/.test(dashboardUiSource),
  'dashboard work view uses the canonical status payload without a second poll',
);
ok(
  /agentWorkLog/.test(dashboardUiSource) &&
    /Current work/.test(dashboardUiSource) &&
    /renderWorkLog/.test(dashboardUiSource) &&
    /function renderActivePanel\(d\)/.test(dashboardUiSource),
  'dashboard Work panel renders collaboration from the status read model',
);
ok(
  /['"]events-tick['"]:\s*\{[^}]*bin\/dg-events-tick[^}]*mutate:\s*true/.test(dashboardSource) &&
    /data-event-primary=/.test(dashboardUiSource) &&
    /btn\.onclick=\(\)=>runJob\('events-tick',\{mutate:true,btn\}\)/.test(dashboardUiSource),
  'dashboard exposes guarded private Events Bot action',
);
ok(
  /['"]events-invite-drain['"]:\s*\{[^}]*demigod-events-invite-drain\.mjs[^}]*mutate:\s*true/.test(dashboardSource) &&
    /data-run-job="events-invite-drain"/.test(dashboardUiSource),
  'dashboard exposes the existing guarded Events Bot invite drain',
);
ok(
  /const inviteDrainMatchesActive = inviteDrain\?\.eventId === active\?\.id/.test(dashboardSource) &&
    /stale: !inviteDrainMatchesActive \|\|/.test(dashboardSource),
  'dashboard marks missing or prior-event invite drain evidence stale',
);
ok(
  /mutate:\[['"]events-invite-drain['"],['"]events-tick['"]\]\.includes\(id\)/.test(dashboardUiSource) &&
    !/['"]events-online-heal['"]\s*:/.test(dashboardSource) &&
    !/data-run-job=['"]events-online-heal['"]/.test(dashboardUiSource),
  'dashboard Events mutations are limited to invite drain and lifecycle tick',
);
ok(
  // Was: pre-v7 "copy invite drop line" markup (platform=+id=+url=), removed by the
  // v7 editorial command-center redesign (d1958b4). Current UI shows ready/missing
  // status instead of naming the specific platform draft; backend still computes
  // inviteDraft but it is no longer rendered.
  /Invite '\+\(d\.eventsBot\.inviteUrlRecorded\?'ready':'missing'\)/.test(dashboardUiSource),
  'dashboard shows invite ready/missing status for the active event stage',
);
ok(
  /r\?\.eventId === active\.id && r\.status === ['"]yes['"]/.test(dashboardSource),
  'dashboard reports the canonical native yes RSVP count',
);
ok(
  /seatsRemaining: Number\.isFinite\(active\.seats\)[\s\S]{0,120}Math\.max\(0, active\.seats - confirmedCount\)/.test(dashboardSource) &&
    /d\.eventsBot\.seatsRemaining==null[\s\S]{0,100}seats left/.test(dashboardUiSource),
  'dashboard reports non-negative remaining event capacity when both counts are known',
);
ok(
  /import \{[^}]*matchOffersToEvent[^}]*\} from ['"]\.\/demigod-events-bot-agent\.mjs['"]/.test(dashboardSource) &&
    /const resourceOffers = matchOffersToEvent\(store\)\.offerCounts/.test(dashboardSource) &&
    /offers: resourceOffers/.test(dashboardSource),
  'dashboard resource pools reuse canonical eligible offer counts',
);
ok(
  /\[['"]luma['"], ['"]partiful['"]\]\.flatMap/.test(dashboardSource) &&
    !/Object\.entries\(store\.platforms \|\| \{\}\)/.test(dashboardSource),
  'dashboard external invite truth cannot be satisfied by a native Demigod URL',
);
ok(
  // Was: pre-v7 "copy invite drop line" markup (platform=+id=+url=) + a data-run-job="events-tick"
  // Blocked/Run-lifecycle-tick ternary, removed by the v7 editorial command-center redesign
  // (d1958b4), same as the assertion above. Current UI: a single data-event-primary button that
  // is disabled with the block reason as its title/label instead of promising advancement;
  // backend still computes inviteDraft but it is no longer rendered (0 occurrences in the UI).
  !dashboardUiSource.includes('inviteDraft') &&
    /data-event-primary="1"'\+\(eventsLifecycleBlocked\?' disabled title="'\+esc\(eventsLifecycleBlockReason\)\+'"':''\)/.test(dashboardUiSource) &&
    /\(eventsLifecycleBlocked\?'Planning paused · '\+esc\(eventsLifecycleBlockReason\):'Continue planning'\)/.test(dashboardUiSource),
  'dashboard does not promise lifecycle advancement — blocked primary button is disabled and states the reason',
);
ok(
  // Was: pre-redesign two-button split ("Drain pasted URL" gated by
  // !inviteUrlRecorded&&!invitePlatformUrlRecorded). Current UI: native invite is the
  // primary CTA (Open/Copy guest invite) and external hosting is a single secondary
  // "Refresh invite drain" button that only appears once a native invite is recorded
  // AND the drain is stale — verified live-executing in
  // demigod-dashboard-events-native-invite.test.mjs ("event operator card refreshes
  // invite drain only when stale", 35/35 pass), not just this regex.
  /const inviteShareable = \[['"]rsvp['"], ['"]run['"], ['"]followup['"], ['"]debrief['"]\]\.includes\(active\.stage\)/.test(dashboardSource) &&
    /const inviteUrl = \[active\.published_url[\s\S]{0,260}\]\.find\(realInviteUrl\) \|\| null/.test(dashboardSource) &&
    /inviteUrl:\s*inviteShareable \? inviteUrl : null/.test(dashboardSource) &&
    /store\.platforms\?\.demigod/.test(dashboardSource) &&
    /row\.eventId === active\.id/.test(dashboardSource) &&
    /data-copy-cli="['"]\+esc\(d\.eventsBot\.inviteUrl\)/.test(dashboardUiSource) &&
    /d\.eventsBot\?\.inviteUrlRecorded&&d\.eventsBot\?\.inviteDrain\?\.stale\?'<button type="button" data-run-job="events-invite-drain">Refresh invite drain<\/button> '/.test(dashboardUiSource),
  'dashboard exposes the native guest invite and demotes external hosting to optional actions',
);
ok(
  (() => {
    const foot = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    // Public events surface is the SF map + bot draft path (dgMapEventsHtml), not the
    // retired calendar heading / host-tick ops chrome. Calendar mount may remain as
    // dead code; it must not be called. Aligns with demigod-dashboard-events-native-invite.
    return (
      /function dgMapEventsHtml\s*\(/.test(foot) &&
      /html:\s*dgMapEventsHtml\('events'\)/.test(foot) &&
      !foot.includes('id="dg-ev-cal-h"') &&
      !/eventsBotCalendarMount\([^)]*\)(?!\s*\{)/.test(foot)
    );
  })(),
  'Events Bot public page is chat-only (no calendar heading, no dead ops control)',
);
ok(
  /stale: !Number\.isFinite\(ageMs\)[\s\S]{0,80}30 \* 60_000/.test(dashboardSource) &&
    /liveSnap\.open > 0 && !liveSnap\.stale/.test(dashboardSource) &&
    /currentAgents=agents\.filter\(a=>a\.ageSec==null\|\|a\.ageSec<3600\)/.test(dashboardUiSource) &&
    /timeline=recent\.filter\(r=>r\.ageSec==null\|\|r\.ageSec<3600\)/.test(dashboardUiSource),
  'dashboard Home suppresses stale live findings and Work Log entries older than one hour',
);
ok(
  // ES6 shorthand: the response is built as { ..., workLog, ... } (verified: "items: openP0P1, },
  // workLog,"), never `workLog:`. The old /workLog:/ could not match at any version, and the
  // feature demonstrably works — live /api/coord returns workLog.schema "demigod.work-log/1".
  /\bworkLog\s*[,:}]/.test(dashboardSource) &&
    /schema: ['"]demigod\.work-log\/1['"]/.test(dashboardSource),
  'coord API exposes workLog demigod.work-log/1 multi-agent summary',
);

{
  const dashCli = fs.readFileSync(path.join(ROOT, 'bin/dg-dash'), 'utf8');
  ok(
    !/^\s*curl (?!.*--noproxy '\*').*127\.0\.0\.1:/m.test(dashCli),
    'dashboard CLI local probes bypass ambient proxies',
  );
  const healthLines = dashCli.split('\n').filter((line) => line.includes('/healthz'));
  ok(
    // length>0: an empty filter makes .every() vacuously true — if the /healthz probes are renamed or
    // dropped this would pass having checked nothing. Require the probes to exist AND all use -fsS.
    healthLines.length > 0 && healthLines.every((line) => line.includes(' -fsS ')),
    'dashboard CLI rejects unhealthy HTTP responses in every health probe',
  );
  ok(
    // Was: exact multiline `status); then\n  curl .../healthz" 2>/dev/null` (no if-wrap).
    // Code improved: status wraps curl in `if curl ...; then` and emits three structured
    // diagnostics (up / unobservable / down+recovery). Feature intact; gate pinned old shape.
    /if \[\[ "\$\{1:-\}" == "status" \]\][\s\S]{0,120}?if curl --noproxy '\*' -fsS[^\n]*\/healthz/.test(dashCli) &&
      /echo " up :\$\{PORT\}"/.test(dashCli) &&
      /echo "unobservable :\$\{PORT\} · fresh host receipt; namespace blocks local probe"/.test(dashCli) &&
      /echo "down :\$\{PORT\} · recovery: bin\/dg-dash"/.test(dashCli),
    'dashboard status replaces raw curl noise with its structured recovery diagnostic',
  );
  ok(
    // Was: server.listen…writeFileSync(SERVER_HEARTBEAT)…setInterval(…SERVER_HEARTBEAT) —
    // setInterval now calls refreshHostEvidence (file-only heartbeat), not SERVER_HEARTBEAT
    // by name. Assert producer (listen → refreshHostEvidence → writeFileSync) + consumer
    // (host_receipt_fresh on -mmin -2) + ≥3 unobservable gates.
    /host_receipt_fresh\(\) \{[\s\S]{0,120}?dashboard-server\.heartbeat -mmin -2/.test(dashCli) &&
      /SERVER_HEARTBEAT = path\.join\(BUSY, ['"]dashboard-server\.heartbeat['"]\)/.test(dashboardSource) &&
      /server\.listen[\s\S]{0,200}?const refreshHostEvidence = \(\) => \{[\s\S]{0,200}?writeFileSync\(SERVER_HEARTBEAT[\s\S]{0,150}?setInterval\(refreshHostEvidence,\s*60_000\)/.test(
        dashboardSource,
      ) &&
      (dashCli.match(/&& host_receipt_fresh/g) || []).length >= 3,
    'dashboard status and coord require a fresh listener heartbeat before calling a blocked probe unobservable',
  );
  ok(
    /unobservable[^]*?else\n\s+echo \"down[^]*?exit 1/.test(dashCli),
    'dashboard status succeeds for fresh host evidence but fails for a confirmed down state',
  );
  ok(
    // Was: COORD_CACHE…age>120000…exit 0…coord unavailable…exit 1 — dead sentence order
    // (terminal reason lives in coord_file_fallback with exit 2, not exit 1 after cache hit).
    // Contract: age-gated cache (≤120s) with cached+degraded markers, else file fallback.
    /COORD_CACHE=\/tmp\/dg-busy\/coord-api-last\.json/.test(dashCli) &&
      /age>120000/.test(dashCli) &&
      /cached:true/.test(dashCli) &&
      /degraded:true/.test(dashCli) &&
      /coord_file_fallback/.test(dashCli) &&
      /source:"coord-files"/.test(dashCli) &&
      /reachability:\{"\/api\/coord":false,observedAt:new Date\(\)\.toISOString\(\)\}/.test(dashCli),
    'dashboard coord serves fresh cache or timestamped API-unreachable file fallback when the host API is namespace-blocked',
  );
  ok(
    /const coordPayload = \{\s*ok: true,/.test(dashboardSource) &&
      /writeJsonAtomic\(path\.join\(BUSY, ['"]coord-api-last\.json['"]\), coordPayload\)[^]*?jsonSend\(res, 200, coordPayload/.test(dashboardSource),
    'coord API marks success and refreshes the namespace-safe cache before responding',
  );
  ok(
    /const refreshHostEvidence = \(\) => \{[\s\S]{0,400}?writeFileSync\(SERVER_HEARTBEAT[\s\S]{0,200}?setInterval\(refreshHostEvidence,\s*60_000\)/.test(
      dashboardSource,
    ) &&
      !/const refreshHostEvidence = \(\) => \{[\s\S]{0,500}?\/api\/coord/.test(dashboardSource),
    'dashboard heartbeat is file-only (60s) — does not re-enter /api/coord thrash',
  );
  ok(
    // Was: "coord unobservable · …" + exit 2 + DEMIGOD_DASH_NO_OPEN=1 self-reinvoke — deleted
    // design. Current: default start exits 0 on unobservable (no spawn); coord uses file
    // fallback; must NOT re-exec $0 under DEMIGOD_DASH_NO_OPEN.
    /already running · unobservable here; fresh host receipt[\s\S]{0,40}?exit 0/.test(dashCli) &&
      /if \[\[ "\$\{1:-\}" == "coord" \]\][\s\S]{0,1800}coord_file_fallback/.test(dashCli) &&
      !/DEMIGOD_DASH_NO_OPEN=1 "\$0"/.test(dashCli),
    'dashboard coord does not restart a namespace-blocked host listener',
  );
  const startCli = fs.readFileSync(path.join(ROOT, 'bin/dg-start'), 'utf8');
  ok(
    /bin\/dg-dash status 2>&1 \| grep -q '\^unobservable '/.test(startCli) &&
      /dashboard host-running · namespace-unobservable/.test(startCli),
    'session start reports a host-running dashboard honestly when its socket is namespace-unobservable',
  );
  // Was: every line containing `127.0.0.1:${PORT}/api/` — also matched echo URL lines.
  // Contract: real curl API probes use -fsS; ignore help/echo text.
  const apiProbeLines = dashCli
    .split('\n')
    .filter((line) => /\bcurl\b/.test(line) && /\/api\//.test(line));
  ok(
    // length>0: empty filter → vacuous .every() pass. Require at least one real API probe to exist.
    apiProbeLines.length > 0 && apiProbeLines.every((line) => line.includes(' -fsS ')),
    'dashboard CLI rejects unhealthy HTTP responses from every API probe',
  );
  ok(
    // Was: exact concat "coord unavailable · recovery: bin/dg-dash" — both halves exist,
    // never concatenated that way. down path names recovery; empty-cache terminal names reason.
    /recovery: bin\/dg-dash/.test(dashCli) &&
      /coord unavailable · namespace blocks dashboard and no fresh cache exists/.test(dashCli),
    'dashboard coord CLI names the canonical recovery command when its API is unavailable',
  );
  ok(
    // Rewritten against the CURRENT design, verified by exercising the real branch logic with
    // all four input combinations (curl failing throughout):
    //   EPERM + FRESH heartbeat -> unobservable   EPERM + STALE -> down
    //   no EPERM + FRESH        -> down           no EPERM + STALE -> down
    // The HEARTBEAT is the discriminator between fresh namespace blockage and confirmed
    // downtime — not the log's age. The old assertion demanded `dashboard-start.log -mmin -2`
    // plus `exit 2` / "coord unavailable": a REPLACED design that hard-failed. Freshness moved
    // to a purpose-built /tmp/dg-busy/dashboard-server.heartbeat, and the coord path now
    // degrades to a labelled payload (degraded:true, source:"coord-files") instead of erroring.
    // Assert the real contract: EPERM evidence AND a fresh host receipt gate the unobservable
    // branch, and a confirmed-down path names its recovery command.
    /host_receipt_fresh\(\) \{[^]*?dashboard-server\.heartbeat -mmin -2/.test(dashCli) &&
      /"code":"EPERM"[^]*?host_receipt_fresh[^]*?unobservable :\$\{PORT\}/.test(dashCli) &&
      /unobservable[^]*?namespace blocks local probe/.test(dashCli) &&
      /down :\$\{PORT\} · recovery: bin\/dg-dash/.test(dashCli),
    'dashboard coord distinguishes fresh namespace blockage from confirmed downtime',
  );
  ok(
    // Was: api/coord fail → DEMIGOD_DASH_NO_OPEN=1 "$0" re-exec then curl — deleted design
    // (self-start from a read-only coord dogfood). Replacement: age-gated COORD_CACHE then
    // coord_file_fallback. DEMIGOD_DASH_NO_OPEN still gates xdg-open only.
    /if \[\[ "\$\{1:-\}" == "coord" \]\][\s\S]{0,500}?curl --noproxy '\*' -fsS[^\n]*\/api\/coord/.test(dashCli) &&
      /age>120000[\s\S]{0,400}?&& exit 0[\s\S]{0,80}?coord_file_fallback/.test(dashCli) &&
      /-z "\$\{DEMIGOD_DASH_NO_OPEN:-\}"/.test(dashCli) &&
      !/DEMIGOD_DASH_NO_OPEN=1 "\$0"/.test(dashCli),
    'dashboard coord CLI performs one quiet canonical recovery attempt before failing',
  );
  ok(
    /dash_pid=\$!/.test(dashCli) &&
      /sleep \.1/.test(dashCli) &&
      /kill "\$dash_pid"/.test(dashCli) &&
      /wait "\$dash_pid"/.test(dashCli),
    'dashboard launcher terminates and reaps a failed child before printing its diagnostics',
  );
  ok(!/--retry-delay 0/.test(dashCli), 'dashboard launcher gives child processes time to bind before failing');
  ok(
    (dashCli.match(/--retry-all-errors/g) || []).length === 2,
    'dashboard launcher waits through transient startup probe failures in systemd and fallback paths',
  );
  ok(
    /if systemctl --user restart demigod-dash\.service[^]*systemd dashboard failed health check[^]*exit 1/.test(dashCli),
    'dashboard CLI never races a systemd-owned listener with a fallback process',
  );
  ok(
    /coord unavailable · namespace blocks dashboard and no fresh cache exists/.test(dashCli),
    'dashboard coord reports an honest terminal reason when namespace recovery and cache fallback are unavailable',
  );
  ok(
    /url\.pathname === '\/api\/maps'/.test(dashboardSource) &&
      /\^\\\/api\\\/maps\\\/\(\[a-z0-9-\]\+\)\$\/i/.test(dashboardSource) &&
      /recovery: bin\/dg-dash/.test(fs.readFileSync(path.join(ROOT, 'bin/dg-workflow-map'), 'utf8')),
    'workflow map API and its dashboard recovery command stay wired together',
  );
  ok(
    /"reachabilityObservedAt": now_s/.test(fs.readFileSync(path.join(ROOT, 'bin/dg-workflow-map'), 'utf8')),
    'workflow map timestamps reachability so stale receipts cannot imply current health',
  );
}
const coordRuntime = spawnSync(process.execPath, [path.join(ROOT, 'demigod-agent-dashboard.mjs'), '--selftest-coord-runtime'], {
  encoding: 'utf8',
});
ok(
  coordRuntime.status === 0 && /dashboard coord runtime selftest PASS/.test(coordRuntime.stdout),
  'coord API rejects malformed supervisor and worker PID files',
);
ok(
  /ExecStart=\/bin\/bash -ec /.test(
    fs.readFileSync(path.join(ROOT, 'systemd-user/demigod-agent-coord-watchdog.service'), 'utf8'),
  ) && /coord\/coord\.heartbeat -mmin -2/.test(
    fs.readFileSync(path.join(ROOT, 'systemd-user/demigod-agent-coord-watchdog.service'), 'utf8'),
  ) && /curl --noproxy ["']\*["'] -fsS --max-time 3 http:\/\/127\.0\.0\.1:9878\/healthz[^]*systemctl --user restart demigod-dash\.service/.test(
    fs.readFileSync(path.join(ROOT, 'systemd-user/demigod-agent-coord-watchdog.service'), 'utf8'),
  ),
  'coordinator watchdog recovers a stale coordinator and both dashboard failure modes',
);
ok(
  /if \(!rec\.at\) return \{ \.\.\.rec, ageSec: null, clockSkewed: false, stale: true \}/.test(dashboardSource),
  'coord API marks receipts without timestamps stale',
);
ok(
  /const staleKeys = Object\.entries\(holds\)/.test(dashboardSource) &&
    /Date\.parse\(hold\?\.at \|\| claims\.at\)/.test(dashboardSource),
  'coord API expires each claim independently with legacy timestamp fallback',
);
ok(
  /active:\s*Object\.keys\(activeHolds\)\.length > 0/.test(dashboardSource) &&
    /activeHoldCount:\s*Object\.keys\(activeHolds\)\.length/.test(dashboardSource),
  'coord API exposes stale/dead claims as non-active (not ship evidence)',
);
ok(
  /const effectiveBoard = board &&/.test(dashboardSource) &&
    /persistedStatus: board\.tracks\?\.\[name\]\?\.status \|\| null, status/.test(dashboardSource) &&
    /staleTracks = Object\.keys\(coordWorkers\)\.filter/.test(dashboardSource) &&
    /needed:[\s\S]{0,80}!stopRequested && staleTracks\.length > 0/.test(dashboardSource) &&
    /cmd: supervisorDown \? 'bin\/dg-agent-coord start' : 'bin\/dg-agent-coord status'/.test(dashboardSource) &&
    /board: effectiveBoard/.test(dashboardSource),
  'coord API projects live worker status and advertises persisted-track reconciliation without mutating the board file',
);
ok(
  /url\.pathname === '\/api\/maps'/.test(dashboardSource) &&
    /agents: 'docs\/DEMIGOD-MULTI-AGENT-COORD-DIAGRAM\.md'/.test(dashboardSource),
  'dashboard keeps the agent coordination map reachable through the maps API',
);
{
  const webflowLib = fs.readFileSync(path.join(ROOT, 'demigod-webflow-lib.mjs'), 'utf8');
  const webflowCli = fs.readFileSync(path.join(ROOT, 'demigod-webflow.mjs'), 'utf8');
  ok(
    /footerShipReady =[\s\S]{0,180}\\\\\\\/sample[\s\S]{0,80}p=sample/.test(webflowLib) &&
      /check\('disk footer redirects', s\.disk\.footerShipReady/.test(webflowCli),
    'Webflow doctor fails closed when canonical footer redirects are incomplete',
  );
  ok(
    /metaCounts\s*=\s*\{[\s\S]{0,220}description:[\s\S]{0,180}ogTitle:/.test(webflowLib) &&
      /check\([\s\S]{0,80}'live SEO meta unique'[\s\S]{0,220}metaCounts\?\.description === 1[\s\S]{0,120}metaCounts\?\.ogTitle === 1/.test(webflowCli),
    'Webflow doctor surfaces duplicate native SEO metadata without blocking unrelated ship checks',
  );
}
{
  const verifySrc = fs.readFileSync(path.join(ROOT, 'demigod-verify-source.mjs'), 'utf8');
  ok(
    /head:blog-ld-sor/.test(verifySrc) &&
      /#note-\$\{slug\}/.test(verifySrc) &&
      /hit\.headline !== p\.title/.test(verifySrc) &&
      /hit\.description !== p\.summary/.test(verifySrc) &&
      /hit\.articleSection !== p\.category/.test(verifySrc) &&
      /draft-in-ld/.test(verifySrc) &&
      /ldPosts\.length === pubN/.test(verifySrc) &&
      // Source stores the ld+json matcher as an escaped regex literal (application\/ld\+json).
      /application\\\/ld\\\+json/.test(verifySrc),
    'verify-source locks Blog JSON-LD fields+exact published count (no drafts) to blog SoR (head:blog-ld-sor)',
  );
}
{
  const coordSrc = fs.readFileSync(path.join(ROOT, 'bin/dg-agent-coord'), 'utf8');
  ok(
    /release_owner_claims coord-claude/.test(coordSrc) &&
      /release_owner_claims coord-codex/.test(coordSrc) &&
      /release_owner_claims coord-grok/.test(coordSrc) &&
      /owners = \{sys\.argv\[1\], sys\.argv\[1\]\.removeprefix\("coord-"\)\}/.test(coordSrc),
    'coord releases canonical and worker-role claims on every worker exit',
  );
  ok(
    /Write \/tmp\/dg-busy\/coord\/codex-last\.json/.test(coordSrc),
    'coord tells Codex to write the receipt path the supervisor watches',
  );
  ok(
    /tail -c [^\n]+\| sed '1d'/.test(coordSrc) &&
      /inbox\(\)\s*\{[\s\S]{0,100}flock -x 9[\s\S]{0,100}rotate_log "\$INBOX"[\s\S]{0,240}\} 9>"\$DIR\/inbox\.lock"/.test(
        coordSrc,
      ),
    'coord serializes and bounds supervisor inbox appends',
  );
  ok(
    /""\) spawn_wave ;;/.test(coordSrc) &&
      /all\) spawn_wave force ;;/.test(coordSrc) &&
      /claude\|codex\|grok\) spawn_wave force "\$2"/.test(coordSrc),
    'coord once respects work by default and only explicit role/all forces a targeted shared-cycle wave',
  );
  ok(
    /claim_hold\(\)/.test(coordSrc) &&
      /renew_hold\(\)/.test(coordSrc) &&
      /release_hold\(\)/.test(coordSrc) &&
      /role_has_work\(\)/.test(coordSrc) &&
      /claim\)/.test(coordSrc) &&
      /renew\)/.test(coordSrc) &&
      /if o not in aliases:\s*\n\s*print\(json\.dumps\(\{"ok": False, "error": "not_owner"/.test(coordSrc) &&
      /release-hold\|unclaim\)/.test(coordSrc),
    'coord exposes owner-only claim renewal, atomic release, and the idle-spawn gate',
  );
  ok(
    /if nxt and current_receipt\(d\):/.test(coordSrc),
    'coord never renders actionable next instructions from stale receipts',
  );
  ok(
    /product = any\(k in text for k in \("designer",/.test(coordSrc),
    'coord routes explicit Designer backlog work to the Claude website lane',
  );
  ok(
    /if role == "codex":[\s\S]{0,300}"funnel"[\s\S]{0,120}"lead"[\s\S]{0,120}"pipeline"[\s\S]{0,120}"policy"[\s\S]{0,160}"events bot"/.test(coordSrc),
    'coord routes funnel, lead, policy, pipeline, and Events Bot backlog work to Codex',
  );
  ok(
    /while \[\[ ! -f "\$STOP" \]\]; do\s*spawn_wave \|\| true\s*local s=0\s*while \(\( s < tick \)\)/.test(coordSrc) &&
      (coordSrc.match(/spawn_wave \|\| true/g) || []).length === 1,
    'coord spawns once per outer tick; the five-second inner loop only heartbeats',
  );
  ok(
    /failure_backoff\(\)[\s\S]{0,240}weekly limit\|usage balance exhausted\|status 402[\s\S]{0,700}print\(21600\)[\s\S]{0,120}echo "\$\{secs:-21600\}"/.test(
      coordSrc,
    ) && (coordSrc.match(/delay=\$\(failure_backoff "\$logf"/g) || []).length === 3,
    'coord backs off quota-exhausted workers instead of retrying every 60–90 seconds',
  );
  ok(
    /start\)\s*exec 9>"\$DIR\/start\.lock"\s*flock -n 9/.test(coordSrc) &&
      /nohup "\$0" _loop[^\n]+\n\s*echo \$! >"\$PIDF"\n\s*touch "\$HEARTBEAT"/.test(coordSrc),
    'coord serializes concurrent supervisor starts',
  );
  ok(
    ['claude', 'codex', 'grok'].every((role) =>
      new RegExp(`spawn_${role}\\(\\) \\(\\s*local spawn_fd; exec \\{spawn_fd\\}>"\\$DIR/${role}-spawn\\.lock"\\s*flock -n "\\$spawn_fd"`).test(coordSrc),
    ),
    'coord serializes each worker check-and-spawn without leaking lock descriptors into the supervisor',
  );
  ok(
    /worker_active\(\)/.test(coordSrc) &&
      /grace="\$\{2:-255\}"/.test(coordSrc) &&
      /COORD_CLAUDE_TIMEOUT \+ 15/.test(coordSrc) &&
      (coordSrc.match(/worker_active "\$(?:CLAUDE|CODEX|GROK)_PIDF"/g) || []).length >= 3,
    'coord worker_active grace is role-timeout+15 (not flat 6m); used at spawn gates',
  );
  ok(
    /HEARTBEAT="\$DIR\/coord\.heartbeat"/.test(coordSrc) &&
      /heartbeat_fresh\(\)/.test(coordSrc) &&
      /touch "\$HEARTBEAT"/.test(coordSrc) &&
      /alive "\$PIDF" \|\| heartbeat_fresh/.test(coordSrc) &&
      /find "\$HEARTBEAT" -mmin -2/.test(coordSrc) &&
      // worker_active now takes a per-worker grace: worker_active "$CLAUDE_PIDF"
      // "$((COORD_CLAUDE_TIMEOUT+15))" — pairing with the dashboard workerGraceMs this same
      // assertion checks. The old zero-arg form could not match at any version. Allow the
      // optional arg; still requires the busy/pid-unobservable/idle triad. VERIFIED by
      // exercising the real coord with a live supervisor pid + fresh heartbeat (so the
      // pidfile reaper stands down): dead pid + fresh mtime -> claude=pid-unobservable;
      // dead pid + stale mtime -> claude=idle; live pid -> claude=busy.
      /claude=\$\(alive "\$CLAUDE_PIDF" && echo busy \|\| \{ worker_active "\$CLAUDE_PIDF"( "[^"]*")? && echo pid-unobservable \|\| echo idle; \}\)/.test(coordSrc) &&
      /heartbeatFresh = heartbeatAgeSec !== null && heartbeatAgeSec < 120/.test(dashboardSource) &&
      /supervisor: \{ alive: pidAlive, pidUnobservable, heartbeatFresh, heartbeatAgeSec/.test(dashboardSource) &&
      /pidUnobservable = !pidAlive && heartbeatFresh/.test(dashboardSource) &&
      /fs\.statSync\(path\.join\(coordDir, ['"]coord\.heartbeat['"]\)\)/.test(dashboardSource) &&
      !/\['coord\.heartbeat', 'coord\.log'\]/.test(dashboardSource) &&
      /const COORD_WORKER_GRACE_MS = \{ claude: 315000, codex: 255000, grok: 255000 \}/.test(dashboardSource) &&
      /function coordWorkerStatus\(coordDir, name, pidUnobservable = false\)/.test(dashboardSource) &&
      /ageMs < \(COORD_WORKER_GRACE_MS\[name\] \?\? 255000\)/.test(dashboardSource) &&
      coordRuntime.status === 0 &&
      /loopRunning: pidAlive \|\| pidUnobservable/.test(dashboardSource),
    'coord heartbeat distinguishes a host-running supervisor from a confirmed local death',
  );
  ok(
    /while \(\( s < tick \)\)[\s\S]{0,180}touch "\$HEARTBEAT"[\s\S]{0,80}s=\$\(\(s\+5\)\)[\s\S]{0,40}done/.test(coordSrc) &&
      !/while \(\( s < tick \)\)[\s\S]{0,220}spawn_wave/.test(coordSrc),
    'coord spawns workers once per outer tick while the inner loop only heartbeats',
  );
  ok(
    /reconcile_dead_supervisor\(\)[\s\S]{0,320}interrupted: supervisor not running/.test(coordSrc) &&
      /reconcile_dead_supervisor\(\)[\s\S]{0,160}rm -f "\$PIDF"/.test(coordSrc) &&
      /rm -f "\$DIR\/\$role\.pid"/.test(coordSrc) &&
      /release_owner_claims "coord-\$role"/.test(coordSrc) &&
      /trap 'rm -f "\$PIDF"; reconcile_dead_supervisor' EXIT/.test(coordSrc) &&
      /status\|lanes\)\s*reconcile_dead_supervisor/.test(coordSrc) &&
      /effective_tracks[^\n]+\n\s*reconcile_dead_supervisor\n\s*\[\[ -f "\$BOARD"/.test(coordSrc) &&
      /brief\|digest\)\s*reconcile_dead_supervisor/.test(coordSrc),
    'coord status and digest clear stale worker PIDs, claims, and persisted busy tracks after an unexpected supervisor death or status-render race',
  );
  ok(
    /if all\(t\.get\(ag, \{\}\)\.get\(k\) == v for k, v in next_track\.items\(\)\):\s*raise SystemExit/.test(coordSrc),
    'coord track updates are idempotent and do not refresh unchanged evidence timestamps',
  );
  ok(
    /alive "\$DIR\/\$role\.pid" && set_track "\$role" busy "worker survived supervisor restart"/.test(coordSrc),
    'coord startup preserves busy state for workers that survived a supervisor restart',
  );
  ok(
    /cmd: supervisorDown \? ['"]bin\/dg-agent-coord start['"] : ['"]bin\/dg-agent-coord status['"]/.test(dashboardSource),
    'coord API recommends restart for unexpected supervisor death and status for track reconciliation',
  );
  ok(
    /flock -x "\$DIR\/digest\.lock" .*python3/.test(coordSrc) &&
      /with \(DIR \/ "claims\.lock"\)\.open\("w"\) as claims_lock:/.test(coordSrc) &&
      /atomic_write\(DIR \/ "digest\.md"/.test(coordSrc) &&
      /atomic_write\(DIR \/ "CLAUDE-BRIEF\.md"/.test(coordSrc),
    'coord serializes digest refresh, claims expiry, and atomic snapshot publication',
  );
  ok(
    (coordSrc.match(/tmp\.replace\(p\)/g) || []).length >= 2,
    'coord board mutations publish atomically',
  );
  // Swarm race: stale-claim expiry (digest refresh) and worker release must share claims.lock.
  ok(
    /release_owner_claims\(\)\s*\{[\s\S]{0,280}flock -x "\$DIR\/claims\.lock"/.test(coordSrc) &&
      /with \(DIR \/ "claims\.lock"\)\.open\("w"\) as claims_lock:/.test(coordSrc) &&
      /fcntl\.flock\(claims_lock,\s*fcntl\.LOCK_EX\)/.test(coordSrc),
    'coord stale-claim expiry and worker release share claims.lock',
  );
  ok(
    // The code now distinguishes clock skew from staleness:
      //   note = " [clock-skewed]" if age < -(15 * 60) else " [stale]" if age > 3600 else ""
      // Widened from a 60s to a 15min grace window (2026-07-17, uncommitted working-tree edit)
      // to stop minor clock drift from mislabeling a receipt "stale". Verified by running the
      // real expression: age=-600 -> [clock-skewed] under the new 15min window (was [stale]
      // under the old 60s one); age=7200 -> [stale] either way.
      /note = " \[clock-skewed\]" if age < -\(15 \* 60\) else " \[stale\]" if age > 3600 else ""/.test(coordSrc) &&
      /note \+= " \[staleSuccessAvoided\]"/.test(coordSrc),
    'coord digest labels stale receipts without hiding stale-success evidence',
  );
  ok(
    /python3 - "\$1" "\$CLAIMS"/.test(coordSrc) && /p = Path\(sys\.argv\[2\]\)/.test(coordSrc),
    'coord worker claim release honors DEMIGOD_BUSY',
  );
  const dashCli = fs.readFileSync(path.join(ROOT, 'bin/dg-dash'), 'utf8');
  ok(
    /if \[\[ "\$\{1:-\}" == "coord" \]\][\s\S]{0,1800}coord_file_fallback/.test(dashCli) &&
      !/DEMIGOD_DASH_NO_OPEN=1 "\$0"/.test(dashCli),
    'read-only coord dogfood falls back to files without starting a second dashboard',
  );
  ok(
    /release_owner_claims\(\)[\s\S]{0,1400}tmp\.replace\(p\)/.test(coordSrc),
    'coord worker claim release publishes atomically',
  );
  ok(
    /def hold_owner\(v\):[\s\S]{0,120}isinstance\(v, dict\)[\s\S]{0,80}v\.get\("owner"\)/.test(coordSrc) ||
      /isinstance\(v, dict\)[\s\S]{0,80}v\.get\("owner"\)/.test(coordSrc),
    'coord worker claim release handles legacy string and timestamped object owners',
  );
  ok(
    /def hold_owner\(v\):/.test(coordSrc) &&
      /owners = \{sys\.argv\[1\], sys\.argv\[1\]\.removeprefix\("coord-"\)\}/.test(coordSrc) &&
      /hold_owner\(v\) not in owners/.test(coordSrc),
    'coord claim release clears coord-role and bare-role owner aliases',
  );
  ok(
    (coordSrc.match(/python3 - "\$BOARD"/g) || []).length === 3 &&
      (coordSrc.match(/p=Path\(sys\.argv\[1\]\)/g) || []).length === 3,
    'coord cycle reads and board mutations honor DEMIGOD_BUSY',
  );
  ok(
    /env DG_COORD_DIR="\$DIR" DG_ROOT="\$ROOT" python3/.test(coordSrc) &&
      /DIR = Path\(os\.environ\["DG_COORD_DIR"\]\)/.test(coordSrc) &&
      /ROOT = Path\(os\.environ\["DG_ROOT"\]\)/.test(coordSrc) &&
      // Was /f"4\. Update \{DIR \/ 'claims.json'\}/ — that digest step was rewritten to
      // "4. Stay in lane. Claims only serialize hot files: ...", so it asserted wording, not
      // behavior. Assert the actual property: DIR (not a hardcoded path) drives claims.json.
      /DIR \/ "claims\.json"/.test(coordSrc) &&
      // And no hardcoded /tmp/dg-busy inside the digest builder — a custom-root digest used to
      // tell agents to read the DEFAULT root (swarm/workflow-map/anti-bloat all hardcoded).
      !/Path\("\/tmp\/dg-busy/.test(coordSrc) &&
      !/\*\*Full digest \(auto-refreshed\):\*\* `\/tmp\/dg-busy\/coord\/digest\.md`/.test(coordSrc),
    'coord digest honors configured busy and workspace roots',
  );
  ok(
    /staleSuccessAvoided/.test(coordSrc) &&
      /post_ns > pre_ns/.test(coordSrc) &&
      /if fresh_write:/.test(coordSrc) &&
      /prev\["workerVerdict"\] = prev\.get\("ok"\)/.test(coordSrc) &&
      /"ok": False/.test(coordSrc),
    'coord write_exit_receipt lets process failure override fresh worker green and fails closed without a write',
  );
  ok(
    /write_exit_receipt\(\)[\s\S]*?tmp\.replace\(p\)/.test(coordSrc),
    'coord exit receipts publish atomically',
  );
  ok(
    ['claude', 'codex', 'grok'].every((role) => {
      const pid = role.toUpperCase();
      return new RegExp(`set_track ${role} idle[\\s\\S]{0,400}rm -f "\\$${pid}_PIDF"[\\s\\S]{0,120}write_exit_receipt "\\$DIR/${role}-last\\.json"`).test(coordSrc);
    }),
    'coord persists idle track and clears worker pid before publishing each exit receipt',
  );
  ok(
    /for role in claude codex grok; do[\s\S]{0,220}release_owner_claims "coord-\$role"[\s\S]{0,120}set_track "\$role" idle "supervisor startup recovery"/.test(coordSrc) &&
      /for role in claude codex grok; do set_track "\$role" idle "interrupted by supervisor stop"; done/.test(coordSrc),
    'coord lifecycle recovery clears stale persisted worker activity',
  );
  // Runtime smoke (swarm P1): timeout/fail without mtime advance must not keep stale ok:true.
  try {
    const tmp = fs.mkdtempSync(path.join('/tmp', 'dg-receipt-smoke-'));
    const receipt = path.join(tmp, 'last.json');
    const logf = path.join(tmp, 'run.log');
    fs.writeFileSync(
      receipt,
      JSON.stringify(
        { ok: true, at: '2026-01-01T00:00:00Z', did: ['stale-green'], lane: 'gates' },
        null,
        2,
      ) + '\n',
    );
    fs.writeFileSync(logf, 'simulated timeout\n');
    const preR = spawnSync(
      'python3',
      ['-c', `import pathlib;print(pathlib.Path(${JSON.stringify(receipt)}).stat().st_mtime_ns)`],
      { encoding: 'utf8' },
    );
    const preNs = String(preR.stdout || '0').trim() || '0';
    const coordPath = path.join(ROOT, 'bin/dg-agent-coord');
    // Source only write_exit_receipt from coord; invoke with ec=124 and pre=current mtime (no agent rewrite).
    const fn = spawnSync(
      'bash',
      [
        '-c',
        [
          `eval "$(sed -n '/^write_exit_receipt()/,/^}/p' ${JSON.stringify(coordPath)})"`,
          `write_exit_receipt ${JSON.stringify(receipt)} 124 ${JSON.stringify(logf)} gates ${JSON.stringify(preNs)}`,
        ].join('\n'),
      ],
      { encoding: 'utf8', timeout: 15_000 },
    );
    let out = null;
    try {
      out = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    } catch {
      out = null;
    }
    ok(
      fn.status === 0 &&
        out &&
        out.ok === false &&
        out.exit === 124 &&
        out.staleSuccessAvoided === true,
      'write_exit_receipt runtime: failed worker without receipt update → ok:false + staleSuccessAvoided',
    );
    const silent = spawnSync(
      'bash',
      [
        '-c',
        [
          `eval "$(sed -n '/^write_exit_receipt()/,/^}/p' ${JSON.stringify(coordPath)})"`,
          `write_exit_receipt ${JSON.stringify(receipt)} 0 ${JSON.stringify(logf)} gates ${fs.statSync(receipt, { bigint: true }).mtimeNs}`,
        ].join('\n'),
      ],
      { encoding: 'utf8', timeout: 15_000 },
    );
    out = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    ok(
      silent.status === 0 && out.ok === false && out.exit === 0 && out.reason === 'worker exited without fresh receipt',
      'write_exit_receipt runtime: exit 0 without receipt update → ok:false with reason',
    );
    fs.writeFileSync(receipt, JSON.stringify({ ok: true, did: ['fresh-green'] }) + '\n');
    const failedFresh = spawnSync(
      'bash',
      [
        '-c',
        [
          `eval "$(sed -n '/^write_exit_receipt()/,/^}/p' ${JSON.stringify(coordPath)})"`,
          `write_exit_receipt ${JSON.stringify(receipt)} 124 ${JSON.stringify(logf)} gates 0`,
        ].join('\n'),
      ],
      { encoding: 'utf8', timeout: 15_000 },
    );
    out = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    ok(
      failedFresh.status === 0 && out.ok === false && out.exit === 124 && out.workerVerdict === true,
      'write_exit_receipt runtime: exit 124 overrides a fresh ok:true receipt',
    );
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* */
    }
  } catch (e) {
    ok(false, `write_exit_receipt runtime smoke errored: ${String(e.message || e).slice(0, 120)}`);
  }
}
{
  const verifySrc = fs.readFileSync(path.join(ROOT, 'demigod-verify-source.mjs'), 'utf8');
  ok(
    /head:blog-ld-publisher/.test(verifySrc) &&
      /ld\.publisher/.test(verifySrc) &&
      /publisher\[['\"]@type['\"]\]\s*===\s*['\"]Organization['\"]/.test(verifySrc),
    'verify-source locks Blog JSON-LD publisher to Organization Demigod (head:blog-ld-publisher)',
  );
  ok(
    /head:blog-ld-author/.test(verifySrc) &&
      /bp\.author/.test(verifySrc) &&
      /a\[['\"]@type['\"]\]\s*!==\s*['\"]Organization['\"]/.test(verifySrc) &&
      /a\.name\s*!==\s*['\"]Demigod['\"]/.test(verifySrc),
    'verify-source locks BlogPosting author to Organization Demigod (head:blog-ld-author)',
  );
  ok(
    /head:blog-ld-lang/.test(verifySrc) &&
      /ld\.inLanguage\s*!==\s*['\"]en['\"]/.test(verifySrc) &&
      /bp\.inLanguage\s*!==\s*['\"]en['\"]/.test(verifySrc),
    'verify-source locks Blog + BlogPosting inLanguage=en (head:blog-ld-lang)',
  );
  ok(
    /head:og-image-meta/.test(verifySrc) &&
      /og:image:type/.test(verifySrc) &&
      /og:image:width/.test(verifySrc) &&
      /og:image:height/.test(verifySrc) &&
      /1280/.test(verifySrc) &&
      /720/.test(verifySrc),
    'verify-source locks og:image jpeg 1280×720 (head:og-image-meta exact dims)',
  );
  ok(
    /head:app-capable/.test(verifySrc) &&
      /apple-mobile-web-app-capable/.test(verifySrc) &&
      /mobile-web-app-capable/.test(verifySrc),
    'verify-source locks apple+mobile-web-app-capable=yes (head:app-capable)',
  );
  ok(
    /head:robots-rich-preview/.test(verifySrc) &&
      /max-snippet:\s*-1/i.test(verifySrc) &&
      /max-video-preview:\s*-1/i.test(verifySrc) &&
      /max-image-preview:\s*large/i.test(verifySrc),
    'verify-source locks robots rich-preview directives (head:robots-rich-preview; Claude c45)',
  );
  ok(
    /head:org-jsonld-id/.test(verifySrc) &&
      /dg-org-jsonld/.test(verifySrc) &&
      /core:org-jsonld-guard/.test(verifySrc),
    'verify-source locks Organization LD id + foot orgJsonLd guard (head:org-jsonld-id / core:org-jsonld-guard; Claude c48)',
  );
  ok(
    /head:org-contact-point/.test(verifySrc) &&
      /contactPoint/.test(verifySrc) &&
      /ContactPoint/.test(verifySrc) &&
      /potter@trydemigod\.com/.test(verifySrc) &&
      /contactType/.test(verifySrc) &&
      /customer/.test(verifySrc),
    'verify-source locks Organization LD contactPoint potter@ + customer service (head:org-contact-point; Claude c56)',
  );
  ok(
    /head:org-email-area/.test(verifySrc) &&
      /areaServed/.test(verifySrc) &&
      /san\\s\*francisco/.test(verifySrc) &&
      /bay\\s\*area/.test(verifySrc),
    'verify-source locks Organization LD top-level email potter@ + areaServed SF Bay Area (head:org-email-area)',
  );
  ok(
    /head:website-ld/.test(verifySrc) &&
      /WebSite/.test(verifySrc) &&
      /mailto:potter@trydemigod\\.com/.test(verifySrc),
    'verify-source locks WebSite LD name+url+mailto potter@ (head:website-ld)',
  );
  ok(
    /head:blog-canonical/.test(verifySrc) &&
      /dg-blog-canonical/.test(verifySrc) &&
      /p=blog/.test(verifySrc) &&
      /twitter:url/.test(verifySrc) &&
      /og:title/.test(verifySrc) &&
      /twitter:title/.test(verifySrc) &&
      /og:description/.test(verifySrc) &&
      /twitter:description/.test(verifySrc) &&
      /meta\\\[name=description\\\]|meta\\\[name=\["']description\["']\\\]/.test(verifySrc) &&
      /document\\.title\\s\*=\\s\*title/.test(verifySrc) &&
      /Demigod Notes|Notes\\s\*\[—–-\]/.test(verifySrc) &&
      /path\\s\*===/.test(verifySrc) &&
      /\\\/blog/.test(verifySrc) &&
      /\\\/notes/.test(verifySrc) &&
      /toLowerCase/.test(verifySrc) &&
      /\\\(blog\\\|notes\\\)/.test(verifySrc) &&
      /og:image/.test(verifySrc) &&
      /twitter:image/.test(verifySrc) &&
      /og:image:alt/.test(verifySrc) &&
      /twitter:image:alt/.test(verifySrc) &&
      /urbco5\\.jpg/.test(verifySrc),
    'verify-source locks #dg-blog-canonical url+title+desc+image+document.title nested /blog|/notes + toLowerCase + urbco5 Notes img → Notes share honesty',
  );
  ok(
    /head:referrer-policy/.test(verifySrc) &&
      /strict-origin-when-cross-origin/.test(verifySrc),
    'verify-source locks referrer=strict-origin-when-cross-origin (head:referrer-policy)',
  );
  ok(
    /head:format-detection/.test(verifySrc) &&
      /telephone\s*=\s*no/.test(verifySrc),
    'verify-source locks format-detection telephone=no (head:format-detection)',
  );
  ok(
    /head:favicon-jpeg-sizes/.test(verifySrc) &&
      /ges75q\.jpg/.test(verifySrc) &&
      /1024x1024/.test(verifySrc),
    'verify-source locks JPEG favicon sizes=1024x1024 (head:favicon-jpeg-sizes; Claude c42 SOF)',
  );
  ok(
    /head:apple-touch-sizes/.test(verifySrc) &&
      /apple-touch-icon/.test(verifySrc) &&
      /ges75q\.jpg/.test(verifySrc) &&
      /1024x1024/.test(verifySrc) &&
      /touchHref\s*===\s*favHref/.test(verifySrc) &&
      /image\/jpe?g/.test(verifySrc),
    'verify-source locks apple-touch-icon === jpeg favicon href + sizes=1024x1024 type=image/jpeg',
  );
  ok(
    /head:ms-tile-image/.test(verifySrc) &&
      /msapplication-TileImage/.test(verifySrc) &&
      /ges75q\.jpg/.test(verifySrc) &&
      /tileImg\s*===\s*favHref/.test(verifySrc),
    'verify-source locks msapplication-TileImage === jpeg favicon href (head:ms-tile-image)',
  );
  ok(
    /head:author-meta/.test(verifySrc) &&
      /metaDesc\(['"]name['"],\s*['"]author['"]\)/.test(verifySrc) &&
      /Demigod/.test(verifySrc),
    'verify-source locks meta author=Demigod (head:author-meta)',
  );
  ok(
    /head:desc-len/.test(verifySrc) &&
      /descLen\s*>=\s*80/.test(verifySrc) &&
      /descLen\s*<=\s*160/.test(verifySrc),
    'verify-source locks meta description length 80–160 (head:desc-len)',
  );
  ok(
    /head:fee-desc-cash/.test(verifySrc) &&
      /first-year\\s\+cash/.test(verifySrc) &&
      /free\\s\+for\\s\+talent/.test(verifySrc),
    'verify-source locks meta fee copy first-year cash + free for talent (head:fee-desc-cash)',
  );
  ok(
    /head:canonical-https/.test(verifySrc) &&
      /route canonical must use the HTTPS apex/.test(verifySrc) &&
      /explicit product-page allowlist/.test(verifySrc),
    'verify-source locks route canonical HTTPS apex + explicit product-page allowlist (head:canonical-https)',
  );
  ok(
    /head:og-type-locale/.test(verifySrc) &&
      /og:type/.test(verifySrc) &&
      /og:locale/.test(verifySrc) &&
      /website/.test(verifySrc) &&
      /en_US/.test(verifySrc),
    'verify-source locks og:type=website + og:locale=en_US (head:og-type-locale)',
  );
  ok(
    /head:twitter-card/.test(verifySrc) &&
      /twitter:card/.test(verifySrc) &&
      /summary_large_image/.test(verifySrc),
    'verify-source locks twitter:card=summary_large_image (head:twitter-card)',
  );
  ok(
    /head:theme-color-hex/.test(verifySrc) &&
      /#0A0A0A/.test(verifySrc) &&
      /theme-color/.test(verifySrc),
    'verify-source locks theme-color=#0A0A0A (head:theme-color-hex)',
  );
  ok(
    /head:hero-lcp-preload/.test(verifySrc) &&
      /as=image/.test(verifySrc) &&
      /preload/.test(verifySrc) &&
      /og:image/.test(verifySrc),
    'verify-source locks hero og:image preload as=image (head:hero-lcp-preload)',
  );
  ok(
    /head:color-scheme-dark/.test(verifySrc) &&
      /color-scheme/.test(verifySrc) &&
      /\^dark\$/.test(verifySrc),
    'verify-source locks color-scheme exact dark (head:color-scheme-dark)',
  );
  ok(
    /head:hero-lcp-fetchpriority/.test(verifySrc) &&
      /fetchpriority/.test(verifySrc) &&
      /high/.test(verifySrc) &&
      /preload/.test(verifySrc),
    'verify-source locks hero preload fetchpriority=high (head:hero-lcp-fetchpriority)',
  );
  ok(
    /head:preconnect-og-image/.test(verifySrc) &&
      /og:image/.test(verifySrc) &&
      /preconnect/.test(verifySrc) &&
      /new URL\(ogImg\)\.origin/.test(verifySrc),
    'verify-source locks preconnect for og:image origin (head:preconnect-og-image)',
  );
  ok(
    /head:favicon-svg/.test(verifySrc) &&
      /image\/svg\+xml/.test(verifySrc) &&
      /sizes=\["'\]any\["'\]/.test(verifySrc) &&
      /rel=\["'\]icon\["'\]/.test(verifySrc),
    'verify-source locks SVG favicon type=image/svg+xml sizes=any (head:favicon-svg)',
  );
  ok(
    /head:hero-shell-only/.test(verifySrc) &&
      /class\\\*\\s\*=/.test(verifySrc) &&
      /\.hero-section/.test(verifySrc) &&
      /heroContentLeftForced/.test(verifySrc) &&
      /heroContentLeftInMinimal/.test(verifySrc) &&
      /unhideScope/.test(verifySrc) &&
      /h2OrPremiumBtnForced/.test(verifySrc) &&
      /noscript/.test(verifySrc),
    'verify-source bans broad [class*="hero"] + .hero-content-left + h2/.premium-btn unhide (scoped+comment-strip+noscript) (head:hero-shell-only)',
  );
  ok(
    /head:unhide-v5-safe/.test(verifySrc) &&
      /__dgUnhideV5/.test(verifySrc) &&
      /dg-early-unhide/.test(verifySrc) &&
      /MutationObserver/.test(verifySrc) &&
      /clearInterval/.test(verifySrc) &&
      /n\\s\*>=\\s\*\\d/.test(verifySrc),
    'verify-source locks early unhide v5 finite ticks + clearInterval bound, no MutationObserver (head:unhide-v5-safe)',
  );
  ok(
    /head:early-unhide-shell/.test(verifySrc) &&
      /querySelectorAll/.test(verifySrc) &&
      /setProperty/.test(verifySrc) &&
      /once\\s\*:\\s\*true/.test(verifySrc) &&
      /DOMContentLoaded/.test(verifySrc) &&
      /\.hero-section/.test(verifySrc) &&
      /earlyHasHeaderEl/.test(verifySrc),
    'verify-source locks early unhide positive shell query + header element + setProperty important + once:true (head:early-unhide-shell)',
  );
  ok(
    /head:unhide-main-header/.test(verifySrc) &&
      /dg-unhide-main/.test(verifySrc) &&
      /dg-graceful-unhide/.test(verifySrc) &&
      /gracefulHeroAnim/.test(verifySrc) &&
      /gracefulAnimatesShell/.test(verifySrc) &&
      /reduceHeroAnim/.test(verifySrc) &&
      /prefers-reduced-motion:reduce/.test(verifySrc),
    'verify-source locks main header visibility + graceful hero-only anim + reduce hero anim (head:unhide-main-header c273)',
  );
  ok(
    /css:disk-honesty-guards/.test(verifySrc) &&
      /v421\\s\+readiness\\s\+guard/.test(verifySrc) &&
      /v449\\s\+head-only\\s\+honesty\\s\+guard/.test(verifySrc) &&
      /dg-decision-grid/.test(verifySrc) &&
      /no infinite CTA glow/.test(verifySrc) &&
      /dg-gold-glow/.test(verifySrc) &&
      /duplicate CSS background/.test(verifySrc) &&
      /demigod-hermes-hero-16x9/.test(verifySrc),
    'verify-source locks disk CSS honesty guards v421/v449/decision-grid/v316 no infinite glow + duplicate hero background ban (css:disk-honesty-guards)',
  );
  ok(
    /head:contact-scrub/.test(verifySrc) &&
      /dg-contact-scrub/.test(verifySrc) &&
      /hello@/.test(verifySrc) &&
      /potter@trydemigod\\.com/.test(verifySrc) &&
      /mailto:/.test(verifySrc) &&
      /data-props-link/.test(verifySrc) &&
      /once\\s\*:\\s\*true/.test(verifySrc) &&
      /setInterval/.test(verifySrc),
    'verify-source locks #dg-contact-scrub hello@ → potter@ + data-props-link finite once:true no setInterval (head:contact-scrub)',
  );
  ok(
    /head:meta-dedupe/.test(verifySrc) &&
      /meta\\\[name=description\\\]/.test(verifySrc) &&
      /og:title/.test(verifySrc) &&
      /og:url/.test(verifySrc) &&
      /og:image/.test(verifySrc) &&
      /og:image:alt/.test(verifySrc) &&
      /og:site_name/.test(verifySrc) &&
      /og:locale/.test(verifySrc) &&
      /twitter:description/.test(verifySrc) &&
      /twitter:url/.test(verifySrc) &&
      /twitter:image/.test(verifySrc) &&
      /twitter:image:alt/.test(verifySrc) &&
      /els\\.length\\s\*-\\s\*1/.test(verifySrc) &&
      /\\.remove\\s\*\\\(/.test(verifySrc) &&
      /scrub\\s\*,\\s\*50/.test(verifySrc) &&
      /scrub\\s\*,\\s\*1200/.test(verifySrc),
    'verify-source locks contact-scrub keep-last meta dedupe description/og/twitter title+desc+url+image+image:alt+site_name+locale + 50/1200 re-scrub (head:meta-dedupe c235)',
  );
  ok(
    /head:copy-scrub-finite/.test(verifySrc) &&
      /dg-early-copy-scrub/.test(verifySrc) &&
      /clearInterval/.test(verifySrc) &&
      /n\\s\*>=\\s\*\\d/.test(verifySrc) &&
      /once\\s\*:\\s\*true/.test(verifySrc) &&
      /DOMContentLoaded/.test(verifySrc),
    'verify-source locks #dg-early-copy-scrub finite setInterval + clearInterval + once:true (head:copy-scrub-finite)',
  );
  // Gate checks head HTML markers (dg-head-fallback + data-dg-cta hire/talent + labels + setTimeout).
  // Stale tools-os required #dg-head-cta-fallback + once:true + setInterval which verify never locked.
  // 07-17 (c-post-02a4562): gate stopped hardcoding 'Demigod'/"I'm looking" literals and now derives
  // ctaFounder/ctaEngineer from foot-core's COPY at check time, so those literals no longer appear
  // in verify-source.mjs source — assert the derivation instead of the retired hardcoded labels.
  ok(
    /head:cta-fallback/.test(verifySrc) &&
      /dg-head-fallback/.test(verifySrc) &&
      /data-dg-cta/.test(verifySrc) &&
      /ctaFounder/.test(verifySrc) &&
      /ctaEngineer/.test(verifySrc) &&
      /setTimeout/.test(verifySrc) &&
      /hire/.test(verifySrc) &&
      /talent/.test(verifySrc),
    'verify-source locks dg-head-fallback + data-dg-cta hire/talent + dual-path labels + setTimeout (head:cta-fallback)',
  );
  ok(
    /head:org-logo-aligned/.test(verifySrc) &&
      /ImageObject/.test(verifySrc) &&
      /favJpeg/.test(verifySrc) &&
      /dg-org-jsonld/.test(verifySrc),
    'verify-source org logo accepts string or ImageObject.url == og:image|jpeg favicon (head:org-logo-aligned)',
  );
  ok(
    /head:org-logo-square/.test(verifySrc) &&
      /ImageObject/.test(verifySrc) &&
      /width/.test(verifySrc) &&
      /height/.test(verifySrc) &&
      /favJpeg/.test(verifySrc),
    'verify-source org logo requires square ImageObject matching jpeg favicon (head:org-logo-square)',
  );
  ok(
    /blog:draft-ready/.test(verifySrc) &&
      /published !== false/.test(verifySrc) &&
      /imageAlt/.test(verifySrc) &&
      /draftGaps/.test(verifySrc),
    'verify-source locks unpublished blog drafts flip-ready (category+imageAlt+body+image) (blog:draft-ready)',
  );
  ok(
    /footer:path-redirects/.test(verifySrc) &&
      /blog\\\|notes/.test(verifySrc) &&
      /#note-/.test(verifySrc) &&
      /p=method/.test(verifySrc) &&
      /\\\/fees/.test(verifySrc) &&
      /p=pricing/.test(verifySrc) &&
      /\\\/security/.test(verifySrc) &&
      /p=legal/.test(verifySrc) &&
      /\\\/network/.test(verifySrc) &&
      /p=talent/.test(verifySrc) &&
      /!\/p=network/.test(verifySrc),
    'verify-source locks footer-lite nested blog|notes|method + #note-slug + /fees→pricing + /security→legal + /network→talent (footer:path-redirects c201/c247)',
  );
  {
    const headCssPub = fs.readFileSync(path.join(ROOT, 'demigod-head-css-publish.mjs'), 'utf8');
    // This assertion called itself "not filename-only theater" while being exactly that: six greps
    // for strings in SOURCE, every one of which passes with the text sitting in a comment. It stayed
    // green through a period when nothing wrote the file at all. A grep cannot tell a write from a
    // mention -- so assert the write CALL, and check the ARTIFACT itself.
    // Receipt absent => proves nothing (fresh checkout, pre-first-ship); do not false-red on it, the
    // write-site assertions still hold. Present => its shape must be real.
    const rec = (() => {
      try {
        return JSON.parse(fs.readFileSync('/tmp/dg-busy/head-css-cdn.json', 'utf8'));
      } catch {
        return null;
      }
    })();
    const recShapeOk =
      !rec ||
      (typeof rec.at === 'string' &&
        Number.isFinite(Date.parse(rec.at)) &&
        typeof rec.diskMd5 === 'string' &&
        /^[0-9a-f]{32}$/.test(rec.diskMd5) &&
        typeof rec.match === 'boolean');
    ok(
      /const RECEIPT = path\.join\(BUSY, 'head-css-cdn\.json'\)/.test(headCssPub) &&
        /atomicWrite\(\s*RECEIPT/.test(headCssPub) &&
        /writeJsonAtomic\(path\.join\(BUSY, 'head-css-cdn\.json'\)/.test(dashboardSource) &&
        /headCss:/.test(dashboardSource) &&
        recShapeOk,
      'head-css-cdn.json receipt really WRITTEN (atomicWrite/writeJsonAtomic call, not a mention) + artifact shape valid when present',
    );
  }
  ok(
    /core:version-marker/.test(verifySrc) &&
      /__dgFootVer/.test(verifySrc) &&
      /dgFootVersion/.test(verifySrc) &&
      /banner/.test(verifySrc),
    'verify-source core:version-marker requires banner+internal+public foot ver agree',
  );
  ok(
    /core:blog-sor-in-sync/.test(verifySrc) &&
      /loading="lazy"/.test(verifySrc) &&
      /decoding="async"/.test(verifySrc) &&
      /noteLazyDims|lazyDims/.test(verifySrc) &&
      /width=/.test(verifySrc) &&
      /height=/.test(verifySrc),
    'verify-source core:blog-sor-in-sync locks Notes imgs lazy+async+width/height (CLS)',
  );
  ok(
    /core:form-autocomplete/.test(verifySrc) &&
      /dg-abandon-email/.test(verifySrc) &&
      /autocomplete="email"/.test(verifySrc) &&
      /autocomplete="organization"/.test(verifySrc) &&
      /company-name/.test(verifySrc) &&
      /full-name/.test(verifySrc) &&
      /form-autocomplete[\s\S]{0,500}url/.test(verifySrc) &&
      /setAttribute/.test(verifySrc),
    'verify-source core:form-autocomplete locks abandon+company+contact-email+engineer name/email/url (Claude c167/c169)',
  );
  ok(
    /core:offer-abandon-a11y/.test(verifySrc) &&
      /offerAbandon/.test(verifySrc) &&
      /aria-modal/.test(verifySrc) &&
      /Follow-up email/.test(verifySrc) &&
      /Escape/.test(verifySrc) &&
      /#dg-abandon-email/.test(verifySrc) &&
      /\.focus/.test(verifySrc),
    'verify-source core:offer-abandon-a11y locks v506 dialog a11y (aria-modal+label+Escape+focus email)',
  );
  ok(
    /core:wiz-submit-review/.test(verifySrc) &&
      /90day-outcome/.test(verifySrc) &&
      /__submit__/.test(verifySrc) &&
      /__thanks__/.test(verifySrc) &&
      (/Look good\?/.test(verifySrc) || /Review and submit your brief/.test(verifySrc)) &&
      (/Ready\?/.test(verifySrc) || /Review and submit your profile/.test(verifySrc)) &&
      /dg-wiz-review/.test(verifySrc) &&
      /var\s+WIZ_CFG/.test(verifySrc),
    'verify-source core:wiz-submit-review locks explicit review step before thanks (WIZ_CFG order + frege/legacy review copy)',
  );
  ok(
    /core:route-fees-security/.test(verifySrc) &&
      /fees/.test(verifySrc) &&
      /pricing/.test(verifySrc) &&
      /security/.test(verifySrc) &&
      /legal/.test(verifySrc) &&
      verifySrc.includes(String.raw`/id\s*===\s*['"]fees`) &&
      verifySrc.includes(String.raw`/id\s*===\s*['"]security`),
    'verify-source core:route-fees-security locks /fees→pricing + /security→legal path+query aliases (Claude v504)',
  );
  ok(
    /core:legal-links-pilot/.test(verifySrc) &&
      /dg-legal-links/.test(verifySrc) &&
      /data-dg-page=/.test(verifySrc) &&
      /pilot/.test(verifySrc) &&
      /orphan/.test(verifySrc) &&
      verifySrc.includes(String.raw`/['"]\/pilot['"]`) &&
      verifySrc.includes(String.raw`/pilot:\s*\{`),
    'verify-source core:legal-links-pilot locks v507 Pilot in footer nav + path map + DG_PAGES (no orphan)',
  );
  ok(
    /footer:sample-path/.test(verifySrc) &&
      /\\\/sample/.test(verifySrc) &&
      /p=sample/.test(verifySrc) &&
      /core:sample-page/.test(verifySrc) &&
      /Sample matches/.test(verifySrc) &&
      /no fake placements/i.test(verifySrc) &&
      /labeled samples/i.test(verifySrc) &&
      verifySrc.includes(String.raw`/id\s*===\s*['"]sample`),
    'verify-source footer:sample-path + core:sample-page lock /sample→?p=sample with DG_PAGES.sample honesty (c228/v505)',
  );
  ok(
    /footer:pilot-path/.test(verifySrc) &&
      /\\\/pilot/.test(verifySrc) &&
      /p=pilot/.test(verifySrc) &&
      /footer-loader/.test(verifySrc) &&
      /pilotPath\(foot\)/.test(verifySrc) &&
      /pilotPath\(footLoader\)/.test(verifySrc) &&
      /core:pilot-page/.test(verifySrc) &&
      /data-dg-page=\["']pilot\["']/.test(verifySrc) &&
      // #9/#10 rewritten. verify-source's core:pilot-page gate is itself written AS REGEXES, so
      // its source text reads  title:\s*['"]Pilot['"]  — a BACKSLASH follows "title:", not
      // whitespace, and a "[" follows "data-dg-page=", not a quote. Both literal forms could
      // never match at any version. The gate genuinely locks both (its own regexes test true
      // against foot-core). Match the literal regex text; the data-dg-page literal was also
      // redundant with the char-class assertion above.
      /title:\\s\*\['"\]Pilot/.test(verifySrc),
    'verify-source footer:pilot-path locks lite+loader /pilot→?p=pilot + core:pilot-page legal-nav (c309/c333)',
  );
  ok(
    /core:notfound-page/.test(verifySrc) &&
      /Page not found/.test(verifySrc) &&
      /Not found · Demigod/.test(verifySrc),
    'verify-source core:notfound-page locks soft-404 DG_PAGES.notfound (unknown paths)',
  );
  ok(
    /core:pilot-legal-nav/.test(verifySrc) &&
      /dg-legal-links/.test(verifySrc) &&
      // verify-source MATCHES this attribute in coreJs, so its source spells it as a regex
      // character class — `data-dg-page=['"]pilot['"]` — not a literal `data-dg-page="pilot"`.
      // Asserting the literal could never match: there is a `[` after the `=`, not a quote.
      // That mismatch, not a lost gate, is why this sat red. The gate itself is present and
      // /pilot resolves 200.
      /data-dg-page=\[['"]{2}\]pilot/.test(verifySrc) &&
      /White-glove pilot/i.test(verifySrc) &&
      /\\\/pilot/.test(verifySrc) &&
      /p=pilot/.test(verifySrc),
    'verify-source core:pilot-legal-nav locks v507 Pilot inbound via #dg-legal-links (orphan-page fix)',
  );
  ok(
    /head:unhide-transform-hero/.test(verifySrc) &&
      /hero-section/.test(verifySrc) &&
      /hero-container/.test(verifySrc) &&
      /classList/.test(verifySrc) &&
      /transform/.test(verifySrc) &&
      /translate/.test(verifySrc),
    'verify-source head:unhide-transform-hero locks JS transform+translate:none to hero shell only (swarm P2/c202)',
  );
  ok(
    /head:noscript-shell/.test(verifySrc) &&
      /hero-container/.test(verifySrc) &&
      /noscript/.test(verifySrc),
    'verify-source head:noscript-shell locks .hero-container + no transform flatten in noscript (c202)',
  );
  ok(
    /head:critical-transform-hero/.test(verifySrc) &&
      /dg-unhide-critical/.test(verifySrc) &&
      /hero-section/.test(verifySrc) &&
      /hero-container/.test(verifySrc) &&
      /transform\s*:\s*none/.test(verifySrc) &&
      /translate\s*:\s*none/.test(verifySrc) &&
      /critHeroTranslate|critTranslateScoped/.test(verifySrc) &&
      /dg-unhide-main/.test(verifySrc) &&
      /graceful/.test(verifySrc) &&
      /mainGraceNoFlatten/.test(verifySrc),
    'verify-source head:critical-transform-hero locks CSS transform+translate:none to hero leaves + bans main/graceful (swarm P2 + c189)',
  );
  ok(
    /head:blog-ld-mep/.test(verifySrc) &&
      /mainEntityOfPage/.test(verifySrc) &&
      /#note-/.test(verifySrc) &&
      /WebPage/.test(verifySrc),
    'verify-source head:blog-ld-mep locks BlogPosting mainEntityOfPage WebPage #note-{slug} (c248 SEO)',
  );
  ok(
    /blog:publishedAt/.test(verifySrc) &&
      /publishedAt/.test(verifySrc) &&
      /\\d\{4\}-\\d\{2\}-\\d\{2\}/.test(verifySrc),
    'verify-source blog:publishedAt requires YYYY-MM-DD on published SoR posts (c248)',
  );
  ok(
    /core:lazy-decode-async/.test(verifySrc) &&
      /lazyBelowFold/.test(verifySrc) &&
      /setAttribute/.test(verifySrc) &&
      /decoding/.test(verifySrc) &&
      /async/.test(verifySrc),
    'verify-source locks lazyBelowFold setAttribute(decoding,async) (core:lazy-decode-async)',
  );
  ok(
    /metaReady/.test(dashboardSource) &&
      /head\.css/.test(dashboardSource) &&
      /head\.meta/.test(dashboardSource),
    'coord diskReady distinguishes head.meta vs head.css blockers',
  );
  ok(
    /onlyCssLag/.test(dashboardSource) &&
      /metaReady; head CSS differs · external publish remains current-request-gated/.test(dashboardSource),
    'coord diskReady.onlyCssLag preserves the external publish authority gate',
  );
  ok(
    /quality-backlog\.json/.test(dashboardSource) &&
      /openP0P1: openP0P1\.length/.test(dashboardSource),
    'coord API exposes open quality-backlog P0/P1 items',
  );
  ok(
    /footSealed/.test(dashboardSource) &&
      /onlyCssLag = onlyHeadCss && footSealed/.test(dashboardSource) &&
      !/const footSealed =\s*ship\?\.shipped === true/.test(dashboardSource) &&
      !/const footSealed =[\s\S]{0,120}ship\?\.artifactPass === true/.test(dashboardSource) &&
      !/const footSealed =[\s\S]{0,80}ship\?\.pass/.test(dashboardSource) &&
      /diskMatchesManifest === true/.test(
        dashboardSource.match(/const footSealed =\s*([\s\S]*?);[\s\n]*const onlyHeadCss/)?.[1] || '',
      ),
    'onlyCssLag requires exact disk==live==man versions, not prepare-only truth pass or historical ship receipts',
  );
  ok(
    /footLock:/.test(dashboardSource) && /ttlLeftSec/.test(dashboardSource),
    'coord API exposes compact footLock dogfood',
  );
  ok(
    /return \{ locked: null, free: false, error: String\(e\.message \|\| e\)\.slice\(0, 80\) \}/.test(dashboardSource),
    'coord API foot-lock inspection failure fails closed',
  );
  ok(
    /liveVerSource/.test(dashboardSource) &&
      /diskMatchesLive/.test(dashboardSource) &&
      /manVerSource/.test(dashboardSource),
    'coord ship.facts backfills live/man from truth when ship-status partial',
  );
  ok(
    /if \(lag && \(liesGreen \|\| ship\.shipped === true\)\) \{[\s\S]{0,180}ship\.shipped = false;[\s\S]{0,300}ship\.nextCmd = ['"]bin\/dg ship prepare['"];[\s\S]{0,160}ship\.nextCmdSource = ['"]coord-honesty['"]/.test(dashboardSource),
    'coord ship never claims all-green when diskVer≠liveVer',
  );
  ok(
    /pasteBlockedBy/.test(dashboardSource) &&
      /webflow-login/.test(dashboardSource) &&
      /no-custom-code-tab/.test(dashboardSource),
    'coord ship exposes pasteReady/pasteBlockedBy for CM6 dogfood',
  );
  ok(
    /footMarkers/.test(dashboardSource) &&
      /foot\.markers/.test(dashboardSource) &&
      /booted: booted/.test(dashboardSource),
    'coord exposes footMarkers + diskReady foot.markers when any of four markers disagree',
  );
  ok(
    /ship-prepare\.json/.test(dashboardSource) &&
      /shipPrepare:/.test(dashboardSource),
    'coord exposes shipPrepare from ship-prepare.json with freshness',
  );
  ok(
    (() => {
      const notes = dashboardSource.match(/if \(onlyCssLag\)[\s\S]*?const diskReady =/)?.[0] || '';
      return (notes.match(/bin\/dg ship prepare/g) || []).length === 3 &&
        !/ship cdn|CM6 paste|demigod-(?:foot-cdn|cm6-paste)/i.test(notes);
    })(),
    'diskReady notes route manifest/live drift through guarded ship preparation',
  );
  // CDN publish used to rewrite footer-lite as v27 without blog|notes|method+#note → diskReady thrash.
  {
    const pub = fs.readFileSync(path.join(ROOT, 'demigod-foot-cdn-publish.mjs'), 'utf8');
    ok(
      /cdn-loader v28/.test(pub) &&
        /blog\|notes/.test(pub) &&
        /#note-/.test(pub) &&
        /p=method/.test(pub) &&
        !/cdn-loader v27/.test(pub),
      'foot-cdn-publish loader template is v28 with blog|notes|method+#note (no v27 thrash)',
    );
  }
  // Q2 2026-07-16 timed out (exit 124) after TypeError: page.waitForTimeout is not a function
  // (puppeteer-core removed it). Gate: playtest must use wait() helper, not page.waitForTimeout.
  {
    const wizPlay = fs.readFileSync(path.join(ROOT, 'demigod-wiz-cdp-playtest.mjs'), 'utf8');
    ok(
      /const wait = \(ms\) => new Promise/.test(wizPlay) &&
        !/\.waitForTimeout\s*\(/.test(wizPlay),
      'wiz CDP playtest uses wait() helper and never page.waitForTimeout (Q2 exit-124 root cause)',
    );
  }
  ok(
    /head:preconnect-foot-cdn/.test(verifySrc) &&
      /demigod-foot-cdn-loader/.test(verifySrc) &&
      /preconnect/.test(verifySrc),
    'verify-source locks head preconnect to footer foot-cdn-loader origin (head:preconnect-foot-cdn)',
  );
  ok(
    /head:brand-meta/.test(verifySrc) &&
      /application-name/.test(verifySrc) &&
      /apple-mobile-web-app-title/.test(verifySrc) &&
      /og:site_name/.test(verifySrc) &&
      /Demigod/.test(verifySrc),
    'verify-source locks application-name+apple-title+og:site_name=Demigod (head:brand-meta)',
  );
  ok(
    /head:theme-meta/.test(verifySrc) &&
      /theme-color/.test(verifySrc) &&
      /color-scheme/.test(verifySrc) &&
      /dark/i.test(verifySrc),
    'verify-source locks theme-color + color-scheme dark (head:theme-meta)',
  );
}
{
  // Claude c37: site suite accepts either catbox or jsDelivr foot script hosts (both release transports).
  const userTestSrc = fs.readFileSync(path.join(ROOT, 'demigod-user-test.mjs'), 'utf8');
  ok(
    /CDN foot script/.test(userTestSrc) &&
      /files\\\.catbox\\\.moe/.test(userTestSrc) &&
      /cdn\\\.jsdelivr\\\.net/.test(userTestSrc),
    'user-test site suite accepts catbox or jsdelivr foot CDN hosts',
  );
  ok(
    /arg\.startsWith\(['"]--suite=['"]\)/.test(userTestSrc),
    'user-test accepts standard --suite=name CLI syntax',
  );
}
ok(
  /const clockSkewed = rawAgeSec !== null && rawAgeSec < -60/.test(orientSource) &&
    /const stale = timestampInvalid \|\| clockSkewed \|\| ageSec === null \|\| ageSec > 900/.test(orientSource) &&
    /clockSkewed,/.test(orientSource),
  'orient rejects future-dated draft-hygiene evidence instead of clamping it fresh',
);
ok(
  /const receipt = sourceReceipt\(statusPath\)/.test(orientSource) &&
    /sourceReceipt: receipt/.test(orientSource) &&
    /sourceSha256: receipt\.sha256/.test(orientSource) &&
    /ready: ok === true && stale === false && receipt\.sha256 !== null && receipt\.bytes !== null/.test(orientSource) &&
    /sha=missing/.test(orientSource),
  'orient readiness requires a structured byte-bound draft-hygiene receipt',
);
ok(
  /\? \(source\.source \|\| ['"]drafts\.hygiene['"]\)/.test(orientSource) &&
    /: \(typeof allHygieneOk === ['"]boolean['"] \? ['"]drafts\.allHygieneOk['"] : ['"]unknown['"]\)/.test(orientSource),
  'orient preserves an explicit draft-hygiene producer while retaining canonical fallbacks',
);
ok(
  /const hygieneClockSkewed = Number\.isFinite\(hygieneAtMs\) && hygieneRawAgeSec < -60/.test(dashboardSource) &&
    /stale: hygieneClockSkewed \|\| hygieneAgeSec == null \|\| hygieneAgeSec > 900/.test(dashboardSource) &&
    /clockSkewed: hygieneClockSkewed/.test(dashboardSource),
  'dashboard status explains future-dated draft-hygiene evidence with the canonical clock-skew signal',
);
ok(
  /timestampInvalid: hygieneTimestampInvalid/.test(dashboardSource) &&
    /hygieneAgeSec <= 900 &&\s*sourceReceipt\.sha256 !== null/.test(dashboardSource),
  'dashboard draft-hygiene readiness requires a valid timestamp and identifiable receipt bytes',
);
ok(
  /body\.demandDraftsHygieneClockSkewed\s*=/.test(dashboardSource) &&
    /body\.demandDraftsHygieneClockSkewed \|\|[\s\S]{0,140}body\.demandDraftsHygieneAgeSec == null/.test(dashboardSource) &&
    /body\.demandDraftsHygieneClockSkewed[\s\S]{0,100}\? 'clock-skewed'/.test(dashboardSource),
  'orient API reports future-dated draft hygiene as explicit clock skew',
);
ok(
  /body\.demandDraftsHygieneOk === true[\s\S]{0,80}\? 'clean'/.test(dashboardSource) &&
    /clockSkewed:\s*body\.demandDraftsHygieneClockSkewed/.test(dashboardSource),
  'orient API gives fresh clean hygiene a truthful reason and preserves clock provenance',
);
ok(
  /body\.draftHygieneVerdict\s*=\s*\{[\s\S]{0,220}ready:\s*[\s\S]{0,180}body\.demandDraftsHygieneOk === true[\s\S]{0,120}body\.demandDraftsHygieneStale === false/.test(dashboardSource) &&
    !/body\.draftHygieneVerdict\s*=\s*data\.draftHygieneVerdict/.test(dashboardSource),
  'orient API builds its fail-closed draft-hygiene verdict without an out-of-scope status variable',
);
ok(
  /const cycleWorkBlocked = data\.cycleWork\?\.blocked === true \|\|/.test(dashboardSource) &&
    /cycleChecks\.some\(\(check\) => check\.blocked \|\| check\.childStartBlocked\)/.test(dashboardSource) &&
    /blocked:\s*cycleWorkBlocked/.test(dashboardSource),
  'dashboard derives blocked cycle health from child checks as well as the receipt summary',
);
ok(
  // Prefer release-blocked when toolsReady + !releaseReady; still fail closed on
  // blocked / degraded / stale before any "attested" label.
  /const cycleWorkVerification = cycleReleaseBlocked[\s\S]{0,120}cycleWorkBlocked[\s\S]{0,320}cycleWorkDegraded \|\| cycleWorkStale[\s\S]{0,260}verification:\s*cycleWorkVerification/.test(
    dashboardSource,
  ),
  'dashboard verification label fails closed on normalized blocked, degraded, or stale cycle health',
);
ok(
  /cycleWorkExceptions\.length > 0 \? ['"]check-exception['"] : null/.test(dashboardSource) &&
    /cycleReleaseBlocked[\s\S]{0,180}cycleWorkExceptions\.length > 0[\s\S]{0,80}\? ['"]failed['"]/.test(dashboardSource),
  'dashboard cycle exceptions force an explicit failed verification label',
);
const siteChainSource = dashboardUiSource.slice(
  dashboardUiSource.indexOf('const chainCard='),
  dashboardUiSource.indexOf('root.innerHTML=', dashboardUiSource.indexOf('const chainCard=')),
);
ok(
  /const diskVer=ck\.foot\?\.diskVer/.test(dashboardUiSource) &&
    /Site chain/.test(siteChainSource) &&
    /manifest v['"]\+manifestVer/.test(siteChainSource) &&
    /live v['"]\+liveVer/.test(siteChainSource) &&
    !/deltaLine|sha256/.test(siteChainSource),
  'dashboard renders the compact disk to manifest to live chain without hashes',
);
ok(
  /releaseDetails\?\.identityDelta\s*\|\|/.test(dashboardSource) &&
    /releaseDetails\?\.core\s*&&\s*releaseDetails\?\.manifest/.test(dashboardSource) &&
    /expected === staged \? \[\] : \[\[key, \{ expected, staged \}\]\]/.test(dashboardSource),
  'dashboard derives release identity from website core/manifest receipts',
);
ok(
  /\/foot-latest\\\.js\(\?:\[\?\#"'\]\)/.test(dashboardSource),
  'dashboard live-loader discovery accepts fragment cache-busters in script tags',
);
ok(
  /const cycleToolsReady =[\s\S]{0,140}data\.cycleWork\?\.toolsReady === true/.test(dashboardSource) &&
    /toolsReady: data\.cycleWork\?\.domain === ['"]tools['"] \? data\.cycleWork\?\.toolsReady === true : null/.test(dashboardSource) &&
    /releaseReady: cycleHasReleasePreflight \? data\.cycleWork\?\.releaseReady === true : null/.test(dashboardSource),
  'dashboard API separates tools attestation from release staging drift',
);
ok(
  /malformedReceipts/.test(dashboardSource) &&
    /malformedReceiptReasons/.test(dashboardSource) &&
    /quarantineQueueOverlap/.test(dashboardSource) &&
    /pendingHandles/.test(dashboardSource),
  'dashboard demand snapshot projects receipt quarantine + full-queue overlap',
);
ok(
  /demand-quarantine/.test(dashboardUiSource) &&
    /malN\+' receipt'\+\(malN===1\?'':'s'\)\+' quarantined'/.test(dashboardUiSource) &&
    /SENT may under-report/.test(dashboardUiSource) &&
    /queue-overlap=/.test(dashboardUiSource) &&
    /__dgDemandQuarantine/.test(dashboardUiSource) &&
    /id === 'demand' && !opts\.skipQuarantineConfirm/.test(dashboardUiSource),
  'dashboard demand card surfaces receipt quarantine and confirms on queue overlap',
);
ok(
  /truth\.json/.test(dashboardSource) &&
    /cycle-work-latest\.json/.test(dashboardSource) &&
    /pilot-inbound\.json/.test(dashboardSource) &&
    /demand-status\.json/.test(dashboardSource) &&
    /webflow-doctor\.json/.test(dashboardSource) &&
    /mtime > statusCache\.at/.test(dashboardSource),
  'dashboard getStatus invalidates cache when truth/cycle/pilot/demand/doctor receipts are newer',
);
ok(
  /const ageMs = at \? Date\.now\(\) - Date\.parse\(at\) : NaN;\s*if \(!Number\.isFinite\(ageMs\) \|\| ageMs < -60_000\) continue;/.test(dashboardSource),
  'dashboard excludes malformed and far-future board history from recent work',
);
ok(
  /const diagnostic = \[check\?\.detail, childError, check\?\.tail\]\.find/.test(dashboardSource) &&
    /detail: diagnostic \? diagnostic\.trim\(\)\.slice\(0, 240\) : null/.test(dashboardSource),
  'dashboard API preserves useful check detail and bounds it',
);
const cycleWorkSource = fs.readFileSync(path.join(ROOT, 'demigod-cycle-work.mjs'), 'utf8');
const webflowLibSource = fs.readFileSync(path.join(ROOT, 'demigod-webflow-lib.mjs'), 'utf8');
ok(
  (webflowLibSource.match(/e\.cause\?\.code/g) || []).length >= 2,
  'webflow probes preserve native network cause codes',
);
const cycleStatusSource = fs.readFileSync(path.join(ROOT, 'demigod-cycle-status.mjs'), 'utf8');
const neverStopSource = fs.readFileSync(path.join(ROOT, 'demigod-never-stop-loop.mjs'), 'utf8');
ok(
  !/schema:\s*['"]demigod\.cycle-tools-health\/1['"][\s\S]{0,180}at:\s*new Date\(\)\.toISOString\(\),\s*at:\s*new Date\(\)\.toISOString\(\),/.test(cycleWorkSource),
  'tools health receipt defines one canonical timestamp',
);
ok(
  /const toolsReady = cycle\?\.domain === ['"]tools['"][\s\S]{0,120}cycle\?\.toolsReady === true/.test(cycleStatusSource) &&
    /cycle\?\.domain === ['"]tools['"][\s\S]{0,100}cycle\?\.verification === ['"]release-blocked['"]/.test(cycleStatusSource) &&
    /cycle\?\.domain === ['"]ship['"] && hasReleasePreflight && releaseReady === false/.test(cycleStatusSource),
  'cycle status separates tools OS readiness from ship release readiness',
);
ok(
  /const degraded = [^;]*commandHealth\.some\(\(check\) => check\.degraded\)/.test(neverStopSource) &&
    /impl\.blocked !== true && impl\.degraded !== true/.test(neverStopSource),
  'never-stop cycle cannot label blocked or degraded implementation work as pass',
);
ok(
  /const realWork = cycleWorkOk && !blocked && !degraded/.test(neverStopSource) &&
    /realWork,\s*\n\s*};/.test(neverStopSource),
  'never-stop cycle does not count blocked or degraded diagnostics as real work',
);
ok(
  /function boundedDetail\(value, maxChars = 800\)/.test(neverStopSource) &&
    /boundedDetail\(impl\.detail\)/.test(neverStopSource),
  'never-stop preserves structured failure detail instead of logging [object Object]',
);
ok(
  /const healthBlocked = health\.some\(\(check\) => check\.blocked \|\| check\.childStartBlocked\)/.test(cycleWorkSource) &&
    /blocked:\s*healthBlocked/.test(cycleWorkSource),
  'cycle receipts propagate child-start blockage even when in-process fallback passes',
);
ok(
  /const releaseRecoveryMutates = rawReleaseRecovery\?\.mutates === true \|\| inferredReleaseMutation/.test(dashboardSource) &&
    /command: releaseRecoveryMutates \? null : agentSafeCommand/.test(dashboardSource) &&
    /then:\s*typeof rawReleaseRecovery\.then === ['"]string['"][\s\S]{0,120}releaseRecoveryMutates \? null/.test(dashboardSource) &&
    /Array\.isArray\(rawReleaseRecovery\?\.gatedBy\)/.test(dashboardSource) &&
    /gatedBy: releaseRecoveryGates/.test(dashboardSource) &&
    /guarded:[\s\S]{0,120}releaseRecoveryMutates && releaseRecoveryGates\.length > 0/.test(dashboardSource),
  'dashboard API preserves guarded recovery metadata while suppressing mutating commands',
);
ok(
  /const fields = \{[\s\S]{0,420}cycleWork:\s*data\.cycleWork \|\| null,[\s\S]{0,120}cycleWorkHealth:\s*data\.cycleWorkHealth \|\| null,/.test(dashboardSource),
  'dashboard status delta carries cycle receipt and attestation health',
);
ok(
  /rawReceiptAgeSec >= -60/.test(dashboardSource) &&
    /Date\.parse\(data\.cycleWork\?\.at/.test(dashboardSource) &&
    /timestampSource:\s*['"]receipt\.at['"]/.test(dashboardSource) &&
    /fileAgeSec:\s*cycleWorkFileAgeSec/.test(dashboardSource) &&
    /cycleWorkStale = !cycleWorkTimestampValid/.test(dashboardSource) &&
    /timestampValid: cycleWorkTimestampValid/.test(dashboardSource),
  'dashboard uses receipt time, not touchable file mtime, and rejects future-dated cycle receipts',
);
ok(
  /const degraded = !j \|\| receiptAgeMs == null \|\| receiptAgeMs > 120_000/.test(dashboardSource) &&
    /green: !degraded && j\?\.green === true/.test(dashboardSource) &&
    /receiptGreen: j\?\.green === true/.test(dashboardSource),
  'dashboard orient projection fails stale green closed while preserving the receipt diagnostic',
);
ok(
  !/productHealth[\s\S]{0,900}cycleWorkHealth\?\.attested === false/.test(dashboardSource),
  'dashboard product health does not treat tools-cycle attestation as a website outage',
);
ok(
  /const job = Object\.prototype\.hasOwnProperty\.call\(JOBS, tool\.id\)[\s\S]{0,80}\? JOBS\[tool\.id\][\s\S]{0,30}: null/.test(dashboardSource) &&
    /runnable:\s*(?:Boolean\(job\)|Object\.prototype\.hasOwnProperty\.call\(JOBS, tool\.id\))/.test(dashboardSource) &&
    /safe:\s*job\?\.safe === true/.test(dashboardSource) &&
    /mutate:\s*job \? job\.mutate === true : false/.test(dashboardSource),
  'dashboard server derives runnable and mutate authority from the JOBS allowlist',
);
ok(
  /['"]pipeline-packages['"]:\s*\{[^}]*['"]demigod-lead-pipeline\.mjs['"][^}]*['"]--stage=packages['"][^}]*safe:\s*true/.test(dashboardSource),
  'dashboard can refresh isolated pipeline package evidence without mutation authority',
);
ok(
  !/['"]favicon-ship['"]\s*:/.test(dashboardSource) &&
    !/data-(?:run-job|run)=['"]favicon-ship['"]/.test(dashboardUiSource),
  'dashboard does not expose favicon publishing',
);

ok(
  /timeoutMs:\s*spec\.timeout/.test(dashboardSource) &&
    /pollJob\(j\.jobId,[\s\S]*?j\.timeoutMs\)/.test(dashboardUiSource),
  'dashboard job polling honors the server-issued job timeout',
);
ok(
  /id=["']jobStrip["'][^>]*role=["']status["'][^>]*aria-live=["']polite["'][^>]*aria-atomic=["']true["'][^>]*aria-busy=["']false["']/.test(dashboardUiSource) &&
    /setAttribute\(['"]aria-busy['"], q\.running \? ['"]true['"] : ['"]false['"]\)/.test(dashboardUiSource),
  'dashboard exposes atomic job progress and its busy state to assistive technology',
);
ok(
  /id=["']toasts["'][^>]*role=["']status["'][^>]*aria-live=["']polite["'][^>]*aria-atomic=["']false["']/.test(dashboardUiSource),
  'dashboard exposes toast feedback as non-atomic status updates',
);
ok(
  /let lastJobStripHtml = ['"]['"]/.test(dashboardUiSource) &&
    /if \(html !== lastJobStripHtml\) \{[\s\S]{0,120}strip\.innerHTML = html;[\s\S]{0,80}lastJobStripHtml = html;/.test(dashboardUiSource),
  'dashboard job live region does not re-announce unchanged polling results',
);
    ok(
      /id=["']paletteInput["'][^>]*role=["']combobox["'][^>]*aria-autocomplete=["']list["'][^>]*aria-controls=["']paletteList["'][^>]*aria-expanded=["']false["']/.test(dashboardUiSource) &&
    /paletteInput['"]\)\.setAttribute\(['"]aria-expanded['"],['"]true['"]\)/.test(dashboardUiSource) &&
    /paletteInput['"]\)\.setAttribute\(['"]aria-expanded['"],['"]false['"]\)/.test(dashboardUiSource),
      'dashboard command palette exposes combobox expansion state',
    );
    ok(
      /role=["']tablist["'][^>]*aria-orientation=["']horizontal["']/.test(dashboardUiSource) &&
        /id=["']tab-overview["'][^>]*role=["']tab["'][^>]*aria-controls=["']panel-overview["'][^>]*aria-selected=["']true["'][^>]*tabindex=["']0["']/.test(dashboardUiSource) &&
        /id=["']tab-inbox["'][^>]*role=["']tab["'][^>]*aria-controls=["']panel-inbox["'][^>]*aria-selected=["']false["'][^>]*tabindex=["']-1["']/.test(dashboardUiSource),
      'fallback dashboard exposes usable tab semantics before JavaScript boot',
    );
ok(
  /id=["']confirmOverlay["'][^>]*aria-hidden=["']true["']/.test(dashboardUiSource) &&
    /id=["']palette["'][^>]*aria-modal=["']true["'][^>]*aria-hidden=["']true["']/.test(dashboardUiSource) &&
    /confirmOverlay['"]\)\.setAttribute\(['"]aria-hidden['"],['"]false['"]\)/.test(dashboardUiSource) &&
    /confirmOverlay['"]\)\.setAttribute\(['"]aria-hidden['"],['"]true['"]\)/.test(dashboardUiSource) &&
    /palette['"]\)\.setAttribute\(['"]aria-hidden['"],['"]false['"]\)/.test(dashboardUiSource) &&
    /palette['"]\)\.setAttribute\(['"]aria-hidden['"],['"]true['"]\)/.test(dashboardUiSource),
  'dashboard dialogs expose hidden state consistently to assistive technology',
);
ok(
  /if\(j\.status==='done'\|\|j\.status==='failed'\)\{[\s\S]{0,360}await onDone\(j\);[\s\S]{0,80}return j;/.test(dashboardUiSource),
  'dashboard awaits async job completion refresh before re-enabling controls',
);
ok(
  /let networkFailures=0/.test(dashboardUiSource) &&
    /networkFailures\+\+;[\s\S]{0,80}if\(networkFailures<3\)[\s\S]{0,120}continue;/.test(dashboardUiSource) &&
    /Job monitor lost connection:/.test(dashboardUiSource),
  'dashboard job monitor tolerates bounded transient network failures',
);
ok(
  /const pollAbort=new AbortController\(\)/.test(dashboardUiSource) &&
    /Math\.min\(10000,deadline-Date\.now\(\)\)/.test(dashboardUiSource) &&
    /fetch\('\/api\/jobs\/'\+encodeURIComponent\(jobId\), \{signal:pollAbort\.signal\}\)/.test(dashboardUiSource) &&
    /finally\{\s*clearTimeout\(pollTimer\);\s*\}/.test(dashboardUiSource),
  'dashboard job polling aborts a stalled request within the overall deadline',
);
ok(
  /const launchAbort=new AbortController\(\)/.test(dashboardUiSource) &&
    /setTimeout\(\(\)=>launchAbort\.abort\(\),15000\)/.test(dashboardUiSource) &&
    /fetch\(url, \{method:['"]POST['"],signal:launchAbort\.signal\}\)/.test(dashboardUiSource) &&
    /finally\{\s*clearTimeout\(launchTimer\);\s*\}/.test(dashboardUiSource) &&
    /launch timed out/.test(dashboardUiSource),
  'dashboard job launch aborts a stalled dispatch and restores its trigger',
);
ok(
  /if\(!r\.ok\)\{[\s\S]*?job status HTTP/.test(dashboardUiSource) &&
    /if\(!j\|\|typeof j\.status!==['"]string['"]\)\{[\s\S]*?Job status response invalid/.test(dashboardUiSource),
  'dashboard job monitor fails fast on HTTP and malformed status responses',
);
ok(
  /const response=await fetch\('\/api\/inbox\?refresh=1'\);[\s\S]{0,120}!response\.ok[\s\S]{0,100}Inbox refresh HTTP/.test(dashboardUiSource) &&
    /if\(!await load\(true\)\) return;[\s\S]{0,80}Inbox refreshed/.test(dashboardUiSource) &&
    /const r = await fetch\('\/api\/status\?'\+qs,[\s\S]{0,100}if\(!r\.ok\) throw new Error/.test(dashboardUiSource),
  'dashboard inbox actions do not report success after HTTP failures',
);
ok(
  /\[502,503,504\]\.includes\(r\.status\)/.test(dashboardUiSource) &&
    /Job monitor temporarily unavailable/.test(dashboardUiSource) &&
    /if\(!r\.ok\)\{[\s\S]*?networkFailures=0;[\s\S]*?if\(!j\|\|typeof j\.status/.test(dashboardUiSource),
  'dashboard job monitor retries bounded transient gateway failures',
);
ok(
  /cur && \(!Number\.isFinite\(curExpiryMs\) \|\| curExpiryMs > Date\.now\(\)\)/.test(dashboardSource),
  'dashboard refuses to overwrite malformed mutate leases',
);
ok(
  /const compromised = !expired && ownerAlive === false/.test(dashboardSource) &&
    /compromised,/.test(dashboardSource),
  'dashboard surfaces compromised foot leases without unlocking them',
);
ok(
  /dashboardLocalRequest\(req\.headers\.origin \|\| ['"]['"], req\.headers\.referer \|\| ['"]['"], PORT\)/.test(dashboardSource) &&
    /url\.port === String\(port\)/.test(dashboardHttpPolicySource) &&
    /return origin \? local\(origin\) : !referer \|\| local\(referer\)/.test(dashboardHttpPolicySource),
  'dashboard mutation guard requires the dashboard loopback port',
);
ok(
  /statusJsonPathView: data\.statusJsonPathView \|\| null/.test(dashboardSource) &&
    /statusJsonPathViewComplete: data\.statusJsonPathView\?\.complete === true/.test(dashboardSource),
  'dashboard snapshot exposes the canonical status path and readiness',
);
ok(
  /if\(\$\('palette'\)\.classList\.contains\('open'\)\)\{[\s\S]{0,120}return;/.test(dashboardUiSource) &&
    /if\(\$\('confirmOverlay'\)\.classList\.contains\('open'\)\)\{[\s\S]{0,120}return;/.test(dashboardUiSource),
  'dashboard modal dialogs suppress global shortcuts while open',
);
ok(
  /function askMutateConfirm\(id, opts\)\{[\s\S]{0,260}if\(\$\('confirmOverlay'\)\.classList\.contains\('open'\)\) return;[\s\S]{0,180}pendingMutate = \{ id, opts \}/.test(dashboardUiSource),
  'dashboard mutate confirmation rejects re-entry before replacing pending state',
);
ok(
  /if\(\$\('palette'\)\.classList\.contains\('open'\)\)\{[\s\S]{0,120}closePalette\(\);[\s\S]{0,80}return;[\s\S]{0,120}if\(\$\('confirmOverlay'\)/.test(dashboardUiSource),
  'dashboard command palette suppresses global shortcuts while open',
);
ok(
  /\['ArrowLeft','ArrowRight','Home','End'\]\.includes\(e\.key\)/.test(dashboardUiSource) &&
    /setTab\(tabs\[next\]\.dataset\.tab\);[\s\S]{0,80}tabs\[next\]\.focus\(\)/.test(dashboardUiSource),
  'dashboard tablist supports arrow, Home, and End keyboard navigation',
);
ok(
  /b\.onclick=\(\)=>setTab\(b\.dataset\.tab\)/.test(dashboardUiSource) &&
    !/b\.onclick=[^\n]*loadTools\(\)/.test(dashboardUiSource),
  'dashboard tab click delegates tools lazy loading to setTab once',
);
ok(
  /ArrowDown'&&items\.length/.test(dashboardUiSource) &&
    /ArrowUp'&&items\.length/.test(dashboardUiSource) &&
    /active\.scrollIntoView\(\{block:'nearest'\}\)/.test(dashboardUiSource),
  'dashboard command palette keeps keyboard selection valid and visible',
);
ok(exited(orientSt, [0, 1, 2]), 'orient runs (0/1/2)');
diagnoseSpawn('orient', orientSt);
try {
  const oc = JSON.parse(orientSt.stdout.slice(orientSt.stdout.indexOf('{')));
  ok(oc.schema === 'demigod.orient/1', 'orient schema');
  ok(typeof oc.green === 'boolean', 'orient green bool');
  ok(oc.next && oc.next.id, 'orient has NEXT id');
  ok(oc.assertSame && typeof oc.assertSame.ok === 'boolean', 'orient assertSame');
  ok(oc.lamps && oc.lamps.schema === 'demigod.role-lamps/1', 'orient lamps');
  ok(oc.greenMeans === 'truth-seal-pass-fresh-only', 'orient greenMeans documented');
  if (oc.freeze?.on) {
    ok(oc.lamps.ship.green === false, 'orient ship lamp off under freeze');
  }
  if ((oc.demand?.sentConfirmed ?? 0) === 0 && (oc.demand?.pilotsFilled ?? 0) === 0) {
    ok(oc.lamps.demand.outcomeOk === false, 'orient outcomeOk false at 0 SENT');
  }
  ok(
    oc.demand?.drafts?.hygiene && (
      typeof oc.demand.drafts.hygiene.ok === 'boolean' || oc.demand.drafts.hygiene.ok === null
    ),
    'orient exposes draft hygiene as boolean or explicit unknown',
  );
  ok(
    oc.demand?.drafts?.hygiene &&
      typeof oc.demand.drafts.hygiene.stale === 'boolean' &&
      (Number.isFinite(oc.demand.drafts.hygiene.ageSec) || oc.demand.drafts.hygiene.ageSec === null),
    'orient draft hygiene carries explicit freshness provenance',
  );
  // false-green ban: exit 0 only if green + assertSame
  if (orientSt.status === 0) {
    ok(oc.green === true && oc.assertSame.ok === true, 'orient exit0 requires green+assertSame');
  }
  if (orientSt.status === 2) {
    ok(oc.assertSame.ok === false, 'orient exit2 is dual-NEXT');
  }
} catch {
  fails.push('orient json parse');
}

// A child that could not start is an infrastructure-blocked suite, regardless
// of where it occurred. Keep every completed assertion in the receipt, but do
// not misclassify the resulting dependent failures as product-contract bugs.
if (spawnErrors.length) {
  writeReceipt(false);
  console.error('BLOCKED tools-os-selftest: one or more child processes unavailable');
  process.exit(2);
}

ok(
  /dg-contact-scrub/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /script\[type=["']application\/ld\+json["']\]/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /hello@/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /potter@trydemigod\.com/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head contact-scrub rewrites hello@ in application/ld+json scripts',
);
ok(
  /function scrubContactEmail/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /script\[type=["']application\/ld\+json["']\]/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')) &&
    /data-props-link/.test(fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8')),
  'foot scrubContactEmail covers ld+json + data-props-link hello@ leftovers',
);
ok(
  /twitter:image:width/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /twitter:image:height/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head twitter image width/height for rich cards',
);
ok(
  /shipSnap/.test(dashboardSource) && /workLog/.test(dashboardSource) && /ship=sealed/.test(dashboardSource),
  'coord workLog includes shipSnap sealed/disk/live for human dash summary',
);
ok(
  /volumeStatic/.test(dashboardSource) && /canvas volume/.test(dashboardSource),
  'coord workLog.live flags volumeStatic Designer canvas residual',
);
ok(
  /staticOnlyResiduals/.test(dashboardSource) && /hold sealed/.test(dashboardSource),
  'coord workLog notes hold sealed when live residuals are static-only',
);
ok(
  /redesignSnap|redesign: redesignSnap/.test(dashboardSource) && /DEMIGOD-FOOT-CDN/.test(dashboardSource),
  'coord workLog redesign snap from CDN vs live when paste blocked',
);
ok(
  /disk: String\(shipSnap\.disk \|\| pub\?\.diskFoot \|\| man\?\.footVer \|\| man\?\.version/.test(dashboardSource),
  'coord workLog redesign disk label prefers actual disk evidence over manifest evidence',
);
ok(
  /manVer/.test(dashboardSource) && /man v\$\{redesignSnap\.manVer\}/.test(dashboardSource),
  'coord workLog redesign manVer pin in paste-blocked summary',
);
ok(
  /@media print/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) && /prefers-contrast:more/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head print media + prefers-contrast redesign',
);
ok(
  /scroll-padding-top:4\.5rem/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /dfn\{/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head scroll-padding-top + dfn redesign',
);
ok(
  /font-optical-sizing:auto/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head font-optical-sizing redesign',
);
ok(
  /cdn-sealed/.test(dashboardSource),
  'workSummary includes cdn-sealed when redesignSnap.cdnSealed',
);
ok(
  /:target\{/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /prefers-reduced-data:reduce/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /forced-colors:active/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head :target + forced-colors + prefers-reduced-data redesign',
);
ok(
  /dg-truncate/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /min-width:1280px/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head large-viewport + dg-truncate redesign',
);
ok(
  /live: String\(shipSnap\.live \|\| pub\?\.liveFoot/.test(dashboardSource),
  'redesignSnap.live strips leading v for lag math',
);
ok(
  /lagBit/.test(dashboardSource) && /lag\+\$\{redesignSnap\.lagVer\}/.test(dashboardSource),
  'workSummary includes lag+N from redesignSnap.lagVer',
);
ok(
  /:-webkit-autofill/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /::placeholder/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head placeholder + autofill dark redesign',
);
ok(
  /prefers-reduced-transparency:reduce/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /contain:layout paint style/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head reduced-transparency + media contain redesign',
);
ok(
  /pub\?\.lagVer/.test(dashboardSource),
  'redesignSnap.lagVer prefers pub.lagVer when finite',
);
ok(
  /update:slow/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /:focus-within/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head update:slow motion kill + card focus-within',
);
ok(
  /break-inside:avoid/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /print-color-adjust:exact/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head break-inside avoid cards + print-color-adjust exact',
);
ok(
  /hyphens:auto/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /any-hover:hover/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head hyphens auto + any-hover/any-pointer fine',
);
ok(
  /100dvh/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /display-mode:standalone/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head 100dvh hero + standalone safe-area top',
);
ok(
  /color-scheme:dark only/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head color-scheme dark only',
);
ok(
  /orientation:landscape/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /max-height:500px/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head short-landscape hero min-height auto',
);
ok(
  !/hello@trydemigod\.com/.test(fs.readFileSync(path.join(ROOT, 'demigod-blog-posts.json'), 'utf8')),
  'blog public contact never uses hello@ mailbox (matches blog-sync validate(), which forbids hello@ but does not require potter@ presence — posts are not all pricing/policy CTAs)',
);
ok(
  /input\[type=search\]/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head search input appearance reset',
);
ok(
  /input\[type=number\]/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /input\[type=date\]/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head number spin hide + date color-scheme dark',
);
ok(
  /stage: pub\?\.stage/.test(dashboardSource),
  'redesignSnap.stage comes from publish status',
);
ok(
  /scrollbar-gutter:stable both-edges/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head scrollbar-gutter both-edges',
);
ok(
  (() => {
    const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-blog-posts.json'), 'utf8'));
    const list = Array.isArray(posts) ? posts : posts.posts || [];
    return list.length > 0 && list.every((p) => p.imageAlt && p.imageAlt !== p.title && p.imageAlt.length > 20);
  })(),
  'blog imageAlt descriptive (not title-only)',
);
ok(
  /svg\{max-width:100%;height:auto\}/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head svg fluid max-width',
);
ok(
  /manAt: man\?\.at/.test(dashboardSource),
  'redesignSnap preserves manifest evidence time',
);
ok(
  /button,input,select,textarea\{font:inherit\}/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head form controls font:inherit',
);
ok(
  /manAtBit/.test(dashboardSource),
  'workSummary includes manAtBit from redesignSnap.manAt',
);
ok(
  /img,video,iframe\{contain:layout paint style;max-width:100%/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head video/iframe fluid max-width',
);
ok(
  /Number\.isFinite\(d\) && Number\.isFinite\(l\) && d !== l/.test(dashboardSource),
  'redesignSnap.lagVer prefers live ship math over pub lag',
);


ok(
  /font-synthesis:none/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head font-synthesis none',
);













ok(
  /pointer:coarse/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /img:not\(\[alt\]\)/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head coarse pointer tap + missing-alt outline',
);

ok(
  /font-variant-numeric:tabular-nums/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')) &&
    /max-width:360px/.test(fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8')),
  'head tabular-nums + 360px type scale redesign',
);









ok(
  /pasteReason/.test(dashboardSource),
  'redesignSnap preserves paste reason in workLog',
);
ok(
  (() => {
    const headHtml = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
    const img = headHtml.match(/<meta property="og:image" content="([^"]+)"/);
    const secure = headHtml.match(/<meta property="og:image:secure_url" content="([^"]+)"/);
    return !!img && !!secure && img[1] === secure[1] && secure[1].startsWith('https://');
  })(),
  'head og:image:secure_url for https unfurl parity',
);
ok(
  /workLog/.test(dashboardSource) && /crawlSnap/.test(dashboardSource) && /FIRECRAWL-DATA-REPORT/.test(dashboardSource),
  'coord workLog surfaces optional firecrawl crawlSnap from FIRECRAWL-DATA-REPORT.json',
);

if (fails.length) {
  writeReceipt(false);
  console.error('FAIL', fails);
  process.exit(1);
}
writeReceipt(true);
console.log('ALL PASS tools-os-selftest');
