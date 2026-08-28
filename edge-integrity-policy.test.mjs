import assert from 'node:assert/strict';
import {
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
  const headers = new Headers({ 'Integrity-Policy': 'blocked-destinations=(script)' });
  applyIntegrityPolicyHeaders(headers, 'https://www.getdasha.com/faucet');
  assert.equal(headers.get('integrity-policy-report-only'), INTEGRITY_POLICY_REPORT_ONLY);
  assert.equal(
    headers.get('reporting-endpoints'),
    'integrity-endpoint="https://www.getdasha.com/integrity-reports"',
  );
  assert.equal(headers.get('integrity-policy'), null);
}

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
}

{
  const get = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports'));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
}

{
  const options = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', { method: 'OPTIONS' }));
  assert.equal(options.status, 204);
}

{
  const foreign = await integrityReportResponse(new Request('https://www.trydemigod.com/integrity-reports', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: '[]',
  }));
  assert.equal(foreign.status, 403);
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
