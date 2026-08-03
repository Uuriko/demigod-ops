import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForPageReady } from './demigod-agent-smoke.mjs';

test('live smoke waits for a rendered, foot-initialized page and fails closed', async () => {
  let calls = 0;
  await waitForPageReady(async () => ({ result: { value: ++calls === 3 } }), { attempts: 3, delayMs: 0 });
  assert.equal(calls, 3);
  await assert.rejects(
    waitForPageReady(async () => ({ result: { value: false } }), { attempts: 2, delayMs: 0 }),
    /live page did not become ready/,
  );
});

test('live smoke keeps polling through transient CDP evaluate failures', async () => {
  let calls = 0;
  await waitForPageReady(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('timeout Runtime.evaluate');
      return { result: { value: true } };
    },
    { attempts: 4, delayMs: 0 },
  );
  assert.equal(calls, 3);
  await assert.rejects(
    waitForPageReady(async () => {
      throw new Error('timeout Runtime.evaluate');
    }, { attempts: 2, delayMs: 0 }),
    /live page did not become ready.*timeout Runtime\.evaluate/,
  );
});
