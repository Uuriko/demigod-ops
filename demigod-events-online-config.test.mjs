import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { publicConfigMatches, purgeJsdelivrConfig } from './demigod-events-online.mjs';

const footSource = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const resolverSource = footSource.slice(
  footSource.indexOf('var __dgEvBotExtraBases'),
  footSource.indexOf('function q(s)'),
);

function resolver(newestHealthy) {
  const oldBase = 'https://stale.example/api/events-bot';
  const newBase = 'https://current.example/api/events-bot';
  const healthRequests = [];
  const context = {
    AbortSignal,
    Headers,
    Response,
    window: {},
    dgLocalOk: (url) => !/^http:\/\/(?:127\.0\.0\.1|localhost)/.test(url),
    fetch: async (url) => {
      const href = String(url);
      if (href.includes('raw.githubusercontent.com')) {
        return Response.json({ apiBase: oldBase, publishedAt: '2026-07-01T00:00:00Z' });
      }
      if (href.includes('cdn.jsdelivr.net')) {
        return Response.json({ apiBase: newBase, publishedAt: '2026-07-02T00:00:00Z' });
      }
      healthRequests.push(href);
      const ok = href === `${newBase}/health` ? newestHealthy : true;
      return Response.json({ ok }, { status: ok ? 200 : 503 });
    },
  };
  vm.runInNewContext(resolverSource, context);
  return { context, healthRequests, oldBase, newBase };
}

test('website config certification requires the current public API base', () => {
  const current = 'https://current.example/api/events-bot';
  assert.equal(publicConfigMatches(current, [current]), true);
  assert.equal(publicConfigMatches(current, ['https://stale.example/api/events-bot']), false);
  assert.equal(publicConfigMatches('', [current]), false);

  const source = fs.readFileSync(new URL('./demigod-events-online.mjs', import.meta.url), 'utf8');
  assert.match(source, /certified: !hostUnobservable && publicOk && websiteConfig\.reachable === true/);
  assert.match(source, /needHeal: hostUnobservable[\s\S]*!reachable \|\| !publicOk \|\| nativeRsvpRoutes === false/);
  assert.match(source, /published = await publishConfigToCdn\(cfg\)/);
  assert.match(source, /if \(forcePublish && published\?\.ok !== true\) exitWith\(1\)/);
});

test('config publish accepts only a complete jsDelivr branch purge', async () => {
  const assetPath = '/gh/Uuriko/demigod-site-cdn@main/events-api-latest.json';
  const body = (overrides = {}) => ({
    status: 'finished',
    paths: {
      [assetPath]: {
        throttled: false,
        providers: { CF: true, FY: true },
        ...overrides,
      },
    },
  });
  const response = (json) => Response.json(json);

  assert.equal((await purgeJsdelivrConfig(async () => response(body()))).ok, true);
  assert.equal(
    (await purgeJsdelivrConfig(async () => response(body({ providers: { CF: true, FY: false } })))).ok,
    false,
  );
  assert.equal(
    (await purgeJsdelivrConfig(async () => response(body({ throttled: true })))).ok,
    false,
  );
  assert.equal(
    (await purgeJsdelivrConfig(async () => {
      throw new Error('offline');
    })).ok,
    false,
  );
});

test('browser probes the newest Events config first and uses stale mirrors only as fallback', async () => {
  const healthy = resolver(true);
  assert.equal((await healthy.context.dgEventsBotPickBase(100)).base, healthy.newBase);
  assert.deepEqual(healthy.healthRequests, [`${healthy.newBase}/health`]);

  const fallback = resolver(false);
  assert.equal((await fallback.context.dgEventsBotPickBase(100)).base, fallback.oldBase);
  assert.deepEqual(fallback.healthRequests, [
    `${fallback.newBase}/health`,
    `${fallback.oldBase}/health`,
  ]);
});

// Units force CF to stop loca thrash; sticky demigod-events-bot.loca.lt remains pure-ladder fallback when not forced.
test('startup and recurring heal prefer cloudflared; sticky loca stays in pure ladder', () => {
  for (const file of ['./systemd-user/demigod-events-tunnel.service', './systemd-user/demigod-events-heal.service', './.config/systemd/user/demigod-events-heal.service']) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(source, /^Environment=DEMIGOD_EVENTS_TUNNEL=cloudflared$/m, file);
  }
  const online = fs.readFileSync(new URL('./demigod-events-online.mjs', import.meta.url), 'utf8');
  assert.match(online, /export function tunnelUrlMatchesPreference/);
  assert.match(online, /preferredSubdomain/);
});
