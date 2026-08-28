import assert from 'node:assert/strict';
import {
  COOP_REPORT_ONLY,
  HTML_PERMISSIONS_POLICY,
  INTEGRITY_POLICY_REPORT_ONLY,
  INTEGRITY_REPORT_MAX_BYTES,
  INTEGRITY_REPORT_PATH,
  applyIntegrityPolicyHeaders,
  integrityReportResponse,
  isIntegrityReportPath,
  reportingEndpointsHeader,
} from './edge-integrity-policy.mjs';

assert.equal(isIntegrityReportPath('/integrity-reports'), true);
assert.equal(isIntegrityReportPath('/integrity-reports/'), true);
assert.equal(isIntegrityReportPath('/integrity-reports/x'), false);
assert.equal(isIntegrityReportPath('/'), false);

assert.equal(
  reportingEndpointsHeader('https://www.trydemigod.com/pricing'),
  'integrity-endpoint="https://www.trydemigod.com/integrity-reports"',
);
assert.equal(
  reportingEndpointsHeader('https://lobby.getdasha.com/lobby'),
  'integrity-endpoint="https://lobby.getdasha.com/integrity-reports"',
);
assert.equal(
  reportingEndpointsHeader('not a url'),
  `integrity-endpoint="${INTEGRITY_REPORT_PATH}"`,
);

{
  const headers = new Headers({
    'Integrity-Policy': 'blocked-destinations=(script)',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  applyIntegrityPolicyHeaders(headers, 'https://www.getdasha.com/faucet');
  assert.equal(headers.get('integrity-policy-report-only'), INTEGRITY_POLICY_REPORT_ONLY);
  assert.equal(
    headers.get('reporting-endpoints'),
    'integrity-endpoint="https://www.getdasha.com/integrity-reports"',
  );
  assert.equal(headers.get('cross-origin-opener-policy-report-only'), COOP_REPORT_ONLY);
  assert.equal(headers.get('integrity-policy'), null);
  assert.equal(headers.get('cross-origin-opener-policy'), null);
}

assert.match(HTML_PERMISSIONS_POLICY, /camera=\(\)/);
assert.match(HTML_PERMISSIONS_POLICY, /browsing-topics=\(\)/);
assert.match(HTML_PERMISSIONS_POLICY, /display-capture=\(\)/);
assert.match(HTML_PERMISSIONS_POLICY, /bluetooth=\(\)/);
assert.match(COOP_REPORT_ONLY, /^same-origin-allow-popups/);
assert.doesNotMatch(COOP_REPORT_ONLY, /(?:^|;\s*)same-origin(?:;|$)/);

{
  const post = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/reports+json' },
    body: JSON.stringify([{
      type: 'integrity-violation',
      body: { destination: 'script', reportOnly: true, blockedURL: 'https://cdn.example/x.js' },
    }]),
  }));
  assert.equal(post.status, 204);
  assert.equal(await post.text(), '');
  assert.equal(post.headers.get('access-control-allow-origin'), null);
}

{
  const post = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', {
    method: 'POST',
    headers: {
      Origin: 'https://www.trydemigod.com',
      'Content-Type': 'application/reports+json',
    },
    body: JSON.stringify([{ type: 'integrity-violation' }, { type: 'coop' }]),
  }));
  assert.equal(post.status, 204);
  assert.equal(post.headers.get('access-control-allow-origin'), 'https://www.trydemigod.com');
  assert.equal(post.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(post.headers.get('vary'), 'Origin');
}

{
  const get = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports'));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST, OPTIONS');
}

{
  const options = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', { method: 'OPTIONS' }));
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('allow'), 'POST, OPTIONS');
  assert.equal(options.headers.get('access-control-allow-origin'), null);
}

{
  const preflight = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://www.trydemigod.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://www.trydemigod.com');
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'POST');
  assert.equal(preflight.headers.get('access-control-allow-headers'), 'content-type');
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(preflight.headers.get('access-control-max-age'), '7200');
}

{
  const foreignOptions = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://evil.example',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  }));
  assert.equal(foreignOptions.status, 204);
  assert.equal(foreignOptions.headers.get('access-control-allow-origin'), null);
}

{
  const foreign = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: '[]',
  }));
  assert.equal(foreign.status, 403);
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
}

{
  const bad = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', {
    method: 'POST',
    body: 'not-json',
  }));
  assert.equal(bad.status, 400);
}

{
  const huge = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', {
    method: 'POST',
    headers: { 'Content-Length': String(INTEGRITY_REPORT_MAX_BYTES + 1) },
    body: '[]',
  }));
  assert.equal(huge.status, 413);
}

console.log('edge-integrity-policy: PASS');
