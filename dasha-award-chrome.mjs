/**
 * Shared Lando/No Art chrome for worker rooms + home rewrite.
 * Tokens only. No Inter. No Google Fonts. No Barba. No Lenis.
 */
import { MINT, WSOL } from './dasha-lobby-mod.mjs';

export const BUY_HREF = `https://jup.ag/swap?sell=${WSOL}&buy=${MINT}`;
export const WORDMARK_HREF = 'https://www.getdasha.com/';
export const DASH_EATS_HREF = 'https://x.com/dash_eats';

export const AWARD_SLIM_CSS = '.dasha-slim{display:flex;align-items:center;gap:.65rem;padding:.45rem 1rem;font-family:Arial,Helvetica,sans-serif}.dasha-word{display:inline-flex;align-items:center;min-height:48px;color:#f4eddb;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;font-size:1.15rem;letter-spacing:-.04em;text-decoration:none;text-transform:uppercase}.dasha-slim .buy-dasha{margin-left:auto;display:inline-flex;align-items:center;min-height:48px;padding:0 1rem;background:#dfff00;color:#070608;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;text-decoration:none;text-transform:uppercase}.dasha-menu{position:relative;margin-left:auto}.dasha-slim .buy-dasha+.dasha-menu{margin-left:0}.dasha-menu summary{list-style:none;cursor:pointer;min-height:48px;min-width:48px;display:inline-flex;align-items:center;justify-content:center;color:#f4eddb;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900;text-transform:uppercase}.dasha-menu summary::-webkit-details-marker{display:none}.dasha-menu nav{position:absolute;right:0;top:100%;z-index:90;display:grid;min-width:12rem;max-height:min(70vh,36rem);overflow:auto;padding:.4rem .7rem;background:#070608;border:1px solid #dfff00}.dasha-menu nav a{display:inline-flex;align-items:center;min-height:48px;color:#f4eddb;font-weight:900;text-transform:uppercase;text-decoration:none}';

export const AWARD_CROP_CSS = '.dasha-crop{position:fixed;inset:10px;z-index:80;pointer-events:none}.dasha-crop i{position:absolute;width:12px;height:12px;border-style:solid;border-color:#dfff00}.dasha-crop i:nth-child(1){top:0;left:0;border-width:2px 0 0 2px}.dasha-crop i:nth-child(2){top:0;right:0;border-width:2px 2px 0 0}.dasha-crop i:nth-child(3){bottom:0;left:0;border-width:0 0 2px 2px}.dasha-crop i:nth-child(4){bottom:0;right:0;border-width:0 2px 2px 0}';

export const AWARD_INK_CSS = '@media(prefers-reduced-motion:no-preference){@view-transition{navigation:auto}::view-transition-old(root),::view-transition-new(root){animation-duration:180ms}}';

export const AWARD_DOCK_CSS = '';

export const AWARD_TYPE_CSS = 'html,body{font-family:Arial,Helvetica,sans-serif}h1,.dasha-word{font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}';

export const AWARD_RAIL_CSS = '.dasha-rooms{display:flex;flex-wrap:nowrap;gap:.65rem 1.1rem;margin:1rem 0;overflow:auto}.dasha-rooms a{display:inline-flex;align-items:center;gap:.35rem;min-height:48px;color:#f4eddb;font-weight:900;text-transform:uppercase;text-decoration:none;white-space:nowrap}.dasha-rooms b{color:#dfff00;font-family:"Arial Black",Helvetica,Arial,sans-serif}.dasha-next{margin:0 0 1rem;font-weight:900;text-transform:uppercase}.dasha-next a{color:#dfff00}';

/** Home rooms. Tiny acid index. Native scroll. */
export const AWARD_ROOM_CSS = 'header.dasha-hero,#dasha-tape,#simp,#faucet,#token{position:relative}header.dasha-hero::before,#dasha-tape::before,#simp::before,#faucet::before,#token::before{position:absolute;left:1rem;top:1.1rem;color:#dfff00;font:700 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.12em}header.dasha-hero::before{content:"[01]"}#dasha-tape::before{content:"[02]"}#simp::before{content:"[03]"}#faucet::before{content:"[04]"}#token::before{content:"[05]"}#simp{min-height:100svh;box-sizing:border-box;padding:4.5rem 1.25rem 8rem}#dasha-tape,#faucet,#token{box-sizing:border-box;padding:3.5rem 1.25rem 8rem}#simp,#faucet,#token{opacity:0;transform:translateY(16px);transition:opacity .4s ease,transform .4s ease}#simp.is-in,#faucet.is-in,#token.is-in{opacity:1;transform:none}@media(prefers-reduced-motion:reduce){#simp,#faucet,#token{opacity:1;transform:none;transition:none}}';

/** Three-column board. No RANK/CONTRIBUTOR/SCORE headers. */
export const AWARD_BOARD_CSS = '.simp-board{display:grid}.simp-row{display:grid;grid-template-columns:3.2rem minmax(0,1fr) 3.2rem;gap:.8rem;align-items:baseline;padding:.8rem 0;border-bottom:1px solid rgba(244,237,219,.18);background:none}.simp-rank{color:#dfff00;font-family:"Arial Black",Helvetica,Arial,sans-serif;font-weight:900}.simp-handle{color:#f4eddb;font-weight:900;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.simp-pts{color:rgba(244,237,219,.5);text-align:right;font-variant-numeric:tabular-nums}.simp-empty,.simp-status{margin:0;color:rgba(244,237,219,.42)}.simp-status:empty{display:none}.simp-lede{margin:0 0 1.25rem;font:900 clamp(1.35rem,3.4vw,2rem)/1.15 "Arial Black",Helvetica,Arial,sans-serif}.simp-home-actions,.simp-quiz-invite-actions{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 1.75rem;align-items:center}.simp-quiz-go,.simp-quiz-start{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 1.25rem;border:0;background:#dfff00;color:#070608;font:900 1rem/1 Arial,Helvetica,sans-serif;text-decoration:none;box-shadow:4px 4px 0 #ff3b81;cursor:pointer}.simp-connect{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 1.25rem;border:1px solid #f4eddb;background:none;color:#f4eddb;font:900 1rem/1 Arial,Helvetica,sans-serif;cursor:pointer}.simp-more{margin:1.25rem 0 0;padding:0;border:0;background:none;color:#dfff00;font:900 1rem/1.2 "Arial Black",Helvetica,Arial,sans-serif;cursor:pointer}';

/** Live rooms. Menu, rail, and footer all render this. No Desk, Simp, Faucet, Graph, Dancer, Bounties, Privacy. */
export const DASHA_ROOMS = [
  { href: '/studio', label: 'Studio' },
  { href: '/forum', label: 'Forum' },
  { href: '/chess', label: 'Chess' },
  { href: '/how-to-buy', label: 'How to buy' },
  { href: '/learn', label: 'Learn' },
  { href: '/verse', label: 'Verse' },
];

export function roomLinksHtml() {
  return DASHA_ROOMS.map(room => `<a href="${room.href}">${room.label}</a>`).join('');
}

/** Paper on ink. 48px taps. Extra bottom pad so the 156px dock does not cover links. */
export const AWARD_FOOT_CSS = 'footer.dasha-foot,.dasha-foot{margin:0;padding:1.25rem 1.25rem calc(180px + env(safe-area-inset-bottom,0px));background:#070608;color:#f4eddb;font:900 1rem/1.3 Arial,Helvetica,sans-serif}footer.dasha-foot a,.dasha-foot a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding:0 .65rem;color:#f4eddb;text-decoration:none}footer.dasha-foot a:hover,.dasha-foot a:hover{color:#dfff00}footer.dasha-foot .buy-dasha,.dasha-foot .buy-dasha{background:#dfff00;color:#070608;padding:0 1rem}footer.dasha-foot nav,.dasha-foot nav{display:flex;flex-wrap:wrap;gap:.15rem .25rem}';

export const AWARD_HAM_CSS = AWARD_SLIM_CSS;
export const AWARD_TICK_CSS = AWARD_CROP_CSS;
export const AWARD_CHROME_CSS = `${AWARD_TYPE_CSS}${AWARD_SLIM_CSS}${AWARD_CROP_CSS}${AWARD_INK_CSS}${AWARD_DOCK_CSS}${AWARD_FOOT_CSS}`;

export function hamburgerHtml({ buy = true, buyId = '' } = {}) {
  const id = buyId ? ` id="${buyId}"` : '';
  const buyA = buy
    ? `<a class="buy-dasha"${id} href="${BUY_HREF}" target="_blank" rel="noopener noreferrer">Buy $dasha</a>`
    : '';
  return `<header class="dasha-slim"><a class="dasha-word" href="${WORDMARK_HREF}">$dasha</a>${buyA}<details class="dasha-menu"><summary aria-label="Menu">Menu</summary><nav aria-label="Dasha">${roomLinksHtml()}</nav></details></header>`;
}

export function cropTicksHtml() {
  return '<div class="dasha-crop" aria-hidden="true"><i></i><i></i><i></i><i></i></div>';
}

/** One real live room. Never a fake date. */
export function nextUpChipHtml() {
  return '<p class="dasha-next"><a href="/chess">Chess</a></p>';
}

export function roomRailHtml() {
  return `<nav class="dasha-rooms" aria-label="Rooms">${DASHA_ROOMS.map((room, i) => `<a href="${room.href}"><b>[${String(i + 1).padStart(2, '0')}]</b> ${room.label}</a>`).join('')}</nav>`;
}

export function slimFooterHtml() {
  return `<footer class="dasha-foot"><style>${AWARD_FOOT_CSS}</style><p><a href="${WORDMARK_HREF}">$dasha</a> · <a class="buy-dasha" href="${BUY_HREF}" target="_blank" rel="noopener noreferrer">Buy $dasha ↗</a> · <a href="${DASH_EATS_HREF}" target="_blank" rel="noopener noreferrer">@dash_eats</a></p><nav aria-label="Rooms">${roomLinksHtml()}</nav></footer>`;
}
