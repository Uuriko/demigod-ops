#!/usr/bin/env node
/**
 * The forum's worker half: storage shape, and the size ceiling that storage actually imposes.
 *
 * dasha-forum.test.mjs proves the rules in isolation. It cannot prove the thing that broke first:
 * a thread is persisted as ONE Durable Object value, and those cap at 128 KiB. The handler was
 * written with a comment claiming one key per thread and an implementation that put the entire
 * board — every thread, every post — into a single key. At the configured caps that is 38 MB, and
 * even ten modest threads cross the limit, so writes would have started failing once anyone used it.
 *
 * These assertions are about bytes and keys rather than prose, because the comment was already
 * right and the code was still wrong.
 *
 *   node dasha-forum-worker.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const F = await import(new URL('./dasha-forum.mjs', import.meta.url).href);
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');

const DO_VALUE_LIMIT = 128 * 1024;
const post = (text) => ({ id: 'p'.repeat(12), handle: 'dash_eats', avatar: 'https://pbs.twimg.com/profile_images/1234567890123456789/abcdefgh_400x400.jpg', text, ts: 1_760_000_000_000 });

// ---- a maximal thread fits in one storage value ------------------------------
{
  const full = Array.from({ length: F.MAX_POSTS }, () => post('x'.repeat(F.MAX_POST)));
  const bytes = F.threadBytes(full);
  assert.ok(bytes < DO_VALUE_LIMIT,
    `a thread at MAX_POSTS x MAX_POST is ${(bytes / 1024).toFixed(0)} KiB and must fit under the 128 KiB value limit`);
  assert.ok(F.THREAD_BYTES_MAX <= DO_VALUE_LIMIT, 'the guard must sit at or below the platform limit');
}

// ---- the byte guard refuses before storage does ------------------------------
{
  /* Long handles and avatar URLs are not covered by the post cap, so the count-based cap alone is
     a design target. This is the assertion that makes it real. */
  const heavy = Array.from({ length: F.MAX_POSTS - 1 }, () => ({
    ...post('x'.repeat(F.MAX_POST)),
    handle: 'h'.repeat(60),
    avatar: `https://pbs.twimg.com/${'a'.repeat(300)}.jpg`,
  }));
  const refused = F.addReply(heavy, { text: 'x'.repeat(F.MAX_POST), handle: 'dash_eats', now: 1, id: 'r' });
  if (!refused.ok) assert.match(refused.error, /full/i, 'an over-size thread refuses as full');
  else assert.ok(F.threadBytes([...heavy, refused.post]) <= F.THREAD_BYTES_MAX,
    'if a reply is accepted the resulting thread must be within the guard');
}

// ---- storage is keyed per thread, never one blob -----------------------------
{
  assert.ok(!/storage\.put\('forum',/.test(worker),
    'the whole board must never be written to a single key — that is the 38 MB bug');
  assert.ok(/storage\.put\(this\.forumKey\(/.test(worker), 'posts are written under a per-thread key');
  assert.ok(/storage\.put\('forum:index'/.test(worker), 'the index is its own key');
  assert.ok(/storage\.delete\(this\.forumKey\(/.test(worker),
    'pruned threads must have their post keys deleted, or storage grows without bound');
}

// ---- the index stays small enough to hold in memory --------------------------
{
  const summaries = Array.from({ length: F.MAX_THREADS }, (_, i) => ({
    id: `t${i}`, title: 'x'.repeat(F.MAX_TITLE), handle: 'dash_eats',
    avatar: 'https://pbs.twimg.com/profile_images/1234567890123456789/abcdefgh_400x400.jpg',
    ts: 1, lastTs: 2, replies: 3,
  }));
  const bytes = F.threadBytes(summaries.map(F.publicThread));
  assert.ok(bytes < DO_VALUE_LIMIT,
    `a full index is ${(bytes / 1024).toFixed(0)} KiB and must fit its own value`);
}

// ---- identity and origin are enforced at the door ----------------------------
{
  const handler = worker.slice(worker.indexOf('async handleForum('), worker.indexOf('async handleChess('));
  assert.ok(handler.includes("sessionFromRequest"), 'identity comes from the session, never the body');
  assert.ok(/if \(!xId\) return json\(\{ error: 'link X first' \}/.test(handler),
    'both write paths must refuse an unlinked poster');
  assert.ok((handler.match(/link X first/g) || []).length >= 2, 'writes refuse an unlinked poster');
  assert.ok(handler.includes('searchThreads'), 'GET /forum/threads?q= uses title search');
  assert.ok(handler.includes('editPost') && handler.includes('deletePost'), 'author edit/delete are wired');
  assert.ok(handler.includes('modAllowed'), 'lock is operator-only');
  assert.ok(handler.includes('forum:reports'), 'reports persist off the public shape');
  assert.ok(/request\.method !== 'GET' && !allowedOrigin/.test(handler), 'writes require an allowed origin');
  assert.ok(/simpRate\(/.test(handler), 'writes are rate limited');
}

console.log('dasha forum worker: PASS (thread fits one value, byte guard, per-thread keys, orphan cleanup, bounded index, session+origin+rate at the door)');
