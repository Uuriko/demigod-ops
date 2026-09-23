#!/usr/bin/env node
/** Record a local restore payload for demigod-foot-core.js.
 * Writes DEMIGOD-GITHUB-PUSH-PAYLOAD.json in DEMIGOD_ROOT. Does not push.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, livePush: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function footPath() {
  return path.join(dataRoot(), 'demigod-foot-core.js');
}
function payloadPath() {
  return path.join(dataRoot(), 'DEMIGOD-GITHUB-PUSH-PAYLOAD.json');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, error, ...localFlags }));
  process.exit(1);
}

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  if (!fs.existsSync(footPath())) refuse('foot_required');
  const content = fs.readFileSync(footPath(), 'utf8');
  const payload = {
    ok: true,
    at: new Date().toISOString(),
    path: payloadPath(),
    source: 'disk',
    owner: 'Uuriko',
    repo: 'eat-the-sounds',
    branch: 'master',
    message: 'restore dg-foot-core from the named data root',
    footMarker: (content.match(/Harbor \S+ keep/) || [''])[0],
    footVersion: (content.match(/dg-foot-v(\d+)-core/) || [])[1] || null,
    len: content.length,
    files: [{ path: 'demigod-foot-core.js', content }],
    ...localFlags,
  };
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(payloadPath(), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({
    ok: true,
    path: payload.path,
    source: payload.source,
    footMarker: payload.footMarker,
    footVersion: payload.footVersion,
    len: payload.len,
    ...localFlags,
  }));
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'restore_payload_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
