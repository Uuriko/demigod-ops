#!/usr/bin/env node
/**
 * Compare live footer CDN vs disk footer-lite (+ optional Webflow API via CDP).
 *
 *   node demigod-live-custom-code-check.mjs
 *   node demigod-live-custom-code-check.mjs --cdp   # also read /api/sites/.../code
 *
 * Exit 0 if live CDN matches disk footer-lite catbox id; exit 1 on mismatch.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com/';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const withCdp = process.argv.includes('--cdp');

function catboxId(s = '') {
  const m = String(s).match(/files\.catbox\.moe\/([a-z0-9]+\.js)/);
  return m ? m[1] : null;
}
function loaderVer(s = '') {
  const m = String(s).match(/foot-cdn-loader v(\d+)/);
  return m ? m[1] : null;
}

async function main() {
  const footLite = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
  const core = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  const diskCdn = catboxId(footLite);
  const diskVer = (core.match(/__dgFootVer='(\d+)'/) || [])[1] || null;

  const liveHtml = await (await fetch(`${LIVE}?cb=${Date.now()}`)).text();
  const liveCdn = catboxId(liveHtml);
  const liveLoader = loaderVer(liveHtml);
  const pub = (liveHtml.match(/Last Published: ([^<]+)/) || [])[1] || null;

  let api = null;
  if (withCdp) {
    try {
      const tabs = await (await fetch(`${CDP}/json/list`)).json();
      const page = tabs.find((t) => t.type === 'page' && (t.url || '').includes('custom-code'));
      if (page) {
        const WebSocket = (await import('ws')).default;
        const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 20e6 });
        let mid = 0;
        const pending = new Map();
        ws.on('message', (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.id != null && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(JSON.stringify(msg.error)));
            else resolve(msg.result || {});
          }
        });
        await new Promise((res, rej) => {
          ws.once('open', res);
          ws.once('error', rej);
        });
        const call = (method, params, timeout = 30000) => {
          const id = ++mid;
          const p = new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject });
            setTimeout(() => {
              if (pending.has(id)) {
                pending.delete(id);
                reject(new Error('timeout ' + method));
              }
            }, timeout);
          });
          ws.send(JSON.stringify({ id, method, params }));
          return p;
        };
        await call('Runtime.enable');
        const r = await call('Runtime.evaluate', {
          expression: `(async()=>{
            const j=await (await fetch('/api/sites/talentlink-sf/code',{credentials:'include'})).json();
            const post=j?.meta?.postBody||'';
            return {
              postCdn:(post.match(/files\\.catbox\\.moe\\/([a-z0-9]+\\.js)/)||[])[1]||null,
              loader:(post.match(/foot-cdn-loader v(\\d+)/)||[])[1]||null,
              hasEvents:/th1yzx|events route/.test(post),
              lastPublished:j?.site?.lastPublished||null,
              dirty:j?.site?.dirty??null,
            };
          })()`,
          returnByValue: true,
          awaitPromise: true,
        });
        api = r.result?.value || null;
        ws.close();
      }
    } catch (e) {
      api = { err: String(e) };
    }
  }

  const match = !!(diskCdn && liveCdn && diskCdn === liveCdn);
  const out = {
    ok: match,
    disk: { footVer: diskVer, footerCdn: diskCdn, loader: loaderVer(footLite) },
    live: { footerCdn: liveCdn, loader: liveLoader, lastPublished: pub?.slice?.(0, 60) || pub },
    api,
    events: {
      hosted: 'https://files.catbox.moe/m22wy3.html',
      local: 'http://127.0.0.1:3460/events',
    },
    fix: match
      ? null
      : 'Disk/live footer CDN mismatch. Save custom code then POST /api/sites/talentlink-sf/queue-publish (see demigod-cm6-paste-publish.mjs).',
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(match ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e) }));
  process.exit(2);
});
