import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectBlog, inspectPost } from './demigod-blog-quality.mjs';

const good = { slug: 'proof', category: 'Product', title: 'Proof', summary: 'A concrete note.', body: `${'Specific work gets checked. '.repeat(45)}The limit is recorded plainly.`, image: 'https://example.com/proof.jpg', imageAlt: 'Proof stamp', published: true, publishedAt: '2026-07-21' };

test('published posts fail closed on draft notes, missing assets, and unsupported claims', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-blog-quality-'));
  const bad = { ...good, image: 'assets/missing.jpg', draftNote: 'review me', body: `Guaranteed within 48 hours. ${good.body}` };
  const report = inspectBlog({ posts: [bad] }, root);
  assert.equal(report.ok, false);
  assert.deepEqual(report.results[0].blockers.sort(), ['draft_note_present', 'image_missing', 'unsupported_claim']);
});

test('published slugs, dates, types, and local images fail closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-blog-boundary-'));
  const result = inspectPost({ ...good, slug: 'bad/(slug)', publishedAt: '2026-99-99', image: '../../etc/passwd', title: ['not text'] }, root, []);
  assert.ok(result.blockers.includes('slug_not_kebab_case'));
  assert.ok(result.blockers.includes('invalid_publishedAt'));
  assert.ok(result.blockers.includes('image_missing'));
  assert.ok(result.blockers.includes('invalid_title'));
});

test('an honest guarantee disclaimer is reviewable, not a release blocker', () => {
  const result = inspectPost({ ...good, body: `We do not offer a guarantee. ${good.body}` }, process.cwd(), []);
  assert.ok(!result.blockers.includes('unsupported_claim'));
  assert.ok(result.warnings.includes('claim_language_review'));
});

test('draft style risks are reported without blocking draft creation', () => {
  const draft = { ...good, published: false, body: `In today's market, ${'seamless work — repeats. '.repeat(20)}—` };
  const result = inspectPost(draft, process.cwd(), []);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes('banned_opener'));
  assert.ok(result.warnings.some((warning) => warning.startsWith('em_dash_count_')));
  assert.ok(result.warnings.some((warning) => warning.startsWith('watchlist_')));
});
