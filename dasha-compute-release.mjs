/**
 * Provenance-backed Dasha Compute download (issue 85).
 * Pin is dasha-desk main artifacts/dasha-compute (commit ec690846):
 * 145953 bytes, sha256 a164b963..., 29 source files. Live still serves the
 * pre-provenance 27,980-byte tarball. These routes proxy the reviewed
 * artifact and 502 unless the body matches this pin.
 */
export const COMPUTE_ARCHIVE = '/dasha-compute-open-alpha.tar.gz';
export const COMPUTE_ARCHIVE_SHA = '/dasha-compute-open-alpha.tar.gz.sha256';
export const COMPUTE_RELEASE_JSON = '/compute/release.json';
export const COMPUTE_RELEASE_SHA256 =
  'a164b9630d27803268faf0a6fb30edf0ad38589f65777ce8f65cdc69bc2e9c90';
export const COMPUTE_RELEASE_BYTES = 145953;
export const COMPUTE_RELEASE_SOURCE_FILES = 29;
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
    sourceFileCount: COMPUTE_RELEASE_SOURCE_FILES,
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
