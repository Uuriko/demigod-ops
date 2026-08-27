/**
 * Worker-owned /faucet must have a no-JS heading. Live first HTML is a wordmark,
 * a still, and an empty <main id="dasha-faucet"> — Watch treats that as blank.
 */
export const FAUCET_H1 = 'Fill the jar';

export function ensureFaucetHeading(html) {
  const page = String(html || '');
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
