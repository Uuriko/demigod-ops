import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const guarded = {
  'demigod-ship.mjs': "run('foot-cdn'",
  'demigod-cm6-paste-publish.mjs': 'const tabs = await cdpTabs()',
  'demigod-events-online.mjs': "spawnSync('git', ['push'",
  // Guard must sit inside tryApiWebhooks (exported) before the Webflow create POST, not only main().
  'demigod-webflow-webhook-setup.mjs': 'api.webflow.com/v2/sites',
};

test('known external publish entrypoints freeze before their first mutation', () => {
  for (const [file, mutation] of Object.entries(guarded)) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    const guard = source.indexOf('assertNotFrozen(', source.indexOf('function '));
    assert.notEqual(guard, -1, `${file} has no freeze guard`);
    assert.ok(guard < source.indexOf(mutation), `${file} guards too late`);
  }
});

test('Events tunnel service never opts into publication', () => {
  const source = fs.readFileSync(new URL('systemd-user/demigod-events-tunnel.service', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /PUBLISH_CONFIG|--publish-config/);
});
