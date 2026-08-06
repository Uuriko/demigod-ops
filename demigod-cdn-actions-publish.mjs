#!/usr/bin/env node
/**
 * demigod-cdn-actions-publish — CDN ship path when local `gh` is unauthenticated.
 *
 *   1. Upload foot/map/head/roles to catbox
 *   2. Trigger Uuriko/demigod-site-cdn ingest-site-bundle workflow (needs GITHUB_TOKEN or gh)
 *   3. Poll GitHub until main foot-latest.js bytes match disk
 *   4. Print commit SHA for finalize / jsDelivr pin
 *
 *   node demigod-cdn-actions-publish.mjs [--stage-only]
 *
 * Does NOT mutate footer/manifest (caller demigod-foot-cdn-publish or agent does).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const OWNER = 'Uuriko';
const REPO = 'demigod-site-cdn';
const WORKFLOW = 'ingest-site-bundle.yml';
const stageOnly = process.argv.includes('--stage-only');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function catboxUpload(filePath) {
  const r = spawnSync(
    'curl',
    ['-sS', '-F', 'reqtype=fileupload', '-F', `fileToUpload=@${filePath}`, 'https://catbox.moe/user/api.php'],
    { encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 },
  );
  const url = String(r.stdout || '').trim();
  if (r.status !== 0 || !/^https:\/\/files\.catbox\.moe\//.test(url)) {
    throw new Error(`catbox upload failed for ${path.basename(filePath)}: ${(r.stderr || url || '').slice(0, 200)}`);
  }
  return url;
}

function footVer(js) {
  return (js.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || js.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1] || '0';
}

function ghToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.DEMIGOD_GITHUB_TOKEN || '';
}

function ghApi(method, apiPath, body) {
  const token = ghToken();
  if (!token) return { ok: false, status: 0, error: 'no-token' };
  const args = ['api', '-X', method, apiPath, '-H', 'Accept: application/vnd.github+json'];
  if (body) {
    args.push('--input', '-');
  }
  const r = spawnSync('gh', args, {
    encoding: 'utf8',
    timeout: 120000,
    input: body ? JSON.stringify(body) : undefined,
    env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token },
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout || '{}');
  } catch {
    /* */
  }
  return { ok: r.status === 0, status: r.status, json, out: r.stdout, err: r.stderr };
}

async function fetchBuf(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'demigod-cdn-actions' }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function main() {
  fs.mkdirSync(BUSY, { recursive: true });
  const footPath = path.join(ROOT, 'demigod-foot-core.js');
  const mapPath = path.join(ROOT, 'demigod-startup-atlas-web.js');
  const mapDataPath = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
  const headPath = path.join(ROOT, 'demigod-head-styles.css');
  const feedPath = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
  const footJs = fs.readFileSync(footPath);
  const ver = footVer(footJs.toString('utf8'));
  const disk = {
    foot: { path: footPath, sha: sha256(footJs), bytes: footJs.length },
    map: { path: mapPath, sha: sha256(fs.readFileSync(mapPath)), bytes: fs.statSync(mapPath).size },
    mapData: { path: mapDataPath, sha: sha256(fs.readFileSync(mapDataPath)), bytes: fs.statSync(mapDataPath).size },
    head: { path: headPath, sha: sha256(fs.readFileSync(headPath)), bytes: fs.statSync(headPath).size },
    feed: fs.existsSync(feedPath)
      ? { path: feedPath, sha: sha256(fs.readFileSync(feedPath)), bytes: fs.statSync(feedPath).size }
      : null,
  };

  console.error('→ catbox stage');
  const urls = {
    ver,
    foot: catboxUpload(footPath),
    mapjs: catboxUpload(mapPath),
    map: catboxUpload(mapDataPath),
    head: catboxUpload(headPath),
    feed: disk.feed ? catboxUpload(feedPath) : '',
  };
  const stagePath = path.join(BUSY, 'cdn-catbox-urls.json');
  fs.writeFileSync(stagePath, JSON.stringify(urls, null, 2) + '\n');
  console.error('✓ staged', stagePath);

  if (stageOnly) {
    console.log(JSON.stringify({ ok: true, stageOnly: true, urls, disk }, null, 2));
    return;
  }

  const token = ghToken();
  if (!token) {
    const receipt = {
      ok: false,
      need: 'GITHUB_TOKEN or agent MCP actions_run_trigger',
      workflow: WORKFLOW,
      owner: OWNER,
      repo: REPO,
      inputs: {
        ver: urls.ver,
        foot_url: urls.foot,
        mapjs_url: urls.mapjs,
        map_url: urls.map,
        head_url: urls.head,
        feed_url: urls.feed || urls.foot, // workflow requires feed_url
      },
      urls,
      disk,
      note: 'Trigger ingest-site-bundle then poll main until foot-latest.js sha matches disk.foot.sha',
    };
    fs.writeFileSync(path.join(BUSY, 'cdn-actions-publish-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(3);
  }

  console.error('→ workflow_dispatch');
  const dispatch = ghApi('POST', `/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    ref: 'main',
    inputs: {
      ver: String(urls.ver),
      foot_url: urls.foot,
      mapjs_url: urls.mapjs,
      map_url: urls.map,
      head_url: urls.head,
      feed_url: urls.feed || urls.foot,
    },
  });
  if (!dispatch.ok && dispatch.status !== 0) {
    // gh api returns empty body + 204 on success sometimes with status 0 and empty
  }
  // 204 success may parse as ok false with empty - retry check via list runs
  await new Promise((r) => setTimeout(r, 4000));

  let commitSha = null;
  for (let i = 0; i < 24; i++) {
    try {
      const meta = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/commits/main`, {
        headers: { 'User-Agent': 'demigod-cdn-actions', Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(20000),
      }).then((r) => r.json());
      const sha = meta.sha;
      const remoteFoot = await fetchBuf(
        `https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/foot-latest.js`,
      );
      if (sha256(remoteFoot) === disk.foot.sha) {
        commitSha = sha;
        console.error('✓ main matches disk foot', sha.slice(0, 12));
        break;
      }
      console.error(`… poll ${i + 1} sha=${String(sha).slice(0, 12)} foot≠disk`);
    } catch (e) {
      console.error(`… poll ${i + 1}`, e.message || e);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!commitSha) {
    const fail = { ok: false, error: 'timeout waiting for main to match disk foot', urls, disk };
    fs.writeFileSync(path.join(BUSY, 'cdn-actions-publish-receipt.json'), JSON.stringify(fail, null, 2) + '\n');
    console.log(JSON.stringify(fail, null, 2));
    process.exit(1);
  }

  const out = {
    ok: true,
    ver: urls.ver,
    commitSha,
    shortSha: commitSha.slice(0, 12),
    cdnUrl: `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${commitSha.slice(0, 12)}/foot-latest.js`,
    urls,
    disk,
  };
  fs.writeFileSync(path.join(BUSY, 'cdn-actions-publish-receipt.json'), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(BUSY, 'cdn-ship-sha.txt'), commitSha + '\n');
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
