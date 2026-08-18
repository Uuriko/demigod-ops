#!/usr/bin/env node
import assert from 'node:assert/strict';
import { listingCanPay, scoreDexInfo } from './dasha-listings-identity.mjs';

const liveShaped = {
  websites: [{ url: 'https://dasha.cam', label: 'Website' }],
  socials: [
    { url: 'https://x.com/dash_eats/status/1886436372569027054', type: 'twitter' },
    { url: 'https://t.me/dashacommunity', type: 'telegram' },
  ],
};
const got = scoreDexInfo(liveShaped);
assert.equal(got.website, 'https://dasha.cam');
assert.equal(got.websiteIsCanonical, false);
assert.equal(got.websiteIsRejected, true);
assert.equal(got.telegramBanned, true);
assert.equal(got.twitterIsProfile, false);

const fixed = scoreDexInfo({
  websites: [{ url: 'https://www.getdasha.com' }],
  socials: [{ url: 'https://x.com/dash_eats', type: 'twitter' }],
});
assert.equal(fixed.websiteIsCanonical, true);
assert.equal(fixed.websiteIsRejected, false);
assert.equal(fixed.telegramBanned, false);
assert.equal(fixed.twitterIsProfile, true);

assert.equal(scoreDexInfo({}).websiteIsCanonical, false);
assert.equal(listingCanPay({ payTo: '' }), false);
assert.equal(listingCanPay({}), false);
assert.equal(listingCanPay({ payTo: 'not-a-wallet' }), false);
assert.equal(listingCanPay({ payTo: 'DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb' }), true);
console.log('dasha-listings-identity: PASS');
