/**
 * Worker-owned /chess first HTML has a <main> full of board chrome and no h1.
 * Lobby already leads with <h1>Lobby</h1>. Chess should match: one page
 * title at the start of main (WCAG 2.2 1.3.1 / 2.4.6).
 */
export const CHESS_H1 = 'Chess';

export function ensureChessHeading(html) {
  const page = String(html || '');
  if (/<h1[\s>]/i.test(page)) return page;
  const main = page.match(/<main\b[^>]*>/i);
  if (!main) return page;
  const at = page.indexOf(main[0]) + main[0].length;
  return `${page.slice(0, at)}<h1>${CHESS_H1}</h1>${page.slice(at)}`;
}
