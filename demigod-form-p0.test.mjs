import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const events = fs.readFileSync(new URL('./demigod-events-app.mjs', import.meta.url), 'utf8');
const startupConfig = foot.slice(foot.indexOf('startup:{', foot.indexOf('var WIZ_CFG')), foot.indexOf('engineer:{', foot.indexOf('var WIZ_CFG')));
const talentConfig = foot.slice(foot.indexOf('engineer:{', foot.indexOf('var WIZ_CFG')), foot.indexOf('/* ==== SECTION: WIZ_Q'));

test('P0 hiring forms collect only match-critical evidence', () => {
  assert.match(startupConfig, /\['work-location'\]/);
  assert.doesNotMatch(startupConfig, /team-size|why-this-role|role-jd|timeline/);
  assert.doesNotMatch(talentConfig, /\['linkedin-url'\]|phone|why-startups/);
  assert.doesNotMatch(talentConfig, /\['links'\]/);
  assert.match(foot, /Where and how can this person work\?/);
  assert.match(foot, /Resume or work link\?/);
  assert.match(foot, /nativeResume&&!en\.querySelector\('\[name=resume-url\]'\)/);
  assert.match(foot, /Upload a file or paste one shareable HTTPS link/);
  assert.match(foot, /\['Source','hiring-model','timeline','team-size','why-this-role','role-jd'\]\.forEach/);
  assert.match(foot, /\['github-url','portfolio-url','linkedin-url','phone','why-startups'\]\.forEach/);
});

test('community event intent is validated in browser and server', () => {
  assert.match(foot, /Date and time \(your local timezone\) \*/);
  assert.match(foot, /name="format" required/);
  assert.match(foot, /function syncEventRequirements\(form\)/);
  assert.match(foot, /venue\.required = !!\(format && \/\^\(in-person\|hybrid\)\$\//);
  assert.match(foot, /external\.required = !!\(destination && destination\.value !== 'demigod'\)/);
  assert.match(events, /const EVENT_FORMATS = new Set\(\['in-person', 'online', 'hybrid'\]\)/);
  assert.match(events, /externalUrl required for Luma or Partiful destinations/);
  assert.match(events, /venue required for in-person or hybrid events/);
  assert.match(events, /'format', 'audience', 'details', 'destination'/);
  assert.match(foot, /name=\\"audience\\" required/);
  assert.match(foot, /name=\\"details\\" rows=\\"4\\" required/);
});

test('event receipts expose a private fragment management link', () => {
  assert.match(foot, /'#dg-manage=' \+ encodeURIComponent\(JSON\.stringify\(\[row\.id, row\.manageToken\]\)\)/);
  assert.match(foot, /location\.hash\.match\(\/\^#dg-manage=\(\.\+\)\$\/\)/);
  assert.match(foot, /Private management link — save this/);
  assert.equal((foot.match(/privateLink\.target='_blank';privateLink\.rel='noopener noreferrer'/g) || []).length, 2);
  assert.match(foot, /receipt\.appendChild\(privateLink\);privateLink\.focus\(\)/);
});

test('startup submitters can privately edit or withdraw without an account system', () => {
  assert.match(events, /startup-submission\/read/);
  assert.match(events, /startup-submission\/manage/);
  assert.match(events, /startup-submission\/withdraw/);
  assert.match(events, /bucket: 'startup-submission-read'/);
  assert.match(events, /manageTokenHash: tokenHash\(manageToken\)/);
  assert.match(foot, /\/startup-submission\/manage/);
  assert.match(foot, /Withdraw startup submission/);
  assert.match(foot, /result\.startup\.id/);
});

test('unlisted startup submissions require enough public evidence to review', () => {
  assert.match(foot, /name=\\"website\\" type=\\"url\\" required/);
  assert.match(foot, /name=\\"neighborhood\\" required/);
  assert.match(foot, /name=\\"description\\" rows=\\"3\\" required/);
  assert.match(events, /name, website, neighborhood, description, submitterName/);
});
