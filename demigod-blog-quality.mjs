#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const REQUIRED = ['slug', 'category', 'title', 'summary', 'body', 'image', 'imageAlt'];
const BANNED_OPENERS = /^(in today['’]s|in the ever-evolving|it['’]s no secret that|when it comes to|let['’]s dive|navigating the complexities)/i;
const WATCHLIST = /\b(delve|tapestry|realm|landscape|leverage|robust|seamless|cutting-edge|game-changer|unlock|empower|holistic|synergy|multifaceted|foster|pivotal|crucial|comprehensive|underscore|testament|vibrant)\b/gi;
const PRODUCT_PHRASES = new Set(['both sides approve before', 'ten percent of first', 'first year cash on', 'private until both sides', 'potter trydemigod com']);

const words = (text) => String(text || '').trim().split(/\s+/).filter(Boolean);
const normalizedWords = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
function ngrams(text, n = 5) {
  const ws = normalizedWords(text);
  const out = new Set();
  for (let i = 0; i <= ws.length - n; i++) {
    const phrase = ws.slice(i, i + n).join(' ');
    if (![...PRODUCT_PHRASES].some((allowed) => phrase.includes(allowed))) out.add(phrase);
  }
  return out;
}

export function inspectPost(post, root = ROOT, corpus = []) {
  const blockers = [];
  const warnings = [];
  const slug = post?.slug || '(missing-slug)';
  if (typeof post?.published !== 'boolean') blockers.push('published_not_boolean');
  for (const field of REQUIRED) if (typeof post?.[field] !== 'string' || !post[field].trim()) blockers.push(`invalid_${field}`);
  if (typeof post?.slug === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) blockers.push('slug_not_kebab_case');
  if (post?.published !== false && String(post?.draftNote || '').trim()) blockers.push('draft_note_present');
  if (post?.published !== false) {
    const date = String(post?.publishedAt || '');
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) blockers.push('invalid_publishedAt');
  }
  const image = String(post?.image || '').trim();
  if (/^https:/i.test(image)) {
    try { const url = new URL(image); if (url.protocol !== 'https:' || url.username || url.password) blockers.push('image_url_invalid'); }
    catch { blockers.push('image_url_invalid'); }
  } else if (image) {
    const assetRoot = path.resolve(root, 'assets/blog');
    const resolved = path.resolve(root, image);
    if (!(resolved.startsWith(assetRoot + path.sep) && fs.existsSync(resolved))) blockers.push('image_missing');
  }
  const blob = `${post?.title || ''}\n${post?.summary || ''}\n${post?.body || ''}`;
  if (/hello@trydemigod\.com/i.test(blob)) blockers.push('forbidden_contact');
  if (/\b(?:we|demigod)\s+(?:guarantee|promise)\b|\bguaranteed?\s+(?:in|within)\s+(?:24|48)\s*(?:hours?|hrs?)\b/i.test(blob)) blockers.push('unsupported_claim');
  else if (/\b(?:guaranteed?|guarantees?)\b|\b(?:24|48)\s*(?:hours?|hrs?)\b/i.test(blob)) warnings.push('claim_language_review');
  if (BANNED_OPENERS.test(String(post?.body || '').trim())) blockers.push('banned_opener');
  const count = words(post?.body).length;
  if (count < 140 || count > 320) warnings.push(`word_band_${count}`);
  const dashes = (blob.match(/—/g) || []).length;
  if (dashes > 1) warnings.push(`em_dash_count_${dashes}`);
  const watch = [...new Set((blob.match(WATCHLIST) || []).map((s) => s.toLowerCase()))];
  if (watch.length) warnings.push(`watchlist_${watch.join(',')}`);
  const own = ngrams(blob);
  const repeats = [];
  for (const other of corpus) {
    if (!other || other.slug === post?.slug) continue;
    const theirs = ngrams(`${other.title || ''}\n${other.summary || ''}\n${other.body || ''}`);
    for (const phrase of own) if (theirs.has(phrase)) repeats.push(phrase);
  }
  if (repeats.length) warnings.push(`repeated_5gram_${[...new Set(repeats)].slice(0, 3).join('|')}`);
  return { slug, published: post?.published !== false, words: count, blockers, warnings, ready: blockers.length === 0 };
}

export function inspectBlog(data, root = ROOT) {
  const posts = Array.isArray(data?.posts) ? data.posts : [];
  const results = posts.map((post) => inspectPost(post, root, posts));
  return {
    ok: results.every((result) => !result.published || result.blockers.length === 0),
    results,
    publishedBlockers: results.filter((result) => result.published).flatMap((result) => result.blockers.map((blocker) => `${result.slug}:${blocker}`)),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'demigod-blog-posts.json'), 'utf8'));
  const report = inspectBlog(data);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}
