import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../dasha-lobby-worker.mjs', import.meta.url);
let src = await readFile(path, 'utf8');

if (!src.includes("from './dasha-build-discovery.mjs'")) {
  const needle = "import { dashaBuildPageResponse } from './dasha-build-page.mjs';\n";
  if (!src.includes(needle)) throw new Error('build page import anchor not found');
  src = src.replace(needle, needle + "import { ensureBuildDiscovery, ensureBuildInSitemap } from './dasha-build-discovery.mjs';\n");
}

if (!src.includes('ensureBuildInSitemap(SITEMAP_XML)')) {
  const needle = "return new Response(request.method === 'HEAD' ? null : SITEMAP_XML, {";
  if (!src.includes(needle)) throw new Error('sitemap anchor not found');
  src = src.replace(needle, "return new Response(request.method === 'HEAD' ? null : ensureBuildInSitemap(SITEMAP_XML), {");
}

if (!src.includes('ensureBuildDiscovery(rewriteHomeFirstViewport')) {
  const needle = 'html = rewriteHomeFirstViewport(stripHomeSimpBoard(html));';
  if (!src.includes(needle)) throw new Error('home rewrite anchor not found');
  src = src.replace(needle, 'html = ensureBuildDiscovery(rewriteHomeFirstViewport(stripHomeSimpBoard(html)));');
}

await writeFile(path, src);
console.log('Build discovery wired');
