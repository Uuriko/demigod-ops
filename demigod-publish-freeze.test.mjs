import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNotFrozen, status, FREEZE_DISABLED } from './demigod-publish-freeze.mjs';

test('permanent disable leaves freeze off but keeps current-request authorization separate', () => {
  const previous = process.env.DEMIGOD_PUBLISH_FREEZE;
  const previousAuthorization = process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
  process.env.DEMIGOD_PUBLISH_FREEZE = '1';
  try {
    delete process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
    assert.equal(FREEZE_DISABLED, true, 'standing FREEZE_DISABLED');
    assert.equal(status().frozen, false);
    assert.equal(status().disabled, true);
    assert.equal(status().authorized, false);
    assert.throws(() => assertNotFrozen('test-publish'), /current request did not authorize/);
    process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH = '1';
    assert.equal(status().authorized, true);
    assert.doesNotThrow(() => assertNotFrozen('test-publish'));
  } finally {
    if (previous == null) delete process.env.DEMIGOD_PUBLISH_FREEZE;
    else process.env.DEMIGOD_PUBLISH_FREEZE = previous;
    if (previousAuthorization == null) delete process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
    else process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH = previousAuthorization;
  }
});
