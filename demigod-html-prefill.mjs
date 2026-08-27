/**
 * Generic homepage "Start a brief" CTAs must open an empty startup brief.
 * Company/name/role query params belong only on an explicit packet action.
 */
export function stripLeakedBriefPrefill(html) {
  return String(html || '').replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (tag) => {
    if (!/>\s*Start a brief\s*</i.test(tag)) return tag;
    return tag.replace(/\bhref\s*=\s*(["'])([^"']*)\1/i, (attr, quote, href) => {
      const raw = String(href).replace(/&amp;/g, '&');
      if (!/[?&](?:company|name|role)=/i.test(raw)) return attr;
      let wiz = 'startup';
      try {
        const next = new URL(raw, 'https://www.trydemigod.com/');
        const fromQuery = next.searchParams.get('wiz');
        if (fromQuery) wiz = fromQuery;
      } catch {
        /* keep startup */
      }
      return `href=${quote}/?wiz=${encodeURIComponent(wiz)}${quote}`;
    });
  });
}
