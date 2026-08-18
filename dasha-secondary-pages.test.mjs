#!/usr/bin/env node
/**
 * Static contract for the prepared secondary pages that remain public.
 * Mint or honest doors; no Pay without payTo; 44/48px targets in CSS.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const files = [
  'dasha-privacy.html',
  'dasha-notes.html',
  'dasha-404.html',
];

for (const name of files) {
  const html = await readFile(new URL('./' + name, import.meta.url), 'utf8');
  const hasMint = html.includes(mint);
  const hasDoor = /href="\/"|href="\/how-to-buy"|href="\/studio"|href="\/simp"/.test(html);
  assert.ok(hasMint || hasDoor, `${name} has neither the associated mint nor a home/how-to-buy/studio/simp door`);
  assert.ok(/min-height:\s*4[48]px/.test(html), `${name} lost 44/48px touch targets`);
  const payButtons = [...html.matchAll(/<button\b[^>]*>[\s\S]*?Pay[\s\S]*?<\/button>/gi)];
  for (const hit of payButtons) {
    assert.ok(/payTo/.test(html), `${name} has a Pay control without a payTo listing`);
  }
  assert.doesNotMatch(html, /<a\b[^>]*>\s*Pay\s*</i, `${name} grew an inline Pay link`);
}

console.log('dasha secondary pages: mint-or-doors, 44px targets, no Pay without payTo');
