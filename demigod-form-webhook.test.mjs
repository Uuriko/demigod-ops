import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicStatus } from './demigod-submissions-lib.mjs';

const OPS = path.dirname(new URL(import.meta.url).pathname);

function startWebhook(dir, preload) {
  const child = spawn(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-submissions-webhook.mjs',
  ], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_WEBHOOK_PORT: '0',
      DEMIGOD_WEBHOOK_HOST: '127.0.0.1',
    },
  });
  let buf = '';
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`webhook did not listen: ${buf}`)), 8000);
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const line = buf.split('\n').find((row) => row.includes('"port"'));
      if (!line) return;
      clearTimeout(timer);
      resolve(JSON.parse(line));
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`webhook exited ${code}: ${buf}`));
    });
  });
  return { child, ready };
}

async function postForm(port, body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${port}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

function inboxItems(dir) {
  const file = path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).items || [];
}

describe('form_submission webhook lands both onboardings', { concurrency: 1 }, () => {
  test('startup-hire and engineer-join envelopes become reviewable records', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-'));
    const preload = path.join(dir, 'no-live.mjs');
    fs.writeFileSync(preload, 'globalThis.fetch = async () => { throw new Error("live_call"); };\n');
    const { child, ready } = startWebhook(dir, preload);
    t.after(() => child.kill());
    const info = await ready;
    const stamp = Date.now();
    const submitter = `riley.chen.${stamp}@baymail.co`;
    const startup = await postForm(info.port, {
      triggerType: 'form_submission',
      payload: {
        name: 'startup-hire',
        siteId: '6a34c484dcedc18a17408187',
        data: {
          'company-name': 'Other Co',
          'contact-email': `founder.${stamp}@otherco.co`,
          'role-title': 'Founding Engineer',
          'stack-needs': 'JavaScript, activation work',
          'salary-range': '$180-220k',
          'company-stage': 'Seed',
          'submitted-by': submitter,
          'submitted-by-name': 'Riley Chen',
        },
        submittedAt: '2026-09-23T06:46:00.000Z',
        id: `subm-startup-${stamp}`,
        schema: [],
      },
    });
    const engineer = await postForm(info.port, {
      triggerType: 'form_submission',
      payload: {
        name: 'engineer-join',
        siteId: '6a34c484dcedc18a17408187',
        data: {
          'full-name': 'Mina Alvarez',
          'seeker-email': `mina.alvarez.${stamp}@baymail.co`,
          'skills-stack': 'JavaScript, activation work',
          experience: 'Led an activation rebuild',
          'sf-bay': 'yes',
          availability: 'now',
          'salary-expectation': '$180k',
          'submitted-by': submitter,
          'submitted-by-name': 'Riley Chen',
        },
        submittedAt: '2026-09-23T06:46:01.000Z',
        id: `subm-engineer-${stamp}`,
      },
    });
    const self = await postForm(info.port, {
      triggerType: 'form_submission',
      payload: {
        name: 'engineer-join',
        data: {
          'full-name': 'Casey Nguyen',
          'seeker-email': `casey.nguyen.${stamp}@baymail.co`,
          'skills-stack': 'Go, billing work',
          'salary-expectation': '$160k',
          'submitted-by': `casey.nguyen.${stamp}@baymail.co`,
          'submitted-by-name': 'Casey Nguyen',
        },
      },
    });
    assert.equal(startup.status, 200);
    assert.equal(startup.json.ok, true);
    assert.equal(startup.json.form, 'startup-hire');
    assert.equal(startup.json.status, 'new');
    assert.equal(startup.json.featured, false);
    assert.equal(startup.json.reviewRequired, true);
    assert.equal(engineer.status, 200);
    assert.equal(engineer.json.form, 'engineer-join');
    assert.equal(engineer.json.status, 'new');
    assert.equal(engineer.json.featured, false);
    const items = inboxItems(dir);
    const role = items.find((row) => row.id === startup.json.id);
    const talent = items.find((row) => row.id === engineer.json.id);
    const selfRow = items.find((row) => row.id === self.json.id);
    assert.equal(role.raw['salary-range'], '$180-220k');
    assert.equal(role.raw['company-name'], 'Other Co');
    assert.equal(role.raw['submitted-by'], submitter);
    assert.equal(talent.raw['salary-expectation'], '$180k');
    assert.equal(talent.raw['skills-stack'], 'JavaScript, activation work');
    assert.equal(talent.attribution.attached, true);
    assert.equal(talent.attribution.subjectKind, 'talent');
    assert.equal(talent.attribution.submitterEmail, submitter);
    assert.equal(selfRow.attribution.attached, false);
    assert.equal(selfRow.attribution.reason, 'self_referral_forbidden');
    assert.equal(selfRow.status, 'new');
    const roleStatus = publicStatus(role);
    const talentStatus = publicStatus(talent);
    assert.equal(roleStatus.steps.includes('Human review'), true);
    assert.equal(talentStatus.steps.includes('Human review'), true);
    assert.equal(JSON.stringify(roleStatus).includes(`founder.${stamp}@`), false);
    console.log(JSON.stringify({
      order: 'both-forms',
      startupForm: startup.json.form,
      startupStatus: startup.json.status,
      engineerForm: engineer.json.form,
      engineerStatus: engineer.json.status,
      startupReview: roleStatus.steps.includes('Human review'),
      engineerReview: talentStatus.steps.includes('Human review'),
      attribution: true,
      selfReferralAttached: false,
      featured: false,
    }));
  });

  test('schema element ids are mapped before the record is stored', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-schema-'));
    const preload = path.join(dir, 'no-live.mjs');
    fs.writeFileSync(preload, 'globalThis.fetch = async () => { throw new Error("live_call"); };\n');
    const { child, ready } = startWebhook(dir, preload);
    t.after(() => child.kill());
    const info = await ready;
    const stamp = Date.now();
    const elementId = '285042f7-d554-dc7f-102c-aa10d6a2d2c4';
    const posted = await postForm(info.port, {
      triggerType: 'form_submission',
      payload: {
        name: 'engineer-join',
        siteId: '6a34c484dcedc18a17408187',
        data: {
          [elementId]: 'JavaScript, activation work',
          'full-name': 'Noah Patel',
          'seeker-email': `noah.patel.${stamp}@baymail.co`,
          'salary-expectation': '$180k',
        },
        schema: [{
          fieldName: 'skills-stack',
          fieldType: 'FormTextInput',
          fieldElementId: elementId,
        }],
      },
    });
    assert.equal(posted.status, 200, JSON.stringify(posted.json));
    assert.equal(posted.json.status, 'new');
    const row = inboxItems(dir).find((item) => item.id === posted.json.id);
    assert.equal(row.raw['skills-stack'], 'JavaScript, activation work');
    assert.equal(row.raw[elementId], undefined);
    assert.equal(row.raw['salary-expectation'], '$180k');
    console.log(JSON.stringify({
      order: 'schema-map',
      form: posted.json.form,
      status: posted.json.status,
      skillsMapped: true,
      elementIdStored: false,
    }));
  });

  test('a non-form trigger is ignored and a missing form name can come from the header', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-ignore-'));
    const preload = path.join(dir, 'no-live.mjs');
    fs.writeFileSync(preload, 'globalThis.fetch = async () => { throw new Error("live_call"); };\n');
    const { child, ready } = startWebhook(dir, preload);
    t.after(() => child.kill());
    const info = await ready;
    const ignored = await postForm(info.port, {
      triggerType: 'site_publish',
      payload: {
        name: 'startup-hire',
        data: {
          'company-name': 'Other Co',
          'stack-needs': 'JavaScript, activation work',
          'salary-range': '$180-220k',
        },
      },
    });
    assert.equal(ignored.status, 202);
    assert.equal(ignored.json.ignored, true);
    assert.equal(ignored.json.ingested, false);
    assert.equal(inboxItems(dir).length, 0);
    const stamp = Date.now();
    const headed = await postForm(info.port, {
      triggerType: 'form_submission',
      payload: {
        name: '',
        data: {
          'full-name': 'Ada Okonkwo',
          'seeker-email': `ada.okonkwo.${stamp}@baymail.co`,
          'skills-stack': 'Go, billing work',
          'salary-expectation': '$160k',
        },
      },
    }, { 'X-Webflow-Form': 'engineer-join' });
    assert.equal(headed.status, 200, JSON.stringify(headed.json));
    assert.equal(headed.json.form, 'engineer-join');
    assert.equal(headed.json.status, 'new');
    const row = inboxItems(dir).find((item) => item.id === headed.json.id);
    assert.equal(row.form, 'engineer-join');
    assert.equal(row.raw['salary-expectation'], '$160k');
    console.log(JSON.stringify({
      order: 'ignore-and-header',
      ignored: true,
      ingested: false,
      headerForm: headed.json.form,
      headerStatus: headed.json.status,
    }));
  });
});
