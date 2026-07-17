#!/usr/bin/env node
/** Wire blog hero image URLs into demigod-blog-posts.json from upload receipt + local paths. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS = path.join(ROOT, 'demigod-blog-posts.json');
const RECEIPT = '/tmp/dg-busy/asset-upload-receipt.json';

const j = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
let rec = {};
try {
  rec = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
} catch {
  /* */
}
const blog = rec.blog || {};
for (const p of j.posts || []) {
  const remote = blog[p.slug] || null;
  const local = path.join(ROOT, `assets/blog/${p.slug}.jpg`);
  if (remote && /^https:\/\//.test(remote)) {
    p.image = remote;
  }
  if (fs.existsSync(local)) {
    p.imageLocal = `assets/blog/${p.slug}.jpg`;
    if (!p.image) p.image = p.imageLocal;
  }
}
j.at = new Date().toISOString();
j.assetsNote = 'Hero images generated 2026-07-16; CDN URLs from catbox when present';
// atomicWrite: a plain write truncates-then-writes, so a concurrent reader of the blog SoR sees it
// torn (58.6% of reads during a write, measured cross-process on a comparable file). The readers are
// not hypothetical -- verify:source, the dashboard, webflow-lib and blog-sync all parse this file,
// and blog-sync now runs INSIDE the ship (demigod-ship.mjs cdn()), where a JSON.parse throw on a
// half-written SoR fails the whole ship. Last plain-write holdout of the five SoR files.
atomicWrite(POSTS, JSON.stringify(j, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      ok: true,
      posts: (j.posts || []).map((p) => ({ slug: p.slug, image: p.image || p.imageLocal || null, draft: !!p.draft })),
    },
    null,
    2,
  ),
);
