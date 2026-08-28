import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../dasha-lobby-worker.mjs', import.meta.url);
let src = await readFile(path, 'utf8');
let changed = false;

const importLine = "import { dashaBuildPageResponse } from './dasha-build-page.mjs';\n";
if (!src.includes(importLine.trim())) {
  const anchor = "import { computeReleaseKind, computeReleaseResponse } from './dasha-compute-release.mjs';\n";
  if (!src.includes(anchor)) throw new Error('build wire: import anchor missing');
  src = src.replace(anchor, anchor + importLine);
  changed = true;
}

if (!src.includes("url.pathname === '/build'")) {
  const anchor = "  if ((request.method === 'GET' || request.method === 'HEAD') && computeReleaseKind(url.pathname)) {\n    return computeReleaseResponse(request, url.pathname);\n  }\n";
  if (!src.includes(anchor)) throw new Error('build wire: route anchor missing');
  const route = "  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/build' || url.pathname === '/build/')) {\n    return dashaBuildPageResponse(request);\n  }\n";
  src = src.replace(anchor, anchor + route);
  changed = true;
}

if (changed) {
  await writeFile(path, src);
  console.log('wired /build into dasha-lobby-worker.mjs');
} else {
  console.log('/build already wired');
}
