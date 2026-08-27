/** Home Compute door + footer hop. Honest alpha copy. Slim bar stays wordmark + Buy. */

export const HOME_COMPUTE_HREF = '/compute';
export const HOME_COMPUTE_SOURCE = 'https://github.com/Uuriko/dasha-desk/tree/main/compute';
export const HOME_COMPUTE_DOOR = `<section id="compute-door" aria-labelledby="compute-title"><h2 id="compute-title">Compute</h2><p>Route OpenAI-shaped test prompts to participating Macs.</p><p>Open alpha · providers can read prompts · no billing yet.</p><p><a href="${HOME_COMPUTE_HREF}">Try the console</a> · <a href="${HOME_COMPUTE_SOURCE}">Review source</a></p></section>`;
export const HOME_COMPUTE_SHOW_CSS = '#compute-door,.compute,#compute-door a,a[href="/compute"],a[href="https://www.getdasha.com/compute"]{display:revert!important}#compute-door{display:block!important}#compute-door a[href*="github.com/Uuriko/dasha-desk"]{display:inline!important}';

function injectHomeComputeShowCss(html) {
  const page = String(html || '');
  if (/id=["']dasha-home-compute["']/i.test(page)) return page;
  const tag = `<style id="dasha-home-compute">${HOME_COMPUTE_SHOW_CSS}</style>`;
  const closeHead = page.search(/<\/head>/i);
  if (closeHead >= 0) return page.slice(0, closeHead) + tag + page.slice(closeHead);
  return tag + page;
}

function isComputeHideSelector(sel) {
  const s = String(sel || '').trim();
  if (!s) return true;
  if (/^\.compute$/i.test(s)) return true;
  if (/^a\[href=["']\/compute\/?["']\]$/i.test(s)) return true;
  if (/^a\[href=["']https:\/\/www\.getdasha\.com\/compute\/?["']\]$/i.test(s)) return true;
  return false;
}

function rewriteHideCss(css) {
  return String(css || '').replace(/([^{}]+)\{([^{}]*)\}/g, (_rule, selectors, decls) => {
    const kept = String(selectors)
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part && !isComputeHideSelector(part));
    if (!kept.length) return '';
    return `${kept.join(',')}{${decls}}`;
  });
}

/** Live #dasha-home-chrome-hide lists /compute. Drop those selectors so unhide CSS is not a race. */
export function stripComputeHideRules(html) {
  return String(html || '').replace(
    /(<style\b[^>]*\bid=["']dasha-home-chrome-hide["'][^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_all, open, css, close) => `${open}${rewriteHideCss(css)}${close}`,
  );
}

export function ensureHomeComputeDoor(html) {
  let page = injectHomeComputeShowCss(stripComputeHideRules(html));
  if (/id=["']compute-door["']/i.test(page)) return page;
  const door = HOME_COMPUTE_DOOR;
  const hero = page.match(/<header\b[^>]*\bdasha-hero\b[^>]*>[\s\S]*?<\/header>/i);
  if (hero) {
    const at = page.indexOf(hero[0]) + hero[0].length;
    return page.slice(0, at) + door + page.slice(at);
  }
  const token = page.match(/<section\b[^>]*\bid=["']token["'][^>]*>/i);
  if (token) return page.slice(0, page.indexOf(token[0])) + door + page.slice(page.indexOf(token[0]));
  const body = page.match(/<body\b[^>]*>/i);
  if (body) {
    const at = page.indexOf(body[0]) + body[0].length;
    return page.slice(0, at) + door + page.slice(at);
  }
  return page + door;
}

export function ensureHomeComputeHop(html) {
  const page = String(html || '');
  const foot = page.match(/<footer\b[^>]*\bclass=["'][^"']*\bdasha-foot\b[^>]*>[\s\S]*?<\/footer>/i);
  if (!foot) return page;
  if (/href=["'](?:https:\/\/(?:www\.)?getdasha\.com)?\/compute\/?["']/i.test(foot[0])) return page;
  if (/<a\b[^>]*>\s*Forum\s*<\/a>/i.test(foot[0])) {
    return page.replace(foot[0], foot[0].replace(/(<a\b[^>]*>\s*Forum\s*<\/a>)/i, ` <a href="${HOME_COMPUTE_HREF}">Compute</a> · $1`));
  }
  return page.replace(foot[0], foot[0].replace(/<\/p>(\s*<\/footer>)/i, ` · <a href="${HOME_COMPUTE_HREF}">Compute</a></p>$1`));
}
