#!/usr/bin/env node
/**
 * demigod-blog-sync — single fan-out from demigod-blog-posts.json
 *
 *   node demigod-blog-sync.mjs           # sync foot embed + head Blog JSON-LD + slug regexes
 *   node demigod-blog-sync.mjs --check   # exit 1 if out of sync (no write)
 *   node demigod-blog-sync.mjs --status  # counts + drift summary
 *   node demigod-blog-sync.mjs --new --slug=x --title="Y" [--category=Product]
 *
 * SoR: demigod-blog-posts.json (published !== false)
 * Fans out to: demigod-foot-core.js DG_BLOG_POSTS + deep-link regexes
 *              demigod-head-minimal.html Blog JSON-LD
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { inspectBlog } from './demigod-blog-quality.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const POSTS_PATH = path.join(ROOT, 'demigod-blog-posts.json');
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const HEAD = path.join(ROOT, 'demigod-head-minimal.html');
const SITE = 'https://www.trydemigod.com';
const LOGO = 'https://files.catbox.moe/ges75q.jpg';

const args = process.argv.slice(2);
const BLOG_SYNC_OK = (a) =>
  a === '--check' ||
  a === '--status' ||
  a === '--new' ||
  a === '--json' ||
  a === '--help' ||
  a === '-h' ||
  a.startsWith('--slug=') ||
  a.startsWith('--title=') ||
  a.startsWith('--category=') ||
  a.startsWith('--excerpt=') ||
  a.startsWith('--body=');
const unknownBlogSync = args.find((a) => a.startsWith('-') && !BLOG_SYNC_OK(a));
if (unknownBlogSync) {
  console.error(
    `blog-sync: unknown argument ${unknownBlogSync} — try: node demigod-blog-sync.mjs [--check|--status|--new --slug=… --title=…]`,
  );
  process.exit(2);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`demigod-blog-sync — fan-out from demigod-blog-posts.json

Usage: node demigod-blog-sync.mjs [--check|--status|--new --slug=… --title=…]`);
  process.exit(0);
}
const checkOnly = args.includes('--check');
const statusOnly = args.includes('--status');
const doNew = args.includes('--new');

function argVal(name) {
  const hit = args.find((a) => a.startsWith(name + '='));
  return hit ? hit.slice(name.length + 1) : '';
}

function loadSor() {
  const j = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
  if (!j || !Array.isArray(j.posts)) throw new Error('demigod-blog-posts.json missing posts[]');
  return j;
}

function publishedPosts(j) {
  return (j.posts || [])
    .filter((p) => p && p.published !== false && p.slug)
    .slice()
    .sort((a, b) => {
      const da = String(a.publishedAt || '');
      const db = String(b.publishedAt || '');
      if (da !== db) return db.localeCompare(da);
      return String(a.slug).localeCompare(String(b.slug));
    });
}

function embedPosts(pub) {
  return pub.map((p) => ({
    slug: p.slug,
    category: p.category || 'Product',
    title: p.title || '',
    summary: p.summary || '',
    body: p.body || '',
    image: p.image || '',
    imageAlt: p.imageAlt || p.title || 'Blog post',
    publishedAt: String(p.publishedAt || '').slice(0, 10),
  }));
}

function blogJsonLd(pub) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Demigod Blog',
    // `/blog` is a real 200 route; `/?p=blog` is the legacy query form. Structured data naming the
    // query form told every crawler the blog lives at a URL nobody links to, and left the path
    // route it actually serves undeclared.
    url: SITE + '/blog',
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: 'Demigod',
      url: SITE,
      logo: {
        '@type': 'ImageObject',
        url: LOGO,
        width: 1024,
        height: 1024,
      },
    },
    blogPost: pub.map((p) => {
      const day = String(p.publishedAt || '').slice(0, 10);
      const mod = String(p.dateModified || p.publishedAt || day).slice(0, 10);
      return {
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.summary,
        url: `${SITE}/blog#note-${p.slug}`,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${SITE}/blog#note-${p.slug}`,
        },
        image: p.image,
        articleSection: p.category || 'Product',
        datePublished: day,
        dateModified: mod || day,
        author: { '@type': 'Organization', name: 'Demigod' },
        inLanguage: 'en',
      };
    }),
  };
}

function slugAlt(pub) {
  return pub.map((p) => p.slug).join('|');
}

function validate(j, pub) {
  const errs = [];
  const seen = new Set();
  for (const p of j.posts || []) {
    if (!p.slug) errs.push('post missing slug');
    else if (seen.has(p.slug)) errs.push(`dup slug ${p.slug}`);
    else seen.add(p.slug);
    if (p.published === false) continue;
    if (!p.title) errs.push(`${p.slug}: no title`);
    if (!p.summary) errs.push(`${p.slug}: no summary`);
    if (!p.body) errs.push(`${p.slug}: no body`);
    const blob = `${p.title}\n${p.summary}\n${p.body}`;
    if (/hello@trydemigod\.com/i.test(blob)) errs.push(`${p.slug}: hello@ forbidden`);
  }
  errs.push(...inspectBlog(j, ROOT).publishedBlockers);
  // Empty published set is allowed (wipe / pre-content).
  return errs;
}

function extractEmbed(foot) {
  const m = foot.match(/var\s+DG_BLOG_POSTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function extractBlogLd(head) {
  for (const m of head.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const body = String(m[1] || '').trim();
    // Blog shell is enough when blogPost is empty (no published posts yet).
    if (/"@type"\s*:\s*"Blog"/.test(body) && (/"blogPost"\s*:/.test(body) || /BlogPosting/.test(body))) {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function blogRetired(foot) {
  return (
    /['"]\/blog['"]\s*:\s*['"]how['"]/.test(foot) &&
    /['"]\/notes['"]\s*:\s*['"]how['"]/.test(foot) &&
    !/\bDG_BLOG_POSTS\b|\bblogCardHtml\b|id=["']note-|class=["']dg-blog-more["']/.test(foot)
  );
}

function driftReport(pub, foot, head) {
  const want = embedPosts(pub);
  const got = extractEmbed(foot);
  const ld = extractBlogLd(head);
  const issues = [];
  if (!got) {
    if (!blogRetired(foot)) issues.push('foot:missing-DG_BLOG_POSTS');
  } else {
    if (got.length !== want.length) issues.push(`foot:count ${got.length}!=${want.length}`);
    const gSlugs = new Set(got.map((p) => p.slug));
    for (const p of want) {
      if (!gSlugs.has(p.slug)) issues.push(`foot:missing:${p.slug}`);
      else {
        const h = got.find((x) => x.slug === p.slug);
        if (h.title !== p.title) issues.push(`foot:title:${p.slug}`);
        if (h.summary !== p.summary) issues.push(`foot:summary:${p.slug}`);
      }
    }
  }
  if (!ld || !Array.isArray(ld.blogPost)) issues.push('head:missing-Blog-LD');
  else {
    if (ld.blogPost.length !== pub.length) issues.push(`head:count ${ld.blogPost.length}!=${pub.length}`);
    for (const p of pub) {
      const hit = ld.blogPost.find((b) => b && String(b.url || '').includes(p.slug));
      if (!hit) issues.push(`head:missing:${p.slug}`);
      else {
        if (hit.headline !== p.title) issues.push(`head:title:${p.slug}`);
        if (hit.description !== p.summary) issues.push(`head:desc:${p.slug}`);
      }
    }
  }
  const alt = slugAlt(pub);
  if (foot.includes('var KEEP =') && !foot.includes(alt.split('|')[0] || '___')) {
    /* soft */
  }
  if (!new RegExp(pub[0]?.slug || '____').test(foot)) {
    /* soft */
  }
  return issues;
}

function applyFoot(foot, pub) {
  const emb = 'var DG_BLOG_POSTS=' + JSON.stringify(embedPosts(pub)) + ';';
  if (!/var\s+DG_BLOG_POSTS\s*=/.test(foot)) {
    throw new Error('demigod-foot-core.js missing var DG_BLOG_POSTS=');
  }
  foot = foot.replace(/var\s+DG_BLOG_POSTS\s*=\s*\[[\s\S]*?\];/, emb);
  // Never-match placeholder when no published slugs (empty alt breaks /^( )$/).
  const alt = slugAlt(pub) || '__no_blog_slug__';
  // Do NOT rewrite openPage body-hide KEEP with blog slugs — that KEEP skips hiding
  // body children by id; blog slugs are not body ids. Only update deepLink hash branch.
  // Guard the target like the DG_BLOG_POSTS rewrite above does: a .replace() whose pattern
  // misses is a SILENT no-op, so a shape change in foot-core's deepLink branch would leave the
  // OLD slugs routing forever and every new post's deep link would quietly 404-to-nothing —
  // with blog-sync still reporting success. foot-core changes ~40x/day, and this file already
  // shipped one silent semantic clobber today (the KEEP allowlist, which blanked the viewport).
  // Same function, same risk: fail loudly instead.
  const DEEPLINK_RE = /if\(\/\^note-\/\.test\(h\)\|\|\/\^\([^)]*\)\$\/\.test\(h\)\)/;
  if (!DEEPLINK_RE.test(foot)) {
    throw new Error('demigod-foot-core.js missing the deepLink hash branch — blog-sync cannot route new slugs');
  }
  foot = foot.replace(DEEPLINK_RE, `if(/^note-/.test(h)||/^(${alt})$/.test(h))`);
  return foot;
}

function applyHead(head, pub) {
  const ld = blogJsonLd(pub);
  const script = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
  let found = false;
  head = head.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    (full) => {
      if (found) return full;
      if (/"@type"\s*:\s*"Blog"/.test(full) && (/"blogPost"\s*:/.test(full) || /BlogPosting/.test(full))) {
        found = true;
        return script;
      }
      return full;
    },
  );
  if (!found) throw new Error('head Blog JSON-LD script not found');
  return head;
}

function cmdNew() {
  const slug = (argVal('--slug') || '').trim();
  const title = (argVal('--title') || '').trim() || slug;
  const category = (argVal('--category') || 'Product').trim();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    console.error(JSON.stringify({ ok: false, error: 'need --slug=kebab-case' }));
    process.exit(2);
  }
  const j = loadSor();
  if ((j.posts || []).some((p) => p.slug === slug)) {
    console.error(JSON.stringify({ ok: false, error: 'slug exists' }));
    process.exit(1);
  }
  const day = new Date().toISOString().slice(0, 10);
  j.posts.push({
    slug,
    category,
    title,
    summary: '',
    body: '',
    image: 'https://files.catbox.moe/urbco5.jpg',
    imageLocal: `assets/blog/${slug}.jpg`,
    imageAlt: title,
    published: false,
    publishedAt: day,
    dateModified: day,
  });
  j.at = new Date().toISOString();
  atomicWrite(POSTS_PATH, JSON.stringify(j, null, 2) + '\n'); // SoR: never leave it half-written
  console.log(JSON.stringify({ ok: true, slug, published: false, path: POSTS_PATH }, null, 2));
}

function main() {
  if (doNew) return cmdNew();

  const j = loadSor();
  const pub = publishedPosts(j);
  const val = validate(j, pub);
  if (val.length) {
    console.error(JSON.stringify({ ok: false, error: 'schema', issues: val }, null, 2));
    process.exit(1);
  }

  const foot = fs.readFileSync(FOOT, 'utf8');
  const head = fs.readFileSync(HEAD, 'utf8');
  const issues = driftReport(pub, foot, head);

  if (statusOnly) {
    console.log(
      JSON.stringify(
        {
          ok: issues.length === 0,
          published: pub.length,
          drafts: (j.posts || []).filter((p) => p.published === false).length,
          slugs: pub.map((p) => p.slug),
          issues,
        },
        null,
        2,
      ),
    );
    process.exit(issues.length ? 1 : 0);
  }

  if (checkOnly) {
    console.log(
      JSON.stringify(
        { ok: issues.length === 0, published: pub.length, issues },
        null,
        2,
      ),
    );
    process.exit(issues.length ? 1 : 0);
  }

  // write
  const nextFoot = blogRetired(foot) ? foot : applyFoot(foot, pub);
  const nextHead = applyHead(head, pub);
  // atomicWrite, not writeFileSync: a plain write truncates-then-writes, so any concurrent READER
  // can catch the file torn. The foot-lock does not help here -- it serialises writers, while the
  // readers are verify:source (every ~90s from the loop), a ship, or another agent. foot-core is the
  // most-read file in the repo and a torn read of it is the "49 grep gates green on a file that does
  // not parse" class. demigod-favicon-ship.mjs and the unified site-bundle publisher already do this
  // after a torn head was observed live 2026-07-17; reuse the shared helper instead of hand-rolling
  // tmp+rename a third time.
  atomicWrite(FOOT, nextFoot);
  atomicWrite(HEAD, nextHead);
  // refresh at on SoR
  j.at = new Date().toISOString();
  atomicWrite(POSTS_PATH, JSON.stringify(j, null, 2) + '\n');

  const after = driftReport(pub, nextFoot, nextHead);
  console.log(
    JSON.stringify(
      {
        ok: after.length === 0,
        synced: true,
        published: pub.length,
        slugs: pub.map((p) => p.slug),
        files: ['demigod-foot-core.js', 'demigod-head-minimal.html', 'demigod-blog-posts.json'],
        issues: after,
      },
      null,
      2,
    ),
  );
  process.exit(after.length ? 1 : 0);
}

main();
