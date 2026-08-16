/**
 * Talent-referrer mint/pack (simple product path).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('mint-talent creates unique engineer link and pack with 20% / 90-day honesty', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-refer-mint-'));
  process.env.DEMIGOD_REFERRALS_PATH = path.join(dir, 'referrals.json');
  process.env.DEMIGOD_REFERRALS_STATUS_PATH = path.join(dir, 'status.json');
  process.env.DEMIGOD_TEST_SCOPE = `mint-${process.pid}`;

  const referrals = await import(`./demigod-referrals.mjs?mint=${Date.now()}`);
  const pack = referrals.mintTalentReferrer({
    name: 'Alex Referrer',
    email: 'alex.referrer@example.com',
  });
  assert.equal(pack.ok, true);
  assert.match(pack.linkId, /^ref_/);
  assert.equal(pack.approval, 'pending');
  assert.match(pack.links.talent, /referral=rf_/);
  assert.match(pack.links.talent, /wiz=engineer/);
  assert.match(pack.links.short, /[?&]r=rf_/);
  assert.match(pack.links.short, /wiz=engineer/);
  assert.equal(pack.links.path, undefined, 'never mint a Webflow path that hard-404s before foot loads');
  assert.match(pack.links.universal, /utm_source=referral/);
  assert.match(pack.packText, /20%/);
  assert.match(pack.packText, /day 90/i);
  assert.match(pack.packText, /automated payout is not live/i);
  assert.ok(pack.packText.includes(pack.disclosure));
  assert.match(pack.packText, /Copy and send personally/i);
  assert.doesNotMatch(pack.packText, /Canonical talent link|Path form|Universal link|Ops next steps/i);
  assert.equal(pack.packText.split(pack.links.short).length - 1, 1, 'the referrer sees one share URL');
  assert.ok(pack.shareMessage.includes(pack.disclosure));
  assert.match(pack.shareMessage, /[?&]r=rf_/);
  assert.match(pack.shareMessage, /nothing is shared until you approve/i);
  assert.match(pack.shareMessage, /not your pay/i);

  const again = referrals.mintTalentReferrer({
    name: 'Alex Referrer',
    email: 'alex.referrer@example.com',
  });
  assert.equal(again.linkId, pack.linkId, 'same email reuses one link');
  assert.match(again.packText, /existing/i);

  const reprinted = referrals.packReferral(pack.linkId);
  assert.equal(reprinted.linkId, pack.linkId);
  assert.match(reprinted.links.talent, /wiz=engineer/);
  assert.match(reprinted.links.short, /[?&]r=rf_/);

  // No bank/TIN in pack
  assert.doesNotMatch(reprinted.packText, /routing|SSN|tax id|bank account/i);

  const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  const referPage = foot.match(/  refer: \{([\s\S]*?)\n  \},\n  about:/)?.[1] || '';
  assert.match(referPage, /Make one strong introduction/);
  assert.equal((referPage.match(/<li>/g) || []).length, 3, 'public referral flow stays at three steps');
  assert.match(referPage, /never the candidate’s salary or offer/);
  assert.match(referPage, /id="dg-referral-form-slot"/);
  assert.match(referPage, /does not create or approve a link/);
  assert.match(referPage, /id="dg-referral-form-fallback"/, 'a safe email fallback remains if the native form contract drifts');
  const referralMount = foot.match(/function mountReferralForm\(root\) \{([\s\S]*?)\n\}\n\/\* v851:/)?.[1] || '';
  for (const name of ['partner-name', 'partner-email', 'referral-plan']) {
    assert.match(referralMount, new RegExp(`\\\\?['"]${name}\\\\?['"]`), `${name} stays in the minimal form contract`);
  }
  assert.match(referralMount, /field\.required = true/);
  assert.match(referralMount, /\['partner-email', 'email', 'email', 160,/);
  assert.match(referralMount, /data-wf-element-id/);
  assert.match(referralMount, /visibleFields\.length !== expectedFields\.length/);
  assert.match(referralMount, /visibleFields\.some\(function \(field\)/);
  assert.match(referralMount, /type\.name = 'partner-type'/);
  assert.match(referralMount, /type\.value = 'refer-talent'/);
  assert.match(referralMount, /Request a referral link/);
  assert.match(referralMount, /submit\.classList\.remove\('w-form-loading'\)/);
  assert.match(referralMount, /submit\.disabled = false/);
  assert.match(referralMount, /setTimeout\(function \(\) \{[\s\S]*?submit\.disabled = false;[\s\S]*?\}, 1000\)/);
  assert.match(referralMount, /A human reviews every request/);
  assert.match(referralMount, /done\.setAttribute\('role', 'status'\)/);
  assert.match(referralMount, /fail\.setAttribute\('role', 'alert'\)/);
  assert.match(referralMount, /Referral link request success/);
  assert.match(referralMount, /Referral link request failure/);
  assert.match(foot, /function closePage\(\) \{\n  parkReferralForm\(\);\n  var el = q\('#dg-page'\)/);
  assert.match(foot, /pageCss\(\);\n  parkReferralForm\(\);\n  var old = q\('#dg-page'\)/);
  assert.doesNotMatch(referralMount, /mint|localStorage|dashboard|portal/i);
  assert.doesNotMatch(foot, /\/r\/rf_/);
  assert.match(foot, /url\.searchParams\.get\('utm_source'\)==='referral'/);
  assert.match(foot, /input\.name==='utm_campaign'&&input\.value==='partner-network'/);
});
