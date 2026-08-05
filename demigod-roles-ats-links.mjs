#!/usr/bin/env node
/**
 * Extract public ATS board URLs from free text (X posts, HN comments, web pages).
 * Fail-closed: only known public board hosts; never invents company identity.
 *
 *   node demigod-roles-ats-links.mjs --selftest
 *   node demigod-roles-ats-links.mjs --text "We're hiring https://jobs.ashbyhq.com/acme"
 */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** @type {{ re: RegExp, provider: string, canon: (slug: string) => string }[]} */
export const ATS_PATTERNS = [
  {
    re: /https?:\/\/(?:boards(?:-api)?|job-boards)\.greenhouse\.io\/([A-Za-z0-9][A-Za-z0-9._-]{0,80})(?:\/[^\s"'<>]*)?/gi,
    provider: 'Greenhouse',
    canon: (slug) => `https://boards.greenhouse.io/${slug}`,
  },
  {
    re: /https?:\/\/jobs\.lever\.co\/([A-Za-z0-9][A-Za-z0-9._-]{0,80})(?:\/[^\s"'<>]*)?/gi,
    provider: 'Lever',
    canon: (slug) => `https://jobs.lever.co/${slug}`,
  },
  {
    re: /https?:\/\/jobs\.ashbyhq\.com\/([A-Za-z0-9][A-Za-z0-9._-]{0,80})(?:\/[^\s"'<>]*)?/gi,
    provider: 'Ashby',
    canon: (slug) => `https://jobs.ashbyhq.com/${slug}`,
  },
  {
    re: /https?:\/\/apply\.workable\.com\/([A-Za-z0-9][A-Za-z0-9._-]{0,80})(?:\/[^\s"'<>]*)?/gi,
    provider: 'Workable',
    canon: (slug) => `https://apply.workable.com/${slug}`,
  },
  {
    re: /https?:\/\/jobs\.smartrecruiters\.com\/([A-Za-z0-9][A-Za-z0-9._-]{0,80})(?:\/[^\s"'<>]*)?/gi,
    provider: 'SmartRecruiters',
    canon: (slug) => `https://jobs.smartrecruiters.com/${slug}`,
  },
];

/**
 * @param {string} text
 * @returns {{ provider: string, slug: string, jobsUrl: string }[]}
 */
export function extractAtsBoards(text) {
  const raw = String(text || '');
  if (!raw || raw.length > 200_000) return [];
  const out = [];
  const seen = new Set();
  for (const { re, provider, canon } of ATS_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(raw))) {
      const slug = String(m[1] || '').replace(/\/+$/, '').toLowerCase();
      if (!slug || slug === 'embed' || slug === 'api') continue;
      const jobsUrl = canon(slug);
      const key = `${provider}|${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ provider, slug, jobsUrl });
    }
  }
  return out;
}

function selftest() {
  const multi = extractAtsBoards(
    "We're hiring in SF! Apply: https://jobs.ashbyhq.com/AcmeCo/job/123 and also https://boards.greenhouse.io/betainc",
  );
  assert.equal(multi.length, 2);
  assert.ok(multi.some((b) => b.provider === 'Ashby' && b.jobsUrl === 'https://jobs.ashbyhq.com/acmeco'));
  assert.ok(multi.some((b) => b.provider === 'Greenhouse' && b.jobsUrl === 'https://boards.greenhouse.io/betainc'));
  assert.deepEqual(extractAtsBoards('no links here hiring SF'), []);
  assert.deepEqual(extractAtsBoards('https://evil.com/boards.greenhouse.io/fake'), []);
  assert.equal(extractAtsBoards('https://jobs.lever.co/pivotal/').length, 1);
  console.log(JSON.stringify({ ok: true, selftest: 'roles-ats-links' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else if (args[0] === '--text') {
    console.log(JSON.stringify(extractAtsBoards(args.slice(1).join(' ')), null, 2));
  } else {
    console.log('usage: demigod-roles-ats-links.mjs --selftest | --text "..."');
    process.exit(2);
  }
}
