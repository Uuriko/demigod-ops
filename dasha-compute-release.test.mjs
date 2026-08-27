import assert from 'node:assert/strict';
import {
  COMPUTE_ARCHIVE,
  COMPUTE_ARCHIVE_SHA,
  COMPUTE_RELEASE_JSON,
  COMPUTE_RELEASE_SHA256,
  checksumFile,
  computeReleaseKind,
  computeReleaseResponse,
  releaseManifest,
  sha256Hex,
} from './dasha-compute-release.mjs';

assert.equal(computeReleaseKind('/dasha-compute-open-alpha.tar.gz'), 'archive');
assert.equal(computeReleaseKind('/dasha-compute-open-alpha.tar.gz.sha256'), 'sha256');
assert.equal(computeReleaseKind('/compute/release.json'), 'manifest');
assert.equal(computeReleaseKind('/compute'), '');

assert.equal(checksumFile(), `${COMPUTE_RELEASE_SHA256}  dasha-compute-open-alpha.tar.gz\n`);
assert.match(releaseManifest(), new RegExp(`"sha256":"${COMPUTE_RELEASE_SHA256}"`));
assert.match(releaseManifest(), /"version":"0\.3\.0"/);

const shaRes = await computeReleaseResponse(
  new Request('https://www.getdasha.com' + COMPUTE_ARCHIVE_SHA),
  COMPUTE_ARCHIVE_SHA,
);
assert.equal(shaRes.status, 200);
assert.equal(shaRes.headers.get('X-Dasha-Edge'), 'compute-release');
assert.equal(await shaRes.text(), checksumFile());

const manRes = await computeReleaseResponse(
  new Request('https://www.getdasha.com' + COMPUTE_RELEASE_JSON),
  COMPUTE_RELEASE_JSON,
);
assert.equal(manRes.status, 200);
assert.equal(manRes.headers.get('Content-Type'), 'application/json; charset=utf-8');

const sample = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x01, 0x02, 0x03, 0x04]);
const sampleSha = await sha256Hex(sample);
const fetchSample = async () => new Response(sample, { status: 200 });

{
  const res = await computeReleaseResponse(
    new Request('https://www.getdasha.com' + COMPUTE_ARCHIVE),
    COMPUTE_ARCHIVE,
    { fetchImpl: fetchSample, expectedSha: sampleSha, expectedBytes: sample.byteLength },
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'application/gzip');
  const body = new Uint8Array(await res.arrayBuffer());
  assert.equal(body.byteLength, sample.byteLength);
  assert.equal(await sha256Hex(body), sampleSha);
}

{
  const res = await computeReleaseResponse(
    new Request('https://www.getdasha.com' + COMPUTE_ARCHIVE),
    COMPUTE_ARCHIVE,
    { fetchImpl: fetchSample, expectedSha: COMPUTE_RELEASE_SHA256, expectedBytes: sample.byteLength },
  );
  assert.equal(res.status, 502);
}

{
  const res = await computeReleaseResponse(
    new Request('https://www.getdasha.com' + COMPUTE_ARCHIVE),
    COMPUTE_ARCHIVE,
    { fetchImpl: async () => new Response('missing', { status: 404 }) },
  );
  assert.equal(res.status, 502);
}

assert.equal(await computeReleaseResponse(new Request('https://www.getdasha.com/nope'), '/nope'), null);

console.log('dasha-compute-release: PASS');
