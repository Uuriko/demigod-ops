import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { handleDashaReceiptRequest } from './dasha-receipts-worker.mjs';

class D1Statement {
  constructor(statement) { this.statement = statement; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() { const result = this.statement.run(...this.values); return { success: true, meta: { changes: result.changes } }; }
  async first() { return this.statement.get(...this.values) || null; }
  async all() { return { success: true, results: this.statement.all(...this.values) }; }
}
class D1Database {
  constructor(schema) { this.db = new DatabaseSync(':memory:'); this.db.exec(schema); }
  prepare(sql) { return new D1Statement(this.db.prepare(sql)); }
}

const schema = await readFile(new URL('./dasha-receipts-schema.sql', import.meta.url), 'utf8');
const DB = new D1Database(schema);
const inviteCode = 'invite-one';
const moderatorToken = 'moderator-one';
const limiter = { allowed: true, async limit() { return { success: this.allowed }; } };
const outcomeAuthLimiter = { blocked: new Set(), async limit({ key }) { return { success: !this.blocked.has(key) }; } };
const env = { DB, ALLOWED_ORIGIN: 'https://receipts.getdasha.com', PUBLIC_ORIGIN: 'https://receipts.getdasha.com', BETA_INVITE_HASH: createHash('sha256').update(inviteCode).digest('hex'), MODERATOR_TOKEN_HASH: createHash('sha256').update(moderatorToken).digest('hex'), BETA_MAX_RECEIPTS: 100, AUTH_RATE_LIMITER: limiter, CREATE_RATE_LIMITER: limiter, REPORT_RATE_LIMITER: limiter, OUTCOME_AUTH_RATE_LIMITER: outcomeAuthLimiter, OUTCOME_RATE_LIMITER: limiter };
const headers = { Origin: env.ALLOWED_ORIGIN, 'Content-Type': 'application/json' };
const date = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
const input = { inviteCode, publicAcknowledgment: 'yes', assetId: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump', thesis: 'Depth improves after listing.', invalidation: 'Depth remains below $50k.', confidence: 65, resolutionDate: date };
const call = (path, options = {}) => handleDashaReceiptRequest(new Request(`https://receipts.getdasha.com${path}`, options), env);

const creatorResponse = await call('/');
const creator = await creatorResponse.text();
assert.equal(creatorResponse.status, 200);
assert.match(creator, /Confirm and seal public receipt/);
assert.match(creatorResponse.headers.get('content-security-policy'), /script-src 'nonce-/);
assert.match(creator, /seal\.disabled=true/);

assert.equal((await call('/api/receipts', { method: 'POST', headers, body: JSON.stringify({ ...input, inviteCode: 'wrong' }) })).status, 403);
assert.equal((await call('/api/receipts', { method: 'POST', headers, body: JSON.stringify({ ...input, publicAcknowledgment: undefined }) })).status, 400);
limiter.allowed = false;
assert.equal((await call('/api/receipts', { method: 'POST', headers, body: JSON.stringify(input) })).status, 429);
limiter.allowed = true;

const createdResponse = await call('/api/receipts', { method: 'POST', headers, body: JSON.stringify(input) });
assert.equal(createdResponse.status, 201);
const created = await createdResponse.json();
assert.match(created.publicUrl, /^https:\/\/receipts\.getdasha\.com\/r\/[A-Za-z0-9_-]{22}$/);
const manageToken = new URL(created.manageUrl).hash.slice('#manage='.length);
assert.match(manageToken, /^[A-Za-z0-9_-]{43}$/);
assert.equal((await handleDashaReceiptRequest(new Request('https://receipts.getdasha.com/api/receipts', { method: 'POST', headers, body: JSON.stringify(input) }), { ...env, BETA_MAX_RECEIPTS: 1 })).status, 503);

const pageResponse = await call(new URL(created.publicUrl).pathname);
const page = await pageResponse.text();
assert.equal(pageResponse.status, 200);
assert.equal(pageResponse.headers.get('cache-control'), 'no-store');
assert.match(page, /Depth improves after listing\./);
assert.match(page, /does not prove authorship, identity, a trade, truth/i);
assert.equal(page.includes(manageToken), false);

const publicJson = await (await call(`${new URL(created.publicUrl).pathname}?format=json`)).json();
assert.equal(publicJson.thesis, input.thesis);
assert.equal('manageTokenHash' in publicJson, false);
assert.match(page, /not private/i);
assert.match(page, /name="robots" content="noindex, nofollow"/);
const calendarResponse = await call(`${new URL(created.publicUrl).pathname}.ics`);
const calendar = await calendarResponse.text();
assert.equal(calendarResponse.status, 200);
assert.match(calendar, new RegExp(`DTSTART;VALUE=DATE:${date.replaceAll('-', '')}`));
assert.match(calendar, new RegExp(created.publicUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.equal(calendar.includes(manageToken), false);

const reportPath = `/api/receipts/${created.id}/report`;
assert.equal((await call(reportPath, { method: 'POST', headers, body: JSON.stringify({ reason: 'unknown' }) })).status, 400);
assert.equal((await call(reportPath, { method: 'POST', headers, body: JSON.stringify({ reason: 'spam_scam', detail: 'Suspicious mint claim.' }) })).status, 202);
assert.equal(DB.db.prepare('SELECT count(*) AS count FROM reports').get().count, 1);
const reportsResponse = await call('/api/moderation/reports', { method: 'POST', headers, body: JSON.stringify({ moderatorToken }) });
const reports = await reportsResponse.json();
assert.equal(reportsResponse.status, 200);
assert.equal(reports.reports.length, 1);
const decisionPath = `/api/moderation/reports/${reports.reports[0].id}/decision`;
assert.equal((await call(decisionPath, { method: 'POST', headers, body: JSON.stringify({ moderatorToken: 'wrong', decision: 'dismissed' }) })).status, 403);
assert.equal((await call(decisionPath, { method: 'POST', headers, body: JSON.stringify({ moderatorToken, decision: 'dismissed' }) })).status, 200);
assert.equal((await call(decisionPath, { method: 'POST', headers, body: JSON.stringify({ moderatorToken, decision: 'actioned' }) })).status, 409);
const emptyReports = await (await call('/api/moderation/reports', { method: 'POST', headers, body: JSON.stringify({ moderatorToken }) })).json();
assert.deepEqual(emptyReports.reports, []);

const rejected = await call('/api/receipts', { method: 'POST', headers, body: JSON.stringify({ ...input, thesis: '<script>alert(1)</script> https://bad.example' }) });
assert.equal(rejected.status, 400);
assert.equal(DB.db.prepare('SELECT count(*) AS count FROM receipts').get().count, 1);

const outcomePath = `/api/receipts/${created.id}/outcome`;
assert.equal((await call(outcomePath, { method: 'POST', headers, body: JSON.stringify({ manageToken: 'wrong', status: 'invalidated', postmortem: 'The invalidation fired.' }) })).status, 403);
const attackerHeaders = { ...headers, 'CF-Connecting-IP': '203.0.113.10' };
const managerHeaders = { ...headers, 'CF-Connecting-IP': '203.0.113.11' };
outcomeAuthLimiter.blocked.add(`${created.id}:203.0.113.10`);
assert.equal((await call(outcomePath, { method: 'POST', headers: attackerHeaders, body: JSON.stringify({ manageToken: 'wrong', status: 'invalidated', postmortem: 'The invalidation fired.' }) })).status, 429);
assert.equal((await call(outcomePath, { method: 'POST', headers: managerHeaders, body: JSON.stringify({ manageToken, status: 'held', postmortem: 'The condition held.' }) })).status, 409);

const outcome = { manageToken, status: 'invalidated', postmortem: 'The declared invalidation fired.', sourceUrl: 'https://example.com/source' };
assert.equal((await call(outcomePath, { method: 'POST', headers, body: JSON.stringify(outcome) })).status, 201);
assert.equal((await call(outcomePath, { method: 'POST', headers, body: JSON.stringify(outcome) })).status, 200);
assert.equal((await call(outcomePath, { method: 'POST', headers, body: JSON.stringify({ ...outcome, postmortem: 'A conflicting rewrite.' }) })).status, 409);

const resolvedPage = await (await call(new URL(created.publicUrl).pathname)).text();
assert.match(resolvedPage, /Manager-added outcome/);
assert.match(resolvedPage, /The declared invalidation fired\./);
assert.match(resolvedPage, /example\.com \(not verified\)/);
assert.match(resolvedPage, /rel="nofollow ugc noopener noreferrer"/);
assert.equal((await call('/api/receipts', { method: 'PUT', headers, body: '{}' })).status, 405);
assert.equal((await call(new URL(created.publicUrl).pathname, { method: 'DELETE', headers })).status, 405);

const tombstonePath = `/api/moderation/receipts/${created.id}/tombstone`;
assert.equal((await call(tombstonePath, { method: 'POST', headers, body: JSON.stringify({ moderatorToken: 'wrong', reason: 'community_rules' }) })).status, 403);
assert.equal((await call(tombstonePath, { method: 'POST', headers, body: JSON.stringify({ moderatorToken, reason: 'community_rules' }) })).status, 200);
const removedResponse = await call(new URL(created.publicUrl).pathname);
const removedPage = await removedResponse.text();
assert.match(removedPage, /Receipt unavailable/);
assert.equal(removedPage.includes(input.thesis), false);
assert.equal(removedPage.includes(input.invalidation), false);
assert.equal(removedPage.includes(created.payloadHash), false);
const removedJson = await (await call(`${new URL(created.publicUrl).pathname}?format=json`)).json();
assert.deepEqual(Object.keys(removedJson).sort(), ['id', 'removedAt', 'status']);
assert.equal((await call(outcomePath, { method: 'POST', headers, body: JSON.stringify(outcome) })).status, 410);

const raceCreated = await (await call('/api/receipts', { method: 'POST', headers, body: JSON.stringify({ ...input, thesis: 'A separate concurrency receipt.' }) })).json();
const raceToken = new URL(raceCreated.manageUrl).hash.slice('#manage='.length);
const racePath = `/api/receipts/${raceCreated.id}/outcome`;
const raceResults = await Promise.all([
  call(racePath, { method: 'POST', headers, body: JSON.stringify({ manageToken: raceToken, status: 'invalidated', postmortem: 'First outcome.' }) }),
  call(racePath, { method: 'POST', headers, body: JSON.stringify({ manageToken: raceToken, status: 'disputed', postmortem: 'Conflicting outcome.' }) }),
]);
assert.deepEqual(raceResults.map(response => response.status).sort(), [201, 409]);
assert.equal(DB.db.prepare('SELECT count(*) AS count FROM outcomes WHERE receipt_id = ?').get(raceCreated.id).count, 1);

const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const result = await handleDashaReceiptRequest(new Request(`${origin}${request.url}`, { method: request.method, headers: request.headers, ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: Buffer.concat(chunks) }) }), { ...env, ALLOWED_ORIGIN: origin, PUBLIC_ORIGIN: origin });
  response.writeHead(result.status, Object.fromEntries(result.headers));
  response.end(Buffer.from(await result.arrayBuffer()));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

try {
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try { browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' }); }
  catch { console.log('Dasha receipt Worker: API PASS (axe/CDP skipped — no Chrome :9223)'); process.exit(0); }
  const page = await browser.newPage();
  await page.setBypassCSP(true);
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(base);
  await page.type('[name=inviteCode]', inviteCode);
  await page.type('[name=assetId]', input.assetId);
  await page.type('[name=thesis]', input.thesis);
  await page.type('[name=invalidation]', input.invalidation);
  await page.$eval('[name=resolutionDate]', (node, value) => { node.value = value; }, date);
  await page.click('[name=publicAcknowledgment]');
  await page.click('#review');
  await page.waitForSelector('#preview:not([hidden])');
  assert.match(await page.$eval('#preview-text', node => node.textContent), /23:59 UTC/);
  await page.$eval('[name=thesis]', node => { node.value = 'Changed after exact preview.'; });
  await page.click('#seal');
  await page.waitForSelector('#result:not([hidden])');
  assert.match(await page.$eval('#manage', node => node.value), /#manage=/);
  await Promise.all([page.waitForNavigation(), page.click('#open')]);
  await page.waitForSelector('#outcome:not([hidden])');
  assert.match(await page.content(), /Depth improves after listing\./);
  assert.doesNotMatch(await page.content(), /Changed after exact preview\./);
  assert.equal(new URL(page.url()).hash, '', 'management fragment remains in browser history');
  const shareText = await page.$eval('#share', node => new URL(node.href).searchParams.get('text'));
  assert.match(shareText, /Dasha thesis receipt/);
  assert.match(shareText, new RegExp(page.url().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(shareText.includes('manage='), false);
  const require = createRequire(import.meta.url);
  let axeSrc;
  try { axeSrc = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8'); }
  catch { axeSrc = await readFile(require.resolve('@axe-core/cli/node_modules/axe-core/axe.min.js'), 'utf8'); }
  await page.addScriptTag({ content: axeSrc });
  const axe = await page.evaluate(async () => { const result = await axe.run(document); return { rules: result.passes.length + result.inapplicable.length, bad: result.violations.filter(item => ['serious', 'critical'].includes(item.impact)).map(item => item.id) }; });
  assert.ok(axe.rules > 30);
  assert.deepEqual(axe.bad, []);
  await page.type('[name=postmortem]', 'The declared invalidation fired.');
  await Promise.all([page.waitForNavigation(), page.click('#outcome button')]);
  assert.match(await page.content(), /Manager-added outcome/);
  assert.deepEqual(errors, []);
  await page.close();
  await browser.disconnect();
} finally {
  server.close();
}

console.log('Dasha receipt Worker: PASS (invite, preview, create, share, remind, report, manage, resolve, tombstone, axe)');
