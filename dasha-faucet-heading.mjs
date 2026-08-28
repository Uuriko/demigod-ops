/**
 * Worker-owned /faucet must have a no-JS heading. Live first HTML is a wordmark
 * and an empty <main id="dasha-faucet"> — Watch treats that as blank.
 *
 * faucet.js does root.innerHTML = '' on #dasha-faucet, so the h1 must sit
 * *before* that landmark. A noscript child inside the empty main covers
 * script-off without flashing copy when JS boots.
 */
export const FAUCET_H1 = 'Fill the jar';
export const FAUCET_NOJS = 'Needs JavaScript to claim.';

const FAUCET_MAIN_RE = /<main\b([^>]*)>(\s*)<\/main>/i;
const FAUCET_NOJS_HTML = `<noscript><p>${FAUCET_NOJS}</p></noscript>`;

export function ensureFaucetHeading(html) {
  let page = String(html || '');
  if (!/<h1[\s>]/i.test(page)) {
    const h1 = `<h1>${FAUCET_H1}</h1>`;
    const main = page.match(/<main\b[^>]*>/i);
    if (main) {
      const at = page.indexOf(main[0]);
      page = page.slice(0, at) + h1 + page.slice(at);
    } else {
      const header = page.match(/<\/header>/i);
      if (header) {
        const at = page.indexOf(header[0]) + header[0].length;
        page = page.slice(0, at) + h1 + page.slice(at);
      } else {
        const body = page.match(/<body\b[^>]*>/i);
        if (body) {
          const at = page.indexOf(body[0]) + body[0].length;
          page = page.slice(0, at) + h1 + page.slice(at);
        } else {
          page = h1 + page;
        }
      }
    }
  }
  return page.replace(FAUCET_MAIN_RE, (full, attrs, ws) => {
    if (!/\bid\s*=\s*["']dasha-faucet["']/i.test(attrs)) return full;
    return `<main${attrs}>${ws}${FAUCET_NOJS_HTML}</main>`;
  });
}
