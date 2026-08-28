/**
 * WCAG 2.2 landmarks for Worker HTML.
 *
 * Every page needs exactly one top-level <main> (1.3.1 / landmark-one-main)
 * and a skip link as the first focusable element (2.4.1). Skip links may sit
 * outside landmarks; nothing else should. Do not wrap <header> or <footer>
 * inside <main>.
 *
 * Live www.trydemigod.com/ is Worker-owned motley HTML: one <header class="mast">
 * and one <footer class="foot"> inside a band, and no <main>.
 */
export const SKIP_HREF = '#main';
export const SKIP_HTML = `<a class="skip-link" href="${SKIP_HREF}">Skip to content</a>`;
export const SKIP_CSS =
  '.skip-link{position:absolute;left:-9999px;top:0;z-index:100;padding:12px 16px;background:#10c674;color:#03140d;font-weight:700;text-decoration:none}.skip-link:focus{left:12px;top:12px;outline:3px solid #f3f0e7;outline-offset:2px}';
export const DASHA_SKIP_CSS =
  '.skip-link{position:absolute;left:-9999px;top:0;z-index:100;padding:12px 16px;background:#dfff00;color:#070608;font-weight:900;text-decoration:none}.skip-link:focus{left:12px;top:12px;outline:3px solid #f4eddb;outline-offset:2px}';

function hasMain(html) {
  return /<main\b/i.test(html);
}

function hasSkipLink(html) {
  return /class=["'][^"']*\bskip-link\b/i.test(html) || /href=["']#main["']/i.test(html) && /skip to/i.test(html);
}

export function ensureMainLandmark(html) {
  const page = String(html || '');
  if (hasMain(page)) return page;
  if (/<header\b/i.test(page) && /<footer\b/i.test(page)) {
    return page.replace(
      /(<header\b[^>]*>[\s\S]*?<\/header>)([\s\S]*?)(<footer\b)/i,
      (_, header, mid, footer) => `${header}<main id="main" tabindex="-1">${mid}</main>${footer}`,
    );
  }
  return page.replace(
    /(<body\b[^>]*>)([\s\S]*?)(<\/body>)/i,
    (_, open, mid, close) => `${open}<main id="main" tabindex="-1">${mid}</main>${close}`,
  );
}

export function ensureSkipLink(html, css = SKIP_CSS) {
  let page = String(html || '');
  if (!hasMain(page)) page = ensureMainLandmark(page);
  if (hasMain(page) && !/<main\b[^>]*\bid\s*=/i.test(page)) {
    page = page.replace(/<main\b/i, '<main id="main" tabindex="-1"');
  }
  if (hasSkipLink(page)) return page;
  if (!hasMain(page)) return page;
  if (!page.includes(css.split('{')[0])) {
    if (/<style\b/i.test(page)) {
      page = page.replace(/<style\b[^>]*>/i, (tag) => `${tag}${css}`);
    } else if (/<\/head>/i.test(page)) {
      page = page.replace(/<\/head>/i, `<style>${css}</style></head>`);
    } else {
      page = `<style>${css}</style>${page}`;
    }
  }
  return page.replace(/<body\b[^>]*>/i, (tag) => `${tag}${SKIP_HTML}`);
}

export function ensurePageLandmarks(html, css = SKIP_CSS) {
  return ensureSkipLink(ensureMainLandmark(html), css);
}
