#!/usr/bin/env node
/**
 * Paste demigod head + footer-lite into Webflow Custom Code via CDP cmTile.view.dispatch
 * (Input.insertText is unreliable on this Webflow CM6 UI).
 *
 * Usage: node demigod-cm6-paste-publish.mjs [--footer-only] [--no-publish]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const HEAD = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const FOOT = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const args = new Set(process.argv.slice(2));
const FOOTER_ONLY = args.has('--footer-only');
const NO_PUBLISH = args.has('--no-publish');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTabs() {
  const r = await fetch(`${CDP}/json/list`);
  return r.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl, { maxPayload: 50_000_000 });
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
  const ready = new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  async function call(method, params, timeout = 60000) {
    await ready;
    const id = ++mid;
    const p = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`timeout ${method}`));
        }
      }, timeout);
    });
    ws.send(JSON.stringify({ id, method, params }));
    return p;
  }
  return { ws, call, ready };
}

const GET_VIEW = `
function getView(i){
  const c=document.querySelectorAll('.cm-content')[i];
  if(!c) return null;
  if(c.cmView&&c.cmView.view) return c.cmView.view;
  if(c.cmTile&&c.cmTile.view) return c.cmTile.view;
  return null;
}
/** Real content editors only (skip gutter/line-number cm-content). */
function contentViews(){
  const out=[];
  const seen=new Set();
  document.querySelectorAll('.cm-content').forEach((c,i)=>{
    let view=null;
    if(c.cmView&&c.cmView.view) view=c.cmView.view;
    else if(c.cmTile&&c.cmTile.view) view=c.cmTile.view;
    if(!view||seen.has(view)) return;
    const t=view.state.doc.toString();
    // skip pure line-number panes
    if(/^\\s*[\\d\\n]+\\s*$/.test(t) && t.length<200) return;
    if(t.split('\\n').every(l=>/^\\d*$/.test(l.trim())) && t.length<400) return;
    seen.add(view);
    out.push({i, view, len:t.length, headish:/unhide|dg-base|Demigod HEAD/i.test(t), footish:/foot-cdn|catbox\\.moe\\/[a-z0-9]+\\.js|footer-lite/i.test(t)});
  });
  return out;
}
function setEditor(i, text){
  const view=getView(i);
  if(!view) return {ok:false, reason:'no-view', i};
  view.dispatch({changes:{from:0,to:view.state.doc.length,insert:text}});
  // mark dirty for Webflow React state
  try{ view.dom?.dispatchEvent(new InputEvent('input',{bubbles:true})); }catch(e){}
  try{ view.focus(); }catch(e){}
  const after=view.state.doc.toString();
  return {ok:true, i, len:after.length, preview:after.slice(0,80), hasCatbox:after.includes('catbox'), hasUnhide:after.includes('unhide')};
}
function setFoot(text){
  const cvs=contentViews();
  // prefer existing footer editor, else second content view, else last
  let hit=cvs.find(c=>c.footish) || (cvs.length>=2?cvs[1]:null) || cvs[cvs.length-1];
  if(!hit) return {ok:false, reason:'no-foot-view', cvs:cvs.map(c=>({i:c.i,len:c.len,headish:c.headish,footish:c.footish}))};
  hit.view.dispatch({changes:{from:0,to:hit.view.state.doc.length,insert:text}});
  try{ hit.view.dom?.dispatchEvent(new InputEvent('input',{bubbles:true})); }catch(e){}
  try{
    hit.view.contentDOM?.dispatchEvent(new KeyboardEvent('keydown',{key:'a',bubbles:true}));
  }catch(e){}
  const after=hit.view.state.doc.toString();
  return {ok:true, i:hit.i, len:after.length, preview:after.slice(0,100), has01:after.includes('01yc26'), hasEvents:after.includes('th1yzx')||after.includes('events route'), cvs:cvs.map(c=>({i:c.i,len:c.len,headish:c.headish,footish:c.footish}))};
}
function setHead(text){
  const cvs=contentViews();
  let hit=cvs.find(c=>c.headish) || cvs[0];
  if(!hit) return {ok:false, reason:'no-head-view'};
  hit.view.dispatch({changes:{from:0,to:hit.view.state.doc.length,insert:text}});
  try{ hit.view.dom?.dispatchEvent(new InputEvent('input',{bubbles:true})); }catch(e){}
  const after=hit.view.state.doc.toString();
  return {ok:true, i:hit.i, len:after.length, preview:after.slice(0,80), hasUnhide:after.includes('unhide')};
}
`;

async function main() {
  // Honor publish freeze (unless --no-publish paste-only prep)
  if (!NO_PUBLISH) {
    const { status } = await import('./demigod-publish-freeze.mjs');
    const s = status();
    if (s.frozen && process.env.DEMIGOD_FORCE_PUBLISH !== '1') {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'publish_frozen',
          why: s.why,
          hint: 'node demigod-publish-freeze.mjs off  or use --no-publish for paste-only',
        }),
      );
      process.exit(1);
    }
  }

  const tabs = await cdpTabs();
  const page = tabs.find(
    (t) => t.type === 'page' && (t.url || '').startsWith('https://webflow.com/dashboard/sites/talentlink-sf/custom-code'),
  );
  if (!page) {
    console.error('No custom-code tab open');
    process.exit(2);
  }
  console.log('tab', page.id.slice(0, 8), page.url.slice(0, 70));
  const { ws, call } = connect(page.webSocketDebuggerUrl);
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Page.navigate', { url: 'https://webflow.com/dashboard/sites/talentlink-sf/custom-code' });
  let eds = 0;
  for (let i = 0; i < 25; i++) {
    await sleep(1200);
    const r = await call('Runtime.evaluate', { expression: 'document.querySelectorAll(".cm-editor").length', returnByValue: true });
    eds = r.result?.value || 0;
    if (eds >= 2) break;
  }
  if (eds < 2) {
    console.error('editors not ready');
    process.exit(3);
  }

  if (!FOOTER_ONLY) {
    const h = await call('Runtime.evaluate', {
      expression: `${GET_VIEW}; setHead(${JSON.stringify(HEAD)})`,
      returnByValue: true,
    });
    console.log('head', h.result?.value);
  }
  const f = await call('Runtime.evaluate', {
    expression: `${GET_VIEW}; setFoot(${JSON.stringify(FOOT)})`,
    returnByValue: true,
  });
  console.log('foot', f.result?.value);
  if (!f.result?.value?.ok) {
    console.error('footer paste failed');
    process.exit(4);
  }

  // Prefer Ctrl/Meta+S then Save button (forces dirty commit in some Webflow builds)
  await call('Runtime.evaluate', {
    expression: `(() => {
      const isMac=/mac/i.test(navigator.platform);
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown',{key:'s',code:'KeyS',metaKey:isMac,ctrlKey:!isMac,bubbles:true}));
      return 'keys';
    })()`,
    returnByValue: true,
  });
  await sleep(500);
  const sav = await call('Runtime.evaluate', {
    expression: `(() => {
      const b=[...document.querySelectorAll('button')].find(x=>/^\\s*Save\\s*$/i.test(x.textContent||'') || /saved|save changes/i.test(x.textContent||''));
      if(b){b.click();return {saved:true, label:(b.textContent||'').trim().slice(0,40)};}
      return {saved:false};
    })()`,
    returnByValue: true,
  });
  console.log('save', sav.result?.value);
  await sleep(8000);

  // verify foot content view
  const ver = await call('Runtime.evaluate', {
    expression: `${GET_VIEW}; (() => {
      const cvs=contentViews();
      const foot=cvs.find(c=>c.footish) || cvs[1] || cvs[cvs.length-1];
      const t=foot?foot.view.state.doc.toString():'';
      return {
        len:t.length,
        hasFootCdn: /files\\.catbox\\.moe\\/[a-z0-9]+\\.js/.test(t),
        has01: t.includes('01yc26'),
        hasEvents: /th1yzx|events route/.test(t),
        sample:t.slice(0,140),
        cvs:cvs.map(c=>({i:c.i,len:c.len,headish:c.headish,footish:c.footish}))
      };
    })()`,
    returnByValue: true,
  });
  console.log('verify', ver.result?.value);

  if (!NO_PUBLISH) {
    // Prefer official queue-publish API (session cookies) — more reliable than UI-only clicks
    const qpub = await call('Runtime.evaluate', {
      expression: `(async () => {
        // Confirm API already has expected footer markers before queue
        const code = await (await fetch('/api/sites/talentlink-sf/code', { credentials: 'include' })).json();
        const post = code?.meta?.postBody || '';
        const apiOk = /files\\.catbox\\.moe\\/[a-z0-9]+\\.js/.test(post);
        const res = await fetch('/api/sites/talentlink-sf/queue-publish', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            origin: 'dashboard',
            publishTarget: ['talentlink-sf.webflow.io', 'www.trydemigod.com'],
          }),
        });
        const text = await res.text();
        let taskId = null;
        try { taskId = JSON.parse(text)?.taskId || JSON.parse(text)?.task || null; } catch {}
        // Fallback: poll recent tasks path if response embeds id
        const idMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (!taskId && idMatch) taskId = idMatch[0];
        // Wait for completion via task polling if we got an id; else wait fixed
        let taskStatus = null;
        if (taskId) {
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
              const tr = await fetch('/api/site/talentlink-sf/tasks/' + taskId, { credentials: 'include' });
              const tj = await tr.json();
              taskStatus = tj?.status || tj?.state || tj?.task?.status || JSON.stringify(tj).slice(0, 120);
              if (/complete|success|done|published/i.test(String(taskStatus))) break;
              if (/fail|error/i.test(String(taskStatus))) break;
            } catch (e) { taskStatus = String(e); }
          }
        } else {
          await new Promise(r => setTimeout(r, 25000));
        }
        // UI backup click if queue-publish failed
        if (res.status >= 400) {
          const b = [...document.querySelectorAll('button')].find(x => /^\\s*Publish\\s*$/i.test((x.textContent || '').trim()));
          if (b) b.click();
          await new Promise(r => setTimeout(r, 2500));
          document.querySelectorAll('input[type=checkbox]').forEach(i => { if (!i.checked) try { i.click(); } catch (e) {} });
          const b2 = [...document.querySelectorAll('button')].find(x => /publish to selected/i.test(x.textContent || ''));
          if (b2) b2.click();
          await new Promise(r => setTimeout(r, 25000));
        }
        return { status: res.status, body: text.slice(0, 300), taskId, taskStatus, apiOk, postHasCatbox: apiOk };
      })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    console.log('queue-publish', qpub.result?.value);
  }

  ws.close();
  // live check (poll for CDN match)
  const footWanted = (FOOT.match(/catbox\.moe\/([a-z0-9]+\.js)/) || [])[1];
  let liveCdn = null;
  let pub = null;
  let liveOk = false;
  for (let i = 0; i < 12; i++) {
    const live = await (await fetch(`https://www.trydemigod.com/?cb=${Date.now()}-${i}`)).text();
    const cdn = [...live.matchAll(/files\.catbox\.moe\/([a-z0-9]+\.js)/g)].map((m) => m[1]);
    liveCdn = cdn[0] || null;
    pub = (live.match(/Last Published: ([^<]+)/) || [])[1] || null;
    if (footWanted && liveCdn === footWanted) {
      liveOk = true;
      break;
    }
    await sleep(4000);
  }
  console.log(JSON.stringify({ liveCdn, pub, footWanted, liveOk }, null, 2));
  process.exit(liveOk || NO_PUBLISH ? 0 : 5);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
