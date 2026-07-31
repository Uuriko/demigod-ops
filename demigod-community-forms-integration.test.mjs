import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const freePort = () => new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

test('community forms validate intent and preserve private startup management', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-community-forms-'));
  const store = path.join(dir, 'events.json');
  const port = await freePort();
  const child = spawn(process.execPath, ['demigod-events-app.mjs'], {
    cwd: '/home/potter',
    env: {
      ...process.env,
      DEMIGOD_EVENTS_STORE: store,
      DEMIGOD_EVENTS_PORT: String(port),
    },
    stdio: 'ignore',
  });
  t.after(() => {
    child.kill('SIGTERM');
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}/api/events-bot`;
  for (let attempts = 0; attempts < 50; attempts++) {
    try {
      if ((await fetch(`${base}/health`)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const post = async (route, body, headers = {}) => {
    const response = await fetch(base + route, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    return { response, body: await response.json().catch(() => null) };
  };

  const invalidEvent = await post('/event-submission', {
    title: 'Test event', organizerName: 'Tester', organizerEmail: 'test@example.com',
    startsAt: '2026-08-01T19:00:00-07:00', format: 'in-person', audience: 'SF founders',
    details: 'A focused working session.', destination: 'demigod',
  });
  assert.equal(invalidEvent.response.status, 400);
  assert.match(invalidEvent.body.error, /venue required/);

  const incompleteStartup = await post('/startup-submission', {
    name: 'Incomplete Startup', submitterName: 'Tester', submitterEmail: 'test@example.com',
  });
  assert.equal(incompleteStartup.response.status, 400);
  assert.match(incompleteStartup.body.error, /website, neighborhood, description/);

  const created = await post('/startup-submission', {
    name: 'Test Startup', website: 'https://example.com', neighborhood: 'San Francisco',
    description: 'Original', hiring: 'unknown', submitterName: 'Tester', submitterEmail: 'test@example.com',
  });
  assert.equal(created.response.status, 201);
  assert.match(created.body.startup.id, /^startup_/);
  assert.ok(created.body.manageToken);
  assert.equal(created.body.startup.manageTokenHash, undefined);

  const credential = { id: created.body.startup.id, manageToken: created.body.manageToken };
  const read = await post('/startup-submission/read', credential);
  assert.equal(read.response.status, 200);
  const managed = await post('/startup-submission/manage', {
    ...credential,
    patch: { name: 'Test Startup', website: 'https://example.com', neighborhood: 'San Francisco', description: 'Updated', hiring: 'yes' },
  });
  assert.equal(managed.response.status, 200);
  assert.equal(managed.body.startup.description, 'Updated');
  assert.equal(managed.body.startup.status, 'submitted');
  const withdrawn = await post('/startup-submission/withdraw', credential);
  assert.equal(withdrawn.response.status, 200);
  assert.equal(withdrawn.body.startup.status, 'withdrawn');
  assert.equal((await post('/startup-submission/read', { ...credential, manageToken: 'wrong' })).response.status, 404);

});
