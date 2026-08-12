/**
 * Hold a page still before measuring it.
 *
 * Gates that screenshot or read geometry are measuring a claim about what a person sees: this text
 * is readable against what is behind it, this control sits inside its card. An element caught
 * mid-fade answers neither — it is 40% opaque and three pixels from where it lands — so the gate
 * reports a defect in the page when the only defect is the timing of the question.
 *
 * Two mechanisms, because they cover different gaps:
 *
 *  1. Emulate `prefers-reduced-motion: reduce`. This is the honest one: the site already honours it,
 *     so the page settles the way it settles for a real reduced-motion visitor rather than into some
 *     state only the harness ever sees. It also means these gates keep testing that contract.
 *  2. Zero every duration and delay outright. Belt and braces for anything the site's own
 *     reduced-motion block does not cover — a new effect added without remembering to list it there,
 *     or motion inside a third-party surface we do not control.
 *
 * Playwright ships this as `animations: 'disabled'`; Puppeteer has no equivalent, hence this file.
 *
 * NOT for a gate whose subject is the motion itself — that one should drive the Web Animations API
 * and assert chosen frames. This is for the gates that want the page to hold still.
 */

/** CSS that collapses every animation and transition to its final state. */
export const STILL_CSS = `*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
}`;

/**
 * Settle a Puppeteer page. Call once after creating it and before the first measurement.
 * Safe to call on a page that has not navigated yet — both mechanisms persist across navigation.
 */
export async function settleMotion(page) {
  /* Set before navigation so the first paint is already reduced — emulating after load lets the
     opening animation run, which is the exact frame we are trying not to photograph. */
  if (typeof page.emulateMediaFeatures === 'function') {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]).catch(() => {});
  }
  /* addStyleTag applies to the current document only, so it has to be re-applied per navigation;
     evaluateOnNewDocument covers every subsequent one. Both, so the call site can be a single line
     wherever it sits relative to goto(). */
  if (typeof page.evaluateOnNewDocument === 'function') {
    await page.evaluateOnNewDocument((css) => {
      const apply = () => {
        const style = document.createElement('style');
        style.setAttribute('data-dasha-still', '');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
      };
      if (document.head) apply();
      else document.addEventListener('DOMContentLoaded', apply, { once: true });
    }, STILL_CSS).catch(() => {});
  }
  await page.addStyleTag({ content: STILL_CSS }).catch(() => {});
  return page;
}
