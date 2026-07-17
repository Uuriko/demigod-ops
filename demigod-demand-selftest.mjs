#!/usr/bin/env node
/**
 * demigod-demand-selftest + canary (adversarial false-green)
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildNext } from './demigod-next.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { refuseIfStale } from './demigod-evidence.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = '/tmp/dg-busy/demand-selftest.json';
const fails = [];
const spawnErrors = [];
const canaryDir = path.join('/tmp/dg-busy', `demand-canary-${process.pid}`);
const SELFTEST_STATUS = path.join(canaryDir, 'demand-status-selftest.json');
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

function runSandboxFallback() {
  const demandSource = fs.readFileSync(path.join(ROOT, 'demigod-demand.mjs'), 'utf8');
  const inboundSource = fs.readFileSync(path.join(ROOT, 'demigod-pilot-inbound.mjs'), 'utf8');
  const cycleSource = fs.readFileSync(path.join(ROOT, 'demigod-cycle-work.mjs'), 'utf8');
  const selfSource = fs.readFileSync(path.join(ROOT, 'demigod-demand-selftest.mjs'), 'utf8');
  ok(
    (selfSource.match(/^\s*contractPass:\s*pass,\s*$/gm) || []).length === 1,
    'fallback receipt emits one unambiguous contractPass field',
  );
  ok(/\bSENT-CONFIRMED\b/.test(demandSource), 'fallback requires confirmed-send evidence');
  ok(/SENT-UNATTESTED/.test(demandSource), 'fallback separates unattested sends');
  ok(/const parseReceipt\s*=/.test(demandSource), 'fallback requires canonical send receipts');
  ok(/attestedFields\.length > 1 \|\| viaFields\.length > 1/.test(demandSource), 'fallback rejects duplicate reserved receipt metadata');
  ok(/!\/\^attested=1\$\/i\.test\(attested \|\| ['"]['"]\)/.test(demandSource), 'fallback requires explicit confirmed-send attestation');
  ok(/SENT-UNATTESTED['"] && !\/\^attested=0\$\/i\.test\(attested \|\| ['"]['"]\)/.test(demandSource), 'fallback requires explicit unattested-send metadata');
  ok(/confirmedByHandle/.test(demandSource), 'fallback deduplicates confirmed handles');
  ok(/unattestedByHandle/.test(demandSource), 'fallback validates and deduplicates unattested handles');
  ok(/malformedCount:\s*malformedLines\.length/.test(demandSource), 'fallback exposes malformed receipt quarantine telemetry');
  ok(/malformedReceipts:\s*sendLog\.malformedCount/.test(demandSource), 'fallback carries malformed receipt count on demand status');
  ok(/function malformedReceiptReason|const malformedReceiptReason/.test(demandSource), 'fallback classifies malformed receipt quarantine reasons');
  ok(/prohibited_auto_send/.test(demandSource), 'fallback distinguishes prohibited auto-send receipts');
  ok(/malformedReceiptReasons:\s*sendLog\.malformedReasons/.test(demandSource), 'fallback carries malformed receipt reasons on demand status');
  ok(/confirmedByHandle\.has\(receipt\.handle\)/.test(demandSource), 'fallback promotes confirmed handles out of unattested telemetry');
  ok(!/DEMIGOD_ALLOW_AUTO_DM/.test(demandSource), 'fallback removes legacy auto-DM environment bypass');
  ok(/overrideAllowed:\s*false/.test(demandSource), 'fallback forbids auto-DM override');
  ok(!/const allow\s*=\s*[\s\S]*DEMIGOD_ALLOW_AUTO_DM/.test(demandSource), 'fallback has no environment auto-send bypass');
  ok(/error:\s*['"]auto_dm_stopped['"]/.test(demandSource), 'fallback keeps drafts-only refusal');
  ok(!/send yourself|human re-enables/i.test(demandSource), 'fallback demand output assigns no human send task');
  ok(/SENT-CONFIRMED remains zero until an externally attested send is recorded/.test(demandSource), 'fallback draft output states the evidence boundary');
  ok(/inventsPilots:\s*false/.test(demandSource), 'fallback keeps no-invented-pilots contract');
  ok(
    /const DEMAND_STATUS = process\.env\.DEMIGOD_DEMAND_STATUS \|\| path\.join\(BUSY, ['"]demand-status\.json['"]\)/.test(demandSource) &&
      /const statusPath = DEMAND_STATUS/.test(demandSource),
    'fallback demand status supports isolated materialization',
  );
  ok(/DEMIGOD_DEMAND_STATUS:\s*SELFTEST_STATUS/.test(selfSource), 'fallback selftest isolates demand status canaries');
  ok(/cells\.length\s*!==\s*7/.test(demandSource), 'fallback validates active-pipeline rows');
  ok(/\^##\[ \\t\]\+Active pipeline\[ \\t\]\*\$\/im/.test(demandSource), 'fallback demand requires exact active-pipeline heading');
  ok(/cells\.length === 7[\s\S]*id\|founder\|role\|90-day outcome\|status\|next\|date/.test(demandSource), 'fallback demand requires canonical active-pipeline header');
  ok(/cells\.length\s*!==\s*5/.test(demandSource), 'fallback validates warm-inbound rows');
  ok(
    /const quarantinePreHeaderRows[\s\S]*quarantine\(['"]invalid_schema['"]\)[\s\S]*quarantinePreHeaderRows\(lines\.slice\(1, headerIndex < 0 \? undefined : headerIndex\)\)/.test(demandSource),
    'fallback demand quarantines row-shaped warm content before or without the canonical header',
  );
  ok(/cells\.length\s*!==\s*7/.test(demandSource) && /Why first/.test(demandSource), 'fallback validates canonical queue schema');
  ok(/\^@\[A-Za-z0-9_\]/.test(demandSource), 'fallback rejects invalid queue handles');
  ok(/function writeTextAtomic\(/.test(inboundSource), 'fallback requires atomic inbound writer');
  ok(/function acquirePilotLogWriterLock\(/.test(inboundSource), 'fallback serializes inbound read-modify-write');
  ok(/fs\.openSync\(lock, ['"]wx['"], 0o600\)/.test(inboundSource), 'fallback inbound writer lock is exclusive');
  ok(/warm_inbound_writer_busy/.test(inboundSource), 'fallback inbound reports concurrent writer contention without mutation claim');
  ok(/finally \{[\s\S]*releaseWriterLock\(\)/.test(inboundSource), 'fallback inbound always releases its writer lock');
  ok(/fs\.openSync\(temp, ['"]wx['"], existingMode\)/.test(inboundSource), 'fallback creates inbound temp files exclusively and preserves log mode');
  ok(/fs\.fsyncSync\(handle\)[\s\S]*fs\.renameSync\(temp, file\)/.test(inboundSource), 'fallback syncs the complete inbound log before atomic publish');
  ok(/fs\.renameSync\(temp, file\)/.test(inboundSource), 'fallback publishes inbound atomically');
  ok(
    /fs\.renameSync\(temp, file\)[\s\S]*fs\.openSync\(dir, ['"]r['"]\)[\s\S]*fs\.fsyncSync\(dirHandle\)/.test(inboundSource),
    'fallback persists the inbound rename before reporting success',
  );
  ok(
    /function readWholeText\([\s\S]*fs\.readFileSync\(p, ['"]utf8['"]\)/.test(inboundSource) &&
      /let md = readWholeText\(PILOT_LOG\)/.test(inboundSource),
    'fallback inbound writer preserves the complete append-only pilot log',
  );
  ok(
    /const pilotLogText = readWholeText\(PILOT_LOG\)/.test(inboundSource) &&
      /pilotLogBytes:\s*Buffer\.byteLength\(pilotLogText, ['"]utf8['"]\)/.test(inboundSource),
    'fallback inbound status parses the complete pilot log and reports source size',
  );
  ok(/warmLogged:\s*false/.test(inboundSource), 'fallback does not claim failed inbound writes');
  ok(/error:\s*['"]warm_inbound_write_failed['"]/.test(inboundSource), 'fallback propagates warm-log write failure');
  ok(/error:\s*['"]warm_who_placeholder['"]/.test(inboundSource), 'fallback rejects placeholder inbound identities');
  ok(
    /hasUnsafeEvidenceMarkup\(safe\.who\)[\s\S]*error:\s*['"]warm_who_unsafe_markup['"]/.test(inboundSource),
    'fallback rejects unsafe warm identities before log mutation',
  );
  ok(/error:\s*['"]warm_channel_invalid['"]/.test(inboundSource), 'fallback rejects invalid warm-inbound channels');
  ok(
    /WARM_CHANNELS\s*=\s*new Set\(\[[^\]]*['"]phone['"][^\]]*['"]call['"]/.test(inboundSource) &&
      /allowedChannels\s*=\s*new Set\(\[[^\]]*['"]phone['"][^\]]*['"]call['"]/.test(demandSource),
    'fallback keeps phone/call warm inbound aligned across both readers',
  );
  ok(
    /part === ['"]call['"] \? ['"]phone['"] : part/.test(demandSource) &&
      /part === ['"]call['"] \? ['"]phone['"] : part/.test(inboundSource),
    'fallback canonicalizes call/phone aliases before warm identity deduplication',
  );
  ok(/error:\s*['"]warm_disposition_required['"]/.test(inboundSource), 'fallback requires warm status and next action');
  ok(
    /const nonSignalReason = explicitWarmNonSignalReason\(safe\)[\s\S]*error:\s*['"]warm_non_signal['"][\s\S]*reason:\s*nonSignalReason/.test(inboundSource),
    'fallback inbound writer rejects explicit non-signals before log mutation',
  );
  ok(/const MAX_WARM_CELL_CHARS\s*=\s*500/.test(inboundSource), 'fallback bounds warm-inbound fields');
  ok(/error:\s*['"]warm_field_invalid['"]/.test(inboundSource), 'fallback rejects oversized or control-bearing warm fields');
  ok(/const canonicalHeader\s*=/.test(inboundSource), 'fallback requires canonical warm-table header validation');
  ok(/const canonicalWarmBody\s*=\s*warmHeader[\s\S]*?canonicalWarmBody\.split\(['"]\\n['"]\)/.test(inboundSource), 'fallback scopes warm idempotency to canonical table body');
  ok(/const visibleMd = withoutFencedCode\(md\)[\s\S]*visibleMd\.search\(WARM_HEADING_RE\)/.test(inboundSource), 'fallback warm writer ignores fenced and commented section examples');
  ok(/function parseActiveTableDetailed\([\s\S]*?id\|founder\|role\|90-day outcome\|status\|next\|date[\s\S]*?invalidSchemaRows: candidateRows/.test(inboundSource), 'fallback inbound quarantines active rows under a noncanonical header');
  ok(/const activeParsed = parseActiveTableDetailed\(md\)/.test(inboundSource), 'fallback inbound status uses detailed canonical active-pipeline parser');
  ok(
    /const warmSection = warmEnd > 0[\s\S]*const warmHeader = warmSection\.match\(canonicalHeader\)/.test(inboundSource),
    'fallback finds the canonical header only inside the warm section',
  );
  ok(/error:\s*['"]wiz_email_invalid['"]/.test(inboundSource), 'fallback rejects missing or invalid WIZ email');
  ok(/error:\s*['"]pilot_os_brief_required['"]/.test(inboundSource), 'fallback requires a real brief before opening pilot OS state');
  ok(
    /const osResult = spawnSync\(\s*process\.execPath,\s*\[\s*path\.join\(ROOT, ['"]demigod-pilot-os\.mjs['"]\)/.test(inboundSource),
    'fallback from-wiz --os passes the Pilot OS argv array in spawnSync position two',
  );
  ok(/error:\s*osResult\.error\s*\?\s*['"]pilot_os_child_start_failed['"]\s*:\s*['"]pilot_os_open_failed['"]/.test(inboundSource), 'fallback propagates pilot OS handoff failure');
  ok(/error:\s*['"]pilot_os_child_start_failed['"][\s\S]*pilotOsMutated:\s*false/.test(inboundSource), 'fallback pilot OS passthrough reports child-start failure without mutation claim');
  ok(/error:\s*['"]pilot_os_command_failed['"][\s\S]*pilotOsMutated:\s*false/.test(inboundSource), 'fallback pilot OS passthrough reports delegated command failure');
  ok(!/email\s*\|\|\s*['"]unknown@co\.com['"]/.test(inboundSource), 'fallback never synthesizes a WIZ identity');
  ok(/process\.exitCode\s*=\s*map\[cmd\]\(\)/.test(inboundSource), 'fallback lets inbound JSON pipes flush');
  ok(!/process\.exit\(map\[cmd\]\(\)/.test(inboundSource), 'fallback forbids immediate inbound exit');
  ok(/startup-source-contract/.test(cycleSource), 'fallback cycle labels startup verification scope');
  ok(/externallyAttested:\s*false/.test(cycleSource), 'fallback cycle never promotes source checks to external attestation');
  ok(/no send attested/.test(cycleSource), 'fallback cycle tail states that no send was attested');
  ok(/childStartBlocked:\s*true/.test(cycleSource), 'fallback cycle preserves child-start denial');
  ok(/blocked:\s*result\.blocked === true \|\| result\.childStartBlocked === true/.test(cycleSource), 'fallback startup health exposes child-start denial');
  ok(/schema:\s*['"]demigod\.cycle-startup-health\/1['"]/.test(cycleSource), 'fallback startup cycle writes a dedicated health receipt');
  ok(/executionMode,\s*\n\s*attestationCommand,\s*\n\s*summary:\s*healthSummary/.test(cycleSource), 'fallback startup receipt exposes execution mode, retry command, and summary');
  ok(/for \(const n of healthBlocked \? \[\] : names\)/.test(cycleSource), 'fallback startup cycle skips draft mutation attempts after child-start denial');
  ok(/allowedChannels\.has/.test(demandSource), 'fallback demand reader rejects invalid warm-inbound channels');
  ok(/quarantine\(['"]unsafe_markup['"]\)/.test(demandSource), 'fallback demand rejects markup in warm evidence identity fields');
  ok(/\[who, channel, status, next\]\.some\(hasUnsafeEvidenceMarkup\)/.test(demandSource), 'fallback demand rejects markup in every surfaced warm-inbound text field');
  ok(/function hasUnsafeEvidenceMarkup\(/.test(inboundSource) && /return ['"]unsafe_markup['"]/.test(inboundSource), 'fallback inbound rejects markup in warm evidence identity fields');
  ok(/\[row\.who, row\.channel, row\.status, row\.next\]\.some\(hasUnsafeEvidenceMarkup\)/.test(inboundSource), 'fallback inbound rejects markup in every surfaced warm-inbound text field');
  ok(/\\u0000-\\u001F\\u007F/.test(demandSource), 'fallback demand rejects control characters in warm evidence identity fields');
  ok(/\\u0000-\\u001F\\u007F/.test(inboundSource), 'fallback inbound rejects control characters in warm evidence identity fields');
  ok(/\\u200B-\\u200F/.test(demandSource) && /\\u202A-\\u202E/.test(demandSource) && /\\u2060-\\u2069/.test(demandSource), 'fallback demand rejects invisible and bidirectional Unicode controls');
  ok(/\\u200B-\\u200F/.test(inboundSource) && /\\u202A-\\u202E/.test(inboundSource) && /\\u2060-\\u2069/.test(inboundSource), 'fallback inbound rejects invisible and bidirectional Unicode controls at read and write boundaries');
  ok(/const WARM_HEADING_RE\s*=\s*\/\^##/.test(demandSource), 'fallback demand warm parser requires canonical heading');
  ok(
    /function parseWarmInbound\([\s\S]*?who\|channel\|status\|next\|date[\s\S]*?if \(headerIndex < 0\) return \{ rows, rawRows, quarantineReasons \};[\s\S]*?for \(const line of lines\.slice\(headerIndex \+ 1\)\)/.test(demandSource),
    'fallback demand warm parser requires canonical table header',
  );
  ok(
    /warmInbound:\s*\{[\s\S]*rawRows:\s*warmParsed\.rawRows[\s\S]*quarantinedRows:\s*warmParsed\.rawRows\s*-\s*warmInbound\.length/.test(demandSource),
    'fallback demand exposes quarantined warm rows without promoting them',
  );
  ok(
    /const quarantineReasons\s*=\s*\{\}/.test(demandSource) &&
      /quarantineReasons:\s*warmParsed\.quarantineReasons/.test(demandSource),
    'fallback demand explains quarantined warm rows by reason',
  );
  ok(
    /warmInbound:\s*\{[\s\S]*rawRows:\s*warmParsed\.rawRows[\s\S]*quarantinedRows:\s*warmParsed\.rawRows\s*-\s*warm\.length/.test(inboundSource),
    'fallback pilot inbound exposes quarantined warm rows without promoting them',
  );
  ok(/placeholder\(status\)\s*\|\|\s*placeholder\(next\)/.test(demandSource), 'fallback demand rejects warm rows without disposition');
  ok(/id:\s*['"]unresolved_merge_token['"]/.test(demandSource), 'fallback draft hygiene rejects unresolved personalization tokens');
  ok(/first\[_ -\]\?name/.test(demandSource), 'fallback merge-token check covers first-name variants');
  ok(/\\\$\\\{\\s\*\(\?:first/.test(demandSource), 'fallback merge-token check covers shell-style placeholders');
  ok(/%\\s\*\(\?:first/.test(demandSource), 'fallback merge-token check covers percent-style placeholders');
  ok(/id:\s*['"]service_promise['"]/.test(demandSource), 'fallback draft hygiene rejects SLA and volume promises');
  ok(/replacement\\s\+guarantee/.test(demandSource), 'fallback promise check covers replacement guarantees');
  ok(/id:\s*['"]false_fee_claim['"]/.test(demandSource), 'fallback draft hygiene rejects false founder-side fee claims');
  ok(/id:\s*['"]unverified_traction['"]/.test(demandSource), 'fallback draft hygiene rejects invented traction claims');
  ok(/by\\s\+\(\?:tomorrow/.test(demandSource), 'fallback promise check covers by-tomorrow timing claims');
  ok(/guarantee\(\?:d\|ing\)\?/.test(demandSource), 'fallback promise check covers guarantee verb forms');
  ok(/2\\s\*\[–—-\]/.test(demandSource) && /3\\s\*\[–—-\]/.test(demandSource), 'fallback promise check covers numeric candidate-volume claims');
  ok(/\(\?:same\|next\)\[- \]day/.test(demandSource), 'fallback promise check covers same-day and next-day claims');
  ok(/\(\?:within\|in\|under\|less\\s\+than\)\\s\+\\d\+/.test(demandSource), 'fallback promise check covers alternate numeric timing claims');
  ok(/\(\?:send\|share\|deliver\|introduce\)/.test(demandSource), 'fallback promise check covers promised numeric shortlist volume');
  ok(/\(\?:you\|we\)\(\?:\['’\]ll\|\\s\+will\)/.test(demandSource), 'fallback promise check covers declarative numeric candidate outcomes');
  ok(/recipientSlugOf\(f\) === slug/.test(demandSource), 'fallback ready-draft lookup requires exact normalized recipient identity');
  ok(/\.sort\(\(a, b\) => b\.localeCompare\(a\)\)/.test(demandSource), 'fallback ready-draft lookup prefers latest dated revision');
  ok(/id:\s*['"]recipient_mismatch['"]/.test(demandSource), 'fallback draft hygiene rejects person-name greeting mismatch');
  ok(/looksLikePersonName\(name\)[\s\S]*looksLikePersonName\(greeter\)[\s\S]*greeterLc\s*!==\s*name\.toLowerCase\(\)/.test(demandSource), 'fallback recipient mismatch is narrowly scoped to person names');
  ok(/function isIsoCalendarDate\(/.test(demandSource), 'fallback demand requires valid calendar dates');
  ok(/function isIsoCalendarDate\(/.test(inboundSource), 'fallback inbound requires valid calendar dates');
  ok(/function isObservedDate\(/.test(demandSource), 'fallback demand rejects future evidence dates');
  ok(/function operatingDateKey\([\s\S]*America\/Los_Angeles/.test(demandSource), 'fallback demand evaluates date-only evidence on the Pacific operating date');
  ok(
    /function writeDemandStatusAtomic\([\s\S]*fs\.openSync\(temp, ['"]wx['"], 0o600\)[\s\S]*fs\.fsyncSync\(handle\)[\s\S]*fs\.renameSync\(temp, file\)/.test(demandSource) &&
      /writeDemandStatusAtomic\(s\.statusPath, s\)/.test(demandSource),
    'fallback demand publishes the canonical status atomically for concurrent readers',
  );
  ok(
    /const draftHygieneOk = top3Drafts\.length > 0[\s\S]*?: null;/.test(demandSource) &&
      /allHygieneOk: draftHygieneOk/.test(demandSource) &&
      /ok: draftHygieneOk/.test(demandSource),
    'fallback empty draft set reports hygiene unknown, not failed',
  );
  ok(/function isObservedDate\(/.test(inboundSource), 'fallback inbound rejects future evidence dates');
  ok(/function operatingDateKey\([\s\S]*America\/Los_Angeles/.test(inboundSource), 'fallback inbound evaluates date-only evidence on the Pacific operating date');
ok(/function withoutFencedCode\(/.test(demandSource), 'fallback demand masks fenced Markdown examples');
ok(/function withoutFencedCode\(/.test(inboundSource), 'fallback inbound masks fenced Markdown examples');
ok(/htmlComment/.test(demandSource), 'fallback demand masks HTML-commented Markdown evidence');
ok(/htmlComment/.test(inboundSource), 'fallback inbound masks HTML-commented Markdown evidence');
  ok(/function warmInboundFreshness\(/.test(demandSource), 'fallback demand exposes stale warm-inbound visibility');
  ok(/function warmInboundActionHealth\(/.test(demandSource) && /overdueActionCount/.test(demandSource), 'fallback demand exposes overdue warm-inbound actions');
  ok(/overdueActionItems:\s*actionItems\(overdue\)/.test(demandSource) && /dueTodayActionItems:\s*actionItems\(dueToday\)/.test(demandSource), 'fallback demand exposes bounded due-action detail');
  ok(/const actionItems = \(signals\)[\s\S]*?\.sort\(\(a, b\)[\s\S]*?\.slice\(0, 20\)/.test(demandSource), 'fallback demand bounds and orders all due-action detail');
  ok(/const actionItems = \(signals\)[\s\S]*?\.sort\(\(a, b\)[\s\S]*?\.slice\(0, 20\)/.test(inboundSource), 'fallback inbound bounds and orders all due-action detail');
  ok(/next:[\s\S]*\.trim\(\)\.slice\(0, 240\)/.test(demandSource), 'fallback demand bounds due-action detail');
  ok(/function warmInboundActionHealth\([\s\S]*actionScheduleFor[\s\S]*actionSource:\s*source[\s\S]*source === ['"]status['"] \? status/.test(demandSource), 'fallback demand identifies the text source for each operative action date');
  ok(/overdueActionOldestDays/.test(demandSource), 'fallback demand exposes oldest overdue action age');
  ok(/scheduledActionCount/.test(demandSource) && /nextActionDate/.test(demandSource) && /nextActionDays/.test(demandSource), 'fallback demand exposes nearest scheduled inbound action');
  ok(/scheduledActionItems/.test(demandSource) && /\.slice\(0, 20\)/.test(demandSource), 'fallback demand exposes bounded attributable scheduled actions');
  ok(/scheduledActionItems/.test(inboundSource) && /\.slice\(0, 20\)/.test(inboundSource), 'fallback inbound exposes bounded attributable scheduled actions');
  ok(/scheduledActionCount:\s*scheduledBySignal\.length/.test(demandSource), 'fallback demand counts scheduled signals instead of date tokens');
  ok(/dates:\s*\[nextDates\.sort\(\)\.at\(-1\)\], source:\s*['"]next['"]/.test(demandSource), 'fallback demand uses the latest dated next action');
  ok(/dates:\s*\[statusDates\.sort\(\)\.at\(-1\)\], source:\s*['"]status['"]/.test(demandSource), 'fallback demand uses the latest dated legacy status action');
  ok(/dueTodayActionCount/.test(demandSource) && /review warm inbound due today/.test(demandSource), 'fallback demand surfaces warm actions due today before draft work');
  ok(/const nextOnlyRecordsCompletedWork[\s\S]*nextDates\.length && !nextOnlyRecordsCompletedWork[\s\S]*dates:\s*\[statusDates\.sort\(\)\.at\(-1\)\], source:\s*['"]status['"]/.test(demandSource), 'fallback demand ignores completed next-step dates before selecting the latest legacy status action');
  ok(/const nextAgent = warmFreshness\.overdueActionCount > 0[\s\S]*review overdue warm inbound/.test(demandSource), 'fallback demand prioritizes overdue inbound over draft packs');
  ok(/nextAgent[\s\S]*overdueActionOldestDays[\s\S]*overdueActionItems\[0\]\?\.actionDate/.test(demandSource), 'fallback demand next identifies overdue age and operative action date');
  const orientSource = fs.readFileSync(path.join(ROOT, 'demigod-orient.mjs'), 'utf8');
  ok(/warmInbound:\s*\{[\s\S]*overdueActionCount[\s\S]*overdueActionOldestDays[\s\S]*quarantinedRows/.test(orientSource), 'fallback orient demand card carries warm urgency, age, and quarantine telemetry');
  ok(/overdueOldestDays\) \? `\/\$\{card\.demand\.warmInbound\.overdueOldestDays\}d`/.test(orientSource), 'fallback orient renders oldest overdue inbound age');
  ok(/pilots=\$\{card\.demand\?\.pilotsFilled[\s\S]*warm=\$\{card\.demand\?\.warmInbound\?\.count[\s\S]*overdue=/.test(orientSource), 'fallback orient keeps real pilots separate from warm inbound urgency');
  ok(/function isResolvedWarmDisposition\(/.test(demandSource) && /isResolvedWarmDisposition\(row\)/.test(demandSource), 'fallback demand does not age resolved warm actions as overdue');
  ok(/const actionableRows = currentRows\.filter\(\(row\) => !isResolvedWarmDisposition\(row\)\)/.test(demandSource) && /resolvedCount:\s*currentRows\.length - actionableRows\.length/.test(demandSource), 'fallback demand excludes resolved inbound from stale work telemetry');
  ok(/function latestWarmInboundSignals\(/.test(demandSource) && /warmInboundActionHealth\(currentRows, now\)/.test(demandSource), 'fallback demand urgency uses latest inbound state per identity');
  ok(/function warmInboundIdentityKey\([\s\S]*?row\?\.who[\s\S]*?row\?\.channel/.test(demandSource) && /const key = warmInboundIdentityKey\(row\)/.test(demandSource), 'fallback demand keeps same-name contacts on different channels separate');
  ok(/function warmInboundIdentityKey\([\s\S]*?\.split\([\s\S]*?\.sort\(\)[\s\S]*?\.join\(['"]\+['"]\)/.test(demandSource), 'fallback demand canonicalizes composite channel order');
  ok(/parts\.indexOf\(part\) === index/.test(demandSource), 'fallback demand deduplicates repeated composite channels');
  ok(/withdrawn\|opted out\|not \(\?:a fit\|interested\)/.test(demandSource), 'fallback demand recognizes explicit inbound opt-out dispositions');
  ok(/function countOpenPilotOs\(/.test(demandSource), 'fallback demand validates and deduplicates open pilot OS state');
  ok(/function countOpenPilotOs\([\s\S]*latestById\.set\(id, pilot\)[\s\S]*\[\.\.\.latestById\.values\(\)\]\.filter\(isOpenPilotOsSignal\)/.test(demandSource), 'fallback demand resolves latest pilot OS state before open filtering');
  ok(/boardEvidence/.test(demandSource) && /sampleRoles/.test(demandSource), 'fallback reports current board role evidence');
  ok(/function warmInboundFreshness\(/.test(inboundSource), 'fallback inbound exposes stale warm-inbound visibility');
  ok(/function warmQuarantineReason\(/.test(inboundSource) && /quarantineReasons/.test(inboundSource), 'fallback inbound explains quarantined warm rows');
  ok(/\.filter\(\(row\) => !warmQuarantineReason\(row\)\)/.test(inboundSource), 'fallback inbound promotes exactly the complement of quarantined warm rows');
  ok(/Warm health: overdue=\$\{warmFreshness\.overdueActionCount\}[\s\S]*quarantined=\$\{out\.warmInbound\.quarantinedRows\}/.test(inboundSource), 'fallback inbound text status exposes overdue and quarantine health');
  ok(/Quarantine: \$\{reasons \|\| ['"]unclassified['"]\}/.test(inboundSource), 'fallback inbound text status explains quarantine reasons');
  ok(/function explicitWarmNonSignalReason\(/.test(inboundSource) && /no_observed_inbound/.test(inboundSource), 'fallback inbound distinguishes explicit zero-inbound observations');
  ok(/quarantine\(['"]no_observed_inbound['"]\)/.test(demandSource), 'fallback demand distinguishes explicit zero-inbound observations');
  ok(/function warmInboundActionHealth\(/.test(inboundSource) && /overdueActionCount/.test(inboundSource), 'fallback inbound exposes overdue warm-inbound actions');
  ok(/overdueActionItems:\s*actionItems\(overdue\)/.test(inboundSource) && /dueTodayActionItems:\s*actionItems\(dueToday\)/.test(inboundSource), 'fallback inbound exposes bounded due-action detail');
  ok(/next:[\s\S]*\.trim\(\)\.slice\(0, 240\)/.test(inboundSource), 'fallback inbound bounds due-action detail');
  ok(/function warmInboundActionHealth\([\s\S]*actionScheduleFor[\s\S]*actionSource:\s*source[\s\S]*source === ['"]status['"] \? status/.test(inboundSource), 'fallback inbound identifies the text source for each operative action date');
  ok(/overdueActionOldestDays/.test(inboundSource), 'fallback inbound exposes oldest overdue action age');
  ok(/scheduledActionCount/.test(inboundSource) && /nextActionDate/.test(inboundSource) && /nextActionDays/.test(inboundSource), 'fallback inbound exposes nearest scheduled inbound action');
  ok(/scheduledActionCount:\s*scheduledBySignal\.length/.test(inboundSource), 'fallback inbound counts scheduled signals instead of date tokens');
  ok(/dates:\s*\[nextDates\.sort\(\)\.at\(-1\)\], source:\s*['"]next['"]/.test(inboundSource), 'fallback inbound uses the latest dated next action');
  ok(/dates:\s*\[statusDates\.sort\(\)\.at\(-1\)\], source:\s*['"]status['"]/.test(inboundSource), 'fallback inbound uses the latest dated legacy status action');
  ok(/dueTodayActionCount/.test(inboundSource) && /Inbound review due today:/.test(inboundSource), 'fallback inbound surfaces warm actions due today');
  ok(/const nextOnlyRecordsCompletedWork[\s\S]*nextDates\.length && !nextOnlyRecordsCompletedWork[\s\S]*dates:\s*\[statusDates\.sort\(\)\.at\(-1\)\], source:\s*['"]status['"]/.test(inboundSource), 'fallback inbound ignores completed next-step dates before selecting the latest legacy status action');
  ok(/function isResolvedWarmDisposition\(/.test(inboundSource) && /isResolvedWarmDisposition\(row\)/.test(inboundSource), 'fallback inbound does not age resolved warm actions as overdue');
  ok(/const actionableRows = currentRows\.filter\(\(row\) => !isResolvedWarmDisposition\(row\)\)/.test(inboundSource) && /resolvedCount:\s*currentRows\.length - actionableRows\.length/.test(inboundSource), 'fallback inbound excludes resolved inbound from stale work telemetry');
  ok(/function latestWarmInboundSignals\(/.test(inboundSource) && /warmInboundActionHealth\(currentRows, now\)/.test(inboundSource), 'fallback inbound urgency uses latest inbound state per identity');
  ok(/function warmInboundIdentityKey\([\s\S]*?row\?\.who[\s\S]*?row\?\.channel/.test(inboundSource) && /const key = warmInboundIdentityKey\(row\)/.test(inboundSource), 'fallback inbound keeps same-name contacts on different channels separate');
  ok(/function warmInboundIdentityKey\([\s\S]*?\.split\([\s\S]*?\.sort\(\)[\s\S]*?\.join\(['"]\+['"]\)/.test(inboundSource), 'fallback inbound canonicalizes composite channel order');
  ok(/parts\.indexOf\(part\) === index/.test(inboundSource), 'fallback inbound deduplicates repeated composite channels');
  ok(/withdrawn\|opted out\|not \(\?:a fit\|interested\)/.test(inboundSource), 'fallback inbound recognizes explicit inbound opt-out dispositions');
  ok(/warmFreshness\.overdueActionCount > 0[\s\S]*Inbound review overdue:/.test(inboundSource), 'fallback inbound prioritizes overdue action health in next summary');
  ok(/Inbound review overdue:[\s\S]*overdueActionOldestDays[\s\S]*overdueActionItems\[0\]\?\.actionDate/.test(inboundSource), 'fallback inbound next identifies overdue age and operative action date');
  ok((inboundSource.match(/const staleWho = \[\.\.\.new Map\(/g) || []).length === 1, 'fallback inbound deduplicates stale identities without hiding stale events');
  ok((demandSource.match(/const staleWho = \[\.\.\.new Map\(/g) || []).length === 1, 'fallback demand deduplicates stale identities without hiding stale events');
  ok(/Array\.isArray\(pilotsOs\?\.pilots\)/.test(inboundSource), 'fallback inbound tolerates malformed pilot OS store');
  ok(/function isOpenPilotOsSignal\(/.test(inboundSource), 'fallback validates open pilot OS identity');
  ok(/function hasObservedPilotTimestamp\(/.test(inboundSource), 'fallback inbound rejects impossible pilot OS timestamps');
  ok(/function hasObservedPilotTimestamp\(/.test(demandSource), 'fallback demand rejects impossible pilot OS timestamps');
  ok(/function isObservedTimestamp\([\s\S]*isIsoCalendarDate\(text\.slice\(0, 10\)\)/.test(inboundSource), 'fallback inbound validates pilot OS timestamp calendar dates');
  ok(/function isObservedTimestamp\([\s\S]*isIsoCalendarDate\(text\.slice\(0, 10\)\)/.test(demandSource), 'fallback demand validates pilot OS timestamp calendar dates');
  ok(/return isObservedTimestamp\(pilot\.at\)/.test(inboundSource), 'fallback inbound applies strict timestamp evidence gate');
  ok(/return isObservedTimestamp\(pilot\.at\)/.test(demandSource), 'fallback demand applies strict timestamp evidence gate');
  ok(/function isReplyableContact\(/.test(inboundSource) && /isReplyableContact\(pilot\.contact\)/.test(inboundSource), 'fallback inbound requires replyable pilot OS contact');
  ok(/function isReplyableContact\(/.test(demandSource) && /isReplyableContact\(pilot\.contact\)/.test(demandSource), 'fallback demand requires replyable pilot OS contact');
  ok(/digits\.length >= 7 && digits\.length <= 15/.test(inboundSource), 'fallback inbound bounds phone evidence to 7–15 digits');
  ok(/digits\.length >= 7 && digits\.length <= 15/.test(demandSource), 'fallback demand bounds phone evidence to 7–15 digits');
  ok(/function latestPilotOsSignals\([\s\S]*latestById\.set\(id, pilot\)[\s\S]*latestPilotOsSignals\(pilotRows\)\.filter\(isOpenPilotOsSignal\)/.test(inboundSource), 'fallback inbound resolves latest pilot OS state before open filtering');
  ok(/function dedupeActivePipelineSignals\(/.test(inboundSource), 'fallback deduplicates active pipeline identity');
  ok(
    /function dedupeActivePipelineSignals\([\s\S]*latestById\.set\(id, pilot\)[\s\S]*return \[\.\.\.latestById\.values\(\)\]/.test(inboundSource),
    'fallback inbound keeps latest active-pipeline state',
  );
  ok(
    /newest observed state for each ID[\s\S]*latestById\.set\(String\(row\.id\)\.trim\(\)\.toLowerCase\(\), row\)/.test(demandSource),
    'fallback demand keeps latest active-pipeline state',
  );
  ok(
    /activePipeline:\s*\{[\s\S]*rows:\s*realActive\.length[\s\S]*rawRows:\s*activeParsed\.rawRows[\s\S]*quarantinedRows:\s*activeParsed\.rawRows\s*-\s*realActive\.length/.test(inboundSource),
    'fallback inbound never presents raw Markdown rows as observed pilots',
  );
  ok(
    /pilots:\s*\{[\s\S]*tableRows:\s*pilots\.length[\s\S]*realFilled:\s*realPilots\.length[\s\S]*quarantinedRows:\s*pilots\.length\s*-\s*realPilots\.length/.test(demandSource),
    'fallback demand exposes quarantined pilot rows separately',
  );
  ok(/const WARM_HEADING_RE\s*=\s*\/\^##/.test(inboundSource), 'fallback warm parser requires canonical heading');
  ok(
    /const quarantinePreHeaderRows[\s\S]*invalidSchemaRows \+= 1[\s\S]*quarantinePreHeaderRows\(lines\.slice\(1, headerIndex\)\)/.test(inboundSource),
    'fallback inbound quarantines row-shaped warm content before the canonical header',
  );
  ok(/const ACTIVE_HEADING_RE\s*=\s*\/\^##[\s\S]*fill by hand/.test(inboundSource), 'fallback inbound recognizes the canonical active-pipeline heading and its log-template label');
  ok(/function parseActiveTableDetailed\([\s\S]*md\.search\(ACTIVE_HEADING_RE\)/.test(inboundSource), 'fallback inbound scopes active rows to canonical section');
  ok(
    /function parseWarmTable\(/.test(inboundSource) &&
      /if \(headerIndex < 0\) \{[\s\S]*invalidSchemaRows \+= 1[\s\S]*return \{ rows, rawRows, invalidSchemaRows \}/.test(inboundSource),
    'fallback inbound warm parser quarantines row-shaped content without a canonical table header',
  );
  ok(
    (inboundSource.match(/for \(const line of lines\.slice\(headerIndex \+ 1\)\)/g) || []).length === 1,
    'fallback inbound warm parser scans each canonical table row once',
  );
  ok(/invalidSchemaRows \+= 1/.test(inboundSource) && /quarantineReasons\.invalid_schema = warmParsed\.invalidSchemaRows/.test(inboundSource), 'fallback inbound reports malformed warm rows as quarantined schema telemetry');
  ok(
    /latestPilotOsSignals\(pilotRows\)\.filter\(isOpenPilotOsSignal\)/.test(inboundSource),
    'fallback resolves latest pilot OS state before applying honesty gate',
  );
  ok(
    /partialRealRow\s*=\s*!founderPlaceholder\s*&&[\s\S]*\[id, founder, role, outcome90, status, next\]\.some\(placeholder\)/.test(demandSource) &&
      /if \(partialRealRow\) continue/.test(demandSource),
    'fallback demand rejects partial active rows',
  );
  ok(
    /\[row\.id, row\.founder, row\.role, row\.outcome90, row\.status, row\.next\][\s\S]*\.some\(isPlaceholderIdentity\)/.test(inboundSource),
    'fallback inbound rejects partial active rows without disposition',
  );
  const n = buildNext();
  ok(Boolean(n.id && n.cmd && n.title), 'fallback buildNext shape');
  ok(typeof n.freeze?.on === 'boolean', 'fallback buildNext freeze state');
  ok(typeof n.truthEvidence?.green === 'boolean', 'fallback buildNext truth evidence');
  const pass = fails.length === 0;
  writeReceipt(pass, { mode: 'in-process-fallback' });
  if (!pass) {
    console.error('FAIL', fails);
    process.exit(1);
  }
  console.error('DEGRADED demigod-demand-selftest: fallback contracts pass; OS execution unverified');
  process.exit(2);
}

function writeReceipt(pass, { mode = 'full' } = {}) {
  const degraded = mode !== 'full';
  const blocked = spawnErrors.length > 0;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    schema: 'demigod.demand-selftest/1',
    at: new Date().toISOString(),
    pass: pass && !degraded && !blocked,
    contractPass: pass,
    osAttested: pass && !degraded && !blocked,
    mode,
    degraded,
    blocked,
    failureKind: blocked ? 'child-start' : (!pass && fails.length ? 'contract' : null),
    fails,
    spawnErrors,
  }, null, 2) + '\n');
}

function run(script, args = [], env = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    // Demand canaries must never replace the production status card read by
    // orient. Individual cases can still override this explicit test path.
    env: { ...process.env, DEMIGOD_DEMAND_STATUS: SELFTEST_STATUS, ...env },
  });
  // Node 24 can expose a spawn error alongside a misleading numeric status.
  // Normalize it so an empty capture can never look like a successful canary.
  if (result.error) {
    spawnErrors.push({
      script,
      code: result.error.code || null,
      message: result.error.message,
    });
    return {
      ...result,
      status: null,
      stdout: result.stdout || '',
      stderr: `${result.stderr || ''}${result.error.code || 'SPAWN'}: ${result.error.message}\n`,
    };
  }
  return result;
}

const st = run('demigod-demand.mjs', ['status', '--json']);
if (spawnErrors.length) {
  if (spawnErrors[0].code === 'EPERM') runSandboxFallback();
  writeReceipt(false);
  console.error(`BLOCKED demand-selftest: child process unavailable (${spawnErrors[0].code || 'unknown'})`);
  process.exit(2);
}
ok(st.status === 0, 'demand status exit 0');
let demand = null;
try {
  demand = JSON.parse(st.stdout.slice(st.stdout.indexOf('{')));
} catch {
  /* */
}
ok(demand?.honesty?.inventsPilots === false, 'no invent pilots');
ok(demand?.honesty?.agentNeverAutoSends === true || demand?.honesty?.autoDmAllowed === false, 'auto-DM stopped');
ok(demand?.honesty?.markSentRequiresAttestation === true, 'mark-sent attestation flag');
ok(demand?.statusPath === SELFTEST_STATUS, 'selftest isolates materialized demand status');
ok(typeof demand?.dms?.sentConfirmed === 'number', 'sentConfirmed is number');
ok(Number.isInteger(demand?.dms?.malformedReceipts), 'malformed receipt quarantine count present');
ok(demand?.dms?.malformedReceiptReasons && typeof demand.dms.malformedReceiptReasons === 'object', 'malformed receipt quarantine reasons present');
ok(typeof demand?.queue?.pending === 'number', 'pending is number');
ok(demand?.pilots?.realFilled === 0 || demand?.pilots?.realFilled > 0, 'realFilled present');
ok(Number.isInteger(demand?.pilots?.pilotOsOpen), 'open pilot OS count present');
ok(Number.isInteger(demand?.pilots?.boardEvidence?.realRoles), 'board real-role evidence present');
ok(Number.isInteger(demand?.pilots?.boardEvidence?.sampleRoles), 'board sample-role evidence present');
if (demand?.pilots?.realFilled === 0) {
  ok(true, 'zero real pilots allowed (honest)');
}

const q = run('demigod-demand.mjs', ['queue', '--json']);
ok(q.status === 0, 'demand queue');

// Webhook-shaped warm input is untrusted. Oversized fields and terminal
// controls must fail before the append-only pilot log is touched.
const invalidWarmLog = path.join('/tmp/dg-busy/demand-canary', 'PILOT-LOG-invalid-warm.md');
fs.mkdirSync(path.dirname(invalidWarmLog), { recursive: true });
const invalidWarmSeed = '# Pilot log\n\n## Warm inbound (not a pilot yet)\n| Who | Channel | Status | Next | Date |\n|-----|---------|--------|------|------|\n';
fs.writeFileSync(invalidWarmLog, invalidWarmSeed);
const oversizedWarm = run('demigod-pilot-inbound.mjs', [
  'warm', '--who=Real Founder', '--channel=email', '--status=new', `--next=${'x'.repeat(501)}`, '--json',
], { DEMIGOD_PILOT_LOG: invalidWarmLog });
ok(oversizedWarm.status === 1, 'oversized warm field refuses');
ok(/warm_field_invalid/.test(oversizedWarm.stderr), 'oversized warm refusal is explicit');
ok(fs.readFileSync(invalidWarmLog, 'utf8') === invalidWarmSeed, 'oversized warm field does not mutate pilot log');
const controlWarm = run('demigod-pilot-inbound.mjs', [
  'warm', '--who=Real Founder', '--channel=email', '--status=new\u001b[31m', '--next=review', '--json',
], { DEMIGOD_PILOT_LOG: invalidWarmLog });
ok(controlWarm.status === 1, 'control-bearing warm field refuses');
ok(/warm_field_invalid/.test(controlWarm.stderr), 'control-bearing warm refusal is explicit');
ok(fs.readFileSync(invalidWarmLog, 'utf8') === invalidWarmSeed, 'control-bearing warm field does not mutate pilot log');

// A legacy environment flag must not widen the startup tool's authority.
// The command must refuse before it can delegate to the browser sender.
const sendOverride = run('demigod-demand.mjs', ['send', '--name=T0'], {
  DEMIGOD_ALLOW_AUTO_DM: '1',
});
ok(sendOverride.status === 2, 'legacy auto-DM flag cannot bypass drafts-only gate');
let sendOverrideJson = null;
try {
  sendOverrideJson = JSON.parse(sendOverride.stderr.slice(sendOverride.stderr.indexOf('{')));
} catch {
  fails.push('auto-DM override refusal json parse');
}
ok(sendOverrideJson?.error === 'auto_dm_stopped', 'auto-DM override refusal is explicit');
ok(sendOverrideJson?.overrideAllowed === false, 'auto-DM override reports immutable policy');

// Only the canonical seven-column queue table is demand. A second table,
// duplicate handle, shifted row, or invalid handle must not inflate pending.
const queueCanary = path.join('/tmp/dg-busy/demand-canary', 'QUEUE.md');
fs.mkdirSync(path.dirname(queueCanary), { recursive: true });
fs.writeFileSync(queueCanary, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | Real | @real_handle | Co | hiring | https://example.test | receipt |
| high | Duplicate | @real_handle | Other | duplicate | https://example.test | receipt |
| high | Shifted | @shifted | Co | missing columns |
| high | Invalid | not-a-handle | Co | invalid | https://example.test | receipt |

## Notes
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | Ghost | @ghost_table | Fake | note only | https://example.test | receipt |
`);
const queueCanaryRun = run('demigod-demand.mjs', ['queue', '--json'], { DEMIGOD_QUEUE_MD: queueCanary });
let queueCanaryJson = null;
try {
  queueCanaryJson = JSON.parse(queueCanaryRun.stdout.slice(queueCanaryRun.stdout.indexOf('{')));
} catch {
  fails.push('queue canary json parse');
}
ok(queueCanaryRun.status === 0, 'queue canary runs');
ok(queueCanaryJson?.rows?.length === 1, 'queue parser rejects duplicate, shifted, invalid, and secondary-table rows');
ok(queueCanaryJson?.rows?.[0]?.handle === '@real_handle', 'queue canary preserves canonical row');

// Ready-email selection is recipient-sensitive. A short name must not load a
// different person's draft merely because its slug is a filename substring.
const draftRoot = path.join(canaryDir, 'draft-root');
const draftReady = path.join(draftRoot, 'demigod-outreach', 'ready-emails');
fs.rmSync(draftRoot, { recursive: true, force: true });
fs.mkdirSync(draftReady, { recursive: true });
const draftDay = (offset) => {
  // Match demand's America/Los_Angeles operating day for ready-email dates.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.now() + offset * 86400000));
  const v = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${v.year}-${v.month}-${v.day}`;
};
const d0 = draftDay(0);
const d1 = draftDay(-1);
const d2 = draftDay(-2);
fs.writeFileSync(path.join(draftReady, `dm-${d1}-joann.txt`), 'Hi Joann,\n\nWrong recipient.\n');
fs.writeFileSync(path.join(draftReady, `dm-${d2}-ann.txt`), 'Hi Ann,\n\nStale exact-recipient revision.\n');
fs.writeFileSync(path.join(draftReady, `dm-${d1}-ann.txt`), 'Hi Ann,\n\nLatest exact-recipient revision.\n');
const exactDraftQueue = path.join(draftRoot, 'QUEUE.md');
fs.writeFileSync(exactDraftQueue, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | Ann | @ann_exact | Exact Co | hiring | https://example.test | receipt |
`);
const exactDraftRun = run('demigod-demand.mjs', ['draft', '--name=Ann', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let exactDraft = null;
try {
  exactDraft = JSON.parse(exactDraftRun.stdout.slice(exactDraftRun.stdout.indexOf('{')));
} catch {
  fails.push('exact-recipient draft json parse');
}
ok(exactDraftRun.status === 0, 'exact-recipient draft canary runs');
ok(/Latest exact-recipient revision/.test(exactDraft?.body || ''), 'ready draft selects latest exact-recipient revision');
ok(!/Stale exact-recipient revision/.test(exactDraft?.body || ''), 'ready draft rejects stale exact-recipient revision');
ok(!/Wrong recipient/.test(exactDraft?.body || ''), 'ready draft rejects recipient substring collision');

fs.writeFileSync(path.join(draftReady, `dm-${d0}-ann.txt`), 'Hi Joann,\n\nCopy residue.\n');
const mismatchedGreetingRun = run('demigod-demand.mjs', ['draft', '--name=Ann', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let mismatchedGreetingDraft = null;
try {
  mismatchedGreetingDraft = JSON.parse(mismatchedGreetingRun.stdout.slice(mismatchedGreetingRun.stdout.indexOf('{')));
} catch {
  fails.push('recipient-mismatch draft json parse');
}
ok(mismatchedGreetingRun.status === 0, 'recipient-mismatch canary runs without sending');
ok(
  mismatchedGreetingDraft?.hygiene?.flags?.some((flag) => flag.id === 'recipient_mismatch' && flag.sev === 'error'),
  'draft hygiene blocks a person-name greeting mismatch',
);

fs.writeFileSync(
  path.join(draftReady, `dm-${d1}-traction.txt`),
  "Hi Traction,\n\nWe've already placed 12 engineers and we're running multiple active pilots.\n",
);
fs.writeFileSync(exactDraftQueue, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | Traction | @traction_claim | Truth Co | hiring | https://example.test | receipt |
`);
const tractionDraftRun = run('demigod-demand.mjs', ['draft', '--name=Traction', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let tractionDraft = null;
try {
  tractionDraft = JSON.parse(tractionDraftRun.stdout.slice(tractionDraftRun.stdout.indexOf('{')));
} catch {
  fails.push('traction draft json parse');
}
ok(tractionDraftRun.status === 0, 'invented-traction draft canary runs');
ok(
  tractionDraft?.hygiene?.flags?.some((flag) => flag.id === 'unverified_traction' && flag.sev === 'error'),
  'draft hygiene blocks unverified Demigod traction',
);

fs.writeFileSync(
  path.join(draftReady, `dm-${d1}-merge.txt`),
  'Hi ${name},\n\nSaw %COMPANY% is hiring.\n',
);
fs.writeFileSync(exactDraftQueue, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | Merge | @merge_test | Exact Co | hiring | https://example.test | receipt |
`);
const mergeDraftRun = run('demigod-demand.mjs', ['draft', '--name=Merge', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let mergeDraft = null;
try {
  mergeDraft = JSON.parse(mergeDraftRun.stdout.slice(mergeDraftRun.stdout.indexOf('{')));
} catch {
  fails.push('merge-token draft json parse');
}
ok(mergeDraftRun.status === 0, 'alternate merge-token draft canary runs without sending');
ok(
  mergeDraft?.hygiene?.flags?.some((flag) => flag.id === 'unresolved_merge_token' && flag.sev === 'error'),
  'draft hygiene blocks shell-style and percent-style merge residue',
);

// Draft hygiene must catch timing and volume promises beyond the legacy
// 24/48-hour and 3-5-candidate phrases.
fs.writeFileSync(
  path.join(draftReady, `dm-${d1}-promise.txt`),
  'Hi Promise,\n\nWe guarantee a match by tomorrow.\n',
);
fs.writeFileSync(exactDraftQueue, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | Promise | @promise_test | Exact Co | hiring | https://example.test | receipt |
`);
const promiseDraftRun = run('demigod-demand.mjs', ['draft', '--name=Promise', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let promiseDraft = null;
try {
  promiseDraft = JSON.parse(promiseDraftRun.stdout.slice(promiseDraftRun.stdout.indexOf('{')));
} catch {
  fails.push('promise draft json parse');
}
ok(promiseDraftRun.status === 0, 'promise draft canary runs without sending');
ok(promiseDraft?.hygiene?.ok === false, 'guaranteed by-tomorrow promise fails hygiene');
ok(
  promiseDraft?.hygiene?.flags?.some((flag) => flag.id === 'service_promise' && flag.sev === 'error'),
  'promise draft reports service_promise error',
);

fs.writeFileSync(
  path.join(draftReady, `dm-${d1}-timed.txt`),
  'Hi Timed,\n\nWe will follow up within 2 business days.\n',
);
fs.writeFileSync(exactDraftQueue, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | Timed | @timed_test | Exact Co | hiring | https://example.test | receipt |
`);
const timedDraftRun = run('demigod-demand.mjs', ['draft', '--name=Timed', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let timedDraft = null;
try {
  timedDraft = JSON.parse(timedDraftRun.stdout.slice(timedDraftRun.stdout.indexOf('{')));
} catch {
  fails.push('timed promise draft json parse');
}
ok(timedDraftRun.status === 0, 'numeric timing-promise canary runs without sending');
ok(
  timedDraft?.hygiene?.flags?.some((flag) => flag.id === 'service_promise' && flag.sev === 'error'),
  'numeric business-day promise reports service_promise error',
);

fs.writeFileSync(
  path.join(draftReady, `dm-${d1}-alt-timed.txt`),
  'Hi AltTimed,\n\nWe will follow up in 2 days and share matches in under 24 hours.\n',
);
fs.writeFileSync(exactDraftQueue, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | AltTimed | @alt_timed_test | Exact Co | hiring | https://example.test | receipt |
`);
const altTimedDraftRun = run('demigod-demand.mjs', ['draft', '--name=AltTimed', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let altTimedDraft = null;
try {
  altTimedDraft = JSON.parse(altTimedDraftRun.stdout.slice(altTimedDraftRun.stdout.indexOf('{')));
} catch {
  fails.push('alternate timing-promise draft json parse');
}
ok(altTimedDraftRun.status === 0, 'alternate timing-promise canary runs without sending');
ok(
  altTimedDraft?.hygiene?.flags?.some((flag) => flag.id === 'service_promise' && flag.sev === 'error'),
  'in/under numeric timing promise reports service_promise error',
);

fs.writeFileSync(
  path.join(draftReady, `dm-${d1}-meet-volume.txt`),
  'Hi MeetVolume,\n\nMeet your 3 candidates and choose the strongest fit.\n',
);
fs.writeFileSync(exactDraftQueue, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | MeetVolume | @meet_volume | Exact Co | hiring | https://example.test | receipt |
`);
const meetVolumeDraftRun = run('demigod-demand.mjs', ['draft', '--name=MeetVolume', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let meetVolumeDraft = null;
try {
  meetVolumeDraft = JSON.parse(meetVolumeDraftRun.stdout.slice(meetVolumeDraftRun.stdout.indexOf('{')));
} catch {
  fails.push('imperative volume-promise draft json parse');
}
ok(meetVolumeDraftRun.status === 0, 'imperative volume-promise canary runs without sending');
ok(
  meetVolumeDraft?.hygiene?.flags?.some((flag) => flag.id === 'service_promise' && flag.sev === 'error'),
  'imperative numeric candidate promise reports service_promise error',
);

fs.writeFileSync(
  path.join(draftReady, `dm-${d1}-feefalse.txt`),
  'Hi FeeFalse,\n\nHiring is free for startups. Candidates are free too.\n',
);
fs.writeFileSync(exactDraftQueue, `# Queue
| Prio | Name | Handle | Company | Why first | Open | After send |
|---|---|---|---|---|---|---|
| high | FeeFalse | @fee_false | Exact Co | hiring | https://example.test | receipt |
`);
const falseFeeDraftRun = run('demigod-demand.mjs', ['draft', '--name=FeeFalse', '--json'], {
  DEMIGOD_ROOT: draftRoot,
  DEMIGOD_QUEUE_MD: exactDraftQueue,
});
let falseFeeDraft = null;
try {
  falseFeeDraft = JSON.parse(falseFeeDraftRun.stdout.slice(falseFeeDraftRun.stdout.indexOf('{')));
} catch {
  fails.push('false-fee draft json parse');
}
ok(falseFeeDraftRun.status === 0, 'false-fee draft canary runs without sending');
ok(
  falseFeeDraft?.hygiene?.flags?.some((flag) => flag.id === 'false_fee_claim' && flag.sev === 'error'),
  'founder-side free claim reports false_fee_claim error',
);

const t = run('demigod-demand.mjs', ['templates']);
ok(t.status === 0, 'demand templates');
ok(/REPLY-TEMPLATES|reply/i.test(t.stdout), 'templates mention reply');

// draft (never sends)
const dr = run('demigod-demand.mjs', ['draft', '--name=T0', '--json']);
ok(dr.status === 0, 'demand draft T0');
try {
  const d = JSON.parse(dr.stdout.slice(dr.stdout.indexOf('{')));
  ok(d.neverSends === true, 'draft neverSends');
  ok(d.handle && d.body, 'draft has handle+body');
  ok(/i-sent-it/.test(d.afterSend || ''), 'draft afterSend requires i-sent-it');
  ok(d.hygiene && typeof d.hygiene.ok === 'boolean', 'draft has hygiene');
  ok(Array.isArray(d.hygiene.flags), 'hygiene.flags array');
} catch {
  fails.push('draft json parse');
}

// status includes drafts.top3 hygiene
ok(Array.isArray(demand?.drafts?.top3), 'status drafts.top3');
if (demand?.queue?.pending > 0) {
  ok(demand.drafts.top3.length > 0, 'top3 drafts when pending');
  ok(typeof demand.drafts.allHygieneOk === 'boolean', 'allHygieneOk bool');
}

// send refused without opt-in
const sendR = run('demigod-demand.mjs', ['send', '--name=T0']);
ok(sendR.status === 2, 'send refused exit 2 without ALLOW_AUTO_DM');
ok(/auto_dm_stopped|drafts-only/i.test(sendR.stderr + sendR.stdout), 'send refuse message');

// Invalid WIZ identity must fail before intake or warm-log mutation.
const invalidWiz = run('demigod-pilot-inbound.mjs', ['from-wiz', '--90d=Ship a measurable v1']);
ok(invalidWiz.status === 2, 'pilot inbound rejects missing WIZ email');
const invalidOsBrief = run('demigod-pilot-inbound.mjs', [
  'from-wiz',
  '--email=founder@example.com',
  '--90d=Ship a measurable v1',
  '--os',
]);
ok(invalidOsBrief.status === 2, 'pilot inbound rejects OS open without a real brief');
ok(/pilot_os_brief_required/.test(invalidOsBrief.stderr), 'missing OS brief refusal is structured');
ok(/wiz_email_invalid/.test(invalidWiz.stderr + invalidWiz.stdout), 'invalid WIZ email has stable error');

// freeze must not block demand
const freeze = freezeStatus();
ok(st.status === 0, 'demand works regardless of freeze=' + (freeze.frozen ? 'ON' : 'OFF'));

// next builder
const n = buildNext();
ok(n.id && n.cmd && n.title, 'buildNext shape');
ok(typeof n.freeze?.on === 'boolean', 'next has freeze');
ok(typeof n.truthEvidence?.green === 'boolean', 'next has truthEvidence');
const te = refuseIfStale('truth');
if (te.green && freeze.frozen) {
  ok(n.id === 'demand-human' || n.cmd.includes('demand') || n.id === 'demand-ops', 'green+freeze → demand next');
  ok(n.mutate === false, 'demand next not mutate');
}
if (!te.green) {
  ok(n.id === 'truth', 'stale → truth next');
}

const nx = run('demigod-next.mjs', ['--json']);
ok(nx.status === 0, 'demigod-next CLI');
ok(fs.existsSync('/tmp/dg-busy/next.json'), 'next.json written');

// ledger
const led = path.join(ROOT, 'DEMIGOD-VERSION-LEDGER.jsonl');
const truth = run('demigod-truth.mjs', ['--quiet']);
ok([0, 1].includes(Number(truth.status)), 'truth runs for ledger');
ok(fs.existsSync(led), 'version ledger file exists');
const last = fs.readFileSync(led, 'utf8').trim().split('\n').pop();
let line = null;
try {
  line = JSON.parse(last);
} catch {
  /* */
}
ok(line && line.diskVer, 'ledger last line has diskVer');
ok(typeof line.freeze === 'boolean', 'ledger freeze boolean');

// refuse inventing high sent counts when log empty
// A malformed/transient status response should fail assertions, not crash the suite.
if (demand?.dms?.sentConfirmed === 0) {
  ok(!/sent 1[5-9]|15\+ DMs/i.test(st.stdout), 'no fake high sent counts in text');
}

// --- CANARY: adversarial false-green (Codex N-D2) ---
fs.mkdirSync(canaryDir, { recursive: true });
process.on('exit', () => fs.rmSync(canaryDir, { recursive: true, force: true }));
const canaryLog = path.join(canaryDir, 'dm-send-log.txt');
const canaryPilot = path.join(canaryDir, 'PILOT-LOG.md');

// ghost SENT must not invent queue names as confirmed; sentConfirmed may count log lines
fs.writeFileSync(
  canaryLog,
  'SENT-CONFIRMED | 2026-07-15 | @ghost_not_in_queue | FakeCo | x | attested=1\n',
);
const canarySt = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_DM_LOG: canaryLog,
});
ok(canarySt.status === 0, 'canary demand status runs');
let canary = null;
try {
  canary = JSON.parse(canarySt.stdout.slice(canarySt.stdout.indexOf('{')));
} catch {
  fails.push('canary json parse');
}
if (canary) {
  ok(canary.dms.sentConfirmed >= 1, 'canary counts log SENT-CONFIRMED lines');
  ok(Array.isArray(canary.queue.ghostHandlesOutsideQueue), 'ghostHandlesOutsideQueue present');
  ok(
    (canary.queue.ghostHandlesOutsideQueue || []).some((h) => h.includes('ghost')),
    'ghost handle flagged outside queue',
  );
  // queue.sentConfirmedInQueue only for queue names — ghost alone should not invent queue names
  ok(canary.honesty.inventsPilots === false, 'canary still inventsPilots false');
  ok(canary.pilots.realFilled === 0 || typeof canary.pilots.realFilled === 'number', 'realFilled numeric');
}

// UNATTESTED must not count as sentConfirmed
fs.writeFileSync(
  canaryLog,
  'SENT-UNATTESTED | 2026-07-15 | @ghost2 | FakeCo | x | attested=0\n',
);
const unSt = run('demigod-demand.mjs', ['status', '--json'], { DEMIGOD_DM_LOG: canaryLog });
let un = null;
try {
  un = JSON.parse(unSt.stdout.slice(unSt.stdout.indexOf('{')));
} catch {
  /* */
}
ok(un && un.dms.sentConfirmed === 0, 'UNATTESTED does not count as sentConfirmed');
ok(un && un.dms.sentUnattested >= 1, 'UNATTESTED tracked separately');

// The log is append-only: attestation may arrive after an unattested attempt.
// Once confirmed, that handle belongs to exactly one evidence bucket.
const promotedDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
fs.writeFileSync(
  canaryLog,
  [
    `SENT-UNATTESTED | ${promotedDate} | @promoted | Real Co | dm | attested=0`,
    `SENT-CONFIRMED | ${promotedDate} | @promoted | Real Co | dm | attested=1 | via=human`,
  ].join('\n') + '\n',
);
const promotedStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_DM_LOG: canaryLog,
});
let promoted = null;
try {
  promoted = JSON.parse(promotedStatus.stdout.slice(promotedStatus.stdout.indexOf('{')));
} catch {
  fails.push('promoted receipt json parse');
}
ok(promotedStatus.status === 0, 'promoted receipt status runs');
ok(promoted?.dms?.sentConfirmed === 1, 'promoted handle counts once as confirmed');
ok(promoted?.dms?.sentUnattested === 0, 'promoted handle leaves unattested telemetry');

// Unattested telemetry is not confirmed evidence, but it must still be
// canonical: keyword-shaped notes, future/malformed rows, and duplicates do
// not represent distinct observed send attempts.
const todayUnattested = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
fs.writeFileSync(
  canaryLog,
  [
    `SENT-UNATTESTED | ${todayUnattested} | @real_unattested | Real Co | x | attested=0`,
    `SENT-UNATTESTED | ${todayUnattested} | @REAL_UNATTESTED | Real Co | x | attested=0`,
    `note: SENT-UNATTESTED | ${todayUnattested} | @note_only | Fake Co | x | attested=0`,
    'SENT-UNATTESTED | 2999-01-01 | @future | Fake Co | x | attested=0',
    `SENT-UNATTESTED | ${todayUnattested} | no-at-handle | Fake Co | x | attested=0`,
    `SENT-UNATTESTED | ${todayUnattested} | @contradictory | Fake Co | x | attested=1`,
    `SENT-UNATTESTED | ${todayUnattested} | @missing_metadata | Fake Co | x`,
  ].join('\n') + '\n',
);
const canonicalUnattestedStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_DM_LOG: canaryLog,
});
let canonicalUnattested = null;
try {
  canonicalUnattested = JSON.parse(
    canonicalUnattestedStatus.stdout.slice(canonicalUnattestedStatus.stdout.indexOf('{')),
  );
} catch {
  fails.push('canonical unattested canary json parse');
}
ok(canonicalUnattestedStatus.status === 0, 'canonical unattested canary runs');
ok(canonicalUnattested?.dms?.sentUnattested === 1, 'only one unique canonical unattested receipt counts');

// Keyword-shaped notes, malformed/future receipts, missing/false attestation, and duplicate
// sync rows must never inflate confirmed demand.
const receiptCanary = path.join(canaryDir, 'dm-receipt-canary.txt');
// Pacific, not UTC. The code under test gates date-only evidence on
// operatingDateKey() (America/Los_Angeles) and quarantines FUTURE-dated rows —
// correctly, since a pilot cannot have been delivered tomorrow. A UTC fixture
// date reads as tomorrow from 17:00 PDT until midnight, so these canaries were
// red ~7h every evening and green every morning. That flakiness is why 4
// selftests sat red and ignored while the loops ran them every 90s.
const todayReceipt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
fs.writeFileSync(
  receiptCanary,
  [
    `SENT-CONFIRMED | ${todayReceipt} | @real_receipt | Real Co | x | attested=1 | via=human`,
    `SENT-CONFIRMED | ${todayReceipt} | @REAL_RECEIPT | Real Co | x | attested=1 | via=human`,
    `note: SENT-CONFIRMED | ${todayReceipt} | @note_only | Fake Co | x | attested=1`,
    'SENT-CONFIRMED | 2999-01-01 | @future | Fake Co | x | attested=1',
    `SENT-CONFIRMED | ${todayReceipt} | no-at-handle | Fake Co | x | attested=1`,
    `SENT-CONFIRMED | ${todayReceipt} | @not_attested | Fake Co | x | attested=0`,
    `SENT-CONFIRMED | ${todayReceipt} | @missing_attestation | Fake Co | x`,
    `SENT-CONFIRMED | ${todayReceipt} | @agent_auto | Fake Co | x | attested=1 | via=agent-auto`,
    `SENT-CONFIRMED | ${todayReceipt} | @contradictory_attestation | Fake Co | x | attested=1 | attested=0 | via=human`,
    `SENT-CONFIRMED | ${todayReceipt} | @duplicate_via | Fake Co | x | attested=1 | via=human | via=agent-auto`,
  ].join('\n') + '\n',
);
const receiptStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_DM_LOG: receiptCanary,
});
let receiptDemand = null;
try {
  receiptDemand = JSON.parse(receiptStatus.stdout.slice(receiptStatus.stdout.indexOf('{')));
} catch {
  fails.push('canonical receipt canary json parse');
}
ok(receiptStatus.status === 0, 'canonical receipt canary runs');
ok(receiptDemand?.dms?.sentConfirmed === 1, 'only one unique canonical observed receipt counts');
ok(receiptDemand?.dms?.malformedReceiptReasons?.prohibited_auto_send === 1, 'auto-send receipt has a distinct quarantine reason');
ok(receiptDemand?.dms?.malformedReceiptReasons?.conflicting_metadata === 2, 'duplicate reserved receipt metadata is classified');

// Empty pilot placeholders must not bump realFilled
// Dates are relative to America/Los_Angeles operating day (see d0/d1/d2).
fs.writeFileSync(
  canaryPilot,
  `# Pilot log\n\n## Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|----|---------|------|----------------|--------|------|------|\n| x | **—** | — | — | — | — | — |\n| fixture | Acme fixture | Engineer | Ship demo | test fixture | ignore | ${d1} |\n| partial | Real Founder | — | — | active | review | ${d1} |\n| truncated | Real Name | Engineer | Ship v1 |\n\n## Warm inbound\n   | Who | Channel | Status | Next | Date |\n   |-----|---------|--------|------|------|\n   | Douglas | email + Calendly | call | note | ${d2} |\n| — | — | — | — | — |\n| **—** | email | new | review | ${d0} |\n| \`TBD\` | form | new | review | ${d0} |\n| Acme fixture | form | test noise only | ignore | ${d1} |\n| Casey | email | Channel partner replied | review | ${d0} |\n| Willa | email | withdrawn | closed | ${d1} |\n| Omar | form | opted out | no follow-up | ${d1} |\n| Nina | email | not interested | done | ${d1} |\n`,
);
fs.appendFileSync(
  canaryPilot,
  `| Truncated Person | email | new |\n| Shifted Person | email | new | review | ${d0} | extra |\n| Unknown Source | carrier-pigeon | new | review | ${d0} |\n| Casey | email | Channel partner replied | review | ${d0} |\n`,
);
const pilSt = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: canaryPilot,
  DEMIGOD_DM_LOG: path.join(ROOT, 'demigod-outreach', 'dm-send-log.txt'),
});
let pil = null;
try {
  pil = JSON.parse(pilSt.stdout.slice(pilSt.stdout.indexOf('{')));
} catch {
  /* */
}
ok(pil && pil.pilots.realFilled === 0, 'empty pilot row realFilled=0');
ok(pil && pil.pilots.tableRows === 1, 'active pipeline rejects fixture and malformed rows');
ok(pil && pil.warmInbound.count === 5, 'warm inbound keeps attributable terminal rows while skipping malformed rows, placeholders, and explicit test noise');
ok(
  (pil?.warmInbound?.rows || []).some(
    (r) => r.who === 'Douglas' && r.channel === 'email + Calendly',
  ),
  'demand preserves valid legacy composite channels',
);
// Douglas (d2) is overdue; Casey (d0) is due today; terminal opt-outs stay out of overdue.
ok(pil?.warmInbound?.freshness?.overdueActionCount === 1, 'demand flags pending dated actions but excludes explicit opt-out dispositions');
ok(pil?.warmInbound?.freshness?.nextActionDate === d0, 'demand exposes the nearest non-overdue inbound action date');
ok(pil?.warmInbound?.freshness?.nextActionDays === 0, 'demand exposes due-today action distance');
ok(
  /^Agent: review overdue warm inbound/.test(pil?.next || ''),
  'demand prioritizes overdue attributable inbound over draft packs',
);
const inboundSt = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: canaryPilot,
});
const inboundSource = fs.readFileSync(path.join(ROOT, 'demigod-pilot-inbound.mjs'), 'utf8');
ok(/error:\s*['"]pilot_os_child_start_failed['"][\s\S]*pilotOsMutated:\s*false/.test(inboundSource), 'pilot OS passthrough fails closed when child cannot start');
ok(/error:\s*['"]pilot_os_command_failed['"][\s\S]*pilotOsMutated:\s*false/.test(inboundSource), 'pilot OS passthrough preserves delegated command failure');
let inbound = null;
try {
  inbound = JSON.parse(inboundSt.stdout.slice(inboundSt.stdout.indexOf('{')));
} catch {
  /* */
}
ok(inboundSt.status === 0, 'pilot inbound canary runs');
ok(inbound?.warmInbound?.freshness?.overdueActionCount === 1, 'pilot inbound flags pending dated actions but excludes explicit opt-out dispositions');
ok(inbound?.warmInbound?.freshness?.nextActionDate === d0, 'pilot inbound exposes the nearest non-overdue inbound action date');
ok(inbound?.warmInbound?.freshness?.nextActionDays === 0, 'pilot inbound exposes due-today action distance');
ok(inbound?.warmInbound?.rawRows === 13, 'pilot inbound preserves malformed warm rows in raw telemetry');
ok(inbound?.warmInbound?.quarantinedRows === 8, 'pilot inbound quarantines malformed and non-attributable warm rows');
ok(inbound?.warmInbound?.quarantineReasons?.invalid_schema === 2, 'pilot inbound explains shifted and truncated warm rows');
ok(
  /Warm health: overdue=\$\{warmFreshness\.overdueActionCount\}[\s\S]*quarantined=\$\{out\.warmInbound\.quarantinedRows\}/.test(inboundSource),
  'pilot inbound text status exposes overdue and quarantine health',
);
ok(
  /Quarantine: \$\{reasons \|\| ['"]unclassified['"]\}/.test(inboundSource),
  'pilot inbound text status explains quarantine reasons',
);

// A row-shaped line under the right heading is still not evidence when the
// canonical warm-inbound schema is absent or shifted.
const headerlessWarmPilot = path.join(canaryDir, 'PILOT-LOG-headerless-warm.md');
fs.writeFileSync(
  headerlessWarmPilot,
  `# Pilot log\n\n## Warm inbound\nlegacy note\n| Headerless Signal | email | replied | review | ${todayReceipt} |\n`,
);
const headerlessDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: headerlessWarmPilot,
});
const headerlessInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: headerlessWarmPilot,
});
let headerlessDemand = null;
let headerlessInbound = null;
try { headerlessDemand = JSON.parse(headerlessDemandRun.stdout.slice(headerlessDemandRun.stdout.indexOf('{'))); } catch { fails.push('headerless demand json parse'); }
try { headerlessInbound = JSON.parse(headerlessInboundRun.stdout.slice(headerlessInboundRun.stdout.indexOf('{'))); } catch { fails.push('headerless inbound json parse'); }
ok(headerlessDemandRun.status === 0 && headerlessInboundRun.status === 0, 'headerless warm canary runs');
ok(headerlessDemand?.warmInbound?.count === 0, 'demand requires canonical warm table header');
ok(headerlessInbound?.warmInbound?.count === 0, 'pilot inbound requires canonical warm table header');
ok(
  headerlessDemand?.warmInbound?.rawRows === 1 &&
    headerlessDemand?.warmInbound?.quarantinedRows === 1 &&
    headerlessDemand?.warmInbound?.quarantineReasons?.invalid_schema === 1,
  'demand exposes headerless row-shaped content as invalid-schema quarantine',
);
ok(
  headerlessInbound?.warmInbound?.rawRows === 1 &&
    headerlessInbound?.warmInbound?.quarantinedRows === 1 &&
    headerlessInbound?.warmInbound?.quarantineReasons?.invalid_schema === 1,
  'pilot inbound exposes headerless row-shaped content as invalid-schema quarantine',
);

// A rogue row before a later canonical header is malformed evidence. Both
// readers must quarantine it while still accepting the canonical row below.
const preHeaderWarmPilot = path.join(canaryDir, 'PILOT-LOG-pre-header-warm.md');
fs.writeFileSync(
  preHeaderWarmPilot,
  `# Pilot log\n\n## Warm inbound\n| Rogue | email | replied | review | ${todayReceipt} |\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n| Canonical | form | received | review | ${todayReceipt} |\n`,
);
const preHeaderDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: preHeaderWarmPilot,
});
const preHeaderInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: preHeaderWarmPilot,
});
let preHeaderDemand = null;
let preHeaderInbound = null;
try { preHeaderDemand = JSON.parse(preHeaderDemandRun.stdout.slice(preHeaderDemandRun.stdout.indexOf('{'))); } catch { fails.push('pre-header demand json parse'); }
try { preHeaderInbound = JSON.parse(preHeaderInboundRun.stdout.slice(preHeaderInboundRun.stdout.indexOf('{'))); } catch { fails.push('pre-header inbound json parse'); }
ok(preHeaderDemandRun.status === 0 && preHeaderInboundRun.status === 0, 'pre-header warm canary runs');
ok(
  preHeaderDemand?.warmInbound?.count === 1 &&
    preHeaderDemand?.warmInbound?.rawRows === 2 &&
    preHeaderDemand?.warmInbound?.quarantinedRows === 1 &&
    preHeaderDemand?.warmInbound?.quarantineReasons?.invalid_schema === 1,
  'demand quarantines pre-header row without hiding canonical inbound',
);
ok(
  preHeaderInbound?.warmInbound?.count === 1 &&
    preHeaderInbound?.warmInbound?.rawRows === 2 &&
    preHeaderInbound?.warmInbound?.quarantinedRows === 1 &&
    preHeaderInbound?.warmInbound?.quarantineReasons?.invalid_schema === 1,
  'pilot inbound quarantines pre-header row without hiding canonical inbound',
);

// A malformed/headerless row must not suppress a real capture as an
// "idempotent" duplicate. The writer repairs the section, and the independent
// readers must then see exactly one attributable signal.
const headerlessDuplicatePilot = path.join(canaryDir, 'PILOT-LOG-headerless-duplicate.md');
fs.writeFileSync(
  headerlessDuplicatePilot,
  `# Pilot log\n\n## Warm inbound\n| Headerless Signal | email | replied | review | ${todayReceipt} |\n`,
);
const headerlessDuplicateWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Headerless Signal', '--channel=email', '--status=replied', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: headerlessDuplicatePilot },
);
let headerlessDuplicateResult = null;
try { headerlessDuplicateResult = JSON.parse(headerlessDuplicateWrite.stdout.slice(headerlessDuplicateWrite.stdout.indexOf('{'))); } catch { fails.push('headerless duplicate write json parse'); }
const headerlessDuplicateStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: headerlessDuplicatePilot,
});
let headerlessDuplicateDemand = null;
try { headerlessDuplicateDemand = JSON.parse(headerlessDuplicateStatus.stdout.slice(headerlessDuplicateStatus.stdout.indexOf('{'))); } catch { fails.push('headerless duplicate demand json parse'); }
ok(headerlessDuplicateWrite.status === 0 && headerlessDuplicateResult?.added === true, 'headerless duplicate is repaired and written');
ok(headerlessDuplicateDemand?.warmInbound?.count === 1, 'repaired headerless duplicate becomes one attributable signal');

// Operator docs may include complete example tables. Fenced examples are not
// evidence and must not shadow the later live sections or inflate either
// independent reader.
const fencedPilot = path.join(canaryDir, 'PILOT-LOG-fenced-example.md');
fs.writeFileSync(
  fencedPilot,
  `# Pilot log\n\n\`\`\`markdown\n## Active pipeline\n| ID | Founder | Role | 90d | Status | Next | Date |\n|---|---|---|---|---|---|---|\n| fake | Example Co | Engineer | Ship demo | active | deliver | ${todayReceipt} |\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n| Example Founder | email | replied | review | ${todayReceipt} |\n\`\`\`\n\n## Active pipeline\n| ID | Founder | Role | 90d | Status | Next | Date |\n|---|---|---|---|---|---|---|\n| P0 | — | — | — | waiting | review | ${todayReceipt} |\n\n## Warm inbound (not a pilot yet)\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n| Real Warm | email | replied | review | ${todayReceipt} |\n`,
);
const fencedDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: fencedPilot,
});
const fencedInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: fencedPilot,
});
let fencedDemand = null;
let fencedInbound = null;
try { fencedDemand = JSON.parse(fencedDemandRun.stdout.slice(fencedDemandRun.stdout.indexOf('{'))); } catch { fails.push('fenced demand json parse'); }
try { fencedInbound = JSON.parse(fencedInboundRun.stdout.slice(fencedInboundRun.stdout.indexOf('{'))); } catch { fails.push('fenced inbound json parse'); }
ok(fencedDemandRun.status === 0 && fencedInboundRun.status === 0, 'fenced PILOT-LOG canary runs');
ok(fencedDemand?.pilots?.realFilled === 0, 'demand ignores fenced example pilot');
ok(fencedDemand?.warmInbound?.count === 1 && fencedDemand?.warmInbound?.rows?.[0]?.who === 'Real Warm', 'demand ignores fenced example inbound');
ok(fencedInbound?.activePipeline?.realFilled === 0, 'pilot inbound ignores fenced example pilot');
ok(fencedInbound?.warmInbound?.count === 1 && fencedInbound?.warmInbound?.rows?.[0]?.who === 'Real Warm', 'pilot inbound ignores fenced example inbound');

// Commented-out rows are operator history, not observed demand. They can sit
// inside an otherwise canonical live table and must be masked by both readers.
const commentedPilot = path.join(canaryDir, 'PILOT-LOG-commented-rows.md');
fs.writeFileSync(
  commentedPilot,
  `# Pilot log\n\n## Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|---|---|---|---|---|---|---|\n<!--\n| fake-comment | Example Co | Engineer | Ship demo | active | deliver | ${todayReceipt} |\n-->\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n<!-- | Fake Comment | email | replied | review | ${todayReceipt} | -->\n| Real Comment Canary | email | replied | review | ${todayReceipt} |\n`,
);
const commentedDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: commentedPilot,
});
const commentedInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: commentedPilot,
});
let commentedDemand = null;
let commentedInbound = null;
try { commentedDemand = JSON.parse(commentedDemandRun.stdout.slice(commentedDemandRun.stdout.indexOf('{'))); } catch { fails.push('commented demand json parse'); }
try { commentedInbound = JSON.parse(commentedInboundRun.stdout.slice(commentedInboundRun.stdout.indexOf('{'))); } catch { fails.push('commented inbound json parse'); }
ok(commentedDemandRun.status === 0 && commentedInboundRun.status === 0, 'commented PILOT-LOG canary runs');
ok(commentedDemand?.pilots?.realFilled === 0, 'demand ignores HTML-commented pilot rows');
ok(commentedDemand?.warmInbound?.count === 1 && commentedDemand?.warmInbound?.rows?.[0]?.who === 'Real Comment Canary', 'demand ignores HTML-commented inbound rows');
ok(commentedInbound?.activePipeline?.realFilled === 0, 'pilot inbound ignores HTML-commented pilot rows');
ok(commentedInbound?.warmInbound?.count === 1 && commentedInbound?.warmInbound?.rows?.[0]?.who === 'Real Comment Canary', 'pilot inbound ignores HTML-commented inbound rows');

// A partially written operator note can leave its Markdown fence unclosed.
// Everything after that opener remains documentation, never demand evidence.
const unclosedFencePilot = path.join(canaryDir, 'PILOT-LOG-unclosed-fence.md');
fs.writeFileSync(
  unclosedFencePilot,
  `# Pilot log\n\n\`\`\`markdown\n## Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|---|---|---|---|---|---|---|\n| fake-open | Example Co | Engineer | Ship demo | active | deliver | ${todayReceipt} |\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n| Fake Open Fence | email | replied | review | ${todayReceipt} |\n`,
);
const unclosedDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: unclosedFencePilot,
});
const unclosedInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: unclosedFencePilot,
});
let unclosedDemand = null;
let unclosedInbound = null;
try { unclosedDemand = JSON.parse(unclosedDemandRun.stdout.slice(unclosedDemandRun.stdout.indexOf('{'))); } catch { fails.push('unclosed fence demand json parse'); }
try { unclosedInbound = JSON.parse(unclosedInboundRun.stdout.slice(unclosedInboundRun.stdout.indexOf('{'))); } catch { fails.push('unclosed fence inbound json parse'); }
ok(unclosedDemandRun.status === 0 && unclosedInboundRun.status === 0, 'unclosed fenced PILOT-LOG canary runs');
ok(unclosedDemand?.pilots?.realFilled === 0 && unclosedDemand?.warmInbound?.count === 0, 'demand masks unclosed fenced examples through EOF');
ok(unclosedInbound?.activePipeline?.realFilled === 0 && unclosedInbound?.warmInbound?.count === 0, 'pilot inbound masks unclosed fenced examples through EOF');

// A complete-looking identity row without an operational disposition is not
// evidence of a delivered/active pilot. This specifically guards the inbound
// reader even if other demand readers evolve independently.
const noDispositionPilot = path.join(canaryDir, 'pilot-no-disposition.md');
fs.writeFileSync(
  noDispositionPilot,
  `# Pilot log\n\n## Active pipeline\n| ID | Founder | Role | 90d | Status | Next | Date |\n|----|---------|------|-----|--------|------|------|\n| p-realish | Real Founder | Engineer | Ship v1 | — | — | ${todayReceipt} |\n`,
);
const noDispositionStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: noDispositionPilot,
});
const noDispositionDemandStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: noDispositionPilot,
});
let noDisposition = null;
let noDispositionDemand = null;
try {
  noDisposition = JSON.parse(noDispositionStatus.stdout.slice(noDispositionStatus.stdout.indexOf('{')));
} catch {
  fails.push('no-disposition pilot status json parse');
}
try {
  noDispositionDemand = JSON.parse(noDispositionDemandStatus.stdout.slice(noDispositionDemandStatus.stdout.indexOf('{')));
} catch {
  fails.push('no-disposition demand status json parse');
}
ok(noDispositionStatus.status === 0, 'pilot inbound no-disposition canary runs');
ok(
  noDisposition?.activePipeline?.realFilled === 0,
  'pilot inbound requires status and next action before realFilled',
);
ok(noDispositionDemandStatus.status === 0, 'demand no-disposition canary runs');
ok(
  noDispositionDemand?.pilots?.realFilled === 0,
  'demand requires status and next action before realFilled',
);

// A pilot ID is the pipeline identity. Conflicting manual rows for the same
// ID are audit history, not two real pilots; the appended row is current.
const duplicateActivePilot = path.join(canaryDir, 'pilot-duplicate-active.md');
fs.writeFileSync(
  duplicateActivePilot,
  `# Pilot log\n\n## Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|----|---------|------|----------------|--------|------|------|\n| p-one | Real Founder | Engineer | Ship v1 | matching | review | ${todayReceipt} |\n| P-ONE | Real Founder | Engineer | Ship v1 | intro | confirm | ${todayReceipt} |\n`,
);
const duplicateActiveStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: duplicateActivePilot,
});
const duplicateDemandStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: duplicateActivePilot,
});
let duplicateActive = null;
let duplicateDemand = null;
try {
  duplicateActive = JSON.parse(duplicateActiveStatus.stdout.slice(duplicateActiveStatus.stdout.indexOf('{')));
} catch {
  fails.push('duplicate active pilot status json parse');
}
try {
  duplicateDemand = JSON.parse(duplicateDemandStatus.stdout.slice(duplicateDemandStatus.stdout.indexOf('{')));
} catch {
  fails.push('duplicate active demand status json parse');
}
ok(duplicateActiveStatus.status === 0, 'pilot inbound duplicate active canary runs');
ok(duplicateActive?.activePipeline?.realFilled === 1, 'duplicate active pilot IDs count once');
ok(duplicateActive?.activePipeline?.recent?.[0]?.status === 'intro', 'pilot inbound exposes latest active state');
ok(duplicateDemandStatus.status === 0, 'demand duplicate active canary runs');
ok(duplicateDemand?.pilots?.realFilled === 1, 'demand duplicate active pilot IDs count once');
ok(duplicateDemand?.pilots?.recent?.[0]?.status === 'intro', 'demand exposes latest active state');

// A malformed adjacent pilot-OS store must not take down inbound monitoring or
// accidentally count corrupt values as open pilots.
const malformedOsRoot = path.join(canaryDir, 'malformed-os-root');
fs.mkdirSync(malformedOsRoot, { recursive: true });
fs.writeFileSync(path.join(malformedOsRoot, 'DEMIGOD-PILOTS.json'), JSON.stringify({ pilots: { bad: true } }));
const malformedOsStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_ROOT: malformedOsRoot,
  DEMIGOD_PILOT_LOG: canaryPilot,
});
let malformedOs = null;
try {
  malformedOs = JSON.parse(malformedOsStatus.stdout.slice(malformedOsStatus.stdout.indexOf('{')));
} catch {
  fails.push('malformed pilot OS status json parse');
}
ok(malformedOsStatus.status === 0, 'pilot inbound survives malformed pilot OS store');
ok(malformedOs?.pilotOs?.open === 0, 'malformed pilot OS entries never count as open pilots');

// An array can be structurally valid while containing partial legacy/transient
// objects. Those must not become pilot truth either.
fs.writeFileSync(path.join(malformedOsRoot, 'DEMIGOD-PILOTS.json'), JSON.stringify({
  pilots: [
    {},
    { id: 'partial', status: 'new', company: 'Acme', role: 'Engineer' },
    { id: 'sample', status: 'new', company: 'Acme', role: 'Engineer', outcome90d: 'Ship v1', contact: 'f@acme.com', sample: true },
    { id: 'closed', status: 'closed', company: 'Acme', role: 'Engineer', outcome90d: 'Ship v1', contact: 'f@acme.com' },
  ],
}));
const partialOsStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_ROOT: malformedOsRoot,
  DEMIGOD_PILOT_LOG: canaryPilot,
});
let partialOs = null;
try {
  partialOs = JSON.parse(partialOsStatus.stdout.slice(partialOsStatus.stdout.indexOf('{')));
} catch {
  fails.push('partial pilot OS status json parse');
}
ok(partialOsStatus.status === 0, 'pilot inbound survives partial pilot OS rows');
ok(partialOs?.pilotOs?.open === 0, 'partial, sample, and closed pilot OS rows stay out of open count');

// Phone evidence must be an actual phone-shaped value, not arbitrary prose
// that happens to contain enough digits. Verify both startup status readers.
fs.writeFileSync(path.join(malformedOsRoot, 'DEMIGOD-PILOTS.json'), JSON.stringify({
  pilots: [
    { id: 'bad-phone', status: 'new', company: 'Acme', role: 'Engineer', outcome90d: 'Ship v1', contact: 'call abc1234567 later' },
    { id: 'good-phone', status: 'new', company: 'Beta', role: 'Designer', outcome90d: 'Launch v1', contact: '+1 (415) 555-0123' },
  ],
}));
const phoneInboundStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_ROOT: malformedOsRoot,
  DEMIGOD_PILOT_LOG: canaryPilot,
});
const phoneDemandStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_ROOT: malformedOsRoot,
  DEMIGOD_PILOT_LOG: canaryPilot,
});
let phoneInbound = null;
let phoneDemand = null;
try { phoneInbound = JSON.parse(phoneInboundStatus.stdout.slice(phoneInboundStatus.stdout.indexOf('{'))); } catch { fails.push('phone inbound json parse'); }
try { phoneDemand = JSON.parse(phoneDemandStatus.stdout.slice(phoneDemandStatus.stdout.indexOf('{'))); } catch { fails.push('phone demand json parse'); }
ok(phoneInboundStatus.status === 0 && phoneDemandStatus.status === 0, 'pilot OS phone-contact canary runs');
ok(phoneInbound?.pilotOs?.open === 1, 'inbound rejects prose-with-digits and accepts formatted phone contact');
ok(phoneDemand?.pilots?.pilotOsOpen === 1, 'demand rejects prose-with-digits and accepts formatted phone contact');

fs.writeFileSync(path.join(malformedOsRoot, 'DEMIGOD-PILOTS.json'), JSON.stringify({
  pilots: [
    { id: 'pilot-1', status: 'new', company: 'Acme', role: 'Engineer', outcome90d: 'Ship v1', contact: 'f@acme.com' },
    { id: 'PILOT-1', status: 'matching', company: 'Acme', role: 'Engineer', outcome90d: 'Ship v1', contact: 'f@acme.com' },
  ],
}));
const duplicateOsStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_ROOT: malformedOsRoot,
  DEMIGOD_PILOT_LOG: canaryPilot,
});
let duplicateOs = null;
try {
  duplicateOs = JSON.parse(duplicateOsStatus.stdout.slice(duplicateOsStatus.stdout.indexOf('{')));
} catch {
  fails.push('duplicate pilot OS status json parse');
}
ok(duplicateOsStatus.status === 0, 'pilot inbound survives duplicate pilot OS rows');
ok(duplicateOs?.pilotOs?.open === 1, 'duplicate pilot OS IDs count as one open pilot');

// Explicit timestamps are evidence. Future or malformed creation times cannot
// make a complete-looking Pilot OS row current; timestamp-less legacy rows stay
// readable until migrated.
fs.writeFileSync(path.join(malformedOsRoot, 'DEMIGOD-PILOTS.json'), JSON.stringify({
  pilots: [
    { id: 'legacy', status: 'new', company: 'Acme', role: 'Engineer', outcome90d: 'Ship v1', contact: 'legacy@acme.com' },
    { id: 'future', at: '2999-01-01T00:00:00.000Z', status: 'new', company: 'Acme', role: 'Engineer', outcome90d: 'Ship v1', contact: 'future@acme.com' },
    { id: 'bad-time', at: 'not-a-time', status: 'new', company: 'Acme', role: 'Engineer', outcome90d: 'Ship v1', contact: 'bad@acme.com' },
  ],
}));
const timestampInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_ROOT: malformedOsRoot,
  DEMIGOD_PILOT_LOG: canaryPilot,
});
const timestampDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_ROOT: malformedOsRoot,
  DEMIGOD_PILOT_LOG: canaryPilot,
});
let timestampInbound = null;
let timestampDemand = null;
try { timestampInbound = JSON.parse(timestampInboundRun.stdout.slice(timestampInboundRun.stdout.indexOf('{'))); } catch { fails.push('timestamp inbound json parse'); }
try { timestampDemand = JSON.parse(timestampDemandRun.stdout.slice(timestampDemandRun.stdout.indexOf('{'))); } catch { fails.push('timestamp demand json parse'); }
ok(timestampInboundRun.status === 0 && timestampDemandRun.status === 0, 'pilot OS timestamp canary runs');
ok(timestampInbound?.pilotOs?.open === 1, 'inbound counts legacy row but rejects future and malformed timestamps');
ok(timestampDemand?.pilots?.pilotOsOpen === 1, 'demand counts legacy row but rejects future and malformed timestamps');
ok(
  /function writeTextAtomic\(/.test(inboundSource) &&
    /fs\.renameSync\(temp, file\)/.test(inboundSource) &&
    /writeTextAtomic\(PILOT_LOG, md\)/.test(inboundSource),
  'pilot inbound publishes complete warm-log updates atomically',
);
ok(
  /if \(r\.error \|\| r\.status !== 0\)/.test(inboundSource) &&
    /warmLogged:\s*false/.test(inboundSource),
  'failed WIZ intake cannot append warm inbound or return success',
);
ok(
  /if \(!warmResult\.ok\)/.test(inboundSource) &&
    /error:\s*['"]warm_inbound_write_failed['"]/.test(inboundSource) &&
    /intakeAccepted:\s*true/.test(inboundSource),
  'accepted WIZ intake cannot claim warm capture when the pilot log write fails',
);
ok(inbound?.activePipeline?.realFilled === 0, 'pilot inbound excludes fixture active rows');
ok(
  !(inbound?.activePipeline?.recent || []).some((r) => r.id === 'partial'),
  'pilot inbound excludes active rows missing role or 90-day outcome',
);
ok(inbound?.warmInbound?.count === 5, 'pilot inbound warm parser agrees and skips test noise');
ok(
  inbound?.warmInbound?.rawRows > inbound?.warmInbound?.count,
  'pilot inbound exposes canonical warm rows before honesty filters',
);
ok(
  inbound?.warmInbound?.quarantinedRows === inbound?.warmInbound?.rawRows - inbound?.warmInbound?.count,
  'pilot inbound exposes quarantined warm rows without promoting them',
);
ok(
  Object.values(inbound?.warmInbound?.quarantineReasons || {}).reduce((sum, count) => sum + count, 0) ===
    inbound?.warmInbound?.quarantinedRows,
  'pilot inbound accounts for every quarantined warm row by reason',
);
ok(
  (inbound?.warmInbound?.rows || []).some(
    (r) => r.who === 'Douglas' && r.channel === 'email + Calendly',
  ),
  'pilot inbound preserves valid legacy composite channels',
);
ok(
  !(inbound?.warmInbound?.rows || []).some((r) => r.who === 'Unknown Source'),
  'pilot inbound skips unknown warm channels',
);
ok(
  (inbound?.warmInbound?.rows || []).filter((r) => r.who === 'Casey').length === 1,
  'pilot inbound deduplicates identical legacy/manual warm rows',
);
ok(
  !(inbound?.warmInbound?.rows || []).some((r) => r.who === 'Truncated Person'),
  'pilot inbound skips truncated warm rows',
);
ok(
  !/\b\d+\s*[–-]\s*\d+\s+(?:curated\s+)?candidates?\b/i.test(inboundSt.stdout) &&
    !/\b\d+\s*[–-]\s*\d+\s+(?:curated\s+)?candidates?\b/i.test(
      inboundSource,
    ),
  'pilot inbound does not promise a numeric candidate volume',
);
const warmCountBeforeWrite = inbound?.warmInbound?.count;
const warmWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=River | Labs', '--channel=email', '--status=new\nqualified', '--next=review | route', '--json'],
  { DEMIGOD_PILOT_LOG: canaryPilot },
);
ok(warmWrite.status === 0, 'pilot inbound safely writes warm row');
const warmWrittenStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: canaryPilot,
});
let warmWritten = null;
try {
  warmWritten = JSON.parse(warmWrittenStatus.stdout.slice(warmWrittenStatus.stdout.indexOf('{')));
} catch {
  /* */
}
ok(
  Number.isInteger(warmCountBeforeWrite) &&
    warmWritten?.warmInbound?.count === warmCountBeforeWrite + 1,
  'escaped warm fields remain exactly one row',
);
const escapedWarm = warmWritten?.warmInbound?.rows?.find((row) => row.who === 'River | Labs');
ok(Boolean(escapedWarm), 'escaped warm who round-trips');
ok(escapedWarm?.status === 'new qualified', 'warm newlines collapse safely');
ok(warmWritten?.activePipeline?.realFilled === 0, 'warm write does not mint a pilot');
ok(/River \\| Labs/.test(fs.readFileSync(canaryPilot, 'utf8')), 'warm writer escapes markdown pipes');
ok(
  /\|-----\|[^\n]*\n\| River \\| Labs \|/.test(fs.readFileSync(canaryPilot, 'utf8')),
  'warm writer inserts after indented table header',
);
const duplicateWarmWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=River | Labs', '--channel=email', '--status=new\nqualified', '--next=review | route', '--json'],
  { DEMIGOD_PILOT_LOG: canaryPilot },
);
let duplicateWarm = null;
try {
  duplicateWarm = JSON.parse(duplicateWarmWrite.stdout.slice(duplicateWarmWrite.stdout.indexOf('{')));
} catch {
  /* */
}
const afterDuplicateStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: canaryPilot,
});
let afterDuplicate = null;
try {
  afterDuplicate = JSON.parse(afterDuplicateStatus.stdout.slice(afterDuplicateStatus.stdout.indexOf('{')));
} catch {
  /* */
}
ok(duplicateWarmWrite.status === 0, 'duplicate warm write is idempotent success');
ok(duplicateWarm?.duplicate === true && duplicateWarm?.added === false, 'duplicate warm write is reported');
ok(
  afterDuplicate?.warmInbound?.count === warmWritten?.warmInbound?.count,
  'duplicate warm write does not inflate inbound count',
);

// A placeholder cannot be accepted at write time and then silently disappear
// from status. Reject it without modifying the source-of-truth log.
const beforePlaceholderMd = fs.readFileSync(canaryPilot, 'utf8');
const placeholderWarmWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=**—**', '--channel=email', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: canaryPilot },
);
ok(placeholderWarmWrite.status === 1, 'placeholder warm identity is refused');
ok(
  /warm_who_placeholder/.test(placeholderWarmWrite.stderr),
  'placeholder refusal is structured',
);
ok(
  fs.readFileSync(canaryPilot, 'utf8') === beforePlaceholderMd,
  'placeholder refusal leaves pilot log unchanged',
);

const beforeInvalidChannelMd = fs.readFileSync(canaryPilot, 'utf8');
const invalidChannelWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Channel Typo', '--channel=emali', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: canaryPilot },
);
ok(invalidChannelWrite.status === 1, 'invalid warm channel is refused');
ok(/warm_channel_invalid/.test(invalidChannelWrite.stderr), 'invalid channel refusal is structured');
ok(
  fs.readFileSync(canaryPilot, 'utf8') === beforeInvalidChannelMd,
  'invalid channel refusal leaves pilot log unchanged',
);

// A real phone conversation is attributable warm inbound. It must survive
// both readers while remaining separate from delivered pilots and send
// receipts.
const phoneWarmWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Phone Founder', '--channel=phone', '--status=replied', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: canaryPilot },
);
const phoneWarmInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: canaryPilot,
});
const phoneWarmDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: canaryPilot,
});
let phoneWarmInbound = null;
let phoneWarmDemand = null;
try { phoneWarmInbound = JSON.parse(phoneWarmInboundRun.stdout.slice(phoneWarmInboundRun.stdout.indexOf('{'))); } catch { /* */ }
try { phoneWarmDemand = JSON.parse(phoneWarmDemandRun.stdout.slice(phoneWarmDemandRun.stdout.indexOf('{'))); } catch { /* */ }
ok(phoneWarmWrite.status === 0, 'phone warm inbound write succeeds');
ok(
  phoneWarmInbound?.warmInbound?.rows?.some((row) => row.who === 'Phone Founder' && row.channel === 'phone'),
  'pilot inbound preserves attributable phone warm inbound',
);
ok(
  phoneWarmDemand?.warmInbound?.rows?.some((row) => row.who === 'Phone Founder' && row.channel === 'phone'),
  'demand status preserves attributable phone warm inbound',
);
ok(
  phoneWarmInbound?.activePipeline?.realFilled === 0 && phoneWarmDemand?.pilots?.realFilled === 0,
  'phone warm inbound does not mint a pilot',
);

const beforeMissingDispositionMd = fs.readFileSync(canaryPilot, 'utf8');
const missingDispositionWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Untriaged Signal', '--channel=email', '--status=—', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: canaryPilot },
);
ok(missingDispositionWrite.status === 1, 'warm signal without disposition is refused');
ok(/warm_disposition_required/.test(missingDispositionWrite.stderr), 'missing disposition refusal is structured');
ok(
  fs.readFileSync(canaryPilot, 'utf8') === beforeMissingDispositionMd,
  'missing disposition refusal leaves pilot log unchanged',
);

// Atomic publish failures must remain an ordinary failed command, not an
// uncaught stack trace or a false warm-inbound success.
const failedWarmWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Write Failure', '--channel=email', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: '/proc/version' },
);
ok(failedWarmWrite.status === 1, 'warm writer reports atomic publish failure');
ok(
  /warm_inbound_(?:write|lock)_failed/.test(failedWarmWrite.stderr) &&
    !/^[A-Za-z]*Error:|\n\s+at\s/m.test(failedWarmWrite.stderr),
  'warm writer returns structured failure without uncaught stack',
);
try {
  const failedWarm = JSON.parse(failedWarmWrite.stdout.slice(failedWarmWrite.stdout.indexOf('{')));
  ok(failedWarm.ok === false && failedWarm.added === false, 'failed warm write cannot claim capture');
} catch {
  fails.push('failed warm write json parse');
}

// A pre-existing Warm inbound heading with no valid table must be repaired,
// not followed by a bare row that only a loose parser would accept.
const brokenWarmPilot = path.join(canaryDir, 'PILOT-LOG-broken-warm.md');
fs.writeFileSync(brokenWarmPilot, '# Pilot log\n\n## Warm inbound (not a pilot yet)\nlegacy prose\n');
const repairedWarmWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Repair Case', '--channel=email', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: brokenWarmPilot },
);
const repairedWarmMd = fs.readFileSync(brokenWarmPilot, 'utf8');
ok(repairedWarmWrite.status === 0, 'warm writer repairs missing table schema');
ok(
  /\| Who \| Channel \| Status \| Next \| Date \|\n\|-----\|---------\|--------\|------\|------\|\n\| Repair Case \|/.test(repairedWarmMd),
  'warm repair writes canonical header before data',
);
const repairedWarmStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: brokenWarmPilot,
});
let repairedWarm = null;
try {
  repairedWarm = JSON.parse(repairedWarmStatus.stdout.slice(repairedWarmStatus.stdout.indexOf('{')));
} catch {
  /* */
}
ok(repairedWarm?.warmInbound?.count === 1, 'repaired warm row parses exactly once');

// Two pipe-shaped lines are not necessarily the canonical warm schema. A
// wrong-column legacy table must be repaired before the new capture is added.
const wrongSchemaPilot = path.join(canaryDir, 'PILOT-LOG-wrong-warm-schema.md');
fs.writeFileSync(
  wrongSchemaPilot,
  '# Pilot log\n\n## Warm inbound\n| Who | Channel | Status | Date |\n|---|---|---|---|\n| Legacy | email | new | 2026-07-14 |\n',
);
const wrongSchemaWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Schema Repair', '--channel=email', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: wrongSchemaPilot },
);
const wrongSchemaMd = fs.readFileSync(wrongSchemaPilot, 'utf8');
ok(wrongSchemaWrite.status === 0, 'warm writer repairs wrong table schema');
ok(
  /\| Who \| Channel \| Status \| Next \| Date \|\n\|-----\|---------\|--------\|------\|------\|\n\| Schema Repair \|/.test(wrongSchemaMd),
  'wrong-schema repair adds canonical header before new data',
);
const wrongSchemaStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: wrongSchemaPilot,
});
let wrongSchema = null;
try {
  wrongSchema = JSON.parse(wrongSchemaStatus.stdout.slice(wrongSchemaStatus.stdout.indexOf('{')));
} catch {
  /* */
}
ok(wrongSchema?.warmInbound?.count === 1, 'wrong-schema repair counts only attributable new row');

// Archive/notes headings that merely start with "Warm inbound" are not the
// canonical live section and must not become current demand evidence.
const archiveHeadingPilot = path.join(canaryDir, 'PILOT-LOG-warm-archive.md');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
fs.writeFileSync(
  archiveHeadingPilot,
  `# Pilot log\n\n## Warm inbound archive\n| Who | Channel | Status | Next | Date |\n|-----|---------|--------|------|------|\n| Archived Signal | email | new | review | ${today} |\n`,
);
const archiveHeadingStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: archiveHeadingPilot,
});
let archiveHeading = null;
try {
  archiveHeading = JSON.parse(archiveHeadingStatus.stdout.slice(archiveHeadingStatus.stdout.indexOf('{')));
} catch {
  /* */
}
ok(archiveHeading?.warmInbound?.count === 0, 'warm parser ignores archive-prefixed headings');
const archiveDemandStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: archiveHeadingPilot,
});
let archiveDemand = null;
try {
  archiveDemand = JSON.parse(
    archiveDemandStatus.stdout.slice(archiveDemandStatus.stdout.indexOf('{')),
  );
} catch {
  fails.push('archive demand status json parse');
}
ok(archiveDemandStatus.status === 0, 'demand archive-heading canary runs');
ok(
  archiveDemand?.warmInbound?.count === 0,
  'demand warm parser ignores archive-prefixed headings',
);

// An identical five-column row elsewhere in the document is not evidence that
// this warm signal was already captured.
const crossSectionPilot = path.join(canaryDir, 'PILOT-LOG-cross-section.md');
fs.writeFileSync(
  crossSectionPilot,
  `# Pilot log\n\n## Notes\n| Who | Channel | Status | Next | Date |\n|-----|---------|--------|------|------|\n| Cross Section | email | new | review | ${today} |\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|-----|---------|--------|------|------|\n`,
);
const crossSectionWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Cross Section', '--channel=email', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: crossSectionPilot },
);
let crossSectionResult = null;
try {
  crossSectionResult = JSON.parse(crossSectionWrite.stdout.slice(crossSectionWrite.stdout.indexOf('{')));
} catch {
  /* */
}
ok(crossSectionWrite.status === 0, 'warm write ignores matching rows outside warm section');
ok(
  crossSectionResult?.added === true && crossSectionResult?.duplicate === false,
  'cross-section match cannot suppress warm capture',
);
const crossSectionStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: crossSectionPilot,
});
let crossSection = null;
try {
  crossSection = JSON.parse(crossSectionStatus.stdout.slice(crossSectionStatus.stdout.indexOf('{')));
} catch {
  /* */
}
ok(crossSection?.warmInbound?.count === 1, 'cross-section warm capture parses once');

// Incomplete, impossible, or future dates are not evidence of attributable inbound or
// delivery. Both independent readers must reject them consistently.
const invalidDatePilot = path.join(canaryDir, 'PILOT-LOG-invalid-dates.md');
fs.writeFileSync(
  invalidDatePilot,
  '# Pilot log\n\n## Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|---|---|---|---|---|---|---|\n| pilot-date | Date Co | Engineer | Ship v1 | active | review | 2026-02-30 |\n| pilot-future | Future Co | Engineer | Ship v2 | active | review | 2999-01-01 |\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|-----|---------|--------|------|------|\n| Missing Date | email | new | review | — |\n| Impossible Date | wiz | new | review | 2026-02-30 |\n| Future Date | email | new | review | 2999-01-01 |\n' +
    `| Missing Status | email | — | review | ${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())} |\n` +
    `| Missing Next | email | new | TBD | ${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())} |\n`,
);
const invalidInboundStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: invalidDatePilot,
});
const invalidDemandStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: invalidDatePilot,
});
let invalidInbound = null;
let invalidDemand = null;
try { invalidInbound = JSON.parse(invalidInboundStatus.stdout.slice(invalidInboundStatus.stdout.indexOf('{'))); } catch { /* */ }
try { invalidDemand = JSON.parse(invalidDemandStatus.stdout.slice(invalidDemandStatus.stdout.indexOf('{'))); } catch { /* */ }
ok(invalidInbound?.activePipeline?.realFilled === 0, 'pilot inbound rejects impossible/future active dates');
ok(invalidInbound?.warmInbound?.count === 0, 'pilot inbound rejects invalid dates and missing warm disposition');
ok(invalidDemand?.pilots?.realFilled === 0, 'demand rejects impossible/future active dates');
ok(invalidDemand?.warmInbound?.count === 0, 'demand rejects invalid dates and missing warm disposition');
ok(invalidInbound?.warmInbound?.rawRows === 5 && invalidInbound?.warmInbound?.quarantinedRows === 5, 'pilot inbound quarantines every invalid warm row');
ok(invalidDemand?.warmInbound?.rawRows === 5 && invalidDemand?.warmInbound?.quarantinedRows === 5, 'demand quarantines every invalid warm row');

// Diagnostic observations and unsafe identity markup belong in quarantine
// telemetry only. They must never be promoted and quarantined simultaneously.
const quarantinedOnlyPilot = path.join(canaryDir, 'PILOT-LOG-quarantined-only.md');
fs.writeFileSync(
  quarantinedOnlyPilot,
  `# Pilot log\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n| [Linked Person](https://example.com) | email | new | review | ${today} |\n| Inbox Audit | email | 0 inbound threads | review | ${today} |\n`,
);
const quarantinedOnlyRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: quarantinedOnlyPilot,
});
let quarantinedOnly = null;
try { quarantinedOnly = JSON.parse(quarantinedOnlyRun.stdout.slice(quarantinedOnlyRun.stdout.indexOf('{'))); } catch { /* */ }
ok(quarantinedOnlyRun.status === 0, 'pilot inbound quarantine-only canary runs');
ok(quarantinedOnly?.warmInbound?.count === 0, 'pilot inbound never promotes quarantined-only observations');
ok(
  quarantinedOnly?.warmInbound?.rawRows === 2 && quarantinedOnly?.warmInbound?.quarantinedRows === 2,
  'pilot inbound quarantine-only accounting remains complementary',
);
ok(
  quarantinedOnly?.warmInbound?.quarantineReasons?.unsafe_markup === 1 &&
    quarantinedOnly?.warmInbound?.quarantineReasons?.no_observed_inbound === 1,
  'pilot inbound classifies unsafe markup and explicit zero-inbound observations',
);

// Current delivery truth requires the exact seven-column Active pipeline
// section. Both readers must count a real canonical row and ignore an archive
// heading that merely contains the same words.
const activeHeadingPilot = path.join(canaryDir, 'PILOT-LOG-active-heading.md');
fs.writeFileSync(
  activeHeadingPilot,
  `# Pilot log\n\n## Archived Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|---|---|---|---|---|---|---|\n| archived | Archive Co | Engineer | Ship old v1 | active | review | ${today} |\n\n## Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|---|---|---|---|---|---|---|\n| current | Current Co | Engineer | Ship current v1 | active | review | ${today} |\n`,
);
const activeInboundStatus = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: activeHeadingPilot,
});
const activeDemandStatus = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: activeHeadingPilot,
});
let activeInbound = null;
let activeDemand = null;
try { activeInbound = JSON.parse(activeInboundStatus.stdout.slice(activeInboundStatus.stdout.indexOf('{'))); } catch { /* */ }
try { activeDemand = JSON.parse(activeDemandStatus.stdout.slice(activeDemandStatus.stdout.indexOf('{'))); } catch { /* */ }
ok(activeInbound?.activePipeline?.realFilled === 1, 'pilot inbound counts canonical active row only');
ok(activeInbound?.activePipeline?.recent?.[0]?.id === 'current', 'pilot inbound ignores archived active heading');
ok(activeDemand?.pilots?.realFilled === 1, 'demand counts canonical seven-column active row');
ok(activeDemand?.pilots?.recent?.[0]?.id === 'current', 'demand ignores archived active heading');

// A new top-level document section also closes the preceding H2. Without this
// boundary, canonical-looking archive tables under H1 leaked into both current
// warm-demand and pilot truth, and could suppress a legitimate warm append.
const h1BoundaryPilot = path.join(canaryDir, 'PILOT-LOG-h1-boundary.md');
fs.writeFileSync(
  h1BoundaryPilot,
  `# Pilot log\n\n## Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|---|---|---|---|---|---|---|\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n\n# Archive\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|---|---|---|---|---|---|---|\n| archived-h1 | Archive Co | Engineer | Ship old v1 | active | review | ${today} |\n\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n| H1 Warm | email | new | review | ${today} |\n`,
);
const h1BoundaryInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: h1BoundaryPilot,
});
const h1BoundaryDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: h1BoundaryPilot,
});
let h1BoundaryInbound = null;
let h1BoundaryDemand = null;
try { h1BoundaryInbound = JSON.parse(h1BoundaryInboundRun.stdout.slice(h1BoundaryInboundRun.stdout.indexOf('{'))); } catch { /* */ }
try { h1BoundaryDemand = JSON.parse(h1BoundaryDemandRun.stdout.slice(h1BoundaryDemandRun.stdout.indexOf('{'))); } catch { /* */ }
ok(h1BoundaryInbound?.activePipeline?.realFilled === 0 && h1BoundaryInbound?.warmInbound?.count === 0, 'pilot inbound stops live tables at a top-level heading');
ok(h1BoundaryDemand?.pilots?.realFilled === 0 && h1BoundaryDemand?.warmInbound?.count === 0, 'demand stops live tables at a top-level heading');
const h1BoundaryWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=H1 Warm', '--channel=email', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: h1BoundaryPilot },
);
let h1BoundaryWriteResult = null;
try { h1BoundaryWriteResult = JSON.parse(h1BoundaryWrite.stdout.slice(h1BoundaryWrite.stdout.indexOf('{'))); } catch { /* */ }
ok(h1BoundaryWriteResult?.added === true && h1BoundaryWriteResult?.duplicate === false, 'warm writer ignores duplicate-looking rows beyond an H1 boundary');

// Documentation examples are not operational sections. The writer must use
// the same masked view as both readers and append only to the live table.
const fencedWriterPilot = path.join(canaryDir, 'PILOT-LOG-fenced-writer.md');
fs.writeFileSync(
  fencedWriterPilot,
  `# Pilot log\n\n\`\`\`md\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n| Fenced Person | email | new | review | ${today} |\n\`\`\`\n\n## Warm inbound (not a pilot yet)\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n`,
);
const fencedWriterRun = run(
  'demigod-pilot-inbound.mjs',
  ['warm', '--who=Fenced Person', '--channel=email', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: fencedWriterPilot },
);
let fencedWriterResult = null;
try { fencedWriterResult = JSON.parse(fencedWriterRun.stdout.slice(fencedWriterRun.stdout.indexOf('{'))); } catch { /* */ }
const fencedWriterText = fs.readFileSync(fencedWriterPilot, 'utf8');
const fencedWriterLive = fencedWriterText.slice(fencedWriterText.indexOf('## Warm inbound (not a pilot yet)'));
ok(fencedWriterResult?.added === true && fencedWriterResult?.duplicate === false, 'warm writer does not treat fenced example as duplicate evidence');
ok((fencedWriterLive.match(/\| Fenced Person \|/g) || []).length === 1, 'warm writer appends to live section after fenced example');

// Identity fields flow into JSON status, terminal cards, and append-only
// Markdown. Control characters must never become operational evidence or be
// written into the pilot log, even when the visible text otherwise looks real.
const controlPilot = path.join(canaryDir, 'PILOT-LOG-control-char.md');
fs.writeFileSync(
  controlPilot,
  `# Pilot log\n\n## Active pipeline\n| ID | Founder | Role | 90-day outcome | Status | Next | Date |\n|---|---|---|---|---|---|---|\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|---|---|---|---|---|\n| Control${String.fromCharCode(7)} Person | email | new | review | ${today} |\n`,
);
const controlInboundRun = run('demigod-pilot-inbound.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: controlPilot,
});
const controlDemandRun = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: controlPilot,
});
let controlInbound = null;
let controlDemand = null;
try { controlInbound = JSON.parse(controlInboundRun.stdout.slice(controlInboundRun.stdout.indexOf('{'))); } catch { /* */ }
try { controlDemand = JSON.parse(controlDemandRun.stdout.slice(controlDemandRun.stdout.indexOf('{'))); } catch { /* */ }
ok(controlInbound?.warmInbound?.count === 0 && controlInbound?.warmInbound?.quarantineReasons?.unsafe_markup === 1, 'pilot inbound quarantines control characters in identity evidence');
ok(controlDemand?.warmInbound?.count === 0 && controlDemand?.warmInbound?.quarantineReasons?.unsafe_markup === 1, 'demand quarantines control characters in identity evidence');
const controlWrite = run(
  'demigod-pilot-inbound.mjs',
  ['warm', `--who=Writer${String.fromCharCode(7)} Control`, '--channel=email', '--status=new', '--next=review', '--json'],
  { DEMIGOD_PILOT_LOG: controlPilot },
);
ok(controlWrite.status !== 0 && /warm_field_invalid/.test(controlWrite.stdout + controlWrite.stderr), 'warm writer refuses control characters before mutating the log');
ok(!fs.readFileSync(controlPilot, 'utf8').includes(`Writer${String.fromCharCode(7)} Control`), 'warm writer leaves no control-character row behind');
ok(
  Boolean(pil) && (!/pilots filled:\s*[1-9]/i.test(pilSt.stdout) || pil?.pilots?.realFilled === 0),
  'no fake pilot fill claim',
);

// mark-sent without attestation must fail
const msNo = run('demigod-dm-mark-sent.mjs', ['--name=T0']);
ok(msNo.status === 2 || msNo.status === 1, 'mark-sent without --i-sent-it refuses');
ok(/attestation|i-sent-it/i.test(msNo.stderr + msNo.stdout), 'mark-sent refuse mentions attestation');
// Status help must not advertise mark-sent without attestation (queue/CLI honesty).
const demandSrcLive = fs.readFileSync(path.join(ROOT, 'demigod-demand.mjs'), 'utf8');
ok(
  /mark-sent\.mjs --name=NAME --i-sent-it/.test(demandSrcLive) ||
    /demigod-dm-mark-sent\.mjs --name=\$\{row\.name\} --i-sent-it/.test(demandSrcLive),
  'demand status/draft advertise mark-sent with --i-sent-it',
);
// Live queue After send column requires attestation flag on every mark-sent cmd.
const queueMd = fs.readFileSync(path.join(ROOT, 'demigod-ops', 'SEND-QUEUE-PRIORITIZED.md'), 'utf8');
const markSentLines = queueMd.split('\n').filter((l) => /demigod-dm-mark-sent/.test(l));
ok(
  markSentLines.length > 0 && markSentLines.every((l) => /--i-sent-it/.test(l)),
  'SEND-QUEUE After send rows require --i-sent-it attestation',
);


// freeze theater: ship run under freeze must fail
if (freeze.frozen) {
  const shipRun = run('demigod-ship.mjs', ['run'], { DEMIGOD_PUBLISH_FREEZE: '1' });
  ok(shipRun.status !== 0, 'ship run fails under freeze');
  ok(/publish_frozen|frozen/i.test(shipRun.stderr + shipRun.stdout), 'ship run freeze error');
  // status/prepare allowed
  const shipSt = run('demigod-ship.mjs', ['status', '--facts']);
  ok(shipSt.status === 0, 'ship status --facts ok under freeze');
  ok(!/ship-ready|ready to publish|go live/i.test(shipSt.stdout), 'no ship-ready theater in facts');
}

if (fails.length) {
  writeReceipt(false);
  console.error('FAIL', fails);
  process.exit(1);
}
writeReceipt(true);
console.log('ALL PASS demigod-demand-selftest');
