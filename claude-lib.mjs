/** Claude Code / Fable interaction helpers for Demigod.
 * Use browser CDP (chat tab preferred) + CLI fallback.
 * Call from node scripts or terminal for full automation.
 *
 * For Demigod tasks, prefer promptDemigodFable() which injects current
 * operating truth, copy policy, and key state.
 */
import puppeteer from 'puppeteer-core';
import { spawnSync } from 'child_process';
import { CDP_URL } from './cdp-config.mjs';
import fs from 'fs';
import path from 'path';

export const CLAUDE_CHAT_URL = 'https://claude.ai/chat/';

export async function connectClaude() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  return browser;
}

export async function findClaudeChatPage(browser) {
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('/chat/') && p.url().includes('claude.ai'));
  if (!page) {
    // fallback to any claude
    page = pages.find(p => p.url().includes('claude.ai'));
  }
  if (page) await page.bringToFront();
  return page;
}

export async function sendPromptToClaude(page, prompt) {
  if (!page) throw new Error('no claude page');
  const inputSel = '.ProseMirror';
  await page.waitForSelector(inputSel, { timeout: 10000 }).catch(() => {});
  await page.evaluate((sel, text) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.focus();
    // select all and delete
    const range = document.createRange();
    range.selectNodeContents(el);
    const selObj = window.getSelection();
    selObj.removeAllRanges();
    selObj.addRange(range);
    document.execCommand('delete');
    document.execCommand('insertText', false, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, inputSel, (() => {
  const MAX = 60000;
  if (prompt.length > MAX) console.warn(`[claude-lib] WARN: prompt ${prompt.length} -> ${MAX} chars — use sendViaCLI for full reports`);
  return prompt.slice(0, MAX);
})());

  await new Promise(r => setTimeout(r, 600));

  // Try to click send or Enter
  const sent = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const send = btns.find(b => {
      const t = ((b.getAttribute('aria-label') || b.textContent || b.innerHTML) || '').toLowerCase();
      return t.includes('send') || t.includes('arrow') || b.querySelector('svg');
    });
    if (send) { send.click(); return 'clicked'; }
    // fallback
    const inp = document.querySelector('.ProseMirror');
    if (inp) inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return 'enter';
  });
  return sent;
}

export async function collectClaudeReply(page, { maxWaitMs = 120000, pollMs = 1500 } = {}) {
  if (!page) return '';
  const start = Date.now();
  let lastLen = 0;
  let best = '';
  let stableCount = 0;
  // From live inspection: .font-claude-response-body is reliable for assistant text
  const respSel = '.font-claude-response-body, [data-message-id], article';

  while (Date.now() - start < maxWaitMs) {
    const text = await page.evaluate((sel) => {
      const els = Array.from(document.querySelectorAll(sel));
      if (!els.length) return '';
      let best = '';
      for (let i = els.length - 1; i >= 0; i--) {
        const t = (els[i].innerText || els[i].textContent || '').trim().replace(/\s+/g, ' ');
        if (t.length > best.length) best = t;
        if (t.length > 250) break;
      }
      return best;
    }, respSel);

    if (text && text === best) { stableCount++; } else { stableCount = 0; best = text; lastLen = text.length; }
    if (best.length > 300 && stableCount >= 3) return best;
    await new Promise(r => setTimeout(r, pollMs));
  }
  return best || 'no-response-captured';
}

export function sendViaCLI(prompt, { model = 'fable', addDir = '/home/potter', bare = false } = {}) {
  // Non-interactive: claude --print "prompt" --model ... [--add-dir]
  // Prompt must follow --print immediately for this CLI version.
  // Note: --bare breaks auth/context; omit (loads CLAUDE.md rules).
  const args = ['--print', prompt, '--model', model];
  if (addDir) args.push('--add-dir', addDir);
  // bare intentionally default false for Demigod (needs CLAUDE.md + full context)
  if (bare) args.push('--bare');
  const res = spawnSync('claude', args, { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 });
  if (res.error) throw res.error;
  const out = (res.stdout || res.stderr || '').trim();
  if (out.includes('Not logged in') || out.includes('Input must be provided')) {
    throw new Error('CLI auth or usage issue: ' + out.slice(0,200));
  }
  return out;
}

// Convenience: try browser first (rich context), fallback to CLI
export async function promptClaude(prompt, opts = {}) {
  try {
    const browser = await connectClaude();
    const page = await findClaudeChatPage(browser);
    if (page) {
      await sendPromptToClaude(page, prompt);
      const reply = await collectClaudeReply(page, opts);
      await browser.disconnect();
      if (reply && reply !== 'no-response-captured') return { source: 'browser', reply };
    }
    await browser.disconnect();
  } catch (e) { /* fallthrough */ }
  // CLI fallback
  const reply = sendViaCLI(prompt, opts);
  return { source: 'cli', reply };
}

/**
 * Demigod-aware Fable prompt helper.
 * Prepends key context (operating mode, copy policy, board summary hint).
 * Use for copy, code, tracker, outreach improvements.
 */
export function getDemigodFableContext() {
  const ROOT = '/home/potter';
  // fs/path are the top-level ESM imports — never require() in .mjs
  let boardSnap = "";
  try {
    const b = JSON.parse(fs.readFileSync(path.join(ROOT, "demigod-board.json"), "utf8"));
    const real = b.roles.filter(r => !r.pilot && !/^role-seed/i.test(r.id || "")).length;
    const recs = (b.receipts || []).length;
    const pre = (b.pilots || []).filter(p => p.preServices).length;
    boardSnap = `\nLive board: ${real} real roles, ${recs} receipts, ${pre} pre-services pilots logged.`;
  } catch (e) {
    boardSnap = `\n(board snapshot unavailable: ${e.message})`;   // fail LOUD, not silent
  }
  let stateSnap = "";
  try {
    const raw = fs.readFileSync(path.join(ROOT, "DEMIGOD-COMPRESSED-STATE.md"), "utf8");
    stateSnap = `\n\nCurrent state snapshot:\n${raw.slice(0, 2500)}`;
  } catch {}
  let operatingMode = "Read DEMIGOD-SIMPLE.md for the current operating mode.";
  try {
    operatingMode = fs.readFileSync(path.join(ROOT, "DEMIGOD-SIMPLE.md"), "utf8")
      .split("\n")
      .find((line) => line.startsWith("**Operating mode:**")) || operatingMode;
  } catch {}
  return `Demigod context (Webflow SF startup talent matching):
- ${operatingMode}
- Derive capability claims from current receipts; do not assume an integration is live or pending.
- Copy policy: no 48h/SLA promises or founder names in public text. Runtime scrubs only.
- One canonical: demigod-foot-core.js (or demigod-* scripts). Verify with npm run demigod:verify:all after edits.
- Tracker supports --intros, introsSent, pendingIntegrations, pipeline summaries.
- Outreach templates + DEMIGOD-CLAUDE.md exist. Reference current board for proof.
- AUTONOMY: You (Fable/Claude) and the calling agent (Grok) are empowered to run full safe cycles autonomously — review, minimal canonical edits, verifies, task-scoped operations prep, CDP audits — without asking mid-cycle. Surface only at human gates (Publish, real sends, configs). Use this to increase your own capability and the agent's. Propose exact diffs or ready code.${boardSnap}${stateSnap}`;
}

export async function promptDemigodFable(task, opts = {}) {
  const context = getDemigodFableContext();
  const full = `${context}\n\nTask: ${task}`;

  if (opts.fresh) {
    // Force clean CLI path to avoid tab context pollution
    const reply = sendViaCLI(full, { model: 'fable', ...opts });
    return { source: 'cli-fresh', reply };
  }
  return promptClaude(full, { model: 'fable', ...opts });
}

/**
 * Dedicated helper for autonomous self-improvement calls.
 * Always uses fresh CLI (reliable, no browser pollution), adds strong framing.
 * Enables Grok/Fable to improve their own capability with fewer user interactions.
 */
export function promptAutonomousFable(task, opts = {}) {
  const context = getDemigodFableContext();
  const full = `${context}\n\nAUTONOMY SELF-IMPROVEMENT (durable mode): ${task}\n\nRules: one canonical file, run verify:all after edits, human does Publish. Suggest only simple elegant minimal changes. Output ready diffs or code. Focus on increasing independent cycle execution without asking.`;
  const reply = sendViaCLI(full, { model: 'fable', fresh: true, bare: false, ...opts });
  return { source: 'cli-autonomy', reply };
}
