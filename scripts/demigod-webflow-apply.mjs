#!/usr/bin/env node
/** Push Heavy plan prompt to Webflow AI Assistant via CDP. */
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from '../cdp-config.mjs';

const competitive = fs.readFileSync('/home/potter/HEAVY-DEMIGOD-COMPETITIVE.md', 'utf8');
const audit = fs.existsSync('/home/potter/HEAVY-DEMIGOD-AUDIT.md')
  ? fs.readFileSync('/home/potter/HEAVY-DEMIGOD-AUDIT.md', 'utf8')
  : '';
const PROMPT = `Demigod Webflow apply cycle — simple SF recruiting (Fonzi-inspired, minimal).

AUDIT:
${audit.slice(0, 2000)}

HEAVY COMPETITIVE FIXES (top 3 only this pass):
${competitive.slice(0, 3500)}

Apply nav/branding/modal/deletion fixes only. No new sections.`;

const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => p.url().includes('talentlink-sf.design.webflow.com'));
if (!page) throw new Error('open Webflow Demigod designer first');

await page.bringToFront();
const ok = await page.evaluate((text) => {
  const ta = [...document.querySelectorAll('textarea')].find((t) => /what would you like|describe what/i.test(t.placeholder || ''));
  if (!ta || ta.disabled) return { ok: false, reason: ta ? 'disabled' : 'no textarea' };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, text);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  const submit = [...document.querySelectorAll('button')].find((b) => /^submit$/i.test(b.textContent.trim()) && !b.disabled);
  if (submit) { submit.click(); return { ok: true, submitted: true }; }
  return { ok: true, submitted: false };
}, PROMPT);
console.log(JSON.stringify(ok));
await browser.disconnect();