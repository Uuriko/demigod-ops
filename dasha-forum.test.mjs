#!/usr/bin/env node
/**
 * Forum shape and limits.
 *
 * The forum is a persistent public write surface on a domain whose whole pitch is not getting
 * scammed, so the thing worth testing is not that a thread renders — it is that every rule the chat
 * already enforces still applies when the text arrives through a different door. A post that would
 * be refused in chat must be refused here, or the forum becomes the way around the chat's automod.
 *
 * Pure logic only: no Durable Object, no network, no wrangler. The worker owns storage and identity.
 *
 *   node dasha-forum.test.mjs
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

/* The lobby worker and its modules live in the worker tree; the ship-bound root is /home/potter.
   Resolve either way rather than pinning one, the same fallback dasha-product-coherence.test.mjs
   uses for dasha-simp-score.mjs. */
const local = new URL('./dasha-forum.mjs', import.meta.url);
const forumUrl = existsSync(local) ? local : new URL('./.grok/worktrees/potter/dasha/dasha-forum.mjs', import.meta.url);
const F = await import(forumUrl.href);

const now = 1_760_000_000_000;
const author = { handle: 'dash_eats', avatar: 'https://pbs.twimg.com/x.jpg' };

// ---- titles -----------------------------------------------------------------
assert(!F.validateTitle('').ok, 'empty title must be refused');
assert(!F.validateTitle('   ').ok, 'whitespace-only title must be refused');
assert(!F.validateTitle('x'.repeat(F.MAX_TITLE + 1)).ok, 'over-long title must be refused');
assert.equal(F.validateTitle('  spaced   out\n\ntitle ').title, 'spaced out title',
  'titles collapse to one line — a newline in a list row hides the rest of the title');

// ---- the automod the chat already enforces must survive the new door --------
for (const banned of ['join t.me/dashacommunity', 'come to discord.gg/abcdef']) {
  assert(!F.validateTitle(banned).ok, `title must inherit chat automod: ${banned}`);
  assert(!F.validateBody(banned).ok, `body must inherit chat automod: ${banned}`);
}
assert(!F.validateBody('http://not-allowlisted.example/thing').ok,
  'body must inherit the chat link allowlist');

// ---- bodies -----------------------------------------------------------------
assert(F.validateBody('x'.repeat(F.MAX_POST)).ok, 'a post at exactly the cap is allowed');
assert(!F.validateBody('x'.repeat(F.MAX_POST + 1)).ok, 'a post over the cap is refused');
assert(F.MAX_POST > F.FORUM_LIMITS.CHAT_MAX_TEXT,
  'the forum is the long-form surface — its cap must exceed chat, or it has no reason to exist');

// ---- identity is never taken from the request body --------------------------
{
  const anon = F.newThread({ title: 'hello', text: 'first post', handle: '', now, id: 'a1' });
  assert(!anon.ok, 'posting without a linked session must be refused');
  assert.match(anon.error, /link x/i, 'the refusal should say what to do about it');
}
{
  const t = F.newThread({ title: 'Real title', text: 'Opening post.', ...author, now, id: 'a1' });
  assert(t.ok, 'a valid thread from a linked author is accepted');
  assert.equal(t.summary.replies, 0);
  assert.equal(t.posts.length, 1, 'a new thread carries exactly its opener');
  assert.equal(t.posts[0].handle, author.handle, 'author comes from the session, not the body');
  assert.equal(t.summary.lastTs, now);
}

// ---- replies ----------------------------------------------------------------
{
  const posts = [{ id: 'a1-0', handle: 'x', text: 'op', ts: now }];
  assert(!F.addReply(posts, { text: 'hi', handle: '', now, id: 'r1' }).ok, 'anonymous reply refused');
  assert(!F.addReply([], { text: 'hi', ...author, now, id: 'r1' }).ok, 'reply to a missing thread refused');
  const r = F.addReply(posts, { text: 'a reply', ...author, now: now + 5, id: 'r1' });
  assert(r.ok && r.post.text === 'a reply' && r.post.handle === author.handle);

  const full = Array.from({ length: F.MAX_POSTS }, (_, i) => ({ id: `p${i}`, handle: 'x', text: 't', ts: now }));
  const refused = F.addReply(full, { text: 'one more', ...author, now, id: 'r2' });
  assert(!refused.ok, 'a full thread must refuse rather than silently drop the oldest post');
  assert.match(refused.error, /full/i);
}

// ---- index ordering, cap and staleness --------------------------------------
{
  const idx = [
    { id: 'old', title: 'old', ts: now - 10_000, lastTs: now - 10_000 },
    { id: 'new', title: 'new', ts: now - 1000, lastTs: now },
    { id: 'stale', title: 'stale', ts: 0, lastTs: now - F.THREAD_TTL_MS - 1 },
  ];
  const pruned = F.pruneIndex(idx, now);
  assert.deepEqual(pruned.map((t) => t.id), ['new', 'old'], 'newest activity first, stale dropped');

  const many = Array.from({ length: F.MAX_THREADS + 25 }, (_, i) => ({ id: `t${i}`, title: 't', ts: now - i, lastTs: now - i }));
  assert.equal(F.pruneIndex(many, now).length, F.MAX_THREADS, 'index is bounded');
}

// ---- the public shapes leak nothing extra ------------------------------------
{
  const t = F.publicThread({ id: 'a', title: 'b', handle: 'c', avatar: 'd', ts: 1, lastTs: 2, replies: 3, secret: 'no' });
  assert.deepEqual(Object.keys(t).sort(), ['avatar', 'handle', 'holder', 'id', 'lastTs', 'locked', 'reactions', 'replies', 'snippet', 'title', 'ts']);
  assert.equal(t.locked, false);
  assert.equal(t.secret, undefined);
  const p = F.publicPost({ id: 'a', handle: 'b', avatar: 'c', text: 'd', ts: 1, ip: '1.2.3.4' });
  assert.deepEqual(Object.keys(p).sort(), ['avatar', 'handle', 'holder', 'id', 'reacted', 'reactionCount', 'text', 'ts']);
  assert.equal(p.ip, undefined);
}

// ---- H2: search, edit, delete, lock, report ---------------------------------
{
  const idx = [
    { id: '1', title: 'Studio remix night', handle: 'dash_eats' },
    { id: '2', title: 'join t.me/dashacommunity', handle: 'scam' },
    { id: '3', title: 'Chess challenge', handle: 'anna' },
  ];
  assert.deepEqual(F.searchThreads(idx, 'studio').map((t) => t.id), ['1']);
  assert.deepEqual(F.searchThreads(idx, 't.me').map((t) => t.id), [], 'search must not return automod-banned titles');
  assert.equal(F.searchThreads(idx, '').length, 3, 'empty query is the full index');
}

{
  const now = 1_760_000_000_000;
  const posts = [
    { id: 'a1-0', handle: 'dash_eats', text: 'op', ts: now },
    { id: 'a1-1', handle: 'anna', text: 'hi', ts: now },
  ];
  assert(!F.editPost(posts, { id: 'a1-1', text: 'yo', handle: 'dash_eats', now }).ok, 'cannot edit someone else');
  assert(!F.editPost(posts, { id: 'a1-1', text: 'join t.me/x', handle: 'anna', now }).ok, 'edit inherits automod');
  assert(!F.editPost(posts, { id: 'a1-1', text: 'later', handle: 'anna', now: now + F.EDIT_WINDOW_MS + 1 }).ok, 'edit window');
  const ok = F.editPost(posts, { id: 'a1-1', text: 'hello again', handle: 'anna', now: now + 1000 });
  assert(ok.ok && ok.post.text === 'hello again' && ok.post.editedAt === now + 1000);
  assert.equal(posts[1].text, 'hi', 'edit returns a copy; original posts stay put');
}

{
  const posts = [
    { id: 'a1-0', handle: 'dash_eats', text: 'op', ts: 1 },
    { id: 'a1-1', handle: 'anna', text: 'hi', ts: 1 },
  ];
  assert(!F.deletePost(posts, { id: 'a1-0', handle: 'dash_eats' }).ok, 'opener stays');
  assert(!F.deletePost(posts, { id: 'a1-1', handle: 'dash_eats' }).ok, 'cannot delete someone else');
  const gone = F.deletePost(posts, { id: 'a1-1', handle: 'anna' });
  assert(gone.ok && gone.post.deleted && gone.post.text === '');
  const pub = F.publicPost(gone.post);
  assert.equal(pub.text, '');
  assert.equal(pub.deleted, true);
  assert.ok(!('ip' in pub));
}

{
  const locked = F.lockThread({ id: 't', title: 'x', handle: 'a' }, { locked: true });
  assert(locked.ok && locked.summary.locked);
  assert.equal(F.assertWritable(locked.summary).error, 'thread is locked');
  assert(!F.validateReport('ngmi').ok);
  assert.equal(F.validateReport('scam').reason, 'scam');
}

// ---- quotes (reply-to) ------------------------------------------------------
{
  const posts = [
    { id: 'q-0', handle: 'dash_eats', text: 'the opener', ts: 1 },
    { id: 'q-1', handle: 'anna', text: 'the claim being answered', ts: 2 },
  ];
  const r = F.addReply(posts, { text: 'counterpoint', handle: 'third', now: 3, id: 'q-2', quoteId: 'q-1' });
  assert(r.ok, 'a reply may quote an earlier post');
  assert.equal(r.post.quote.handle, 'anna');
  assert.equal(r.post.quote.text, 'the claim being answered');
  assert.equal(F.publicPost(r.post).quote.handle, 'anna', 'the quote survives the public shape');
  assert(!F.addReply(posts, { text: 'x', handle: 'third', now: 3, id: 'q-3', quoteId: 'missing' }).ok,
    'quoting a post that is not in the thread is refused');
  const tombstoned = [{ id: 'q-0', handle: 'a', text: 'op', ts: 1 }, { id: 'q-1', handle: 'b', text: 'hi', ts: 2, deleted: true }];
  assert(!F.addReply(tombstoned, { text: 'x', handle: 'c', now: 3, id: 'q-2', quoteId: 'q-1' }).ok,
    'quoting a deleted post is refused');
  const bounded = F.attachQuote([{ id: 'q-1', handle: 'a', text: 'x'.repeat(500), ts: 1 }], 'q-1');
  assert(bounded.ok && bounded.quote.text.length === F.QUOTE_SNIP, 'quote snippet is bounded to QUOTE_SNIP');
}

console.log('dasha forum: PASS (titles, inherited automod, caps, session-only identity, ordering, bounded index, H2 search/edit/delete/lock/quote)');
