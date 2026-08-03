#!/usr/bin/env node
// Meta-description validator + proposed fixes for the routes seo-audit flags as too-short (talent/legal/
// how/security/faq, all <80ch). validateMeta enforces length (120-160) AND honesty (no overclaim phrases).
// The proposed copy only RESTATES the existing honest model (tech ranks -> humans review -> intro on
// mutual yes -> 10% on hire, free for talent); it invents no new claims.
//   node demigod-meta-audit.mjs [--json]     # print proposed descriptions, all validated
//   node demigod-meta-audit.mjs --selftest
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// Overclaim phrases the site must never make. Kept local (not imported) so this tool doesn't depend on a
// file that's mid-edit, and so `--selftest` can't be hijacked by another module's top-level selftest.
const BANNED_OVERCLAIMS = [
  { label: 'find-talent CTA', re: /\bfind talent\b/i },
  { label: 'pre-vetted', re: /\bpre-?vetted\b/i },
  { label: 'volume promise (N candidates)', re: /\b\d\s*[-–]\s*\d\s+(?:candidates?|finalists?|profiles?|matches?)\b/i },
  { label: 'replacement guarantee', re: /replacement\s+guarantee/i },
  { label: 'human-matched overclaim', re: /human-?matched/i },
];

// pure: a meta description is valid iff 120-160 chars AND free of banned overclaim phrases.
export function validateMeta(desc) {
  const s = String(desc || '');
  const issues = [];
  if (s.length < 120) issues.push(`too-short (${s.length} < 120)`);
  else if (s.length > 160) issues.push(`too-long (${s.length} > 160)`);
  for (const b of BANNED_OVERCLAIMS) if (b.re.test(s)) issues.push(`overclaim: ${b.label}`);
  return { ok: issues.length === 0, length: s.length, issues };
}

// Proposed descriptions for the flagged routes — honest restatements of the current model only.
export const PROPOSED = {
  talent: 'Join the Demigod SF Bay talent network with one profile. Free, always. Your profile stays private until you approve an intro, and humans review every match.',
  legal: "Demigod's plain-language privacy policy and terms for SF startup and talent matching: what we collect, how intros work, and how to reach us with questions.",
  how: 'How Demigod works: share a brief or profile, our software ranks fit, humans review, and we introduce only on mutual interest. 10% on hire, free for talent.',
  security: 'How Demigod protects your data: what we store, who can see your profile, and why nothing is shared or introduced until both sides approve the intro.',
  faq: 'Answers about Demigod: how SF matching works, what happens after you submit, pricing (10% on hire, free for talent), privacy, and how intros are made.',
};

export function auditProposed() {
  return Object.entries(PROPOSED).map(([route, desc]) => ({ route, ...validateMeta(desc), desc }));
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const good = 'Demigod matches SF Bay startups and tech talent: our software ranks fit, humans review, and we introduce only on mutual interest. Ten percent on hire.';
  assert(validateMeta(good).ok, `a 120-160ch honest description validates (${good.length}ch)`);
  assert(!validateMeta('too short').ok && validateMeta('too short').issues[0].includes('too-short'), 'flags too short');
  assert(!validateMeta('x'.repeat(200)).ok, 'flags too long');
  const over = 'Demigod gives you pre-vetted SF Bay candidates with a replacement guarantee and 3-5 candidates per role, ranked by our matching software, all today.';
  assert(!validateMeta(over).ok && validateMeta(over).issues.some((i) => i.startsWith('overclaim')), 'flags overclaim phrases');
  const rows = auditProposed();
  for (const r of rows) assert(r.ok, `proposed /${r.route} must pass (${r.length}ch): ${r.issues.join('; ')}`);
  assert(rows.length === 5, 'covers the 5 flagged routes');
  console.log(JSON.stringify({ ok: true, selftest: 'meta-audit' }));
  process.exit(0);
}

if (isMain) {
  const rows = auditProposed();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
  for (const r of rows) console.log(`/${r.route}: ${r.length}ch ${r.ok ? 'OK' : 'FAIL ' + r.issues.join('; ')}\n  ${r.desc}\n`);
}
