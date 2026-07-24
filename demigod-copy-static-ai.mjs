#!/usr/bin/env node
/** Webflow AI: permanent static scrub of timed-match SLA copy / John Doe + page SEO meta. */
import fs from 'fs';
import path from 'path';
import { ROOT, wlog, submitWebflowAiPrompt, waitWebflowTurnComplete } from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-COPY-STATIC-AI.json');
const CLEAN_META = 'Demigod matches SF startups with curated talent. Human-reviewed profiles. 10% fee on hire only. potter@trydemigod.com';
const CLEAN_OG = 'SF startups submit a brief. Candidates upload once. Humans match. 10% on hire.';
const CLEAN_HERO = 'SF Bay Area startups submit a role brief. Candidates upload a profile once. Humans review every match.';

const PROMPT = `COPY POLICY FIX — Demigod HOME page only. No reply-speed promises. No founder names.

PAGE SETTINGS → SEO tab:
- Meta description: ${CLEAN_META}
- Open Graph description: ${CLEAN_OG}
- Twitter description: ${CLEAN_OG}

CANVAS permanent fixes (edit text, do not rely on hide):
- Scrub every reply-speed / hour-count SLA claim (no timed match promises of any kind)
- Hero description → ${CLEAN_HERO}
- Engineer modal placeholder "John Doe" → "Your full name"
- Delete or rewrite any step card that claims timed human matching speed
- Footer tagline: scrub timed match promises
- Replace TalentLink branding with Demigod

Publish to www.trydemigod.com AND talentlink-sf.webflow.io. List every string changed.`;

async function metrics() {
  const { html } = await fetchLiveHtml();
  return {
    speedLeaks: (html.match(/48\s*h(?:ours?)?|within\s*48|3-5[^<]{0,40}48/gi) || []).length,
    nameLeaks: (html.match(/John\s+Doe/gi) || []).length,
    talentLink: (html.match(/TalentLink/gi) || []).length,
    badMeta: /3-5.*48\s*h|48\s*hours.*10% fee/i.test(html) ? 1 : 0,
  };
}

async function main() {
  wlog('=== COPY STATIC AI START ===');
  const result = { at: new Date().toISOString(), before: await metrics() };

  const submit = await submitWebflowAiPrompt(PROMPT);
  result.submit = submit;
  if (!submit.ok) {
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ ok: false, reason: submit.reason, out: OUT }));
    process.exit(1);
  }

  const wait = await waitWebflowTurnComplete(420000, submit.beforeTail || '');
  result.wait = wait;

  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    result.after = await metrics();
    if (result.after.speedLeaks === 0 && result.after.nameLeaks === 0 && result.after.badMeta === 0) break;
  }

  result.pass = result.after?.speedLeaks === 0
    && result.after?.nameLeaks === 0
    && result.after?.badMeta === 0;

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: result.pass, before: result.before, after: result.after, out: OUT }));
  wlog('=== COPY STATIC AI END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });