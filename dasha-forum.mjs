/**
 * Forum threads and replies: the long-form door onto the same room the chat already guards.
 *
 * Every rule here is the chat's rule. validateMessage is imported rather than reimplemented,
 * because a second copy of the automod is a second thing to keep in sync, and the moment the two
 * disagree the forum becomes the way around the chat — post the scam link through the door that
 * forgot to check. The only thing this file changes is the length cap: the forum exists to be
 * long-form, so it raises maxText and leaves the scam patterns, the caps rule and the link
 * allowlist exactly where they are.
 *
 * Identity is never read from the request body. The worker owns sessions; these functions take a
 * handle that the worker has already proven and refuse anything without one.
 *
 * Pure logic: no storage, no network. The worker persists what these return.
 */
import { MAX_TEXT, validateMessage } from './dasha-lobby-mod.mjs';

export const MAX_TITLE = 80;
/* Long-form, but still one screen of reading. The test asserts this exceeds chat's cap — if it
   ever stops doing so the forum has no reason to exist as a separate surface. */
export const MAX_POST = 2000;
/* A Durable Object storage value caps at 128 KiB, and a thread is stored as one value. At the
   2000-character post cap a post serialises to roughly 2.2 KB once handle, avatar URL and JSON
   overhead are counted, so 50 is the largest round number that still fits a thread of entirely
   maximum-length posts inside one key with headroom. THREAD_BYTES_MAX below enforces it for real
   rather than trusting this arithmetic. */
export const MAX_POSTS = 50;
/* Refuse a write before it reaches storage. The per-post cap bounds text but not handle or avatar
   length, so the arithmetic above is a design target, not a guarantee. */
export const THREAD_BYTES_MAX = 120 * 1024;
export const MAX_THREADS = 100;
export const THREAD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Chat's limits, surfaced so the relationship between the two surfaces is assertable. */
export const FORUM_LIMITS = { CHAT_MAX_TEXT: MAX_TEXT, FORUM_MAX_TEXT: MAX_POST, MAX_TITLE };

/**
 * A title is one line. Newlines are collapsed before validation, not rejected: a thread list shows
 * one row per thread, so a title carrying a newline would render its first line and silently hide
 * the rest — which is a way to make a row read as something it is not.
 */
export function validateTitle(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'title required' };
  const flat = raw.replace(/\s+/g, ' ').trim();
  if (!flat) return { ok: false, error: 'title required' };
  const checked = validateMessage(flat, { maxText: MAX_TITLE });
  if (!checked.ok) return checked;
  return { ok: true, title: checked.text };
}

/** A post body. Same automod as chat, longer cap. */
export function validateBody(raw) {
  const checked = validateMessage(raw, { maxText: MAX_POST });
  if (!checked.ok) return checked;
  return { ok: true, text: checked.text };
}

/** Refuse anything the worker could not attribute to a linked session. */
function requireAuthor(handle) {
  return String(handle || '').trim() ? null : { ok: false, error: 'link X to post' };
}

export function newThread({ title, text, handle, avatar = null, now, id }) {
  const anon = requireAuthor(handle);
  if (anon) return anon;
  const t = validateTitle(title);
  if (!t.ok) return t;
  const b = validateBody(text);
  if (!b.ok) return b;

  const opener = { id: `${id}-0`, handle, avatar, text: b.text, ts: now };
  return {
    ok: true,
    summary: { id, title: t.title, handle, avatar, ts: now, lastTs: now, replies: 0 },
    posts: [opener],
  };
}

export function addReply(posts, { text, handle, avatar = null, now, id }) {
  const anon = requireAuthor(handle);
  if (anon) return anon;
  if (!Array.isArray(posts) || !posts.length) return { ok: false, error: 'thread not found' };
  /* Refuse rather than drop the oldest. A thread is a record of what was said; silently evicting
     the opening post would leave replies answering something no longer there. */
  if (posts.length >= MAX_POSTS) return { ok: false, error: 'thread is full' };
  const b = validateBody(text);
  if (!b.ok) return b;
  const post = { id, handle, avatar, text: b.text, ts: now };
  /* Measured, not assumed. A thread is one storage value with a hard 128 KiB ceiling, and a write
     that crosses it fails at the platform — which would lose the post and leave the reply count
     disagreeing with the posts. Refusing here keeps the thread consistent. */
  if (threadBytes([...posts, post]) > THREAD_BYTES_MAX) return { ok: false, error: 'thread is full' };
  return { ok: true, post };
}

/** Serialised size of a thread's posts, as storage will see it. */
export function threadBytes(posts) {
  return new TextEncoder().encode(JSON.stringify(posts)).length;
}

/** Newest activity first, stale threads dropped, length bounded. */
export function pruneIndex(index, now) {
  return (Array.isArray(index) ? index : [])
    .filter((t) => t && Number(now) - Number(t.lastTs ?? t.ts) <= THREAD_TTL_MS)
    .sort((a, b) => Number(b.lastTs ?? b.ts) - Number(a.lastTs ?? a.ts))
    .slice(0, MAX_THREADS);
}

/* Explicit field lists, not a delete-the-secrets pass. Whatever the worker starts storing
   alongside a thread — an IP, a session id, a moderation note — stays server-side by default
   instead of shipping the first time someone adds a field. */
export function publicThread(t) {
  return {
    id: t.id, title: t.title, handle: t.handle, avatar: t.avatar ?? null,
    ts: t.ts, lastTs: t.lastTs, replies: t.replies ?? 0,
  };
}

export function publicPost(p) {
  return { id: p.id, handle: p.handle, avatar: p.avatar ?? null, text: p.text, ts: p.ts };
}
