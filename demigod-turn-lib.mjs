#!/usr/bin/env node
/** Shared turn detection, screenshots, and reprompt helpers for Demigod loop. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT, log, sleep, connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';

export { ROOT, sleep };

export const STATE_PATH = path.join(ROOT, 'DEMIGOD-LOOP-STATE.json');
export const WATCHER_LOG = path.join(ROOT, 'demigod-watcher.log');
export const SHOTS_WEBFLOW = path.join(ROOT, 'audit-shots/webflow');
export const SHOTS_CURSOR = path.join(ROOT, 'audit-shots/cursor');

export const APPLY_CHUNKS = [
  'Double-click the Navigation component on canvas. In the nav master, change POST A JOB link text to HIRE TALENT and wire it to #startup-modal. Double-click the Footer component. Replace "2025 TalentLink SF" with "© 2026 Demigod" and any TalentLink SF with Demigod. Save component masters.',
  'Hide startup-modal and jobseeker-modal on page load (display:none). Show on FIND TALENT / GET JOB / HIRE TALENT click. Remove duplicate engineer form from main page — forms inside modals only.',
  'Simplify nav to: How It Works, Pricing, FAQ, FIND TALENT, GET JOB. Remove SOLUTIONS ABOUT BLOG SUPPORT POST A JOB.',
  'Wire pricing CTAs CHOOSE COMMISSION and CHOOSE SUBSCRIPTION to #startup-modal. Add 3 trust lines under hero: Daedalus delivers 3-5 curated SF matches; SF AI startups only; Trusted by YC founders.',
  'Footer: add hello@trydemigod.com visible. Add line: Daedalus — the AI demigod craftsman built only for SF AI talent matching.',
];

export function wlog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(WATCHER_LOG, `${line}\n`); } catch (_) { /* ignore */ }
}

export function loadDemigodState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch (_) {
    return { cycle: 0, phase: 'idle', errors: [], turns: {}, chunkIndex: 0 };
  }
}

export function saveDemigodState(s) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

export function readText(file, max = 5000) {
  try { return fs.readFileSync(path.join(ROOT, file), 'utf8').slice(0, max); } catch (_) { return ''; }
}

export function readJsonFile(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')); } catch (_) { return fallback; }
}

export function loadAuditJson() {
  return readJsonFile('HEAVY-DEMIGOD-AUDIT.json');
}

export function loadPlaytestJson() {
  return readJsonFile('DEMIGOD-PLAYTEST-REVIEW.json');
}

/** Fresh audit context from JSON — avoids stale markdown tails in Heavy prompts. */
export function formatAuditForPrompt(max = 2500) {
  const j = loadAuditJson();
  if (!j) return readText('HEAVY-DEMIGOD-AUDIT.md', max);
  const list = Array.isArray(j.issues) ? j.issues : [];
  const lines = [
    `Audit at: ${j.at || 'unknown'}`,
    `Issues (${list.length}):`,
    list.length ? list.map((i, n) => `${n + 1}. ${i}`).join('\n') : '_No issues detected_',
    '',
    'Signals:',
    JSON.stringify(j.signals || {}, null, 2),
  ];
  if (j.forms?.length) {
    lines.push('', 'Forms:', ...j.forms.map((f) => `- ${f.name}: ${f.fields?.slice(0, 6).join(', ')}`));
  }
  return lines.join('\n').slice(0, max);
}

export function formatPlaytestForPrompt(max = 1500) {
  const pt = loadPlaytestJson();
  if (!pt) return '';
  const lines = [
    `Playtest at: ${pt.at || 'unknown'} — ${pt.pass ? 'PASS' : 'FAIL'}`,
    `pageScan: ${JSON.stringify(pt.pageScan || {})}`,
    `htmlScan: mcpGone=${pt.htmlScan?.mcpScriptsGone}, formsOk=${pt.htmlScan?.formsOk}`,
    'Findings:',
    ...(pt.findings || []).map((f) => `- [${f.severity}] ${f.issue}`),
  ];
  return lines.join('\n').slice(0, max);
}

/** Keep DEMIGOD-LOOP-STATE.lastAuditIssues aligned with HEAVY-DEMIGOD-AUDIT.json. */
export function syncLoopAuditFromJson() {
  const j = loadAuditJson();
  if (!j || !Array.isArray(j.issues)) return null;
  const state = loadDemigodState();
  const count = j.issues.length;
  if (state.lastAuditIssues !== count || !state.lastAudit) {
    state.lastAuditIssues = count;
    state.lastAudit = j.at || new Date().toISOString();
    saveDemigodState(state);
    wlog(`syncLoopAuditFromJson: lastAuditIssues=${count}`);
  }
  return count;
}

function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

export const WEBFLOW_DESIGNER_URL = 'https://talentlink-sf.design.webflow.com/?pageId=6a34c484dcedc18a174081b8';
export const WEBFLOW_MIN_VIEWPORT = 900;

/** Resize the real Chrome window + tab viewport so Webflow exits "browser too small" mode. */
export async function ensureWebflowDesignerWide(page, opts = {}) {
  if (!page) return { ok: false, reason: 'no page' };
  const windowWidth = opts.windowWidth ?? 1600;
  const windowHeight = opts.windowHeight ?? 1000;
  const viewportWidth = opts.viewportWidth ?? 1440;
  const viewportHeight = opts.viewportHeight ?? 900;
  const minWidth = opts.minWidth ?? WEBFLOW_MIN_VIEWPORT;

  await page.bringToFront();
  const before = await page.evaluate((min) => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    tooSmall: /browser is too small|at least 900px/i.test(document.body?.innerText || ''),
    needsResize: window.innerWidth < min,
  }), minWidth);

  let windowResized = false;
  try {
    const session = await page.target().createCDPSession();
    const { windowId } = await session.send('Browser.getWindowForTarget');
    await session.send('Browser.setWindowBounds', {
      windowId,
      bounds: { width: windowWidth, height: windowHeight, windowState: 'normal' },
    });
    windowResized = true;
  } catch (e) {
    wlog(`ensureWebflowDesignerWide: setWindowBounds failed — ${e.message || e}`);
  }

  await page.setViewport({ width: viewportWidth, height: viewportHeight });

  if (before.needsResize || before.tooSmall || windowResized) {
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
      await sleep(4500);
    } catch (e) {
      wlog(`ensureWebflowDesignerWide: reload failed — ${e.message || e}`);
      await sleep(1500);
    }
  } else {
    await sleep(800);
  }

  const after = await page.evaluate((min) => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    tooSmall: /browser is too small|at least 900px/i.test(document.body?.innerText || ''),
    ok: window.innerWidth >= min && !/browser is too small/i.test(document.body?.innerText || ''),
  }), minWidth);

  return { ...after, before, windowResized };
}

/** Open Designer tab (if needed) and guarantee design-mode width. */
export async function prepareWebflowDesigner(browser, opts = {}) {
  const designerUrl = opts.url || WEBFLOW_DESIGNER_URL;
  let page = await findWebflowPage(browser);
  if (!page) {
    page = await browser.newPage();
    await page.goto(designerUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(4000);
  } else {
    await page.bringToFront();
    if (!page.url().includes('design.webflow.com')) {
      await page.goto(designerUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await sleep(4000);
    }
  }
  const resize = await ensureWebflowDesignerWide(page, opts);
  return { page, resize };
}

export async function findWebflowPage(browser) {
  return (await browser.pages()).find((p) => p.url().includes('talentlink-sf.design.webflow.com'));
}

export async function findCursorPage(browser) {
  const pages = await browser.pages();
  return pages.find((p) => /cursor\.com\/agents\/bc-/.test(p.url()))
    || pages.find((p) => p.url().includes('cursor.com/agents'));
}

export async function probeWebflowTurn(page) {
  if (!page) return { status: 'missing', busy: false, canSubmit: false };
  return page.evaluate(() => {
    const stop = [...document.querySelectorAll('button')].find((b) => /stop response/i.test(b.textContent || ''));
    const ta = [...document.querySelectorAll('textarea')].find((t) => /what would you like|describe what/i.test(t.placeholder || ''));
    const thinking = /thinking\.\.\./i.test(document.body?.innerText || '');
    const busy = !!(stop || ta?.disabled || thinking);
    const aiPanel = document.body?.innerText || '';
    const lastReply = aiPanel.match(/I have [^\n]{20,200}/)?.[0]
      || aiPanel.match(/Done[^\n]{0,120}/)?.[0]
      || '';
    return {
      status: busy ? 'busy' : 'idle',
      busy,
      canSubmit: !!(ta && !ta.disabled),
      textareaValue: (ta?.value || '').slice(0, 120),
      lastReply: lastReply.slice(0, 200),
    };
  });
}

export async function getCursorFingerprint(page) {
  if (!page) return '';
  return page.evaluate(() => (document.body?.innerText || '').slice(-5000));
}

export async function probeCursorTurn(page) {
  if (!page) return { status: 'missing', busy: false, canFollowUp: false };
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    const tail = body.slice(-6000);
    const stop = [...document.querySelectorAll('button')].find((b) => /^stop$/i.test((b.textContent || '').trim()));
    const queued = [...document.querySelectorAll('button')].some((b) => /queued/i.test(b.textContent || ''));
    const gptDisabled = [...document.querySelectorAll('form button')].some((b) =>
      /GPT|High/i.test(b.textContent || '') && b.disabled);
    const active = /Planning next moves|Running start script|Explored available tools|Worked for \d|Used\s+data_|Thought\s+for/i.test(tail);
    const busy = !!(stop || queued || (gptDisabled && active));
    const onAgent = /\/agents\/bc-/.test(location.href);
    const followUp = document.querySelector('form [role="textbox"], form textarea, form [contenteditable="true"]');
    const agentTitle = document.querySelector('main')?.innerText?.split('\n').find((l) => /demigod|webflow/i.test(l)) || '';
    const lastThought = tail.match(/Summary[\s\S]{0,300}/)?.[0]
      || tail.match(/Used\s+[^\n]{10,120}/)?.[0]
      || '';
    return {
      status: busy ? 'busy' : 'idle',
      busy,
      canFollowUp: !!(followUp && !stop && !gptDisabled),
      onAgent,
      agentUrl: location.href,
      agentTitle: agentTitle.slice(0, 80),
      lastThought: lastThought.slice(0, 200),
      webflowMcp: !!([...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Webflow')),
      queued,
    };
  });
}

export async function probeHeavyTurn(page) {
  if (!page) return { status: 'missing', busy: false };
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    const busy = /thinking|Agents thinking|Finalizing/i.test(body.slice(-4000));
    return { status: busy ? 'busy' : 'idle', busy };
  });
}

export async function probeAllTurns() {
  const browser = await connectBrowser();
  const webflowPage = await findWebflowPage(browser);
  const cursorPage = await findCursorPage(browser);
  const grokPage = await findGrokPage(browser);
  const [webflow, cursor, heavy] = await Promise.all([
    probeWebflowTurn(webflowPage),
    probeCursorTurn(cursorPage),
    probeHeavyTurn(grokPage),
  ]);
  await browser.disconnect();
  return { webflow, cursor, heavy, at: new Date().toISOString() };
}

export async function captureDemigodScreenshots(label = 'snap') {
  fs.mkdirSync(SHOTS_WEBFLOW, { recursive: true });
  fs.mkdirSync(SHOTS_CURSOR, { recursive: true });
  const browser = await connectBrowser();
  const ts = stamp();
  const out = { webflow: null, cursor: null, at: new Date().toISOString(), label };

  const wf = await findWebflowPage(browser);
  if (wf) {
    await wf.bringToFront();
    await wf.setViewport({ width: 1440, height: 900 });
    await sleep(800);
    out.webflow = path.join(SHOTS_WEBFLOW, `${label}-${ts}.png`);
    await wf.screenshot({ path: out.webflow, fullPage: false });
  }

  const cur = await findCursorPage(browser);
  if (cur) {
    await cur.bringToFront();
    await sleep(500);
    out.cursor = path.join(SHOTS_CURSOR, `${label}-${ts}.png`);
    await cur.screenshot({ path: out.cursor, fullPage: false });
  }

  await browser.disconnect();
  wlog(`screenshots ${label}: webflow=${!!out.webflow} cursor=${!!out.cursor}`);
  return out;
}

export async function getWebflowAiTail(page) {
  return page.evaluate(() => {
    const panel = document.body?.innerText || '';
    const msgs = panel.split('\n').filter((l) => l.length > 40);
    return msgs.slice(-3).join('\n').slice(-600);
  });
}

async function openWebflowAiPanel(page) {
  await page.evaluate(() => {
    const close = [...document.querySelectorAll('button')].find((b) =>
      /close|dismiss/i.test(b.getAttribute('aria-label') || '') && b.closest('[class*="marketplace"],[class*="Marketplace"],[role="dialog"]'));
    close?.click();
    const appsBtn = [...document.querySelectorAll('button')].find((b) =>
      /apps/i.test(b.getAttribute('aria-label') || b.textContent || ''));
    if (appsBtn?.getAttribute('aria-pressed') === 'true') appsBtn.click();
  });
  await sleep(600);
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => {
      const label = (b.textContent || b.getAttribute('aria-label') || '').trim();
      return /^AI Assistant$/i.test(label) || /webflow ai/i.test(label);
    });
    if (btn) { btn.click(); return { ok: true, clicked: 'AI Assistant' }; }
    return { ok: false, reason: 'no AI Assistant button' };
  });
}

export async function submitWebflowAiPrompt(text) {
  const browser = await connectBrowser();
  const page = await findWebflowPage(browser);
  if (!page) { await browser.disconnect(); return { ok: false, reason: 'no webflow tab' }; }

  await ensureWebflowDesignerWide(page);

  let idle = await probeWebflowTurn(page);
  if (!idle.canSubmit) {
    await openWebflowAiPanel(page);
    await sleep(2500);
    idle = await probeWebflowTurn(page);
  }
  if (idle.busy) { await browser.disconnect(); return { ok: false, reason: 'webflow ai busy' }; }

  const beforeTail = await getWebflowAiTail(page);

  const result = await page.evaluate((prompt) => {
    const ta = [...document.querySelectorAll('textarea')].find((t) => /what would you like|describe what/i.test(t.placeholder || ''));
    if (!ta || ta.disabled) return { ok: false, reason: ta ? 'disabled' : 'no textarea' };
    ta.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, prompt);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    const submit = [...document.querySelectorAll('button')].find((b) => /^submit$/i.test((b.textContent || '').trim()) && !b.disabled);
    if (submit) { submit.click(); return { ok: true, submitted: true }; }
    return { ok: true, submitted: false };
  }, text.slice(0, 4500));

  if (result.ok && !result.submitted) {
    await page.keyboard.press('Enter');
    result.submitted = true;
  }

  await sleep(1000);
  await browser.disconnect();
  return { ...result, beforeTail: beforeTail.slice(-200) };
}

export async function waitWebflowTurnComplete(maxMs = 300000, beforeTail = '') {
  const start = Date.now();
  let sawBusy = false;
  while (Date.now() - start < maxMs) {
    const browser = await connectBrowser();
    const page = await findWebflowPage(browser);
    const turn = await probeWebflowTurn(page);
    const tail = await getWebflowAiTail(page);
    await browser.disconnect();
    if (turn.busy) sawBusy = true;
    const changed = beforeTail && tail !== beforeTail && !tail.endsWith(beforeTail.slice(-120));
    if (sawBusy && !turn.busy && (changed || Date.now() - start > 90000)) {
      return { ok: true, turn, tail: tail.slice(-200), changed };
    }
    if (!turn.busy && !beforeTail && Date.now() - start > 10000) {
      return { ok: true, turn, tail: tail.slice(-200), changed: false };
    }
    await sleep(5000);
  }
  return { ok: false, reason: 'timeout' };
}

export async function waitCursorTurnComplete(agentUrl, maxMs = 600000, beforeFingerprint = '') {
  const start = Date.now();
  let sawBusy = false;
  while (Date.now() - start < maxMs) {
    const browser = await connectBrowser();
    let page = (await browser.pages()).find((p) => agentUrl && p.url() === agentUrl);
    if (!page && agentUrl?.includes('/agents/bc-')) {
      page = await browser.newPage();
      await page.goto(agentUrl, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await sleep(2000);
    }
    if (!page) page = await findCursorPage(browser);
    const turn = await probeCursorTurn(page);
    const fp = await getCursorFingerprint(page);
    await browser.disconnect();

    if (turn.busy) sawBusy = true;
    const grew = beforeFingerprint && fp.length > beforeFingerprint.length + 80
      && fp.slice(-500) !== beforeFingerprint.slice(-500);
    if (sawBusy && !turn.busy) {
      return { ok: true, turn, changed: true, fingerprint: fp.slice(-200) };
    }
    if (grew && !turn.busy && Date.now() - start > 30000) {
      return { ok: true, turn, changed: true, fingerprint: fp.slice(-200) };
    }
    await sleep(6000);
  }
  return { ok: false, reason: 'timeout' };
}

export function pickNextChunk(state, auditIssues = []) {
  const j = loadAuditJson();
  const s = j?.signals || {};
  const text = j?.textSample || readText('HEAVY-DEMIGOD-AUDIT.md', 3000);
  const priority = [];
  if (s.postJob) priority.push(0);
  if (!s.summonModal || !s.joinModal || /duplicate.*form/i.test(text)) priority.push(1);
  if (s.postJob || /SOLUTIONS|ABOUT|BLOG/i.test(text)) priority.push(2);
  if (/CHOOSE COMMISSION|#find-talent/i.test(text)) priority.push(3);
  if (!s.footer2026 || !s.helloEmail) priority.push(4);

  const idx = priority[0] ?? (state.chunkIndex ?? 0) % APPLY_CHUNKS.length;
  state.chunkIndex = (idx + 1) % APPLY_CHUNKS.length;
  return APPLY_CHUNKS[idx];
}

export function buildCursorFollowUp(state) {
  const audit = formatAuditForPrompt(1400);
  const playtest = formatPlaytestForPrompt(600);
  const design = readText('HEAVY-DEMIGOD-DESIGN-AUDIT.md', 2000);
  const competitive = readText('HEAVY-DEMIGOD-COMPETITIVE.md', 1500);
  const codeHelp = readText('HEAVY-DEMIGOD-CODE-HELP.md', 2000);
  const visual = readText('HEAVY-DEMIGOD-VISUAL-DIRECTION.md', 1200);
  return `Demigod Webflow follow-up — WEBFLOW MCP ONLY (no repo edits).

Continue on talentlink-sf / Demigod site. Publish when verified.

LATEST AUDIT (JSON):
${audit}

LIVE PLAYTEST:
${playtest || '_no playtest file_'}

HEAVY CODE HELP (follow this):
${codeHelp.slice(0, 1200)}

HEAVY VISUAL DIRECTION:
${visual.slice(0, 800)}

${design ? `DESIGN AUDIT:\n${design.slice(0, 600)}\n` : ''}
HEAVY RESEARCH:
${competitive.slice(0, 600)}

Launch Webflow MCP Bridge before edits. Nav/footer = component masters (double-click). POST A JOB → HIRE TALENT, © 2026 Demigod.

Execute Heavy code help items 11–12 this turn. Report what changed.`;
}

export async function submitCursorFollowUp(prompt) {
  const browser = await connectBrowser();
  const state = loadDemigodState();
  const agentUrl = state.cursorAgentUrl || '';
  let page = (await browser.pages()).find((p) => agentUrl && p.url() === agentUrl);

  if (!page && agentUrl.includes('/agents/bc-')) {
    page = await browser.newPage();
    await page.goto(agentUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2500);
  }

  if (!page) page = await findCursorPage(browser);
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  }

  await page.bringToFront();
  await sleep(1000);

  const beforeFingerprint = await getCursorFingerprint(page);
  const onAgent = /\/agents\/bc-/.test(page.url());
  const focused = await page.evaluate(() => {
    const forms = [...document.querySelectorAll('form')];
    const form = forms.at(-1) || forms[0];
    const box = form?.querySelector('[role="textbox"], textarea, [contenteditable="true"]')
      || [...document.querySelectorAll('[role="textbox"], textarea, [contenteditable="true"]')]
        .find((el) => el.offsetParent !== null);
    if (!box) return false;
    box.focus();
    box.click();
    return true;
  });
  if (!focused) {
    await browser.disconnect();
    return { ok: false, reason: 'no composer', onAgent };
  }

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Webflow');
    if (btn) btn.click();
  });
  await sleep(400);

  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(prompt.slice(0, 3500), { delay: 2 });
  await sleep(400);
  await page.keyboard.press('Enter');
  await sleep(2500);

  const shot = path.join(SHOTS_CURSOR, `followup-${stamp()}.png`);
  fs.mkdirSync(SHOTS_CURSOR, { recursive: true });
  await page.screenshot({ path: shot });

  const finalUrl = page.url();
  if (/\/agents\/bc-/.test(finalUrl)) state.cursorAgentUrl = finalUrl;
  saveDemigodState(state);
  await browser.disconnect();
  return {
    ok: true, shot,
    agentUrl: state.cursorAgentUrl || finalUrl,
    onAgent: /\/agents\/bc-/.test(finalUrl),
    beforeFingerprint: beforeFingerprint.slice(-500),
  };
}

export async function runHeavyCodeHelp(extraContext = '') {
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) { await browser.disconnect(); throw new Error('no grok tab'); }

  const audit = formatAuditForPrompt(2800);
  const playtest = formatPlaytestForPrompt(800);
  const design = readText('HEAVY-DEMIGOD-DESIGN-AUDIT.md', 1500);
  const competitive = readText('HEAVY-DEMIGOD-COMPETITIVE.md', 1200);

  const PROMPT = `SuperGrok Heavy — CODE + WEBFLOW MCP HELP for Demigod (talentlink-sf).

You are the technical advisor. Cursor agent + Webflow AI apply your advice via Designer + MCP Bridge.

STACK: Webflow Designer, Webflow MCP Bridge App, Cursor cloud agent (Webflow MCP only — no repo).
Site plan: Starter (free) — branding toggle locked; custom code in head works.
Published: talentlink-sf.webflow.io

RECENT FIXES:
- Removed "Made in Webflow" badge via head custom code (CSS hide + JS remove .w-webflow-badge)
- Modals exist (startup + jobseeker); hero CTAs wired
- hello@trydemigod.com on page

BLOCKER: Navigation + Footer are SITE COMPONENT MASTERS — Webflow AI says read-only; must double-click masters or use MCP Bridge.

LATEST AUDIT (from HEAVY-DEMIGOD-AUDIT.json — ignore any older markdown):
${audit}

LIVE PLAYTEST:
${playtest || '_no playtest_'}

PRIOR DESIGN NOTES:
${design.slice(0, 1000)}

COMPETITIVE CONTEXT:
${competitive.slice(0, 800)}

${extraContext ? `EXTRA CONTEXT:\n${extraContext.slice(0, 800)}\n` : ''}

Deliver numbered CODE HELP (max 14 items, copy-paste ready):
1. Exact steps to edit Navigation component master (POST A JOB → HIRE TALENT, #startup-modal) via Designer OR MCP
2. Exact steps for Footer master (© 2026 Demigod)
3. Webflow MCP Bridge launch checklist — how Cursor confirms Bridge connected
4. Custom code snippets ONLY if needed (badge already hidden; nav/footer need real edits)
5. Whether Starter → Basic upgrade is required for component master API access
6. Modal hide-on-load interaction or embed pattern (display:none on load)
7. Fix duplicate hiring-model radio ID in startup form
8. Wire CHOOSE COMMISSION / CHOOSE SUBSCRIPTION to #startup-modal
9. Form submission "Oops" errors — likely causes + Webflow form settings fix
10. Publish verification checklist (designer canvas vs live .webflow.io)
11. Top 3 tasks for Cursor agent THIS turn (ordered, MCP-only)
12. Top 3 tasks for Webflow AI THIS turn (component master language)
13. Anti-patterns to avoid (JS fallbacks that fight component masters)
14. One-line success criteria for next audit (0 issues)

Blunt. Webflow-implementable. No essays.`;

  await page.bringToFront();
  await sendToGrok(page, PROMPT);

  let reply = { text: '', thinking: true };
  for (let i = 0; i < 12; i++) {
    reply = await collectGrokReply(page, { waitMs: 40000, minGrowth: 60 });
    const tail = (reply.text || '').slice(-5000);
    const stillBusy = reply.thinking || /Finalizing|thinking|Agents thinking/i.test(tail);
    const hasCode = /MCP|component master|custom code|#startup-modal/i.test(tail);
    if (reply.text && hasCode && !stillBusy && tail.length > 400) break;
    if (reply.text && !stillBusy && tail.length > 900 && i >= 4) break;
  }

  const text = reply?.text || '';
  const OUT = path.join(ROOT, 'HEAVY-DEMIGOD-CODE-HELP.md');
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Demigod Code / MCP Help\n\n_Date: ${new Date().toISOString()}_\n\n${text}\n`);
  fs.writeFileSync(path.join(ROOT, 'HEAVY-DEMIGOD-CODE-HELP-SENT.txt'), `${new Date().toISOString()} chars=${PROMPT.length} reply=${text.length}\n`);
  await browser.disconnect();
  wlog(`heavy code help saved ${OUT} (${text.length} chars)`);
  return { ok: true, path: OUT, chars: text.length };
}

export async function runHeavyDesignAudit(shotPath) {
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) { await browser.disconnect(); throw new Error('no grok tab'); }

  const audit = formatAuditForPrompt(2500);
  const playtest = formatPlaytestForPrompt(600);
  const competitive = readText('HEAVY-DEMIGOD-COMPETITIVE.md', 2000);

  const PROMPT = `SuperGrok Heavy — DESIGN AUDIT for Demigod (SF startup hiring + engineer matching site).

GOAL: Best possible simple site SF AI startups will use to hire, and engineers will use to get matched.

Latest screenshot: ${shotPath || '(designer canvas)'}
Current audit (JSON — NOT stale markdown):
${audit}

Live playtest truth:
${playtest || '_no playtest_'}

Prior competitive notes:
${competitive.slice(0, 1500)}

Deliver numbered DESIGN AUDIT (max 12 items):
1. First-impression score 1-10 for startups AND engineers separately
2. Hero: headline/subhead/CTA clarity vs Fonzi/Dover patterns
3. Trust gap — what's missing for SF founders to submit startup form
4. Engineer appeal — why would a senior SF engineer apply here vs Fonzi
5. Nav/footer fixes (exact copy)
6. Modal UX — hide/show, mobile, form friction
7. Sections to DELETE for simplicity
8. Sections to ADD (max 2, minimal)
9. Typography/spacing/mythic tone balance
10. Top 3 changes for THIS cycle (Webflow-implementable, specific)
11. Research one current SF recruiting trend (2025-2026) we should echo
12. Publish checklist before going live

Blunt. Implementable in Webflow Starter. No essays.`;

  await page.bringToFront();
  await sendToGrok(page, PROMPT);

  let reply = { text: '', thinking: true };
  for (let i = 0; i < 12; i++) {
    reply = await collectGrokReply(page, { waitMs: 40000, minGrowth: 60 });
    const tail = (reply.text || '').slice(-5000);
    const stillBusy = reply.thinking || /Finalizing|thinking|Agents thinking/i.test(tail);
    if (reply.text && !stillBusy && tail.length > 500) break;
    if (reply.text && tail.length > 1200 && i >= 5) break;
  }

  const text = reply?.text || '';
  const OUT = path.join(ROOT, 'HEAVY-DEMIGOD-DESIGN-AUDIT.md');
  fs.writeFileSync(OUT, `# SuperGrok Heavy — Demigod Design Audit\n\n_Date: ${new Date().toISOString()}_\n_Screenshot: ${shotPath || 'n/a'}_\n\n${text}\n`);
  await browser.disconnect();
  wlog(`heavy design audit saved ${OUT} (${text.length} chars)`);
  return { ok: true, path: OUT, chars: text.length };
}

export function turnJustCompleted(prev, next, key) {
  if (!prev?.[key] || !next?.[key]) return false;
  return prev[key].busy && !next[key].busy;
}