import assert from 'node:assert/strict';
import test from 'node:test';
import { matchFreeVenues } from './demigod-events-bot-agent.mjs';

test('field sports rank playable green space above the Ferry food arcade', () => {
  const matches = matchFreeVenues({ need: 'free soccer pickup in SF', seats: 20, limit: 6 });

  assert.match(matches[0].name, /field|lawn|green|park|gardens/i);
  assert.ok(matches[0].reasons.includes('field-sport'));
  assert.notEqual(matches[0].id, 'v_ferry_arcade');
});
