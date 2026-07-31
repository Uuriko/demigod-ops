#!/usr/bin/env node
/**
 * demigod-ship-selftest — freeze-safe ship CLI contract
 * Run: node demigod-ship-selftest.mjs
 */
// Fail-closed: unknown flags must not vacuous-green the suite (POSIX usage = exit 2).
{
  const argvFlags = process.argv.slice(2).filter((a) => a.startsWith('-'));
  if (argvFlags.length) {
    console.error(
      `usage: node demigod-ship-selftest.mjs  (no flags; got ${argvFlags.join(' ')})`,
    );
    process.exit(2);
  }
}
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

function dgShip(args, env = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'demigod-ship.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, ...env },
  });
  result.outputText = `${result.stdout || ''}${result.stderr || ''}`;
  return result;
}

const help = dgShip(['help']);
const subprocessDenied = help.error?.code === 'EPERM';
if (subprocessDenied) console.log('skip nested ship CLI checks (spawnSync EPERM sandbox)');
else {
  ok(help.status === 0, 'ship help exit 0');
  ok(/freeze:/i.test(help.outputText), 'ship help shows freeze');
  ok(/status|prepare|cdn|paste|verify|run/.test(help.outputText), 'ship help lists verbs');
  ok(!/export DEMIGOD_CURRENT_REQUEST_PUBLISH/.test(help.outputText), 'ship help scopes publish authorization to one command');
}

const st = dgShip(['status', '--json'], { DEMIGOD_CURRENT_REQUEST_PUBLISH: '' });
let report = null;
if (!subprocessDenied) {
  ok([0, 1].includes(Number(st.status)), 'ship status runs');
  try {
    report = JSON.parse(st.outputText.slice(st.outputText.indexOf('{')));
  } catch {
    /* */
  }
  ok(report && report.subcommand === 'status', 'status JSON schema');
  ok(report && report.freeze && typeof report.freeze.on === 'boolean', 'status has freeze');
  ok(report && report.freeze && report.freeze.authorized === false, 'status exposes publish authorization');
  ok(report && report.freeze && report.freeze.on === false, 'status freeze off under standing disable');
  ok(report && report.next, 'status has next');
  ok(report && /prepare only/i.test(report.next), 'status keeps unauthorized work prepare-only');
  ok(report && report.truth && report.truth.diskVer, 'status parses truth diskVer');
}

const freeze = freezeStatus();
if (freeze.frozen && !subprocessDenied) {
  const cdn = dgShip(['cdn']);
  ok(cdn.status !== 0, 'cdn blocked while frozen');
  ok(/freeze|frozen|FREEZE/i.test(cdn.stdout + cdn.stderr), 'cdn freeze message');
  const paste = dgShip(['paste']);
  ok(paste.status !== 0, 'paste blocked while frozen');
  const runAll = dgShip(['run']);
  ok(runAll.status !== 0, 'run blocked while frozen');
} else {
  console.log('skip freeze-block asserts (freeze OFF)');
}

const bad = dgShip(['nope']);
if (!subprocessDenied) ok(bad.status === 2, 'unknown subcommand exit 2');
const badFlag = dgShip(['status', '--definitely-unknown']);
if (!subprocessDenied) {
  ok(badFlag.status === 2, 'unknown ship flag exit 2');
  ok(/unknown argument/.test(`${badFlag.stdout || ''}${badFlag.stderr || ''}`), 'unknown ship flag message');
}

const cm6Check = spawnSync(process.execPath, [path.join(ROOT, 'demigod-cm6-paste-publish.mjs'), '--check'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 30000,
});
const cm6Text = `${cm6Check.stdout || ''}${cm6Check.stderr || ''}`;
let cm6Report = null;
if (!subprocessDenied) {
  try {
    cm6Report = JSON.parse(cm6Text.slice(cm6Text.indexOf('{')));
  } catch {
    /* */
  }
  ok(cm6Report && cm6Check.status === (cm6Report.ok ? 0 : 1), 'cm6 preflight exit matches structured result');
  ok(cm6Report?.checks?.headHasNoFootLoader === true, 'cm6 head rejects foot loader');
  ok(cm6Report?.checks?.footerHasOneFootLoader === true, 'cm6 footer requires exactly one loader');
  ok(cm6Report?.checks?.coreVersionMarkersAgree === true, 'cm6 requires matching foot version markers');
  ok(cm6Report?.checks?.footerMatchesManifest === true, 'cm6 footer URL matches CDN manifest');
  ok(cm6Report?.checks?.manifestAttested === true, 'cm6 requires a positively attested CDN manifest');
  ok(cm6Report?.checks?.manifestVersionMarkersAgree === true, 'cm6 requires matching manifest version markers');
  ok(typeof cm6Report?.checks?.manifestVersionMatchesCore === 'boolean', 'cm6 checks manifest version against canonical foot');
  ok(typeof cm6Report?.checks?.manifestShaMatchesCore === 'boolean', 'cm6 checks manifest sha against canonical foot');
  ok(typeof cm6Report?.checks?.manifestBytesMatchCore === 'boolean', 'cm6 checks manifest byte count against canonical foot');
  ok(
    cm6Report?.releaseDetails?.core?.version === cm6Report?.coreVersions?.[0] &&
      typeof cm6Report?.releaseDetails?.core?.sha256 === 'string' &&
      Number.isSafeInteger(cm6Report?.releaseDetails?.core?.bytes),
    'cm6 receipt explains the canonical release identity',
  );
  const identityDelta = cm6Report?.releaseDetails?.identityDelta;
  // Check names are asymmetric on purpose: sha/version use Matches, bytes use Match.
  const identityCheck = {
    version: 'manifestVersionMatchesCore',
    sha256: 'manifestShaMatchesCore',
    bytes: 'manifestBytesMatchCore',
  };
  ok(
    identityDelta && ['version', 'sha256', 'bytes'].every((key) =>
      cm6Report.checks[identityCheck[key]]
        ? identityDelta[key] === null
        : identityDelta[key]?.expected != null),
    'cm6 receipt exposes expected-versus-staged identity deltas',
  );
  const artifactLag = cm6Report?.releaseDetails?.artifactLag;
  ok(
    cm6Report?.releaseReady
      ? artifactLag === null
      : artifactLag && ['core-ahead', 'manifest-ahead', 'identity-drift'].includes(artifactLag.direction),
    'cm6 receipt classifies release artifact lag without weakening the gate',
  );
  ok(cm6Report?.checks?.editorHelperPinsHeadFooter === true, 'cm6 structural receipt attests pinned head/footer indices');
  ok(cm6Report?.checks?.editorHelperRequiresExactReadback === true, 'cm6 structural receipt attests exact editor readback');
}

const headSource = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const headStylesSource = fs.readFileSync(path.join(ROOT, 'demigod-head-styles.css'), 'utf8');
const footerSource = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const footerLoaderSource = fs.readFileSync(path.join(ROOT, 'demigod-footer-loader.html'), 'utf8');
const coreSource = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
const loaderTags = footerSource.match(/<script\b[^>]*(?:id=["']demigod-foot-cdn-loader["']|foot-latest\.js)[^>]*>/gi) || [];
const coreVersions = [
  (coreSource.match(/dgFootVersion\s*=\s*["']v(\d+)["']/) || [])[1],
  (coreSource.match(/__dgFootVer\s*=\s*["'](\d+)["']/) || [])[1],
];
const shipStatusSource = fs.readFileSync(path.join(ROOT, 'demigod-ship-status.mjs'), 'utf8');
const shipSource = fs.readFileSync(path.join(ROOT, 'demigod-ship.mjs'), 'utf8');
ok(
  /shipNextGate:\s*ship\?\.shipped \? null : ship\?\.stage/.test(shipSource) &&
    /\$\{report\.shipNextGate \? 'next gate' : 'stage'\}/.test(shipSource),
  'ship status labels the first failing stage as the next gate, not an achieved stage',
);
ok(
  /beginRun\('ship-prepare'[\s\S]*demigod-startup-atlas-web\.js[\s\S]*DEMIGOD-SF-STARTUP-MAP\.json/.test(shipSource),
  'ship prepare evidence covers the atlas script and map data shipped with the foot',
);
ok(
  /function canonicalAssetUrl\(raw\)/.test(shipStatusSource) &&
    /liveCdnCanon\s*&&\s*manCdnCanon\s*&&\s*liveCdnCanon\s*===\s*manCdnCanon/.test(shipStatusSource) &&
    !/live\.cdnId\s*&&\s*manId\s*&&\s*live\.cdnId\s*===\s*manId/.test(shipStatusSource),
  'ship status live_matches_manifest compares full CDN URL (not basename-only foot-latest.js)',
);
ok(
  /liveMatchesDiskVer/.test(shipStatusSource) &&
    /live foot ver lags disk/.test(shipStatusSource),
  'ship status nextCmd includes liveMatchesDiskVer (no false all-green while stage lags)',
);
ok(
  /manifestMatchesDisk\s*=\s*Boolean\([\s\S]*man\.ok === true[\s\S]*manShaOk[\s\S]*manBytesOk[\s\S]*manVersionOk[\s\S]*manMarkersAgree/.test(shipStatusSource),
  'ship status requires the complete attested manifest identity before CM6',
);
ok(
  /identityChecks:\s*\{[\s\S]*sha:\s*manShaOk[\s\S]*bytes:\s*manBytesOk[\s\S]*version:\s*manVersionOk[\s\S]*markersAgree:\s*manMarkersAgree/.test(shipStatusSource),
  'ship status receipt exposes each manifest identity check',
);
ok(
  /dg-path-redirects/.test(headSource) &&
    /dg-base-tokens/.test(headSource) &&
    !/foot-latest\.js/.test(headSource),
  'canonical head markers are present and loader-free',
);
ok(
  /#dg-page \.dg-page-ctas a,[\s\S]*#dg-page \.dg-page-x\{[\s\S]*min-width:48px;[\s\S]*min-height:48px;/.test(headStylesSource),
  'head CSS preserves the 48px product-page control floor before runtime CSS',
);
ok(
  /#dg-page \.dg-page-ctas a:focus-visible,[\s\S]*#dg-page \.dg-page-x:focus-visible\{[\s\S]*outline:2px solid var\(--g,#C9A84C\)!important/.test(headStylesSource) &&
    /@media\(forced-colors:active\)\{[\s\S]*#dg-page \.dg-page-x:focus-visible\{[\s\S]*outline:2px solid Highlight!important/.test(headStylesSource),
  'head CSS exposes product-page keyboard focus before runtime CSS, including forced colors',
);
ok(
  /@media\(forced-colors:active\)\{[\s\S]*#dg-page details>summary:focus-visible\{[\s\S]*outline:2px solid Highlight!important/.test(headStylesSource),
  'head CSS preserves disclosure keyboard focus in forced-colors mode',
);
ok(/body:not\(\.dg-ready\):not\(\[data-dg-ready="1"\]\) \.nav_right a[^}]*visibility:hidden/.test(headSource), 'canonical head hides whole nav CTAs until relabeling is ready');
ok(
  /body:not\(\.dg-ready\):not\(\[data-dg-ready="1"\]\) \.hero-actions/.test(headStylesSource) &&
    /body:not\(\.dg-ready\):not\(\[data-dg-ready="1"\]\) \.nav_right a/.test(headStylesSource) &&
    /body:not\(\.dg-ready\):not\(\[data-dg-ready="1"\]\) \.nav_right button/.test(headStylesSource),
  'canonical head CSS independently hides legacy hero and nav CTAs before readiness',
);
ok(
  /body\[data-dg-ready="1"\] \.hero-actions a:not\(\[data-dg-cta\]\)/.test(headSource) &&
    /body\[data-dg-ready="1"\] \.nav_right button:not\(\[data-dg-cta\]\)/.test(headSource),
  'canonical head keeps legacy CTAs hidden for either readiness signal',
);
ok(
  /setAttribute\('data-dg-cta',i===0\?'hire':'talent'\)/.test(headSource) &&
    /setAttribute\('href',i===0\?'\/\?wiz=startup':'\/\?wiz=engineer'\)/.test(headSource),
  'head CDN fallback exposes explicitly routed dual CTAs',
);
ok(
  /classList\.add\('dg-head-fallback','dg-ready'\);\s*document\.body\.setAttribute\('data-dg-ready','1'\)/.test(headSource),
  'head CDN fallback publishes the canonical readiness class and data attribute',
);
ok(loaderTags.length === 1, 'canonical footer contains exactly one foot loader');
ok(footerLoaderSource === footerSource, 'footer loader mirror exactly matches canonical footer');
ok(coreVersions[0] && coreVersions[0] === coreVersions[1], 'canonical foot version markers agree');

const truthSource = fs.readFileSync(path.join(ROOT, 'demigod-truth.mjs'), 'utf8');
ok(
  /manifestMapMatchesDisk[\s\S]*manifestMapDataMatchesDisk[\s\S]*liveMapMatchesDisk[\s\S]*liveMapDataMatchesDisk/.test(truthSource),
  'truth fullyShipped includes manifest and live attestation for the startup-map bundle',
);
const cm6Source = fs.readFileSync(path.join(ROOT, 'demigod-cm6-paste-publish.mjs'), 'utf8');
ok(
  /function requireMutate\(label\)\s*\{\s*assertNotFrozen\(label\);\s*assertCanWriteFoot\(\{ label \}\);\s*\}/.test(shipSource),
  'single ship path requires current-request authorization, freeze clearance, and the foot lock',
);
const cdnSource = fs.readFileSync(path.join(ROOT, 'demigod-foot-cdn-publish.mjs'), 'utf8');
ok(
  /fetchExact\(mapUrl, mapJs, true\)/.test(cdnSource) &&
    /fetchExact\(mapDataUrl, mapData\)/.test(cdnSource) &&
    /fetchCssExact\(headCssUrl\)/.test(cdnSource) &&
    /check\.ok && mapCheck\.ok && mapDataCheck\.ok && headCssCheck\.ok/.test(cdnSource) &&
    /complete attested site bundle/.test(cdnSource),
  'CDN publisher attests the complete site bundle and fails closed without it',
);
ok(/document\.querySelectorAll\('\.cm-editor'\)/.test(cm6Source), 'cm6 discovers editors in DOM order');
ok(/ed\.isConnected/.test(cm6Source) && /getClientRects\(\)\.length===0/.test(cm6Source), 'cm6 ignores hidden or disconnected editor trees');
ok(/const candidates=\[\.\.\.ed\.querySelectorAll\('\.cm-content'\)\]/.test(cm6Source), 'cm6 skips gutter views within each editor');
ok(/const hit=eds\[0\]/.test(cm6Source) && /const hit=eds\[1\]/.test(cm6Source), 'cm6 pins head editor 0 and footer editor 1');
ok(!/function\s+(?:getView|setEditor)\s*\(/.test(cm6Source), 'cm6 exposes no raw cm-content index writer');
ok(
  /assertHeadFootSplit\(expectedHead, expectedFoot\)/.test(cm6Source) &&
    /headExact=h===expectedHead/.test(cm6Source) &&
    /footExact=f===expectedFoot/.test(cm6Source),
  'cm6 asserts exact canonical head/footer separation after paste',
);
ok(
  /editorHelperVerifiesPersistedSplit/.test(cm6Source) &&
    /pre === expectedHead && post === expectedFoot/.test(cm6Source) &&
    /if \(!persisted\.result\?\.value\?\.ok\)/.test(cm6Source),
  'cm6 structural preflight attests exact persisted API head/footer separation',
);
ok(/canonicalOk:\s*preflight\.ok/.test(cm6Source) && /ok:\s*pass/.test(cm6Source), 'cm6 structural receipt cannot contradict its selected check result');
ok(
  /selectedContract:\s*CHECK_STRUCTURAL\s*\?\s*'editor-structure'\s*:\s*'release-ready'/.test(cm6Source) &&
    /releaseBlocked:\s*!preflight\.releaseReady/.test(cm6Source) &&
    /structural-pass-release-blocked/.test(cm6Source),
  'cm6 structural receipt explicitly distinguishes pass scope from release blockage',
);
ok(
  /if \(!\/\^\\d\+\$\/\.test\(normalized\)\) return null/.test(cm6Source) &&
    /coreVersionNumber !== null && manifestVersionNumber !== null/.test(cm6Source),
  'cm6 classifies missing or malformed release versions as identity drift, never numeric lag',
);
ok(
  /leaseStaleForCore/.test(cm6Source) &&
    /wait-for-stale-core-release-lease/.test(cm6Source) &&
    /staleForCore:\s*leaseStaleForCore/.test(cm6Source) &&
    /takeoverAllowed:\s*false/.test(cm6Source),
  'cm6 recovery distinguishes an older-core lease without permitting takeover',
);
ok(
  /retryAfter:\s*held \? new Date\(expiresMs\)\.toISOString\(\) : null/.test(cm6Source) &&
    /retryInMs,/.test(cm6Source),
  'cm6 lease recovery exposes a bounded retry time',
);
ok(
  /blockedByLease:\s*lease\.held/.test(cm6Source) &&
    /progressBlockedByLease:\s*lease\.held\s*&&\s*!transportBlocked/.test(cm6Source),
  'CM6 recovery separates the lease mutation guard from the primary progress blocker',
);
const fullyShippedBlock = (truthSource.match(/const fullyShipped = Boolean\(([\s\S]*?)\n  \);/) || [])[1] || '';
ok(/liveFootLoaderCount === 1/.test(fullyShippedBlock), 'truth fullyShipped requires one live loader');
ok(
  /function footLoaderUrls\(html, manifestCdnUrl\)/.test(truthSource) &&
    /demigod-foot-cdn-loader/.test(truthSource) &&
    /assetId\(canonical\)\?\.toLowerCase\(\) === 'foot-latest\.js'/.test(truthSource),
  'truth loader count excludes unrelated approved-CDN JavaScript',
);
ok(/liveMatchesManifest/.test(fullyShippedBlock), 'truth fullyShipped requires manifest URL match');
ok(/liveFootMimeOk/.test(fullyShippedBlock), 'truth fullyShipped requires executable CDN MIME');
ok(/liveStartupsStaticMatchesDisk/.test(fullyShippedBlock), 'truth fullyShipped requires exact live /startups crawlable fragment');
ok(/diskMatchesManifest/.test(fullyShippedBlock), 'truth fullyShipped requires manifest sha match');
ok(/manifestBytesMatchDisk/.test(fullyShippedBlock), 'truth fullyShipped requires manifest byte-count match');
ok(/manifestVersionMatchesDisk/.test(fullyShippedBlock), 'truth fullyShipped requires manifest version match');
ok(/manifestAttested/.test(fullyShippedBlock), 'truth fullyShipped requires positive manifest attestation');
ok(/manifestVersionMarkersAgree/.test(fullyShippedBlock), 'truth fullyShipped requires matching manifest version markers');
ok(/bytesMatchDisk:\s*manifestBytesMatchDisk/.test(truthSource), 'truth receipt exposes manifest byte-count match');
ok(/attested:\s*manifestAttested/.test(truthSource), 'truth receipt exposes manifest attestation');
ok(/versionMarkersAgree:\s*manifestVersionMarkersAgree/.test(truthSource), 'truth receipt exposes manifest marker agreement');
ok(/footContentType: liveJs\?\.contentType/.test(truthSource), 'truth reports live CDN content type');
ok(/if \(url\.protocol !== 'https:'\) return null/.test(truthSource), 'truth rejects non-HTTPS and malformed asset URLs');
ok(/function assetId\(canonicalUrl\)/.test(truthSource), 'truth extracts manifest IDs without throwing on invalid URLs');
ok(/\.js\(\?:\[\?#\]/.test(truthSource), 'truth counts loader URLs carrying query strings or fragments');
ok(/if \(url\.protocol !== 'https:'\) return null/.test(cm6Source), 'cm6 release comparison rejects non-HTTPS and malformed URLs');
ok(
  (cm6Source.match(/replace\(\/\^v\/i, ''\)/g) || []).length >= 3,
  'cm6 normalizes uppercase and lowercase manifest version prefixes consistently',
);
ok(
  /Do not treat every approved-host script as the foot loader/.test(cm6Source) &&
    /\\\/foot-latest\\\.js/.test(cm6Source),
  'cm6 loader detection ignores unrelated JavaScript on approved CDN hosts',
);
ok(/isExecutableJavaScriptMime\(contentType\)/.test(cdnSource), 'CDN attestation requires executable JavaScript MIME');
ok(
  /const uploadAttempts = \[\]/.test(cdnSource) &&
    /uploadAttempts,/.test(cdnSource) &&
    /upload\.status === 6/.test(cdnSource),
  'CDN failure receipt classifies transports and stops deterministic DNS retries',
);
ok(
  /liveFootContentType\s*=\s*footResponse\.headers\.get\(['"]content-type['"]\)/.test(cm6Source) &&
    /isExecutableJavaScriptMime\(liveFootContentType\)/.test(cm6Source),
  'CM6 live attestation rechecks executable JavaScript MIME',
);
ok(
  cdnSource.indexOf("args.has('--help')") < cdnSource.indexOf("assertNotFrozen('foot-cdn-publish')") &&
    cdnSource.indexOf("args.has('--help')") < cdnSource.indexOf("assertCanWriteFoot({ label: 'foot-cdn-publish', soft: true })"),
  'CDN publisher help is read-only and available before freeze/lock gates',
);
ok(
  cdnSource.indexOf('if (SELFTEST)') < cdnSource.indexOf("assertNotFrozen('foot-cdn-publish')") &&
    cdnSource.indexOf('if (SELFTEST)') < cdnSource.indexOf("assertCanWriteFoot({ label: 'foot-cdn-publish', soft: true })"),
  'CDN publisher selftest is read-only and available before freeze/lock gates',
);
ok(/rejects text\/plain MIME/.test(cdnSource) && /rejects generic binary MIME/.test(cdnSource), 'CDN selftest covers unsafe MIME rejection');
ok(!/text\\\/plain\|application\\\/octet-stream/.test(cdnSource), 'CDN attestation rejects generic plain/binary MIME');
ok(/sourceVer !== sourcePublicVer/.test(cdnSource), 'CDN publisher rejects mismatched source version markers');
ok((cdnSource.match(/remotePublicVer === sourcePublicVer/g) || []).length >= 2, 'CDN attestation requires both remote version markers');
ok(/isExecutableJavaScriptMime\(browserUpload\.contentType\)/.test(cdnSource), 'browser upload fallback enforces JavaScript MIME');
ok(/function writeFileAtomic\(/.test(cdnSource), 'CDN publisher replaces canonical artifacts atomically');
ok(
  /function currentReleaseLeaseIdentity\(\)/.test(cdnSource) &&
    /wait-for-stale-core-release-lease/.test(cdnSource) &&
    /staleForSource,/.test(cdnSource) &&
    /takeoverAllowed:\s*false/.test(cdnSource),
  'CDN publisher classifies an older-core lease while preserving the no-takeover guard',
);
ok(
  /function assertCanonicalSourceUnchanged\(\)/.test(cdnSource) &&
    /assertCanonicalSourceUnchanged\(\);[\s\S]{0,300}canonical head changed[\s\S]{0,300}\/\/ Each canonical artifact/.test(cdnSource),
  'CDN publisher refuses stale manifest writes when the site bundle changes during upload',
);
ok(
  /assertCanWriteFoot\(\{ label: 'foot-cdn-publish-final' \}\);\s*assertCanonicalSourceUnchanged\(\);/.test(cdnSource),
  'CDN publisher rechecks the release lease immediately before canonical writes',
);
ok(/sha256: sourceSha/.test(cdnSource), 'CDN manifest records the attested canonical source hash');
ok(/bytes: sourceBytes/.test(cdnSource), 'CDN manifest records the attested canonical byte count');
ok(/liveBytes === sourceBytes/.test(cdnSource), 'CDN attestation requires remote byte-count equality');
ok(
  /gatedBy:\s*\['publish-freeze', 'foot-lock', 'live-attestation'\]/.test(cdnSource) &&
    /then:\s*'node demigod-cm6-paste-publish\.mjs'/.test(cdnSource),
  'CDN lock recovery preserves the complete guarded release sequence',
);
ok(
  /const releaseRecovery = releaseArtifactsMatchDisk/.test(truthSource) &&
    /recovery:\s*releaseRecovery/.test(truthSource) &&
    /takeoverAllowed:\s*false/.test(truthSource),
  'truth exposes guarded stale-lease recovery without permitting takeover',
);

// ship-os.json written by status
ok(fs.existsSync('/tmp/dg-busy/ship-latest.json'), 'ship-latest.json written');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS demigod-ship-selftest');
