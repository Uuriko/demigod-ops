#!/usr/bin/env node
/** Copy scrub audit for live static HTML vs fit-only policy.
 *  Detects volume language ("3-5 highly...", receive 3-5) and lorem placeholders that evade main scrub.
 *  Reuses live fetch + mirrors verify-* style (JSON out + exit code).
 *  Run: node demigod-copy-scrub-audit.mjs
 */
import fs from 'fs';
import path from 'path';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'DEMIGOD-COPY-SCRUB-AUDIT.json');

const VOLUME = /startups?\s+receive\s+3-5|3-5\s+highly aligned|highly aligned,\s*pre-vetted|pre-vetted candidates ready to interview|3-5[^<]{0,60}candidates ready|receive 3-5 highly/i;
const LOREM = /lorem ipsum|ipsum dolor sit amet|consectetur adipiscing elit|ut enim ad minim veniam/i;
const GOOD_FIT = /Humans intro fitting matches|Submit brief or profile|Hire — invoice 10% on start date/i;
const HAS_GOOD_INJECT = /Humans intro fitting matches|dg-signal-bar|Live brief signal/i;

async function main() {
  const { url, html } = await fetchLiveHtml();
  const leaks = [];
  if (VOLUME.test(html)) leaks.push({ severity: 'medium', issue: 'Volume language in static step cards (3-5 highly aligned / receive 3-5 candidates)' });
  if (LOREM.test(html)) leaks.push({ severity: 'low', issue: 'Lorem ipsum placeholder content in insights or static sections' });
  if (!GOOD_FIT.test(html)) leaks.push({ severity: 'medium', issue: 'Fit-only trust step language (from COPY.trustSteps) not detectable in HTML' });

  const result = {
    at: new Date().toISOString(),
    url,
    pass: leaks.length === 0,
    leaks,
    checks: {
      hasVolumeLeak: VOLUME.test(html),
      hasLorem: LOREM.test(html),
      hasGoodFitSteps: GOOD_FIT.test(html),
      hasInjectedSignalOrSteps: HAS_GOOD_INJECT.test(html),
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, leaks: leaks.length, out: OUT, url }));
  process.exit(result.pass ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
