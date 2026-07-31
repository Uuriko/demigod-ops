#!/usr/bin/env node
/**
 * demigod-webflow-blog-cms-setup — operator checklist + local mirror for Blog CMS
 *
 * Webflow CMS cannot be fully created from this repo without Designer API rights.
 * This script:
 *  1) Writes a ready CMS field schema for Collection "Notes" (Blog)
 *  2) Reads local JSON posts and previews CMS field payloads (no API writes)
 *  3) Prints exact setup notes
 *
 *   node demigod-webflow-blog-cms-setup.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const OUT = path.join(BUSY, 'webflow-blog-cms-schema.json');
const LOCAL = path.join(ROOT, 'demigod-blog-posts.json');

const schema = {
  schema: 'demigod.webflow-blog-cms/1',
  collection: {
    name: 'Notes',
    slug: 'notes',
    singularName: 'Note',
  },
  fields: [
    { name: 'Name', type: 'PlainText', required: true, slug: 'name' },
    { name: 'Slug', type: 'PlainText', required: true, slug: 'slug' },
    { name: 'Summary', type: 'PlainText', required: true, slug: 'summary', help: '1–2 sentences for cards' },
    { name: 'Body', type: 'RichText', required: true, slug: 'body' },
    { name: 'Category', type: 'Option', required: true, slug: 'category', options: ['Product', 'Privacy', 'Pricing', 'Market', 'Pilot'] },
    { name: 'Hero Image', type: 'Image', required: false, slug: 'hero-image' },
    { name: 'Published On', type: 'DateTime', required: true, slug: 'published-on' },
    { name: 'Featured', type: 'Switch', required: false, slug: 'featured' },
  ],
  pages: [
    { name: 'Notes index', path: '/notes', binding: 'Collection List → Notes' },
    { name: 'Note template', path: '/notes/{slug}', binding: 'Collection page template' },
  ],
  designerSteps: [
    'Webflow Designer → CMS → Create new Collection → "Notes"',
    'Add fields from schema.fields (Name/Slug auto, plus Summary, Body, Category, Hero Image, Published On, Featured)',
    'Create Collection Page Template: Notes Template',
    'Build Notes index page with Collection List, filter Featured optional',
    'Style cards to match dark gold system (Manrope/Cinzel, --g #C9A84C)',
    'Publish; optional: bind foot-core blog page to CMS via Webflow API later',
    'Until CMS is live, demigod-foot-core.js DG_PAGES.blog holds seed posts',
  ],
  inspo: [
    'https://www.anrok.com/ — scroll product narrative',
    'https://www.linear.app/ — restraint, type hierarchy',
    'https://webflow.com/blog/web-design-trends-2026 — proprietary motion, TL;DR copy',
  ],
};

const posts = JSON.parse(fs.readFileSync(LOCAL, 'utf8'));
const itemPreview = posts.posts.map((post) => ({
  isDraft: post.draft !== false,
  fieldData: {
    name: post.title,
    slug: post.slug,
    summary: post.summary,
    body: post.body,
    category: post.category,
    ...(post.image ? { 'hero-image': { url: post.image, alt: post.title } } : {}),
  },
  imageLocal: post.imageLocal,
  imageLocalExists: Boolean(post.imageLocal && fs.existsSync(path.join(ROOT, post.imageLocal))),
}));

fs.mkdirSync(BUSY, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ ...schema, dryRun: true, itemPreview }, null, 2) + '\n');

console.log(JSON.stringify({
  ok: true,
  schemaPath: OUT,
  localPosts: LOCAL,
  collection: schema.collection.name,
  fields: schema.fields.length,
  posts: itemPreview.length,
  imageFields: itemPreview.filter((item) => item.fieldData['hero-image']).length,
  mutatedWebflow: false,
  mutatedLocalPosts: false,
  note: 'Dry run only. Hero Image previews use hosted image URLs; local placeholders are reported but not uploaded.',
}, null, 2));
