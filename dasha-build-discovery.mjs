export const BUILD_HREF = '/build';
export const BUILD_DOOR = '<section id="build-door" aria-labelledby="build-title"><h2 id="build-title">Build</h2><p>Pick useful open-source work, hand it to an agent or work it yourself, then ship the result on GitHub.</p><p><a href="/build">Find work</a> · <a href="https://github.com/Uuriko/dasha-desk">Review source</a></p></section>';

export function ensureBuildDiscovery(html) {
  let page = String(html || '');
  if (!/id=["']build-door["']/i.test(page)) {
    const compute = page.match(/<section\b[^>]*\bid=["']compute-door["'][^>]*>[\s\S]*?<\/section>/i);
    if (compute) {
      const at = page.indexOf(compute[0]) + compute[0].length;
      page = page.slice(0, at) + BUILD_DOOR + page.slice(at);
    } else {
      const body = page.match(/<body\b[^>]*>/i);
      if (body) {
        const at = page.indexOf(body[0]) + body[0].length;
        page = page.slice(0, at) + BUILD_DOOR + page.slice(at);
      }
    }
  }

  const foot = page.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
  if (foot && !/href=["'](?:https:\/\/(?:www\.)?getdasha\.com)?\/build\/?["']/i.test(foot[0])) {
    const next = foot[0].replace(/(<\/p>)/i, ' · <a href="/build">Build</a>$1');
    page = page.replace(foot[0], next);
  }
  return page;
}

export function ensureBuildInSitemap(xml) {
  const source = String(xml || '');
  if (/https:\/\/www\.getdasha\.com\/build(?:<|\/)/i.test(source)) return source;
  const loc = '<url><loc>https://www.getdasha.com/build</loc></url>';
  return source.includes('</urlset>') ? source.replace('</urlset>', `${loc}</urlset>`) : source + loc;
}
