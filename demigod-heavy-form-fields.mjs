#!/usr/bin/env node
/** Ask SuperGrok Heavy: precise form fields for Fonzi/Jack & similar dual-flow startups. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, findGrokPage, sendToGrok, collectGrokReply } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'HEAVY-FORM-FIELDS-RESEARCH.md');
const OUT_JSON = path.join(ROOT, 'DEMIGOD-HEAVY-FORM-FIELDS.json');

const PROMPT = `SuperGrok Heavy — COMPETITIVE FORM FIELD AUDIT for trydemigod.com.

CRITICAL: Demigod only. NO Tally. NO eat-the-sounds game. We use native Webflow forms: startup-hire + engineer-join.

## Task
Research Fonzi, Jack & Jill, Underdog.io, Paraform, Dover, Welcome.com, Consider, Mercor, Standout — and any similar SF startup matching platforms.

For EACH competitor, list PRECISELY what they ask on EACH side:

### Company / startup / hiring side
- Intake type: (web form | schedule call | conversational AI | demo | iMessage)
- Every field/question with: label, required Y/N, type (text/email/url/select/file), placeholder if known
- What they do NOT ask upfront (deferred to call/AI)

### Candidate / engineer side
- Same structure

## Output format (required)

=== STATUS ACK ===

=== FONZI ===
**Company side:** (field table)
**Candidate side:** (field table)
**Notes:**

=== JACK & JILL ===
**Jill (company):**
**Jack (candidate):**
**Notes:**

=== UNDERDOG.IO ===
**Company:**
**Candidate:**

=== PARAFORM ===
**Company:**
**Candidate/recruiter:**

=== DOVER ===
**Company:**
**Candidate:**

=== OTHERS (top 3 more) ===

=== CROSS-COMPETITOR PATTERNS ===
- Universal required fields (both sides)
- Nice-to-have fields most ask
- Fields Demigod should ADD
- Fields Demigod should REMOVE (we currently ask: company name, contact email, role title, stack needs, salary range, company stage | full name, email, linkedin, github, skills, experience, portfolio, resume, sf-bay, is-engineer)

=== DEMIGOD RECOMMENDATION ===
- Exact startup-hire field list (label + required + why)
- Exact engineer-join field list (label + required + why)
- Keep under 8 fields per side for MVP

=== PROMPT FOR CURSOR AGENT ===
(10 steps to update demigod-foot-core.js form labels/fields only — no architecture changes)

Be precise. If intake is conversational not form, list the conversation topics as pseudo-fields. Cite sources where possible. Execute now.`;

async function collect(page) {
  let text = '';
  for (let i = 0; i < 30; i++) {
    const reply = await collectGrokReply(page, { waitMs: 60000, minGrowth: 120 });
    text = reply.text || text;
    const tail = text.slice(-30000);
    const busy = reply.thinking || /thinking|Finalizing/i.test(tail);
    const ok = /=== FONZI ===/i.test(text) && /=== DEMIGOD RECOMMENDATION ===/i.test(text) && tail.length >= 5000;
    if (text && !busy && ok) break;
    wlog(`heavy form-fields poll ${i + 1}: len=${tail.length} busy=${busy}`);
  }
  return text;
}

async function main() {
  wlog('=== HEAVY FORM FIELDS START ===');
  const browser = await connectBrowser();
  const page = await findGrokPage(browser);
  if (!page) throw new Error('no grok tab');
  await page.bringToFront();
  await sendToGrok(page, PROMPT);
  const text = await collect(page);
  await browser.disconnect();

  fs.writeFileSync(OUT, `# SuperGrok Heavy — Form Fields Research\n\n_${new Date().toISOString()}_\n\n${text}\n`);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ at: new Date().toISOString(), chars: text.length, path: OUT }, null, 2));
  console.log(JSON.stringify({ chars: text.length, path: OUT }));
  wlog('=== HEAVY FORM FIELDS END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });