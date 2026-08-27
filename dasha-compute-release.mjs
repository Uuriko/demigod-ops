/**
 * Provenance-backed Dasha Compute download (issue 85).
 * Live still serves the pre-provenance 27,980-byte tarball. These routes
 * proxy the reviewed artifact and refuse a body whose SHA-256 does not match.
 */
export const COMPUTE_ARCHIVE = '/dasha-compute-open-alpha.tar.gz';
export const COMPUTE_ARCHIVE_SHA = '/dasha-compute-open-alpha.tar.gz.sha256';
export const COMPUTE_RELEASE_JSON = '/compute/release.json';
export const COMPUTE_RELEASE_SHA256 =
  '366e2c3fb9803eef37b430f8e184e4fff2404511b8cf41c32932725d83aeee23';
export const COMPUTE_RELEASE_BYTES = 161313;
export const COMPUTE_RELEASE_VERSION = '0.3.0';
export const COMPUTE_UPSTREAM =
  'https://raw.githubusercontent.com/Uuriko/dasha-desk/main/artifacts/dasha-compute';

const FILES = {
  archive: 'dasha-compute-open-alpha.tar.gz',
  sha256: 'dasha-compute-open-alpha.tar.gz.sha256',
  manifest: 'release.json',
};

export function computeReleaseKind(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (path === COMPUTE_ARCHIVE) return 'archive';
  if (path === COMPUTE_ARCHIVE_SHA) return 'sha256';
  if (path === COMPUTE_RELEASE_JSON) return 'manifest';
  return '';
}

export async function sha256Hex(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function checksumFile(hex = COMPUTE_RELEASE_SHA256) {
  return `${hex}  ${FILES.archive}\n`;
}

export function releaseManifest(extra = {}) {
  return `${JSON.stringify({
    artifact: FILES.archive,
    bytes: COMPUTE_RELEASE_BYTES,
    sha256: COMPUTE_RELEASE_SHA256,
    version: COMPUTE_RELEASE_VERSION,
    ...extra,
  })}\n`;
}

export async function computeReleaseResponse(request, pathname, opts = {}) {
  const kind = computeReleaseKind(pathname);
  if (!kind) return null;
  const method = request.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') return null;
  const fetchImpl = opts.fetchImpl || fetch;
  const expectedSha = opts.expectedSha || COMPUTE_RELEASE_SHA256;
  const expectedBytes = opts.expectedBytes || COMPUTE_RELEASE_BYTES;

  if (kind === 'sha256') {
    const body = checksumFile(expectedSha);
    return new Response(method === 'HEAD' ? null : body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Dasha-Edge': 'compute-release',
      },
    });
  }

  if (kind === 'manifest') {
    const body = releaseManifest({ bytes: expectedBytes, sha256: expectedSha });
    return new Response(method === 'HEAD' ? null : body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Dasha-Edge': 'compute-release',
      },
    });
  }

  const upstream = `${COMPUTE_UPSTREAM}/${FILES.archive}`;
  const res = await fetchImpl(upstream, { method: 'GET', redirect: 'follow' });
  if (!res.ok) {
    return new Response('compute archive unavailable\n', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Dasha-Edge': 'compute-release' },
    });
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  const digest = await sha256Hex(buf);
  if (digest !== expectedSha || buf.byteLength !== expectedBytes) {
    return new Response('compute archive digest mismatch\n', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Dasha-Edge': 'compute-release' },
    });
  }
  return new Response(method === 'HEAD' ? null : buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${FILES.archive}"`,
      'Cache-Control': 'public, max-age=300',
      'X-Dasha-Edge': 'compute-release',
    },
  });
}
