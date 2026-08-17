#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeTouch } from './demigod-candidate-touch.mjs';
import { addCandidate, openBatch } from './demigod-pilot-batch.mjs';
import { createPacket, createNote } from './demigod-role-packet.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const serverSource = fs.readFileSync(path.join(root, 'demigod-die-web.mjs'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'demigod-die-web-ui.html'), 'utf8');
const webService = fs.readFileSync(path.join(root, 'systemd-user/demigod-die-web.service'), 'utf8');
const tunnelService = fs.readFileSync(path.join(root, 'systemd-user/demigod-die-tunnel.service'), 'utf8');

for (const forbidden of ['child_process', 'demigod-agent-dashboard', 'ship', 'publish', 'wallet', 'outreach', 'dg-bus']) {
  assert.doesNotMatch(serverSource, new RegExp(`from ['\"][^'\"]*${forbidden}`, 'i'));
}
assert.doesNotMatch(ui, /innerHTML|outerHTML|document\.write/);
assert.match(ui, /<main id="content"/);
assert.match(ui, /aria-label="Primary"/);
assert.match(ui, /'aria-label':'Search companies'/);
assert.match(ui, /Candidate channels/);
assert.match(ui, /Suppressed:/);
assert.match(ui, /Shortlist/);
assert.match(ui, /Unaccepted/);
assert.match(ui, /checkpoints/);
assert.match(ui, /rediscovery/);
assert.match(ui, /id="navActivity"/);
assert.match(ui, /No workflow receipts yet/);
assert.match(ui, /Sign out/);
assert.match(ui, /modeLabel/);
assert.match(ui, /Role Mission/);
assert.match(ui, /p\.hiring\.shape\?\.why\|\|p\.hiring\.shape\?\.shape/);
assert.match(ui, /row\.openRoles==null\?'Count unknown'/);
{
  const isoSrc = ui.match(/function isoFromLocal\(value\)\{[^}]+\}/)?.[0];
  assert.ok(isoSrc, 'isoFromLocal present');
  const isoFromLocal = new Function(`${isoSrc}; return isoFromLocal;`)();
  assert.equal(isoFromLocal(''), '');
  assert.equal(isoFromLocal('not-a-date'), '');
  assert.match(isoFromLocal('2026-08-19T10:00'), /^2026-08-19T/);
}
assert.match(ui, /if\(current\)current.setAttribute\('aria-current','page'\)/);
assert.match(ui, /Apply to mission/);
assert.match(ui, /Do next/);
assert.match(ui, /Book slot/);
assert.match(ui, /Record debrief/);
assert.match(ui, /Save offer terms/);
assert.match(ui, /Submit scorecard/);
assert.match(ui, /Download \.ics/);
assert.match(ui, /navMissions/);
assert.match(ui, /navCalendar/);
assert.match(ui, /Count unknown/);
assert.match(ui, /Count current/);
assert.match(ui, /Research evidence/);
assert.match(ui, /Known unknowns/);
assert.match(ui, /Hiring journal/);
assert.match(ui, /Peers/);
const inlineScript = ui.match(/<script nonce="__NONCE__">([\s\S]+)<\/script>/)?.[1];
assert.ok(inlineScript);
new Function(inlineScript);
assert.match(serverSource, /mode: 'local_read_only'/);
assert.match(serverSource, /mode: 'gated_public'/);
assert.match(serverSource, /authenticated: false/);
assert.match(serverSource, /DEMIGOD_DIE_GATE_SECRET/);
assert.match(serverSource, /Cf-Access-Jwt-Assertion|cf-access-jwt-assertion/);
assert.doesNotMatch(serverSource, /Cf-Access-Authenticated-User-Email/i);
assert.match(serverSource, /frame-ancestors 'none'/);
assert.doesNotMatch(serverSource, /unsafe-inline/);
assert.match(webService, /EnvironmentFile=-%h\/\.config\/demigod\/die-web\.env/);
assert.match(webService, /DEMIGOD_DIE_STORE=%h\/\.local\/share\/demigod\/die-missions.sqlite/);
assert.match(tunnelService, /ConditionPathExists=%h\/\.config\/demigod\/die-tunnel-ready/);
assert.match(tunnelService, /wrangler@4\.120\.1 tunnel run demigod-die/);
const quickTunnel = fs.readFileSync(path.join(root, 'systemd-user/demigod-die-quick-tunnel.service'), 'utf8');
const namedTunnel = fs.readFileSync(path.join(root, 'systemd-user/demigod-die-named-tunnel.service'), 'utf8');
assert.match(quickTunnel, /ConditionPathExists=%h\/\.config\/demigod\/die-gate-ready/);
assert.match(quickTunnel, /demigod-die-quick-tunnel\.mjs/);
assert.match(namedTunnel, /die-tunnel\.token/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'demigod-die-quick-tunnel.mjs'), 'utf8'), /child_process.*eval/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-die-web-'));
const packet = createPacket({
  roleId: 'role-pilot',
  title: 'Founding Engineer',
  companyId: 'yc:acme',
  outcome90d: 'Ship a reliable customer pilot with a measured onboarding loop within 90 days.',
  demo: true,
});
const note = createNote({
  roleId: packet.roleId,
  candId: 'cand-demo',
  reviewedBy: 'reviewer',
  ratings: packet.mustHaves.map((row) => ({
    mustHaveId: row.id,
    rating: 'yes',
    evidence: `Specific fixture evidence for ${row.label}; contact cand@example.com must stay private.`,
  })),
});
fs.writeFileSync(path.join(temp, 'DEMIGOD-ROLE-PACKETS.json'), JSON.stringify({
  schema: 'demigod.role-packets-store/1', packets: { [packet.roleId]: packet },
}));
fs.writeFileSync(path.join(temp, 'DEMIGOD-REVIEW-NOTES.json'), JSON.stringify({
  schema: 'demigod.review-notes-store/1', notes: { [`${packet.roleId}|${note.candId}`]: note },
}));
fs.writeFileSync(path.join(temp, 'DEMIGOD-SF-STARTUP-MAP.json'), JSON.stringify({
  generatedAt: '2026-08-16T00:00:00.000Z',
  companies: [{
    id: 'yc:acme', name: 'Acme Systems', website: 'https://acme.example/', source: 'fixture',
    sourceUrl: 'https://example.test/acme', hiring: 'yes', openRoles: 1, openRolesAt: '2026-08-16',
    atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/acme', roleMix: { engineering: 1 },
  }],
}));
fs.writeFileSync(path.join(temp, 'DEMIGOD-ROLE-LEDGER.json'), JSON.stringify({
  updatedAt: '2026-08-16', roles: {},
}));
fs.writeFileSync(path.join(temp, 'DEMIGOD-CANDIDATE-EVIDENCE.json'), JSON.stringify({
  schema: 'demigod.candidate-evidence-corpus/1', evidence: [], withdrawals: [],
}));
const batch = addCandidate(openBatch(packet.roleId), 'cand-demo', 'Fixture evidence matches the role criteria');
fs.writeFileSync(path.join(temp, 'DEMIGOD-PILOT-BATCHES.json'), JSON.stringify({
  schema: 'demigod.pilot-batches-store/1', batches: { [packet.roleId]: batch },
}));
fs.writeFileSync(path.join(temp, 'DEMIGOD-CANDIDATE-TOUCHES.json'), JSON.stringify({
  schema: 'demigod.candidate-touches-store/1',
  touches: [makeTouch({ candId: 'cand-demo', channel: 'review', roleId: packet.roleId, note: 'Fixture review' })],
}));

const socket = net.createServer();
let port = null;
try {
  await new Promise((resolve, reject) => socket.once('error', reject).listen(0, '127.0.0.1', resolve));
  port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
} catch (error) {
  if (error.code !== 'EPERM') throw error;
}

if (port !== null) {
  const child = spawn(process.execPath, ['demigod-die-web.mjs', '--port', String(port)], {
    cwd: root,
    env: {
      ...process.env,
      DEMIGOD_ROOT: temp,
      DEMIGOD_BUSY: temp,
      DEMIGOD_DIE_PUBLIC_HOST: 'app.trydemigod.com',
      DEMIGOD_DIE_TRUST_ACCESS_PROXY: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const base = `http://127.0.0.1:${port}`;
  const request = (pathname, { method = 'GET', host = `127.0.0.1:${port}`, headers = {} } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method, headers: { ...headers, Host: host } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.once('error', reject);
    req.end();
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100 && !ready; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      ready = await request('/healthz').then((res) => res.status === 200).catch(() => false);
    }
    assert.equal(ready, true, 'DIE web server did not start');

    const localLogin = await request('/login');
    assert.equal(localLogin.status, 303);
    assert.equal(localLogin.headers.location, '/roles');

    const page = await request('/roles');
    assert.equal(page.status, 200);
    assert.match(page.headers['content-security-policy'], /script-src 'nonce-/);
    assert.doesNotMatch(page.headers['content-security-policy'], /unsafe-inline/);
    assert.doesNotMatch(page.body, /__NONCE__/);

    const session = await request('/api/v1/session');
    const sessionBody = JSON.parse(session.body);
    assert.equal(sessionBody.schema, 'demigod.die-session/1');
    assert.equal(sessionBody.mode, 'local_read_only');
    assert.equal(sessionBody.modeLabel, 'Local');
    assert.equal(sessionBody.mutations, true);
    assert.equal('needsLogin' in sessionBody, false);
    assert.equal(sessionBody.access.tunnelReady, false);
    assert.match(sessionBody.access.reason, /Access is not enabled/);
    assert.equal((await request('/api/v1/session', { host: 'app.trydemigod.com' })).status, 403);
    const hosted = await request('/api/v1/session', {
      host: 'app.trydemigod.com', headers: { 'Cf-Access-Jwt-Assertion': 'eyJhbGciOiJSUzI1NiJ9.eyJhdWQiOlsiZGllIl19.signature' },
    });
    const hostedBody = JSON.parse(hosted.body);
    assert.equal(hostedBody.mode, 'hosted_read_only');
    assert.equal(hostedBody.modeLabel, 'Private');
    assert.equal(hostedBody.authenticated, true);
    assert.equal(hostedBody.mutations, true);
    assert.equal(hostedBody.access.publicHost, 'app.trydemigod.com');

    const roles = JSON.parse((await request('/api/v1/roles')).body);
    assert.equal(roles.total, 1);
    assert.equal(roles.rows[0].demo, true);
    assert.equal(roles.rows[0].state, 'demo_only');
    assert.deepEqual(roles.rows[0].checkpoints.map((row) => [row.id, row.ok]), [
      ['accepted_role', false], ['calibrated_packet', false], ['company_context', true],
    ]);
    assert.deepEqual(roles.rows[0].channelCounts, {
      inbound: 0, referrals: 0, shortlist: 1, rediscovery: 1, priorPairs: 0, reviewed: 1,
    });
    const workspace = JSON.parse((await request('/api/v1/roles/role-pilot/workspace')).body);
    assert.equal(workspace.schema, 'demigod.role-workspace/1');
    assert.equal(workspace.state, 'demo_only');
    assert.equal(workspace.authority.externalAction, 'none');
    assert.equal(workspace.evidenceReview.questions.length, 3);
    assert.equal(workspace.candidateChannels.shortlist.total, 1);
    assert.equal(workspace.candidateChannels.shortlist.candidates[0].candId, 'cand-demo');
    assert.equal(workspace.candidateChannels.rediscovery.candidates[0].candId, 'cand-demo');
    assert.equal(workspace.candidateChannels.rediscovery.candidates[0].suppression[0].kind, 'recent_contact');
    assert.equal('notes' in workspace, false);
    assert.doesNotMatch(JSON.stringify(workspace), /cand@example\.com/);

    const companies = JSON.parse((await request('/api/v1/companies?q=acme&limit=1')).body);
    assert.equal(companies.total, 1);
    assert.equal(companies.rows[0].id, 'yc:acme');
    const noMatch = JSON.parse((await request('/api/v1/companies?q=definitely-not-acme')).body);
    assert.equal(noMatch.total, 0);
    const company = JSON.parse((await request('/api/v1/companies/yc%3Aacme')).body);
    assert.equal(company.schema, 'demigod.company-packet/1');
    assert.equal(company.companyId, 'yc:acme');
    assert.ok(company.observation);
    assert.equal(typeof company.observation.presentation?.countIsCurrent, 'boolean');
    assert.ok(Array.isArray(company.evidence));
    assert.ok(Array.isArray(company.unknowns));
    assert.ok(Array.isArray(company.journal));
    assert.ok(Array.isArray(company.peers));
    assert.equal((await request('/api/v1/companies/unknown')).status, 404);
    assert.equal((await request(`/api/v1/companies?q=${'x'.repeat(121)}`)).status, 400);
    const activity = JSON.parse((await request('/api/v1/activity?entity=role-pilot&limit=1&cursor=0')).body);
    assert.deepEqual(activity, {
      schema: 'demigod.die-activity-list/1', entity: 'role-pilot', limit: 1, cursor: 0,
      nextCursor: null, total: 0, rows: [], state: 'no_hosted_mutations',
      policy: 'Hosted workflow receipts only. Local operations, agent, ship, and machine activity are excluded.',
    });
    assert.equal((await request(`/api/v1/activity?entity=${'x'.repeat(161)}`)).status, 400);
    assert.equal((await request('/api/v1/activity?limit=51')).status, 400);
    assert.equal((await request('/activity')).status, 200);
    const demoMission = JSON.parse((await request('/api/v1/roles/role-pilot/mission')).body);
    assert.equal(demoMission.state, 'demo_only');
    assert.equal(demoMission.mission, null);

    const livePacket = createPacket({
      roleId: 'role-live',
      title: 'Founding product engineer',
      companyId: 'yc:acme',
      outcome90d: 'Ship the first paid loop with one founder-reviewed hire on the mission.',
      demo: false,
    });
    const store = JSON.parse(fs.readFileSync(path.join(temp, 'DEMIGOD-ROLE-PACKETS.json'), 'utf8'));
    store.packets[livePacket.roleId] = livePacket;
    fs.writeFileSync(path.join(temp, 'DEMIGOD-ROLE-PACKETS.json'), JSON.stringify(store));
    const opened = JSON.parse((await request('/api/v1/roles/role-live/mission')).body);
    assert.equal(opened.schema, 'demigod.die-role-mission/1');
    assert.ok(opened.surfaces);
    assert.equal(opened.surfaces.nextAction.externalAction, false);
    const applyRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port, path: '/api/v1/roles/role-live/mission/actions',
        method: 'POST', headers: { Host: `127.0.0.1:${port}`, 'Content-Type': 'application/json' },
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.once('error', reject);
      req.end(JSON.stringify({ action: 'apply', candId: 'cand-ada' }));
    });
    const emptyApply = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port, path: '/api/v1/roles/role-live/mission/actions',
        method: 'POST', headers: { Host: `127.0.0.1:${port}`, 'Content-Type': 'application/json' },
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.once('error', reject);
      req.end(JSON.stringify({ action: 'apply', candId: '' }));
    });
    assert.equal(emptyApply.status, 400);
    assert.match(emptyApply.body, /cand_id/);

    assert.equal(applyRes.status, 200);
    const appliedDoc = JSON.parse(applyRes.body);
    assert.equal(appliedDoc.surfaces.ats.applications[0].candId, 'cand-ada');
    const blockedAdvance = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port, path: '/api/v1/roles/role-live/mission/actions',
        method: 'POST', headers: { Host: `127.0.0.1:${port}`, 'Content-Type': 'application/json' },
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.once('error', reject);
      req.end(JSON.stringify({ action: 'advance', candId: 'cand-ada', to: 'screen' }));
    });
    assert.equal(blockedAdvance.status, 400);
    assert.match(blockedAdvance.body, /advance_scorecard_required/);
    const scored = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port, path: '/api/v1/roles/role-live/mission/actions',
        method: 'POST', headers: { Host: `127.0.0.1:${port}`, 'Content-Type': 'application/json' },
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.once('error', reject);
      req.end(JSON.stringify({
        action: 'scorecard',
        candId: 'cand-ada',
        ratings: livePacket.mustHaves.map((row) => ({
          mustHaveId: row.id, rating: 'yes', evidence: 'Shipped a concrete production loop at a prior company.',
        })),
      }));
    });
    assert.equal(scored.status, 200);
    assert.equal(JSON.parse((await request('/api/v1/missions')).body).total >= 1, true);
    const liveActivity = JSON.parse((await request('/api/v1/activity?entity=role-live&limit=5')).body);
    assert.ok(liveActivity.rows.some((row) => row.action === 'apply' || row.action === 'open'));

    const mutation = await request('/api/v1/roles', { method: 'POST' });
    assert.equal(mutation.status, 405);
    assert.equal(mutation.headers.allow, 'GET, HEAD, POST');
    assert.equal((await request('/healthz', { host: 'evil.example' })).status, 403);
  } finally {
    child.kill('SIGTERM');
  }
}

const invalidConfig = spawn(process.execPath, ['demigod-die-web.mjs', '--port', '9881'], {
  cwd: root,
  env: { ...process.env, DEMIGOD_DIE_PUBLIC_HOST: 'app.trydemigod.com', DEMIGOD_DIE_TRUST_ACCESS_PROXY: '0' },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let invalidConfigError = '';
invalidConfig.stderr.on('data', (chunk) => { invalidConfigError += chunk; });
const invalidConfigExit = await new Promise((resolve) => invalidConfig.once('exit', resolve));
assert.notEqual(invalidConfigExit, 0);
assert.match(invalidConfigError, /invalid_hosted_configuration/);

const invalidQuick = spawn(process.execPath, ['demigod-die-web.mjs', '--port', '9882'], {
  cwd: root,
  env: { ...process.env, DEMIGOD_DIE_ALLOW_TRYCLOUDFLARE: '1' },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let invalidQuickError = '';
invalidQuick.stderr.on('data', (chunk) => { invalidQuickError += chunk; });
const invalidQuickExit = await new Promise((resolve) => invalidQuick.once('exit', resolve));
assert.notEqual(invalidQuickExit, 0);
assert.match(invalidQuickError, /invalid_hosted_configuration/);

if (port !== null) {
  const gatePort = port + 1;
  const gateSecret = 'test-gate-secret-xx';
  const gateChild = spawn(process.execPath, ['demigod-die-web.mjs', '--port', String(gatePort)], {
    cwd: root,
    env: {
      ...process.env,
      DEMIGOD_ROOT: temp,
      DEMIGOD_BUSY: temp,
      DEMIGOD_DIE_GATE_SECRET: gateSecret,
      DEMIGOD_DIE_ALLOW_TRYCLOUDFLARE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const gateRequest = (pathname, { method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port: gatePort, path: pathname, method,
      headers: { Host: 'die-test.trycloudflare.com', ...headers },
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: text }));
    });
    req.once('error', reject);
    if (body) req.write(body);
    req.end();
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100 && !ready; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      ready = await gateRequest('/healthz').then((res) => res.status === 200).catch(() => false);
    }
    assert.equal(ready, true, 'gated DIE web server did not start');
    const locked = await gateRequest('/roles');
    assert.equal(locked.status, 200);
    assert.match(locked.body, /Private desk/);
    assert.match(locked.headers['x-robots-tag'] || '', /noindex/);
    assert.equal((await gateRequest('/api/v1/roles')).status, 401);
    assert.equal((await gateRequest('/robots.txt')).status, 200);
    assert.equal((await gateRequest('/favicon.ico')).status, 204);
    const cross = await gateRequest('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://evil.example' },
      body: `password=${gateSecret}`,
    });
    assert.equal(cross.status, 403);
    const denied = await gateRequest('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'null' },
      body: 'password=wrong-password-xx',
    });
    assert.equal(denied.status, 401);
    const opened = await gateRequest('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://die-test.trycloudflare.com' },
      body: `password=${gateSecret}`,
    });
    assert.equal(opened.status, 303);
    const cookie = String(opened.headers['set-cookie'] || '').split(';')[0];
    assert.match(cookie, /^die_gate=/);
    const session = JSON.parse((await gateRequest('/api/v1/session', { headers: { Cookie: cookie } })).body);
    assert.equal(session.mode, 'gated_public');
    assert.equal(session.modeLabel, 'Private');
    assert.equal(session.authenticated, true);
    assert.equal(session.mutations, true);
    assert.equal(session.access.gateReady, true);
    assert.equal(session.access.reason, null);
    assert.equal('needsLogin' in session, false);
    assert.equal((await gateRequest('/api/v1/roles', { headers: { Cookie: cookie } })).status, 200);
    const deep = await gateRequest('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://die-test.trycloudflare.com' },
      body: `password=${gateSecret}&next=/companies`,
    });
    assert.equal(deep.status, 303);
    assert.equal(deep.headers.location, '/companies');
    const loggedOut = await gateRequest('/logout', { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(loggedOut.status, 303);
    assert.equal(loggedOut.headers.location, '/login');
    assert.equal((await gateRequest('/healthz', {
      headers: { Host: 'evil.example' },
    })).status, 403);

    /* The one mutating route, asked the authorization question in gated mode. canMutate() allows a
       write when the request is authenticated, so in this mode a cookie is the whole difference
       between reading and writing, and nothing was asserting that. The cookie is SameSite=Lax, which
       is what stops a cross-site form POST from carrying it — that is the CSRF defence, and it is
       only a defence if the cookie-less request is actually refused. */
    const mutate = (headers) => gateRequest('/api/v1/roles/role-live/mission/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ action: 'apply', candId: 'cand-gate' }),
    });
    /* The gate refuses before canMutate is reached, so this is a 401 rather than a 403. Assert the
       property — the write does not happen — not the number, or the test pins a mechanism instead
       of a guarantee. */
    const refused = (res) => res.status === 401 || res.status === 403;
    assert.ok(refused(await mutate({})), 'no cookie, no write');
    assert.match((await mutate({})).body, /mutation_forbidden|login_required/);
    assert.ok(refused(await mutate({ Cookie: 'die_gate=forged-value' })), 'a forged cookie is not a session');
    const withSession = await gateRequest('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://die-test.trycloudflare.com' },
      body: `password=${gateSecret}`,
    });
    const liveCookie = String(withSession.headers['set-cookie'] || '').split(';')[0];
    assert.match(String(withSession.headers['set-cookie'] || ''), /SameSite=Lax/,
      'the gate cookie must stay SameSite=Lax — it is what refuses a cross-site write');
    assert.notEqual((await mutate({ Cookie: liveCookie })).status, 403, 'a real session may write');
  } finally {
    gateChild.kill('SIGTERM');
  }
}

fs.rmSync(temp, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, selftest: 'demigod-die-web' }));
