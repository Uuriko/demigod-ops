#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  OSS_SCHEMA,
  SIMP_SPOTLIGHT_UNLOCK,
  buildPublicBoard,
  meStatus,
  normalizeSimpSpotlight,
  rulesPublic,
  scoreProfile,
  setSimpSpotlight,
} from './dasha-simp-score.mjs';

const now = Date.parse('2026-08-20T16:00:00Z');
const session = { xId: '42', handle: 'maker' };
const basic = { xId: '42', handle: 'maker', enrolledAt: now, awards: [] };
const earned = {
  ...basic,
  awards: [{
    kind: 'oss', schema: OSS_SCHEMA, points: 15, at: now,
    evidenceUrl: 'https://github.com/Uuriko/dasha-desk/pull/42',
  }],
};

assert.equal(SIMP_SPOTLIGHT_UNLOCK, 25);
assert.deepEqual(rulesPublic().spotlight.platforms, ['GitHub', 'YouTube', 'Twitch', 'Bluesky', 'LinkedIn', 'Instagram', 'Farcaster']);
assert.equal(scoreProfile(earned, { now }).total, 25);
assert.equal(setSimpSpotlight({ 42: basic }, session, 'https://github.com/maker', { now }).status, 403);

const github = setSimpSpotlight({ 42: earned }, session, 'https://www.github.com/Maker/', { now });
assert.equal(github.ok, true);
assert.deepEqual(github.spotlight, { platform: 'GitHub', url: 'https://github.com/Maker' });
assert.equal(normalizeSimpSpotlight('https://github.com/settings-dev').ok, true, 'reserved words are exact, not substrings');
assert.equal(scoreProfile(github.profile, { now }).total, 25, 'spotlight must never affect score');
assert.deepEqual(buildPublicBoard([github.profile], { now }).measured[0].spotlight, github.spotlight);
assert.equal(meStatus(github.store, session).board.rank, 2, 'member status must include the public rank after the editorial #1');
const rival = { ...earned, xId: '7', handle: 'alpha', enrolledAt: now - 1 };
assert.equal(meStatus({ ...github.store, 7: rival }, session).board.rank, 3, 'member rank must use the authoritative board ordering');
assert.deepEqual(meStatus(github.store, session).board.spotlightUnlock, { points: 25, unlocked: true, remaining: 0 });
const holderUntil = Date.now() + 24 * 60 * 60 * 1000;
const holderStatus = meStatus({ 42: { ...github.profile, holderCheckedAt: Date.now(), holderUntil } }, session);
assert.equal(holderStatus.board.holder, true);
assert.equal(holderStatus.board.holderExpiresAt, holderUntil, 'signed member status must expose its real proof expiry');
assert.equal(meStatus({ 42: { ...github.profile, holderUntil: 1 } }, session).board.holderExpiresAt, null,
  'expired proof must not advertise a stale deadline');

const youtube = setSimpSpotlight(github.store, session, 'https://youtube.com/@dasha_maker', { now: now + 1 });
assert.deepEqual(youtube.spotlight, { platform: 'YouTube', url: 'https://www.youtube.com/@dasha_maker' });
const bluesky = setSimpSpotlight(youtube.store, session, 'https://bsky.app/profile/Maker.Example.COM/', { now: now + 2 });
assert.deepEqual(bluesky.spotlight, { platform: 'Bluesky', url: 'https://bsky.app/profile/maker.example.com' });
const twitch = setSimpSpotlight(bluesky.store, session, 'https://twitch.tv/Dasha_Maker/', { now: now + 3 });
assert.deepEqual(twitch.spotlight, { platform: 'Twitch', url: 'https://www.twitch.tv/dasha_maker' });
assert.equal(normalizeSimpSpotlight('https://twitch.tv/directory_live').ok, true, 'valid Twitch names may contain reserved words');
assert.equal(scoreProfile(twitch.profile, { now: now + 3 }).total, 25, 'Twitch spotlight must never affect score');
const linkedin = setSimpSpotlight(twitch.store, session, 'https://linkedin.com/in/Dasha-Maker-123/', { now: now + 4 });
assert.deepEqual(linkedin.spotlight, { platform: 'LinkedIn', url: 'https://www.linkedin.com/in/dasha-maker-123' });
assert.equal(scoreProfile(linkedin.profile, { now: now + 4 }).total, 25, 'LinkedIn spotlight must never affect score');
const instagram = setSimpSpotlight(linkedin.store, session, 'https://instagram.com/Dasha.Maker_7/', { now: now + 5 });
assert.deepEqual(instagram.spotlight, { platform: 'Instagram', url: 'https://www.instagram.com/dasha.maker_7' });
assert.equal(scoreProfile(instagram.profile, { now: now + 5 }).total, 25, 'Instagram spotlight must never affect score');
const farcaster = setSimpSpotlight(instagram.store, session, 'https://www.farcaster.xyz/DAsha-Maker/', { now: now + 6 });
assert.deepEqual(farcaster.spotlight, { platform: 'Farcaster', url: 'https://farcaster.xyz/dasha-maker' });
assert.deepEqual(normalizeSimpSpotlight('https://farcaster.xyz/woj.eth').spotlight, { platform: 'Farcaster', url: 'https://farcaster.xyz/woj.eth' });
assert.equal(scoreProfile(farcaster.profile, { now: now + 4 }).total, 25, 'Farcaster spotlight must never affect score');
const maxBlueskyHandle = ['a'.repeat(63), 'b'.repeat(63), 'c'.repeat(63), 'd'.repeat(61)].join('.');
assert.equal(maxBlueskyHandle.length, 253);
assert.equal(normalizeSimpSpotlight(`https://bsky.app/profile/${maxBlueskyHandle}`).ok, true);
assert.equal(normalizeSimpSpotlight(`https://bsky.app/profile/${maxBlueskyHandle}x`).ok, false);
const removed = setSimpSpotlight(farcaster.store, session, '', { now: now + 5 });
assert.equal(removed.ok, true);
assert.equal(removed.spotlight, null);
assert.equal('spotlight' in removed.profile, false);

for (const bad of [
  'javascript:alert(1)',
  'http://github.com/maker',
  'https://user:pass@github.com/maker',
  'https://github.com/maker/repo',
  'https://github.com/maker?tab=repositories',
  ...['settings', 'login', 'features', 'marketplace', 'explore', 'topics'].map(name => `https://github.com/${name}`),
  'https://youtube.com/watch?v=abc',
  'https://twitch.tv/abc',
  'https://twitch.tv/dasha-maker',
  'https://twitch.tv/dasha_maker/videos',
  'https://twitch.tv/dasha_maker?ref=spotlight',
  `https://twitch.tv/${'a'.repeat(26)}`,
  ...['directory', 'downloads', 'jobs', 'settings', 'subscriptions', 'videos'].map(name => `https://twitch.tv/${name}`),
  'https://bsky.app/profile/maker',
  'https://bsky.app/profile/maker..social',
  'https://bsky.app/profile/maker.0',
  'https://bsky.app/profile/maker.bsky.social/post/abc',
  'https://linkedin.com/company/dasha',
  'https://linkedin.com/in/ab',
  `https://linkedin.com/in/${'a'.repeat(101)}`,
  'https://linkedin.com/in/dasha_maker',
  'https://linkedin.com/in/dasha-maker?trk=spotlight',
  'https://instagram.com/explore',
  'https://instagram.com/p/abc',
  'https://instagram.com/dasha..maker',
  'https://instagram.com/dasha.',
  'https://instagram.com/dasha-maker',
  'https://instagram.com/dasha_maker?igsh=abc',
  `https://instagram.com/${'a'.repeat(31)}`,
  'https://farcaster.xyz/dasha_maker',
  'https://farcaster.xyz/dasha-maker/casts-and-replies',
  'https://farcaster.xyz/dasha-maker?ref=spotlight',
  `https://farcaster.xyz/${'a'.repeat(17)}`,
  ...['settings', 'miniapps', 'login-desktop', 'login-mobile', 'login-wallet', 'login-web'].map(name => `https://farcaster.xyz/${name}`),
  'https://example.com/maker',
]) assert.equal(normalizeSimpSpotlight(bad).ok, false, bad);

const worker = readFileSync(new URL('./dasha-lobby-worker.mjs', import.meta.url), 'utf8');
const client = readFileSync(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');
const liveVerifier = readFileSync(new URL('./dasha-live-verify.mjs', import.meta.url), 'utf8');
assert.match(worker, /path === '\/simp\/spotlight'/);
assert.match(worker, /if \(!allowedOrigin\) return json\(\{ error: 'origin required' \}/);
assert.match(client, /noopener noreferrer nofollow ugc/);
assert.match(client, /GitHub, YouTube, Twitch, Bluesky, LinkedIn, Instagram, or Farcaster spotlight profile URL/);
assert.match(client, /GitHub · YouTube · Twitch · Bluesky · LinkedIn · Instagram · Farcaster\. Clear \+ Save removes\./,
  'the visible unlocked hint must list every accepted Spotlight platform');
assert.match(client, /Promote a profile/);
assert.match(client, /placeholder = 'Paste profile URL'/);
assert.match(client, /el\('progress', 'simp-spotlight-progress'\)/, 'locked Spotlight uses native progress semantics');
assert.match(client, /setAttribute\('aria-label', 'Spotlight unlock progress'\)/, 'Spotlight progress has an accessible name');
assert.match(client, /spotlightProgress\.max = spotlightUnlock\.points/);
assert.match(client, /spotlightProgress\.value = spotlightUnlock\.points - spotlightUnlock\.remaining/);
assert.match(client, /spotlightProgress\.hidden = spotlightUnlock\.unlocked/, 'progress disappears after unlock');
assert.match(client, /points unlock one profile link/);
assert.match(client, /toolsSummary\.textContent = addSpotlight \? 'Add profile' : holderActive \? 'Holder proof active' \+ \(holderLeft \? ' · ' \+ holderLeft : ''\) : 'More'/);
assert.match(client, /tools\.open = addSpotlight/);
assert.match(liveVerifier, /rulesPublic\(\)\.spotlight\.platforms/,
  'live verifier derives its expected platform set from the Worker rules source');
assert.match(liveVerifier, /spotlight-platforms-not-prepared/,
  'live verifier fails when the API still advertises an older platform set');
assert.match(liveVerifier, /assert\.equal\(spotlightPlatformsPrepared, true/,
  'strict verification requires the live and prepared Spotlight sets to match');

console.log('dasha Simp spotlight: PASS (25-point unlock, seven safe profile hosts, score-neutral, removable)');
