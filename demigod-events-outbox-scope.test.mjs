import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** CLI status paints seat/count numbers when stdout is a TTY; strip for assert.match. */
function stripAnsi(s) {
  return String(s).replace(/\u001b\[[0-9;]*m/g, '');
}

function outboxStatus(store, extraEnv = {}) {
  return stripAnsi(execFileSync('bin/dg-events-outbox', ['status'], {
    cwd: import.meta.dirname,
    env: { ...process.env, DEMIGOD_ROOT: import.meta.dirname, DEMIGOD_EVENTS_STORE: store, ...extraEnv },
    encoding: 'utf8',
  }));
}

test('events outbox status scopes drafts to the active night', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-outbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'events.json');
  fs.writeFileSync(store, JSON.stringify({
    activeEvent: { id: 'active', seats: 12, dateWindows: ['Thu eve', 'Fri eve'] },
    outreach: [
      { id: 'active-draft', eventId: 'active', status: 'queued', kind: 'venue' },
      { id: 'legacy-unscoped', status: 'queued', kind: 'sponsor' },
      { id: 'other-draft', eventId: 'other', status: 'queued', kind: 'volunteer' },
    ],
  }));
  const output = outboxStatus(store);
  assert.match(output, /outreach queued 1 drafted 0/);
  assert.match(output, /target 12 seats · windows Thu eve, Fri eve/);
  assert.match(output, /schedule blocker record a future timezone-aware start before RSVP/);
  assert.match(output, /RSVPs 0 confirmed · 12 seats left/);
  assert.doesNotMatch(output, /0 over capacity/);
  assert.match(output, /suggested venue lead .+ · .+ · capacity \d+ · cost .+/);
});

test('events outbox status hides historical drafts between nights', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-outbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'events.json');
  fs.writeFileSync(store, JSON.stringify({
    activeEvent: null,
    outreach: [{ id: 'old-draft', eventId: 'old', status: 'queued', kind: 'venue' }],
  }));
  const output = outboxStatus(store);
  assert.match(output, /active event none · none/);
  assert.doesNotMatch(output, /resource gaps|outreach queued|old-draft/);
});

test('events outbox separates internal staging mail from external contact failures', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-outbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'events.json');
  fs.writeFileSync(store, JSON.stringify({
    activeEvent: { id: 'active' },
    outreach: [{ id: 'draft', eventId: 'active', status: 'queued', kind: 'venue', toEmail: 'potter@trydemigod.com' }],
  }));
  const output = outboxStatus(store);
  assert.match(output, /internal ops 1 invalid contact 0/);
  assert.match(output, /outreach blocker replace 1 internal ops contacts with verified external contacts/);
  assert.match(output, /draft draft venue · internal ops/);
  assert.doesNotMatch(output, /potter@trydemigod\.com/);
});

test('events outbox status never prints external contact or draft contents', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-outbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'events.json');
  fs.writeFileSync(store, JSON.stringify({
    activeEvent: { id: 'active' },
    outreach: [{ id: 'draft', eventId: 'active', status: 'queued', kind: 'volunteer', toEmail: 'host@venue.com', subject: 'Private subject', body: 'Volunteer needed for door and setup; draft queue only — no auto-send.' }],
  }));
  const output = outboxStatus(store);
  assert.match(output, /draft draft volunteer · external-ready/);
  assert.doesNotMatch(output, /host@venue\.com|Private subject|Volunteer needed/);
});

test('events outbox bare default is status-safe; show is explicit private drain', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-outbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'events.json');
  fs.writeFileSync(store, JSON.stringify({
    activeEvent: { id: 'active' },
    outreach: [{ id: 'draft', eventId: 'active', status: 'queued', kind: 'volunteer', toEmail: 'host@venue.com', subject: 'Private subject', body: 'Volunteer needed for door and setup; draft queue only — no auto-send.' }],
  }));
  const env = { ...process.env, DEMIGOD_ROOT: import.meta.dirname, DEMIGOD_EVENTS_STORE: store };
  const bare = stripAnsi(execFileSync('bin/dg-events-outbox', [], { cwd: import.meta.dirname, env, encoding: 'utf8' }));
  assert.match(bare, /draft draft volunteer · external-ready/);
  assert.doesNotMatch(bare, /host@venue\.com|Private subject|Volunteer needed|SUBJ:/);
  const show = stripAnsi(execFileSync('bin/dg-events-outbox', ['show'], { cwd: import.meta.dirname, env, encoding: 'utf8' }));
  assert.match(show, /host@venue\.com/);
  assert.match(show, /SUBJ: Private subject/);
  assert.match(show, /Volunteer needed/);
});

test('events outbox warns when the selected venue is below the seat target', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-outbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'events.json');
  fs.writeFileSync(store, JSON.stringify({
    activeEvent: { id: 'active', seats: 12, venue: { name: 'Tiny room', capacity: 8 } },
  }));
  const output = outboxStatus(store);
  assert.match(output, /venue capacity blocker 8 seats for 12 target/);
  assert.match(output, /resource gaps select a venue that fits the seat target/);
});

test('events outbox falls back to attested legacy confirmations only without a canonical RSVP list', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-outbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'events.json');
  fs.writeFileSync(store, JSON.stringify({
    activeEvent: { id: 'active', seats: 12, outcomes: { confirmed: 7 } },
  }));
  const env = { ...process.env, DEMIGOD_ROOT: import.meta.dirname, DEMIGOD_EVENTS_STORE: store };
  assert.match(stripAnsi(execFileSync('bin/dg-events-outbox', ['status'], { cwd: import.meta.dirname, env, encoding: 'utf8' })), /RSVPs 7 confirmed/);

  fs.writeFileSync(store, JSON.stringify({
    activeEvent: { id: 'active', seats: 12, outcomes: { confirmed: 7 } },
    rsvps: [],
  }));
  assert.match(stripAnsi(execFileSync('bin/dg-events-outbox', ['status'], { cwd: import.meta.dirname, env, encoding: 'utf8' })), /RSVPs 0 confirmed/);
});

test('events outbox reports only the over-capacity count once the target is exceeded', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-outbox-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = path.join(dir, 'events.json');
  fs.writeFileSync(store, JSON.stringify({
    activeEvent: { id: 'active', seats: 2 },
    rsvps: [1, 2, 3].map((id) => ({ id, eventId: 'active', status: 'yes' })),
  }));
  const output = outboxStatus(store);
  assert.match(output, /RSVPs 3 confirmed · 1 over capacity/);
  assert.doesNotMatch(output, /seats left/);
});
