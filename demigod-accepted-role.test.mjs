import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { classifyRole, listAcceptedRoles } from './demigod-accepted-role.mjs';

const fp = (id) => createHash('sha256').update(String(id)).digest('hex');

test('current-shaped sample board yields zero accepted roles', () => {
  const board = {
    roles: [
      { id: 'role-seed1', title: 'Product Manager', sample: true },
      { id: 'role-seed2', title: 'Founding Designer', sample: true },
      { id: 'role-seed3', title: 'Head of Growth', sample: true },
    ],
  };
  const r = listAcceptedRoles(board, { items: [] });
  assert.equal(r.counts.acceptedForDelivery, 0);
  assert.equal(r.phase2Ready, false);
  assert.equal(r.gateOpen, false);
});

test('sample:false without submission trace is not accepted', () => {
  const c = classifyRole(
    { id: 'role-x', sample: false, company: 'Acme', title: 'Eng' },
    { items: [] },
  );
  assert.equal(c.ok, false);
  assert.equal(c.why, 'no_submission_trace');
});

test('unverified free-form hash is not accepted (Codex adversarial)', () => {
  const c = classifyRole(
    {
      id: 'role-x',
      sample: false,
      company: 'Acme',
      title: 'Eng',
      sourceSubmissionHash: 'totally-fake-hash',
    },
    { items: [] },
  );
  assert.equal(c.ok, false);
  assert.equal(c.why, 'no_submission_trace');
});

test('nested raw.sample origin is refused', () => {
  const c = classifyRole(
    {
      id: 'role-x',
      sample: false,
      title: 'Eng',
      sourceSubmissionHash: fp('sub-n'),
    },
    {
      items: [
        {
          id: 'sub-n',
          featuredId: 'role-x',
          status: 'featured',
          form: 'startup-hire',
          raw: { sample: true },
          data: { 'company-name': 'Acme' },
        },
      ],
    },
  );
  assert.equal(c.ok, false);
  assert.equal(c.why, 'origin_sample');
});

test('canonical mint shape: company from inbox, no board company', () => {
  const board = {
    roles: [
      {
        id: 'role-real-1',
        sample: false,
        title: 'Founding Engineer',
        sourceSubmissionHash: fp('sub-1'),
      },
    ],
  };
  const inbox = {
    items: [
      {
        id: 'sub-1',
        featuredId: 'role-real-1',
        status: 'featured',
        form: 'startup-hire',
        data: { 'company-name': 'Acme Labs' },
      },
    ],
  };
  const r = listAcceptedRoles(board, inbox);
  assert.equal(r.counts.acceptedForDelivery, 1);
  assert.equal(r.acceptedRoles[0].company, 'Acme Labs');
  assert.equal(r.acceptedRoles[0].companySource, 'inbox');
  assert.equal(r.hasAcceptedReceipts, true);
  assert.equal(r.phase2Ready, false);
  assert.equal(r.gateOpen, false);
});

test('featured origin marked sample is refused', () => {
  const c = classifyRole(
    {
      id: 'role-real-2',
      sample: false,
      title: 'Eng',
      sourceSubmissionHash: fp('s'),
    },
    {
      items: [
        {
          id: 's',
          featuredId: 'role-real-2',
          sample: true,
          status: 'featured',
          data: { 'company-name': 'Acme' },
        },
      ],
    },
  );
  assert.equal(c.ok, false);
  assert.equal(c.why, 'origin_sample');
});

test('status new is not featured', () => {
  const c = classifyRole(
    {
      id: 'role-new',
      sample: false,
      title: 'Eng',
      sourceSubmissionHash: fp('s3'),
    },
    {
      items: [
        {
          id: 's3',
          featuredId: 'role-new',
          status: 'new',
          form: 'startup-hire',
          data: { 'company-name': 'Acme' },
        },
      ],
    },
  );
  assert.equal(c.ok, false);
  assert.equal(c.why, 'origin_not_featured');
});

test('role.raw.sample / selftest / real:false refused even if sample:false', () => {
  for (const poison of [{ raw: { sample: true } }, { selftest: true }, { real: false }]) {
    const c = classifyRole(
      {
        id: 'role-p',
        sample: false,
        title: 'Eng',
        sourceSubmissionHash: fp('sp'),
        ...poison,
      },
      {
        items: [
          {
            id: 'sp',
            featuredId: 'role-p',
            status: 'featured',
            form: 'startup-hire',
            data: { 'company-name': 'Acme' },
          },
        ],
      },
    );
    assert.equal(c.ok, false, JSON.stringify(poison));
    assert.equal(c.why, 'seed_or_sample');
  }
});

test('board company cannot override verified inbox company', () => {
  const c = classifyRole(
    {
      id: 'role-p',
      sample: false,
      title: 'Eng',
      company: 'Invented Company',
      sourceSubmissionHash: fp('sp'),
    },
    {
      items: [
        {
          id: 'sp',
          featuredId: 'role-p',
          status: 'featured',
          form: 'startup-hire',
          data: { 'company-name': 'Acme Labs' },
        },
      ],
    },
  );
  assert.equal(c.ok, false);
  assert.equal(c.why, 'company_mismatch');
});

test('partner-company form refused', () => {
  const c = classifyRole(
    {
      id: 'role-p',
      sample: false,
      title: 'Eng',
      sourceSubmissionHash: fp('sp'),
    },
    {
      items: [
        {
          id: 'sp',
          featuredId: 'role-p',
          status: 'featured',
          form: 'partner-company',
          data: { 'company-name': 'Acme' },
        },
      ],
    },
  );
  assert.equal(c.ok, false);
  assert.equal(c.why, 'origin_not_startup_form');
});

test('two distinct origin objects same id are ambiguous', () => {
  const a = {
    id: 'sp',
    featuredId: 'role-p',
    status: 'featured',
    form: 'startup-hire',
    data: { 'company-name': 'Acme' },
  };
  const b = {
    id: 'sp',
    featuredId: 'role-p',
    status: 'featured',
    form: 'startup-hire',
    data: { 'company-name': 'Acme' },
    spam: true,
  };
  // same id, two objects — both match featuredId
  const c = classifyRole(
    { id: 'role-p', sample: false, title: 'Eng', sourceSubmissionHash: fp('sp') },
    { items: [a, b] },
  );
  assert.equal(c.ok, false);
  assert.equal(c.why, 'ambiguous_origin');
});
