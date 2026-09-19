import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, companyList, roleList } from './demigod-die-hosted-worker.js';
// Synthetic header exercises the existing upstream-Access contract only;
// this is not evidence of JWT verification or production authorization.
const headers = { 'Cf-Access-Jwt-Assertion': Buffer.from(JSON.stringify({alg:'RS256'})).toString('base64url') + '.e30.sig' };
const call = (path, opts = {}) => handleRequest(new Request('https://app.trydemigod.com' + path, {headers, ...opts}));

test('every advertised company href and API identity resolves to its catalog row', async () => {
  for (const company of companyList().rows) {
    const page = await call(company.href);
    assert.equal(page.status, 200, company.href);
    assert.ok((await page.text()).includes(company.name), company.name);
    const api = await call('/api/v1/companies/' + encodeURIComponent(company.id));
    assert.equal(api.status, 200, company.id);
    assert.deepEqual((await api.json()).identity, {
      id:company.id, name:company.name, domain:company.domain, website:company.website,
    });
  }
});

test('role-list hrefs are navigable without inventing a job for public movers', async () => {
  for (const row of roleList().rows) {
    assert.equal((await call(row.href)).status, 200, row.href);
    if (row.state === 'public_mover') assert.equal(row.title, null);
  }
});

test('unknown and malformed company ids stay 404; known companies retain access and method gates', async () => {
  for (const id of ['unknown', '%', '%252F', 'yc%3Aarray-labs%2Fextra']) {
    assert.equal((await call('/companies/' + id)).status, 404, id);
    assert.equal((await call('/api/v1/companies/' + id)).status, 404, id);
  }
  const href = companyList().rows[1].href;
  assert.equal((await call(href, {headers:{}})).status, 403);
  assert.equal((await call(href, {method:'POST'})).status, 405);
});
