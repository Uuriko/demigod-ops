/**
 * Culture Rally — pure helpers for the public /rally funnel.
 * Know lore → make → talk → buy, with one shareable challenge URL.
 */
export const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
export const RALLY_PATH = '/rally';
export const RALLY_URL = 'https://www.getdasha.com/rally';
export const QUIZ_INVITE_URL = 'https://www.getdasha.com/?quiz=1#simp';
export const STUDIO_URL = 'https://www.getdasha.com/studio';
export const LOBBY_URL = 'https://www.getdasha.com/lobby';
export const DESK_URL = 'https://www.getdasha.com/dasha#dd-mint';
export const JUPITER_BUY =
  'https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=' + MINT;

/** Ordered culture loop steps for the Rally page. */
export function rallyLoops() {
  return [
    {
      id: 'quiz',
      kicker: '01 · Lore',
      title: 'Take the simp quiz',
      body: 'Take the simp quiz. Finishing joins the Board.',
      href: QUIZ_INVITE_URL,
      cta: 'Start quiz',
    },
    {
      id: 'studio',
      kicker: '02 · Make',
      title: 'Make one, pass it on',
      body: 'Six looks. PNG + GIF. No wallet to create.',
      href: studioSeedUrl({
        look: 'ticket',
        format: 'story',
        line: 'It’s time $dasha',
        src: 'rally',
      }),
      cta: 'Open Studio',
    },
    {
      id: 'lobby',
      kicker: '03 · Talk',
      title: 'Join the lobby',
      body: 'Public chat on-site. Not Discord HQ.',
      href: LOBBY_URL,
      cta: 'Open lobby',
    },
    {
      id: 'buy',
      kicker: '04 · Buy',
      title: 'Verify mint, then swap',
      body: 'Exact CA only. Jupiter is the primary path.',
      href: JUPITER_BUY,
      cta: 'Buy on Jupiter',
      external: true,
    },
  ];
}

export function studioSeedUrl({
  look = 'photo',
  format = 'square',
  line = 'It’s time $dasha',
  photo = '',
  src = 'rally',
} = {}) {
  const q = new URLSearchParams({ look, format, line, src });
  if (photo) q.set('photo', photo);
  return STUDIO_URL + '#' + q.toString();
}

/**
 * Shareable rally challenge text for X / native share.
 * Invite first so the culture loop URL always travels.
 */
export function rallyShareText({ handle = '' } = {}) {
  const who = handle ? String(handle).trim() + ' · ' : '';
  return (
    who +
    'Culture Rally for $dasha — quiz, make, talk, buy.\n' +
    RALLY_URL +
    '\nMint: ' +
    MINT +
    '\n' +
    JUPITER_BUY
  );
}

export function assertBuyPath(html) {
  const s = String(html || '');
  const ok =
    s.includes(MINT) &&
    s.includes('jup.ag/swap') &&
    s.includes(MINT) &&
    /jup\.ag\/swap\?[^"']*buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/i.test(s);
  return {
    ok,
    hasMint: s.includes(MINT),
    hasJupiter: /jup\.ag\/swap/i.test(s),
  };
}
