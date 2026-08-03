#!/usr/bin/env node
// FAQPage JSON-LD generator for /faq. The live /faq already renders a 17-item <details> accordion, but
// ships Organization/WebSite/ItemList/Blog schema and NO FAQPage — so it misses Google's expandable-Q&A
// rich result. This turns the real Q&A into valid schema.org/FAQPage JSON-LD, ready to embed.
//
//   node demigod-faq-schema.mjs --items faq.json   # {items:[{q,a}]} or [{q,a}] -> <script> tag
//   node demigod-faq-schema.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// pure: [{q,a}] (or {question,answer}) -> schema.org FAQPage object. Filters empties, dedupes by question.
export function faqPageJsonLd(items = []) {
  const seen = new Set();
  const mainEntity = [];
  for (const it of items || []) {
    const q = String(it?.q ?? it?.question ?? '').trim();
    const a = String(it?.a ?? it?.answer ?? '').trim();
    if (!q || !a) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    mainEntity.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
  }
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity };
}

// Render as an embeddable <script> tag. Escapes '<' so an answer containing "</script>" cannot break out
// of the tag (a real injection/correctness hazard for inline JSON-LD).
export function faqJsonLdScript(items = []) {
  const json = JSON.stringify(faqPageJsonLd(items)).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const obj = faqPageJsonLd([{ q: 'What is Demigod?', a: 'A matcher.' }, { question: 'Cost?', answer: 'Free for talent.' }]);
  assert(obj['@context'] === 'https://schema.org' && obj['@type'] === 'FAQPage', 'root context/type');
  assert(obj.mainEntity.length === 2, 'accepts both {q,a} and {question,answer}');
  assert(obj.mainEntity[0]['@type'] === 'Question' && obj.mainEntity[0].name === 'What is Demigod?', 'question shape');
  assert(obj.mainEntity[0].acceptedAnswer['@type'] === 'Answer' && obj.mainEntity[0].acceptedAnswer.text === 'A matcher.', 'answer shape');
  // filters empties + whitespace-only
  assert(faqPageJsonLd([{ q: '', a: 'x' }, { q: 'y', a: '   ' }, { q: 'z', a: 'ok' }]).mainEntity.length === 1, 'drops empty q/a');
  // dedupes by question (case-insensitive)
  assert(faqPageJsonLd([{ q: 'Same', a: '1' }, { q: 'same', a: '2' }]).mainEntity.length === 1, 'dedupes by question');
  assert(faqPageJsonLd([]).mainEntity.length === 0, 'empty input -> empty mainEntity, no crash');
  // </script> breakout must be escaped in the tag output
  const tag = faqJsonLdScript([{ q: 'Hack?', a: 'no </script><script>alert(1)</script>' }]);
  assert(!/<\/script><script>/.test(tag.replace(/<script type="application\/ld\+json">|<\/script>$/g, '')), 'answer </script> must not break the tag');
  assert(tag.includes('\\u003c/script>'), 'raw < is escaped to \\u003c');
  console.log(JSON.stringify({ ok: true, selftest: 'faq-schema' }));
  process.exit(0);
}

if (isMain) {
  const i = process.argv.indexOf('--items');
  if (i < 0 || !process.argv[i + 1]) { console.error('usage: --items <file.json> | --selftest'); process.exit(2); }
  const raw = JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const items = Array.isArray(raw) ? raw : raw.items || [];
  console.log(faqJsonLdScript(items));
  process.exit(0);
}
