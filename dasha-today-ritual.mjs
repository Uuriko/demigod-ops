/**
 * Shared "today" Studio DNA — same seed on home and Studio so deep-links match cold open.
 * UTC day seed; pure, no DOM.
 */
export const RITUAL_LOOKS = [
  { id: 'photo', line: 'How u crying at the casino and u can’t even get in' },
  { id: 'poster', line: 'It’s time $dasha' },
  { id: 'ticket', line: 'You’re not gonna believe this' },
  { id: 'print', line: 'Well Im still alive' },
  { id: 'marquee', line: 'Go ahead and doubt me see what happens' },
  { id: 'signal', line: 'Cmon' },
  { id: 'face', line: 'They are angels actually' },
];

export const RITUAL_FORMATS = ['square', 'story', 'banner'];
export const RITUAL_EFFECTS = ['clean', 'fry', 'xerox'];
export const RITUAL_STICKERS = ['', '🍒', '✦', '♱', '♢', '☻'];
export const RITUAL_CAPTIONS = [
  'How u crying at the casino and u can’t even get in',
  'It’s time $dasha',
  'Well im still alive',
  'Friday in the 4HL you can really feel the pull of the weekend',
];

export function daySeed(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

export function ritualLinePool() {
  const fromLooks = RITUAL_LOOKS.map((option) => option.line).filter(Boolean);
  return [...new Set([...RITUAL_CAPTIONS, ...fromLooks])];
}

export function todaysRitual(date = new Date()) {
  const seed = daySeed(date);
  const pool = ritualLinePool();
  return {
    look: RITUAL_LOOKS[seed % RITUAL_LOOKS.length].id,
    format: RITUAL_FORMATS[seed % RITUAL_FORMATS.length],
    effect: RITUAL_EFFECTS[seed % RITUAL_EFFECTS.length],
    sticker: RITUAL_STICKERS[(seed >> 3) % RITUAL_STICKERS.length],
    line: pool[seed % pool.length] || RITUAL_LOOKS[0].line,
  };
}

/** Fragment string for /studio#… (no leading #). */
export function ritualStudioHash(ritual = todaysRitual()) {
  const p = new URLSearchParams();
  p.set('look', ritual.look);
  p.set('format', ritual.format);
  p.set('line', ritual.line);
  if (ritual.effect && ritual.effect !== 'clean') p.set('effect', ritual.effect);
  if (ritual.sticker) p.set('sticker', ritual.sticker);
  return p.toString();
}

export function ritualStudioPath(ritual = todaysRitual()) {
  return `/studio#${ritualStudioHash(ritual)}`;
}

/** Minified browser IIFE for homepage — keep in sync via tests. */
export function homeRitualLinkScript() {
  return `(()=>{try{const L=[{id:"photo",line:"How u crying at the casino and u can’t even get in"},{id:"poster",line:"It’s time $dasha"},{id:"ticket",line:"You’re not gonna believe this"},{id:"print",line:"Well Im still alive"},{id:"marquee",line:"Go ahead and doubt me see what happens"},{id:"signal",line:"Cmon"},{id:"face",line:"They are angels actually"}];const F=["square","story","banner"];const E=["clean","fry","xerox"];const S=["","🍒","✦","♱","♢","☻"];const C=["How u crying at the casino and u can’t even get in","It’s time $dasha","Well im still alive","Friday in the 4HL you can really feel the pull of the weekend"];const d=new Date();const seed=d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();const pool=[...new Set([...C,...L.map(x=>x.line)])];const r={look:L[seed%L.length].id,format:F[seed%F.length],effect:E[seed%E.length],sticker:S[(seed>>3)%S.length],line:pool[seed%pool.length]||L[0].line};const p=new URLSearchParams();p.set("look",r.look);p.set("format",r.format);p.set("line",r.line);if(r.effect&&r.effect!=="clean")p.set("effect",r.effect);if(r.sticker)p.set("sticker",r.sticker);const href="/studio#"+p.toString();const nodes=document.querySelectorAll('a[href^="/studio"],a[href*="/studio#"]');for(const a of nodes){if(a.classList.contains("buy-dasha"))continue;a.setAttribute("href",href);if(a.classList.contains("poster-tile")){const strong=a.querySelector("strong");if(strong)strong.textContent=r.line;a.setAttribute("aria-label","Edit ‘"+r.line+"’");}}const make=document.querySelector(".dasha-hero .actions a.primary");if(make)make.setAttribute("href",href);}catch(e){}})();`;
}
