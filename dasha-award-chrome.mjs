/**
 * Shared Lando/No Art chrome for worker rooms + home rewrite.
 * Tokens only. No Inter. No Google Fonts. No Barba. No Lenis.
 */
import { MINT, WSOL } from './dasha-lobby-mod.mjs';

export const BUY_HREF = `https://jup.ag/swap?sell=${WSOL}&buy=${MINT}`;
export const WORDMARK_HREF = 'https://www.getdasha.com/';
export const DASH_EATS_HREF = 'https://x.com/dash_eats';

export const AWARD_HAM_CSS = '.dasha-ham{display:flex;align-items:center;gap:.65rem;padding:.45rem 1rem;font-family:Arial,Helvetica,sans-serif}.dasha-word{display:inline-flex;align-items:center;min-height:48px;color:#f4eddb;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;font-size:1.15rem;letter-spacing:-.04em;text-decoration:none;text-transform:uppercase}.dasha-ham-buy{margin-left:auto;display:inline-flex;align-items:center;min-height:48px;padding:0 1rem;background:#dfff00;color:#070608;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;text-decoration:none;text-transform:uppercase}.dasha-menu{position:relative;margin-left:auto}.dasha-ham-buy+.dasha-menu{margin-left:0}.dasha-menu summary{list-style:none;cursor:pointer;min-height:48px;min-width:48px;display:inline-flex;align-items:center;justify-content:center;color:#f4eddb;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;text-transform:uppercase}.dasha-menu summary::-webkit-details-marker{display:none}.dasha-menu nav{position:absolute;right:0;top:100%;z-index:90;display:grid;min-width:11rem;padding:.4rem .7rem;background:#070608;border:1px solid #dfff00}.dasha-menu nav a{display:inline-flex;align-items:center;min-height:48px;color:#f4eddb;font-weight:900;text-transform:uppercase;text-decoration:none}';

export const AWARD_TICK_CSS = '.dasha-ticks{position:fixed;inset:10px;z-index:80;pointer-events:none}.dasha-ticks i{position:absolute;width:12px;height:12px;border-style:solid;border-color:#f4eddb}.dasha-ticks i:nth-child(1){top:0;left:0;border-width:2px 0 0 2px}.dasha-ticks i:nth-child(2){top:0;right:0;border-width:2px 2px 0 0;border-color:#dfff00}.dasha-ticks i:nth-child(3){bottom:0;left:0;border-width:0 0 2px 2px;border-color:#dfff00}.dasha-ticks i:nth-child(4){bottom:0;right:0;border-width:0 2px 2px 0}';

export const AWARD_INK_CSS = '@media(prefers-reduced-motion:no-preference){@view-transition{navigation:auto}::view-transition-old(root),::view-transition-new(root){animation-duration:180ms}}';

export const AWARD_DOCK_CSS = '@media(prefers-reduced-motion:reduce){#dasha-dance{display:none!important}}';

export const AWARD_TYPE_CSS = 'html,body{font-family:Arial,Helvetica,sans-serif}h1,.dasha-word{font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}';

export const AWARD_RAIL_CSS = '.dasha-rooms{display:flex;flex-wrap:nowrap;gap:.65rem 1.1rem;margin:1rem 0;overflow:auto}.dasha-rooms a{display:inline-flex;align-items:center;gap:.35rem;min-height:48px;color:#f4eddb;font-weight:900;text-transform:uppercase;text-decoration:none;white-space:nowrap}.dasha-rooms b{color:#dfff00;font-family:"Arial Black",Helvetica,Arial,sans-serif}.dasha-next{margin:0 0 1rem;font-weight:900;text-transform:uppercase}.dasha-next a{color:#dfff00}';

export const AWARD_CHROME_CSS = `${AWARD_TYPE_CSS}${AWARD_HAM_CSS}${AWARD_TICK_CSS}${AWARD_INK_CSS}${AWARD_DOCK_CSS}`;

export function hamburgerSister(path) {
  const p = String(path || '').replace(/\/$/, '') || '/';
  if (p === '/simp' || p.startsWith('/learn') || p === '/faucet') return ['/chess', 'Chess'];
  if (p === '/verse') return ['/bounties', 'Bounties'];
  if (p === '/privacy') return ['/lobby', 'Lobby'];
  if (p === '/airdrop' || p === '/earn' || p === '/claim') return ['/faucet', 'Faucet'];
  return ['/verse', 'Verse'];
}

export function hamburgerHtml({ path = '', buy = true, buyId = '' } = {}) {
  let [href, label] = hamburgerSister(path);
  if (href === '/studio' || href === '/lobby' || href === '/graph') {
    href = '/verse';
    label = 'Verse';
  }
  const id = buyId ? ` id="${buyId}"` : '';
  const buyA = buy
    ? `<a class="buy-dasha dasha-ham-buy"${id} href="${BUY_HREF}" target="_blank" rel="noopener noreferrer">Buy $dasha</a>`
    : '';
  return `<header class="dasha-ham"><a class="dasha-word" href="${WORDMARK_HREF}">$dasha</a>${buyA}<details class="dasha-menu"><summary aria-label="Menu">Menu</summary><nav aria-label="Dasha"><a href="/studio">Studio</a><a href="/lobby">Lobby</a><a href="/graph">Graph</a><a href="${href}">${label}</a></nav></details></header>`;
}

export function cropTicksHtml() {
  return '<div class="dasha-ticks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
}

/** One real live room. Bounties are closed; Graph is up. Never a fake date. */
export function nextUpChipHtml() {
  return '<p class="dasha-next"><a href="/graph">Next up · Graph</a></p>';
}

export function roomRailHtml() {
  return '<nav class="dasha-rooms" aria-label="Rooms"><a href="/studio"><b>01</b> Studio</a><a href="/simp"><b>02</b> Simp</a><a href="/graph"><b>03</b> Graph</a><a href="/verse"><b>04</b> Verse</a><a href="/bounties"><b>05</b> Bounties</a></nav>';
}

export function slimFooterHtml() {
  return `<footer><style>footer a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding:0 .4rem}</style><p><a href="${WORDMARK_HREF}">$dasha</a> · <a class="buy-dasha" href="${BUY_HREF}" target="_blank" rel="noopener noreferrer">Buy $dasha ↗</a> · <a href="${DASH_EATS_HREF}" target="_blank" rel="noopener noreferrer">@dash_eats</a></p></footer>`;
}
