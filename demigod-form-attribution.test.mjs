import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
// formAttribution calls normalizeReferralParam, so slicing formAttribution alone left the
// callee undefined in the VM and blew up before any assertion ran. Pull in both, and fail
// loudly if either goes missing rather than silently testing a stub.
const names = ['normalizeReferralParam', 'formAttribution'];
const helper = names
  .map((name) => {
    const fn = source.match(new RegExp(`function ${name}\\([\\s\\S]+?\\n}`))?.[0];
    assert.ok(fn, `${name} missing from foot-core`);
    return fn;
  })
  .join('\n');

const inputs = [];
const form = {
  dataset: {},
  ownerDocument: { createElement: () => ({}) },
  appendChild: (input) => inputs.push(input),
};
vm.runInNewContext(`${helper};formAttribution(form)`, {
  form,
  URLSearchParams,
  window: { dgFootVersion: 'v727' },
  location: {
    search: '?utm_source=linkedin&utm_campaign=founder%20launch&role_id=role-42&utm_term=private%40example.com&unknown=secret',
  },
});

assert.deepEqual(
  inputs.map(({ name, value }) => [name, value]),
  [['form_version', 'v727'], ['utm_source', 'linkedin'], ['utm_campaign', 'founder launch'], ['role_id', 'role-42']],
);
assert.equal(form.dataset.dgAttribution, '1');
console.log('demigod form attribution: PASS');
