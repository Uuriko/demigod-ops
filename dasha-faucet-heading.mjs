/**
 * Worker-owned /faucet must have a no-JS heading. Live first HTML is a wordmark
 * and an empty <main id="dasha-faucet"> — Watch treats that as blank.
 *
 * faucet.js does root.innerHTML = '' on #dasha-faucet. WCAG 2.2 wants the h1
 * as the first element of <main>, so the wipe target cannot *be* main. Split
 * live-shaped <main id="dasha-faucet"> into <main><h1>…</h1><div id="dasha-faucet">.
 * A noscript child covers script-off without flashing copy when JS boots.
 */
export const FAUCET_H1 = 'Fill the jar';
export const FAUCET_NOJS = 'Needs JavaScript to claim.';

const FAUCET_MAIN_ID_RE =
  /<main\b([^>]*\bid\s*=\s*["']dasha-faucet["'][^>]*)>([\s\S]*?)<\/main>/i;
const FAUCET_NOJS_HTML = `<noscript><p>${FAUCET_NOJS}</p></noscript>`;

function stripFaucetId(attrs) {
  return String(attrs || '')
    .replace(/\bid\s*=\s*["']dasha-faucet["']/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ensureFaucetHeading(html) {
  let page = String(html || '');
  if (FAUCET_MAIN_ID_RE.test(page)) {
    page = page.replace(FAUCET_MAIN_ID_RE, (_, attrs, inner) => {
      const rest = stripFaucetId(attrs);
      const body = String(inner || '').trim() ? inner : FAUCET_NOJS_HTML;
      const heading = /<h1[\s>]/i.test(page) || /<h1[\s>]/i.test(inner)
        ? ''
        : `<h1>${FAUCET_H1}</h1>`;
      return `<main>${heading}<div id="dasha-faucet"${rest ? ` ${rest}` : ''}>${body}</div></main>`;
    });
  }
  if (/<h1[\s>]/i.test(page)) return page;
  const h1 = `<h1>${FAUCET_H1}</h1>`;
  const main = page.match(/<main\b[^>]*>/i);
  if (main) {
    const at = page.indexOf(main[0]) + main[0].length;
    return page.slice(0, at) + h1 + page.slice(at);
  }
  const header = page.match(/<\/header>/i);
  if (header) {
    const at = page.indexOf(header[0]) + header[0].length;
    return page.slice(0, at) + h1 + page.slice(at);
  }
  const body = page.match(/<body\b[^>]*>/i);
  if (body) {
    const at = page.indexOf(body[0]) + body[0].length;
    return page.slice(0, at) + h1 + page.slice(at);
  }
  return h1 + page;
}
